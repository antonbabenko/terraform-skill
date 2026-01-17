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
