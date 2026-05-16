# Terraform & OpenTofu Skill for AI Agents

[![Agent Skill](https://img.shields.io/badge/Agent-Skill-5865F2)](https://agentskills.io)
[![Terraform](https://img.shields.io/badge/Terraform-1.0+-623CE4)](https://www.terraform.io/)
[![OpenTofu](https://img.shields.io/badge/OpenTofu-1.6+-FFD814)](https://opentofu.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Terraform and OpenTofu best-practices skill for AI coding agents (Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, Codex, and others). Covers testing strategies, module patterns, CI/CD workflows, and production infrastructure code.

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

This plugin is distributed via Claude Code marketplace using `.claude-plugin/marketplace.json`.

### Quick install (any agent)

Universal installer via [skills.sh](https://skills.sh/) — works with any [Agent Skills](https://agentskills.io)-compatible tool:

```bash
npx skills add https://github.com/antonbabenko/terraform-skill
```

### Per-host instructions

<!-- prettier-ignore-start -->

<details>
<summary>Claude Code</summary>

```bash
/plugin marketplace add antonbabenko/terraform-skill
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

</details>

<details>
<summary>Antigravity</summary>

```bash
git clone https://github.com/antonbabenko/terraform-skill.git ~/.antigravity/skills/terraform-skill
```

Update with `cd ~/.antigravity/skills/terraform-skill && git pull`.

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

## Quick start examples

**Create a module with tests:**
> "Create a Terraform module for AWS VPC with native tests"

**Set up remote state:**
> "Configure S3 backend with DynamoDB locking for Terraform state"

**Review existing code:**
> "Review this Terraform configuration following best practices"

**Generate CI/CD workflow:**
> "Create a GitHub Actions workflow for Terraform with cost estimation"

**Testing strategy:**
> "Help me choose between native tests and Terratest for my modules"

**State management:**
> "How should I organize state files for a multi-team environment?"

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

- An AI agent with skill support: Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, Codex, or any [Agent Skills](https://agentskills.io)-compatible host
- Terraform 1.0+ or OpenTofu 1.6+
- Optional: [Terraform MCP server](https://github.com/hashicorp/terraform-mcp-server) for registry integration

## Code intelligence (optional)

The skill works without a language server. For semantic navigation (go to
definition, find references, document outline, hover) it can also use
[terraform-ls](https://github.com/hashicorp/terraform-ls), HashiCorp's official
Terraform language server.

- **Optional.** Without terraform-ls the skill degrades to text search (`rg`)
  plus file reads. Nothing breaks; results are text matches instead of
  semantic ones.
- **Prerequisite.** terraform-ls needs a local `terraform` (or `tofu`) binary
  on `PATH` and `terraform init` run in the workspace before cross-module and
  provider symbols resolve.
- **Install.** Download from the upstream
  [terraform-ls releases](https://github.com/hashicorp/terraform-ls/releases),
  or enable it through your editor or agent host's own language-server
  mechanism. Use the version your host supports rather than pinning a binary
  URL in docs.

Navigation tips the skill applies:

- Use the language server for symbol relationships; use `rg` + read for exact
  text, known names, `.tfvars`, comments, and non-HCL files.
- Language-server calls are position-anchored: locate an occurrence first,
  then query at that position.
- terraform-ls has no rename provider. Renaming a variable/local/output is a
  manual find-references-then-edit pass; renaming a resource or module address
  uses a `moved` block, not a text replace.

### Generic discipline (any language)

This skill's navigation guidance is the Terraform specialization of a
language-agnostic discipline (LSP vs exact-text vs fuzzy precedence,
position-anchored calls, degradation gate, tool-substitution disclosure,
anti-phantom-shim). The terraform-skill content is self-contained and works on
its own. For that discipline across any language, install the
`code-intelligence` plugin:

```bash
/plugin marketplace add antonbabenko/agent-plugins
/plugin install code-intelligence@antonbabenko
```

- Skills are not loaded by being mentioned in another skill. Each skill
  triggers on its own description; installing the plugin is what makes
  `code-intelligence` available.
- The skill name is not globally unique. If a `code-intelligence` skill is
  active, confirm it is the one from
  [antonbabenko/agent-plugins](https://github.com/antonbabenko/agent-plugins)
  before relying on it; third-party skills with the same name may differ.

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
