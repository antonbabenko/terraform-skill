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
│   └── plugin.json                       # Plugin metadata
├── SKILL.md                              # Core skill file (~320 lines)
├── references/                               # Reference files (progressive disclosure)
│   ├── testing-frameworks.md             # Testing guides
│   ├── module-patterns.md                # Module best practices
│   ├── ci-cd-workflows.md                # CI/CD templates
│   ├── security-compliance.md            # Security guidance
│   └── quick-reference.md                # Command cheat sheets
├── README.md                             # For GitHub/marketplace users
├── CLAUDE.md                             # For contributors (YOU ARE HERE)
└── LICENSE                               # Apache 2.0
```

### File Roles

| File | Audience | Purpose |
|------|----------|---------|
| `.claude-plugin/plugin.json` | Claude Code | Plugin metadata for marketplace |
| `SKILL.md` | Claude Code | Core skill (~320 lines, ~3K tokens) |
| `references/*.md` | Claude Code | Reference files loaded on demand |
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
Claude: Loads full SKILL.md (~5,300 tokens)
       ↓
Claude: Applies testing framework decision matrix
       ↓
Response: Code following best practices
```

**Key Insight:** Skills only load when relevant, minimizing token usage.

### Token Budget

- **Metadata (YAML frontmatter):** ~100 tokens - always loaded
- **Core SKILL.md:** ~3,000 tokens - loaded on activation
- **Reference files:** ~2,000-3,000 tokens each - loaded on demand only
- **Target:** Under 500 lines for main SKILL.md (per official guidance)

**Our Architecture:**
- SKILL.md: 319 lines, ~3K tokens (well under 500-line limit)
- Reference files: 5 files totaling 1,984 lines
- Progressive disclosure: ~43% token reduction for typical queries

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
8. **Additional Resources** - Links to official sources
9. **License & Attribution** - Legal and source credits

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
   wc -c SKILL.md  # Should be ~21,000 chars ≈ 5,300 tokens
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

Current sweet spot: ~5.3K tokens covering broad surface area.

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
