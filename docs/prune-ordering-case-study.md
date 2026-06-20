# Case study: the post-prune message-ordering bug

## Summary

After a Context Bonsai prune, the next request Claude Code sent to the model API was sometimes rejected with a `400`:

```
messages.N: role 'system' must precede an 'assistant' message or end the array
```

The root cause was the mechanism the Claude Code port uses to hide archived messages. It hides **by identity** — it records the IDs of the messages to remove and removes any message whose ID is on that list. Claude Code inserts auto-generated `system` reminders into each request, regenerated with a fresh random ID every time, so their ID is never on the list. When a prune removed the conversation around such a reminder, the reminder survived and was left stranded in a position the model's API rejects.

The fix is to hide **by position** — remove everything between a range's first and last message, whatever it is — which is how Context Bonsai's original implementation (built for the OpenCode harness) already works. This document records the investigation, including the hypotheses that turned out to be wrong and the evidence that settled each one.

## Background and terms

- **Prune / retrieve.** Prune archives a contiguous range of the conversation and leaves a compact placeholder in its place; retrieve restores it. Archived content is hidden from what the model sees, not deleted.
- **Runtime patch.** Claude Code is closed-source, so the port injects code into its bundled runtime via tweakcc. One injected patch — the *archived filter* — runs just before each request and removes the archived messages from the outgoing request.
- **The seam.** The exact point where the archived filter runs: the in-memory message list, just before Claude Code converts it to the API's message format. At the seam, each message still carries its internal fields: `uuid`, `type`, and `archived` (the last matters later).
- **Marker file.** The port's record of what is archived: `~/.claude/archived-<session-id>.json`, historically a flat list of the archived messages' IDs that the archived filter reads.

## The symptom

The first reproduction came from a real session: a prune succeeded, and the following turn failed with the `400` above. The error is an API rule — in the request's `messages` list, a `system` message must be immediately followed by an `assistant` message or be the final message.

## Methodology: make the API the oracle

Reasoning from the session file about how Claude Code turns the saved conversation into a request proved unreliable: the session file holds the *stored* conversation, not the *transformed* request that goes to the model. Two techniques moved the investigation from argument to evidence:

1. **Capture the real request.** A local forwarding proxy, pointed at via `ANTHROPIC_BASE_URL`, records the exact request body the patched runtime builds and forwards it to the real API. This is the only view of what Claude Code actually sends the model; the session file does not show it. (This technique is documented in `e2e-protocol.md`.)
2. **Replay hand-edited variants.** Taking a captured failing request and replaying edited copies to the real API turns "I think this is the rule" into a response code. The captured `400` body, replayed unchanged, reproduced the `400`; the same body with the stranded `system` message removed returned `200`; with it moved to the end of the array, `200`. That fixed the rule in place and confirmed two viable repairs.

## The investigation, hypothesis by hypothesis

**Hypothesis 1 — "the runtime is unpatched."** An early claim that the patch was not applied rested on a `grep` of the compiled binary (which embeds the bundle compressed, so plaintext searches find nothing), a rising `/context` token count, and an impression that archived content was still visible. None of these were evidence. The patch was applied at the time. (Separately and later, Claude Code auto-updated to a version the patch does not apply to — a real, distinct problem — but it was not the cause of this bug.)

**Hypothesis 2 — "the stranded unit is trailing `turn_duration` telemetry."** The next theory was that pruning split a "turn group," leaving a trailing telemetry row orphaned, and that the fix was to absorb whole turn-groups. The captured request falsified it: `turn_duration` rows are dropped from the request entirely, `local_command` rows map to `user` messages, and the message actually stranded at the failing index was an injected `system` reminder ("The task tools haven't been used recently…"), not telemetry.

**Hypothesis 3 — "the system message survives because it has no UUID."** Also wrong. Extracting the runtime bundle and reading the message factory showed:

```js
uuid: O || (L ? L() : vk.randomUUID())
```

The reminder construction passes neither an explicit ID nor an ID function, so every reminder is stamped with a fresh `crypto.randomUUID()` **on every request**. It is not that the message lacks an ID — its ID is regenerated fresh each request, which guarantees it is never on a marker list captured at prune time. The reminder text also does not appear in the session JSONL at all (a grep returned zero), confirming it is injected at request-build time, not stored.

**Hypothesis 4 — "the marker file was a workaround for flags being unreadable."** The architecture doc notes that the original intent was marker-free, and it was assumed the marker was forced because the runtime could not read per-message state at the seam. The repo history refuted the "forced workaround" framing — the marker was the original design from the first archived-filter story, a pragmatic choice (a UUID set is trivial to read in injected code), with no recorded blocker. A live probe then refuted the "unreadable" premise directly (see *Confirmed mechanism*).

## Root cause

The port hides archived ranges **by ID**: a flat list of the archived messages' IDs, frozen at prune time, against which the filter tests each message. That list can never contain the inserted reminders, whose IDs are regenerated each request. So a reminder sitting inside an archived range survives the filter, and once the conversation messages around it are removed it is left next to the wrong kind of message — the `400`.

The original OpenCode implementation does not have this problem because it removes the archived range **by position** — it removes everything between the range's first and last message, regardless of ID. The Claude Code port diverged to the by-ID approach; this bug is that divergence surfacing.

## Confirmed mechanism

Two captures, taken at the same seam on the real binary, isolate the cause:

- **Unfiltered request:** `system` reminders appear inline at several positions, each `user → system → assistant` (valid), plus one at the array's end (valid).
- **Filtered failing request:** the same `task-tools` reminder now sits at index 4 between two `user` messages — `user → system → user` — which is the `400`. The filter removed the archived `user`/`assistant` turns around it but could not remove the reminder.

The viability of a flag-based fix was then confirmed directly. Prune already writes `archived: true` / `archivedBy` (a per-prune range identifier written onto every message of the same archived range) onto the archived messages. Reading the bundle showed the request-building code keeps fields it does not recognize — it copies each message through, dropping only two named fields and keeping the rest — so those flags should reach the seam. A live probe confirmed it: a build that filtered by `archived === true` instead of by the marker removed exactly the archived messages (identical 14-message result, archived content gone). The flag is readable at the seam.

## Fix direction

Hide by position, driven by the flags already in the transcript — no separate marker file.

- **Filter.** At the seam, group the marked messages by `archivedBy` (which range each belongs to); for each range, remove the whole stretch by position, from its first marked message to its last. This deletes the archived messages and every reminder or other message sitting between them — including the interior reminder that caused the `400`.
- **Boundary repair.** A reminder sitting just *outside* a stretch can be stranded by the removal. After removing the stretches, drop any system reminder left in a position the API rejects. This is safe: the conversation was valid before the prune, so any stranded reminder was created by the removal, and these reminders are regenerated on the next request anyway.
- **Retrieve.** Clear the `archived` / `archivedBy` flags on the range's messages and remove the placeholder. No marker-file cleanup, because there is no marker file. The next request finds no marked messages for that range and removes nothing.

This is captured normatively in `runtime-architecture.md` under "Provider Message Structure and Range Omission."

## Methodology lessons

- **Verify against the real artifact.** The decisive moves were capturing the real request and replaying variants to the real API, and reading the real bundle — not reasoning from the session file or the minified source by eye.
- **A plausible cause is not a confirmed one.** Three successive hypotheses (unpatched runtime, trailing telemetry, missing UUID) were each plausible and each wrong; each was settled only by a capture, a bundle read, or a live probe.
- **Watch the layer boundary.** The session file is the stored conversation; the request is the transformed output sent to the model. Claims about what the model receives must be checked against the request, not the stored file.
