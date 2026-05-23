'use strict'

/**
 * POWER.md generator (Kiro Power).
 *
 * Single source of truth is skills/terraform-skill/SKILL.md. This emits a
 * repo-root POWER.md so the same skill installs as a Kiro Power ("Add power
 * from GitHub"). Pure, deterministic, idempotent.
 *
 * POWER.md is a GENERATED, CI-owned artifact - same contract as
 * .codex-plugin/plugin.json: never hand-edit. The release pre-commit hook
 * regenerates and stages it so the tag carries an in-sync tree.
 *
 * displayName + keywords are reused from .codex-plugin/plugin.json (one
 * curated source). references/ files are NOT moved; only relative links are
 * rewritten so they resolve from repo root.
 *
 * Node built-ins only (fs, path). No npm deps. No YAML lib: the SKILL.md
 * frontmatter is a fixed, simple shape parsed line by line.
 *
 * Usage:
 *   node .github/release/build-power.js          # write POWER.md
 *   node .github/release/build-power.js --check   # exit 1 if out of sync
 */

const fs = require('fs')
const path = require('path')

const SKILL_REL = 'skills/terraform-skill/SKILL.md'
const CODEX_REL = '.codex-plugin/plugin.json'
const POWER_REL = 'POWER.md'
const SENTINEL_REL = 'version.json'
const MCP_SERVER = 'terraform-mcp-server'

function repoRoot() {
  const root = process.env.GITHUB_WORKSPACE || process.cwd()
  if (!fs.existsSync(path.join(root, SENTINEL_REL))) {
    throw new Error(
      `build-power: sentinel ${SENTINEL_REL} not found in repo root ` +
        `${root}; refusing to run (wrong working directory?)`
    )
  }
  return root
}

function splitFrontmatter(src) {
  // parts[0] == '' (before first ---), [1] == frontmatter, [2] == body
  const parts = src.split('---')
  if (parts.length < 3 || parts[0].trim() !== '') {
    throw new Error(`build-power: ${SKILL_REL} has no leading --- frontmatter`)
  }
  return { fm: parts[1], body: parts.slice(2).join('---') }
}

// The SKILL.md frontmatter is a fixed shape: top-level name/description/
// license, then a metadata: block with 2-space-indented author/version.
function parseFrontmatter(fm) {
  const out = {}
  for (const raw of fm.split('\n')) {
    const line = raw.replace(/\r$/, '')
    let m
    if ((m = line.match(/^name:\s*(.+?)\s*$/))) out.name = m[1]
    else if ((m = line.match(/^description:\s*(.+?)\s*$/)))
      out.description = m[1]
    else if ((m = line.match(/^\s+author:\s*(.+?)\s*$/))) out.author = m[1]
    else if ((m = line.match(/^\s+version:\s*(.+?)\s*$/))) out.version = m[1]
  }
  for (const k of ['name', 'description', 'author', 'version']) {
    if (!out[k]) {
      throw new Error(`build-power: ${SKILL_REL} frontmatter missing ${k}`)
    }
  }
  return out
}

function yamlDoubleQuoted(s) {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

function buildPower(root) {
  const skillSrc = fs.readFileSync(path.join(root, SKILL_REL), 'utf8')
  const { fm, body } = splitFrontmatter(skillSrc)
  const meta = parseFrontmatter(fm)

  const codex = JSON.parse(fs.readFileSync(path.join(root, CODEX_REL), 'utf8'))
  const displayName =
    (codex.interface && codex.interface.displayName) || meta.name
  const keywords = Array.isArray(codex.keywords) ? codex.keywords : []
  if (!keywords.length) {
    throw new Error(`build-power: ${CODEX_REL} has no keywords`)
  }

  // references/ files stay in place; rewrite links so they resolve from root.
  const rewritten = body
    .replace(/\]\(references\//g, '](skills/terraform-skill/references/')
    .replace(/^\n+/, '')
    .replace(/\s*$/, '')

  // Quote free-text scalars + every keyword so a future value containing a
  // YAML-sensitive char (:, #, [, etc.) cannot break frontmatter parsing.
  // version stays unquoted: a CI-controlled multi-dot semver is always a
  // YAML string and the validate.yml semver check reads it directly.
  const front = [
    '---',
    `name: ${yamlDoubleQuoted(meta.name)}`,
    `displayName: ${yamlDoubleQuoted(displayName)}`,
    `description: ${yamlDoubleQuoted(meta.description)}`,
    `keywords: [${keywords.map((k) => yamlDoubleQuoted(k)).join(', ')}]`,
    `author: ${yamlDoubleQuoted(meta.author)}`,
    `version: ${meta.version}`,
    '---',
  ].join('\n')

  const banner =
    '<!-- GENERATED FILE - DO NOT EDIT. Source: ' +
    SKILL_REL +
    '. Regenerate: node .github/release/build-power.js. ' +
    'CI-owned (version sync), like .codex-plugin/plugin.json. -->'

  const mcpTrailer = [
    '## MCP Tools (Kiro)',
    '',
    'This Power optionally bundles the HashiCorp official',
    '`' +
      MCP_SERVER +
      '` (see `mcp.json`) for read-only Terraform Registry and',
    'provider/module documentation lookups. Kiro registers it under the',
    'Powers section of `~/.kiro/settings/mcp.json` on install. The guidance',
    'above works without it; with it, registry/schema lookups are exact',
    'instead of recalled.',
    '',
    'The image uses the floating `latest` tag. Docker caches it on first run',
    'and does not auto-update; run `docker pull ' +
      'hashicorp/terraform-mcp-server:latest` to refresh, or pin a specific',
    'tag in `~/.kiro/settings/mcp.json` if a new release misbehaves.',
  ].join('\n')

  return `${front}\n\n${banner}\n\n${rewritten}\n\n${mcpTrailer}\n`
}

function main() {
  const root = repoRoot()
  const check = process.argv.includes('--check')
  const generated = buildPower(root)
  const dest = path.join(root, POWER_REL)
  const current = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null

  if (check) {
    if (current !== generated) {
      console.error(
        `build-power: ${POWER_REL} is out of sync with ${SKILL_REL}. ` +
          `Run: node .github/release/build-power.js`
      )
      process.exit(1)
    }
    console.log(`build-power: ${POWER_REL} in sync`)
    return
  }

  if (current === generated) {
    console.log(`build-power: ${POWER_REL} already up to date`)
    return
  }
  fs.writeFileSync(dest, generated)
  console.log(`build-power: wrote ${POWER_REL}`)
}

if (require.main === module) {
  try {
    main()
  } catch (err) {
    console.error(`build-power: ${err && err.message ? err.message : err}`)
    process.exit(1)
  }
}

module.exports = { buildPower }
