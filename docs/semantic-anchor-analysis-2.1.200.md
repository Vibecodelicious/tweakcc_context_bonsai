# Semantic Anchor Analysis: Claude Code 2.1.200 Linux x64

## Pinned Artifact Identity

- Claude Code version: native `2.1.200` Linux x64 (`"$TARGET_NATIVE_BINARY" --version` reports `2.1.200 (Claude Code)`).
- Package identity: `@anthropic-ai/claude-code@2.1.200`; npm tarball `https://registry.npmjs.org/@anthropic-ai/claude-code/-/claude-code-2.1.200.tgz`; npm integrity `sha512-dDVQM1R7riEwBqARrIOr9nigtqgZ/uVDu7lsvU3EnQCMrRmT5KosYf79fngLyaNlu066tG8zOo7/zkkztBmjOA==`; npm shasum `ccf9aff84ef3dc569af0198b3f0ea75d59733f9d`.
- Platform package identity: `@anthropic-ai/claude-code-linux-x64@2.1.200`; npm tarball `https://registry.npmjs.org/@anthropic-ai/claude-code-linux-x64/-/claude-code-linux-x64-2.1.200.tgz`; npm integrity `sha512-w9sFQ2WinV504FTmkf7ApIsje/XSjIWp4778WjVEGGrXJKNurubkoY5b+lSRxHcnbEw8ROXD9qnxbKWocctlQA==`; npm shasum `f75a0d48e68796ed3cea520ff06c6ae073446ff3`.
- Explicit frozen install path (owner live-install protection): `/tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/claude-2.1.200` (the `package/claude` member of the platform tarball; binary sha256 `26e42a3268979f0c5a3b6c0f375b15dd7decfaae4bb02774390d6a23f4cd51ad`). The live installed CLI (2.1.198) was never read or modified.
- Extraction tool/version: `tweakcc` `4.0.13` `readContent` (via `apply/tweakcc-api.ts`) on the frozen native binary, under `bun 1.3.14`.
- Reproduction command or harness entry point: `bun --eval "import { tweakccApi } from './apply/tweakcc-api'; const c = await tweakccApi.readContent({ path: '/tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/claude-2.1.200', kind: 'native', version: '2.1.200' }); await Bun.write('/tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/extracted.js', c);"`, then `bun run e2e/native-e2e.ts artifact-evidence --bundle /tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/extracted.js --manifest /tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/manifest.json`.
- Extracted bundle path: `/tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/extracted.js` (out-of-repo per the Evidence Retention Policy).
- Extracted bundle checksum: sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, `18698041` bytes.
- Manifest path: `/tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/manifest.json`.
- Operator: `basil`.
- Credential boundary: only the native executable bundle was read; credentials, auth files, `~/.claude` config contents, session transcripts, and the full extracted bundle are not committed.

## Forward-Port Note (2.1.156 -> 2.1.200)

Across the ~44-release hop from 2.1.156 to 2.1.200, minified identifiers renamed but the structural seams held. The provider message map's user converter renamed `hLz` (2.1.156) -> `mVf` (2.1.200); it keeps the diagnostic 4-argument signature whose second parameter is the cache-breakpoint boolean default (`mVf(e,t=!1,n,r)`). The usage accumulator renamed `Wu5` (2.1.156) -> `a6p` (2.1.200), keeping the `<lookup>(n)??{inputTokens:0,...,contextWindow:0,maxOutputTokens:0}` record-initialization shape. The attachment pipeline renamed `bW4` -> `I8a(e,t)`; the runtime helpers resolved to `Xt`/`rr`/`Dt` (fs / config-dir / session-id). Seven of the eight anchors selected uniquely with structural selectors unchanged; only `context-bonsai-gauge.token-usage` needed scorer strengthening (a near-tie with a usage-display formatter that shares the same zero-initialized record literal — documented in that section). No `minScore`/`minMargin` threshold was lowered anywhere.

## Evidence Reclassification

This report plus the artifact-evidence harness output are mechanical locator evidence only: they prove candidate selection, fail-closed behavior, and sentinel insertion against the pinned 2.1.200 bundle. They are necessary but not release-gate acceptance evidence on their own; release-gate PASS additionally requires the live Claude Code E2E protocol (Protocol A secret oracle, E2E-08 prune effect, retrieve visibility) recorded in `docs/e2e-results-2026-07-03-2.1.200.md`. A sentinel-appears-once check is necessary but not sufficient because it proves insertion at the selected location rather than semantic correctness of the selected anchor.

## archived-filter.visibility

Anchor ID: `archived-filter.visibility`

Patch or helper: `archived-filter` patch — provider-bound message-array filter injected before Claude Code maps transcript entries into Anthropic API message objects.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil` from `/tmp/cc-bonsai-artifacts/claude-code/2.1.200/native/claude-2.1.200`.

Selected offset and snippet: offset `11749461`, score `105`, candidate count `1`: `return q("tengu_api_cache_breakpoints",{totalMessageCount:e.length,cachingEnabled:t,skipCacheWrite:r,forkPointPinned:d,...}),...e.map((...)=>{...if(<entry>.type==="user")return mVf(...);...api_system...return <assistantConverter>(...)})`.

Host behavior controlled: The tail of the function that turns Claude Code transcript entries into Anthropic provider request messages. It logs `tengu_api_cache_breakpoints`, then returns `e.map(...)` which routes `user` entries through the user converter (`mVf`), `api_system` entries to `{role:"system",...}`, and all others through the assistant converter. The returned array is the provider-bound message list, so filtering the input array just before this `return` omits archived messages from the model invocation while leaving local transcript storage and UI rendering untouched.

Required seam rationale: Context Bonsai must remove archived follower messages from the next model invocation. Filtering the message array immediately before the `.map(...)` that constructs API `role`/`content` objects is the narrow provider-bound seam that changes what the model receives; injecting before the `tengu_api_cache_breakpoints` telemetry + `.map(...)` statement guarantees the filter runs before any element is converted and keeps cache-breakpoint indexing coherent with the reduced set. This is Behavioral Constraint 4: the provider map carries the `api_system` branch, so the selector requires that branch structurally.

Plausible wrong candidates rejected: UI transcript visibility predicates (`switch(type)` display selectors carrying `if(...==="transcript")return!0`, `resolvedToolUseIDs`, `collapsed_read_search`) control display selection, not provider payload construction, and are penalised `-50` by the scorer and not matched by the structural pattern. `.map` sites building telemetry or tool-result summaries lack the `tengu_api_cache_breakpoints` context and the two-distinct-converter (`user`/`api_system`/else) branch shape.

Ambiguous/no-match fail-closed evidence: The structural selector requires the cache-breakpoint telemetry call, the `user`/`api_system`/else converter branches, and two DISTINCT converter identifiers; the pinned bundle yields exactly one candidate at score `105` (minScore `30`, minMargin `10`, both unchanged). Absent-anchor inputs throw `AnchorNotFoundError`/`AnchorAmbiguousError` rather than falling back to a broad `switch(type)` match (see `patches/anchors.test.ts`, `patches/archived-filter.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply --path "$TARGET_NATIVE_BINARY"` composes the archived-filter patch at this seam with sentinel verification; the live E2E-01/E2E-03/E2E-08 scenarios (archived followers hidden, retrieve restores, footprint drop) in `docs/e2e-results-2026-07-03-2.1.200.md` confirm the model-facing effect.

Reviewer checklist: Confirm the anchor precedes the `.map` that emits `role`/`content` objects; confirm the `api_system` -> `{role:"system",...}` branch is present; confirm the two converter identifiers differ; confirm score `105` at candidate count `1` with thresholds unchanged.

## message-content-ids.converter

Anchor ID: `message-content-ids.converter`

Patch or helper: `message-content-ids` patch — the provider-bound user converter whose output entries must carry a stable `uuid` so the archived-filter can match by `__cbMessage.uuid`.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `11690165`, score `110`, candidate count `24`: `function mVf(e,t=!1,n,r){if(t)if(typeof e.message.content==="string")return{role:"user",content:[{type:"text",text:e.message.content,...n&&{cache_control:...}}]}...`.

Host behavior controlled: `mVf(e,t=!1,n,r)` converts a Claude Code `user` transcript entry into an Anthropic `{role:"user",content:[...]}` provider message, threading `cache_control` when the cache-breakpoint flag `t` is set. It is the user-branch converter called from the `archived-filter.visibility` map.

Required seam rationale: The patch must make each provider-visible message carry its originating `uuid` so the archived-range filter can identify and drop archived rows after the host maps JSONL metadata into provider entries (Behavioral Constraint 2). The 4-argument signature with `t=!1` cache-breakpoint default is the behavior-grounded discriminator (2.1.156 precedent `hLz(H,$=!1,q,K)`): single-argument content-sanitizer helpers the greedy match can spill into never carry that flag.

Plausible wrong candidates rejected: Content-sanitizer helpers (single-arg `(e)`) that also return `{content:...}` are rejected by the `+20` 4-arg-signature discriminator and the `role:"system"` (`-25`) and `.map(` (`-40`) penalties. System-prompt shaping maps and assistant-only converters lack the `role:"user"` string literal (`+20`).

Ambiguous/no-match fail-closed evidence: 24 raw candidates reduce to a unique winner at score `110` (minScore `35`, minMargin `10`, unchanged). The four converter patterns require `uuid`/`content:` lookaheads; no-match inputs throw rather than binding a formatter (see `patches/message-content-ids.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply` inserts the id-preserving sentinel at this converter; the live prune/retrieve scenarios (E2E-01/E2E-03) depend on uuid-keyed matching and pass in `docs/e2e-results-2026-07-03-2.1.200.md`.

Reviewer checklist: Confirm signature `mVf(e,t=!1,n,r)`; confirm the `role:"user"` return; confirm score `110` with thresholds unchanged; confirm the converter is the one called from the `user` branch of the visibility map.

## context-bonsai-gauge.token-usage

Anchor ID: `context-bonsai-gauge.token-usage`

Patch or helper: `context-bonsai-gauge` patch — the per-request usage accumulator whose output record (input/output/cache tokens plus `contextWindow`/`maxOutputTokens` budget fields) the gauge reads to compute context-window pressure.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `7663439`, score `62`, candidate count `9`: `function a6p(e,t,n){let r=Mwr(n)??{inputTokens:0,outputTokens:0,cacheReadInputTokens:0,cacheCreationInputTokens:0,webSearchRequests:0,costUSD:0,contextWindow:0,maxOutputTokens:0}` — the captured text ends at the record literal's `}`; the full body then accumulates the current request's provider usage delta (`r.inputTokens+=t.input_tokens`, ...) and computes `r.contextWindow=bE(n,Cb())`, `r.maxOutputTokens=WRe(n).default` before returning `r`.

Host behavior controlled: `a6p(e,t,n)` takes a cost (`e`), the current request's raw provider usage snapshot (`t`, snake_case `input_tokens`/`output_tokens`/`cache_*`), and a model id (`n`); it loads-or-initializes the running usage record for that model, adds the request's delta, and stamps the per-request budget fields `contextWindow` and `maxOutputTokens`. This is the record the gauge consumes to render context-window pressure.

Required seam rationale: The gauge needs the accumulated usage record carrying both consumed-token counts and the budget denominators (`contextWindow`/`maxOutputTokens`). `a6p` is the single function that produces that record per request; anchoring here binds the gauge to real accumulated usage rather than a formatted display.

Plausible wrong candidates rejected: This is the one anchor that fail-closed at generation (top score `52`, second `47`, within `minMargin 10`). The tying candidate is `o6p()` — a zero-argument usage-DISPLAY formatter that iterates aggregate per-model usage and builds human-readable strings (`"Usage:                 0 input, 0 output, 0 cache read, 0 cache write"`, `"Usage by model:"`). Both share the identical zero-initialized record literal `{inputTokens:0,...,contextWindow:0,maxOutputTokens:0}`, which is why the base scorer tied them. Semantic re-derivation established the correct seam from behavior: `a6p`'s captured text initializes its record via a nullish-coalesce (`Mwr(n)??{inputTokens:0...}`) — the "load running record or start a fresh zero record" accumulator-entry behavior (exact 2.1.156 `Wu5` shape) — while `o6p`'s captured text contains a `"Usage:"` display string built before its first record literal. Two behavior-grounded scorer signals were added (no threshold change): `+15` for the `??{inputTokens:0` accumulator-init shape, `-25` for building a `"Usage"` display string. Post-strengthening: `a6p` = `62`, `o6p` = `27`, margin `35`.

Ambiguous/no-match fail-closed evidence: Before strengthening, `selectTokenUsageHelperAnchor` threw `AnchorAmbiguousError: top score 52, second score 47, minMargin 10` — the margin machinery working, refusing to anchor to a display formatter. After the behavior-grounded discriminators the selector returns a unique winner with margin `35` at unchanged `minScore 15`/`minMargin 10`. If semantic analysis could not have established a unique correct seam, the anchor would have been hard-blocked (`removed_or_ambiguous_anchor`) with no threshold lowered — it was not; a unique behavioral discriminator exists.

Runtime or model-facing evidence: `bun run apply` composes the gauge patch at `a6p` with sentinel verification; a live `--output-format json` run this gate surfaces the accumulator record fields (`inputTokens`/`contextWindow`/`maxOutputTokens`-class) in `modelUsage`, behaviorally confirming the re-derived seam (E2E-04 compensating evidence, `docs/e2e-results-2026-07-03-2.1.200.md`).

Reviewer checklist: Confirm the winner is `a6p(e,t,n)` (multi-arg accumulator), not `o6p()` (zero-arg formatter); confirm the `??{inputTokens:0` init and the `"Usage"`-string penalty in `tokenUsageScorer`; confirm `minScore 15`/`minMargin 10` unchanged; confirm the full body computes `contextWindow`/`maxOutputTokens`.

## context-bonsai-gauge.attachment-pipeline

Anchor ID: `context-bonsai-gauge.attachment-pipeline`

Patch or helper: `context-bonsai-gauge` patch — the attachment-assembly pipeline the gauge hooks to inject its reminder/attachment payload.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `7776901`, score `50`, candidate count `17`: `function I8a(e,t){let n=Efe(),r=[],o=E8a(),s=[],i;function a(){if(o.messages.length===0)return;r.push(rKp(o));let l=new Set;for(let c of s){if(c.type==="attachm...`.

Host behavior controlled: `I8a(e,t)` assembles attachment/reminder entries (it `.push`es attachment records and handles `attachment`-typed items), the pipeline into which the gauge injects its reminder attachment so the context-window gauge renders alongside other reminders.

Required seam rationale: The gauge must add its own attachment to the same pipeline that emits todo/reminder/attachment entries so it participates in normal reminder rendering. `I8a` is the two-argument assembly function that `.push`es into the attachment list — the correct injection point.

Plausible wrong candidates rejected: Functions lacking a `.push(` are penalised `-20`; non-object-guard helpers `-10`. Candidates without `todo`/`reminder`/`attachment` context miss the `+15`/`+10` signals, so display or unrelated `.push` sites do not win.

Ambiguous/no-match fail-closed evidence: 17 raw candidates reduce to a unique winner at score `50` (minScore `15`, minMargin `10`, unchanged). No-match inputs throw rather than binding an arbitrary `.push` site (see `patches/context-bonsai-gauge.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply` composes the gauge attachment injection here with sentinel verification; the gauge render depends on this pipeline (E2E-04 compensating evidence).

Reviewer checklist: Confirm two-parameter signature `I8a(e,t)`; confirm the `.push(` attachment assembly and `attachment` handling; confirm score `50` at candidate count `17` with thresholds unchanged.

## context-bonsai-gauge.reminder-render

Anchor ID: `context-bonsai-gauge.reminder-render`

Patch or helper: `context-bonsai-gauge` patch — the reminder/attachment render switch where the gauge's attachment type is rendered to model-facing text.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `14376419`, score `40`, candidate count `1`: `switch(e.type){case"file":{let n=e.content;switch(n.type){case"image":...case"text":...}}...` — the attachment-type render switch reached uniquely by the reminder-render selector's `todo`/`todo_reminder` case lookahead.

Host behavior controlled: The `switch(e.type)` that renders each attachment/reminder entry to its model-facing representation; the gauge's attachment type is rendered here.

Required seam rationale: The gauge must render its attachment through the same switch that renders todo/reminder attachments so its content reaches the model transcript. This switch, uniquely selected, is that render site.

Plausible wrong candidates rejected: Other `switch(x.type)` sites lack the `todo`/`todo_reminder` case within the lookahead window and so are not matched; the selector requires the reminder case-shape, yielding a single candidate.

Ambiguous/no-match fail-closed evidence: The pinned bundle yields exactly one candidate at score `40` (minScore `15`, minMargin `10`, unchanged). No-match inputs throw `AnchorNotFoundError` rather than binding an unrelated switch (see `patches/context-bonsai-gauge.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply` composes the render hook here with sentinel verification; the gauge's rendered text is model-facing (E2E-04 compensating evidence).

Reviewer checklist: Confirm the `switch(e.type)` render site; confirm candidate count `1` at score `40`; confirm thresholds unchanged; confirm the exposed attachment variable resolves.

## runtime-helper.fs

Anchor ID: `runtime-helper.fs`

Patch or helper: `discovery` runtime-helper resolution — the accessor that returns the Node `fs` module, used by the patch runtime to read/write session and marker files.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: resolves to identifier `Xt` via the discovery pattern `\b(<id>)\s*\(\s*\)\s*\.\s*(?:existsSync|readFileSync|writeFileSync)\s*\(` — call sites of the form `Xt().existsSync(...)`; the definition is `function Xt(){return hmu}` (an accessor returning the cached fs module).

Host behavior controlled: `Xt()` returns the filesystem module object; call sites invoke `Xt().existsSync/readFileSync/writeFileSync`. The runtime helper reuses the host's fs accessor rather than importing its own.

Required seam rationale: The patch runtime must perform its file operations through the same fs accessor the host uses so behavior (and any host shims) is consistent; `Xt` is the uniquely most-frequent identifier used in the `<id>().existsSync(...)` shape.

Plausible wrong candidates rejected: Other identifiers appear in `<id>().<method>(...)` shapes but not with the fs-method triple; frequency-ranked uniqueness selects `Xt` over incidental matches.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` resolves `fsFunc: "Xt"` uniquely; a tie or absence throws in `selectUniqueIdentifier` rather than guessing (see `patches/discovery.test.ts`).

Runtime or model-facing evidence: `apply --path "$TARGET_NATIVE_BINARY"` relies on the resolved helpers when the runtime patch executes; the live prune/retrieve file mutations (E2E-01/E2E-03) exercise fs access.

Reviewer checklist: Confirm `fsFunc` resolves to `Xt`; confirm the `Xt().existsSync(` call shape; confirm unique resolution.

## runtime-helper.config-dir

Anchor ID: `runtime-helper.config-dir`

Patch or helper: `discovery` runtime-helper resolution — the accessor returning the Claude config directory, used to locate session storage.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: resolves to identifier `rr` via `findConfigDirCandidates` (the config-dir getter pattern); `rr` is the uniquely-ranked config-directory accessor in the pinned bundle.

Host behavior controlled: `rr` returns the Claude configuration/base directory the host uses to resolve `~/.claude`-rooted paths; the runtime helper uses it to locate session JSONL storage.

Required seam rationale: The patch runtime must resolve session paths from the same config-dir the host uses so discovery matches the host's actual storage location; `rr` is that accessor.

Plausible wrong candidates rejected: Other directory getters do not match the config-dir candidate pattern's structure; frequency/structure ranking selects `rr` uniquely.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` resolves `configDirFunc: "rr"` uniquely; a tie or absence throws in `selectUniqueIdentifier` (see `patches/discovery.test.ts`).

Runtime or model-facing evidence: `apply --path "$TARGET_NATIVE_BINARY"` and live session discovery rely on the resolved config-dir helper; E2E-06 resume/reload exercises path resolution.

Reviewer checklist: Confirm `configDirFunc` resolves to `rr`; confirm unique resolution via the config-dir pattern.

## runtime-helper.session-id

Anchor ID: `runtime-helper.session-id`

Patch or helper: `discovery` runtime-helper resolution — the accessor returning the current session id, used to identify the active session JSONL.

Pinned artifact identity: Claude Code native `2.1.200` Linux x64, extracted bundle sha256 `60e1c6cfc6d3931bf44020bfdb397d925a786365b8743a9760f2098aca9d7597`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: resolves to identifier `Dt` via `findSessionIdCandidates`; the definition is `function Dt(){return $I()?.sessionId??jt.sessionId}` — returns the active session id from the current-session context with a fallback.

Host behavior controlled: `Dt()` returns the current session id; the runtime helper uses it to resolve which session JSONL is active for prune/retrieve.

Required seam rationale: The patch must target the same session the host considers active; `Dt` is the accessor that yields the host's current session id, so discovery binds to the live session rather than a guessed file.

Plausible wrong candidates rejected: Other id getters (e.g. main-agent id) do not match the session-id candidate pattern that keys on `sessionId`; ranking selects `Dt` uniquely.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` resolves `sessionIdFunc: "Dt"` uniquely; a tie or absence throws in `selectUniqueIdentifier` (see `patches/discovery.test.ts`). This underpins Behavioral Constraint 9's fail-closed guard indirectly by ensuring the active session is identified deterministically.

Runtime or model-facing evidence: `apply --path "$TARGET_NATIVE_BINARY"` and the live prune-guard (E2E-08) rely on correct session identification; the guard fails closed when no Claude ancestor binary is identified.

Reviewer checklist: Confirm `sessionIdFunc` resolves to `Dt`; confirm the `return $I()?.sessionId??jt.sessionId` body; confirm unique resolution.
