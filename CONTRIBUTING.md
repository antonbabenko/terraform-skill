# Contributing to Terraform Skill

Thank you for your interest in improving terraform-skill! This document
provides guidelines for contributors.

## Quick Start

1. Fork the repository
2. Create a feature branch
3. Make your changes following the guidelines below
4. Test your changes (see Testing Requirements)
5. Submit a pull request

## When to Contribute

**Good contributions:**

- ✅ New Terraform/OpenTofu best practices based on community consensus
- ✅ Version-specific features for new Terraform/OpenTofu releases
- ✅ Corrections to outdated or incorrect information
- ✅ Improved examples or patterns
- ✅ Better organization or clarity
- ✅ Testing framework improvements

**Not suitable for contributions:**

- ❌ Personal preferences without community consensus
- ❌ Provider-specific resource details (use Terraform MCP tools instead)
- ❌ Untested changes (see TDD requirement below)
- ❌ Content that duplicates existing Claude knowledge

## Content Standards

### Frontmatter Requirements

**CRITICAL:** SKILL.md frontmatter must contain ONLY two fields:

- `name` - Skill name (letters, numbers, hyphens only)
- `description` - When to use this skill

```yaml
---
name: terraform-skill
description: Use when working with Terraform or OpenTofu - creating modules,
  writing tests...
---
```

**Do NOT add:**
- ❌ `author` field (put in README.md)
- ❌ `version` field (managed by release workflow)
- ❌ `license` field (put in README.md and LICENSE)
- ❌ Any other custom fields

**Why:** Per official skill standards, only `name` and `description` are
supported. Extra fields waste tokens.

### Description Best Practices

**Format:** Start with "Use when..." and list specific triggers

**Good example:**

```yaml
description: >-
  Use when working with Terraform or OpenTofu - creating modules, writing
  tests (native test framework, Terratest), setting up CI/CD pipelines,
  reviewing configurations, choosing between testing approaches, debugging
  state issues, implementing security scanning (trivy, checkov), or making
  infrastructure-as-code architecture decisions
```

**Bad example:**
```yaml
description: Comprehensive skill for Terraform development covering testing, modules, CI/CD, and production patterns
```

**Why:** Description must focus on WHEN to use (triggers/symptoms), not WHAT it does (workflow summary). See plan file and writing-skills documentation for rationale.

### Token Efficiency

**SKILL.md Target:** <1,500 words

**Techniques:**
- Use progressive disclosure (move details to references/*.md)
- Prefer tables over prose
- Compress link sections (pipe-separated)
- Reference other files instead of repeating content

**Current stats:** ~1,400 words, ~280 lines

### File Organization

```
terraform-skill/
├── SKILL.md                    # Core skill (<500 lines guideline)
├── references/                     # Reference files (progressive disclosure)
│   ├── testing-frameworks.md
│   ├── module-patterns.md
│   ├── ci-cd-workflows.md
│   ├── security-compliance.md
│   └── quick-reference.md
├── tests/                      # TDD testing framework
│   ├── baseline-scenarios.md
│   ├── compliance-verification.md
│   └── rationalization-table.md
└── .github/workflows/          # Automation
    ├── release.yml
    └── validate.yml
```

## Testing Requirements (CRITICAL)

### The Iron Law

**NO CHANGES WITHOUT TESTING FIRST**

This applies to:
- ✅ New content additions
- ✅ Edits to existing content
- ✅ Reorganization or refactoring
- ✅ "Simple" documentation updates

**No exceptions.**

### Why This Matters

Without testing, we don't know if changes actually improve agent behavior. Per official skill standards (writing-skills), this is TDD for documentation:

- **RED:** Run scenarios WITHOUT your changes (baseline)
- **GREEN:** Add changes, verify behavior improves
- **REFACTOR:** Close loopholes, re-test

### How to Test Your Changes

#### 1. Identify Affected Scenarios

Review `tests/baseline-scenarios.md`. Which scenarios does your change affect?

**Example:** Adding security scanning guidance → affects Scenario 3

#### 2. Run Baseline (WITHOUT Your Changes)

```bash
# Disable skill temporarily
mv ~/.claude/references/terraform-skill ~/.claude/references/terraform-skill.disabled

# Run affected scenario
# Document agent response in tests/baseline-results/
```

#### 3. Apply Your Changes

Make your edits to SKILL.md or reference files.

#### 4. Run Compliance Test (WITH Your Changes)

```bash
# Re-enable skill
mv ~/.claude/references/terraform-skill.disabled ~/.claude/references/terraform-skill

# Run same scenario
# Document improved behavior in tests/compliance-results/
```

#### 5. Verify Improvement

Compare baseline vs compliance:
- Does agent now follow your guidance?
- Are patterns applied proactively?
- No new rationalizations introduced?

#### 6. Document in PR

Include in PR description:
- Which scenarios tested
- Baseline behavior (what agent did without change)
- Compliance behavior (what agent does with change)
- Evidence that change works

### Testing Checklist

For each PR, include this checklist:

- [ ] Identified affected scenarios from tests/baseline-scenarios.md
- [ ] Ran baseline WITHOUT changes (documented)
- [ ] Applied changes
- [ ] Ran compliance WITH changes (documented)
- [ ] Verified behavior improvement
- [ ] No new rationalizations discovered (or documented in rationalization-table.md)
- [ ] Re-tested if rationalizations found

## Content Guidelines

### Writing Style

**Imperative voice:**
✅ "Use underscores in variable names"
❌ "You should consider using underscores"

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

**One excellent example beats many mediocre ones**

**Good example:**
- Complete and runnable
- Well-commented explaining WHY
- From real scenario
- Shows pattern clearly
- Ready to adapt

**Avoid:**
- Multiple language implementations
- Fill-in-the-blank templates
- Contrived examples

### Decision Frameworks

**Include WHEN information:**
- When to use approach A vs B
- What factors influence the decision
- Tradeoffs and considerations

**Use tables:**
```markdown
| Your Situation | Recommended Approach |
|----------------|---------------------|
| Terraform 1.6+, simple logic | Native tests |
| Pre-1.6, Go expertise | Terratest |
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

### Why This Matters

Conventional commits enable:
- **Automatic versioning** - Commit type determines version bump
- **Generated changelogs** - Changes grouped by type (features, fixes, etc.)
- **Release automation** - Releases created on merge to master

When you merge a PR, the release workflow analyzes all commits since the last release and:
1. Calculates the appropriate version bump
2. Updates version in plugin.json and SKILL.md
3. Generates changelog entry
4. Creates GitHub release

## Submitting Changes

### Pull Request Process

1. **Create feature branch** from `master`
   ```bash
   git checkout -b feature/improve-testing-guidance
   ```

2. **Make changes** following standards above

3. **Test changes** (see Testing Requirements)

4. **Commit with conventional commit format**
   ```bash
   git commit -m "feat: add native test mocking guidance for 1.7+"
   git commit -m "fix: correct security scanning tool recommendations"
   git commit -m "docs: improve module structure examples"
   ```

5. **Submit PR** with testing evidence

### PR Template

Use the template in `.github/PULL_REQUEST_TEMPLATE.md` - it includes:
- Testing checklist
- Standards compliance verification
- Change description
- Evidence of improvement

### Review Criteria

PRs will be reviewed for:
1. **Standards compliance** - Frontmatter, description format
2. **Testing evidence** - Baseline vs compliance documented
3. **Token efficiency** - Not adding unnecessary content
4. **Accuracy** - Technically correct and current
5. **Quality** - Clear, scannable, well-organized

## Release Process

Releases are **fully automated** based on conventional commits:

1. PR merged to `master`
2. Automated workflow analyzes commits since last release
3. Calculates version bump (major/minor/patch)
4. Workflow updates version in:
   - `.claude-plugin/plugin.json`
   - `SKILL.md` version history
   - `CHANGELOG.md` (generated from commits)
5. Creates git tag and GitHub Release

**Contributors don't need to manage versions** - just use conventional commits in your PRs.

For details, see the [Releases section in README.md](README.md#releases).

## Questions?

- **Issues:** [GitHub Issues](https://github.com/antonbabenko/terraform-skill/issues)
- **Discussions:** [GitHub Discussions](https://github.com/antonbabenko/terraform-skill/discussions)
- **Author:** [@antonbabenko](https://github.com/antonbabenko)

## Additional Resources

**For contributors:**
- [CLAUDE.md](CLAUDE.md) - Detailed development guidelines and architecture
- [tests/baseline-scenarios.md](tests/baseline-scenarios.md) - Testing scenarios

**Skill standards:**
- [Claude Code Skills Documentation](https://docs.claude.ai/docs/agent-skills)
- writing-skills (reference skill for skill development)

---

**Thank you for helping make terraform-skill better!** 🎉

Quality contributions that improve agent behavior are always welcome.
