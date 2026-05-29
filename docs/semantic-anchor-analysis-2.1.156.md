# Semantic Anchor Analysis: Claude Code 2.1.156 Linux x64

## Pinned Artifact Identity

- Claude Code version: native `2.1.156` Linux x64 (`claude --version` reports `2.1.156 (Claude Code)`).
- Package identity: `@anthropic-ai/claude-code@2.1.156`; npm tarball `https://registry.npmjs.org/@anthropic-ai/claude-code/-/claude-code-2.1.156.tgz`; npm integrity `sha512-DRIqsawy+n+LtNBaxOW+3JYLaehbCdEdc+mZjYv/zRnZ1bHeTetJBcV41TagNjL00hHjrlALdl76wmA4s/PVQQ==`; npm shasum `32f21eb881e84f421195873842c68c367093d43e`.
- Native install path: `/home/basil/.local/share/claude/versions/2.1.156` (install file sha256 `6d83cd2264450c5e54fc988be1032c288cf418ee604294acfb8fc4ac28f5f7a3`).
- Extraction tool/version: `tweakcc` `4.0.13` `readContent` (via `apply/tweakcc-api.ts`) on the native install, under `bun 1.3.14`.
- Reproduction command or harness entry point: `bun --eval "import { tweakccApi } from './apply/tweakcc-api'; const c = await tweakccApi.readContent({ path: '/home/basil/.local/share/claude/versions/2.1.156', kind: 'native', version: '2.1.156' }); await Bun.write('/tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/extracted.js', c);"`, then `bun run e2e/native-e2e.ts artifact-evidence --bundle /tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/extracted.js --manifest /tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/manifest.json`.
- Extracted bundle path: `/tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/extracted.js` (out-of-repo per the Evidence Retention Policy).
- Extracted bundle checksum: sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, `15525699` bytes.
- Manifest path: `/tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/manifest.json`.
- Operator: `basil`.
- Credential boundary: only the native executable bundle was read; credentials, auth files, `~/.claude` config contents, session transcripts, and the full extracted bundle are not committed.

## Forward-Port Note (2.1.143 -> 2.1.156)

The minified converter identifiers that the 2.1.143 anchors hard-coded did NOT survive into 2.1.156. The provider message map's user/assistant converters renamed `Bp5`/`pp5` (2.1.143) -> `hLz`/`SLz` (2.1.156), the usage accumulator `TY_` -> `Wu5`, the attachment pipeline `e84` -> `bW4`, and the runtime helpers `R$`/`x8`/`v$` -> `U$`/`l8`/`E$`. The host expression that returns the provider map also changed shape: 2.1.143 bound it to a local (`let D=H.map(...)`) while 2.1.156 returns it as the second arm of a comma-sequence directly after the `tengu_api_cache_breakpoints` cache-breakpoint telemetry call (`return d("tengu_api_cache_breakpoints",{...}),H.map(...)`). The selectors were re-derived to match behavior structurally (cache-breakpoint telemetry context, the user/`api_system`/else converter branches, two distinct provider converters, and the 4-arg `(H,$=!1,q,K)` converter signature) instead of bundle-specific names, so the same seam is located in both releases. No `minScore`/`minMargin` threshold was lowered.

## Evidence Reclassification

This report plus the artifact-evidence harness output are mechanical locator evidence only: they prove candidate selection, fail-closed behavior, and sentinel insertion against the pinned 2.1.156 bundle. They are necessary but not release-gate acceptance evidence on their own; release-gate PASS additionally requires the live Claude Code E2E protocol (Protocol A secret oracle, E2E-08 prune effect, retrieve visibility) recorded in `docs/e2e-results-2026-05-29-2.1.156.md`. A sentinel-appears-once check is necessary but not sufficient because it proves insertion at the selected location rather than semantic correctness of the selected anchor.

## archived-filter.visibility

Anchor ID: `archived-filter.visibility`

Patch or helper: `archived-filter` patch — provider-bound message-array filter injected before Claude Code maps transcript entries into Anthropic API message objects.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil` from `/home/basil/.local/share/claude/versions/2.1.156`.

Selected offset and snippet: offset `13142215`, length `292`, score `105`, candidate count `1`: `return d("tengu_api_cache_breakpoints",{totalMessageCount:H.length,cachingEnabled:$,skipCacheWrite:K,forkPointPinned:f,markerCount:Y.size}),H.map((M,j)=>{let w=Y.has(j);if(M.type==="user")return hLz(M,w,$,q);if(M.type==="api_system")return{role:"system",content:M.message.content};return SLz(M,w,$,q)})`.

Host behavior controlled: This is the tail of the function `FLz(H,$,q,K,_)`, the function that turns Claude Code transcript entries (`H`) into Anthropic provider request messages. It first computes the cache-breakpoint index set `Y` and logs `tengu_api_cache_breakpoints`, then returns `H.map(...)` which routes `user` entries through the user converter `hLz`, `api_system` entries to `{role:"system",...}`, and all others through the assistant converter `SLz`. The returned array is the provider-bound message list, so reassigning `H` (the input) just before this `return` omits archived messages from the model invocation while leaving local transcript storage and UI rendering untouched.

Required seam rationale: Context Bonsai must remove archived follower messages from the next model invocation. Filtering `H` by archived `uuid` immediately before the `H.map(...)` that constructs API `role/content` objects is the narrow provider-bound seam that changes what the model receives. Injecting before the `return d("tengu_api_cache_breakpoints",...),H.map(...)` statement guarantees the filter runs before any element is converted, and because the cache-breakpoint set `Y` is computed by index, filtering the input before the map keeps caching coherent with the reduced set.

Plausible wrong candidates rejected: UI transcript visibility predicates (the `switch(type)` display selectors carrying `if(...==="transcript")return!0`, `resolvedToolUseIDs`, `grouped_tool_use`, `collapsed_read_search`) control display selection, not provider API payload construction, and are penalised `-50` by the scorer and not matched by the structural pattern. The adjacent `QLz(H,$,q){return oKq(H,{skipGlobalCacheForSystemPrompt:...}).map(...)` immediately after the anchor is a system-prompt cache-shaping map, not the user/assistant/api_system transcript converter, and lacks the `if(type==="user")return <conv>(...)` / `api_system` branch structure. Other `.map` sites that build telemetry or tool-result summaries lack the `tengu_api_cache_breakpoints` context and the two-distinct-converter branch shape.

Ambiguous/no-match fail-closed evidence: The structural selector requires the cache-breakpoint telemetry call, the `user`/`api_system`/else converter branches, and two DISTINCT converter identifiers; the pinned bundle yields exactly one candidate at score `105` (minScore `30`, minMargin `10`, both unchanged). UI visibility fixtures and absent-anchor inputs throw `AnchorNotFoundError`/`BonsaiPatchError` rather than falling back to a broad `switch(type)` match (see `patches/anchors.test.ts` and `patches/archived-filter.patch.test.ts`).

Runtime or model-facing evidence: Composing the patch registry against the real 2.1.156 bundle injects `/*cb:archived-filter:v1*/{...}` immediately before the `return d("tengu_api_cache_breakpoints",...),H.map(...)` statement; the block reads `archived-<session>.json` via `E$()`/`U$()`/`l8()` and reassigns `H=H.filter(...)` to drop UUIDs in the marker set, then `verifyPatchSentinels` confirms exactly one sentinel. A behavioral unit test (`the injected 2.1.156 filter actually removes archived UUIDs when executed`) executes the patched `providerMap` and asserts archived UUIDs are omitted while active messages still map to provider `role/content`. Live provider-payload proof is recorded in `docs/e2e-results-2026-05-29-2.1.156.md`.

Reviewer checklist: Confirm the anchor is the `FLz` provider message map (cache-breakpoint telemetry + user/`api_system`/`SLz` branches), confirm UI visibility predicates and the `QLz` system-prompt map are rejected, confirm the filter is injected before the `return` so `H` is filtered before `H.map`, confirm fail-closed behavior remains, and confirm artifact evidence links this report before claiming release readiness.

## message-content-ids.converter

Anchor ID: `message-content-ids.converter`

Patch or helper: `message-content-ids` patch — user-message provider converter wrapper.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `13107940`, length `96`, score `110`, candidate count `25`: `function hLz(H,$=!1,q,K){if($)if(typeof H.message.content==="string")return{role:"user",content:`.

Host behavior controlled: `hLz` constructs provider-bound user message objects, including string-to-text-block conversion and `cache_control`/`ttl` handling (`...q&&{cache_control:lo({ttl:K})}`). `FLz` calls `hLz` for every `M.type==="user"` entry before the request body reaches the Anthropic API.

Required seam rationale: `[msg:<uuid>]` tags must appear in model-visible user content only when compaction mode is active. Wrapping the `content:` expression inside `hLz` changes the exact user content sent to the model and leaves non-provider transcript normalization untouched.

Plausible wrong candidates rejected: The content-sanitizer helper `I69(H)` (offset `13108351`, score `80`) iterates content blocks dropping empty text entries and is called by `hLz` itself; the greedy converter regex spills its match across the function boundary into the following `SLz` `return{role:"assistant",...}`, which is why it scores second. It is rejected because it is single-argument (`function I69(H)`) and never carries the converter's 4-arg cache-breakpoint-flag signature `(H,$=!1,q,K)`; the new signature scorer awards `hLz` `+20` and `I69` `0`, separating them by margin `30` > minMargin `10`. The assistant converter `SLz` is provider-bound but wrong because tags are intended for user-visible reference points, not assistant output. UI/normalization helpers that merge or reorder local user content do not apply `cache_control` or directly construct provider request roles.

Ambiguous/no-match fail-closed evidence: Before the signature scorer, `hLz` (90) and the spilled `I69` match (80) sat exactly at minMargin (`90-80=10`), so `selectUnique` threw `AnchorAmbiguousError` — fail-closed, not a silent mispatch. The fix strengthens the scorer (it does not lower minScore `35` or minMargin `10`); if a future bundle cannot separate the provider converter from a wrong normalizer above margin, selection still throws `AnchorAmbiguousError`.

Runtime or model-facing evidence: The patched converter calls `__cbMessageContentIdsTag(originalContent,H)`, which reads `compaction-mode-<session>` via `l8()`/`U$()`/`E$()` and appends `[msg:<uuid>]` to strings or text blocks only when that marker exists. Composing the registry against the real 2.1.156 bundle verifies the sentinel and selected offset; live provider confirmation is recorded in the 2.1.156 E2E results doc.

Reviewer checklist: Confirm the selected function is the user converter `hLz` (4-arg `(H,$=!1,q,K)`, builds `{role:"user",content:...}` with `cache_control`), confirm the sanitizer `I69` and assistant converter `SLz` are rejected with behavior reasons, confirm compaction-mode gating is present, confirm minMargin/minScore are unchanged, and confirm no synthetic fixture is used as anchor proof.

## context-bonsai-gauge.token-usage

Anchor ID: `context-bonsai-gauge.token-usage`

Patch or helper: `context-bonsai-gauge` patch — token usage helper insertion before Claude Code usage aggregation.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `5334019`, length `178`, score `47`, candidate count `9`: `function Wu5(H,$,q){let K=Ru8(q)??{inputTokens:0,outputTokens:0,cacheReadInputTokens:0,cacheCreationInputTokens:0,webSearchRequests:0,costUSD:0,contextWindow:0,maxOutputTokens:0}`.

Host behavior controlled: `Wu5` accumulates Anthropic usage fields (`inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`), cost, `contextWindow`, and `maxOutputTokens`; downstream telemetry consumes this as the model budget/usage record.

Required seam rationale: The gauge needs real Claude Code token usage and usable context limit. Inserting helpers before `Wu5` lets the patch call the same host helper and compute percentage from live usage fields rather than estimating from transcript text.

Plausible wrong candidates rejected: Cost-summary helpers that format human-readable totals and cache-hit percentages do so after the fact and are penalised by the `percent`/`Math.round` negative signal; they are not the model-context gauge state. Count-token API helpers call provider token counting for separate flows and do not carry the current request's accumulated usage record (they lack the `contextWindow`/`maxOutputTokens` budget fields).

Ambiguous/no-match fail-closed evidence: The selector requires both a model-limit/context-window field and token-usage fields. Candidate count (`9`) is supporting only; selection uses minScore `15`/minMargin `10` (unchanged), and `Wu5` wins above margin. If a future bundle has no unique helper above margin, `selectUnique` throws and the gauge patch does not apply.

Runtime or model-facing evidence: The injected `__cbContextBonsaiTokenUsage` calls `Wu5` and derives `{used,limit,percent}` from host usage fields. Composing against the real 2.1.156 bundle verifies the helper lands before the pinned helper; model-visible reminder delivery is checked through the attachment/reminder seams below, with the live run recorded in the 2.1.156 E2E results doc.

Reviewer checklist: Confirm `Wu5` owns usage accumulation (budget + usage fields), confirm cost-display/count-token alternatives are rejected, confirm thresholds are not weakened, and confirm gauge output depends on finite host usage/limit values.

## context-bonsai-gauge.attachment-pipeline

Anchor ID: `context-bonsai-gauge.attachment-pipeline`

Patch or helper: `context-bonsai-gauge` patch — attachment registration into Claude Code's message attachment aggregation pipeline.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `10219962`, length `237`, score `50`, candidate count `13`: `function bW4(H,$){let q=[],K=yW4(),_=[],z;function A(){if(K.messages.length===0)return;q.push(Op_(K));let Y=new Set;for(let f of _){if(f.type==="attachment"&&f.attachment.type==="hook_permission_decision")`.

Host behavior controlled: `bW4` accumulates attachment-like entries from message/tool-use state into `q`, deduplicates `hook_permission_decision` attachments, and returns attachment groups consumed by the renderer.

Required seam rationale: Gauge reminders need to become a normal attachment so Claude Code's existing reminder rendering path can carry them into model-visible system-reminder text. Inserting at the start of the attachment pipeline lets bonsai add one `context-bonsai-gauge` attachment based on the same message list.

Plausible wrong candidates rejected: Hook-permission-decision attachment code is nearby but only deduplicates hook events. Read/search/list collapsed-result builders summarize tool use and do not create general reminder attachments. UI-only status/cost renderers are human-visible and do not satisfy the model-visible gauge requirement; they lack the `.push` + reminder/attachment vocabulary + native-counter signals the scorer requires.

Ambiguous/no-match fail-closed evidence: The selector requires `.push`, reminder/attachment vocabulary, and native counters such as `hook_permission_decision`/`mcpCallCount`/`latestDisplayHint`; the pinned bundle selects `bW4` uniquely above minScore `15`/minMargin `10` (unchanged). If those signals split across tied candidates, the patch fails closed through `AnchorAmbiguousError`.

Runtime or model-facing evidence: The patch injects `const __cbGauge=__cbContextBonsaiGaugeAttachment(messages); if(__cbGauge) attachments.push(__cbGauge);` at the pipeline body start. Composing against the real 2.1.156 bundle verifies it composes and the sentinel appears once; live model confirmation is recorded in the 2.1.156 E2E results doc.

Reviewer checklist: Confirm `bW4` is an attachment aggregation function (`hook_permission_decision` dedup, `.push` into the group list), confirm hook/read/search alternatives are rejected, confirm injected attachment type is `context-bonsai-gauge`, and confirm no human-only status path is treated as sufficient.

## context-bonsai-gauge.reminder-render

Anchor ID: `context-bonsai-gauge.reminder-render`

Patch or helper: `context-bonsai-gauge` patch — reminder attachment renderer case.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `10462982`, length `1363`, score `40`, candidate count `1`: `switch(H.type){case"file":{let q=H.content;switch(q.type){case"image":return C_([jk$(eY.name,{file_path:H.filename}),Mk$(eY,q)]);case"text":...`.

Host behavior controlled: This renderer converts attachment objects — including `todo_reminder`, files, and similar — into message blocks and `<system-reminder>` text.

Required seam rationale: The gauge attachment added above must be rendered into text the model can see. Adding a `case "context-bonsai-gauge": return H.text` to this switch uses the same reminder-rendering path as Claude Code's model-visible todo reminders.

Plausible wrong candidates rejected: File-content rendering cases are in the same switch but only translate file attachments. Todo text construction is nearby but hard-codes TodoWrite wording; patching there would not render a new attachment type. UI-only display components do not emit model-visible reminder content.

Ambiguous/no-match fail-closed evidence: The pinned artifact has one reminder-render switch matching file plus `todo_reminder` behavior (candidate count `1`, score `40` >= minScore `15`). A missing or multiple matching renderer would fail through `selectUnique`; no default catch-all case is patched.

Runtime or model-facing evidence: The patched switch renders `context-bonsai-gauge` attachments as text, so gauge/reminder text generated by `__cbContextBonsaiGaugeAttachment` enters the same model-visible reminder stream. Composing against the real 2.1.156 bundle verifies the selected offset and sentinel; live model observation is recorded in the 2.1.156 E2E results doc.

Reviewer checklist: Confirm this is the attachment-to-reminder renderer, confirm todo/file cases are not confused with the new type seam, confirm the rendered text is model-visible, and confirm live proof is not claimed here.

## runtime-helper.fs

Anchor ID: `runtime-helper.fs`

Patch or helper: Runtime helper discovery for the minified fs getter used by archive and compaction marker reads.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: helper `U$`, definition `function U$(){return XI9}` after the module initializes `XI9` as the fs implementation; selected by repeated `U$().existsSync/readFileSync/writeFileSync` call sites.

Host behavior controlled: Provides the fs module object needed to check marker existence, read JSON marker files, and avoid direct dependency on bundle-local minified module variables.

Required seam rationale: The injected patches execute inside the Claude Code bundle and must use the bundle's own fs getter shape. Calling the selected getter preserves host runtime module resolution in the native Bun-packed executable.

Plausible wrong candidates rejected: Direct fs/fs-promises import variables in other modules are not the repeatedly used zero-argument getter shape consumed by marker-file code. Path-join helpers (`join`/`l8`-joins) compose paths but do not expose file IO.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` counts fs-like zero-argument getter call sites and requires a unique top count. No candidate or tied candidates throw `RuntimeHelpersError` rather than substituting another module variable.

Runtime or model-facing evidence: Artifact discovery returns `fsFunc: "U$"`; the patched archive and message-id helpers call `U$().readFileSync` and `U$().existsSync` to read bonsai marker files. This is runtime support evidence, not live provider proof.

Reviewer checklist: Confirm `U$` is a fs getter (`function U$(){return XI9}`), confirm fs-promises/path variables are rejected, confirm ambiguity throws, and confirm no credentials or session transcripts are read by artifact evidence.

## runtime-helper.config-dir

Anchor ID: `runtime-helper.config-dir`

Patch or helper: Runtime helper discovery for Claude Code's config directory getter.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: helper `l8`, definition `l8=v8(()=>{return(process.env.CLAUDE_CONFIG_DIR??HB8.join(Afq.homedir(),".claude")).normalize("NFC")},()=>process.env.CLAUDE_CONFIG_DIR)`; selected by its `join(l8(),"history.jsonl"|"projects"|"todos")` call sites (6 such joins).

Host behavior controlled: Resolves the same Claude config directory the host uses for projects, todos, and related local state, honoring `CLAUDE_CONFIG_DIR` when set.

Required seam rationale: Bonsai marker files live beside Claude Code config/session state as `archived-<session>.json` and `compaction-mode-<session>`. Using `l8()` keeps marker lookup aligned with the host's configured directory.

Plausible wrong candidates rejected: The path module (`HB8`) is not a config directory. Derived subdirectory getters that append `teams`/`projects` to `l8()` are too specific. A hard-coded `homedir()+".claude"` would ignore `CLAUDE_CONFIG_DIR` and break configured installs.

Ambiguous/no-match fail-closed evidence: Discovery requires unique path-join call sites where a zero-argument getter feeds `history.jsonl`, `projects`, or `todos`. Ties or absence throw `RuntimeHelpersError`.

Runtime or model-facing evidence: Artifact discovery returns `configDirFunc: "l8"`; injected marker paths call `String(l8()).replace(/\/+$/,'')+"/archived-"+sessionId+".json"` and `"/compaction-mode-"+sessionId`. This supports runtime marker alignment; live scenario proof is recorded in the 2.1.156 E2E results doc.

Reviewer checklist: Confirm `l8` honors `CLAUDE_CONFIG_DIR`, confirm derived subdirectory helpers and the path module are rejected, confirm fail-closed behavior, and confirm marker path construction is credential-safe.

## runtime-helper.session-id

Anchor ID: `runtime-helper.session-id`

Patch or helper: Runtime helper discovery for the current session-id getter.

Pinned artifact identity: Claude Code native `2.1.156` Linux x64, extracted bundle sha256 `644a98ceac60fd0e979a268fdd0e090ed8aa197f53eb9b80e11c3629c3c9da9b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: helper `E$`, definition `function E$(){return nk()?.sessionId??d$.sessionId}`.

Host behavior controlled: Returns the active Claude Code session id from current session state (`nk()?.sessionId`), falling back to global session state (`d$.sessionId`).

Required seam rationale: Bonsai marker files are session-scoped. The patches need the same session id used by Claude Code metadata and JSONL/session paths to read `archived-<session>.json` and `compaction-mode-<session>` for the active model invocation.

Plausible wrong candidates rejected: Helpers that create a new random session id would corrupt marker lookup. Parent-session-id, project-dir, and original-cwd getters do not identify the active session marker suffix. The discovery `optionalSessionCounts` pattern matches the exact `return CUR()?.sessionId??GLOBAL.sessionId` shape so only the active-session getter qualifies.

Ambiguous/no-match fail-closed evidence: Discovery accepts direct `return state.sessionId`, optional-current-session, and arrow shapes, then requires a unique top candidate. Missing or tied session helpers throw `RuntimeHelpersError`.

Runtime or model-facing evidence: Artifact discovery returns `sessionIdFunc: "E$"`; archive and message-id injections call `E$()` before reading marker files. This ties marker gating to the active session; live model proof is recorded in the 2.1.156 E2E results doc.

Reviewer checklist: Confirm `E$` reads active session state (`nk()?.sessionId??d$.sessionId`), confirm new/parent/cwd helpers are rejected, confirm ambiguity throws, and confirm live E2E remains the release gate.
