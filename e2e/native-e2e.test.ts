import { describe, expect, test } from "bun:test";
import { analyzePruneEffect } from "./native-e2e";

type Row = Record<string, unknown>;

function userRow(uuid: string, text: string, archived = false): Row {
  return {
    type: "user",
    uuid,
    ...(archived ? { context_bonsai_v2: { archived: true } } : {}),
    message: { role: "user", content: text },
  };
}

function assistantRow(uuid: string, text: string, archived = false): Row {
  return {
    type: "assistant",
    uuid,
    ...(archived ? { context_bonsai_v2: { archived: true } } : {}),
    message: { role: "assistant", content: [{ type: "text", text }] },
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

  test("PASS: archived range hidden, placeholder present, footprint drops", () => {
    const post: Row[] = [
      userRow("u1", "ALPHA boundary establishing the topic to archive", true),
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
    expect(result.postVisibleFootprintChars).toBeLessThan(result.preVisibleFootprintChars);
  });

  test("FAIL: bug shape — prune reported success but archived nothing (content remains)", () => {
    // Reproduces the pre-fix experience: post == pre, no archived flags, no placeholder.
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
