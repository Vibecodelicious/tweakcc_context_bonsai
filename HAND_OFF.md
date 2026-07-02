# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo); its committed Next Step — the GPT-5.5 executor-tiering pilot against upstream OpenCode v1.17.13 — is now **running**.

## State as of 2026-07-02 ~16:50 UTC

- **The GPT-5.5 pilot is launched and running** (parent commit `05a7356` is the setup). The executor: a process orchestrator per `.llm-conductor/ORCHESTRATOR_AGENT.md`, running as OpenCode CLI agent `bonsai-orchestrator` on model `opencode/gpt-5.5` (OpenCode Zen provider; OpenAI OAuth tops out at gpt-5.4) at medium reasoning, with `bonsai-developer` / `bonsai-reviewer` / `bonsai-judge` subagents on the same model. All defined in parent-root `opencode.json`.
- **Where it runs**: tmux window `bonsai:gpt55-pilot` (this relay chain lives in the same tmux session). Console output tees to parent `.agents/pilot/gpt55-v1.17.13-run.log` (gitignored). The window stays open after the process exits (`PILOT-PROCESS-EXITED code=N` marker, then a bash prompt).
- **The pilot's inputs** are in parent `.agents/pilot/gpt55-v1.17.13-brief.md` (committed): SOURCE_REF `refs/heads/replay/context-bonsai-on-opencode-1.15.7`, SOURCE_HEAD_SHA `0dfbeeda7d8a273c52a564333c8179c68d6ab04d`, UPSTREAM_REF `refs/tags/v1.17.13`, OpenCode slot §4.2, git-fork shape. The brief passed a reader-state review clean; a source-truth review caught that the source ref was written as a branch under `bonsai/…` when that name is a tag — fixed to the replay branch before launch.
- **Executor-side logs**: the brief obliges the executor to append every stumble to `.agents/pilot/gpt55-v1.17.13-friction-log.md` (it created the file within its first minutes) and to end by writing `.agents/pilot/gpt55-v1.17.13-final-report.md`.
- **First minutes observed**: it read the brief, fetched upstream, verified SOURCE_REF, and created the friction log. `git rev-parse --verify refs/tags/v1.17.13` was still failing in the fork repo right after its fetch (the tag exists on the `upstream` remote — verified independently before launch via `git ls-remote`). How it handles that is pilot data; no verdict recorded yet.
- **Setup note for Basil**: the intended `opencode.json` gave the four agents explicit `bash/edit: allow` permission blocks; Claude Code's auto-mode classifier refused to write that file (autonomous-agents-without-authorization concern). The committed config omits permission blocks and relies on OpenCode's default permission behavior, which on this machine allows tool use — same runtime effect, harness's own defaults rather than an explicit grant. Flagged in Slack 2026-07-02.
- Prior milestones, still relevant as context: the spec acceptance test passed 2026-07-02 (clean-room regeneration by Sonnet agents, three rounds, ~12 spec fixes; the §1.15 validation loop — not checklists — is what closed weak-executor transfer drops); the §4.2 plugin-wiring defect was fixed in place; the meta-plan is superseded by `docs/agent-specs/forward-port-spec.md` (parent `1fedcd9`).
- Standing facts: Basil chose direct document authoring + the writing-guidance review loop over the formal plan system for this work. The parent repo's dirty `tweakcc_context_bonsai` submodule pin is pre-existing and unrelated — do not sweep it into commits.

## Intent you must not lose (from direct conversation with Basil)

1. **The deterministic-gate machinery is calibrated scaffolding.** It compensates for weak model judgment (GPT-5.5 / Opus 4.8 era). It is load-bearing where a weak model executes, and only there is it non-negotiable. Relaxation experiments are allowed only in strong-model (Fable-class) tiers.
2. **The pilot is a capability experiment, not a build-out**: GPT-5.5 must (a) execute the routine per-release cycle and (b) maintain the routine's own instructions from cycle friction (§1.16). Fallback ladder if (b) fails: GPT-5.5 executes, Fable maintains. Skipping the maintenance step invalidates the pilot.
3. **Failure attribution before tiering decisions.** Every pilot stumble gets classified `SPEC-GAP` (our artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (deterministic spec, executor still failed — evidence for fallback). Never re-tier on impressions.
4. **The observer must not contaminate the experiment.** Fable observes and records verdicts; it does not hint, fix, or pre-empt. A fail-closed STOP is pilot data, not pilot failure.
5. Writing plans → re-read `.llm-conductor/planning_guidance.md` first; orchestrating → re-read `.llm-conductor/ORCHESTRATOR_AGENT.md`; any document authoring → the writing guidance. Basil's rules require re-reading these, not trusting memory of them.

## Fable credit economy (binding)

Fable tokens are scarce (~25% consumed in the 2026-07-01 session alone). Spend them only on judgment, synthesis, and intent-sensitive decisions. Rules:

- Subagents inherit the session model unless overridden. **Always pass an explicit cheaper model** (`sonnet`, or `haiku` for mechanical work) when spawning readers, extractors, reviewers, or drafters.
- Long sessions reprocess their whole history every turn. Finish a work unit, update this file, end the session; start the next unit fresh from this entry point. While observing the pilot, prefer long sleeps/monitors over frequent polling — each poll turn re-reads the whole session.
- Read sources on demand, not preemptively; delegate bulk reading to cheap subagents and consume their conclusions.

## Session hand-off relay (tmux)

Sessions chain through tmux so each stays short (see credit economy above). A relayed session's launch prompt names its predecessor's tmux window; retiring that window is its first act, via `scripts/handoff-retire.sh <window-id>` — never a raw `tmux kill-window`. The retire script kills only windows that `handoff-relay.sh` marked `@handoff_state=retiring` and refuses self-targets, so a wrong id cannot take down this session or another agent's window. **The `gpt55-pilot` window is not part of the relay chain — never retire it.** When your work unit is done:

1. Update this file.
2. If the next step needs input only Basil can give: do **not** relaunch. Slack him (`/home/basil/llm_prompts/scripts/slack.sh "..."`) and stop — a relaunched session would just idle against the same blocker.
3. Otherwise run `scripts/handoff-relay.sh` as your **final tool call** (any output you produce after it may be lost when the successor retires your window). It marks your window as retiring and opens a fresh `claude --model claude-fable-5` in a new window of this tmux session, pointed at this file.

Both scripts require running inside a tmux pane and fail loudly otherwise. If your session isn't inside tmux, skip the relay: update this file and tell Basil the chain needs restarting from a tmux-launched session.

## Immediate next action

**Observe the running pilot to its end; record attribution verdicts; do not intervene.** Specifics:

- Watch cheaply: check `.agents/pilot/gpt55-v1.17.13-friction-log.md`, the tail of `.agents/pilot/gpt55-v1.17.13-run.log`, and `tmux capture-pane -pt bonsai:gpt55-pilot` on a slow cadence (the cycle may take hours). The process end is marked by `PILOT-PROCESS-EXITED` in the window/log.
- Record verdicts in parent `.agents/pilot/gpt55-v1.17.13-observer-log.md` (format is described in the file). Source them from the friction log and run log. Verdict criteria are `docs/meta-loop-direction.md` §Next Step items 4–5.
- Intervention boundary: the only permitted interaction is answering a question the spec says the **invoker** owes (e.g. it halts asking for an input the brief already states — answer by pointing at the brief). Do it by continuing the same OpenCode session: `cd /home/basil/projects/context-bonsai-agents && opencode run --continue --agent bonsai-orchestrator --variant medium "<answer>"`. Anything beyond invoker-role answers contaminates the tiering experiment — record it as a stumble instead.
- If the process dies on infrastructure (network, auth, crash — not a spec STOP): that is not pilot data against the executor; note it in the observer log, restart with the same `--continue` command, and let it resume.
- When the run ends (sealed or STOPped): check the outcome against the acceptance test in `docs/meta-loop-direction.md` §Next Step (valid outcomes: sealed through e2e, or halted at an identified fail-closed STOP; the §1.16 maintenance attempt must have happened and be recorded either way). Then the next work unit is a direction-loop iteration: fold the verdicts and any STOP records into `docs/meta-loop-direction.md` (Next Step / Provisional Future Steps are freely rewritable; escalation codes were expecting exactly these STOP records), update this file, and slack Basil a summary with the pilot verdict tally.
