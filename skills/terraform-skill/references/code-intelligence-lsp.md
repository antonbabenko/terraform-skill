# Code Intelligence (terraform-ls)

Semantic navigation for HCL via the `terraform-ls` language server. Use the LSP
for symbol relationships; use `rg` + Read for text. Pick by task, not by habit.

terraform-ls is optional. Without it, every operation below degrades to a
disclosed `rg` + Read fallback (see Degradation Gate). It is not a hard
dependency of this skill.

Self-contained terraform-ls specialization (capability matrix,
`terraform init`, `moved` blocks, `.tfvars`) of a generic code-intelligence
discipline - apply it directly.

Recommended companion: the `code-intelligence` plugin (same
`antonbabenko/agent-plugins` marketplace) is the single source of truth for the
generic discipline - tool precedence, position anchoring, the two-case
degradation gate, the first-line disclosure format, anti-phantom-shim proof -
and ships `/code-intelligence:doctor`. When it is installed, defer to its
generic protocol; the Terraform-specific capability matrix, routing, rename
workflow, and operational notes below remain owned here and work without it.

Security: `terraform init` may download modules and providers over the network.
Do not auto-run it in untrusted working directories. terraform-ls indexes local
source only; it does not execute the configuration.

### Setup (host prerequisites)

terraform-ls is optional; everything below degrades to a disclosed `rg` + Read
fallback without it. To get the semantic tier:

1. Install the language server:
   - macOS: `brew install hashicorp/tap/terraform-ls`
   - Any (Go): `go install github.com/hashicorp/terraform-ls@latest`
   - Verify: `terraform-ls --version`
2. Enable the agent's LSP tool. In Claude Code, export `ENABLE_LSP_TOOL=1`
   in your shell rc and reload; LSP tools require explicit opt-in.
3. Install an LSP transport that exposes a POSITION-based terraform-ls tool
   (`filePath`, `line`, `character`). One option is the third-party
   `terraform-ls` bridge from the `boostvolt/claude-code-lsps` marketplace:
   `/plugin marketplace add boostvolt/claude-code-lsps` then
   `/plugin install terraform-ls@claude-code-lsps`. If the only LSP tool
   exposed takes a bare symbol name, the transport is wrong/old - reinstall
   and fully restart the agent.
4. Fully restart the agent (kill the process, not just a new session) -
   plugins loading without a clean restart is the most common silent failure.
5. Verify readiness. If the companion `code-intelligence` plugin is installed,
   run `/code-intelligence:doctor` (checks `rg` + language servers including
   terraform-ls). Otherwise verify by hand: `rg --version` prints
   `ripgrep x.y.z`, `terraform-ls --version` succeeds, and a `documentSymbol`
   call on a `variables.tf` returns symbols (liveness probe). An initialized
   workspace (`terraform init` run, `.terraform/` present) is required for
   cross-module and provider resolution.

### terraform-ls Capability Matrix

Anchor target for the SKILL.md diagnose row. What the server can and cannot do.

| Operation | Supported | Semantic guarantee |
|-----------|-----------|--------------------|
| `goToDefinition` | ✅ | Jumps usage -> declaration (var/local/output/module/resource) |
| `findReferences` | ✅ | Enumerates references to the symbol at the given position, workspace-scoped |
| `documentSymbol` | ✅ | Outline of one file (blocks, variables, outputs, resources, modules) |
| `hover` | ✅ | Provider/resource attribute docs and inferred type at position |
| `workspaceSymbol` | ✅ | Broad symbol inventory; expensive, avoid for single-name lookup |
| `goToImplementation` | ❌ | Not implemented by terraform-ls |
| `prepareCallHierarchy` / `incomingCalls` / `outgoingCalls` | ❌ | No call hierarchy in terraform-ls |
| rename provider | ❌ | No server-side rename; renames are manual (see below) |

- ❌ Do not call unsupported operations and report their absence as a finding.
  Redirect call-hierarchy intent to `findReferences`.
- ✅ Treat `findReferences` as the authoritative reference set once the
  Degradation Gate passes.

### Position-Anchored Calls

terraform-ls resolves by source position, not by symbol name.

- ✅ Call with `file:line:character` pointing at an occurrence of the symbol.
- ✅ Anchor the position first with `rg`/Grep (find a known occurrence), then
  issue the LSP call at that location.
- ❌ Never pass a bare symbol name and expect resolution. A name-only call
  returning empty is a usage defect, not server degradation.
- ✅ Prereq: a local `terraform` (or `tofu`) binary on PATH, and
  `terraform init` run in the workspace, before relying on cross-module or
  provider resolution.
- ✅ Cold start: the first call after server launch may return empty while
  indexing. Retry once before concluding anything.

### Manual Rename Workflow

terraform-ls has no rename provider. Branch by what is being renamed.

**(a) Value symbol** - variable, local, output, or provider alias:

1. `findReferences` at an anchored position to enumerate every reference.
2. For EACH file with references: do a fresh Read of that file immediately
   before editing it. Offsets shift after a prior in-file edit; a stale view
   produces corrupted edits.
3. Apply the edit, then re-run `terraform validate` and check LSP diagnostics
   are clean.

**(b) Resource or module address** - this is NOT a text rename:

- Add a `moved` block and run `terraform plan`; confirm it shows 0 destroy /
  0 create for the moved address.
- See [Code Patterns: Moved Blocks](code-patterns.md#moved-blocks-terraform-11)
  for block syntax and the count/for_each address rules.

❌ Never blind-replace a resource address as text - it forces destroy/recreate.

### Degradation Gate

Pass ALL three before claiming "LSP unavailable, using rg instead". A vendored
or uninitialized workspace can legitimately return empty.

1. `documentSymbol` on a file in scope returns symbols -> server is
   responsive. (Responsiveness only; NOT proof of complete reference coverage.)
2. The failing call was position-anchored (not symbol-name-only).
3. That anchored call still returned empty.

Only then is a disclosed `rg` fallback warranted. State the substitution on the
first line of the response:

`Intended: terraform-ls findReferences. Actual: rg. Reason: <gate result>.
Impact: text matches only, no semantic scoping - may include comments/strings.`

❌ Do not assert a fallback without running the gate.
❌ Do not bury the substitution at the end of the response.

### When to Use rg Instead

LSP is the wrong tool for these; go straight to `rg` + Read:

- Exact text or a known literal string.
- Known-name lookup where you already have the file and only need the line.
- `.tfvars` files (values, not HCL symbol graph).
- Comments, generated docs, READMEs, lockfiles.
- Any non-HCL file.
