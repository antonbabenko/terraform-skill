#!/usr/bin/env python3
"""Lint fenced code blocks in the skill docs with the real tool for each language.

Catches snippets that cannot run as written (issues #64, #65): Rego that does
not parse, workflow expressions GitHub rejects, HCL/JSON/shell syntax errors,
and blocks labelled with the wrong language. Syntax and static checks only; it
does not prove a snippet is semantically right - see CONTRIBUTING.md.

Usage: check_snippets.py FILE.md...   (needs terraform, actionlint, opa, shellcheck)
Label a block `text` when it is pseudo-code, a directory tree or a fragment.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

FENCE = re.compile(r'^\s*```(\S*)\s*$')
# Workflow fragments (one job, one step) are fine; only real errors fail.
ACTIONLINT_IGNORE = r'section is missing'


def blocks(path):
    lang, start, buf = None, 0, []
    for no, line in enumerate(path.read_text().splitlines(keepends=True), 1):
        m = FENCE.match(line)
        if lang is None and m:
            lang, start, buf = m.group(1).lower(), no, []
        elif lang is not None and m and not m.group(1):
            yield lang, start, ''.join(buf)
            lang = None
        elif lang is not None:
            buf.append(line)


def run(cmd, src, suffix):
    with tempfile.NamedTemporaryFile('w', suffix=suffix, delete=False) as f:
        f.write(src)
    r = subprocess.run(cmd + [f.name], capture_output=True, text=True)
    Path(f.name).unlink()
    return r.returncode, (r.stdout + r.stderr).replace(f.name, '<snippet>')


def check(lang, src):
    """Return an error string, or None when the snippet passes."""
    if lang in ('hcl', 'terraform', 'tf'):
        code, out = run(['terraform', 'fmt', '-no-color', '-check'], src, '.tf')
        return out if code not in (0, 3) else None  # 3 = parses, unformatted
    if lang == 'json':
        try:
            json.loads(src)
        except ValueError as e:
            return str(e)
    if lang in ('yaml', 'yml'):
        try:
            doc = yaml.safe_load(src)
        except yaml.YAMLError as e:
            return str(e)
        if isinstance(doc, dict) and 'jobs' in doc and 'stages' not in doc:
            code, out = run(['actionlint', '-no-color', '-ignore',
                             ACTIONLINT_IGNORE], src, '.yml')
            return out if code else None
    if lang == 'rego':
        code, out = run(['opa', 'check'], src, '.rego')
        return out if code else None
    if lang in ('bash', 'sh', 'shell'):
        code, out = run(['shellcheck', '-s', 'bash', '-S', 'error',
                         '-f', 'gcc'], src, '.sh')
        return out if code else None
    return None


def main(paths):
    failed = 0
    for p in map(Path, paths):
        for lang, line, src in blocks(p):
            err = check(lang, src)
            if err:
                failed += 1
                print(f"::error file={p},line={line}::{lang} block does not "
                      f"pass its linter\n{err.strip()}\n")
    print(f"{'FAIL' if failed else 'OK'}: {failed} broken snippet(s)")
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
