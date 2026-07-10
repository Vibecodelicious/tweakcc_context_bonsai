# Semantic Anchor Analysis: Claude Code 2.1.205 Linux x64

## Pinned Artifact Identity

- Claude Code version: native `2.1.205` Linux x64 (`--version` reports `2.1.205 (Claude Code)`).
- Package identity: `@anthropic-ai/claude-code@2.1.205`; npm tarball `https://registry.npmjs.org/@anthropic-ai/claude-code/-/claude-code-2.1.205.tgz`; npm integrity `sha512-riShT8jUKjYFupfYtFJF8JelKmJzAm+fHDvqUadfEAjzRAJ3AatZm5gtzWT3pEBmSXPIjoIjOHOXBGzo5wpuCw==`; npm shasum `3f0d3687f23abaa3641b96fe8007b48c5336a1ac`.
- Platform package identity: `@anthropic-ai/claude-code-linux-x64@2.1.205`; npm tarball `https://registry.npmjs.org/@anthropic-ai/claude-code-linux-x64/-/claude-code-linux-x64-2.1.205.tgz`; npm integrity `sha512-VkmVjAIW28gZ0ef+uEBJxEkzQbKVulRY789mbMALJ8Zvb6nG0pl+ykGOdF1CQnRR7wmm+rR+EoiuhnFWu59D/Q==`; npm shasum `4bbde7877ec0bac634807e37eff7344fccc14d9f`.
- Explicit frozen install path (owner live-install protection): `/tmp/cc-bonsai-cycle-2.1.205/claude-2.1.205` (the `package/claude` member of the platform tarball; pristine binary sha256 `dd8734c0b6a503fe1d17425184e57b397c30bb0337a33f1470d9985febfe5b09`). The live installed CLI (2.1.198) was never read or modified.
- Extraction tool/version: `tweakcc` `4.0.13` `readContent` (via `apply/tweakcc-api.ts`) on the frozen native binary, under `bun 1.3.14`.
- Reproduction command or harness entry point: `bun --eval "import { tweakccApi } from './apply/tweakcc-api'; const c = await tweakccApi.readContent({ path: '/tmp/cc-bonsai-cycle-2.1.205/claude-2.1.205', kind: 'native', version: '2.1.205' }); await Bun.write('.artifacts/claude-code/2.1.205/linux-x64/extracted.js', c);"`, then `bun run e2e/native-e2e.ts artifact-evidence --bundle .artifacts/claude-code/2.1.205/linux-x64/extracted.js --manifest .artifacts/claude-code/2.1.205/linux-x64/manifest.json`.
- Extracted bundle path: `.artifacts/claude-code/2.1.205/linux-x64/extracted.js` (out-of-repo/uncommitted per the Evidence Retention Policy).
- Extracted bundle checksum: sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, `19175988` bytes.
- Manifest path: `.artifacts/claude-code/2.1.205/linux-x64/manifest.json`.
- Operator: `basil`.
- Credential boundary: only the native executable bundle was read; credentials, auth files, `~/.claude` config contents, session transcripts, and the full extracted bundle are not committed.

## Forward-Port Note (2.1.201 -> 2.1.205)

The 2.1.201 -> 2.1.205 hop is a clean rebind: every one of the eight anchors selects the same seam, with the same scores (`105`/`110`/`62`/`50`/`40`) and the same selection outcome as at 2.1.201, and the full patch composition + all three sentinels verify green against the pinned bundle with zero source edits to any selector, scorer, or `minScore`/`minMargin` threshold. Two mechanical differences from the zero-drift 2.1.201 hop, both absorbed by the version-agnostic selectors: (1) the minified identifiers churned across the version bump — the provider user converter is now `m0y(e,t=!1,r,n)` (was `mVf`), the usage accumulator `Upg(e,t,r)` with `m5o(r)??{inputTokens:0,...}` init (was `a6p`/`Mwr`), the attachment pipeline `Wbu(e,t)` (was `I8a`), and the runtime helpers resolve to `Gt`/`sn`/`wt` (fs / config-dir / session-id; were `Xt`/`rr`/`Dt`); (2) offsets shifted non-uniformly as the bundle grew from `18698064` to `19175988` bytes, and the `attachment-pipeline` raw candidate count moved from `17` to `15` while the winner still selects uniquely at score `50`. The selectors key on structural/behavioral shape rather than identifier text, so the identifier churn required no re-derivation. The scan reproduced at execution against the frozen bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`.

## Evidence Reclassification

This report plus the artifact-evidence harness output are mechanical locator evidence only: they prove candidate selection, fail-closed behavior, and sentinel insertion against the pinned 2.1.205 bundle. They are necessary but not release-gate acceptance evidence on their own; release-gate PASS additionally requires the live Claude Code E2E protocol (Protocol A secret oracle, prune effect, retrieve visibility) recorded in `docs/e2e-results-2026-07-09-2.1.205.md`. A sentinel-appears-once check is necessary but not sufficient because it proves insertion at the selected location rather than semantic correctness of the selected anchor.

## archived-filter.visibility

Anchor ID: `archived-filter.visibility`

Patch or helper: `archived-filter` patch — provider-bound message-array filter injected before Claude Code maps transcript entries into Anthropic API message objects.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil` from `/tmp/cc-bonsai-cycle-2.1.205/claude-2.1.205`.

Selected offset and snippet: offset `12060646`, score `105`, candidate count `1`: `return O("tengu_api_cache_breakpoints",{totalMessageCount:e.length,cachingEnabled:t,skipCa...})...e.map(...)` routing `user` entries through the user converter (`m0y`), `api_system` entries to `{role:"system",...}`, and all others through the assistant converter.

Host behavior controlled: The tail of the function that turns Claude Code transcript entries into Anthropic provider request messages. It logs `tengu_api_cache_breakpoints`, then returns `e.map(...)` which routes `user` entries through the user converter (`m0y`), `api_system` entries to a system message, and all others through the assistant converter. The returned array is the provider-bound message list, so filtering the input array just before this `return` omits archived messages from the model invocation while leaving local transcript storage and UI rendering untouched.

Required seam rationale: Context Bonsai must remove archived follower messages from the next model invocation. Filtering the message array immediately before the `.map(...)` that constructs API `role`/`content` objects is the narrow provider-bound seam that changes what the model receives; injecting before the `tengu_api_cache_breakpoints` telemetry + `.map(...)` statement guarantees the filter runs before any element is converted and keeps cache-breakpoint indexing coherent with the reduced set. This is Behavioral Constraint 4: the provider map carries the `api_system` branch, so the selector requires that branch structurally.

Plausible wrong candidates rejected: UI transcript visibility predicates (`switch(type)` display selectors carrying `if(...==="transcript")return!0`, `resolvedToolUseIDs`, `collapsed_read_search`) control display selection, not provider payload construction, and are penalised `-50` by the scorer and not matched by the structural pattern. `.map` sites building telemetry or tool-result summaries lack the `tengu_api_cache_breakpoints` context and the two-distinct-converter (`user`/`api_system`/else) branch shape.

Ambiguous/no-match fail-closed evidence: The structural selector requires the cache-breakpoint telemetry call, the `user`/`api_system`/else converter branches, and two DISTINCT converter identifiers; the pinned bundle yields exactly one candidate at score `105` (minScore `30`, minMargin `10`, both unchanged). Absent-anchor inputs throw `AnchorNotFoundError`/`AnchorAmbiguousError` rather than falling back to a broad `switch(type)` match (see `patches/anchors.test.ts`, `patches/archived-filter.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply --path <frozen binary>` composes the archived-filter patch at this seam with sentinel verification; the live prune/retrieve scenarios (archived followers hidden, retrieve restores, footprint drop) in `docs/e2e-results-2026-07-09-2.1.205.md` confirm the model-facing effect.

Reviewer checklist: Confirm the anchor precedes the `.map` that emits `role`/`content` objects; confirm the `api_system` -> system-message branch is present; confirm the two converter identifiers differ; confirm score `105` at candidate count `1` with thresholds unchanged.

## message-content-ids.converter

Anchor ID: `message-content-ids.converter`

Patch or helper: `message-content-ids` patch — the provider-bound user converter whose output entries must carry a stable `uuid` so the archived-filter can match by `__cbMessage.uuid`.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `12001217`, score `110`, candidate count `24`: `function m0y(e,t=!1,r,n){if(t)if(typeof e.message.content==="string")return{role:"user",content:[...]}...` — the 4-argument cache-breakpoint signature discriminator is intact.

Host behavior controlled: `m0y(e,t=!1,r,n)` converts a Claude Code `user` transcript entry into an Anthropic `{role:"user",content:[...]}` provider message, threading `cache_control` when the cache-breakpoint flag `t` is set. It is the user-branch converter called from the `archived-filter.visibility` map.

Required seam rationale: The patch must make each provider-visible message carry its originating `uuid` so the archived-range filter can identify and drop archived rows after the host maps JSONL metadata into provider entries (Behavioral Constraint 2). The 4-argument signature with `t=!1` cache-breakpoint default is the behavior-grounded discriminator: single-argument content-sanitizer helpers the greedy match can spill into never carry that flag.

Plausible wrong candidates rejected: Content-sanitizer helpers (single-arg `(e)`) that also return `{content:...}` are rejected by the `+20` 4-arg-signature discriminator and the `role:"system"` (`-25`) and `.map(` (`-40`) penalties. System-prompt shaping maps and assistant-only converters lack the `role:"user"` string literal (`+20`).

Ambiguous/no-match fail-closed evidence: 24 raw candidates reduce to a unique winner at score `110` (minScore `35`, minMargin `10`, unchanged). The four converter patterns require `uuid`/`content:` lookaheads; no-match inputs throw rather than binding a formatter (see `patches/message-content-ids.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply` inserts the id-preserving sentinel at this converter; the live prune/retrieve scenarios depend on uuid-keyed matching and pass in `docs/e2e-results-2026-07-09-2.1.205.md`.

Reviewer checklist: Confirm signature `m0y(e,t=!1,r,n)`; confirm the `role:"user"` return; confirm score `110` with thresholds unchanged; confirm the converter is the one called from the `user` branch of the visibility map.

## context-bonsai-gauge.token-usage

Anchor ID: `context-bonsai-gauge.token-usage`

Patch or helper: `context-bonsai-gauge` patch — the per-request usage accumulator whose output record (input/output/cache tokens plus `contextWindow`/`maxOutputTokens` budget fields) the gauge reads to compute context-window pressure.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `7731641`, score `62`, candidate count `9`: `function Upg(e,t,r){let n=m5o(r)??{inputTokens:0,outputTokens:0,cacheReadInputTokens:0,cacheCreationInputTokens:0,...}` — the captured text ends at the record literal; the full body then accumulates the current request's provider usage delta and stamps `contextWindow`/`maxOutputTokens` before returning the record.

Host behavior controlled: `Upg(e,t,r)` takes a cost (`e`), the current request's raw provider usage snapshot (`t`, snake_case `input_tokens`/`output_tokens`/`cache_*`), and a model id (`r`); it loads-or-initializes the running usage record for that model via `m5o(r)`, adds the request's delta, and stamps the per-request budget fields `contextWindow` and `maxOutputTokens`. This is the record the gauge consumes to render context-window pressure.

Required seam rationale: The gauge needs the accumulated usage record carrying both consumed-token counts and the budget denominators (`contextWindow`/`maxOutputTokens`). `Upg` is the single function that produces that record per request; anchoring here binds the gauge to real accumulated usage rather than a formatted display.

Plausible wrong candidates rejected: The historical near-tie is a zero-argument usage-DISPLAY formatter that iterates aggregate per-model usage and builds human-readable `"Usage:"` / `"Usage by model:"` strings, sharing the identical zero-initialized record literal `{inputTokens:0,...}`. The behavior-grounded scorer signals (`+15` for the `??{inputTokens:0` accumulator-init shape, `-25` for building a `"Usage"` display string) discriminate the accumulator from the formatter; at 2.1.205 the accumulator wins uniquely at score `62`. No threshold was changed this cycle.

Ambiguous/no-match fail-closed evidence: `selectTokenUsageHelperAnchor` returns a unique winner at score `62` from `9` raw candidates at unchanged `minScore 15`/`minMargin 10` — the selector did not throw, so the discriminating margin remains at least `minMargin` over the display formatter. Were the margin ever to collapse, the selector would throw `AnchorAmbiguousError` and the anchor would hard-block (`removed_or_ambiguous_anchor`) with no threshold lowered.

Runtime or model-facing evidence: `bun run apply` composes the gauge patch at `Upg` with sentinel verification; a live `--output-format json` run this gate surfaces the accumulator record fields (`inputTokens`/`contextWindow`/`maxOutputTokens`-class) in `modelUsage`, behaviorally confirming the seam (gauge compensating evidence, `docs/e2e-results-2026-07-09-2.1.205.md`).

Reviewer checklist: Confirm the winner is `Upg(e,t,r)` (multi-arg accumulator), not the zero-arg `"Usage"` formatter; confirm the `??{inputTokens:0` init and the `"Usage"`-string penalty in `tokenUsageScorer`; confirm `minScore 15`/`minMargin 10` unchanged; confirm the full body computes `contextWindow`/`maxOutputTokens`.

## context-bonsai-gauge.attachment-pipeline

Anchor ID: `context-bonsai-gauge.attachment-pipeline`

Patch or helper: `context-bonsai-gauge` patch — the attachment-assembly pipeline the gauge hooks to inject its reminder/attachment payload.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `7848655`, score `50`, candidate count `15`: `function Wbu(e,t){let r=AAe(),n=[],o=Nbu(),i=[],s;function a(){if(o.messages.length===0)return;...}` — the attachment assembly `.push`es attachment records and handles `attachment`-typed items.

Host behavior controlled: `Wbu(e,t)` assembles attachment/reminder entries (it `.push`es attachment records and handles `attachment`-typed items), the pipeline into which the gauge injects its reminder attachment so the context-window gauge renders alongside other reminders.

Required seam rationale: The gauge must add its own attachment to the same pipeline that emits todo/reminder/attachment entries so it participates in normal reminder rendering. `Wbu` is the two-argument assembly function that `.push`es into the attachment list — the correct injection point.

Plausible wrong candidates rejected: Functions lacking a `.push(` are penalised `-20`; non-object-guard helpers `-10`. Candidates without `todo`/`reminder`/`attachment` context miss the `+15`/`+10` signals, so display or unrelated `.push` sites do not win.

Ambiguous/no-match fail-closed evidence: 15 raw candidates reduce to a unique winner at score `50` (minScore `15`, minMargin `10`, unchanged; the raw candidate count moved from `17` at 2.1.201 to `15` here, the winner unchanged). No-match inputs throw rather than binding an arbitrary `.push` site (see `patches/context-bonsai-gauge.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply` composes the gauge attachment injection here with sentinel verification; the gauge render depends on this pipeline (gauge compensating evidence).

Reviewer checklist: Confirm two-parameter signature `Wbu(e,t)`; confirm the `.push(` attachment assembly and `attachment` handling; confirm score `50` at candidate count `15` with thresholds unchanged.

## context-bonsai-gauge.reminder-render

Anchor ID: `context-bonsai-gauge.reminder-render`

Patch or helper: `context-bonsai-gauge` patch — the reminder/attachment render switch where the gauge's attachment type is rendered to model-facing text.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: offset `14755101`, score `40`, candidate count `1`: `switch(e.type){case"file":{let r=e.content;switch(r.type){case"image":...}}...` — the attachment-type render switch reached uniquely by the reminder-render selector's `todo`/`todo_reminder` case lookahead.

Host behavior controlled: The `switch(e.type)` that renders each attachment/reminder entry to its model-facing representation; the gauge's attachment type is rendered here.

Required seam rationale: The gauge must render its attachment through the same switch that renders todo/reminder attachments so its content reaches the model transcript. This switch, uniquely selected, is that render site.

Plausible wrong candidates rejected: Other `switch(x.type)` sites lack the `todo`/`todo_reminder` case within the lookahead window and so are not matched; the selector requires the reminder case-shape, yielding a single candidate.

Ambiguous/no-match fail-closed evidence: The pinned bundle yields exactly one candidate at score `40` (minScore `15`, minMargin `10`, unchanged). No-match inputs throw `AnchorNotFoundError` rather than binding an unrelated switch (see `patches/context-bonsai-gauge.patch.test.ts`).

Runtime or model-facing evidence: `bun run apply` composes the render hook here with sentinel verification; the gauge's rendered text is model-facing (gauge compensating evidence).

Reviewer checklist: Confirm the `switch(e.type)` render site; confirm candidate count `1` at score `40`; confirm thresholds unchanged; confirm the exposed attachment variable resolves.

## runtime-helper.fs

Anchor ID: `runtime-helper.fs`

Patch or helper: `discovery` runtime-helper resolution — the accessor that returns the Node `fs` module, used by the patch runtime to read/write session and marker files.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: resolves to identifier `Gt` via the discovery pattern `\b(<id>)\s*\(\s*\)\s*\.\s*(?:existsSync|readFileSync|writeFileSync)\s*\(` — call sites of the form `Gt().existsSync(...)`; `Gt` is an accessor returning the cached fs module.

Host behavior controlled: `Gt()` returns the filesystem module object; call sites invoke `Gt().existsSync/readFileSync/writeFileSync`. The runtime helper reuses the host's fs accessor rather than importing its own.

Required seam rationale: The patch runtime must perform its file operations through the same fs accessor the host uses so behavior (and any host shims) is consistent; `Gt` is the uniquely most-frequent identifier used in the `<id>().existsSync(...)` shape.

Plausible wrong candidates rejected: Other identifiers appear in `<id>().<method>(...)` shapes but not with the fs-method triple; frequency-ranked uniqueness selects `Gt` over incidental matches.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` resolves `fsFunc: "Gt"` uniquely; a tie or absence throws in `selectUniqueIdentifier` rather than guessing (see `patches/discovery.test.ts`).

Runtime or model-facing evidence: `apply --path <frozen binary>` relies on the resolved helpers when the runtime patch executes; the live prune/retrieve file mutations exercise fs access.

Reviewer checklist: Confirm `fsFunc` resolves to `Gt`; confirm the `Gt().existsSync(` call shape; confirm unique resolution.

## runtime-helper.config-dir

Anchor ID: `runtime-helper.config-dir`

Patch or helper: `discovery` runtime-helper resolution — the accessor returning the Claude config directory, used to locate session storage.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: resolves to identifier `sn` via `findConfigDirCandidates` (the config-dir getter pattern); `sn` is the uniquely-ranked config-directory accessor in the pinned bundle.

Host behavior controlled: `sn` returns the Claude configuration/base directory the host uses to resolve `~/.claude`-rooted paths; the runtime helper uses it to locate session JSONL storage.

Required seam rationale: The patch runtime must resolve session paths from the same config-dir the host uses so discovery matches the host's actual storage location; `sn` is that accessor.

Plausible wrong candidates rejected: Other directory getters do not match the config-dir candidate pattern's structure; frequency/structure ranking selects `sn` uniquely.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` resolves `configDirFunc: "sn"` uniquely; a tie or absence throws in `selectUniqueIdentifier` (see `patches/discovery.test.ts`).

Runtime or model-facing evidence: `apply --path <frozen binary>` and live session discovery rely on the resolved config-dir helper; resume/reload exercises path resolution.

Reviewer checklist: Confirm `configDirFunc` resolves to `sn`; confirm unique resolution via the config-dir pattern.

## runtime-helper.session-id

Anchor ID: `runtime-helper.session-id`

Patch or helper: `discovery` runtime-helper resolution — the accessor returning the current session id, used to identify the active session JSONL.

Pinned artifact identity: Claude Code native `2.1.205` Linux x64, extracted bundle sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, extracted with tweakcc `4.0.13` by `basil`.

Selected offset and snippet: resolves to identifier `wt` via `findSessionIdCandidates` — returns the active session id from the current-session context with a fallback.

Host behavior controlled: `wt()` returns the current session id; the runtime helper uses it to resolve which session JSONL is active for prune/retrieve.

Required seam rationale: The patch must target the same session the host considers active; `wt` is the accessor that yields the host's current session id, so discovery binds to the live session rather than a guessed file.

Plausible wrong candidates rejected: Other id getters (e.g. main-agent id) do not match the session-id candidate pattern that keys on `sessionId`; ranking selects `wt` uniquely.

Ambiguous/no-match fail-closed evidence: `findRuntimeHelpers` resolves `sessionIdFunc: "wt"` uniquely; a tie or absence throws in `selectUniqueIdentifier` (see `patches/discovery.test.ts`). This underpins Behavioral Constraint 9's fail-closed guard indirectly by ensuring the active session is identified deterministically.

Runtime or model-facing evidence: `apply --path <frozen binary>` and the live prune-guard rely on correct session identification; the guard fails closed when no Claude ancestor binary is identified.

Reviewer checklist: Confirm `sessionIdFunc` resolves to `wt`; confirm the current-session-id body with fallback; confirm unique resolution.
