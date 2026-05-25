import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { getArchivedMarkerPath, markMessagesArchived } from "../src/lib/compact";
import {
  ARCHIVED_FILTER_SENTINEL,
  PATCH_MISSING_ERROR,
  archivedFilterPatchPresentInAny,
  encodeToolResponseMetadata,
  finalizeRetrieveAfterMutation,
  fileContainsSentinel,
  isIdSelectorPattern,
  listContextBonsaiTools,
  loadSearchableMessages,
  routeContextBonsaiTool,
  resolveUniqueBoundary,
  validatePruneArgs,
  validateRetrieveArgs,
} from "./index";

let testDir = "";
let markerPaths: string[] = [];

afterEach(async () => {
  if (testDir) {
    await rm(testDir, { recursive: true, force: true });
    testDir = "";
  }
  for (const markerPath of markerPaths) {
    await rm(markerPath, { force: true });
  }
  markerPaths = [];
});

async function createSession(sessionId: string): Promise<string> {
  const messages = [
    {
      type: "user",
      uuid: "msg-1",
      message: { role: "user", content: "start" },
      timestamp: new Date().toISOString(),
      parentUuid: null,
      sessionId,
    },
    {
      type: "assistant",
      uuid: "msg-2",
      message: { role: "assistant", content: [{ type: "text", text: "end" }] },
      timestamp: new Date().toISOString(),
      parentUuid: "msg-1",
      sessionId,
    },
  ];

  return createSessionWithMessages(sessionId, messages);
}

async function createSessionWithMessages(
  sessionId: string,
  messages: Array<Record<string, unknown>>
): Promise<string> {
  testDir = join(tmpdir(), `mcp-server-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  const sessionPath = join(testDir, `${sessionId}.jsonl`);
  await writeFile(sessionPath, `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`, "utf-8");
  return sessionPath;
}

describe("context-bonsai-v2 validation", () => {
  test("rejects ID selector patterns", () => {
    expect(isIdSelectorPattern("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isIdSelectorPattern("[msg:123e4567-e89b-12d3-a456-426614174000]")).toBe(true);
    expect(isIdSelectorPattern("id:abc")).toBe(true);
    expect(isIdSelectorPattern("visible boundary pattern")).toBe(false);
  });

  test("requires non-empty summary and index_terms", () => {
    const result = validatePruneArgs({
      from_pattern: "start",
      to_pattern: "end",
      summary: "   ",
      index_terms: ["topic"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Error: prune requires from_pattern, to_pattern, summary, and index_terms."
      );
    }
  });

  test("rejects ID selector fields on prune", () => {
    const result = validatePruneArgs({
      from_pattern: "start",
      to_pattern: "end",
      summary: "done",
      index_terms: ["topic"],
      from_id: "abc",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Error: ID selectors are not supported. Use from_pattern and to_pattern only."
      );
    }
  });

  test("resolveUniqueBoundary enforces unique match", () => {
    const messages = [
      { index: 0, uuid: "a", text: "alpha task" },
      { index: 1, uuid: "b", text: "beta task" },
      { index: 2, uuid: "c", text: "beta followup" },
    ];

    expect(resolveUniqueBoundary(messages, "alpha", "from")).toBe(0);

    expect(() => resolveUniqueBoundary(messages, "missing", "from")).toThrow(
      "Error: from_pattern did not match any message."
    );

    expect(() => resolveUniqueBoundary(messages, "beta", "to")).toThrow(
      "Error: to_pattern matched multiple messages. Provide a more specific pattern."
    );
  });

  test("retrieve args accept anchor_id only", () => {
    expect(validateRetrieveArgs({ anchor_id: "abc" })).toEqual({ ok: true, anchorId: "abc" });

    const invalid = validateRetrieveArgs({ anchor_id: "abc", extra: "nope" } as any);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error).toBe("Error: retrieve requires only anchor_id.");
    }
  });

  test("prune prewrite path does not mutate marker state", async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = await createSession(sessionId);
    const markerPath = getArchivedMarkerPath(sessionId);
    markerPaths.push(markerPath);

    await rm(markerPath, { force: true });
    await markMessagesArchived(sessionPath, "msg-1", "msg-2", "summary-uuid", { skipWrite: true });

    expect(await Bun.file(markerPath).exists()).toBe(false);
  });

  test("retrieve post-mutation cleanup failure still reports success", async () => {
    const restoredText = "[user anchor-123]\nrestored body";
    const response = await finalizeRetrieveAfterMutation(
      "anchor-123",
      "anchor-456",
      "placeholder body",
      async () => {
      throw new Error("simulated cleanup failure");
      },
      restoredText
    );

    const text = response.content[0]?.text ?? "";
    const metadataBlock = text.match(/<context-bonsai-tool-response encoding="base64">([^<]+)<\/context-bonsai-tool-response>/);

    expect(text).toContain(`Restored content:\n${restoredText}`);
    expect(metadataBlock).not.toBeNull();
    expect(JSON.parse(Buffer.from(metadataBlock![1], "base64").toString("utf8"))).toEqual({
      op: "retrieve",
      anchor_id: "anchor-123",
      range_end_id: "anchor-456",
      placeholder_text: "placeholder body",
    });
    expect(response).toEqual({
      content: [
        {
          type: "text",
          text:
            `Retrieve complete. anchor_id=anchor-123\nRestored content:\n${restoredText}\n` +
            encodeToolResponseMetadata({
              op: "retrieve",
              anchor_id: "anchor-123",
              range_end_id: "anchor-456",
              placeholder_text: "placeholder body",
            }),
        },
      ],
    });
  });

  test("encodes prune/retrieve success metadata in tagged base64 blocks", () => {
    const block = encodeToolResponseMetadata({
      op: "prune",
      anchor_id: "anchor-1",
      range_end_id: "anchor-9",
      placeholder_text: "[ARCHIVED RANGE anchor-1..anchor-9]",
    });

    const match = block.match(
      /^<context-bonsai-tool-response encoding="base64">([A-Za-z0-9+/=]+)<\/context-bonsai-tool-response>$/
    );
    expect(match).not.toBeNull();

    const encoded = match?.[1];
    expect(encoded).toBeDefined();

    const decoded = JSON.parse(Buffer.from(encoded as string, "base64").toString("utf8"));
    expect(decoded).toEqual({
      op: "prune",
      anchor_id: "anchor-1",
      range_end_id: "anchor-9",
      placeholder_text: "[ARCHIVED RANGE anchor-1..anchor-9]",
    });
  });

  test("runtime lists only prune and retrieve tools", () => {
    const tools = listContextBonsaiTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "context-bonsai-prune",
      "context-bonsai-retrieve",
    ]);
  });
});

describe("patch-presence guard", () => {
  test("scans native ELF-shaped executable bytes for the archived-filter sentinel", async () => {
    testDir = join(tmpdir(), `mcp-server-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    const nativePath = join(testDir, "claude-native");
    await writeFile(nativePath, Buffer.concat([
      Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x00, 0x01]),
      Buffer.from(`bundle ${ARCHIVED_FILTER_SENTINEL} tail`, "utf8"),
    ]));

    expect(await fileContainsSentinel(nativePath, ARCHIVED_FILTER_SENTINEL)).toBe(true);
    expect(await archivedFilterPatchPresentInAny([nativePath])).toBe(true);
  });

  test("scans npm cli.js text for the archived-filter sentinel", async () => {
    testDir = join(tmpdir(), `mcp-server-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    const cliPath = join(testDir, "cli.js");
    await writeFile(cliPath, `#!/usr/bin/env node\n${ARCHIVED_FILTER_SENTINEL}\n`, "utf8");

    expect(await fileContainsSentinel(cliPath, ARCHIVED_FILTER_SENTINEL)).toBe(true);
    expect(await archivedFilterPatchPresentInAny([cliPath])).toBe(true);
  });

  test("returns false when the sentinel is absent", async () => {
    testDir = join(tmpdir(), `mcp-server-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    const cliPath = join(testDir, "cli.js");
    await writeFile(cliPath, "#!/usr/bin/env node\nconsole.log('stock claude');\n", "utf8");

    expect(await fileContainsSentinel(cliPath, ARCHIVED_FILTER_SENTINEL)).toBe(false);
    expect(await archivedFilterPatchPresentInAny([cliPath])).toBe(false);
  });

  test("prune fails closed before marker or JSONL writes when patch sentinel is absent", async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = await createSession(sessionId);
    const markerPath = getArchivedMarkerPath(sessionId);
    markerPaths.push(markerPath);
    const before = await Bun.file(sessionPath).text();
    await rm(markerPath, { force: true });

    const response = await routeContextBonsaiTool(
      "context-bonsai-prune",
      {
        from_pattern: "start",
        to_pattern: "end",
        summary: "summary",
        index_terms: ["topic"],
      },
      {
        discoverSessionPath: async () => sessionPath,
        assertArchivedFilterPatchPresent: async () => false,
      }
    );

    expect(response).toEqual({ content: [{ type: "text", text: PATCH_MISSING_ERROR }] });
    expect(await Bun.file(sessionPath).text()).toBe(before);
    expect(await Bun.file(markerPath).exists()).toBe(false);
  });

  test("prune proceeds when patch sentinel is present", async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = await createSession(sessionId);
    const markerPath = getArchivedMarkerPath(sessionId);
    markerPaths.push(markerPath);
    await rm(markerPath, { force: true });

    const response = await routeContextBonsaiTool(
      "context-bonsai-prune",
      {
        from_pattern: "start",
        to_pattern: "end",
        summary: "summary",
        index_terms: ["topic"],
      },
      {
        discoverSessionPath: async () => sessionPath,
        assertArchivedFilterPatchPresent: async () => true,
      }
    );

    expect(response.content[0]?.text).toContain("Prune complete. anchor_id=msg-1");
    expect(await Bun.file(markerPath).json()).toEqual(["msg-1", "msg-2"]);
  });
});

describe("prune call filtering", () => {
  test("resolves to one non-wrapper candidate among wrapper candidates", () => {
    const messages = [
      { index: 0, uuid: "a", text: "shared boundary", hasPruneToolUse: true },
      { index: 1, uuid: "b", text: "shared boundary" },
      { index: 2, uuid: "c", text: "shared boundary", hasPruneToolUse: true },
    ];

    expect(resolveUniqueBoundary(messages, "shared boundary", "from")).toBe(1);
  });

  test("throws ambiguity when multiple non-wrapper candidates remain", () => {
    const messages = [
      { index: 0, uuid: "a", text: "shared boundary", hasPruneToolUse: true },
      { index: 1, uuid: "b", text: "shared boundary" },
      { index: 2, uuid: "c", text: "shared boundary" },
    ];

    expect(() => resolveUniqueBoundary(messages, "shared boundary", "to")).toThrow(
      "Error: to_pattern matched multiple messages. Provide a more specific pattern."
    );
  });

  test("throws ambiguity when only wrapper candidates match", () => {
    const messages = [
      { index: 0, uuid: "a", text: "shared boundary", hasPruneToolUse: true },
      { index: 1, uuid: "b", text: "shared boundary", hasPruneToolUse: true },
    ];

    expect(() => resolveUniqueBoundary(messages, "shared boundary", "from")).toThrow(
      "Error: from_pattern matched multiple messages. Provide a more specific pattern."
    );
  });

  test("returns a single match without filtering", () => {
    const messages = [
      { index: 0, uuid: "a", text: "shared boundary", hasPruneToolUse: true },
      { index: 1, uuid: "b", text: "different boundary" },
    ];

    expect(resolveUniqueBoundary(messages, "shared boundary", "from")).toBe(0);
  });
});

describe("loadSearchableMessages prune tool detection", () => {
  test("flags Claude Code MCP prune tool-use wrappers", async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = await createSessionWithMessages(sessionId, [
      {
        type: "assistant",
        uuid: "msg-prune",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu-prune-1",
              name: "mcp__context-bonsai__context-bonsai-prune",
              input: { from_pattern: "shared boundary" },
            },
          ],
        },
        timestamp: new Date().toISOString(),
        parentUuid: null,
        sessionId,
      },
    ]);

    const messages = await loadSearchableMessages(sessionPath);

    expect(messages[0]?.hasPruneToolUse).toBe(true);
  });

  test("flags bare compatibility prune tool-use wrappers", async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = await createSessionWithMessages(sessionId, [
      {
        type: "assistant",
        uuid: "msg-prune",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu-prune-2",
              name: "context-bonsai-prune",
              input: { from_pattern: "shared boundary" },
            },
          ],
        },
        timestamp: new Date().toISOString(),
        parentUuid: null,
        sessionId,
      },
    ]);

    const messages = await loadSearchableMessages(sessionPath);

    expect(messages[0]?.hasPruneToolUse).toBe(true);
  });

  test("does not flag non-prune assistant tool-use wrappers", async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = await createSessionWithMessages(sessionId, [
      {
        type: "assistant",
        uuid: "msg-other-tool",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu-other",
              name: "context-bonsai-retrieve",
              input: { anchor_id: "anchor-1" },
            },
          ],
        },
        timestamp: new Date().toISOString(),
        parentUuid: null,
        sessionId,
      },
    ]);

    const messages = await loadSearchableMessages(sessionPath);

    expect(messages[0]?.hasPruneToolUse).toBe(false);
  });

  test("does not flag user tool-result-only messages", async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = await createSessionWithMessages(sessionId, [
      {
        type: "user",
        uuid: "msg-result",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu-prune-1",
              content: "context-bonsai-prune output with shared boundary",
            },
          ],
        },
        timestamp: new Date().toISOString(),
        parentUuid: null,
        sessionId,
      },
    ]);

    const messages = await loadSearchableMessages(sessionPath);

    expect(messages[0]?.hasPruneToolUse).toBe(false);
  });
});
