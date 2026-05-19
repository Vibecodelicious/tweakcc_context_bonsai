# Semantic Anchor Analysis: Claude Code 2.1.143 Linux x64

## Pinned Artifact Identity

- Claude Code version: native `2.1.143` Linux x64.
- Extraction tool/version: `tweakcc` `4.0.13` `readContent` on `/home/basil/.local/share/claude/versions/2.1.143`.
- Reproduction command or harness entry point: `bun --eval import readContent from tweakcc for /home/basil/.local/share/claude/versions/2.1.143`, then `bun run e2e/native-e2e.ts artifact-evidence`.
- Extracted bundle checksum: sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, `14548665` bytes.
- Timestamp: `2026-05-19T02:39:45.963Z`.
- Operator: `basil`.
- Credential boundary: only the native executable bundle was read; credentials, auth files, `~/.claude` config contents, session transcripts, and the full extracted bundle are not committed.

## Current Story 8 Evidence Reclassification

The existing Story 8 `Pinned-target artifact evidence` PASS is reclassified as mechanical locator evidence only. It proves candidate selection and sentinel insertion against the pinned artifact, but it is not release-gate acceptance evidence and must not be treated as Story 8 final PASS.

## Evidence Tier Boundary

Story 8A requires pinned extracted-bundle semantic analysis plus artifact harness proof. JSONL checks, sentinels, candidate counts, scores, snippets, and synthetic fixtures are supporting evidence only; live provider/model proof remains Story 8 and is BLOCKED until fresh-sprite Claude Code login and Protocol A run.

## archived-filter.visibility

Anchor ID: `archived-filter.visibility`

Patch or helper: `archived-filter` patch, provider-bound message-array filter inserted before Claude Code maps transcript messages into Anthropic API message objects.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: offset `12383370`, length `158`, score `95`, candidate count `1`: `let D=H.map((X,L)=>{let P=M.has(L);if(X.type==="user")return Bp5(X,P,$,q);if(X.type==="api_system")return{role:"system",content:X.message.content};return pp5(`.

Host behavior controlled: This is inside `ap5`, the function that turns Claude Code transcript entries into provider request messages. Its output is passed through `sp5`/request construction and then to `O.beta.messages.create({...J,model:XL(J.model)})`, so filtering `H` immediately before this map omits archived messages from provider-bound context.

Required seam rationale: Context Bonsai must remove archived follower messages from the next model invocation. Filtering by `uuid` before `Bp5` and `pp5` construct API `role/content` objects is the narrow provider-bound seam that changes what the model receives, while preserving local transcript storage and UI rendering behavior.

Plausible wrong candidates rejected: The previous `Wj4` switch at offset `11170978` is a transcript UI visibility predicate with `if(_==="transcript")return!0`, `resolvedToolUseIDs`, `grouped_tool_use`, and `collapsed_read_search`; it controls display selection, not provider API payload construction. Other `switch(type)` candidates render attachments or UI/system entries and do not feed `beta.messages.create`.

Ambiguous/no-match fail-closed evidence: The selector now matches only provider maps containing both `Bp5` and `pp5`; the pinned bundle has one candidate. UI visibility fixtures and absent-anchor inputs throw `AnchorNotFoundError`/`BonsaiPatchError` instead of falling back to a broad `switch(type)` match.

Runtime or model-facing evidence: In the patched pinned bundle, the injected code runs before `let D=H.map(...)`, reads `archived-<session>.json`, and reassigns `H=H.filter(...)` to remove UUIDs in the marker set. Focused tests execute this injected provider-map filter and show archived UUIDs are omitted while active messages still map to provider `role/content`; live provider proof remains Story 8 BLOCKED.

Reviewer checklist: Confirm the anchor is the `ap5` provider message map, confirm `Wj4` UI visibility is rejected, confirm fail-closed behavior remains, and confirm artifact evidence links this report before claiming release readiness.

## message-content-ids.converter

Anchor ID: `message-content-ids.converter`

Patch or helper: `message-content-ids` patch, user-message provider converter wrapper.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: offset `12350099`, length `96`, score `90`, candidate count `24`: `function Bp5(H,$=!1,q,K){if($)if(typeof H.message.content==="string")return{role:"user",content:`.

Host behavior controlled: `Bp5` constructs provider-bound user message objects, including string-to-text-block conversion and cache-control TTL handling. `ap5` calls `Bp5` for every `X.type==="user"` before the request body reaches `beta.messages.create`.

Required seam rationale: `[msg:<uuid>]` tags must appear in model-visible user content only when compaction mode is active. Wrapping the `content:` expression in `Bp5` changes the exact user content sent to the model and leaves non-provider transcript normalization untouched.

Plausible wrong candidates rejected: The nearby `pp5` assistant converter is provider-bound but wrong because tags are intended for user-visible reference points, not assistant output. The `pK4`/`XD8`/`UK4` block at offset `9949428` merges or reorders local user content before API conversion and does not apply cache-control or directly construct provider request roles.

Ambiguous/no-match fail-closed evidence: The pinned artifact originally tied too closely with the `pK4` normalization candidate; the selector now uses provider-formatting context (`cache_control`/`ttl`) while preserving `minMargin`. If the provider converter and a wrong normalizer cannot be separated, selection throws `AnchorAmbiguousError`.

Runtime or model-facing evidence: The patched converter calls `__cbMessageContentIdsTag(originalContent,H)`, which reads `compaction-mode-<session>` and appends `[msg:<uuid>]` to strings or text blocks only when that marker exists. Artifact evidence verifies the sentinel and selected offset on the real bundle; live provider confirmation remains Story 8 BLOCKED.

Reviewer checklist: Confirm the selected function is `Bp5`, confirm `pp5` and `pK4` are rejected with behavior reasons, confirm compaction-mode gating is present, and confirm no synthetic fixture is used as anchor proof.

## context-bonsai-gauge.token-usage

Anchor ID: `context-bonsai-gauge.token-usage`

Patch or helper: `context-bonsai-gauge` patch, token usage helper insertion before Claude Code usage aggregation.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: offset `5232907`, length `178`, score `47`, candidate count `9`: `function TY_(H,$,q){let K=tV8(q)??{inputTokens:0,outputTokens:0,cacheReadInputTokens:0,cacheCreationInputTokens:0,webSearchRequests:0,costUSD:0,contextWindow:0,maxOutputTokens:0}`.

Host behavior controlled: `TY_` accumulates Anthropic usage fields, cache token fields, cost, `contextWindow=EP(q,Lj())`, and `maxOutputTokens=UYH(q).default`; downstream telemetry consumes this as the model budget/usage record.

Required seam rationale: The gauge needs real Claude Code token usage and usable context limit. Inserting helpers before `TY_` lets the patch call the same host helper and compute percentage from live usage fields rather than estimating from transcript text.

Plausible wrong candidates rejected: Cost-summary helpers such as `JK7`/`$MH` format human-readable totals and cache-hit percentages after the fact, not model-context gauge state. Count-token API helpers around `$$4` call provider token counting for separate flows and do not carry the current request's accumulated usage record.

Ambiguous/no-match fail-closed evidence: The selector requires both model-limit/context-window and token-usage fields. Candidate count is supporting only; if a future bundle has no unique helper above margin, `selectUnique` throws and the gauge patch does not apply.

Runtime or model-facing evidence: The injected `__cbContextBonsaiTokenUsage` calls `TY_` and derives `{used,limit,percent}` from host usage fields. Artifact evidence verifies the helper lands before the pinned helper; model-visible reminder delivery is checked through the attachment/reminder seams below, with live provider proof still Story 8 BLOCKED.

Reviewer checklist: Confirm `TY_` owns usage accumulation, confirm cost-display/count-token alternatives are rejected, confirm thresholds are not weakened, and confirm gauge output depends on finite host usage/limit values.

## context-bonsai-gauge.attachment-pipeline

Anchor ID: `context-bonsai-gauge.attachment-pipeline`

Patch or helper: `context-bonsai-gauge` patch, attachment registration into Claude Code's message attachment aggregation pipeline.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: offset `9748034`, length `235`, score `50`, candidate count `10`: `function e84(H,$){let q=[],K=n84(),_=[];function A(){if(K.messages.length===0)return;q.push(TA5(K));let z=new Set;for(let Y of _){if(Y.type==="attachment"&&Y.attachment.type==="hook_permission_decision")`.

Host behavior controlled: `e84` accumulates attachment-like entries from message/tool-use state into `q`, deduplicates hook permission attachments, and returns attachment groups consumed by the renderer.

Required seam rationale: Gauge reminders need to become a normal attachment so Claude Code's existing reminder rendering path can carry them into model-visible system-reminder text. Inserting at the start of the attachment pipeline lets bonsai add one `context-bonsai-gauge` attachment based on the same message list.

Plausible wrong candidates rejected: Hook permission decision attachment code is nearby but only deduplicates hook events. Read/search/list collapsed-result builders summarize tool use and do not create general reminder attachments. UI-only status/cost renderers are human-visible and do not satisfy the model-visible gauge requirement.

Ambiguous/no-match fail-closed evidence: The selector requires `.push`, reminder/attachment vocabulary, and native counters such as `hook_permission_decision`, `mcpCallCount`, or `latestDisplayHint`. If those signals split across tied candidates, the patch fails closed through `AnchorAmbiguousError`.

Runtime or model-facing evidence: The patch injects `const __cbGauge=__cbContextBonsaiGaugeAttachment(messages); if(__cbGauge) attachments.push(__cbGauge);`. Artifact evidence verifies it composes with the pinned bundle and sentinel checks; live provider/model confirmation remains Story 8 BLOCKED.

Reviewer checklist: Confirm `e84` is an attachment aggregation function, confirm hook/read/search alternatives are rejected, confirm injected attachment type is `context-bonsai-gauge`, and confirm no human-only status path is treated as sufficient.

## context-bonsai-gauge.reminder-render

Anchor ID: `context-bonsai-gauge.reminder-render`

Patch or helper: `context-bonsai-gauge` patch, reminder attachment renderer case.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: offset `9972435`, length `1363`, score `40`, candidate count `1`: `switch(H.type){case"file":{let q=H.content;switch(q.type){case"image":return i_([TW$(ez.name,{file_path:H.filename}),GW$(ez,q)]);case"text":return i_([TW$(ez.name,{file_path:H.filename}),GW$(ez,q),...H.truncated?...`.

Host behavior controlled: This renderer converts attachment objects, including `todo_reminder`, `team_context`, files, and invoked skills, into message blocks such as `D8({content:...,isMeta:!0})` and `<system-reminder>` text.

Required seam rationale: The gauge attachment added above must be rendered into text the model can see. Adding a `case "context-bonsai-gauge": return H.text` to this switch uses the same reminder-rendering path as Claude Code's model-visible todo/team reminders.

Plausible wrong candidates rejected: File-content rendering cases are in the same switch but only translate file attachments. Todo text construction is nearby but hard-codes TodoWrite wording; patching there would not render a new attachment type. UI-only display components do not emit model-visible reminder content.

Ambiguous/no-match fail-closed evidence: The pinned artifact has one reminder-render switch matching file plus `todo_reminder` behavior. A missing or multiple matching renderer would fail through `selectUnique`; no default catch-all case is patched.

Runtime or model-facing evidence: The patched switch renders `context-bonsai-gauge` attachments as text, so gauge/reminder text generated by `__cbContextBonsaiGaugeAttachment` enters the same model-visible reminder stream. Artifact evidence verifies the selected pinned offset and sentinel; live model observation remains Story 8 BLOCKED.

Reviewer checklist: Confirm this is the attachment-to-reminder renderer, confirm todo/file cases are not confused with the new type seam, confirm the rendered text is model-visible, and confirm live proof is not claimed here.

## runtime-helper.fs

Anchor ID: `runtime-helper.fs`

Patch or helper: Runtime helper discovery for the minified fs getter used by archive and compaction marker reads.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: helper `R$`, definition near offset `183846`: `function R$(){return a59}` after the module initializes `a59` as the fs implementation; selected by repeated `R$().existsSync/readFileSync/writeFileSync` call sites.

Host behavior controlled: Provides the fs module object needed to check marker existence, read JSON marker files, stat mtime, and avoid direct dependency on bundle-local minified module variables.

Required seam rationale: The injected patches execute inside the Claude Code bundle and must use the bundle's own fs getter shape. Calling the selected getter preserves host runtime module resolution in the native Bun-packed executable.

Plausible wrong candidates rejected: Direct variables such as `F8H`, `LM$`, or `NJ6` are fs/fs-promises imports in other modules, but they are not the repeatedly used zero-argument getter shape consumed by marker-file code. Path helpers such as `J0` join paths but do not expose file IO.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` counts fs-like zero-argument getter call sites and requires a unique top count. No candidate or tied candidates throw `RuntimeHelpersError` rather than substituting another module variable.

Runtime or model-facing evidence: Artifact discovery returns `fsFunc: "R$"`; patched archive and message-id helpers use `R$().statSync`, `R$().readFileSync`, and `R$().existsSync` to read bonsai marker files. This is runtime support evidence, not live provider proof.

Reviewer checklist: Confirm `R$` is a fs getter, confirm fs-promises/path variables are rejected, confirm ambiguity throws, and confirm no credentials or session transcripts are read by artifact evidence.

## runtime-helper.config-dir

Anchor ID: `runtime-helper.config-dir`

Patch or helper: Runtime helper discovery for Claude Code's config directory getter.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: helper `x8`, definition near offset `59778`: `x8=L8(()=>{return(process.env.CLAUDE_CONFIG_DIR??Vk8.join(at6.homedir(),".claude")).normalize("NFC")},()=>process.env.CLAUDE_CONFIG_DIR)`.

Host behavior controlled: Resolves the same Claude config directory the host uses for projects, teams, todos, and related local state, honoring `CLAUDE_CONFIG_DIR` when set.

Required seam rationale: Bonsai marker files live beside Claude Code config/session state as `archived-<session>.json` and `compaction-mode-<session>`. Using `x8()` keeps marker lookup aligned with the host's configured directory.

Plausible wrong candidates rejected: `Vk8` is the path module, not a config directory. `GIH()` appends `teams` to `x8()` and is too specific. Hard-coded `homedir()+".claude"` would ignore `CLAUDE_CONFIG_DIR` and break configured installs.

Ambiguous/no-match fail-closed evidence: Discovery requires unique path-join call sites where a zero-argument getter feeds `history.jsonl`, `projects`, or `todos`. Ties or absence throw `RuntimeHelpersError`.

Runtime or model-facing evidence: Artifact discovery returns `configDirFunc: "x8"`; injected marker paths call `String(x8()).replace(/\/+$/,'')+"/archived-"+sessionId+".json"` and `"/compaction-mode-"+sessionId`. This supports runtime marker alignment; live scenario proof remains Story 8.

Reviewer checklist: Confirm `x8` honors `CLAUDE_CONFIG_DIR`, confirm derived subdirectory helpers are rejected, confirm fail-closed behavior, and confirm marker path construction is credential-safe.

## runtime-helper.session-id

Anchor ID: `runtime-helper.session-id`

Patch or helper: Runtime helper discovery for the current session-id getter.

Pinned artifact identity: Claude Code native `2.1.143` Linux x64, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`, extracted with tweakcc `4.0.13` by `basil` at `2026-05-19T02:39:45.963Z`.

Selected offset and snippet: helper `v$`, definition near offset `39280`: `function v$(){return Wv()?.sessionId??F$.sessionId}`.

Host behavior controlled: Returns the active Claude Code session id from current session state, falling back to global session state.

Required seam rationale: Bonsai marker files are session-scoped. The patches need the same session id used by Claude Code metadata and JSONL/session paths to read `archived-<session>.json` and `compaction-mode-<session>` for the active model invocation.

Plausible wrong candidates rejected: `vV8()` creates a new random session id and would corrupt marker lookup. `kV8()` returns parent session id, `hp()` returns project dir, and `$6()` returns original cwd; none identify the active session marker suffix.

Ambiguous/no-match fail-closed evidence: Discovery accepts direct `return state.sessionId` and optional-current-session shapes, then requires a unique top candidate. Missing or tied session helpers throw `RuntimeHelpersError`.

Runtime or model-facing evidence: Artifact discovery returns `sessionIdFunc: "v$"`; archive and message-id injections call `v$()` before reading marker files. This ties marker gating to the active session; live fresh-sprite model proof remains Story 8 BLOCKED.

Reviewer checklist: Confirm `v$` reads active session state, confirm new/parent/cwd helpers are rejected, confirm ambiguity throws, and confirm Story 8 remains BLOCKED until Protocol A runs.
