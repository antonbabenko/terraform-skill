# Terraform & OpenTofu Skill for AI Agents

[![Agent Skill](https://img.shields.io/badge/Agent-Skill-5865F2)](https://agentskills.io)
[![Terraform](https://img.shields.io/badge/Terraform-1.0+-623CE4)](https://www.terraform.io/)
[![OpenTofu](https://img.shields.io/badge/OpenTofu-1.6+-FFD814)](https://opentofu.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A best-practices skill for Terraform and OpenTofu, for AI coding agents (Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, Codex, Kiro, and more). It helps the agent test code, structure modules, set up CI/CD, and write production infrastructure code.

AWS, Azure, and GCP are all first-class. AWS stays the default in examples, but the same backend, auth, security, and resource guidance applies to all three - ask for the Azure or GCP equivalent of any pattern and the skill maps it.

## What this skill provides

**Testing frameworks**
- Decision matrix for native tests vs Terratest
- Testing workflows (static, integration, E2E)
- Examples and patterns

**Module development**
- Structure and naming conventions
- Versioning strategies
- Public vs private module patterns

**State management**
- Remote backends (S3, Azure, GCS, Terraform Cloud)
- Locking and security
- Multi-team state isolation
- Migration and recovery procedures

**CI/CD integration**
- GitHub Actions workflows
- GitLab CI examples
- Cost optimization
- Compliance automation

**Security and compliance**
- Trivy and Checkov integration
- Policy-as-code patterns
- Compliance scanning workflows

**Quick reference**
- Decision flowcharts
- Common patterns (DO vs DON'T)
- Cheat sheets

## Installation

Installed through one Claude Code marketplace, `antonbabenko/agent-plugins`
(terraform-skill is listed there as an external plugin). Do not also add
`antonbabenko/terraform-skill` as a marketplace - both use the same marketplace
name and will clash.

### Quick install (any agent)

Works with any [Agent Skills](https://agentskills.io)-compatible tool:

```bash
npx skills add https://github.com/antonbabenko/terraform-skill
```

### Per-host instructions

<!-- prettier-ignore-start -->

<details>
<summary>Claude Code</summary>

```bash
/plugin marketplace add antonbabenko/agent-plugins
/plugin install terraform-skill@antonbabenko
```

</details>

<details>
<summary>Gemini CLI</summary>

```bash
gemini extensions install https://github.com/antonbabenko/terraform-skill
```

Update with `gemini extensions update terraform-skill`.

</details>

<details>
<summary>Cursor</summary>

```bash
git clone https://github.com/antonbabenko/terraform-skill.git ~/.cursor/skills/terraform-skill
```

Cursor auto-discovers skills from `.agents/skills/` and `.cursor/skills/`.

</details>

<details>
<summary>Copilot</summary>

```bash
/plugin install https://github.com/antonbabenko/terraform-skill
# or
git clone https://github.com/antonbabenko/terraform-skill.git ~/.copilot/skills/terraform-skill
```

Copilot auto-discovers skills from `.copilot/skills/`.

</details>

<details>
<summary>OpenCode</summary>

```bash
git clone https://github.com/antonbabenko/terraform-skill.git ~/.agents/skills/terraform-skill
```

OpenCode auto-discovers skills from `.agents/skills/`, `.opencode/skills/`, and `.claude/skills/`.

</details>

<details>
<summary>Codex (OpenAI)</summary>

```bash
git clone https://github.com/antonbabenko/terraform-skill.git ~/.agents/skills/terraform-skill
```

Codex auto-discovers skills from `~/.agents/skills/` and `.agents/skills/`. Update with `cd ~/.agents/skills/terraform-skill && git pull`.

For a managed Codex plugin install, use the `antonbabenko/agent-plugins`
marketplace (`codex plugin marketplace add antonbabenko/agent-plugins`, then
install `terraform-skill`). Do not add `antonbabenko/terraform-skill` as a
separate marketplace - it clashes by name with `agent-plugins`.

</details>

<details>
<summary>Kiro</summary>

```bash
git clone https://github.com/antonbabenko/terraform-skill.git ~/.kiro/skills/terraform-skill
```

Kiro auto-discovers skills from `.kiro/skills/` (workspace) and `~/.kiro/skills/` (global).

</details>

<details>
<summary>Antigravity</summary>

```bash
git clone https://github.com/antonbabenko/terraform-skill.git ~/.antigravity/skills/terraform-skill
```

Update with `cd ~/.antigravity/skills/terraform-skill && git pull`.

</details>

<details>
<summary>Kiro</summary>

This repo is also a [Kiro Power](https://kiro.dev/docs/powers/) (root
`POWER.md` + optional `mcp.json`). In Kiro: **Powers panel → "Add power from
GitHub"**, then paste:

```text
https://github.com/antonbabenko/terraform-skill
```

Kiro activates the power on keyword match (e.g. "terraform", "opentofu",
"state", "modules"). Installing it also registers the optional read-only
HashiCorp `terraform-mcp-server` (from `mcp.json`) under the Powers section of
`~/.kiro/settings/mcp.json` — the guidance works without it. `POWER.md` is
generated from `skills/terraform-skill/SKILL.md`; the skill content is shared,
not duplicated.

</details>

<details>
<summary>Manual (symlink local clone)</summary>

```bash
git clone https://github.com/antonbabenko/terraform-skill
mkdir -p ~/.claude/plugins
ln -s "$(pwd)/terraform-skill" ~/.claude/plugins/terraform-skill
```

Claude Code autodiscovers the skill at `skills/terraform-skill/SKILL.md` on next launch. Edits to the clone are picked up live.

</details>

<!-- prettier-ignore-end -->

### Verify installation

After installation, try:
```
"Create a Terraform module with testing for an S3 bucket"
```

Claude picks up the skill automatically when working with Terraform or OpenTofu code.

## Recommended companion: code-intelligence

Install the `code-intelligence` plugin alongside this one:

```bash
/plugin marketplace add antonbabenko/agent-plugins
/plugin install code-intelligence@antonbabenko
```

It holds the general, any-language rules for navigating code (when to use a
language server, plain text search, or fuzzy search; how to anchor a lookup to
a position; what to do when a tool fails; saying so when one tool is swapped
for another). terraform-skill is the Terraform-specific version of those rules.
Why install it:

- **Fewer tokens** - the rules live in one place. The agent loads them when
  needed instead of repeating them in every language skill.
- **More accurate** - it finds definitions and references by meaning, not by
  plain text matching, so renames and refactors do not miss spots or change
  the wrong ones.
- **Faster** - it picks the right tool the first time instead of retrying,
  and says up front when it had to use a different one.

terraform-skill works on its own without it. The name `code-intelligence` is
not unique; if a `code-intelligence` skill is active, check it is the one from
[antonbabenko/agent-plugins](https://github.com/antonbabenko/agent-plugins).

## Quick start examples

**Create a module with tests (AWS / Azure / GCP):**
> "Create a Terraform module for an AWS VPC with native tests"
>
> "Build an Azure module: VNet, subnets, and a PostgreSQL Flexible Server, with native tests"
>
> "Write a GCP module for a VPC network, subnetwork, and Cloud SQL Postgres, with native tests"

**Set up remote state:**
> "Configure an S3 backend with native `use_lockfile` locking and encryption for Terraform state"
>
> "Choose and configure a remote state backend for AWS, Azure, or GCP (locking, encryption, versioning)"

**Review existing code:**
> "Review this Terraform configuration following best practices"

**Generate CI/CD workflow:**
> "Create a GitHub Actions workflow for Terraform with cost estimation"

**Testing strategy:**
> "Help me choose between native tests and Terratest for my modules"

**State management:**
> "How should I organize state files for a multi-team environment?"

## Longer example prompts

These assume a recent Terraform/OpenTofu - `use_lockfile` is 1.10+, `write_only` is 1.11+.

<details>
<summary>AWS: production service (modules + composition, OIDC, native locking)</summary>

> "I'm building a new production service on AWS. Design reusable Terraform modules plus a prod/staging composition for a VPC with public/private subnets across 3 AZs, an ECS Fargate service behind an ALB, and an RDS Postgres instance. Include native `terraform test` coverage, variables with descriptions/types/validation, S3 remote state with encryption, bucket versioning, and native `use_lockfile` locking (Terraform 1.10+). Keep secret values out of plan/state - use `write_only` / `*_wo` arguments where the provider supports them (Terraform 1.11+) and Secrets Manager/SSM references for runtime secrets. Add a GitHub Actions workflow that runs fmt/validate/tflint/trivy on PRs, produces a reviewed plan artifact, and applies it via AWS OIDC (no static keys). Keep prod/staging state isolated and follow naming conventions."

</details>

<details>
<summary>GCP: port the AWS pattern (cross-cloud mapping, WIF, gcs backend)</summary>

> "We're standardizing IaC across clouds. Port our AWS module pattern to GCP: reusable modules plus an environment composition for a VPC network, a regional subnetwork, and a Cloud SQL Postgres instance (`google_sql_database_instance`). Use the `gcs` backend (`bucket` + `prefix`) for remote state, and show the state bootstrap bucket separately with object versioning, uniform bucket-level access, public access prevention, and IAM bindings. Use Workload Identity Federation for keyless GitHub Actions auth (no long-lived service-account keys) and native tests. Also show the cross-cloud equivalents (resources + backend) so the team sees the AWS-to-GCP mapping."

</details>

## What it covers

### Testing strategy

Decision matrices for native tests (Terraform 1.6+) vs Terratest (Go-based), plus multi-environment testing patterns.

### Module development

Naming conventions (`terraform-<PROVIDER>-<NAME>`), directory structure, input/output design, version constraints, and documentation standards.

### CI/CD workflows

GitHub Actions, GitLab CI, Atlantis, Infracost cost estimation, Trivy/Checkov scanning, and compliance checks.

### Security and compliance

Static analysis, policy-as-code, secrets management, state file security, backend encryption, and compliance scanning workflows.

### Patterns and anti-patterns

Side-by-side DO vs DON'T examples for variable naming, resource naming, module composition, state management, and provider configuration.

## Why this skill

This skill started from field-tested Terraform and OpenTofu patterns, then grew through contributions from people who hit missing guidance and added it back.

**Sources:**
- Patterns from [terraform-best-practices.com](https://www.terraform-best-practices.com/)
- Approaches used across the [terraform-aws-modules](https://github.com/terraform-aws-modules) collection
- AWS Hero experience with enterprise IaC

**Version-specific guidance:**
- Terraform 1.0+ features
- OpenTofu 1.6+ compatibility
- Native test framework (1.6+)
- Current tooling ecosystem (2024-2026)

**Decision frameworks:** not just "what to do" but "when and why".

## Requirements

- An AI agent with skill support: Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, Codex, Kiro, or any [Agent Skills](https://agentskills.io)-compatible host
- Terraform 1.0+ or OpenTofu 1.6+
- Optional: [Terraform MCP server](https://github.com/hashicorp/terraform-mcp-server) for registry integration

## Code intelligence (optional)

The skill works without a language server. To jump to a definition, find
references, outline a file, or show hover docs, it can also use
[terraform-ls](https://github.com/hashicorp/terraform-ls), HashiCorp's official
Terraform language server.

- **Optional.** Without terraform-ls the skill falls back to text search
  (`rg`) plus reading files. Nothing breaks; you get text matches instead of
  matches by meaning.
- **Needs.** A local `terraform` (or `tofu`) binary on `PATH`, and
  `terraform init` run in the workspace, before it can resolve names across
  modules and providers.
- **Install.** Get it from the
  [terraform-ls releases](https://github.com/hashicorp/terraform-ls/releases)
  page, or turn it on through your editor or agent host. Use whatever version
  your host supports.
  - Claude Code: install it as an LSP plugin -
    `/plugin marketplace add boostvolt/claude-code-lsps` then
    `/plugin install terraform-ls@claude-code-lsps`.

How the skill uses it:

- Use the language server to follow a name to where it is defined or used; use
  `rg` plus reading files for exact text, known names, `.tfvars`, comments, and
  non-HCL files.
- Point the language server at a spot in the file first (find an occurrence,
  then ask about that position).
- terraform-ls cannot rename for you. To rename a variable, local, or output:
  find every reference, then edit each by hand. To rename a resource or module
  address: use a `moved` block, not a text replace.

## Contributing

See [CLAUDE.md](CLAUDE.md) for skill development guidelines, content structure, how to propose improvements, and the validation approach.

Report bugs or request features via [GitHub Issues](https://github.com/antonbabenko/terraform-skill/issues).

## Related resources

### Official documentation
- [Terraform Language](https://developer.hashicorp.com/terraform/docs)
- [Terraform Testing](https://developer.hashicorp.com/terraform/language/tests) - native test framework
- [OpenTofu Documentation](https://opentofu.org/docs/)
- [HashiCorp Recommended Practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices)

### Community resources
- [Terraform compliance-as-code docs](https://compliance.tf/docs/) - Compliance frameworks, controls, implementation guides, remediations, etc
- [Awesome Terraform](https://github.com/shuaibiyy/awesome-tf)
- [Awesome Terraform Compliance](https://github.com/antonbabenko/awesome-terraform-compliance)
- [Terraform Best Practices](https://terraform-best-practices.com) - the guide this skill is based on
- [terraform-aws-modules](https://github.com/terraform-aws-modules) - AWS modules collection
- [Terratest](https://terratest.gruntwork.io/docs/) - Go testing framework for Terraform
- [Google Cloud Best Practices](https://docs.cloud.google.com/docs/terraform/best-practices/general-style-structure)
- [AWS Terraform Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/introduction.html)

### Development tools
- [pre-commit-terraform](https://github.com/antonbabenko/pre-commit-terraform) - pre-commit hooks for Terraform
- [terraform-docs](https://terraform-docs.io/) - generate documentation from modules
- [terraform-switcher](https://github.com/warrensbox/terraform-switcher) - Terraform version manager
- [TFLint](https://github.com/terraform-linters/tflint) - Terraform linter
- [Trivy](https://github.com/aquasecurity/trivy) - IaC security scanner

## License

Apache 2.0
