# CI/CD Workflows for Terraform

> **Part of:** [terraform-skill](../SKILL.md)
> **Purpose:** CI/CD integration patterns for Terraform/OpenTofu

This document provides detailed CI/CD workflow templates and optimization strategies for infrastructure-as-code pipelines.

---

## Table of Contents

1. [GitHub Actions Workflow](#github-actions-workflow)
2. [GitLab CI Template](#gitlab-ci-template)
3. [Cost Optimization](#cost-optimization)
4. [Automated Cleanup](#automated-cleanup)
5. [Best Practices](#best-practices)

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
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Format
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: v0.50.3
      - name: TFLint Init
        run: tflint --init
      - name: TFLint
        run: tflint

  test:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Run Terraform Tests
        run: terraform test

      # Or for Terratest:
      - name: Setup Go
        uses: actions/setup-go@v5
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
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply tfplan
```

### With Cost Estimation (Infracost)

```yaml
  cost-estimate:
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Infracost
        uses: infracost/actions/setup@v2
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Generate Cost Estimate
        run: |
          infracost breakdown --path . \
            --format json \
            --out-file /tmp/infracost.json

      - name: Post Cost Comment
        uses: infracost/actions/comment@v1
        with:
          path: /tmp/infracost.json
          behavior: update
```

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
  image: hashicorp/terraform:latest
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
    - name: Run Unit Tests (Mocked)
      run: terraform test

    - name: Run Integration Tests
      if: github.ref == 'refs/heads/main'
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
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

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
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
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
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
    env:
      TF_PLUGIN_CACHE_DIR: ${{ runner.temp }}/terraform-plugin-cache
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Create plugin cache dir
        run: mkdir -p "$TF_PLUGIN_CACHE_DIR"

      - name: Cache Terraform Plugins
        uses: actions/cache@v4
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
    - uses: actions/checkout@v4

    - name: Run Trivy
      uses: aquasecurity/trivy-action@0.29.0
      with:
        scan-type: 'config'
        scan-ref: '.'

    - name: Run Checkov
      uses: bridgecrewio/checkov-action@v12.2.0
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

**Rules:**
- ✅ pin `aud` to the exact value from the table
- ✅ pin `sub` to a specific repo + branch or environment — no wildcards across org/repo
- ❌ `sub` wildcards like `repo:*:*` or `repo:<org>/*:ref:*` let any repo assume the role
- ❌ mismatched `aud` → token rejected with opaque error; fix `aud` per table, do not relax `sub`

✅ DO — AWS IAM trust-policy `Condition` block (the only non-boilerplate fragment):

```json
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
  },
  "StringLike": {
    "token.actions.githubusercontent.com:sub": "repo:my-org/my-repo:ref:refs/heads/main"
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
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - name: Plan (detect drift)
        id: plan
        run: terraform plan -detailed-exitcode -out=plan.bin
        continue-on-error: true
      - name: Alert on drift
        if: steps.plan.outcome == 'failure' && steps.plan.outputs.exitcode == '2'
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
      - uses: actions/checkout@v4
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
    terraform_version: 1.12.0
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
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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
- skips the policy/security stage despite the pipeline claiming compliance
- grants CI long-lived static cloud credentials instead of OIDC / workload-identity federation
- writes OIDC trust policies with wildcard `sub` claims (`repo:*:*`, `repo:<org>/*:ref:*`) — any repo or branch can assume the role
- mismatches the `aud` claim between CI platform and cloud provider, then relaxes `sub` to "fix" the resulting error
- implements scheduled "drift detection" as `terraform apply -auto-approve` on cron — silently reverts out-of-band changes; use `plan -detailed-exitcode` + alert
- fails to restrict artifact access when `terraform show -json` results may contain sensitive plan output
- merges provider/runtime upgrades with functional changes in the same PR

---

**Back to:** [Main Skill File](../SKILL.md)
