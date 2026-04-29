# CC Bonsai: Chasing Phantom UUIDs Through Claude Code's Message Pipeline

## The Bug

Context compaction lets you archive specific messages in a Claude Code session. The terminal shows message IDs like `[msg:2e4aad26-27be-48bf-9d5e-b28a1c8b0632]` next to each message. You tell the model "compact that message," it calls the tool, and the archived content is replaced with a summary. Simple.

Except it didn't work. The model would see a *different* UUID than the one displayed in your terminal. You'd copy a UUID from the terminal, paste it into the chat, and the model would say "I don't see that ID in my context." It would offer its own UUID instead — one that the compaction tool couldn't find in the session JSONL. Neither side could reference the other's IDs.

## The Investigation

### Wrong Turn 1: The Wrong Session

The first mistake was searching for UUIDs in the wrong session's JSONL file. Multiple Claude Code sessions can run simultaneously in the same project, each with their own JSONL. We spent significant time and money investigating UUID lifecycle behavior based on data from the *current orchestration session* rather than the *session under test*. The UUIDs we couldn't find were right there in the correct file the entire time.

Lesson: always verify which session you're examining. Map PID to session ID via `history.jsonl` before touching any data.

### Wrong Turn 2: I4 and the Cumulative Flag

A teammate (a subagent specializing in CC internals) discovered the `I4()` function, which splits multi-content messages into individual messages for rendering. It has a boolean flag that permanently flips to `true` once any message has multiple content blocks. After that, every message gets a fresh `randomUUID()` instead of keeping its original UUID.

This looked like the smoking gun. The plan was simple: patch I4 to always preserve `A.uuid` instead of generating random ones. Three regex replacements, done.

We wrote a detailed plan, ran four rounds of validation, found and fixed issues with `PatchGroup` enum values and `showDiff` calling conventions. The plan was polished and ready for implementation.

Then the teammate said something that didn't add up.

### The Contradiction

"S5() calls I4() which regenerates UUIDs" — that was the initial claim. But during a deeper dive, the same teammate reported: "S5() does NOT call I4(). I4 is a rendering utility."

These couldn't both be true. So we demanded proof: find every call site of `I4`, trace what `T_1` receives, show the actual code. No theorizing.

The proof was definitive. `I4()` appears at 14 call sites — rendering, MCP events, agent pipelines. Zero in the API path. `S5()` and `I4()` are completely separate functions that process the same conversation state independently.

And here's the twist: **I4 was already preserving UUIDs correctly.** The streaming handler creates messages with `content.length === 1` (one content block per message object). I4's cumulative flag only flips on `content.length > 1`. Since every message already has a single content block, the flag never activates. The `randomUUID()` code path was technically present but never executing.

The entire I4 patch plan — four validation rounds and all — would have changed nothing.

### Finding the Real Culprit: S5's Merge Behavior

With I4 eliminated, the question became: if the display path preserves UUIDs and the API path also preserves UUIDs through S5... where does the mismatch come from?

The answer was in S5's message merging. S5 normalizes the conversation for the Anthropic API. It does two relevant things:

**Attachment merging.** Claude Code represents system reminders, CLAUDE.md contents, file attachments, and other context as `type: "attachment"` messages in the conversation state. S5 converts these into synthetic user messages via `v$()`, which generates new random UUIDs. A reorderer (`s_1()`) places attachments before user messages. Then S5 merges them: the synthetic attachment-user and the real user message become one message via `LY1()`.

`LY1` always uses the first argument as the base: `return {...H, message: {...}}`. The first argument is the synthetic message (it was pushed to the accumulator first). So the synthetic UUID wins, and the real user's JSONL UUID is discarded.

**Assistant block merging.** The streaming handler creates separate message objects for each content block — thinking, text, tool_use — each with a unique UUID, each stored in the JSONL. S5 merges blocks sharing the same API `message.id` back into a single message. The first block's UUID (typically the thinking block) wins. The display shows the text block's UUID. Different UUIDs, same logical message.

### The Model's Own Description of the Problem

The evidence was right there in the terminal capture. After enabling compaction mode (which makes the model see `[msg:...]` tags in its context), we asked the model what the first message's ID was. It said:

> The first user message has the ID msg:84b78a8f-825f-4213-ac7c-bfe73f2a7632. That's the one that contains the system reminders and the user's explanation of the testing protocol.

"System reminders AND the user's explanation" — in one message. That's S5's merge at work. The model sees a single merged message carrying the attachment's synthetic UUID, while the terminal shows the user's real UUID on the user's text.

## The Solution

Once you understand the root cause, the fix is surprisingly small. Two changes:

### 1. Teach LY1 to Prefer Real UUIDs

All synthetic messages created by `v$()` have `isMeta: true`. Real user messages don't. When `LY1` merges a synthetic message with a real one, use the real message as the base instead:

```javascript
let _base = (H.isMeta && !$.isMeta) ? $ : H;
return {..._base, message: {..._base.message, content: snD([...A, ...L])}};
```

When both are real or both are synthetic, behavior is unchanged. Only the synthetic+real case flips the preference. The content stays in the same order — only the UUID on the envelope changes.

### 2. Don't Tag Synthetic Messages

Many `isMeta: true` messages reach the LLM without merging with any real message at all — system reminders at the end of conversation, deferred tool listings, diagnostic notices. These all carry synthetic UUIDs that don't exist in the JSONL. Tagging them with `[msg:<uuid>]` is worse than useless: it gives the model IDs it can't actually use for compaction.

The fix: add `&& !isMeta` to the content injection condition. One extra check in one line.

### What Didn't Need Changing

- **Display patches**: Already correct. I4 preserves JSONL UUIDs.
- **I4 function**: Not involved in the problem at all.
- **Compaction tool**: Already matches against JSONL UUIDs. With the LY1 fix, the content-injected UUIDs *are* JSONL UUIDs.
- **API payload**: T_1, w_1, Z_1 don't read `.uuid`. The API request is completely unaffected by which UUID the merged message carries.

## Reflections

### The Cost of Wrong Assumptions

The I4 investigation wasn't wasted — it taught us the architecture of CC's message pipeline. But the initial claim that "S5 calls I4" sent us down a path that burned through four validation rounds on a plan that would have been a no-op. The correction only came when we demanded code-backed proof instead of accepting architectural claims.

### Two Pipelines, One Source

The key architectural insight is that Claude Code processes conversation state through two completely independent pipelines:

```
                    ┌─ I4() ──→ Renderer ──→ Terminal display
Conversation State ─┤
                    └─ S5() ──→ T_1() ───→ API request
```

These pipelines can (and do) disagree about message identity. The display path shows per-block, per-message UUIDs from the original conversation state. The API path shows merged, coalesced UUIDs from normalized messages. Neither is "wrong" — they serve different purposes. The bug was in assuming they'd agree.

### isMeta: The Hidden Discriminator

The `isMeta` property turned out to be the perfect discriminator between "real" messages that exist in the JSONL and "synthetic" messages that are ephemeral per-request context. Every synthetic message path through `v$()` sets `isMeta: true`. Every real user message doesn't. This property was already there, already semantically meaningful, and already propagated through spreads. We just needed to read it.

### Simplicity as a Compass

The solution went through three iterations:
1. **Patch I4's randomUUID** — wrong target entirely
2. **Annotate `_apiUuid` on conversation state** — correct direction but complex (patch S5, patch I4 to carry it through, patch display to read it, handle timing edge cases)
3. **Fix LY1 merge preference + skip isMeta injection** — two surgical changes that fix the source

Each iteration got simpler as we understood the problem better. The final solution is two patches totaling maybe 20 lines of actual logic. That's usually a sign you've found the right abstraction.
