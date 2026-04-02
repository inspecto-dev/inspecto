#!/usr/bin/env python3
"""
Extract raw source code context from a VSCode extension's extension.js.

Usage:
    python3 extract_context.py <extension-id> <command-name> [--chars 1500]
    python3 extract_context.py <extension-id> --keyword "handleUri" [--chars 2000]
    python3 extract_context.py <extension-id> --pattern "sendText.*true"

Examples:
    python3 extract_context.py anthropic.claude-code claude-vscode.terminal.open --chars 1500
    python3 extract_context.py openai.chatgpt --keyword "handleUri" --chars 2000
    python3 extract_context.py anthropic.claude-code --pattern "createPanel" --chars 1000
"""

import argparse
import glob
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


def extract_by_command(src, cmd_name, before_chars, after_chars):
    escaped = re.escape(cmd_name)
    results = []
    for m in re.finditer(rf'registerCommand\s*\(\s*["\']{ escaped }["\']', src):
        start = max(0, m.start() - before_chars)
        end = min(len(src), m.end() + after_chars)
        results.append({
            'position': m.start(),
            'match': m.group(),
            'context': src[start:end],
        })
    return results


def extract_by_keyword(src, keyword, before_chars, after_chars):
    results = []
    for m in re.finditer(re.escape(keyword), src):
        start = max(0, m.start() - before_chars)
        end = min(len(src), m.end() + after_chars)
        results.append({
            'position': m.start(),
            'match': m.group(),
            'context': src[start:end],
        })
    return results


def extract_by_pattern(src, pattern, before_chars, after_chars):
    results = []
    try:
        for m in re.finditer(pattern, src):
            start = max(0, m.start() - before_chars)
            end = min(len(src), m.end() + after_chars)
            results.append({
                'position': m.start(),
                'match': m.group()[:200],
                'context': src[start:end],
            })
    except re.error as e:
        print(f"❌ Invalid regex pattern: {e}", file=sys.stderr)
        sys.exit(1)
    return results


def main():
    parser = argparse.ArgumentParser(description="Extract source context from extension.js")
    parser.add_argument("extension_id", help="e.g. anthropic.claude-code")
    parser.add_argument("command", nargs="?", help="Command name to find")
    parser.add_argument("--keyword", help="Search for a keyword instead of a command")
    parser.add_argument("--pattern", help="Search with a regex pattern")
    parser.add_argument("--chars", type=int, default=800, help="Context chars after match (default: 800)")
    parser.add_argument("--before", type=int, default=200, help="Context chars before match (default: 200)")
    parser.add_argument("--ext-base", help="Custom extensions directory")
    parser.add_argument("--max-results", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("--output", "-o", help="Write to file")
    args = parser.parse_args()

    if not args.command and not args.keyword and not args.pattern:
        print("❌ Provide a command name, --keyword, or --pattern", file=sys.stderr)
        sys.exit(1)

    ext_dir = find_extension(args.extension_id, args.ext_base)
    if not ext_dir:
        print(f"❌ Extension '{args.extension_id}' not found.", file=sys.stderr)
        sys.exit(1)

    ext_js_path = find_extension_js(ext_dir)
    if not ext_js_path:
        print(f"❌ extension.js not found in {ext_dir}", file=sys.stderr)
        sys.exit(1)

    with open(ext_js_path, "r", errors="ignore") as f:
        src = f.read()

    print(f"Extension: {args.extension_id}")
    print(f"Source:    {ext_js_path} ({len(src):,} chars)")

    if args.command:
        results = extract_by_command(src, args.command, args.before, args.chars)
        search_desc = f"registerCommand(\"{args.command}\")"
    elif args.keyword:
        results = extract_by_keyword(src, args.keyword, args.before, args.chars)
        search_desc = f"keyword: {args.keyword}"
    else:
        results = extract_by_pattern(src, args.pattern, args.before, args.chars)
        search_desc = f"pattern: {args.pattern}"

    results = results[:args.max_results]

    output_lines = []
    output_lines.append(f"\nSearch: {search_desc}")
    output_lines.append(f"Found:  {len(results)} match(es)\n")

    for i, r in enumerate(results):
        output_lines.append(f"{'=' * 60}")
        output_lines.append(f"Match {i + 1} at position {r['position']}")
        output_lines.append(f"{'=' * 60}")
        output_lines.append(r['context'])
        output_lines.append("")

    text = "\n".join(output_lines)

    if args.output:
        with open(args.output, "w") as f:
            f.write(text)
        print(f"Output saved to {args.output}")
    else:
        print(text)


if __name__ == "__main__":
    main()
