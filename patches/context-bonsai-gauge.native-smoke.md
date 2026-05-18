# Story 6 Native Host-Global Smoke Status

Status: Story 6-specific artifact-absent deferral.

Story 6 requires a repacked native Claude Code runtime smoke proving the injected gauge path can decode `<context-bonsai-tool-response>` metadata with `Buffer` without `ReferenceError`. This worktree does not contain an approved repo-local native target artifact or copied native install at `tweakcc_context_bonsai/.artifacts/claude-code/2.1.143/linux-x64/extracted.js`, and this revision is prohibited from inspecting external install paths.

The Story 6 targeted Bun test `patches/context-bonsai-gauge.patch.test.ts` still covers the gauge-specific `Buffer.from(..., "base64")` wrapper-decoding path in the injected code. Real repacked-native host-global evidence remains deferred to Story 8, which owns the pinned native release-gate artifact and runtime evidence.
