# Terraform & OpenTofu Skill for AI Agents

[![Agent Skill](https://img.shields.io/badge/Agent-Skill-5865F2)](https://agentskills.io)
[![Terraform](https://img.shields.io/badge/Terraform-1.0+-623CE4)](https://www.terraform.io/)
[![OpenTofu](https://img.shields.io/badge/OpenTofu-1.6+-FFD814)](https://opentofu.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Comprehensive Terraform and OpenTofu best practices skill for AI coding agents (Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, Codex, and more). Get instant guidance on testing strategies, module patterns, CI/CD workflows, and production-ready infrastructure code.

## What This Skill Provides

🧪 **Testing Frameworks**
- Decision matrix for choosing between native tests and Terratest
- Testing strategy workflows (static → integration → E2E)
- Real-world examples and patterns

📦 **Module Development**
- Structure and naming conventions
- Versioning strategies
- Public vs private module patterns

🗄️ **State Management**
- Remote backend configuration (S3, Azure, GCS, Terraform Cloud)
- State locking and security patterns
- Multi-team state isolation strategies
- State migration and recovery procedures

🔄 **CI/CD Integration**
- GitHub Actions workflows
- GitLab CI examples
- Cost optimization patterns
- Compliance automation

🔒 **Security & Compliance**
- Trivy, Checkov integration
- Policy-as-code patterns
- Compliance scanning workflows

📋 **Quick Reference**
- Decision flowcharts
- Common patterns (✅ DO vs ❌ DON'T)
- Cheat sheets for rapid consultation

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

### Verify Installation

After installation, try:
```
"Create a Terraform module with testing for an S3 bucket"
```

Claude will automatically use the skill when working with Terraform/OpenTofu code.

## Quick Start Examples

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

## What It Covers

### Testing Strategy Framework

Decision matrices for:
- When to use native tests (Terraform 1.6+)
- When to use Terratest (Go-based)
- Multi-environment testing patterns

### Module Development Patterns

- Naming conventions (`terraform-<PROVIDER>-<NAME>`)
- Directory structure best practices
- Input variable organization
- Output value design
- Version constraint patterns
- Documentation standards

### CI/CD Workflows

- GitHub Actions examples
- GitLab CI templates
- Atlantis integration
- Cost estimation (Infracost)
- Security scanning (Trivy, Checkov)
- Compliance checking

### Security & Compliance

- Static analysis integration
- Policy-as-code patterns
- Secrets management
- State file security
- State backend encryption
- Compliance scanning workflows

### Common Patterns & Anti-patterns

Side-by-side ✅ DO vs ❌ DON'T examples for:
- Variable naming
- Resource naming
- Module composition
- State management
- Provider configuration

## Why This Skill?

**Based on Production Experience:**
- Patterns from [terraform-best-practices.com](https://www.terraform-best-practices.com/)
- Community-tested approaches from terraform-aws-modules
- AWS Hero expertise in enterprise IaC
- Real-world usage across 100+ modules

**Version-Specific Guidance:**
- Terraform 1.0+ features
- OpenTofu 1.6+ compatibility
- Native test framework (1.6+)
- Current tooling ecosystem (2024-2026)

**Decision Frameworks:**
Not just "what to do" but "when and why" - helping you make informed architecture decisions.

## Requirements

- **AI agent with skill support** — Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, Codex, or any [Agent Skills](https://agentskills.io)-compatible host
- **Terraform** 1.0+ or **OpenTofu** 1.6+
- Optional: [Terraform MCP server](https://github.com/hashicorp/terraform-mcp-server) for enhanced registry integration

## Contributing

See [CLAUDE.md](CLAUDE.md) for:
- Skill development guidelines
- Content structure philosophy
- How to propose improvements
- Testing and validation approach

**Issues & Feedback:**
[GitHub Issues](https://github.com/antonbabenko/terraform-skill/issues)

## Related Resources

### Official Documentation
- [Terraform Language](https://developer.hashicorp.com/terraform/docs) - HashiCorp official docs
- [Terraform Testing](https://developer.hashicorp.com/terraform/language/tests) - Native test framework
- [OpenTofu Documentation](https://opentofu.org/docs/) - OpenTofu official docs
- [HashiCorp Best Practices](https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices) - Cloud best practices

### Community Resources
- [Awesome Terraform](https://github.com/shuaibiyy/awesome-tf)
- [Awesome Terraform Compliance](https://github.com/antonbabenko/awesome-terraform-compliance)
- [Terraform Best Practices](https://terraform-best-practices.com) - Comprehensive guide (base for this skill)
- [terraform-aws-modules](https://github.com/terraform-aws-modules) - Production-grade AWS modules
- [Terratest](https://terratest.gruntwork.io/docs/) - Go testing framework for Terraform
- [Google Cloud Best Practices](https://docs.cloud.google.com/docs/terraform/best-practices/general-style-structure)
- [AWS Terraform Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/introduction.html)

### Development Tools
- [pre-commit-terraform](https://github.com/antonbabenko/pre-commit-terraform) - Pre-commit hooks for Terraform
- [terraform-docs](https://terraform-docs.io/) - Generate documentation from Terraform modules
- [terraform-switcher](https://github.com/warrensbox/terraform-switcher) - Terraform version manager
- [TFLint](https://github.com/terraform-linters/tflint) - Terraform linter
- [Trivy](https://github.com/aquasecurity/trivy) - Security scanner for IaC

## License

Apache 2.0
