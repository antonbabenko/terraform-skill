# Pull Request

## Description

<!-- Provide a clear description of your changes -->

**Type of change:**
- [ ] New content (adding best practices, patterns, or guidance)
- [ ] Fix (correcting outdated or incorrect information)
- [ ] Refactor (reorganizing or improving clarity)
- [ ] Documentation (README, CONTRIBUTING, etc.)
- [ ] Testing framework improvement

**Summary:**
<!-- What does this change do and why? -->

## Testing Evidence (REQUIRED)

<!-- Per CONTRIBUTING.md, ALL changes must be tested -->

### Scenarios Tested

<!-- List which scenarios from tests/baseline-scenarios.md were affected -->

- [ ] Scenario #: [Name]
- [ ] Scenario #: [Name]

### Baseline Behavior (WITHOUT changes)

<!-- What did the agent do before your changes? -->

```
Prompt: [test prompt]

Agent response: [verbatim or screenshot]

Issues:
- [What was missing or incorrect]
```

### Compliance Behavior (WITH changes)

<!-- What does the agent do after your changes? -->

```
Prompt: [same test prompt]

Agent response: [verbatim or screenshot]

Improvements:
- [What improved]
- [Patterns now followed]
```

### Evidence of Improvement

- [ ] Agent references new content
- [ ] Agent applies new patterns proactively
- [ ] Agent doesn't rationalize skipping guidance
- [ ] No new rationalizations introduced

## Standards Compliance Checklist

### Frontmatter (if SKILL.md changed)

- [ ] Only `name` and `description` fields present
- [ ] Description starts with "Use when..."
- [ ] Description focuses on triggers/symptoms (not workflow summary)
- [ ] Description < 1024 characters
- [ ] Total frontmatter < 1024 characters
- [ ] Name uses only letters, numbers, hyphens

### Token Efficiency

- [ ] SKILL.md remains <1,500 words (current: ~1,400)
- [ ] Detailed content moved to skills/*.md reference files where appropriate
- [ ] Used tables instead of prose
- [ ] No content duplication

### Content Quality

- [ ] Imperative voice ("Use X", not "You should use X")
- [ ] Scannable format (tables, bullets, clear headers)
- [ ] Code examples are complete and runnable
- [ ] Version-specific features clearly marked
- [ ] ✅ DO vs ❌ DON'T patterns where appropriate

### File Organization

- [ ] Core content in SKILL.md
- [ ] Detailed guides in skills/*.md
- [ ] Testing updates in tests/*.md
- [ ] No new files outside standard structure

## Validation

<!-- These run automatically in CI, but check locally first -->

- [ ] Frontmatter validation passes
- [ ] File size within guidelines
- [ ] No broken internal links
- [ ] Markdown lint clean
- [ ] No TODO/FIXME comments (or tracked in issues)

## Rationalizations

<!-- If testing revealed new rationalizations agents use to skip best practices -->

**New rationalizations discovered:**
- [ ] None discovered
- [ ] Documented in tests/rationalization-table.md
  - Rationalization: [verbatim agent excuse]
  - Counter added: [how SKILL.md now addresses it]

## Related Issues

<!-- Link any related issues -->

Closes #
Relates to #

## Additional Context

<!-- Any other information reviewers should know -->

---

## For Maintainers

<!-- Maintainers complete this section during review -->

### Review Checklist

- [ ] Testing evidence is convincing (baseline → compliance improvement shown)
- [ ] Standards compliance verified
- [ ] Content is accurate and current
- [ ] Token efficiency maintained
- [ ] Quality standards met
- [ ] No conflicts with existing content
- [ ] CHANGELOG.md updated (if needed)

### Merge Checklist

- [ ] Squash commits with clear commit message
- [ ] Update CHANGELOG.md if not done in PR
- [ ] Consider if version bump needed
- [ ] Tag if this completes a planned milestone
