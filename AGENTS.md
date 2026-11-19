# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Copilot, Cursor, Gemini CLI, Kiro, OpenCode and others) and human contributors working in this repository.

> **For End Users:** See [README.md](README.md) for installation and usage.
>
> **This file** is for contributors, maintainers, and skill developers.

## What This Is

An **agent skill** - executable documentation that AI coding agents load to provide Terraform/OpenTofu expertise. It encodes terraform-best-practices.com patterns into the agent's context as version-controlled instructions. One `SKILL.md` serves every agent that reads the skill format; install paths per agent are in [README.md](README.md#installation).

It also ships as a **Kiro Power**: the repo-root `POWER.md` (+ optional
`mcp.json`) is generated from `SKILL.md`, so the skill content is shared, not
forked.

## Repository Structure

```
terraform-skill/
├── skills/
│   └── terraform-skill/             # Skill discovered by agents that read skills/<name>/SKILL.md
│       ├── SKILL.md                 # Core skill file (~305 lines) — single source of truth
│       └── references/              # Reference files loaded on demand
│           ├── ci-cd-workflows.md
│           ├── code-intelligence-lsp.md
│           ├── code-patterns.md
│           ├── module-patterns.md
│           ├── quick-reference.md
│           ├── security-compliance.md
│           ├── state-management.md
│           └── testing-frameworks.md
├── .codex-plugin/plugin.json        # GENERATED Codex manifest (version synced by release), CI-owned
├── .claude-plugin/plugin.json       # Copilot CLI / Claude Code manifest: hand-maintained, no version/$schema/mcpServers (CI-checked)
├── POWER.md                         # GENERATED Kiro Power (from SKILL.md) — CI-owned, never hand-edit
├── mcp.json                         # Optional Kiro MCP (read-only terraform-mcp-server)
├── tests/                           # Baseline scenarios and rationalization tracking
│   ├── baseline-scenarios.md
│   ├── compliance-verification.md
│   └── rationalization-table.md
└── .github/
    ├── scripts/check_snippets.py    # Lints fenced code blocks (CI, required)
    ├── release/
    │   ├── pre-commit.js            # Release version-sync hook (SKILL.md/codex/POWER.md)
    │   └── build-power.js           # POWER.md generator (`--check` for CI)
    └── workflows/
        ├── validate.yml             # PR validation (frontmatter, POWER.md sync, size, links, lint)
        └── automated-release.yml    # Auto-release on master push via conventional commits
```

`POWER.md` and `.codex-plugin/plugin.json` are **generated, CI-owned
artifacts** synced from `SKILL.md` by `.github/release/build-power.js` and the
release `pre-commit.js` hook. Never hand-edit them — `validate.yml` runs
`build-power.js --check` and fails the PR if `POWER.md` drifts. Edit
`SKILL.md`/`references/` and regenerate with
`node .github/release/build-power.js`.

## Development Workflow

**This is documentation, not code.** No build, no compiled tests.

### Validation

CI runs on every PR (`Validate Skill Files` is a required check). To check locally:

```bash
# Check SKILL.md line count (soft target ~300 lines; CI warns only above 500)
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

# Lint every fenced code block with its real tool (needs terraform, opa,
# actionlint, shellcheck). CI runs the same script in the required check.
python3 .github/scripts/check_snippets.py \
  skills/terraform-skill/SKILL.md skills/terraform-skill/references/*.md README.md

# Check for broken internal links (run from the skill directory)
cd skills/terraform-skill
grep -oP '\[.*?\]\(references/.*?\.md.*?\)' SKILL.md references/*.md | \
  sed 's/.*(//' | sed 's/).*//' | sed 's/#.*//' | \
  while read -r link; do [ ! -f "$link" ] && echo "Broken: $link"; done
```

### Testing Changes

No automated suite. Manual flow:
1. Edit `SKILL.md` or a `references/*.md` file
2. Reload the skill in your agent (Claude Code, Codex, Gemini CLI, ...)
3. Run real Terraform queries (e.g., "Create a Terraform module with tests")
4. Confirm the agent applies the new patterns
5. Re-check `tests/baseline-scenarios.md` for regressions

## Commit Conventions & Releases

Releases are **fully automated** from conventional commits on `master`:

| Commit prefix | Version bump |
|---------------|-------------|
| `feat!:` or `BREAKING CHANGE:` | Major |
| `feat:` | Minor |
| `fix:` | Patch |
| Other | Patch (default) |

`master` is protected by a ruleset: **no direct pushes** (all changes land via
PR) and two required checks - `Validate Skill Files` and `Validate PR Title`.
PRs are **squash-merged**, so the **PR title** becomes the master commit
subject that drives the bump above; `pr-title-lint.yml` enforces that the title
is a valid conventional subject. The release flow (`automated-release.yml`)
opens its own `chore(release): vX.Y.Z` PR and auto-merges it.

The release workflow automatically:
- Bumps the version in `CHANGELOG.md`
- Syncs `skills/terraform-skill/SKILL.md` YAML frontmatter
  `metadata.version` (the single version source; the canonical version is the
  git tag managed by the release pipeline)
- Syncs `.codex-plugin/plugin.json` and regenerates `POWER.md` from
  `SKILL.md`, staging both into the release commit + tag

**Never manually edit version numbers** - the CI handles this.

## SKILL.md Architecture

### Plugin Structure

The skill lives at `skills/terraform-skill/SKILL.md`. Plugin and skill loaders (Claude Code, Codex, Copilot CLI, Gemini CLI `skills install --path`) discover `skills/<name>/SKILL.md`; per-agent install steps are in [README.md](README.md#installation). Reference files sit next to it under `skills/terraform-skill/references/` so relative links keep working.

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
- **Token budget:** SKILL.md soft target ~300 lines (CI warns only above 500); currently ~305

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
- [ ] `/deliberation:consensus` run on the changed sections, verdict in the PR body (see below)

### Factual Verification Rules (enforce in every PR review)

Issues #64 and #65 found 19 wrong claims and snippets. Every one was LLM-written text that nobody executed. Seventeen sat in content that had passed multi-LLM review across several model families, and three were introduced by those reviews. Cross-family review catches what one model misses, but those reviewers worked from memory: one panel had source fetching turned off, the other saw a one-line summary per change instead of the edited sections, and neither saw command output.

| Claim type | Required evidence in the PR body |
|------------|----------------------------------|
| Snippet (HCL, YAML, Rego, JSON, shell) | `check_snippets.py` passes (CI-enforced); Rego also needs `conftest verify` with a failing fixture |
| Procedure (install, state recovery, CI template, test layout) | Output of running it end to end on a scratch module (local backend, `random`/`null`/`terraform_data`) |
| Version, flag, argument, resource attribute, MCP tool name | Primary source: upstream CHANGELOG, provider schema (`terraform providers schema -json`), or upstream source/docs URL |

- ✅ Paste the decisive command output or source line next to each changed claim
- ✅ After fixing a claim, `rg` the whole repo for every sibling occurrence and fix all of them in the same PR
- ❌ Never accept consensus without evidence, or a review of a diff summary; unflagged lines are unreviewed, not correct

### Consensus Review (required for content PRs)

Every PR that changes `SKILL.md`, `references/`, or install steps in `README.md` runs `/deliberation:consensus` from the [Deliberation plugin](https://github.com/antonbabenko/agent-plugins) (`/plugin marketplace add antonbabenko/agent-plugins`, then `/plugin install deliberation@antonbabenko`). It reviews with models from different families and converges only on cross-model agreement.

- ✅ Give the panel the full edited sections, the evidence from the table above, and permission to fetch sources; ask it to check facts, not only format
- ✅ Reproduce every objection before acting on it; reviewers also produce confident false findings
- ✅ Paste in the PR body: models used, final verdict, each objection and how it was resolved (fixed, or rejected with evidence)
- ✅ Contributors without the plugin: say so in the PR; a maintainer runs it before merge
- ❌ Never treat consensus as a substitute for execution output or primary sources; it checks the evidence, it does not replace it
- ❌ Never relabel a broken block as `text` to silence the linter; use `text` only for trees, pseudo-code and mixed shell/HCL

## PR Requirements

PRs must include before/after evidence for affected scenarios in `tests/baseline-scenarios.md`, plus the factual evidence required above. See `.github/PULL_REQUEST_TEMPLATE.md` for the full checklist.

## What Belongs Where

| Content type | Location |
|-------------|----------|
| Decision frameworks, core patterns | `SKILL.md` |
| Detailed guides, templates, examples | `references/*.md` |
| Baseline test scenarios | `tests/baseline-scenarios.md` |
| Agent rationalization tracking | `tests/rationalization-table.md` |
| Installation/usage docs | `README.md` |
| Contributor process details | `CONTRIBUTING.md` |
