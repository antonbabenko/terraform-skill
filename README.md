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
