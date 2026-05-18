'use strict'

/**
 * conventional-changelog-action@v5 pre-commit hook.
 *
 * Runs AFTER the changelog/version-file bump and BEFORE the action's
 * git add/commit/tag. Files staged here land in the release commit AND
 * the tag, so tag-pinned consumers (agent-plugins pins ref:vX.Y.Z) get a
 * tree whose SKILL.md / .codex-plugin/plugin.json versions match the tag.
 *
 * This replaces the old post-tag amend + force-push, which left the tag
 * pointing at a pre-sync tree.
 *
 * Node built-ins only (fs, path, child_process). No npm deps. The action
 * does NOT auto-stage hook-modified files (only version-file + the
 * changelog), so the hook stages them explicitly.
 *
 * SKILL.md metadata.version stays the single CI-owned version source;
 * .codex-plugin/plugin.json mirrors it for the Codex plugin host.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const SKILL_REL = 'skills/terraform-skill/SKILL.md'
const MANIFEST_REL = '.codex-plugin/plugin.json'
const SENTINEL_REL = 'version.json'

function repoRoot() {
  const root = process.env.GITHUB_WORKSPACE || process.cwd()
  if (!fs.existsSync(path.join(root, SENTINEL_REL))) {
    throw new Error(
      `pre-commit: sentinel ${SENTINEL_REL} not found in repo root ` +
        `${root}; refusing to run (wrong working directory?)`
    )
  }
  return root
}

// Rewrite the SKILL.md YAML frontmatter "  version: X.Y.Z" line in place,
// preserving the exact 2-space indent (version is a child of metadata:).
function updateSkillVersion(root, version) {
  const file = path.join(root, SKILL_REL)
  if (!fs.existsSync(file)) {
    throw new Error(`pre-commit: ${SKILL_REL} not found`)
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  let updated = false
  // Frontmatter is the leading block; the version line sits within the
  // first handful of lines. Bound the search to avoid a body match.
  const limit = Math.min(lines.length, 15)
  for (let i = 0; i < limit; i++) {
    if (lines[i].trimStart().startsWith('version:')) {
      lines[i] = `  version: ${version}`
      updated = true
      break
    }
  }
  if (!updated) {
    throw new Error(
      `pre-commit: version line not found in ${SKILL_REL} frontmatter`
    )
  }
  fs.writeFileSync(file, lines.join('\n'))
  return SKILL_REL
}

// Value-only replace of the top-level "  "version": "..."" line.
// Anchored to a 2-space indent; rewrites only the quoted value so the
// trailing comma / key position / byte layout are untouched (no JSON
// re-serialize, no diff noise, position-independent).
function updateCodexManifest(root, version) {
  const file = path.join(root, MANIFEST_REL)
  if (!fs.existsSync(file)) {
    return null
  }
  const src = fs.readFileSync(file, 'utf8')
  const re = /^( {2}"version":\s*)"[^"]*"/m
  if (!re.test(src)) {
    throw new Error(
      `pre-commit: top-level "version" line not found in ${MANIFEST_REL}`
    )
  }
  fs.writeFileSync(file, src.replace(re, `$1"${version}"`))
  return MANIFEST_REL
}

async function preCommit(props) {
  const version = props && props.version
  if (!version || typeof version !== 'string') {
    throw new Error(`pre-commit: invalid version from action: ${version}`)
  }

  let root
  try {
    root = repoRoot()
    const skill = updateSkillVersion(root, version)
    console.log(`pre-commit: synced ${skill} -> ${version}`)

    const manifest = updateCodexManifest(root, version)
    if (manifest) {
      console.log(`pre-commit: synced ${manifest} -> ${version}`)
    } else {
      console.log(`pre-commit: ${MANIFEST_REL} absent; skipped`)
    }

    // The action stages only version-file + changelog. Stage ours so
    // they are in the release commit and the tag.
    const toStage = [skill]
    if (manifest) toStage.push(manifest)
    execSync(`git add ${toStage.join(' ')}`, { cwd: root, stdio: 'inherit' })
  } catch (err) {
    // Fail loud so the release job stops rather than tagging a stale tree.
    console.error(`pre-commit: ${err && err.message ? err.message : err}`)
    throw err
  }
}

module.exports = { preCommit }
