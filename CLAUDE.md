# CLAUDE.md - Contributor Guide

> **For End Users:** See [README.md](README.md) for installation and usage.
>
> **This file** is for contributors, maintainers, and skill developers.

## What This Is

This repository contains a **Claude Code skill** - executable documentation that Claude loads to provide Terraform/OpenTofu expertise. Think of it as:

- **Prompt engineering as infrastructure**: Version-controlled AI instructions
- **Domain knowledge artifact**: Encoding terraform-best-practices.com into Claude's context
- **Meta-project**: Building instructions for an AI assistant

## Repository Structure

```
terraform-skill/
├── .claude-plugin/
│   └── marketplace.json                  # Marketplace and plugin metadata
├── SKILL.md                              # Core skill file (~645 lines)
├── references/                           # Reference files (progressive disclosure)
│   ├── ci-cd-workflows.md                # CI/CD templates (~473 lines)
│   ├── code-patterns.md                  # Code patterns & modern features (~859 lines)
│   ├── module-patterns.md                # Module best practices (~1,126 lines)
│   ├── quick-reference.md                # Command cheat sheets (~800 lines)
│   ├── security-compliance.md            # Security guidance (~470 lines)
│   ├── state-management.md               # State management guide (~1,867 lines)
│   └── testing-frameworks.md             # Testing guides (~563 lines)
├── README.md                             # For GitHub/marketplace users
├── CLAUDE.md                             # For contributors (YOU ARE HERE)
└── LICENSE                               # Apache 2.0
```

### File Roles

| File | Audience | Purpose |
|------|----------|---------|
| `.claude-plugin/marketplace.json` | Claude Code | Marketplace and plugin metadata |
| `SKILL.md` | Claude Code | Core skill (~645 lines, ~5.4K tokens) |
| `references/*.md` | Claude Code | Reference files loaded on demand (7 files, ~39K tokens) |
| `README.md` | End users | Installation, usage examples, what it covers |
| `CLAUDE.md` | Contributors | Development guidelines, architecture decisions |
| `LICENSE` | Everyone | Apache 2.0 legal terms |

## How Claude Skills Work

### Progressive Disclosure

```
User: "Create a Terraform module with tests"
       ↓
Claude: Scans skill metadata (~100 tokens)
       ↓
Claude: "This matches terraform-skill activation triggers"
       ↓
Claude: Loads full SKILL.md (~4,400 tokens)
       ↓
Claude: Applies testing framework decision matrix
       ↓
Response: Code following best practices
```

**Key Insight:** Skills only load when relevant, minimizing token usage.

### Token Budget

- **Metadata (YAML frontmatter):** ~100 tokens - always loaded
- **Core SKILL.md:** ~5,400 tokens - loaded on activation
- **Reference files:** Individual estimates (loaded on demand only):
  - ci-cd-workflows.md: ~2,300 tokens
  - code-patterns.md: ~5,100 tokens
  - module-patterns.md: ~7,000 tokens
  - quick-reference.md: ~5,000 tokens
  - security-compliance.md: ~2,500 tokens
  - state-management.md: ~11,700 tokens
  - testing-frameworks.md: ~3,400 tokens
- **Target:** Aim for under 500 lines for main SKILL.md (current: 645 lines - includes essential state management summary)

**Our Architecture:**
- SKILL.md: 645 lines, ~5.4K tokens (comprehensive core guidance with state management)
- Reference files: 7 files totaling 6,158 lines, ~39K tokens
- Progressive disclosure: ~50-65% token reduction for typical queries (vs loading all content)

## Content Philosophy

### What Belongs in SKILL.md

✅ **Include:**
- Terraform-specific patterns and idioms
- Decision frameworks (when to use X vs Y)
- Version-specific features (Terraform 1.6+, 1.9+, etc.)
- Testing strategy workflows
- ✅ DO vs ❌ DON'T examples
- Quick reference tables and decision matrices

✅ **Keep:**
- Scannable format (tables, headers, visual hierarchy)
- Imperative voice ("Use X", not "You should consider X")
- Concrete examples with inline comments
- Version requirements clearly marked

### What Doesn't Belong

❌ **Exclude:**
- Generic programming advice
- Terraform syntax basics (covered in official docs)
- Provider-specific resource details (use MCP tools)
- Obvious practices ("use version control")
- Long prose explanations (use tables instead)

## Content Structure

SKILL.md is organized by workflow phase:

1. **When to Use This Skill** - Activation triggers for Claude
2. **Core Principles** - Naming, structure, philosophy
3. **Testing Strategy Framework** - Decision matrices
4. **Module Development** - Best practices and patterns
5. **Common Patterns** - ✅/❌ side-by-side examples
6. **CI/CD Integration** - Workflow automation
7. **Quick Reference** - Rapid consultation tables
8. **License & Attribution** - Legal and source credits

Each section is self-contained for selective reading.

## Writing Style Guide

### Imperative Voice

✅ **Good:**
```markdown
Use underscores in variable names, not hyphens:

✅ DO: `variable "vpc_id" {}`
❌ DON'T: `variable "vpc-id" {}`
```

❌ **Bad:**
```markdown
You should consider using underscores instead of hyphens
in your variable names, as this is generally preferred.
```

### Scannable Format

Use:
- **Tables** for comparisons and decision matrices
- **Code blocks** with inline comments
- **Headers** for clear section breaks
- **Bullets** for lists, not paragraphs
- **✅/❌** for visual clarity

### Version Requirements

Always mark version-specific features:

```markdown
**Native Tests** (Terraform 1.6+, OpenTofu 1.7+)
```

## Development Workflow

### This Is Not Traditional Software

**No build/test/compile:**
- It's documentation, not code
- No automated test suite
- No build artifacts

**Validation approach:**
1. Update SKILL.md
2. Load in Claude Code (reload skills)
3. Test on real Terraform projects
4. Observe if Claude applies patterns correctly
5. Iterate based on results

### Testing Your Changes

**Before submitting a PR:**

1. **Load the updated skill:**
   ```bash
   # If you have local clone in ~/.claude/references/
   # Claude Code auto-reloads on file changes
   ```

2. **Test with real queries:**
   - "Create a Terraform module with tests"
   - "Review this configuration"
   - "What testing framework should I use?"

3. **Verify Claude references the skill:**
   - Check if new patterns appear in responses
   - Ensure no conflicts with existing guidance

4. **Check token count:**
   ```bash
   wc -c SKILL.md  # Currently ~17,700 chars ≈ 4,400 tokens
   ```

### When to Update

**Update the skill when:**
- ✅ New Terraform major/minor versions introduce features
- ✅ Community consensus emerges on patterns
- ✅ Real-world usage reveals gaps or ambiguities
- ✅ Anti-patterns discovered that should be warned against

**Don't update for:**
- ❌ Provider-specific resource changes (use MCP tools)
- ❌ Minor version patches without feature changes
- ❌ Personal preferences without community consensus

## Working with MCP Tools

When this skill is used alongside Terraform MCP server:

| Provides | Skill | MCP |
|----------|-------|-----|
| Best practices | ✅ | ❌ |
| Code patterns | ✅ | ❌ |
| Testing workflows | ✅ | ❌ |
| Latest versions | ❌ | ✅ |
| Registry docs | ❌ | ✅ |
| Module search | ❌ | ✅ |

**Together they enable:**
- Code generation following best practices
- Up-to-date version constraints
- Framework selection guidance
- Proactive anti-pattern detection

## Quality Standards

### Content Quality Checklist

Before merging changes:

- [ ] Decision frameworks are clear
- [ ] Examples are accurate and tested
- [ ] No outdated information
- [ ] Version-specific guidance marked
- [ ] Common pitfalls documented
- [ ] ✅/❌ examples for non-obvious patterns

### Technical Quality

- [ ] Code examples are syntactically correct
- [ ] Commands follow current best practices
- [ ] Links to official documentation work
- [ ] Tools referenced are current (not deprecated)

### Usability

- [ ] Clear activation triggers
- [ ] Quick reference sections scannable
- [ ] Logical organization maintained
- [ ] Consistent formatting (markdown standards)

### Legal

- [ ] License clearly stated (Apache 2.0)
- [ ] Sources attributed
- [ ] Copyright notice current
- [ ] No copyrighted content without permission

## Contributing Process

### 1. Fork & Branch

```bash
git clone https://github.com/YOUR_USERNAME/terraform-skill
cd terraform-skill
git checkout -b feature/your-improvement
```

### 2. Make Changes

Edit `SKILL.md` following the guidelines above.

### 3. Test Locally

```bash
# Copy to Claude skills directory for testing
cp -r . ~/.claude/references/terraform-skill/

# Test in Claude Code with real queries
```

### 4. Submit PR

```bash
git add SKILL.md
git commit -m "Add guidance for Terraform 1.10 feature X"
git push origin feature/your-improvement
```

Create PR with:
- Clear description of what changed
- Why the change improves the skill
- How you tested it

### 5. Review Process

Maintainers will check:
- Content accuracy
- Token efficiency
- Consistency with existing patterns
- Real-world testing results

## Skill Evolution Strategy

### Maintaining Balance

As Terraform evolves, balance:
- **Completeness** vs **Token efficiency**
- **Detail** vs **Scannability**
- **Examples** vs **Reference**

**Current Status:** SKILL.md is at 645 lines, above the suggested 500-line target. This is justified by:
- Comprehensive decision matrices (testing, count vs for_each, state organization)
- Essential quick reference tables
- State management fundamentals (critical gap filled)
- Version-specific guidance (multiple Terraform versions)
- Progressive disclosure architecture minimizes token cost

The additional content provides significant value, particularly the state management section which addresses one of the most critical aspects of Terraform usage. Future updates should prioritize reference file expansion over core skill growth.

Current sweet spot: ~5.4K tokens for core SKILL.md, with 7 reference files (~39K tokens) providing deep-dive content on demand. Total coverage: ~44.4K tokens structured for progressive disclosure.

### Long-term Vision

This skill should:
- Stay current with Terraform/OpenTofu releases
- Remain the definitive Claude resource for Terraform
- Evolve with community consensus
- Maintain production-grade quality standards

## Questions?

- **Issues:** [GitHub Issues](https://github.com/antonbabenko/terraform-skill/issues)
- **Discussions:** Use GitHub Discussions for questions
- **Author:** [@antonbabenko](https://github.com/antonbabenko)

---

**Remember:** You're not just editing docs - you're shaping how Claude understands and applies Terraform best practices. Quality matters.
