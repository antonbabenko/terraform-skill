# Baseline Scenarios (RED Phase)

> **Purpose:** Test skill effectiveness by comparing agent behavior WITHOUT vs WITH skill loaded
>
> **Iron Law:** Per writing-skills standards, NO SKILL WITHOUT A FAILING TEST FIRST

This document defines test scenarios to validate that terraform-skill actually changes Claude's behavior. Each scenario must be run WITHOUT the skill first (baseline), then WITH the skill (compliance verification).

## Testing Methodology

### RED Phase (This Document)
1. Run each scenario WITHOUT terraform-skill loaded
2. Document verbatim agent responses
3. Identify specific rationalizations and missed opportunities
4. Note which pressures trigger violations

### GREEN Phase (compliance-verification.md)
1. Run same scenarios WITH terraform-skill loaded
2. Document behavior changes
3. Verify agents now comply with patterns

### REFACTOR Phase (rationalization-table.md)
1. Identify new rationalizations from testing
2. Add explicit counters to SKILL.md
3. Re-test until bulletproof

---

## Scenario 1: Module Creation Without Testing

**Objective:** Verify agent proactively includes testing when creating modules

### Test Prompt
```
Create a simple Terraform module for an AWS S3 bucket with:
- Versioning configuration
- Encryption settings
- Bucket policy support
```

### Expected Baseline Behavior (WITHOUT skill)
- Agent creates module structure (main.tf, variables.tf, outputs.tf)
- May include basic documentation
- **Likely SKIPS:** Testing infrastructure entirely
- **Rationalization:** "You can add tests later if needed"

### Target Behavior (WITH skill)
- Agent asks about testing approach before implementing
- Uses decision matrix to recommend testing framework
- Includes testing in deliverables OR explicitly asks user preference
- References version-specific features (1.6+ native tests, 1.7+ mocks)

### Pressure Variations
- **Time pressure:** "I need this quickly"
- **Authority pressure:** "I know what I'm doing, just create it"
- **Sunk cost:** After module is created, ask "Can you add tests?"

### Success Criteria
- [ ] Agent mentions testing proactively (not just when asked)
- [ ] Agent uses testing decision matrix from skill
- [ ] Agent asks about Terraform/OpenTofu version for framework selection
- [ ] Agent doesn't rationalize skipping tests

---

## Scenario 2: Choosing Testing Framework

**Objective:** Verify agent uses decision matrix instead of generic recommendations

### Test Prompt
```
I need to test my Terraform modules. What testing approach should I use?
```

### Expected Baseline Behavior (WITHOUT skill)
- Generic recommendation (likely Terratest, most well-known)
- May mention terraform validate/plan
- **Likely SKIPS:** Decision matrix, version-specific features, cost considerations
- **Rationalization:** "Terratest is the industry standard"

### Target Behavior (WITH skill)
- Asks clarifying questions:
  - Terraform/OpenTofu version?
  - Team Go expertise?
  - Cost sensitivity?
  - Complexity of modules?
- Uses decision matrix from SKILL.md:90-103
- Recommends specific approach with rationale

### Variations
**Variation A:** User has Terraform 1.5 (pre-native tests)
- Skill should recognize native tests not available
- Recommend Terratest OR validate + plan approach

**Variation B:** User has Terraform 1.8, no Go expertise, cost-sensitive
- Skill should recommend native tests with mock providers (1.7+ feature)
- Explain cost savings vs real integration tests

**Variation C:** User has complex multi-cloud infrastructure
- Skill may recommend Terratest for richer test capabilities
- Explain tradeoffs

### Success Criteria
- [ ] Agent asks version before recommending
- [ ] Agent uses decision matrix explicitly
- [ ] Agent explains rationale (not just "use X")
- [ ] Agent considers cost implications
- [ ] Agent doesn't default to single recommendation without context

---

## Scenario 3: Security Scanning Omission

**Objective:** Verify agent proactively includes security scanning in reviews

### Test Prompt
```
Review this Terraform configuration:

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
  acl    = "public-read"
}

resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Expected Baseline Behavior (WITHOUT skill)
- Reviews syntax correctness
- May mention deprecated `acl` argument
- **Likely SKIPS:** Security scanning tools (trivy, checkov)
- **May MISS:** Obvious security issues (public bucket, wide-open security group)
- **Rationalization:** "Syntax looks correct"

### Target Behavior (WITH skill)
- Flags obvious security issues immediately
- Recommends running trivy or checkov
- References Security & Compliance section from skill
- Provides specific fixes (least-privilege patterns)

### Pressure Variations
- **Quick review:** "Just a quick review, is the syntax correct?"
- **Authority:** "I know it's public, that's intentional" (agent should still flag as anti-pattern)

### Success Criteria
- [ ] Agent flags public S3 bucket as security risk
- [ ] Agent flags wide-open security group
- [ ] Agent flags inline `ingress`/`egress` blocks (should use separate rule resources)
- [ ] Agent recommends security scanning tools (trivy/checkov)
- [ ] Agent provides secure alternatives
- [ ] Agent doesn't stop at "syntax correct"

---

## Scenario 4: Naming Convention Violations

**Objective:** Verify agent follows naming conventions from skill

### Test Prompt
```
Create resources for:
- A web server EC2 instance
- An application logs S3 bucket
- A VPC
```

### Expected Baseline Behavior (WITHOUT skill)
- Creates resources with generic names:
  - `resource "aws_instance" "this" {}`
  - `resource "aws_s3_bucket" "bucket" {}`
  - `resource "aws_vpc" "main" {}`
- **Rationalization:** "These are common terraform patterns"

### Target Behavior (WITH skill)
- Uses descriptive, contextual names per SKILL.md:63-83:
  - `resource "aws_instance" "web_server" {}`
  - `resource "aws_s3_bucket" "application_logs" {}`
  - `resource "aws_vpc" "this" {}` (singleton resource - one VPC per module)
- Avoids anti-patterns: `main` (use `this` for singletons), `bucket` (type name redundancy)

### Success Criteria
- [ ] Resource names are descriptive and contextual
- [ ] Agent uses "this" for singleton resources (one per module)
- [ ] Agent avoids "this" for multiple resources of same type
- [ ] Agent avoids generic names ("main", "bucket", "instance") for non-singletons
- [ ] Variable names include context (e.g., `vpc_cidr_block` not just `cidr`)
- [ ] Follows naming section without prompting

---

## Scenario 5: CI/CD Workflow Without Cost Optimization

**Objective:** Verify agent includes cost optimization in CI/CD workflows

### Test Prompt
```
Create a GitHub Actions workflow for Terraform that:
- Runs on pull requests
- Validates and tests the code
- Creates execution plans
```

### Expected Baseline Behavior (WITHOUT skill)
- Creates workflow with validate/test/plan steps
- **Likely SKIPS:** Mock providers, cost estimation, auto-cleanup
- **May:** Run expensive integration tests on every PR
- **Rationalization:** "This ensures quality on every PR"

### Target Behavior (WITH skill)
- Includes cost optimization strategy per SKILL.md:193-199:
  - Mocking for PR validation (free)
  - Integration tests only on main branch (controlled cost)
  - Auto-cleanup steps
  - Resource tagging for tracking
- May recommend Infracost for cost estimation

### Success Criteria
- [ ] Workflow uses mocking or validates cheaply on PRs
- [ ] Expensive tests reserved for main branch or manual trigger
- [ ] Includes cleanup steps
- [ ] Tags test resources for cost tracking
- [ ] Agent mentions cost optimization proactively

---

## Scenario 6: State File Management

**Objective:** Verify agent recommends secure state management

### Test Prompt
```
I'm starting a new Terraform project. How should I set up state management?
```

### Expected Baseline Behavior (WITHOUT skill)
- Recommends remote backend (S3, GCS, etc.)
- May mention state locking
- **Likely SKIPS:** Encryption, state file security, access controls
- **Rationalization:** "Remote state is the best practice"

### Target Behavior (WITH skill)
- Recommends remote backend with security features:
  - Encryption at rest (S3 bucket encryption)
  - Encryption in transit (HTTPS endpoints)
  - State locking (DynamoDB for S3, etc.)
  - Access controls (IAM policies)
  - Versioning enabled
- References Security & Compliance guide

### Success Criteria
- [ ] Agent mentions encryption at rest
- [ ] Agent mentions encryption in transit
- [ ] Agent recommends state locking
- [ ] Agent suggests access controls/IAM
- [ ] Agent provides concrete configuration example

---

## Scenario 7: Module Structure

**Objective:** Verify agent follows standard module structure

### Test Prompt
```
I want to create a reusable Terraform module. What structure should I use?
```

### Expected Baseline Behavior (WITHOUT skill)
- Mentions main.tf, variables.tf, outputs.tf
- **Likely SKIPS:** examples/ directory, versions.tf, testing directory
- **Rationalization:** "The basics are main, variables, and outputs"

### Target Behavior (WITH skill)
- Provides complete structure per SKILL.md:148-163:
  ```
  my-module/
  ├── README.md
  ├── main.tf
  ├── variables.tf
  ├── outputs.tf
  ├── versions.tf
  ├── examples/
  │   ├── minimal/
  │   └── complete/
  └── tests/
  ```
- Explains purpose of each component
- Notes that examples/ serves dual purpose (docs + test fixtures)

### Success Criteria
- [ ] Includes all standard files
- [ ] Mentions examples/ directory
- [ ] Mentions tests/ directory
- [ ] Explains versions.tf for provider constraints
- [ ] Notes examples serve as documentation AND test fixtures

---

## Scenario 8: Variable Design Best Practices

**Objective:** Verify agent applies variable best practices

### Test Prompt
```
Add input variables for:
- VPC CIDR block
- Database password
- Enable encryption flag
```

### Expected Baseline Behavior (WITHOUT skill)
- Creates basic variable definitions
- **Likely SKIPS:** Descriptions, type constraints, validation, sensitive flag
- **Rationalization:** "Here are the variables"

### Target Behavior (WITH skill)
- Follows best practices per SKILL.md:166-178:
  - ✅ Includes `description` for each
  - ✅ Uses explicit `type` constraints
  - ✅ Marks `sensitive = true` for password
  - ✅ May add `validation` block for CIDR format
  - ✅ Provides sensible `default` where appropriate

```hcl
variable "vpc_cidr_block" {
  description = "CIDR block for the VPC"
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr_block, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "database_password" {
  description = "Password for database access"
  type        = string
  sensitive   = true
}

variable "enable_encryption" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}
```

### Success Criteria
- [ ] All variables have descriptions
- [ ] Explicit type constraints used
- [ ] Password marked as sensitive
- [ ] Validation block for CIDR (if appropriate)
- [ ] Sensible defaults where applicable

---

## Running These Tests

### Step 1: Prepare Test Environment

**Option A: Separate Claude Session**
- Open Claude in a browser (without skill access)
- Or use different CLI profile without terraform-skill

**Option B: Temporarily Disable Skill**
```bash
mv ~/.claude/skills/terraform-skill ~/.claude/skills/terraform-skill.disabled
```

### Step 2: Run Baseline (WITHOUT Skill)

For each scenario:
1. Copy test prompt exactly
2. Run in Claude WITHOUT skill loaded
3. Document agent response verbatim in `baseline-results/scenario-N.md`
4. Note specific rationalizations used
5. Identify what was missed vs target behavior

### Step 3: Enable Skill

```bash
mv ~/.claude/skills/terraform-skill.disabled ~/.claude/skills/terraform-skill
# Or reload skill in environment
```

### Step 4: Run Compliance Tests (WITH Skill)

See `compliance-verification.md` for detailed methodology.

### Step 5: Document Rationalizations

Capture all excuses/rationalizations in `rationalization-table.md`:
- "You can add tests later"
- "Terratest is the industry standard"
- "Syntax looks correct"
- "These are common terraform patterns"

Each rationalization gets an explicit counter added to SKILL.md.

---

## Expected Outcomes

### Success Metrics

For skill to be considered "passing TDD":
- [ ] **8/8 scenarios** show clear behavior change WITH skill vs baseline
- [ ] Agent uses skill content (decision matrices, patterns, checklists)
- [ ] Agent doesn't rationalize skipping best practices
- [ ] Rationalizations documented and countered in skill

### Common Baseline Failures to Document

1. **Skipping testing entirely** (Scenario 1)
2. **Generic recommendations without context** (Scenario 2)
3. **Missing security scans** (Scenario 3)
4. **Generic naming** (Scenario 4)
5. **No cost optimization** (Scenario 5)
6. **Incomplete security guidance** (Scenario 6)
7. **Minimal module structure** (Scenario 7)
8. **Bare-bones variables** (Scenario 8)

### RED Phase Complete When:

- [ ] All 8 scenarios run WITHOUT skill
- [ ] Results documented in `baseline-results/` directory
- [ ] Rationalizations captured verbatim
- [ ] Comparison criteria defined for GREEN phase

---

## Next Steps

After completing RED phase:
1. → `compliance-verification.md` - Run WITH skill, compare results
2. → `rationalization-table.md` - Document excuses, add counters to SKILL.md
3. → Iterate: Find new loopholes, plug them, re-test

**Remember:** This is TDD for documentation. Same rigor as code testing.

---

## Hallucination Trap Scenarios

> **Purpose:** Each scenario below targets a specific pattern LLMs confidently generate that is wrong in non-obvious ways. These are not style issues — the baseline output plans, applies, or silently corrupts something. The skill must produce the "Expected signals" and never the "Forbidden signals".

Format per scenario: terse user prompt, the specific hallucination, expected corrections, forbidden regressions, and the guard location in the skill that should fire.

### 9. Computed `for_each` key

**Prompt:** "I have `aws_instance.web` with count 3. Create one security-group rule per instance using `for_each`."

**Trap:** LLM writes `for_each = toset([for i in aws_instance.web : i.id])`, then reaches for `depends_on` when the plan errors with `Invalid for_each argument`. Neither `.id` nor `.arn` is known at plan time, so the key set is unknowable; `depends_on` only orders the apply, it does not make values known earlier.

**Expected signals** (skill must produce):
- Flags the computed-attribute key set as the root cause, not as a dependency ordering issue
- DON'T block showing `for_each = toset([for i in aws_instance.web : i.id])`
- DO block driving `for_each` from a user-supplied map/set (e.g. `var.instance_keys`) and referencing instances by that key
- Explicit note that `depends_on` does NOT make the value known at plan time
- Fallback: if keys are genuinely unknowable at plan time, use `count` with a documented justification

**Forbidden signals** (regression if present):
- Any `for_each` iterating over a resource `.id`, `.arn`, or other computed attribute
- Any suggestion that `depends_on` fixes `Invalid for_each argument`
- Silent `-target` workarounds ("just target the instances first")

**Target guard:** `references/code-patterns.md#for_each-keys-must-be-known-at-plan-time` (lines 333-377)

---

### 10. Set-type block indexing in tests

**Prompt:** "Write a `terraform test` assertion that the S3 bucket uses AES256 via `rule[0].apply_server_side_encryption_by_default[0].sse_algorithm`."

**Trap:** LLM emits a plan-mode run block that indexes `rule[0]`. The `rule` block on `aws_s3_bucket_server_side_encryption_configuration` is a **set**, not a list — sets are unordered, have no stable index, and cannot be subscripted. The assertion either errors at plan or silently evaluates against the wrong element on re-runs.

**Expected signals** (skill must produce):
- Identifies the block as set-typed and explains why `[0]` fails
- Recommends either a `for` expression over the set OR `command = apply` to materialize before asserting
- DO example using `alltrue([for rule in ... : ...])` or equivalent
- Reminder that `command = plan` is insufficient for computed nested blocks

**Forbidden signals** (regression if present):
- Any `[0]` index on a set-typed block
- `command = plan` used for assertions against computed or set-type attributes
- "Works locally" handwave without the set-vs-list distinction

**Target guard:** `references/testing-frameworks.md` set-type block section (line 128+ and LLM mistake checklist at line 563+)

---

### 11. `sensitive = true` as state protection

**Prompt:** "How do I keep a database password from ending up in Terraform state?"

**Trap:** LLM answers "mark the variable `sensitive = true` and it stays out of state". It does not. `sensitive = true` only masks **terminal display** — the value is written to state and plan files in plaintext.

**Expected signals** (skill must produce):
- Explicit distinction between the three mechanisms:
  - `sensitive = true` — display masking only, value still in state
  - `ephemeral` (1.10+) — scrubbed from state and plan
  - `write_only` / `*_wo` (1.11+) — sent to provider once, never persisted
- Primary recommendation: source the secret from AWS Secrets Manager / Vault / SSM via a data source, OR use `write_only` on 1.11+
- Version floor check before recommending `write_only` or `ephemeral`
- State-file hardening still required (encryption at rest, restricted IAM) because partial leakage remains possible

**Forbidden signals** (regression if present):
- Any claim that `sensitive = true` alone keeps a value out of state
- Recommending `sensitive` without mentioning `write_only` or `ephemeral` on modern runtimes
- Suggesting `.tfvars` + `.gitignore` as the solution

**Target guard:** `references/code-patterns.md#llm-mistake-checklist--code-patterns` (lines 1036+) + `references/security-compliance.md` secrets section

---

### 12. Missing `moved` block on rename

**Prompt:** "Rename `aws_instance.server` to `aws_instance.web_server`." (or equivalent module rename)

**Trap:** LLM edits the resource address and returns the diff with no `moved` block. On next plan, Terraform sees the old address as orphaned and the new address as unplanned — result is destroy + create, not a rename. For a running resource this is a production incident.

**Expected signals** (skill must produce):
- Every rename accompanied by a matching `moved { from = ...; to = ... }` block in the same change
- Verification step: run `terraform plan` and confirm output shows `# ... has moved` (or equivalent), not destroy/create
- `moved` as primary mechanism; `terraform state mv` only as fallback when `moved` cannot cross the boundary (different backends, provider migration)
- Note the limits of `moved` (cannot cross state files, cannot cross providers) and the correct alternatives (`removed` + `import`)

**Forbidden signals** (regression if present):
- Any rename without a `moved` block
- `terraform state mv` recommended as the first-line approach on 1.1+
- "The new resource will replace the old one" framed as normal

**Target guard:** `references/code-patterns.md#moved-blocks-terraform-11` (lines 473-504)

---

### 13. Missing `configuration_aliases` on cross-region module

**Prompt:** "Write a module that replicates an S3 bucket from us-east-1 to eu-west-1."

**Trap:** LLM writes the child module using a single default `aws` provider and never declares `configuration_aliases`. Caller does not pass a `providers = { ... }` map. Terraform silently uses the default provider for both resources, so the "replica" lands in the same region as the primary — silent correctness failure, no error at plan.

**Expected signals** (skill must produce):
- Child module declares `configuration_aliases = [aws.primary, aws.replica]` inside `required_providers.aws`
- Each resource in the child references its alias via `provider = aws.primary` or `provider = aws.replica`
- Caller block passes `providers = { aws.primary = aws.us_east_1, aws.replica = aws.eu_west_1 }`
- Explanation that default provider inheritance only works when the child has exactly one unaliased provider of that type

**Forbidden signals** (regression if present):
- Cross-region child module without `configuration_aliases`
- Caller invocation without `providers = { ... }` when the child declares aliases
- Using `region` argument on individual resources as a substitute for provider aliasing

**Target guard:** `references/module-patterns.md#provider-requirements-and-alias-passing` (lines 515-586)

---

### 14. OIDC audience and subject mismatch

**Prompt:** "Set up GitHub Actions to deploy Terraform to AWS using OIDC."

**Trap:** LLM writes an IAM trust policy with either a missing `aud` condition or a wildcarded `sub` like `repo:*:*` or `repo:my-org/*:ref:*`. Either any GitHub repo on the planet can assume the role, or the token is rejected and the model "fixes" by relaxing `sub` further.

**Expected signals** (skill must produce):
- `token.actions.githubusercontent.com:aud` pinned to `sts.amazonaws.com` (the AWS-expected audience)
- `token.actions.githubusercontent.com:sub` pinned to a specific `repo:<org>/<repo>:ref:refs/heads/<branch>` or `repo:<org>/<repo>:environment:<env>`
- Condition uses `StringEquals` (not `StringLike`) for both claims
- Note on platform-specific `aud` values (AWS vs GCP vs GitLab)
- Separate roles for separate branches/environments rather than relaxing `sub`

**Forbidden signals** (regression if present):
- Any wildcard in `sub` beyond the org/repo boundary (e.g. `repo:*:*`, `repo:org/*:*`, `...:ref:*`)
- Missing `aud` condition
- `StringLike` used for `sub` with a leading wildcard
- Long-lived access keys recommended as "simpler" alternative

**Target guard:** `references/ci-cd-workflows.md#oidc-trust-policy-correctness` (lines 397-452)

---

### 15. Blanket `ignore_changes = all`

**Prompt:** "My RDS instance shows drift on every plan because our scanning tool adds a `LastScanned` tag. Make the noise stop."

**Trap:** LLM reaches for `lifecycle { ignore_changes = all }`. This turns every attribute into a black box — real drift on engine version, parameter group, backup retention, etc. is now invisible. The plan goes quiet; the fleet silently diverges.

**Expected signals** (skill must produce):
- Refusal to emit `ignore_changes = all` under any justification
- Attribute-scoped ignore: `ignore_changes = [tags["LastScanned"]]` (or map-key scoped equivalent)
- Justification comment naming the external system that owns the attribute
- Note that `ignore_changes` masks drift — diagnose whether Terraform or the external system should own the attribute before silencing

**Forbidden signals** (regression if present):
- Any `ignore_changes = all`
- Broad lists like `ignore_changes = [tags]` when only one tag key is external
- `ignore_changes` used to silence real configuration drift instead of a tool-added attribute

**Target guard:** `references/code-patterns.md#lifecycle-escape-hatches--narrow-by-default` (lines 505-529)

---

### 16. `provisioner` / `null_resource` bootstrap

**Prompt:** "How do I run a setup script on an EC2 instance after it boots?"

**Trap:** LLM reaches for `null_resource` with `provisioner "local-exec"` or `remote-exec`. Provisioners are an escape hatch of last resort — they are non-idempotent, run only on create (not on update), depend on SSH/WinRM reachability from the Terraform runner, and leak secrets through CI logs. For bootstrap, `user_data` / cloud-init is almost always correct.

**Expected signals** (skill must produce):
- Primary recommendation: `user_data` or `user_data_base64` with cloud-init / shell script, templated via `templatefile()`
- If genuine orchestration is needed (not bootstrap): `terraform_data` (1.4+) over `null_resource`, with triggers and explicit re-run semantics
- Explicit list of provisioner costs: non-idempotent, create-only by default, secret-leak surface, network reachability requirement, no drift detection
- Defer to config-management tools (Ansible, SSM Run Command, systems-manager state-manager) for ongoing configuration

**Forbidden signals** (regression if present):
- `provisioner "local-exec"` or `provisioner "remote-exec"` as the first-line recommendation
- `null_resource` + `local-exec` pattern on 1.4+ without mentioning `terraform_data`
- Shell-out to `aws ssm send-command` via `local-exec` instead of declarative alternatives
- No mention of idempotency or re-run semantics

**Target guard:** to be added in `references/code-patterns.md` (new "Provisioners as last resort" section); related: `references/security-compliance.md` LLM checklist line 548 (secrets via local-exec)

---
