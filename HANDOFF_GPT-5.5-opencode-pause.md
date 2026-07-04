# HANDOFF: GPT-5.5 OpenCode pilot — run 5 paused on quota

**SUPERSEDED 2026-07-04 ~18:20 UTC (owner decision, Basil via showrunner).** The 429 was on OpenCode's Zen subscription (`opencode/gpt-5.5`), which the pilot was never meant to use. Basil ordered the executor moved to his OpenAI subscription; `openai/gpt-5.5` does not exist, so he chose **`openai/gpt-5.3-codex-spark`** (parent `opencode.json` updated, all four bonsai agents). The sleeping run-5 process was killed (owner-sanctioned), the quota-horizon timer cancelled, and the run relaunched under the new model with false-start disposition. Zen (`opencode/*` provider) must not be used for pilot runs. The rest of this document is historical.

Bookmark for the paused pilot run 5. Read this when resuming work on the run — at the quota horizon (**~2026-07-05 08:36 UTC**) or on any earlier signal. It exists so the relay chain can spend the intervening days on other work units without carrying the pause state in `HAND_OFF.md`'s critical path.

## What is paused, exactly

- **Run 5** — the execute-only pilot: GPT-5.5 executes the Fable-authored plan (parent commit `37ed76c`) under the execute-only brief (`f6d3513`). Asleep in tmux window `bonsai:@15`, orchestrator PID `2049574`, on OpenCode's in-process quota sleep (the same path runs 3–4 validated).
- **Why**: provider returned `Subscription quota exceeded. Retry in 2 days` at 08:35:54 UTC 2026-07-03, on the developer subagent's first LLM call (`~/.local/share/opencode/log/2026-07-03T083157.log`). Self-resume expected ~2026-07-05 08:36 UTC.
- **Quota was probed once** (owner-directed, 16:34 UTC 2026-07-03, scratch session — log `2026-07-03T163430.log`): still 429. The sleeping process was deliberately left untouched — killing it would reset the 2-day horizon later. Kill-and-relaunch is sanctioned **only** after a successful probe or a dead process.
- **Nothing is lost**: preflight passed clean (plan artifacts hash-verified, execute-only framing held), the single friction event (missing `node-gyp`) was resolved and evidence-logged. Details: observer log `.agents/pilot/gpt55-v1.17.13-observer-log.md` (parent repo).

## How to resume

1. **Verify self-resume**: run log `.agents/pilot/gpt55-v1.17.13-run.log` (parent repo) growing after the horizon; newest `~/.local/share/opencode/log/*.log` shows `session.processor` activity with no fresh 429.
2. **If resumed**: restart the observation relay — new window in tmux session `bonsai` running `claude --model claude-fable-5` pointed at `HAND_OFF.md` — and follow its standing observation protocol (≤30-min wake-and-verify, `PILOT-PROCESS-EXITED` watcher, on-exit sequence).
3. **If a fresh 429 sets a new horizon**: record it in the observer log, leave the process asleep, move the watchdog timer to the new horizon, slack Basil (verify `ok`).
4. **If the process is dead**: HAND_OFF option (b) mechanics, owner sanction recorded 2026-07-03 — false-start disposition in the observer log, clear the run-5 record files, relaunch via `launch-run.sh`, observe per protocol.

## Timer

The showrunner session holds a one-shot timer at **08:50 UTC (01:50 US-Pacific local) 2026-07-05** whose wake message points at this document. If the showrunner session has died by then, the next showrunner re-arms it on takeover (see `SHOWRUNNER_HANDOFF.md`).
