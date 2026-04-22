---
name: terraform-skill
description: Use when writing, reviewing, or debugging Terraform/OpenTofu modules, tests, CI, scans, or state ops — diagnoses failure mode (identity churn, secrets, blast radius, CI drift, state corruption) with version-aware guards.
license: Apache-2.0
metadata:
  author: Anton Babenko
  version: 1.6.0
---

# Terraform Skill for Claude

Diagnose-first guidance for Terraform and OpenTofu. Core file is a workflow; depth lives in references loaded on demand.

## Response Contract

Every Terraform/OpenTofu response must include:

1. **Assumptions & version floor** — runtime (`terraform` or `tofu`), exact version, providers, state backend, execution path (local/CI/Cloud/Atlantis), environment criticality. State assumptions explicitly if the user did not provide them.
2. **Risk category addressed** — one or more of: identity churn, secret exposure, blast radius, CI drift, compliance gaps, state corruption, provider upgrade risk, testing blind spots.
3. **Chosen remediation & tradeoffs** — what was chosen, what was traded off, why.
4. **Validation plan** — exact commands (`fmt -check`, `validate`, `plan -out`, policy check) tailored to runtime and risk tier.
5. **Rollback notes** — for any destructive or state-mutating change: how to undo, what evidence to keep.

Never recommend direct production apply without a reviewed plan artifact and approval.

## Workflow

1. **Capture execution context** — runtime+version, provider(s), backend, execution path, environment criticality.
2. **Diagnose failure mode(s)** using the routing table below. If intent spans categories, load both references.
3. **Load only the matching reference file(s)** — do not preload depth the task does not need.
4. **Propose fix with risk controls** — why this addresses the mode, what could still go wrong, guardrails (tests/approvals/rollback).
5. **Generate artifacts** — HCL, migration blocks (`moved`, `import`), CI changes, policy rules.
6. **Validate before finalizing** — run validation commands tailored to risk tier.
7. **Emit the Response Contract** at the end.

## Diagnose Before You Generate

| Failure category | Symptoms | Primary references |
|------------------|----------|--------------------|
| **Identity churn** | Resource addresses shift after refactor, `count` index churn, missing `moved` blocks | [Code Patterns: count vs for_each](references/code-patterns.md#count-vs-for_each-deep-dive), [Code Patterns: moved blocks](references/code-patterns.md#moved-blocks-terraform-11), [Code Patterns: LLM mistakes](references/code-patterns.md#llm-mistake-checklist--code-patterns) |
| **Secret exposure** | Secrets in defaults, state, logs, CI artifacts | [Security & Compliance](references/security-compliance.md), [Code Patterns: write-only](references/code-patterns.md#write-only-arguments-terraform-111), [State Management](references/state-management.md) |
| **Blast radius** | Oversized stacks, shared prod/non-prod state, unsafe applies | [State Management](references/state-management.md), [Module Patterns](references/module-patterns.md) |
| **CI drift** | Local plan ≠ CI plan, apply without reviewed artifact, unpinned versions | [CI/CD Workflows](references/ci-cd-workflows.md), [Code Patterns: versions](references/code-patterns.md#version-management) |
| **Compliance gaps** | Missing policy stage, no approval model, no evidence retention | [Security & Compliance](references/security-compliance.md), [CI/CD Workflows](references/ci-cd-workflows.md) |
| **Testing blind spots** | Plan-only validation of computed values, set-type indexing, mock/real confusion | [Testing Frameworks](references/testing-frameworks.md) |
| **State corruption / recovery** | Stuck lock, backend migration, drift reconciliation | [State Management](references/state-management.md) |
| **Provider upgrade risk** | Breaking-change provider bump, unpinned modules | [Code Patterns: versions](references/code-patterns.md#version-management), [Module Patterns](references/module-patterns.md) |
| **Provider lifecycle** | Removing a provider with resources still in state, orphaned resources, `removed` block usage | [State Management: Provider Removal](references/state-management.md#provider-removal) |

## When to Use This Skill

**Activate when:** creating or reviewing Terraform/OpenTofu configurations or modules, setting up or debugging tests, structuring multi-environment deployments, implementing IaC CI/CD, choosing module patterns or state organization, configuring or migrating remote state backends.

**Don't use for:** basic HCL syntax questions Claude already knows, provider API reference (link to docs), cloud-platform questions unrelated to Terraform/OpenTofu.

## Core Principles

### Module Hierarchy

| Type | When to Use | Scope |
|------|-------------|-------|
| **Resource module** | Single logical group of connected resources | VPC + subnets, SG + rules |
| **Infrastructure module** | Collection of resource modules for a purpose | Multiple resource modules in one region/account |
| **Composition** | Complete infrastructure | Spans multiple regions/accounts |

Flow: resource → resource module → infrastructure module → composition.

### Directory Layout

```
environments/   # prod/ staging/ dev/  — per-env configurations
modules/        # networking/ compute/ data/ — reusable modules
examples/       # minimal/ complete/ — docs + integration fixtures
```

Separate **environments** from **modules**. Use `examples/` as both documentation and test fixtures. Keep modules small and single-responsibility.

See [Module Patterns](references/module-patterns.md) for architecture principles, naming conventions, variable/output contracts.

### Naming Conventions (summary)

- Descriptive resource names (`aws_instance.web_server`, not `aws_instance.main`)
- Reserve `this` for genuine singleton resources only
- Prefix variables with context (`vpc_cidr_block`, not `cidr`)
- Standard files: `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`

See [Module Patterns: Variable Naming](references/module-patterns.md) and [Code Patterns: Block Ordering](references/code-patterns.md#block-ordering--structure) for examples.

### Block Ordering (summary)

Resource blocks: `count`/`for_each` first → arguments → `tags` → `depends_on` → `lifecycle`.
Variable blocks: `description` → `type` → `default` → `validation` → `nullable` → `sensitive`.

See [Code Patterns: Block Ordering & Structure](references/code-patterns.md#block-ordering--structure) for the full rules and examples.

## Testing Strategy

### Decision Matrix: Which Testing Approach?

| Situation | Approach | Tools | Cost |
|-----------|----------|-------|------|
| Quick syntax check | Static analysis | `validate`, `fmt` | Free |
| Pre-commit validation | Static + lint | `validate`, `tflint`, `trivy`, `checkov` | Free |
| Terraform 1.6+, simple logic | Native test framework | `terraform test` | Free-Low |
| Pre-1.6, or Go expertise | Integration testing | Terratest | Low-Med |
| Security/compliance focus | Policy as code | OPA, Sentinel | Free |
| Cost-sensitive workflow | Mock providers (1.7+) | Native tests + mocks | Free |
| Multi-cloud, complex | Full integration | Terratest + real infra | Med-High |

### Native Test Rules (1.6+)

Before writing test code: validate resource schemas via Terraform MCP so assertions target real attributes.

- `command = plan` — fast, for input-derived values only
- `command = apply` — required for **computed values** (ARNs, generated names) and **set-type nested blocks**
- Set-type blocks cannot be indexed with `[0]` — use `for` expressions or materialize via `command = apply`
- Common set types: S3 encryption rules, lifecycle transitions, IAM policy statements

See [Testing Frameworks](references/testing-frameworks.md) for static-analysis pipelines, native-test patterns, Terratest integration, mock providers, and the full LLM-mistake checklist.

## Count vs For_Each — Quick Rule

| Scenario | Use | Why |
|----------|-----|-----|
| Boolean condition (create / don't) | `count = condition ? 1 : 0` | Optional singleton toggle |
| Items may be reordered or removed | `for_each = toset(list)` | Stable resource addresses |
| Reference by key | `for_each = map` | Named access |
| Multiple named resources | `for_each` | Better identity stability |

**Never** use list index as long-lived identity — removing a middle element reshuffles every address after it. For the decision matrix, safe migration playbook, `moved` block patterns, and known-at-plan failure cases, see [Code Patterns: count vs for_each](references/code-patterns.md#count-vs-for_each-deep-dive).

## Locals for Dependency Management

Using `try()` in a local to prefer a conditional resource's attribute over its parent is a specialized but high-value pattern — it forces correct deletion order without explicit `depends_on`. Common use: VPC + secondary CIDR associations + subnets.

See [Code Patterns: Locals for Dependency Management](references/code-patterns.md#locals-for-dependency-management) for the full pattern and worked example.

## Module Development

Standard layout:

```
my-module/
├── README.md       # Usage documentation
├── main.tf         # Primary resources
├── variables.tf    # Typed inputs with descriptions
├── outputs.tf      # Output values
├── versions.tf     # required_version + required_providers
├── examples/
│   ├── minimal/
│   └── complete/
└── tests/
    └── module_test.tftest.hcl   # or Go for Terratest
```

**Variable contracts**: always `description`, always explicit `type`, use `validation` for complex constraints, use `sensitive = true` for secrets, prefer `optional()` with typed defaults (1.3+) over untyped `map(any)`.

**Output contracts**: always `description`, mark sensitive outputs, expose stable subsets (not whole provider objects).

See [Module Patterns](references/module-patterns.md) for the full contract patterns, module release checklist, and LLM-mistake checklist.

## CI/CD

Pipeline stages: **validate** → **test** → **plan** → **apply** (with environment protection).

Cost control: mock providers on PR validation, real-cloud integration only on main or scheduled, tag test resources, auto-cleanup.

Drift prevention: pin runtime and providers, commit `.terraform.lock.hcl`, apply the **reviewed plan artifact** from the plan stage (do not re-run `plan` inside the apply job), run policy/security stage on every path to apply.

See [CI/CD Workflows](references/ci-cd-workflows.md) for GitHub Actions, GitLab CI, and Atlantis templates plus the LLM-mistake checklist.

## Security & Compliance

**Essential checks:**

```bash
trivy config .
checkov -d .
```

**Don't:** store secrets in variables or `.tfvars`, use default VPC, skip encryption, open security groups to `0.0.0.0/0`, use inline `ingress`/`egress` blocks in `aws_security_group`.

**Do:** source secrets from AWS Secrets Manager / Parameter Store or use `write_only` arguments on 1.11+, create dedicated VPCs, enforce encryption at rest and TLS, least-privilege SGs, use separate `aws_vpc_security_group_{ingress,egress}_rule` resources (AWS provider v5+).

Marking a variable `sensitive = true` masks display only — the value still lives in state. Use `write_only` / `*_wo` on 1.11+, or keep secret material out of Terraform entirely via runtime lookups.

See [Security & Compliance](references/security-compliance.md) for trivy/checkov pipelines, state-file hardening, compliance mappings, and the LLM-mistake checklist.

## State Management

**Never use local state in teams or production.** Remote backends provide automatic locking, encryption, versioning, audit logging, and safe collaboration.

### Minimum Viable Backend (AWS S3, 1.10+)

```hcl
terraform {
  backend "s3" {
    bucket        = "my-terraform-state"
    key           = "prod/vpc/terraform.tfstate"
    region        = "us-east-1"
    encrypt       = true
    use_lockfile  = true   # Native S3 locking, 1.10+
  }
}
```

On Terraform < 1.10, use `dynamodb_table = "terraform-state-lock"` instead of `use_lockfile`. Azure Storage, GCS, and Terraform Cloud all offer built-in locking — see the State Management reference for syntax.

### State Organization

| Pattern | Use When | Example Path |
|---------|----------|--------------|
| **Per environment** | Different teams per env | `prod/terraform.tfstate`, `staging/...` |
| **Per component** | Independent lifecycles | `prod/vpc/`, `prod/eks/`, `prod/rds/` |
| **Hybrid** (recommended) | Both benefits | `prod/networking/`, `prod/compute/`, `staging/networking/` |

Split state when: different teams, different update cadences, or >500 resources. Combine when: tightly coupled resources, <100 resources, same lifecycle.

See [State Management](references/state-management.md) for locking, migration, multi-team isolation, disaster recovery, and the LLM-mistake checklist.

## Version Management

| Component | Strategy | Example |
|-----------|----------|---------|
| Terraform runtime | Pin minor | `required_version = "~> 1.9"` |
| Providers | Pin major | `version = "~> 5.0"` |
| Modules (prod) | Pin exact | `version = "5.1.2"` |
| Modules (dev) | Allow patch | `version = "~> 5.1"` |

Commit `.terraform.lock.hcl` intentionally. Keep provider/runtime upgrades in a separate PR from functional changes. See [Code Patterns: Version Management](references/code-patterns.md#version-management) for constraint syntax and upgrade workflow.

## Modern Terraform Features (1.0+)

| Feature | Min version | Common use |
|---------|-------------|------------|
| `try()` | 0.13+ | Safe fallbacks, replaces `element(concat())` |
| `nullable = false` | 1.1+ | Prevent `null` silently overriding defaults |
| `moved` blocks | 1.1+ | Refactor without destroy/recreate |
| `optional()` with defaults | 1.3+ | Typed object attributes |
| `import` blocks | 1.5+ | Declarative imports, reviewable in VCS |
| `check` blocks | 1.5+ | Runtime assertions |
| Native `terraform test` | 1.6+ | Built-in test framework |
| Mock providers | 1.7+ | Cost-free unit testing |
| `removed` blocks | 1.7+ | Declarative resource removal |
| Provider-defined functions | 1.8+ | Provider-specific transformations (requires provider to declare functions) |
| Cross-variable validation | 1.9+ | Reference other `var.*` in `validation` blocks |
| `write_only` arguments | 1.11+ | Secrets never stored in state |
| S3 native lock-file | 1.10+ | State locking without DynamoDB |

Before emitting a feature, verify the runtime floor. See [Code Patterns: Feature Guard Table](references/code-patterns.md#feature-guard-table--version-floor--common-llm-errors) for the full table with common LLM error patterns per feature.

## Runtime-Specific Guidance

- **Terraform 1.0-1.5 / OpenTofu 1.0-1.5**: Terratest for integration, static analysis + plan validation only (no native tests).
- **1.6+**: native `terraform test` / `tofu test` available — migrate simple unit tests, keep Terratest for complex integration.
- **1.7+**: mock providers cut test cost — mock for unit tests, real runs for final integration.
- **1.10+**: S3 native lock-file (`use_lockfile`) is the correct default for new configurations — DynamoDB locking is no longer required.
- **1.11+**: `write_only` arguments for secret handling keep credentials out of state.
- **Terraform vs OpenTofu**: both supported. For licensing, governance, and feature delta, see [Quick Reference: Terraform vs OpenTofu](references/quick-reference.md#terraform-vs-opentofu-comparison).

## Reference Files

Progressive disclosure — essentials here, depth on demand:

- [Testing Frameworks](references/testing-frameworks.md) — static analysis, native tests, Terratest, mock providers
- [Module Patterns](references/module-patterns.md) — structure, variable/output contracts, `terraform_remote_state` rules, release checklist
- [CI/CD Workflows](references/ci-cd-workflows.md) — GitHub Actions, GitLab CI, Atlantis, cost control
- [Security & Compliance](references/security-compliance.md) — trivy/checkov, secrets handling, compliance mappings
- [State Management](references/state-management.md) — backends, locking, migration, multi-team, recovery
- [Code Patterns](references/code-patterns.md) — block ordering, `count`/`for_each` deep dive, modern features, version management, locals
- [Quick Reference](references/quick-reference.md) — command cheat sheets, flowcharts, troubleshooting

## License

Apache License 2.0. See LICENSE for full terms.

**Copyright © 2026 Anton Babenko**
