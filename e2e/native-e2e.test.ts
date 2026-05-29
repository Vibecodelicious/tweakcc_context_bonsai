import { describe, expect, test } from "bun:test";
import { analyzePruneEffect } from "./native-e2e";

type Row = Record<string, unknown>;

// Match the REAL runtime archival shape: markMessagesArchived sets a TOP-LEVEL
// `archived: true` (+ archivedAt/archivedBy) on each user/assistant row in the
// range (src/lib/compact.ts), and addArchivedMarkerEntries persists the archived
// UUIDs to ~/.claude/archived-<sessionId>.json. It does NOT set a per-row
// `context_bonsai_v2.archived` field — only the anchor row carries
// `context_bonsai_v2` (anchor metadata) and the placeholder summary carries
// `context_bonsai_v2.anchor_id`.
function userRow(uuid: string, text: string, archived = false): Row {
  return {
    type: "user",
    uuid,
    ...(archived ? { archived: true, archivedAt: "2026-05-29T00:00:00Z", archivedBy: "s1" } : {}),
    message: { role: "user", content: text },
  };
}

function assistantRow(uuid: string, text: string, archived = false): Row {
  return {
    type: "assistant",
    uuid,
    ...(archived ? { archived: true, archivedAt: "2026-05-29T00:00:00Z", archivedBy: "s1" } : {}),
    message: { role: "assistant", content: [{ type: "text", text }] },
  };
}

// The anchor row additionally carries context_bonsai_v2 (anchor metadata) AND the
// top-level archived flag (it is within the range).
function anchorRow(uuid: string, text: string, rangeEndId: string): Row {
  return {
    type: "user",
    uuid,
    archived: true,
    archivedAt: "2026-05-29T00:00:00Z",
    archivedBy: "s1",
    context_bonsai_v2: { archived: true, summary_uuid: "s1", range_end_id: rangeEndId },
    message: { role: "user", content: text },
  };
}

function placeholderRow(uuid: string, anchorId: string, rangeEndId: string): Row {
  return {
    type: "summary",
    uuid,
    summary: `[ARCHIVED RANGE ${anchorId}..${rangeEndId}] short`,
    context_bonsai_v2: { anchor_id: anchorId, range_end_id: rangeEndId },
  };
}

describe("analyzePruneEffect — model-visible content removal oracle", () => {
  const pre: Row[] = [
    userRow("u1", "ALPHA boundary establishing the topic to archive"),
    assistantRow("a1", "long middle body content that should be archived and hidden"),
    userRow("u2", "OMEGA boundary ending the archived range"),
    assistantRow("a2", "tail content that stays visible after the prune"),
  ];

  test("PASS via top-level `archived` flag: range hidden, placeholder present, footprint drops", () => {
    const post: Row[] = [
      anchorRow("u1", "ALPHA boundary establishing the topic to archive", "u2"),
      assistantRow("a1", "long middle body content that should be archived and hidden", true),
      userRow("u2", "OMEGA boundary ending the archived range", true),
      placeholderRow("s1", "u1", "u2"),
      assistantRow("a2", "tail content that stays visible after the prune"),
    ];

    const result = analyzePruneEffect(pre, post, "u1", "u2");
    expect(result.verdict).toBe("PASS");
    expect(result.archivedRangeVisiblePost).toBe(false);
    expect(result.placeholderPresentPost).toBe(true);
    expect(result.footprintDropped).toBe(true);
    expect(result.rangeVisibleCharsPost).toBeLessThan(result.rangeVisibleCharsPre);
    expect(result.rangeVisibleCharsPost).toBe(0);
  });

  test("PASS via marker file: rows lack the top-level flag but are in the marker set", () => {
    // Some runtime paths/snapshots may not stamp the top-level flag on every row,
    // but the marker file is the authoritative hide-list the archived-filter reads.
    const post: Row[] = [
      // Anchor still carries context_bonsai_v2 + summary placeholder anchored to it,
      // but NO top-level `archived` flag here — only the marker set marks the range.
      { type: "user", uuid: "u1", context_bonsai_v2: { archived: true, summary_uuid: "s1", range_end_id: "u2" }, message: { role: "user", content: "ALPHA boundary establishing the topic to archive" } },
      assistantRow("a1", "long middle body content that should be archived and hidden"),
      userRow("u2", "OMEGA boundary ending the archived range"),
      placeholderRow("s1", "u1", "u2"),
      assistantRow("a2", "tail content that stays visible after the prune"),
    ];
    const postMarker = new Set(["u1", "a1", "u2"]);

    const result = analyzePruneEffect(pre, post, "u1", "u2", new Set(), postMarker);
    expect(result.verdict).toBe("PASS");
    expect(result.archivedRangeVisiblePost).toBe(false);
    expect(result.placeholderPresentPost).toBe(true);
    expect(result.footprintDropped).toBe(true);
  });

  test("FAIL: bug shape — prune reported success but archived nothing (content remains)", () => {
    // Reproduces the pre-fix experience: post == pre, no archived flag, no marker, no placeholder.
    const post: Row[] = pre.map((row) => ({ ...row }));

    const result = analyzePruneEffect(pre, post, "u1", "u2");
    expect(result.verdict).toBe("FAIL");
    expect(result.archivedRangeVisiblePost).toBe(true);
    expect(result.footprintDropped).toBe(false);
  });

  test("FAIL: archived flags set but no placeholder summary anchored at fromUuid", () => {
    const post: Row[] = [
      userRow("u1", "ALPHA boundary establishing the topic to archive", true),
      assistantRow("a1", "long middle body content that should be archived and hidden", true),
      userRow("u2", "OMEGA boundary ending the archived range", true),
      assistantRow("a2", "tail content that stays visible after the prune"),
    ];

    const result = analyzePruneEffect(pre, post, "u1", "u2");
    expect(result.verdict).toBe("FAIL");
    expect(result.placeholderPresentPost).toBe(false);
  });

  test("BLOCKED: pre-prune session does not contain the from..to range", () => {
    const result = analyzePruneEffect(pre, pre, "missing-from", "missing-to");
    expect(result.verdict).toBe("BLOCKED");
    expect(result.archivedRangePresentPre).toBe(false);
  });
});
