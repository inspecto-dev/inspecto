#!/usr/bin/env python3
"""
List all commands registered by a VSCode extension (declared + hidden).

Usage:
    python3 list_commands.py <extension-id> [--ext-base <path>] [--json]

Examples:
    python3 list_commands.py anthropic.claude-code
    python3 list_commands.py openai.chatgpt --ext-base ~/.cursor/extensions
"""

import argparse
import glob
import json
import os
import re
import subprocess
import sys

DEFAULT_BASES = [
    "~/.vscode/extensions",
    "~/.vscode-insiders/extensions",
    "~/.cursor/extensions",
]


def find_extension(ext_id, ext_base=None):
    bases = [ext_base] if ext_base else DEFAULT_BASES
    for base in bases:
        base = os.path.expanduser(base)
        if not os.path.isdir(base):
            continue
        matches = sorted(glob.glob(os.path.join(base, f"{ext_id}-*")))
        if matches:
            return matches[-1]
    return None


def find_extension_js(ext_dir):
    result = subprocess.run(
        ["find", ext_dir, "-name", "extension.js", "-maxdepth", "3"],
        capture_output=True, text=True, timeout=10
    )
    paths = [p for p in result.stdout.strip().split("\n") if p]
    if not paths:
        return None
    for p in paths:
        if "/dist/" in p or "/out/" in p:
            return p
    return paths[0]


def main():
    parser = argparse.ArgumentParser(description="List VSCode extension commands")
    parser.add_argument("extension_id", help="e.g. anthropic.claude-code")
    parser.add_argument("--ext-base", help="Custom extensions directory")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    ext_dir = find_extension(args.extension_id, args.ext_base)
    if not ext_dir:
        print(f"❌ Extension '{args.extension_id}' not found.", file=sys.stderr)
        sys.exit(1)

    print(f"Extension: {args.extension_id}")
    print(f"Directory: {ext_dir}\n")

    # --- package.json ---
    pkg_path = os.path.join(ext_dir, "package.json")
    declared = {}
    contributes_summary = {}
    if os.path.isfile(pkg_path):
        with open(pkg_path) as f:
            pkg = json.load(f)
        contributes = pkg.get("contributes", {})
        declared = {c["command"]: c.get("title", "") for c in contributes.get("commands", [])}
        contributes_summary = {k: len(v) if isinstance(v, list) else 1 for k, v in contributes.items()}

    # --- extension.js ---
    ext_js_path = find_extension_js(ext_dir)
    registered = set()
    if ext_js_path:
        with open(ext_js_path, "r", errors="ignore") as f:
            src = f.read()
        registered = set(re.findall(r'registerCommand\(["\']([^"\']+)["\']', src))

    hidden = sorted(registered - set(declared.keys()))
    all_cmds = sorted(set(declared.keys()) | registered)

    if args.json:
        print(json.dumps({
            "declared": declared,
            "hidden": hidden,
            "all_commands": all_cmds,
            "contributes": contributes_summary,
        }, indent=2, ensure_ascii=False))
        return

    # --- Text output ---
    print("── Declared Commands ──")
    for cmd in sorted(declared.keys()):
        print(f"  {cmd}  →  {declared[cmd]}")

    if hidden:
        print(f"\n── Hidden Commands (only in extension.js) ──")
        for cmd in hidden:
            print(f"  ⚡ {cmd}")

    print(f"\n── Contributes Summary ──")
    for key, count in sorted(contributes_summary.items()):
        print(f"  {key}: {count} items")

    print(f"\nTotal: {len(all_cmds)} commands ({len(declared)} declared, {len(hidden)} hidden)")


if __name__ == "__main__":
    main()
