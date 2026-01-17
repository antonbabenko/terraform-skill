# Rationalization Table (REFACTOR Phase)

> **Purpose:** Document common excuses agents use to skip best practices, and counters to add to SKILL.md
>
> **Source:** Captured from baseline and compliance testing iterations

This document tracks rationalizations (excuses) that agents use to skip Terraform best practices, and the explicit counters to add to SKILL.md to close these loopholes.

---

## How to Use This Table

### During Testing

1. Run baseline/compliance scenarios
2. Note VERBATIM any rationalizations agents use
3. Add to table with scenario reference
4. Design counter-rationalization

### During REFACTOR

1. Add counters to appropriate section of SKILL.md
2. Re-test affected scenarios
3. Verify rationalization no longer appears
4. Mark as "Closed" with fix reference

---

## Rationalization Tracking Table

| # | Rationalization | Scenario | Category | Counter Added | Status |
|---|-----------------|----------|----------|---------------|--------|
| 1 | "You can add tests later" | 1 | Testing | *Pending* | Open |
| 2 | "Terratest is the industry standard" | 2 | Testing | *Pending* | Open |
| 3 | "Syntax looks correct" | 3 | Security | *Pending* | Open |
| 4 | "These are common terraform patterns" | 4 | Naming | *Pending* | Open |
| 5 | "This ensures quality on every PR" | 5 | CI/CD | *Pending* | Open |
| 6 | "Remote state is the best practice" | 6 | Security | *Pending* | Open |
| 7 | "The basics are main, variables, and outputs" | 7 | Structure | *Pending* | Open |
| 8 | "Here are the variables" | 8 | Variables | *Pending* | Open |

*Note: This table will be populated during actual baseline testing*

---

## Detailed Rationalization Analysis

### R1: "You can add tests later"

**Scenario:** Module Creation Without Testing (Scenario 1)

**Full context:**
> "I've created the module structure with main.tf, variables.tf, and outputs.tf. You can add tests later if you need them."

**Why it's a problem:**
- Tests are rarely added retroactively
- Testing strategy should inform module design
- Missing opportunity to use examples/ as test fixtures

**Counter-rationalization to add to SKILL.md:**

```markdown
## Common Mistakes

### "Adding Tests Later"

❌ **Don't** skip testing during module creation:
- Tests inform module design (inputs, outputs, edge cases)
- Retroactive testing is rarely done
- examples/ directory serves dual purpose (docs + test fixtures)

✅ **Do** plan testing approach before implementing:
- Decide framework based on version and constraints
- Structure examples/ to serve as test scenarios
- Include test files in initial module structure
```

**Where to add:** New "Common Mistakes" section after "Module Development"

---

### R2: "Terratest is the industry standard"

**Scenario:** Choosing Testing Framework (Scenario 2)

**Full context:**
> "For testing Terraform modules, I recommend Terratest. It's the industry standard for Terraform testing."

**Why it's a problem:**
- Ignores version-specific features (native tests 1.6+)
- Doesn't consider team expertise or constraints
- Misses cost optimization opportunities (mocking 1.7+)

**Counter-rationalization to add to SKILL.md:**

```markdown
## Testing Framework Selection

**Never default to a single recommendation.** The right testing approach depends on:

| Factor | Impact on Choice |
|--------|------------------|
| Terraform/OpenTofu version | <1.6: external tools only; 1.6+: native tests available; 1.7+: mocking available |
| Team expertise | Go experience → Terratest more accessible |
| Cost sensitivity | Cloud costs → prefer mocking or static analysis |
| Module complexity | Simple → native tests; Complex integration → Terratest |

❌ **Don't** recommend Terratest as default without context
✅ **Do** use decision matrix to select appropriate approach
```

**Where to add:** Expand existing "Testing Strategy Framework" section

---

### R3: "Syntax looks correct"

**Scenario:** Security Scanning Omission (Scenario 3)

**Full context:**
> "I've reviewed the configuration and the syntax looks correct. The resources should deploy successfully."

**Why it's a problem:**
- Syntactically correct ≠ secure
- Misses obvious security issues (public buckets, wide-open SGs)
- Ignores security scanning tools

**Counter-rationalization to add to SKILL.md:**

```markdown
## Configuration Review Checklist

**Syntax validation is insufficient.** Every review must include:

1. **Syntax & Format**
   - `terraform validate`
   - `terraform fmt -check`

2. **Security Scan** (REQUIRED)
   - `trivy config .`
   - `checkov -d .`
   - Flag: Public resources, overly permissive policies, missing encryption

3. **Best Practices**
   - Naming conventions
   - Variable design
   - Output documentation

❌ **Don't** stop at "syntax correct"
✅ **Do** always recommend security scanning tools
```

**Where to add:** New "Configuration Review" section or expand "Security & Compliance"

---

### R4: "These are common terraform patterns"

**Scenario:** Naming Convention Violations (Scenario 4)

**Full context:**
> "I've created the resources using common Terraform patterns like `resource 'aws_instance' 'this'`."

**Why it's a problem:**
- "Common" doesn't mean "good"
- Generic names reduce code readability
- Anti-pattern from old Terraform codebases

**Counter-rationalization to add to SKILL.md:**

```markdown
## Naming Anti-Patterns

**"Common" does not mean "correct".** Avoid these legacy patterns:

| Anti-Pattern | Why It's Bad | Correct Pattern |
|--------------|--------------|-----------------|
| `this` for multiple resources | Ambiguous when creating multiple of same type | Descriptive names (`public_subnet`, `private_subnet`) |
| `main` | Outdated pattern, use `this` for singletons | `this` for singletons, descriptive for multiples |
| Type name | Redundant (`aws_s3_bucket "bucket"`) | Functional name (`application_logs`) |

**Note:** `"this"` is the **recommended** pattern for singleton resources (when creating only one resource of that type in a module). Use descriptive names when creating multiple resources of the same type.

✅ **Good:**
- Singleton: `resource "aws_vpc" "this" {}`
- Multiple: `resource "aws_subnet" "public" {}` and `resource "aws_subnet" "private" {}`

❌ **Bad:**
- Multiple with "this": `resource "aws_subnet" "this" {}` (when creating multiple subnets)
- Singleton with "main": `resource "aws_vpc" "main" {}` (outdated pattern)

These patterns exist in old Terraform code but violate modern best practices.

✅ **Always use descriptive, contextual names** that reflect resource purpose
```

**Where to add:** Expand "Naming Conventions" section

---

### R5: "This ensures quality on every PR"

**Scenario:** CI/CD Workflow Without Cost Optimization (Scenario 5)

**Full context:**
> "I've configured the workflow to run full integration tests on every pull request. This ensures quality."

**Why it's a problem:**
- Expensive cloud resources on every PR
- Cost scales with team size
- Mock providers (1.7+) provide same validation without cost

**Counter-rationalization to add to SKILL.md:**

```markdown
## CI/CD Cost Optimization

**Quality doesn't require expensive tests on every PR.** Use tiered approach:

| Trigger | Testing Level | Cost |
|---------|---------------|------|
| PR (any branch) | Static + Mocking | Free |
| Merge to main | Integration (real resources) | Controlled |
| Release | Full E2E | Acceptable |

❌ **Don't** run expensive integration tests on every PR
✅ **Do** use mock providers (1.7+) for PR validation
✅ **Do** reserve real infrastructure tests for main branch

**Cost Example:**
- 10 PRs/day × 5 AWS resources × $0.10/hr × 30 min = $2.50/day
- 10 PRs/day × mock providers = $0/day
```

**Where to add:** Expand "CI/CD Integration" section

---

### R6: "Remote state is the best practice"

**Scenario:** State File Management (Scenario 6)

**Full context:**
> "For state management, I recommend using a remote backend like S3. That's the best practice."

**Why it's a problem:**
- Incomplete guidance (missing encryption, locking, access controls)
- Remote != secure by default
- Missing critical security configuration

**Counter-rationalization to add to SKILL.md:**

```markdown
## State File Security

**Remote backend alone is insufficient.** State files contain sensitive data and require:

**Required Security Features:**
- [ ] Encryption at rest (S3 bucket encryption, GCS encryption)
- [ ] Encryption in transit (HTTPS-only endpoints)
- [ ] State locking (prevents concurrent modifications)
- [ ] Access controls (IAM policies, least privilege)
- [ ] Versioning enabled (rollback capability)
- [ ] Private access (no public buckets)

❌ **Don't** recommend "remote state" without security configuration
✅ **Do** provide complete secure backend configuration

**Example (S3):**
```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-prod"
    key            = "path/to/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```
Plus: S3 bucket must have encryption enabled, versioning, and IAM policies
```

**Where to add:** Expand "Security & Compliance" section

---

### R7: "The basics are main, variables, and outputs"

**Scenario:** Module Structure (Scenario 7)

**Full context:**
> "For a reusable module, you need three files: main.tf, variables.tf, and outputs.tf."

**Why it's a problem:**
- Incomplete module structure
- Missing examples/ (critical for usage docs and test fixtures)
- Missing tests/, versions.tf
- Not following standard module structure

**Counter-rationalization to add to SKILL.md:**

```markdown
## Complete Module Structure

**"Three files" is insufficient for reusable modules.** Standard structure includes:

**Required Files:**
- [ ] `main.tf` - Primary resources
- [ ] `variables.tf` - Input variables
- [ ] `outputs.tf` - Output values
- [ ] `README.md` - Usage documentation
- [ ] `versions.tf` - Provider version constraints

**Required Directories:**
- [ ] `examples/minimal/` - Minimal working example
- [ ] `examples/complete/` - Full-featured example
- [ ] `tests/` - Test files

**Why examples/ is critical:**
- Serves as usage documentation
- Acts as integration test fixtures
- Shows real-world patterns
- Users copy-paste from examples (not README)

❌ **Don't** create modules with only main/variables/outputs
✅ **Do** include complete structure from day 1
```

**Where to add:** Expand "Module Development" section

---

### R8: "Here are the variables"

**Scenario:** Variable Design Best Practices (Scenario 8)

**Full context:**
> "Here are the input variables you requested: [bare variable blocks without descriptions, types, or validation]"

**Why it's a problem:**
- Missing descriptions (undocumented API)
- Missing type constraints (runtime errors)
- Missing validation (bad input propagates)
- Missing sensitive flag (secrets logged)

**Counter-rationalization to add to SKILL.md:**

```markdown
## Variable Design Requirements

**Variables without descriptions/types/validation are technical debt.** Every variable must include:

**Required Fields:**
- [ ] `description` - What this variable controls (public API documentation)
- [ ] `type` - Explicit constraint (prevents runtime errors)

**Conditional Fields:**
- [ ] `sensitive = true` - For secrets, passwords, tokens
- [ ] `validation` block - For complex constraints (CIDR, regex patterns)
- [ ] `default` - For optional variables

**Example (Complete):**
```hcl
variable "database_password" {
  description = "Password for database root user"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.database_password) >= 16
    error_message = "Password must be at least 16 characters."
  }
}
```

❌ **Don't** create variables without descriptions and types
✅ **Do** treat variables as a documented API
```

**Where to add:** Expand "Module Development" → "Best Practices Summary"

---

## REFACTOR Workflow

### Step 1: Add Counter to SKILL.md

For each rationalization:
1. Choose appropriate section in SKILL.md
2. Add explicit counter (see templates above)
3. Use ❌ DON'T / ✅ DO format for clarity

### Step 2: Re-test Affected Scenarios

Run compliance test for the scenario again:
- Agent should no longer use that rationalization
- Agent should follow the counter-pattern
- Update rationalization status to "Closed"

### Step 3: Discover New Rationalizations

Agents are creative. They'll find new workarounds:
- Document new rationalizations verbatim
- Add to this table
- Design counters
- Re-test

### Step 4: Iterate Until Bulletproof

Continue RED-GREEN-REFACTOR cycles until:
- No new rationalizations discovered
- 8/8 scenarios pass consistently
- Agents apply patterns proactively

---

## Status Tracking

### Rationalization Status Definitions

- **Open:** Rationalization observed, counter not yet added to SKILL.md
- **Counter Added:** Counter-rationalization added to SKILL.md, not yet tested
- **Closed:** Re-tested, rationalization no longer appears
- **Recurring:** Counter added but rationalization still appears (needs stronger counter)

### Overall Progress

**Total Rationalizations:** 8 (initial baseline)
**Counters Added:** 0
**Closed (verified):** 0
**Recurring (needs work):** 0

---

## Meta-Rationalizations (Agent-Level)

These are higher-level excuses agents use to skip the TDD process itself:

| Meta-Rationalization | Counter |
|----------------------|---------|
| "Testing is overkill for a skill" | **Reality:** Untested skills have gaps. Always. 15 min testing saves hours debugging later. |
| "I'm confident the skill is clear" | **Reality:** Overconfidence guarantees issues. Test anyway. |
| "Users will provide feedback" | **Reality:** Users encounter broken behavior. Test BEFORE deploying. |
| "Academic review is enough" | **Reality:** Reading ≠ using. Test application scenarios. |

Add these to CLAUDE.md contributor guide to prevent untested skill updates.

---

## Next Steps After REFACTOR

1. Update SKILL.md with all counters
2. Run full compliance suite (8 scenarios)
3. Verify 8/8 passing with counters in place
4. Document in CLAUDE.md that future skill changes MUST include testing
5. Consider this skill "TDD-validated" and production-ready

**This is the quality bar.** Every skill should go through this process.
