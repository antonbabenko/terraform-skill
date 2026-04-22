# Rationalization Table / Coverage Map

> **Purpose:** Map hallucination surfaces to the baseline scenario that exercises them and the skill guard that must catch them. Tracks whether each surface is covered, partially covered, or open.
>
> **Source:** Baseline test scenarios in `baseline-scenarios.md` and the LLM-mistake checklists inside each reference file.

This document has two parts:

1. **Coverage matrix** (primary) — a compact table keyed on hallucination surface, pointing at the baseline scenario that exercises it and the guard location (file + anchor) responsible for catching it.
2. **Detailed rationalization analyses** — historical per-scenario excuses (R1–R8) captured during initial TDD passes. These remain useful to explain *why* the guard needs specific counter-language, not just a passing assertion.

---

## How to Use This Document

### During Testing

1. Run a baseline scenario from `baseline-scenarios.md`.
2. If the skill fails to produce the "Expected signals" or emits a "Forbidden signal", locate the corresponding row in the coverage matrix.
3. If the row is `✅`, the guard is insufficient — downgrade to `◐` and note why.
4. If the row is `◐` or `❌`, follow the guard path to the reference file and strengthen the language.

### During REFACTOR

1. Add or strengthen the counter in the referenced guard location.
2. Re-run the affected baseline scenario.
3. Promote the row status when the scenario passes consistently.

### Legend

| Status | Meaning |
|--------|---------|
| `✅` | Dedicated guard exists in the skill, tested against at least one baseline scenario, passes |
| `◐` | Partial — guard exists but is weak, untested, or shares real estate with unrelated content |
| `❌` | No guard yet — this surface is a known gap and a priority for the next PR |

---

## Coverage Matrix

| # | Hallucination surface | Baseline scenario | Target guard (file + anchor) | Coverage |
|---|-----------------------|-------------------|------------------------------|----------|
| 1 | Module created without any test scaffolding | §1 Module Creation Without Testing | `SKILL.md` Testing Strategy + `references/testing-frameworks.md` | ✅ |
| 2 | Defaulting to Terratest without version-aware decision | §2 Choosing Testing Framework | `SKILL.md` Decision Matrix: Which Testing Approach? | ✅ |
| 3 | Review stopping at "syntax correct" — no security scan | §3 Security Scanning Omission | `SKILL.md` Security & Compliance + `references/security-compliance.md` | ✅ |
| 4 | Generic resource names (`main`, `bucket`, `this` for multiples) | §4 Naming Convention Violations | `SKILL.md` Naming Conventions + `references/module-patterns.md` | ✅ |
| 5 | CI/CD running real-infra tests on every PR | §5 CI/CD Workflow Without Cost Optimization | `SKILL.md` CI/CD + `references/ci-cd-workflows.md#cost-optimization` | ✅ |
| 6 | Remote state recommended without encryption / locking / IAM | §6 State File Management | `SKILL.md` State Management + `references/state-management.md` | ✅ |
| 7 | Module scaffolded as only `main.tf`/`variables.tf`/`outputs.tf` | §7 Module Structure | `SKILL.md` Module Development + `references/module-patterns.md#file-organization-standards` | ✅ |
| 8 | Variables emitted without `description` / `type` / `sensitive` | §8 Variable Design Best Practices | `SKILL.md` Module Development → Variable contracts | ✅ |
| 9 | `for_each` keyed on computed resource attribute (`.id`, `.arn`) | §9 Computed `for_each` key | `references/code-patterns.md#for_each-keys-must-be-known-at-plan-time` | ✅ |
| 10 | Set-type nested blocks indexed with `[0]` in tests | §10 Set indexing in tests | `references/testing-frameworks.md` set-type section + LLM mistake checklist | ✅ |
| 11 | `sensitive = true` claimed to keep value out of state | §11 `sensitive` as state protection | `references/code-patterns.md#llm-mistake-checklist--code-patterns` + `references/security-compliance.md` secrets | ✅ |
| 12 | Rename without `moved` block (causes destroy/create) | §12 Missing `moved` on rename | `references/code-patterns.md#moved-blocks-terraform-11` | ✅ |
| 13 | Cross-region/account child missing `configuration_aliases` | §13 Missing `configuration_aliases` | `references/module-patterns.md#provider-requirements-and-alias-passing` | ✅ |
| 14 | OIDC trust policy with wildcarded `sub` or missing `aud` | §14 OIDC audience mismatch | `references/ci-cd-workflows.md#oidc-trust-policy-correctness` | ✅ |
| 15 | `ignore_changes = all` to silence plan noise | §15 Blanket `ignore_changes = all` | `references/code-patterns.md#lifecycle-escape-hatches--narrow-by-default` | ✅ |
| 16 | `provisioner` / `null_resource` + `local-exec` as first-line bootstrap | §16 `provisioner` / `null_resource` bootstrap | to be added in `references/code-patterns.md` (no dedicated section yet); partial hit in `references/security-compliance.md` LLM checklist | ❌ |

### Coverage Summary

- **Total surfaces tracked:** 16
- **Covered (`✅`):** 15
- **Partial (`◐`):** 0
- **Open gaps (`❌`):** 1 (row 16 — provisioners)

### Priority Gaps (❌ rows)

These are the surfaces with no dedicated guard today and should be addressed in the next PR:

1. **Row 16 — Provisioners as last resort.** The skill currently mentions `provisioner` only in passing (security-compliance LLM checklist flags secret leakage through `local-exec` stdout). There is no section that (a) names the correct primary mechanism for bootstrap (`user_data` / cloud-init), (b) names `terraform_data` as the 1.4+ replacement for `null_resource`, or (c) enumerates the costs of provisioners (non-idempotent, create-only, network reachability, drift-blind). Add a "Provisioners as last resort" section to `references/code-patterns.md` and cross-link from the SKILL.md workflow section.

---

## Detailed Rationalization Analyses

These entries capture the verbatim excuses agents use for scenarios 1–8. They predate the hallucination-trap scenarios (9–16) and remain useful for refining the counter-language inside the guards, not just for tracking coverage.

### R1: "You can add tests later"

**Scenario:** Module Creation Without Testing (§1)

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

**Scenario:** Choosing Testing Framework (§2)

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

**Scenario:** Security Scanning Omission (§3)

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

**Scenario:** Naming Convention Violations (§4)

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

**Scenario:** CI/CD Workflow Without Cost Optimization (§5)

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

**Scenario:** State File Management (§6)

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

**Scenario:** Module Structure (§7)

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

**Scenario:** Variable Design Best Practices (§8)

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

## Meta-Rationalizations (Agent-Level)

These are higher-level excuses agents use to skip the TDD process itself:

| Meta-Rationalization | Counter |
|----------------------|---------|
| "Testing is overkill for a skill" | **Reality:** Untested skills have gaps. Always. 15 min testing saves hours debugging later. |
| "I'm confident the skill is clear" | **Reality:** Overconfidence guarantees issues. Test anyway. |
| "Users will provide feedback" | **Reality:** Users encounter broken behavior. Test BEFORE deploying. |
| "Academic review is enough" | **Reality:** Reading ≠ using. Test application scenarios. |

Add these to the contributor guide to prevent untested skill updates.

---

## REFACTOR Workflow

### Step 1: Locate the guard

For each failing baseline scenario, use the coverage matrix above to jump to the exact file + anchor where the counter lives.

### Step 2: Strengthen the counter

- Use ❌ DON'T / ✅ DO side-by-side for anything non-obvious.
- Include at least one code fragment showing the trap and at least one showing the fix.
- Name the failure mode (e.g. "silent destroy/create", "value still in state") — not just "best practice".

### Step 3: Re-test

- Run the baseline scenario WITH the updated skill loaded.
- Confirm the "Expected signals" appear and the "Forbidden signals" are absent.
- Upgrade the matrix row (`❌` → `◐` → `✅`) and note evidence.

### Step 4: Iterate

Agents are creative. New rationalizations surface over time. Add them to the coverage matrix with a new row rather than stretching an existing row.

---

## Status Tracking

### Row status definitions

- **`✅`** — guard exists, tested, scenario passes
- **`◐`** — guard exists but is weak, untested, or shares a section with unrelated content
- **`❌`** — no guard yet; priority for next PR

### Overall progress

- **Surfaces tracked:** 16
- **Scenarios exercising each:** 16 (one-to-one in `baseline-scenarios.md`)
- **Covered:** 15
- **Open:** 1 (provisioners — row 16)
