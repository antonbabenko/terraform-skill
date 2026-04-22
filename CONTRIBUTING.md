# Contributing to Terraform Skill

Thanks for helping improve terraform-skill. Guidelines for contributors below.

## Quick Start

1. Fork the repository
2. Create a feature branch
3. Make your changes following the guidelines below
4. Test your changes (see Testing Requirements)
5. Submit a pull request

## When to Contribute

**Good contributions:**

- ✅ New Terraform/OpenTofu best practices with community consensus
- ✅ Version-specific features for new Terraform/OpenTofu releases
- ✅ Corrections to outdated or incorrect information
- ✅ Better examples or patterns
- ✅ Sharper organization or clarity
- ✅ Testing framework improvements

**Not suitable:**

- ❌ Personal preferences without community consensus
- ❌ Provider-specific resource details (use Terraform MCP tools instead)
- ❌ Untested changes (see TDD requirement below)
- ❌ Content that duplicates existing Claude knowledge

## Content Standards

### Frontmatter Requirements

SKILL.md frontmatter must include two required fields. Other fields are optional and allowed.

**Required:**

- `name` — Skill name (letters, numbers, hyphens only)
- `description` — When to use this skill (must start with "Use when", ≤1024 chars)

**Optional (allowed):**

- `license` — e.g. `Apache-2.0`
- `metadata.author` — attribution
- `metadata.version` — **auto-synced by the release workflow; never hand-edit**
- Future additions the validate workflow accepts

Current frontmatter:

```yaml
---
name: terraform-skill
description: >-
  Use when writing, reviewing, or debugging Terraform/OpenTofu modules,
  tests, CI, scans, or state ops — diagnoses failure mode (identity
  churn, secrets, blast radius, CI drift, state corruption) with
  version-aware guards.
license: Apache-2.0
metadata:
  author: Anton Babenko
  version: X.Y.Z
---
```

The validate workflow (`.github/workflows/validate.yml`) rejects the PR only if `name` or `description` is missing, if `name` contains invalid characters, or if `description` exceeds 1024 characters. Optional fields are logged but not blocked.

### Description Best Practices

Start with "Use when..." and list specific triggers.

**Good example:**

```yaml
description: >-
  Use when writing, reviewing, or debugging Terraform/OpenTofu modules,
  tests, CI, scans, or state ops — diagnoses failure mode (identity
  churn, secrets, blast radius, CI drift, state corruption) with
  version-aware guards.
```

**Bad example:**

```yaml
description: Comprehensive skill for Terraform development covering testing, modules, CI/CD, and production patterns
```

The description must focus on WHEN to use (triggers, symptoms), not WHAT the skill does. See writing-skills documentation for rationale.

### Token Efficiency

**SKILL.md target:** <300 lines (currently 277).

**Reference subsection target:** <400 tokens (~1,600 chars). Split or compress anything larger.

**Techniques:**

- Push detail into `references/*.md` (progressive disclosure)
- Tables over prose
- Pipe-separated link lists
- Reference other files instead of repeating content

### LLM Consumption Rules

Every SKILL.md or `references/*.md` addition must follow the rules in [CLAUDE.md §LLM Consumption Rules](CLAUDE.md#llm-consumption-rules-enforce-in-every-pr-review):

- Decision table before playbook
- No before/after diffs that restate the phase steps
- No "Why this matters" / "Note" / "Keep in mind" paragraphs — convert to ❌/✅
- Retrieval-first ordering within each section
- Preserve anchors that SKILL.md links to
- Subsections under ~400 tokens

Reviewers reject PRs that violate these.

### File Organization

```
terraform-skill/
├── skills/
│   └── terraform-skill/            # Autodiscovered by Claude Code plugin system
│       ├── SKILL.md                # Core skill (<300 lines)
│       └── references/             # Reference files (progressive disclosure)
│           ├── ci-cd-workflows.md
│           ├── code-patterns.md
│           ├── module-patterns.md
│           ├── quick-reference.md
│           ├── security-compliance.md
│           ├── state-management.md
│           └── testing-frameworks.md
├── tests/                          # TDD testing framework
│   ├── baseline-scenarios.md
│   ├── compliance-verification.md
│   └── rationalization-table.md
└── .github/workflows/              # Automation
    ├── automated-release.yml
    └── validate.yml
```

## Testing Requirements (CRITICAL)

### The Iron Law

**NO CHANGES WITHOUT TESTING FIRST.**

Applies to:

- ✅ New content additions
- ✅ Edits to existing content
- ✅ Reorganization or refactoring
- ✅ "Simple" documentation updates

No exceptions. Without a baseline, a change cannot prove it improves agent behavior. Per writing-skills, this is TDD for documentation:

- **RED:** Run scenarios without your changes (baseline)
- **GREEN:** Add changes, verify behavior improves
- **REFACTOR:** Close loopholes, re-test

### How to Test Your Changes

#### 1. Identify Affected Scenarios

Review `tests/baseline-scenarios.md`. Which scenarios does your change affect?

Example: adding security scanning guidance → affects Scenario 3.

#### 2. Run Baseline (Without Your Changes)

```bash
# Disable skill temporarily
/plugin disable terraform-skill@antonbabenko

# Run affected scenario
# Document agent response in tests/baseline-results/
```

#### 3. Apply Your Changes

Edit SKILL.md or reference files.

#### 4. Run Compliance Test (With Your Changes)

```bash
# Re-enable skill
/plugin enable terraform-skill@antonbabenko

# Run same scenario
# Document improved behavior in tests/compliance-results/
```

#### 5. Verify Improvement

Compare baseline vs compliance:

- Does the agent now follow your guidance?
- Are patterns applied proactively?
- Any new rationalizations introduced?

#### 6. Document in PR

Include in the PR description:

- Which scenarios you tested
- Baseline behavior (what the agent did without the change)
- Compliance behavior (what the agent does with the change)
- Evidence the change works

### Testing Checklist

Include this checklist on every PR:

- [ ] Identified affected scenarios from tests/baseline-scenarios.md
- [ ] Ran baseline without changes (documented)
- [ ] Applied changes
- [ ] Ran compliance with changes (documented)
- [ ] Verified behavior improvement
- [ ] No new rationalizations discovered (or documented in rationalization-table.md)
- [ ] Re-tested if rationalizations found

## Content Guidelines

### Writing Style

**Imperative voice:**

- ✅ "Use underscores in variable names"
- ❌ "You should consider using underscores"

**Scannable format:**

- Tables for comparisons
- ✅ DO vs ❌ DON'T side-by-side
- Code blocks with inline comments
- Clear section headers

**Version-specific markers:**

```markdown
**Native Tests** (Terraform 1.6+, OpenTofu 1.6+)
```

### Code Examples

One excellent example beats many mediocre ones.

**Good:**

- Complete and runnable
- Commented to explain WHY
- From a real scenario
- Shows the pattern clearly
- Ready to adapt

**Avoid:**

- Multiple language implementations
- Fill-in-the-blank templates
- Contrived examples

### Decision Frameworks

Include WHEN information:

- When to use approach A vs B
- What factors influence the decision
- Tradeoffs

**Use tables:**

```markdown
| Your Situation | Recommended Approach |
|----------------|---------------------|
| Terraform 1.6+, simple logic | Native tests |
| Complex integration or multi-cloud | Terratest |
```

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automate releases and changelog generation.

### Format

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

| Type | Version Bump | Use For |
|------|--------------|---------|
| `feat!:` or `BREAKING CHANGE:` | Major (1.x.x → 2.0.0) | Breaking changes |
| `feat:` | Minor (1.2.x → 1.3.0) | New features |
| `fix:` | Patch (1.2.3 → 1.2.4) | Bug fixes |
| `docs:` | Patch | Documentation only |
| `chore:` | Patch | Maintenance, tooling |
| `test:` | Patch | Test improvements |
| `refactor:` | Patch | Code refactoring |

### Examples

```bash
# Feature (minor version bump)
git commit -m "feat: add OpenTofu 1.8 support"

# Bug fix (patch version bump)
git commit -m "fix: correct module output syntax in examples"

# Breaking change (major version bump)
git commit -m "feat!: remove deprecated test framework guidance"

# With detailed description
git commit -m "feat: add native testing examples

- Add examples for Terraform 1.6+ native tests
- Include decision matrix for test framework selection
- Document best practices for test organization"

# Documentation only
git commit -m "docs: improve testing strategy documentation"

# Chore (tooling/maintenance)
git commit -m "chore: update workflow dependencies"
```

Commit type determines the version bump, the changelog group, and whether a release is cut on merge to master. The release workflow updates the version in marketplace.json (marketplace root and plugin entry) and in SKILL.md frontmatter.

## Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `master`:

   ```bash
   git checkout -b feature/improve-testing-guidance
   ```

2. **Make changes** following the standards above

3. **Test changes** (see Testing Requirements)

4. **Commit with conventional commit format**

   ```bash
   git commit -m "feat: add native test mocking guidance for 1.7+"
   git commit -m "fix: correct security scanning tool recommendations"
   git commit -m "docs: improve module structure examples"
   ```

5. **Submit PR** with testing evidence

### PR Template

Use `.github/PULL_REQUEST_TEMPLATE.md`. It covers:

- Testing checklist
- Standards compliance verification
- Change description
- Evidence of improvement

### Review Criteria

PRs are reviewed for:

1. **Standards compliance** — frontmatter, description format
2. **Testing evidence** — baseline vs compliance documented
3. **Token efficiency** — no unnecessary content added
4. **Accuracy** — technically correct and current
5. **Quality** — clear, scannable, well-organized

## Release Process

Releases are automated from conventional commits:

1. PR merged to `master`
2. Workflow analyzes commits since the last release
3. Workflow calculates the version bump (major/minor/patch)
4. Workflow updates:
   - `.claude-plugin/marketplace.json` (marketplace version, plugin version, git ref)
   - `skills/terraform-skill/SKILL.md` frontmatter (`metadata.version`)
   - `CHANGELOG.md` (generated from commits)
5. Workflow creates the git tag and GitHub Release

Contributors don't manage versions — conventional commits in your PRs are enough.

See the [Releases section in README.md](README.md#releases) for details.

## Questions?

- **Issues:** [GitHub Issues](https://github.com/antonbabenko/terraform-skill/issues)
- **Discussions:** [GitHub Discussions](https://github.com/antonbabenko/terraform-skill/discussions)
- **Author:** [@antonbabenko](https://github.com/antonbabenko)

## Additional Resources

**For contributors:**

- [CLAUDE.md](CLAUDE.md) — development guidelines, architecture, and LLM Consumption Rules
- [tests/baseline-scenarios.md](tests/baseline-scenarios.md) — testing scenarios

**Skill standards:**

- [Claude Code Skills Documentation](https://docs.claude.ai/docs/agent-skills)
- writing-skills (reference skill for skill development)
