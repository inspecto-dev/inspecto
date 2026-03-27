#!/usr/bin/env python3
"""
Analyze parameter signatures of VSCode extension commands.

Usage:
    python3 analyze_params.py <extension-id> <command-name> [options]
    python3 analyze_params.py <extension-id> --all [options]

Examples:
    python3 analyze_params.py anthropic.claude-code claude-vscode.terminal.open
    python3 analyze_params.py openai.chatgpt chatgpt.newCodexPanel --context-size 1200
    python3 analyze_params.py anthropic.claude-code --all
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

TYPE_PATTERNS = [
    (r'typeof\s+{param}\s*===\s*["\']string["\']', 'string'),
    (r'typeof\s+{param}\s*===\s*["\']number["\']', 'number'),
    (r'typeof\s+{param}\s*===\s*["\']boolean["\']', 'boolean'),
    (r'typeof\s+{param}\s*===\s*["\']object["\']', 'object'),
    (r'Array\.isArray\(\s*{param}\s*\)', 'string[]'),
    (r'{param}\?\.\w+', 'object?'),
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


def extract_param_signature(src, cmd_name):
    escaped = re.escape(cmd_name)
    patterns = [
        rf'registerCommand\(\s*["\']{ escaped }["\']\s*,\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{{',
        rf'registerCommand\(\s*["\']{ escaped }["\']\s*,\s*(?:async\s*)?\(([^)]*)\)\s*=>',
        rf'registerCommand\(\s*["\']{ escaped }["\']\s*,\s*(?:async\s*)?(\w+)\s*=>',
        rf'registerCommand\(\s*["\']{ escaped }["\']\s*,\s*(?:async\s*)?function\s*\(([^)]*)\)',
    ]
    for pat in patterns:
        m = re.search(pat, src)
        if m:
            raw = m.group(1).strip()
            return raw if raw else None
    return None


def get_command_context(src, cmd_name, context_chars=800):
    escaped = re.escape(cmd_name)
    for m in re.finditer(rf'registerCommand\s*\(\s*["\']{ escaped }["\']', src):
        start = max(0, m.start() - 200)
        end = min(len(src), m.end() + context_chars)
        return src[start:end]
    return ""


def infer_param_types(context, raw_params):
    if not raw_params:
        return {}
    params = [p.strip() for p in raw_params.split(",") if p.strip()]
    types = {}
    for param in params:
        for pattern_template, type_name in TYPE_PATTERNS:
            pattern = pattern_template.replace('{param}', re.escape(param))
            if re.search(pattern, context):
                types[param] = type_name
                break
        if param not in types:
            ternary_pat = rf'typeof\s+{re.escape(param)}\s*===\s*["\'](\w+)["\']\s*\?\s*{re.escape(param)}\s*:\s*(?:void 0|undefined)'
            m = re.search(ternary_pat, context)
            if m:
                types[param] = m.group(1) + "?"
    return types


def extract_uri_handlers(src):
    handlers = []
    for m in re.finditer(r'handleUri\s*\(', src):
        start = m.start()
        end = min(len(src), start + 3000)
        block = src[start:end]
        cases = re.findall(r'case\s+["\']([^"\']+)["\']', block)
        param_gets = re.findall(r'\.get\(\s*["\'](\w+)["\']\s*\)', block)
        dispatches = re.findall(r'executeCommand\(\s*["\']([^"\']+)["\']\s*,?\s*([^)]{0,200})\)', block)
        handlers.append({
            'cases': cases,
            'url_params': list(set(param_gets)),
            'dispatches': dispatches,
        })
    return handlers


def extract_internal_calls(context):
    return list(set(re.findall(r'executeCommand\(\s*["\']([^"\']+)["\']', context)))


def extract_comm_patterns(context):
    keywords = ['sendText', 'postMessage', '.fire(', 'shellIntegration.executeCommand']
    found = []
    for kw in keywords:
        if kw in context:
            for m in re.finditer(re.escape(kw), context):
                start = max(0, m.start() - 40)
                end = min(len(context), m.end() + 80)
                found.append(context[start:end].replace('\n', ' ').strip())
                break
    return found


def analyze_one(src, cmd_name, context_size, uri_handlers):
    raw_params = extract_param_signature(src, cmd_name)
    context = get_command_context(src, cmd_name, context_size)
    param_types = infer_param_types(context, raw_params) if raw_params else {}
    internal = extract_internal_calls(context)
    comm = extract_comm_patterns(context)

    # URI mapping
    uri_info = None
    for h in uri_handlers:
        for dispatch_cmd, dispatch_args in h.get('dispatches', []):
            if dispatch_cmd == cmd_name:
                uri_info = {
                    'cases': h['cases'],
                    'url_params': h['url_params'],
                    'dispatch_args': dispatch_args.strip()[:200],
                }
                break

    return {
        'params': raw_params,
        'param_types': param_types,
        'internal_calls': [c for c in internal if c != cmd_name],
        'comm_patterns': comm,
        'uri': uri_info,
        'context': context,
    }


def print_result(cmd_name, result, verbose=False):
    print(f"\n┌─ {cmd_name}")

    if result['params']:
        print(f"│  Params: ({result['params']})")
        if result['param_types']:
            type_strs = [f"{k}: {v}" for k, v in result['param_types'].items()]
            print(f"│  Types:  {', '.join(type_strs)}")
    else:
        print(f"│  Params: (none)")

    if result['uri']:
        uri = result['uri']
        print(f"│  URI:    paths={uri['cases']}, params={uri['url_params']}")
        if uri['dispatch_args']:
            print(f"│          dispatch: {cmd_name}({uri['dispatch_args'][:120]})")

    if result['internal_calls']:
        print(f"│  Calls:  {', '.join(result['internal_calls'][:5])}")

    if result['comm_patterns']:
        for cp in result['comm_patterns'][:3]:
            print(f"│  Comm:   {cp[:120]}")

    if verbose and result['context']:
        print(f"│")
        print(f"│  ── Context ──")
        ctx = result['context'][:1000].replace('\n', ' ')
        # Print in chunks of 100
        while ctx:
            print(f"│  {ctx[:100]}")
            ctx = ctx[100:]

    print(f"└{'─' * 40}")


def main():
    parser = argparse.ArgumentParser(description="Analyze VSCode extension command parameters")
    parser.add_argument("extension_id", help="e.g. anthropic.claude-code")
    parser.add_argument("command", nargs="?", help="Command to analyze, e.g. claude-vscode.terminal.open")
    parser.add_argument("--all", action="store_true", help="Analyze all commands")
    parser.add_argument("--ext-base", help="Custom extensions directory")
    parser.add_argument("--context-size", type=int, default=800, help="Context chars (default: 800)")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show code context")
    args = parser.parse_args()

    if not args.command and not args.all:
        print("❌ Provide a command name or use --all", file=sys.stderr)
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

    uri_handlers = extract_uri_handlers(src)

    if args.all:
        # Get all registered commands
        all_cmds = sorted(set(re.findall(r'registerCommand\(["\']([^"\']+)["\']', src)))
        results = {}
        for cmd in all_cmds:
            results[cmd] = analyze_one(src, cmd, args.context_size, uri_handlers)
        if args.json:
            clean = {k: {kk: vv for kk, vv in v.items() if kk != 'context'} for k, v in results.items()}
            print(json.dumps(clean, indent=2, ensure_ascii=False))
        else:
            print(f"Extension: {args.extension_id}")
            print(f"Analyzing {len(all_cmds)} commands...")
            for cmd in all_cmds:
                print_result(cmd, results[cmd], args.verbose)
    else:
        result = analyze_one(src, args.command, args.context_size, uri_handlers)
        if args.json:
            clean = {k: v for k, v in result.items() if k != 'context'}
            print(json.dumps(clean, indent=2, ensure_ascii=False))
        else:
            print(f"Extension: {args.extension_id}")
            print_result(args.command, result, args.verbose)


if __name__ == "__main__":
    main()
