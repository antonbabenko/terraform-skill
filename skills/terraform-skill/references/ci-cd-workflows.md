# CI/CD Workflows for Terraform

> **Part of:** [terraform-skill](../SKILL.md)
> **Purpose:** CI/CD integration patterns for Terraform/OpenTofu

This document provides detailed CI/CD workflow templates and optimization strategies for infrastructure-as-code pipelines.

---

## Table of Contents

1. [GitHub Actions Workflow](#github-actions-workflow)
2. [GitLab CI Template](#gitlab-ci-template)
3. [Azure DevOps Pipeline](#azure-devops-pipeline)
4. [Cost Optimization](#cost-optimization)
5. [Automated Cleanup](#automated-cleanup)
6. [Best Practices](#best-practices)

---

## GitHub Actions Workflow

### Complete Example

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4

      - name: Terraform Format
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - uses: terraform-linters/setup-tflint@v6
        with:
          tflint_version: v0.66.0
      - name: TFLint Init
        run: tflint --init
      - name: TFLint
        run: tflint

  test:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Run Terraform Tests
        run: terraform test

      # Or for Terratest:
      - name: Setup Go
        uses: actions/setup-go@v7
        with:
          go-version: 'stable'

      - name: Run Terratest
        run: |
          cd tests
          go test -v -timeout 30m -parallel 4

  plan:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Upload Plan
        uses: actions/upload-artifact@v7
        with:
          name: tfplan
          path: tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4

      - name: Download Plan
        uses: actions/download-artifact@v8
        with:
          name: tfplan

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply tfplan
```

### With Cost Estimation (Infracost)

```yaml
  # Job-level permissions: pull-requests: write (to post the PR comment)
  cost-estimate:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v7
        with:
          path: head
      - uses: actions/checkout@v7
        with:
          ref: ${{ github.event.pull_request.base.ref }}
          path: base

      - name: Diff cost and post PR comment
        uses: infracost/actions/diff@v5
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}
          base-path: base
          head-path: head
```

- ✅ Use `infracost/actions/diff@v5` (PR comment) or `scan@v5` (push to main); both run in Docker, so use Linux runners
- ❌ `infracost/actions/comment@v1` no longer exists; `setup@*` + `infracost breakdown` + `infracost comment` is the legacy flow

---

## GitLab CI Template

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test
  - plan
  - apply

variables:
  TF_ROOT: ${CI_PROJECT_DIR}

.terraform_template:
  image:
    name: hashicorp/terraform:1.17  # pin minor, never :latest
    entrypoint: [""]  # image ENTRYPOINT is /bin/terraform; GitLab needs a shell
  before_script:
    - cd ${TF_ROOT}
    - terraform init

validate:
  extends: .terraform_template
  stage: validate
  script:
    - terraform fmt -check -recursive
    - terraform validate

test:
  extends: .terraform_template
  stage: test
  script:
    - terraform test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'

plan:
  extends: .terraform_template
  stage: plan
  script:
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - ${TF_ROOT}/tfplan
    expire_in: 1 week
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'

apply:
  extends: .terraform_template
  stage: apply
  script:
    - terraform apply tfplan
  dependencies:
    - plan
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual
  environment:
    name: production
```

---

## Azure DevOps Pipeline

### Azure DevOps Auth Options

Auth: Azure Resource Manager service connection with workload identity federation (WIF), no client secret.

| Goal | Use | Tradeoff |
|------|-----|----------|
| Default | App registration WIF connection + azurerm request-token env vars (below) | Federated assertion valid about 1 hour; longer runs fail with `AADSTS700024` |
| Plan/apply runs over 1 hour | WIF connection backed by a user-assigned managed identity | Managed identity tokens last about 24 hours; identity to manage |
| Avoid | `addSpnToEnvironment` + `ARM_OIDC_TOKEN=$idToken` | Static token captured once at task start |

### azure-pipelines.yml

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main]

variables:
  TF_VERSION: 1.17.2
  ARM_SUBSCRIPTION_ID: 00000000-0000-0000-0000-000000000000 # non-secret vars reach steps as env vars

pool:
  vmImage: ubuntu-latest

stages:
  - stage: plan
    jobs:
      - job: plan
        steps:
          - script: |
              curl -fsSLo tf.zip "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip"
              sudo unzip -o tf.zip terraform -d /usr/local/bin
            displayName: Install Terraform
          - task: AzureCLI@2
            inputs:
              azureSubscription: sc-prod-wif # literal name; service connections cannot come from variables
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                set -euo pipefail
                # AzureCLI@2 exports AZURESUBSCRIPTION_* for WIF connections
                export ARM_CLIENT_ID="$AZURESUBSCRIPTION_CLIENT_ID" ARM_TENANT_ID="$AZURESUBSCRIPTION_TENANT_ID"
                export ARM_ADO_PIPELINE_SERVICE_CONNECTION_ID="$AZURESUBSCRIPTION_SERVICE_CONNECTION_ID"
                terraform init -input=false
                terraform plan -input=false -out=tfplan
            env: # read by the azurerm provider AND the azurerm backend
              ARM_USE_OIDC: 'true'
              ARM_USE_AZUREAD: 'true' # backend: Entra ID auth to the blob data plane
              SYSTEM_ACCESSTOKEN: $(System.AccessToken) # secrets reach env only when mapped
              SYSTEM_OIDCREQUESTURI: $(System.OidcRequestUri)
          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: $(System.DefaultWorkingDirectory)/tfplan
              artifact: tfplan

  - stage: apply
    dependsOn: plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: apply
        environment: prod # approvals and checks are configured on this environment
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self # deployment jobs do not clone the repo
                - download: current # only this artifact; lands in $(Pipeline.Workspace)/tfplan/
                  artifact: tfplan
                - script: |
                    curl -fsSLo tf.zip "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip"
                    sudo unzip -o tf.zip terraform -d /usr/local/bin
                  displayName: Install Terraform
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: sc-prod-wif
                    workingDirectory: $(Build.SourcesDirectory) # the checked-out root module
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      set -euo pipefail
                      export ARM_CLIENT_ID="$AZURESUBSCRIPTION_CLIENT_ID" ARM_TENANT_ID="$AZURESUBSCRIPTION_TENANT_ID"
                      export ARM_ADO_PIPELINE_SERVICE_CONNECTION_ID="$AZURESUBSCRIPTION_SERVICE_CONNECTION_ID"
                      terraform init -input=false
                      terraform apply -input=false "$(Pipeline.Workspace)/tfplan/tfplan"
                  env:
                    ARM_USE_OIDC: 'true'
                    ARM_USE_AZUREAD: 'true'
                    SYSTEM_ACCESSTOKEN: $(System.AccessToken)
                    SYSTEM_OIDCREQUESTURI: $(System.OidcRequestUri)
```

### Azure DevOps Rules

- ✅ Set `ARM_ADO_PIPELINE_SERVICE_CONNECTION_ID`; without it azurerm falls back to the GitHub OIDC authorizer
- ✅ Configure approvals on the environment (Pipelines > Environments > Approvals and checks); YAML editors cannot change checks
- ✅ Authorize each pipeline on the service connection; avoid "Grant access permission to all pipelines"
- ✅ Treat the `tfplan` artifact as secret: saved plans store sensitive values in cleartext
- ❌ `terraform plan` in the apply stage; apply the reviewed artifact
- ❌ `ARM_CLIENT_SECRET` in a variable group; convert the connection to WIF

---

## Cost Optimization

### Strategy

1. **Use mocking for PR validation** (free)
2. **Run integration tests only on main branch** (controlled cost)
3. **Implement auto-cleanup** (prevent orphaned resources)
4. **Tag all test resources** (track spending)

### Example: Conditional Test Execution

```yaml
# GitHub Actions
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v7
    - uses: hashicorp/setup-terraform@v4

    - name: Run Unit Tests (Mocked)
      run: |
        terraform init -backend=false
        terraform test

    - name: Run Integration Tests
      if: github.ref == 'refs/heads/main'
      run: |
        cd tests
        go test -v -timeout 30m
```

### Cost-Aware Test Tags

```go
// In Terratest
terraformOptions := &terraform.Options{
    TerraformDir: "../examples/complete",
    Vars: map[string]interface{}{
        "tags": map[string]string{
            "Environment": "test",
            "CreatedAt":   time.Now().Format(time.RFC3339),
            "CreatedBy":   "CI",
            "JobID":       os.Getenv("GITHUB_RUN_ID"),
        },
    },
}
```

---

## Automated Cleanup

### Cleanup Script (Bash)

```bash
#!/bin/bash
# cleanup-test-resources.sh
# Resources are tagged with CreatedAt = ISO8601 timestamp (RFC3339).
# AWS resourcegroupstaggingapi tag filters only support equality, so we
# fetch by Environment=test and filter by timestamp client-side with jq.

set -euo pipefail

CUTOFF=$(date -u -d '2 hours ago' +%s)

aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Environment,Values=test \
  --query 'ResourceTagMappingList[]' \
  --output json | \
  jq -r --argjson cutoff "$CUTOFF" '
    .[]
    | select(
        any(.Tags[]; .Key == "CreatedAt" and (.Value | fromdateiso8601) < $cutoff)
      )
    | .ResourceARN
  ' | while read -r arn; do
    instance_id=$(echo "$arn" | grep -oP 'instance/\K[^/]+' || true)
    if [ -n "$instance_id" ]; then
      echo "Terminating instance: $instance_id"
      aws ec2 terminate-instances --instance-ids "$instance_id"
    fi
  done
```

### Scheduled Cleanup (GitHub Actions)

```yaml
# .github/workflows/cleanup.yml
name: Cleanup Test Resources

on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
  workflow_dispatch:        # Manual trigger

permissions:
  id-token: write   # required for OIDC role assumption
  contents: read

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_CLEANUP_ROLE_ARN }}
          aws-region: us-east-1

      - name: Run Cleanup Script
        run: ./scripts/cleanup-test-resources.sh
```

---

## Best Practices

### 1. Separate Environments

```yaml
# Different workflows for different environments
.github/workflows/
  terraform-dev.yml
  terraform-staging.yml
  terraform-prod.yml
```

Or use reusable workflows:

```yaml
# .github/workflows/terraform-deploy.yml (reusable)
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string

jobs:
  deploy:
    environment: ${{ inputs.environment }}
    # ... deployment steps
```

### 2. Require Approvals for Production

```yaml
# GitHub Actions — configure required reviewers on the `production`
# environment in repo Settings -> Environments -> Protection rules.
apply:
  environment:
    name: production
```

### 3. Use Remote State

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket       = "my-terraform-state"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true # 1.10+, native S3 locking (replaces DynamoDB)
    encrypt      = true
  }
}
```

### 4. Implement State Locking

```yaml
# In CI, use -lock-timeout to handle concurrent runs
- name: Terraform Apply
  run: terraform apply -lock-timeout=10m tfplan
```

### 5. Cache Terraform Plugins

```yaml
# GitHub Actions — set TF_PLUGIN_CACHE_DIR so `terraform init` actually
# writes into the cached path, then restore the cache between runs.
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4

      # job-level `env` cannot read the `runner` context; export via GITHUB_ENV
      - name: Create plugin cache dir
        run: |
          echo "TF_PLUGIN_CACHE_DIR=$RUNNER_TEMP/terraform-plugin-cache" >> "$GITHUB_ENV"
          mkdir -p "$RUNNER_TEMP/terraform-plugin-cache"

      - name: Cache Terraform Plugins
        uses: actions/cache@v6
        with:
          path: ${{ runner.temp }}/terraform-plugin-cache
          key: ${{ runner.os }}-terraform-${{ hashFiles('**/.terraform.lock.hcl') }}

      - name: Terraform Init
        run: terraform init
```

### 6. Security Scanning in CI

```yaml
security-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v7

    - name: Run Trivy
      uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25  # v0.36.0
      with:
        scan-type: 'config'
        scan-ref: '.'

    - name: Run Checkov
      uses: bridgecrewio/checkov-action@v12
      with:
        directory: .
        framework: terraform
```

### OIDC Trust Policy Correctness

| Platform | Expected `aud` | Where to pin `sub` |
|----------|----------------|---------------------|
| GitHub Actions → AWS | `sts.amazonaws.com` | `repo:<org>/<repo>:ref:refs/heads/<branch>` |
| GitHub Actions → Azure AD | `api://AzureADTokenExchange` | `repo:<org>/<repo>:environment:<env>` |
| GitHub Actions → GCP | value passed via `audience` parameter | repo + ref or environment |
| GitLab CI → AWS | matches `$CI_SERVER_URL` | project path + ref |
| Azure DevOps → Azure (Entra ID) | `api://AzureADTokenExchange` | one federated credential per service connection. New connections: issuer `https://login.microsoftonline.com/<tenant-id>/v2.0`, subject `<entra-prefix>/sc/<org-id>/<service-connection-id>`. Legacy: issuer `https://vstoken.dev.azure.com/<org-id>`, subject `sc://<org>/<project>/<service-connection-name>` (issuer retires 2027-07-01) |

Use keyless OIDC for all three clouds (AWS OIDC / Azure federated credentials / GCP Workload Identity Federation); in Azure DevOps use a workload identity federation service connection. Static keys only if OIDC is unavailable (non-OIDC CI / self-hosted runners) - prefer keyless.

**Rules:**
- ✅ pin `aud` to the exact value from the table
- ✅ Azure DevOps: copy issuer, subject and audience exactly from the service connection edit dialog; renaming the org, project or a manually created connection breaks a `sc://` subject match
- ✅ pin `sub` to a specific repo + branch or environment — no wildcards across org/repo
- ❌ `sub` wildcards like `repo:*:*` or `repo:<org>/*:ref:*` let any repo assume the role
- ❌ mismatched `aud` → token rejected with opaque error; fix `aud` per table, do not relax `sub`

✅ DO — AWS IAM trust-policy `Condition` block (the only non-boilerplate fragment):

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:my-org/my-repo:ref:refs/heads/main"
    }
  }
}
```

### Drift Detection — Alert, Do Not Auto-Apply

Scheduled drift detection alerts; it never auto-applies.

✅ DO — scheduled plan with alert on drift (exit code 2):

```yaml
# .github/workflows/drift-detection.yml
on:
  schedule:
    - cron: '0 */6 * * *'

jobs:
  detect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4
      - run: terraform init
      - name: Plan (detect drift)
        id: plan
        run: terraform plan -detailed-exitcode -out=plan.bin
        continue-on-error: true
      - name: Alert on drift
        # setup-terraform's wrapper treats exit 2 as success, so check exitcode, not outcome
        if: steps.plan.outputs.exitcode == '2'
        run: |
          echo "Drift detected. Requires human review before apply."
          # send to Slack / PagerDuty / issue tracker
```

`plan -detailed-exitcode` exit codes: `0` = no drift, `1` = plan failed, `2` = drift detected.

❌ DON'T — scheduled auto-apply that silently reconciles drift:

```yaml
jobs:
  reconcile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: terraform apply -auto-approve
```

---

## Atlantis Integration

[Atlantis](https://www.runatlantis.io/) provides Terraform automation via pull request comments.

### atlantis.yaml

```yaml
version: 3
projects:
  - name: production
    dir: environments/prod
    workspace: default
    terraform_version: 1.17.2
    workflow: custom

workflows:
  custom:
    plan:
      steps:
        - init
        - plan:
            extra_args: ["-lock=false"]
    apply:
      steps:
        - apply
```

### Benefits

- Plan results as PR comments
- Apply via PR comments
- Locking prevents concurrent changes
- Integrates with VCS (GitHub, GitLab, Bitbucket)

---

## Troubleshooting

### Issue: Tests fail in CI but pass locally

**Cause:** Different Terraform/provider versions

**Solution:**

```hcl
# versions.tf - Pin versions
terraform {
  required_version = "~> 1.17"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
```

### Issue: Parallel tests conflict

**Cause:** Resource naming collisions

**Solution:**

```go
// Use unique identifiers
uniqueId := random.UniqueId()
bucketName := fmt.Sprintf("test-bucket-%s-%s",
    os.Getenv("GITHUB_RUN_ID"),
    uniqueId)
```

---

## LLM Mistake Checklist — CI/CD

Common model mistakes to correct before returning pipeline recommendations:

- generates a pipeline with no lockfile strategy (`.terraform.lock.hcl` uncommitted or unreviewed)
- re-runs `terraform plan` inside the apply job instead of consuming the reviewed plan artifact from the plan stage
- omits environment protection / approval gates on production apply
- uses unpinned provider versions, causing drift between local and CI runs
- copies CI action/task versions from memory (`actions/checkout@v4`, `@master`, `:latest` images) - look up the current release; pin third-party actions to a commit SHA, first-party (`actions/*`) to at least a major tag
- skips the policy/security stage despite the pipeline claiming compliance
- grants CI long-lived static cloud credentials instead of OIDC / workload-identity federation
- stores a service principal client secret (`ARM_CLIENT_SECRET`) in an Azure DevOps variable group instead of using a workload identity federation service connection
- writes OIDC trust policies with wildcard `sub` claims (`repo:*:*`, `repo:<org>/*:ref:*`) — any repo or branch can assume the role
- mismatches the `aud` claim between CI platform and cloud provider, then relaxes `sub` to "fix" the resulting error
- implements scheduled "drift detection" as `terraform apply -auto-approve` on cron — silently reverts out-of-band changes; use `plan -detailed-exitcode` + alert
- fails to restrict artifact access when `terraform show -json` results may contain sensitive plan output
- merges provider/runtime upgrades with functional changes in the same PR

---

**Back to:** [Main Skill File](../SKILL.md)
