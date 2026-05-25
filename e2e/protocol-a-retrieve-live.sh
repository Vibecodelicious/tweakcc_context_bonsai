#!/usr/bin/env bash
set -euo pipefail

RUN_DIR="/tmp/cc-bonsai-e2e/remove-cache-$(date -u +%Y%m%dT%H%M%SZ)"
RAW_DIR="$RUN_DIR/raw-secret-bearing"
mkdir -p "$RAW_DIR"
trap 'rm -rf "$RAW_DIR"' EXIT

SECRET="CBSA-$(date -u +%Y%m%d%H%M%S)-$RANDOM-$RANDOM"
BOUNDARY="BOUNDARY-$(date -u +%H%M%S)-$RANDOM"
SESSION_ID="$(bun -e "console.log(crypto.randomUUID())")"
MCP_CONFIG="{\"mcpServers\":{\"context-bonsai\":{\"command\":\"bun\",\"args\":[\"run\",\"$PWD/mcp-server/index.ts\"]}}}"
NO_MCP_CONFIG='{"mcpServers":{}}'
COMMON=(--strict-mcp-config --mcp-config "$MCP_CONFIG" --output-format json --permission-mode bypassPermissions)
NO_MCP=(--strict-mcp-config --mcp-config "$NO_MCP_CONFIG" --output-format json)

claude -p --session-id "$SESSION_ID" "${COMMON[@]}" \
  "Protocol A setup. Remember this temporary validation token exactly: $SECRET. Do not repeat the token in this setup response. This setup message also contains a non-secret boundary token for later pruning: $BOUNDARY. Reply only: acknowledged." \
  > "$RAW_DIR/01-seed.json"

for i in 1 2 3 4 5; do
  claude -p --resume="$SESSION_ID" "${COMMON[@]}" \
    "Padding turn $i for Protocol A. Discuss one brief non-secret fact about bonsai tree care. Do not mention any earlier secret or boundary token." \
    > "$RAW_DIR/0$((i+1))-pad.json"
done

claude -p --resume="$SESSION_ID" "${COMMON[@]}" \
  "Use the context-bonsai prune tool now. Prune exactly the single earlier setup user message by using the non-secret boundary token from that setup message as both from_pattern and to_pattern. Do not quote the token in your prose. The summary must be 'Protocol A seed turn archived.' The index terms must be ['protocol-a', 'seed-turn']. Do not include any secret literal in the tool arguments, summary, index terms, reason, or response." \
  > "$RAW_DIR/07-prune.json"

claude -p --resume="$SESSION_ID" "${NO_MCP[@]}" \
  "No tools. What was the temporary validation token I told you earlier? If it is unavailable or no longer in active context, say exactly UNAVAILABLE." \
  > "$RAW_DIR/08-recall-no-tools.json"

SESSION_FILE="$(
  SESSION_ID="$SESSION_ID" bun -e 'const fs=require("fs"), path=require("path"); const root=path.join(process.env.HOME,".claude","projects"); const target=process.env.SESSION_ID+".jsonl"; const stack=[root]; while(stack.length){const dir=stack.pop(); for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name); if(ent.isDirectory()) stack.push(p); else if(ent.name===target){console.log(p); process.exit(0)}}} process.exit(1)'
)"

bun run e2e/native-e2e.ts protocol-a-oracle --session "$SESSION_FILE" --secret "$SECRET" --out "$RUN_DIR/oracle-before-retrieve.json"

claude -p --resume="$SESSION_ID" "${COMMON[@]}" \
  "Use the context-bonsai retrieve tool for the archived Protocol A seed turn. After retrieval, answer this question: what was the temporary validation token? It is okay to repeat it now because this is the validation step." \
  > "$RAW_DIR/09-retrieve-and-answer.json"

claude -p --resume="$SESSION_ID" "${NO_MCP[@]}" \
  "Without using tools, what was the temporary validation token?" \
  > "$RAW_DIR/10-post-retrieve-answer.json"

SECRET="$SECRET" bun -e 'const fs=require("fs"); const secret=process.env.SECRET; const out=[]; for (const p of process.argv.slice(2)) { const text=fs.readFileSync(p,"utf8"); out.push(`${p.split("/").pop()}:${text.includes(secret)?"contains-secret":"no-secret"}`); } console.log(out.join("\n"));' \
  x \
  "$RAW_DIR/08-recall-no-tools.json" \
  "$RAW_DIR/09-retrieve-and-answer.json" \
  "$RAW_DIR/10-post-retrieve-answer.json" \
  > "$RUN_DIR/secret-presence.txt"

grep -q "08-recall-no-tools.json:no-secret" "$RUN_DIR/secret-presence.txt"
grep -q "09-retrieve-and-answer.json:contains-secret" "$RUN_DIR/secret-presence.txt"
grep -q "10-post-retrieve-answer.json:contains-secret" "$RUN_DIR/secret-presence.txt"

printf "RUN_DIR=%s\nSESSION_ID=%s\nSESSION_FILE=%s\n" "$RUN_DIR" "$SESSION_ID" "$SESSION_FILE" > "$RUN_DIR/redacted-run-metadata.txt"
cat "$RUN_DIR/redacted-run-metadata.txt"
