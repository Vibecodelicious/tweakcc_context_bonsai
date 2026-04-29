#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

fail() {
  printf 'FAIL %s: %s\n' "$1" "$2" >&2
  exit 1
}

pass() {
  printf 'PASS %s\n' "$1"
}

pass_with_detail() {
  printf 'PASS %s: %s\n' "$1" "$2"
}

require_file() {
  local id="$1"
  local rel_path="$2"
  local abs_path="$ROOT_DIR/$rel_path"
  if [[ ! -f "$abs_path" ]]; then
    fail "$id" "missing file $rel_path"
  fi
  pass "$id"
}

require_contains() {
  local id="$1"
  local rel_path="$2"
  local needle="$3"
  local abs_path="$ROOT_DIR/$rel_path"
  if ! grep -Fq "$needle" "$abs_path"; then
    fail "$id" "missing required text '$needle' in $rel_path"
  fi
  pass "$id"
}

require_tools_exposed() {
  local id="$1"
  if ! bun --eval '
import { listContextBonsaiTools } from "./mcp-server/index.ts";

const required = [
  "context-bonsai-prune",
  "context-bonsai-retrieve",
];

const available = new Set(listContextBonsaiTools().map((tool) => tool.name));
const missing = required.filter((name) => !available.has(name));

if (missing.length > 0) {
  console.error(`MISSING_TOOLS:${missing.join(",")}`);
  process.exit(1);
}
' >/dev/null; then
    fail "$id" "mcp-server missing required context-bonsai tools"
  fi
  pass "$id"
}

require_policy_checklist_complete() {
  local id="$1"
  local rel_path="docs/policy-safety-checklist.md"
  local abs_path="$ROOT_DIR/$rel_path"
  if grep -Eq '^- \[ \]' "$abs_path"; then
    fail "$id" "unchecked checklist items remain in $rel_path"
  fi
  pass "$id"
}

require_bundle_path_and_hash() {
  local path_id="$1"
  local hash_id="$2"
  local bundle_path="${BONSAI_MIN_BUNDLE_PATH:-mcp-server/index.ts}"

  local abs_path="$bundle_path"
  if [[ "$bundle_path" != /* ]]; then
    abs_path="$ROOT_DIR/$bundle_path"
  fi

  if [[ ! -f "$abs_path" ]]; then
    fail "$path_id" "bundle path does not exist: $bundle_path"
  fi

  pass_with_detail "$path_id" "$bundle_path"

  local bundle_hash
  bundle_hash="$(sha256sum "$abs_path" | cut -d' ' -f1)"
  pass_with_detail "$hash_id" "sha256=$bundle_hash"
}

require_patch_discovery_signatures() {
  local id="$1"
  local rel_path="mcp-server/index.ts"
  local abs_path="$ROOT_DIR/$rel_path"
  local required_tools=(
    '"context-bonsai-prune"'
    '"context-bonsai-retrieve"'
  )
  local required_errors=(
    'Compatibility error: unable to access active session.'
    'Error: ID selectors are not supported. Use from_pattern and to_pattern only.'
    'Error: prune requires from_pattern, to_pattern, summary, and index_terms.'
    'Error: retrieve requires only anchor_id.'
    'Error: anchor_id not found.'
    'Error: anchor_id is not archived.'
    'Error: prune failed.'
  )

  local required
  for required in "${required_tools[@]}"; do
    if ! grep -Fq "$required" "$abs_path"; then
      fail "$id" "missing required tool signature $required in $rel_path"
    fi
  done

  for required in "${required_errors[@]}"; do
    if ! grep -Fq "$required" "$abs_path"; then
      fail "$id" "missing fail-closed error text '$required' in $rel_path"
    fi
  done

  pass "$id"
}

run_check() {
  local id="$1"
  shift
  if ! "$@"; then
    fail "$id" "command failed: $*"
  fi
  pass "$id"
}

run_tweakcc_gauge_tests() {
  (
    cd "$ROOT_DIR/tweakcc"
    bun run test -- src/patches/contextBonsaiGauge.test.ts
  )
}

require_file "DOC-ROADMAP" "docs/implementation-roadmap.md"
require_file "DOC-PROTOCOL" "docs/validation-protocol.md"
require_file "DOC-E2E" "docs/e2e-parity-scenarios.md"
require_file "DOC-ROLLBACK" "docs/rollback-and-incident-playbook.md"

require_contains "GAUGE-CADENCE-5" "docs/implementation-roadmap.md" "Cadence: every 5 turns"
require_contains "GAUGE-BANDS-4" "docs/implementation-roadmap.md" "Exactly 4 severity bands"
require_contains "GAUGE-BAND-LOW" "docs/e2e-parity-scenarios.md" "<30%"
require_contains "GAUGE-BAND-MID1" "docs/e2e-parity-scenarios.md" "30-60%"
require_contains "GAUGE-BAND-MID2" "docs/e2e-parity-scenarios.md" "61-80%"
require_contains "GAUGE-BAND-HIGH" "docs/e2e-parity-scenarios.md" ">80%"
require_contains "GAUGE-URGENCY" "docs/e2e-parity-scenarios.md" "PRUNE NOW"

require_contains "PROTO-COMMAND-ROOT" "docs/validation-protocol.md" 'test -n "$BONSAI_V2_ROOT" && test -d "$BONSAI_V2_ROOT"'
require_contains "PROTO-COMMAND-CORE" "docs/validation-protocol.md" 'cd "$BONSAI_V2_ROOT" && ./scripts/validate/validate-core.sh'

require_policy_checklist_complete "POLICY-CHECKLIST-COMPLETE"
require_bundle_path_and_hash "BUNDLE-PATH-SET" "BUNDLE-HASH"
require_patch_discovery_signatures "PATCH-DISCOVERY-CHECK"

require_tools_exposed "CORE-TOOLS-EXPOSED"
run_check "CORE-MCP-SERVER-TESTS" bun test mcp-server/index.test.ts
run_check "CORE-COMPACT-TESTS" bun test src/lib/compact.test.ts
run_check "CORE-TWEAKCC-GAUGE-TESTS" run_tweakcc_gauge_tests

BUILD_ID="${CLAUDE_CODE_BUILD_ID:-local-shell-unknown}"
pass_with_detail "BUILD-ID" "$BUILD_ID"
pass_with_detail "PLATFORM" "$(uname -s | tr '[:upper:]' '[:lower:]')"
pass_with_detail "TIMESTAMP" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

printf 'VALIDATION_COMPLETE\n'
