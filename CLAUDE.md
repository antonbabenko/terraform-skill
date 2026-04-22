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
│       ├── SKILL.md                 # Core skill file (~277 lines)
│       └── references/              # Reference files loaded on demand
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

**This is documentation, not code.** No build, no compiled tests.

### Validation

CI runs automatically on PRs touching `SKILL.md`, `references/**/*.md`, or `.claude-plugin/**`. To check locally:

```bash
# Check SKILL.md line count (target: <300 lines per LLM Consumption Rules)
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

No automated suite. Manual flow:
1. Edit `SKILL.md` or a `references/*.md` file
2. Reload the skill in Claude Code
3. Run real Terraform queries (e.g., "Create a Terraform module with tests")
4. Confirm Claude applies the new patterns
5. Re-check `tests/baseline-scenarios.md` for regressions

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

The skill lives at `skills/terraform-skill/SKILL.md` — Claude Code autodiscovers any `skills/<name>/SKILL.md` (see [plugins reference](https://code.claude.com/docs/en/plugins-reference)). Reference files sit next to it under `skills/terraform-skill/references/` so relative links keep working.

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

SKILL.md is the entry point. Reference files load on demand. Cross-links use relative paths: `[Testing Guide](references/testing-frameworks.md)`.

When adding content, ask: **decision framework or key pattern → SKILL.md; detailed example or template → reference file.**

### Content Standards

- **Imperative voice:** "Use X" not "You should consider X"
- **Scannable format:** tables > bullets > prose
- **✅ DO / ❌ DON'T** side-by-side for non-obvious patterns
- **Version-specific features** clearly marked (e.g., `Terraform 1.6+`)
- **Token budget:** SKILL.md target <300 lines (see LLM Consumption Rules); currently ~277

### LLM Consumption Rules (enforce in every PR review)

These rules tune content for the **primary reader: an LLM retrieving facts to answer a user query**, not a human reading the guide end-to-end. They are **mandatory** for every addition to `SKILL.md` and `references/*.md`. Reviewers must reject PRs that violate them.

**1. Shape — decision table before playbook.** The LLM retrieval path is: classify intent → pick branch → execute. When a topic has multiple viable approaches, open the section with a decision table (`Goal | Use | Tradeoff`) before any phase steps or default procedure. Never bury branching in prose or push alternatives to the end.

**2. Cut human scaffolding.** Before/after config diffs, "Why this matters" paragraphs, and pedagogical asides are human-only signal. If the phase steps already name the required action, a before/after diff is redundant and must be dropped. Teaching tone ≠ retrieval value.

**3. Compress prose → ❌/✅ Rules.** Any sentence starting with "You should...", "Note that...", "Keep in mind...", "It's important to..." — rewrite as terse imperative ❌/✅ bullet. One fact per bullet. Direct verbs only: `Keep`, `Remove`, `Run`, `Confirm`, `Use`, `Avoid`, `Scope`.

**4. Every artifact earns its tokens.** Every code block, table, and example must add a fact not present in the prose. If it only restates, cut it. No "for completeness" content.

**5. Anchor stability.** SKILL.md routes to specific `#anchor` headings in reference files. Rewrites may restructure internal subsections, but must preserve the top-level `### Heading` that the SKILL.md diagnose table points to.

**6. Retrieval-first ordering.** Within a section, order content by what the LLM needs first: (a) decision table, (b) default procedure, (c) alternatives, (d) rules/gotchas as ❌/✅. Rationale lives in ≤1 opening sentence, never a closing "Why this matters" block.

**Token target per reference subsection:** under 400 tokens (~1,600 chars). If larger, split or compress — do not ship a 600-token walkthrough when 350 tokens carries the same decision value.

**Pre-merge checklist for any content PR:**

- [ ] Decision table precedes playbook (if multiple approaches exist)
- [ ] No before/after diff that merely restates the phase steps
- [ ] No paragraph starting with "Why this matters" / "Note" / "Keep in mind" — all converted to ❌/✅
- [ ] Every code block / table adds a fact not in surrounding prose
- [ ] Subsection under 400 tokens
- [ ] Anchors referenced from SKILL.md remain stable
- [ ] For substantive new sections, consult an external LLM expert (e.g. GPT via `mcp__codex__codex`) for format/compression review before merge

## PR Requirements

PRs must include before/after evidence for affected scenarios in `tests/baseline-scenarios.md`. See `.github/PULL_REQUEST_TEMPLATE.md` for the full checklist.

## What Belongs Where

| Content type | Location |
|-------------|----------|
| Decision frameworks, core patterns | `SKILL.md` |
| Detailed guides, templates, examples | `references/*.md` |
| Baseline test scenarios | `tests/baseline-scenarios.md` |
| Agent rationalization tracking | `tests/rationalization-table.md` |
| Installation/usage docs | `README.md` |
| Contributor process details | `CONTRIBUTING.md` |
