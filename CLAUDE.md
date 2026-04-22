# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **For End Users:** See [README.md](README.md) for installation and usage.
>
> **This file** is for contributors, maintainers, and skill developers.

## What This Is

A **Claude Code skill** - executable documentation that Claude loads to provide Terraform/OpenTofu expertise. It encodes terraform-best-practices.com patterns into Claude's context as version-controlled AI instructions.

## Repository Structure

```
terraform-skill/
├── .claude-plugin/marketplace.json  # Plugin metadata (version synced automatically)
├── skills/
│   └── terraform-skill/             # Skill autodiscovered by Claude Code plugin system
│       ├── SKILL.md                 # Core skill file (~524 lines, ~4.4K tokens)
│       └── references/              # Reference files loaded on demand (~26K tokens total)
│           ├── ci-cd-workflows.md
│           ├── code-patterns.md
│           ├── module-patterns.md
│           ├── quick-reference.md
│           ├── security-compliance.md
│           ├── state-management.md
│           └── testing-frameworks.md
├── tests/                           # Baseline scenarios and rationalization tracking
│   ├── baseline-scenarios.md
│   ├── compliance-verification.md
│   └── rationalization-table.md
└── .github/workflows/
    ├── validate.yml                 # PR validation (frontmatter, size, links, lint)
    └── automated-release.yml        # Auto-release on master push via conventional commits
```

## Development Workflow

**This is documentation, not code.** There is no build step, no test suite to run, no compilation.

### Validation

CI runs automatically on PRs touching `SKILL.md`, `references/**/*.md`, or `.claude-plugin/**`. To check locally:

```bash
# Check SKILL.md line count (guideline: <500 lines)
wc -l skills/terraform-skill/SKILL.md

# Validate YAML frontmatter (requires pyyaml)
python3 -c "
import yaml, sys
content = open('skills/terraform-skill/SKILL.md').read()
parts = content.split('---', 2)
fm = yaml.safe_load(parts[1])
required = {'name', 'description'}
missing = required - set(fm.keys())
print('Missing:', missing) if missing else print('Frontmatter OK')
"

# Check for broken internal links (run from the skill directory)
cd skills/terraform-skill
grep -oP '\[.*?\]\(references/.*?\.md.*?\)' SKILL.md references/*.md | \
  sed 's/.*(//' | sed 's/).*//' | sed 's/#.*//' | \
  while read -r link; do [ ! -f "$link" ] && echo "Broken: $link"; done
```

### Testing Changes

No automated test suite. The validation approach is:
1. Edit `SKILL.md` or a `references/*.md` file
2. Load the skill in Claude Code (reload skills)
3. Test with real Terraform queries (e.g., "Create a Terraform module with tests")
4. Verify Claude applies the new patterns correctly
5. Check `tests/baseline-scenarios.md` for regression scenarios

## Commit Conventions & Releases

Releases are **fully automated** from conventional commits on `master`:

| Commit prefix | Version bump |
|---------------|-------------|
| `feat!:` or `BREAKING CHANGE:` | Major |
| `feat:` | Minor |
| `fix:` | Patch |
| Other | Patch (default) |

The release workflow automatically:
- Bumps the version in `CHANGELOG.md`
- Syncs versions across **three places** (must stay in sync):
  1. `.claude-plugin/marketplace.json` → `version` (root)
  2. `.claude-plugin/marketplace.json` → `plugins[0].version`
  3. `skills/terraform-skill/SKILL.md` YAML frontmatter → `metadata.version`

**Never manually edit version numbers** - the CI handles this.

## SKILL.md Architecture

### Plugin Structure

The skill is located at `skills/terraform-skill/SKILL.md`. Claude Code's plugin system autodiscovers skills in the `skills/<name>/SKILL.md` pattern per the [plugins reference](https://code.claude.com/docs/en/plugins-reference). Reference files live alongside the skill at `skills/terraform-skill/references/`, keeping relative paths intact.

### YAML Frontmatter (required fields)

```yaml
---
name: terraform-skill          # letters, numbers, hyphens only
description: Use when...       # < 1024 chars, starts with "Use when"
license: Apache-2.0
metadata:
  author: Anton Babenko
  version: X.Y.Z               # Auto-synced by CI
---
```

### Progressive Disclosure Pattern

SKILL.md is the entry point (~4.4K tokens). Reference files provide depth on demand. Cross-links use relative paths: `[Testing Guide](references/testing-frameworks.md)`.

When adding content, ask: **Does this belong in SKILL.md (decision frameworks, key patterns) or a reference file (detailed examples, templates)?**

### Content Standards

- **Imperative voice:** "Use X" not "You should consider X"
- **Scannable format:** tables > bullets > prose
- **✅ DO / ❌ DON'T** side-by-side for non-obvious patterns
- **Version-specific features** clearly marked (e.g., `Terraform 1.6+`)
- **Token budget:** SKILL.md target <500 lines; current 524 is justified but don't grow further

## PR Requirements

PRs must include testing evidence showing baseline behavior (before) vs. compliance behavior (after) for affected scenarios from `tests/baseline-scenarios.md`. See `.github/PULL_REQUEST_TEMPLATE.md` for the full checklist.

## What Belongs Where

| Content type | Location |
|-------------|----------|
| Decision frameworks, core patterns | `SKILL.md` |
| Detailed guides, templates, examples | `references/*.md` |
| Baseline test scenarios | `tests/baseline-scenarios.md` |
| Agent rationalization tracking | `tests/rationalization-table.md` |
| Installation/usage docs | `README.md` |
| Contributor process details | `CONTRIBUTING.md` |
