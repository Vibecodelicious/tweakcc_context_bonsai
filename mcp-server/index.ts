#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createReadStream } from "fs";
import { rename, writeFile } from "fs/promises";
import { readlink } from "fs/promises";
import { findCurrentSession, findSessionPath, readSessionMessages } from "../src/lib/session";
import { addArchivedMarkerEntries, markMessagesArchived, retrieveSession } from "../src/lib/compact";
import type { SessionMessage, CompactMetadata } from "../src/types";

export const ARCHIVED_FILTER_SENTINEL = "/*cb:archived-filter:v1*/";
const COMPATIBILITY_ERROR = "Compatibility error: unable to access active session.";
export const PATCH_MISSING_ERROR =
  'Error: Context Bonsai archived-filter patch is not present in the running Claude Code executable. Run "cd tweakcc_context_bonsai && bun run apply" to re-apply the patches, then retry prune.';
const MATCHER_AMBIGUOUS_FROM =
  "Error: from_pattern matched multiple messages. Provide a more specific pattern.";
const MATCHER_AMBIGUOUS_TO =
  "Error: to_pattern matched multiple messages. Provide a more specific pattern.";
const MATCHER_UNRESOLVED_FROM = "Error: from_pattern did not match any message.";
const MATCHER_UNRESOLVED_TO = "Error: to_pattern did not match any message.";
const MATCHER_ORDER_ERROR =
  "Error: from_pattern must resolve to a message that appears before or equal to to_pattern.";
const ID_SELECTOR_ERROR =
  "Error: ID selectors are not supported. Use from_pattern and to_pattern only.";
const PRUNE_ARG_ERROR =
  "Error: prune requires from_pattern, to_pattern, summary, and index_terms.";
const RETRIEVE_ARG_ERROR = "Error: retrieve requires only anchor_id.";
const RETRIEVE_NOT_FOUND = "Error: anchor_id not found.";
const RETRIEVE_NOT_ARCHIVED = "Error: anchor_id is not archived.";
interface SearchableMessage {
  index: number;
  uuid: string;
  text: string;
  hasPruneToolUse?: boolean;
}

interface AnchorArchiveMetadata {
  archived: true;
  summary_uuid: string;
  range_end_id: string;
  summary: string;
  index_terms: string[];
  reason?: string;
}

interface PruneArgs {
  from_pattern?: unknown;
  to_pattern?: unknown;
  summary?: unknown;
  index_terms?: unknown;
  reason?: unknown;
  from_id?: unknown;
  to_id?: unknown;
  id?: unknown;
  anchor_id?: unknown;
}

interface RetrieveArgs {
  anchor_id?: unknown;
}

interface ClaudeProcessContext {
  pid: string;
  sessionId: string;
  cwd?: string;
}

// Injectable seam over the three /proc primitives the discovery layer needs.
// The default reads real /proc; tests pass synthetic process trees so discovery
// can be exercised without a live Claude process. Mirrors the PruneDependencies
// injection pattern used for prune.
export interface ProcReader {
  readParentPid: (pid: string) => Promise<string | null>;
  readCmdline: (pid: string) => Promise<string[]>;
  readExeLink: (pid: string) => Promise<string | null>;
}

const defaultProcReader: ProcReader = {
  readParentPid,
  async readCmdline(pid: string): Promise<string[]> {
    try {
      return splitProcCmdline(await Bun.file(`/proc/${pid}/cmdline`).text());
    } catch {
      return [];
    }
  },
  async readExeLink(pid: string): Promise<string | null> {
    try {
      return await readlink(`/proc/${pid}/exe`);
    } catch {
      return null;
    }
  },
};

interface PruneDependencies {
  discoverSessionPath: () => Promise<string>;
  assertArchivedFilterPatchPresent: () => Promise<boolean>;
}

interface ToolResponseMetadata {
  op: "prune" | "retrieve";
  anchor_id: string;
  range_end_id: string;
  placeholder_text: string;
}

// MCP CallToolResult shape (narrowed to the text-block content this server
// emits). isError is optional and MUST be set on deterministic failures/refusals
// so the host does not render them as completed, successful tool calls. It is
// never set on success. The index signature keeps this assignable to the SDK's
// CallToolResult (which carries one) at the request-handler boundary.
interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

function isUuidPattern(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isIdSelectorPattern(value: string): boolean {
  const trimmed = value.trim();
  if (isUuidPattern(trimmed)) {
    return true;
  }

  if (/^\[?msg:[^\]]+\]?$/i.test(trimmed)) {
    return true;
  }

  return /^id:[^\s]+$/i.test(trimmed);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeIndexTerms(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const terms = value
    .map((term) => (typeof term === "string" ? term.trim() : ""))
    .filter((term) => term.length > 0);

  if (terms.length === 0) {
    return null;
  }

  return terms;
}

function plainText(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

// Deterministic failure/refusal result. The body stays plain text (per the
// shared spec Output rules); isError:true governs only the host's error channel
// so a refusal is never presented as a successful operation (Defect B).
function errorResult(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export function encodeToolResponseMetadata(metadata: ToolResponseMetadata): string {
  const encoded = Buffer.from(JSON.stringify(metadata), "utf8").toString("base64");
  return `<context-bonsai-tool-response encoding="base64">${encoded}</context-bonsai-tool-response>`;
}

async function readParentPid(pid: string): Promise<string | null> {
  try {
    const stat = await Bun.file(`/proc/${pid}/stat`).text();
    const end = stat.lastIndexOf(")");
    if (end === -1) {
      return null;
    }

    const fields = stat.slice(end + 2).split(" ");
    return fields[1] && !Number.isNaN(Number(fields[1])) ? fields[1] : null;
  } catch {
    return null;
  }
}

function splitProcCmdline(cmdline: string): string[] {
  return cmdline.split("\0").filter((part) => part.length > 0);
}

function sessionIdFromArgv(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--resume" || arg === "resume") {
      const next = argv[i + 1];
      if (next && /^[a-f0-9-]+$/i.test(next)) {
        return next;
      }
    }

    const inline = arg?.match(/^--resume=(?<sessionId>[a-f0-9-]+)$/i);
    if (inline?.groups?.sessionId) {
      return inline.groups.sessionId;
    }
  }

  return null;
}

export async function findClaudeProcessContext(
  proc: ProcReader = defaultProcReader
): Promise<ClaudeProcessContext | null> {
  let currentPid = String(process.pid);

  for (let depth = 0; depth < 10; depth += 1) {
    const parentPid = await proc.readParentPid(currentPid);
    if (!parentPid || parentPid === "0" || parentPid === "1") {
      break;
    }

    const argv = await proc.readCmdline(parentPid);

    const sessionId = sessionIdFromArgv(argv);
    if (sessionId) {
      let cwd: string | undefined;
      try {
        cwd = await readlink(`/proc/${parentPid}/cwd`);
      } catch {
        cwd = undefined;
      }

      return { pid: parentPid, sessionId, cwd };
    }

    currentPid = parentPid;
  }

  return null;
}

// Defect A fix: identify the running Claude binary by the authoritative signal —
// each ancestor's /proc/<pid>/exe link — walking from the MCP server pid up to
// pid 1, independent of --resume or argv[0] naming. The exe link of the real
// Claude process resolves directly to the running binary even when it is a
// version-named native binary launched directly (argv[0] = the versioned path),
// where argv-name matching ("claude"/"cli.js"/"@anthropic-ai/claude-code")
// fails. This mirrors the launch-shape-independent ancestor walk already used by
// discoverSessionPath (its cwd-based session fallback).
//
// Only exe-of-ancestor paths are returned. argv-derived candidates (e.g. a path
// ending in cli.js read out of cmdline) are deliberately excluded: a stale or
// unrelated patched cli.js on disk could otherwise satisfy the guard while a
// different, unpatched binary is actually running — a dangerous false-positive.
export async function resolveRunningClaudeExecutableCandidates(
  proc: ProcReader = defaultProcReader
): Promise<string[]> {
  const candidates: string[] = [];
  let currentPid = String(process.pid);

  for (let depth = 0; depth < 12; depth += 1) {
    const parentPid = await proc.readParentPid(currentPid);
    if (!parentPid || parentPid === "0" || parentPid === "1") {
      break;
    }

    const exe = await proc.readExeLink(parentPid);
    if (exe) {
      candidates.push(exe);
    }

    currentPid = parentPid;
  }

  return [...new Set(candidates)];
}

export async function fileContainsSentinel(path: string, sentinel: string): Promise<boolean> {
  const needle = Buffer.from(sentinel, "utf8");
  let carry = Buffer.alloc(0);

  return await new Promise<boolean>((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => {
      const buffer = Buffer.concat([carry, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      if (buffer.includes(needle)) {
        stream.destroy();
        resolvePromise(true);
        return;
      }

      carry = buffer.subarray(Math.max(0, buffer.length - needle.length + 1));
    });
    stream.on("error", reject);
    stream.on("close", () => resolvePromise(false));
    stream.on("end", () => resolvePromise(false));
  });
}

export async function archivedFilterPatchPresentInAny(paths: string[]): Promise<boolean> {
  for (const path of paths) {
    try {
      if (await fileContainsSentinel(path, ARCHIVED_FILTER_SENTINEL)) {
        return true;
      }
    } catch {
      // Try the next candidate; unreadable candidates are treated as absent.
    }
  }

  return false;
}

export async function assertRunningClaudeHasArchivedFilterPatch(
  proc: ProcReader = defaultProcReader
): Promise<boolean> {
  const candidates = await resolveRunningClaudeExecutableCandidates(proc);
  if (candidates.length === 0) {
    // Fail closed: no ancestor binary could be identified.
    return false;
  }

  return archivedFilterPatchPresentInAny(candidates);
}

function successResponse(text: string, metadata: ToolResponseMetadata): ToolResult {
  return plainText(`${text}\n${encodeToolResponseMetadata(metadata)}`);
}

function messageUuid(message: SessionMessage): string | null {
  const maybeUuid = (message as { uuid?: unknown }).uuid;
  return typeof maybeUuid === "string" && maybeUuid.length > 0 ? maybeUuid : null;
}

function flattenUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenUnknown(item)).join(" ");
  }

  if (typeof value === "object") {
    const fields = Object.values(value as Record<string, unknown>);
    return fields.map((field) => flattenUnknown(field)).join(" ");
  }

  return String(value);
}

function searchableText(message: SessionMessage): string {
  if (message.type === "user") {
    return flattenUnknown(message.message?.content);
  }

  if (message.type === "assistant") {
    return flattenUnknown(message.message?.content);
  }

  if (message.type === "summary") {
    return message.summary;
  }

  return "";
}

function hasPruneToolUse(message: SessionMessage): boolean {
  if (message.type !== "assistant") {
    return false;
  }

  const content = (message as { message?: { content?: unknown } }).message?.content;
  if (!Array.isArray(content)) {
    return false;
  }

  return content.some((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) {
      return false;
    }

    const candidate = block as { type?: unknown; name?: unknown };
    // Keep these Claude MCP and local compatibility names in sync with prune tool wrappers.
    return (
      candidate.type === "tool_use" &&
      (candidate.name === "mcp__context-bonsai__context-bonsai-prune" ||
        candidate.name === "context-bonsai-prune")
    );
  });
}

export async function loadSearchableMessages(sessionPath: string): Promise<SearchableMessage[]> {
  const output: SearchableMessage[] = [];
  let index = 0;

  for await (const message of readSessionMessages(sessionPath)) {
    const uuid = messageUuid(message);
    if (!uuid) {
      continue;
    }

    output.push({
      index,
      uuid,
      text: searchableText(message),
      hasPruneToolUse: hasPruneToolUse(message),
    });
    index += 1;
  }

  return output;
}

export function resolveUniqueBoundary(
  messages: SearchableMessage[],
  pattern: string,
  side: "from" | "to"
): number {
  const matches: number[] = [];

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    if (message && message.text.includes(pattern)) {
      matches.push(i);
    }
  }

  if (matches.length > 1) {
    const nonWrapperMatches = matches.filter((i) => !messages[i]?.hasPruneToolUse);
    if (nonWrapperMatches.length === 1) {
      return nonWrapperMatches[0]!;
    }
  }

  if (matches.length === 1) {
    return matches[0] as number;
  }

  if (side === "from") {
    throw new Error(matches.length === 0 ? MATCHER_UNRESOLVED_FROM : MATCHER_AMBIGUOUS_FROM);
  }

  throw new Error(matches.length === 0 ? MATCHER_UNRESOLVED_TO : MATCHER_AMBIGUOUS_TO);
}

async function discoverSessionPath(): Promise<string> {
  const claudeProcess = await findClaudeProcessContext();
  if (claudeProcess) {
    return await findSessionPath(claudeProcess.sessionId);
  }

  let currentPid = String(process.pid);

  for (let depth = 0; depth < 10; depth += 1) {
    const parentPid = await readParentPid(currentPid);
    if (!parentPid || parentPid === "0" || parentPid === "1") {
      break;
    }

    try {
      const cwd = await readlink(`/proc/${parentPid}/cwd`);
      const current = await findCurrentSession(cwd);
      if (current) {
        return await findSessionPath(current.sessionId);
      }
    } catch {
      // Try the next ancestor.
    }

    currentPid = parentPid;
  }

  throw new Error(COMPATIBILITY_ERROR);
}

async function writeJsonlAtomic(sessionPath: string, messages: SessionMessage[]): Promise<void> {
  const tempPath = `${sessionPath}.bonsai.tmp`;
  const body = `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`;
  await writeFile(tempPath, body, "utf-8");
  await rename(tempPath, sessionPath);
}

function buildPlaceholder(
  fromUuid: string,
  toUuid: string,
  summary: string,
  indexTerms: string[]
): string {
  return [
    `[ARCHIVED RANGE ${fromUuid}..${toUuid}]`,
    `Summary: ${summary}`,
    `Index terms: ${indexTerms.join(", ")}`,
  ].join("\n");
}

async function loadAllMessages(sessionPath: string): Promise<SessionMessage[]> {
  const output: SessionMessage[] = [];
  for await (const message of readSessionMessages(sessionPath)) {
    output.push(message);
  }
  return output;
}

export async function finalizeRetrieveAfterMutation(
  anchorId: string,
  rangeEndId: string,
  placeholderText: string,
  clearAnchorMetadata: () => Promise<void>,
  restoredText?: string
): Promise<ToolResult> {
  try {
    await clearAnchorMetadata();
  } catch {
    // no-op
  }

  const text = restoredText
    ? `Retrieve complete. anchor_id=${anchorId}\nRestored content:\n${restoredText}`
    : `Retrieve complete. anchor_id=${anchorId}`;
  return successResponse(text, {
    op: "retrieve",
    anchor_id: anchorId,
    range_end_id: rangeEndId,
    placeholder_text: placeholderText,
  });
}

function renderRetrievedMessages(messages: SessionMessage[]): string {
  return messages
    .filter((message) => message.type === "user" || message.type === "assistant")
    .map((message) => `[${message.type} ${messageUuid(message) ?? "unknown"}]\n${searchableText(message)}`)
    .join("\n\n");
}

export function validatePruneArgs(args: PruneArgs):
  | {
      ok: true;
      fromPattern: string;
      toPattern: string;
      summary: string;
      indexTerms: string[];
      reason?: string;
    }
  | { ok: false; error: string } {
  if (
    args.from_id !== undefined ||
    args.to_id !== undefined ||
    args.id !== undefined ||
    args.anchor_id !== undefined
  ) {
    return { ok: false, error: ID_SELECTOR_ERROR };
  }

  const fromPattern = asTrimmedString(args.from_pattern);
  const toPattern = asTrimmedString(args.to_pattern);
  const summary = asTrimmedString(args.summary);
  const indexTerms = normalizeIndexTerms(args.index_terms);

  if (!fromPattern || !toPattern || !summary || !indexTerms) {
    return { ok: false, error: PRUNE_ARG_ERROR };
  }

  if (isIdSelectorPattern(fromPattern) || isIdSelectorPattern(toPattern)) {
    return { ok: false, error: ID_SELECTOR_ERROR };
  }

  const reason = asTrimmedString(args.reason);
  return {
    ok: true,
    fromPattern,
    toPattern,
    summary,
    indexTerms,
    reason: reason ?? undefined,
  };
}

async function handlePruneContext(
  args: PruneArgs,
  deps: PruneDependencies = {
    discoverSessionPath,
    assertArchivedFilterPatchPresent: assertRunningClaudeHasArchivedFilterPatch,
  }
): Promise<ToolResult> {
  const validated = validatePruneArgs(args);
  if (!validated.ok) {
    return errorResult(validated.error);
  }

  if (!(await deps.assertArchivedFilterPatchPresent())) {
    return errorResult(PATCH_MISSING_ERROR);
  }

  let sessionPath: string;
  try {
    sessionPath = await deps.discoverSessionPath();
  } catch {
    return errorResult(COMPATIBILITY_ERROR);
  }

  let searchable: SearchableMessage[];
  try {
    searchable = await loadSearchableMessages(sessionPath);
  } catch {
    return errorResult(COMPATIBILITY_ERROR);
  }

  let fromIndex: number;
  let toIndex: number;
  try {
    fromIndex = resolveUniqueBoundary(searchable, validated.fromPattern, "from");
    toIndex = resolveUniqueBoundary(searchable, validated.toPattern, "to");
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : String(error));
  }

  if (fromIndex > toIndex) {
    return errorResult(MATCHER_ORDER_ERROR);
  }

  const fromMessage = searchable[fromIndex];
  const toMessage = searchable[toIndex];
  if (!fromMessage || !toMessage) {
    return errorResult(COMPATIBILITY_ERROR);
  }

  const fromUuid = fromMessage.uuid;
  const toUuid = toMessage.uuid;
  const summaryUuid = crypto.randomUUID();
  const placeholderText = buildPlaceholder(
    fromUuid,
    toUuid,
    validated.summary,
    validated.indexTerms
  );

  try {
    const archivedAt = new Date().toISOString();
    const markResult = await markMessagesArchived(sessionPath, fromUuid, toUuid, summaryUuid, {
      skipWrite: true,
    });

    const compactMetadata: CompactMetadata = {
      fromMessageId: fromUuid,
      toMessageId: toUuid,
      messageCount: markResult.messageCount,
    };

    const anchorMetadata: AnchorArchiveMetadata = {
      archived: true,
      summary_uuid: summaryUuid,
      range_end_id: toUuid,
      summary: validated.summary,
      index_terms: validated.indexTerms,
      ...(validated.reason ? { reason: validated.reason } : {}),
    };

    for (const message of markResult.allMessages) {
      const uuid = messageUuid(message);
      if (uuid === fromUuid) {
        (message as SessionMessage & { context_bonsai_v2?: AnchorArchiveMetadata }).context_bonsai_v2 =
          anchorMetadata;
      }
    }

    const placeholderMessage = {
      type: "summary",
      uuid: summaryUuid,
      summary: placeholderText,
      timestamp: archivedAt,
      compactMetadata,
      context_bonsai_v2: {
        anchor_id: fromUuid,
        range_end_id: toUuid,
        summary: validated.summary,
        index_terms: validated.indexTerms,
      },
    } as SessionMessage;

    markResult.allMessages.push(placeholderMessage);
    await writeJsonlAtomic(sessionPath, markResult.allMessages);

    const archivedUuids = markResult.messages
      .filter((message) => message.type === "user" || message.type === "assistant")
      .map((message) => message.uuid);
    try {
      await addArchivedMarkerEntries(sessionPath, archivedUuids);
    } catch {
      // no-op
    }

    return successResponse(`Prune complete. anchor_id=${fromUuid}`, {
      op: "prune",
      anchor_id: fromUuid,
      range_end_id: toUuid,
      placeholder_text: placeholderText,
    });
  } catch {
    // Post-mutation partial failure (mutation began above). Surface as an error
    // so the host does not treat a partially-applied prune as a clean success.
    return errorResult("Error: prune failed.");
  }
}

export function validateRetrieveArgs(args: RetrieveArgs):
  | { ok: true; anchorId: string }
  | { ok: false; error: string } {
  const keys = Object.keys(args);
  if (keys.length !== 1 || !("anchor_id" in args)) {
    return { ok: false, error: RETRIEVE_ARG_ERROR };
  }

  const anchorId = asTrimmedString(args.anchor_id);
  if (!anchorId) {
    return { ok: false, error: RETRIEVE_ARG_ERROR };
  }

  return { ok: true, anchorId };
}

async function handleRetrieveContext(args: RetrieveArgs): Promise<ToolResult> {
  const validated = validateRetrieveArgs(args);
  if (!validated.ok) {
    return errorResult(validated.error);
  }

  let sessionPath: string;
  try {
    sessionPath = await discoverSessionPath();
  } catch {
    return errorResult(COMPATIBILITY_ERROR);
  }

  let currentMessages: SessionMessage[];
  try {
    currentMessages = await loadAllMessages(sessionPath);
  } catch {
    return errorResult(COMPATIBILITY_ERROR);
  }

  const anchorIndex = currentMessages.findIndex((message) => messageUuid(message) === validated.anchorId);
  const anchorMessage = currentMessages[anchorIndex] as
    | (SessionMessage & { context_bonsai_v2?: AnchorArchiveMetadata })
    | undefined;

  if (!anchorMessage) {
    return errorResult(RETRIEVE_NOT_FOUND);
  }

  const metadata = anchorMessage.context_bonsai_v2;
  if (!metadata || metadata.archived !== true || !metadata.summary_uuid) {
    return errorResult(RETRIEVE_NOT_ARCHIVED);
  }

  const placeholderText = buildPlaceholder(
    validated.anchorId,
    metadata.range_end_id,
    metadata.summary,
    metadata.index_terms
  );
  const rangeEndIndex = currentMessages.findIndex((message) => messageUuid(message) === metadata.range_end_id);
  const restoredText =
    anchorIndex >= 0 && rangeEndIndex >= anchorIndex
      ? renderRetrievedMessages(currentMessages.slice(anchorIndex, rangeEndIndex + 1))
      : "";

  try {
    await retrieveSession(sessionPath, [metadata.summary_uuid]);
  } catch {
    return errorResult(RETRIEVE_NOT_ARCHIVED);
  }

  return finalizeRetrieveAfterMutation(
    validated.anchorId,
    metadata.range_end_id,
    placeholderText,
    async () => {
    const refreshed = await loadAllMessages(sessionPath);
    for (const message of refreshed) {
      if (messageUuid(message) === validated.anchorId) {
        delete (message as SessionMessage & { context_bonsai_v2?: AnchorArchiveMetadata }).context_bonsai_v2;
      }
    }
    await writeJsonlAtomic(sessionPath, refreshed);
    },
    restoredText
  );
}

export function listContextBonsaiTools() {
  return [
    {
      name: "context-bonsai-prune",
      description:
        "Archive one contiguous range resolved by unique from_pattern/to_pattern and store summary metadata.",
      inputSchema: {
        type: "object" as const,
        properties: {
          from_pattern: {
            type: "string",
            description: "Unique plain-text pattern matching the first message in range.",
          },
          to_pattern: {
            type: "string",
            description: "Unique plain-text pattern matching the last message in range.",
          },
          summary: {
            type: "string",
            description: "Model-authored summary of archived content.",
          },
          index_terms: {
            type: "array",
            items: { type: "string" },
            description: "Non-empty semantic index terms.",
          },
          reason: {
            type: "string",
            description: "Optional reason for pruning.",
          },
        },
        required: ["from_pattern", "to_pattern", "summary", "index_terms"],
        additionalProperties: false,
      },
    },
    {
      name: "context-bonsai-retrieve",
      description: "Restore an archived range using only anchor_id.",
      inputSchema: {
        type: "object" as const,
        properties: {
          anchor_id: {
            type: "string",
            description: "Anchor UUID for the archived range to restore.",
          },
        },
        required: ["anchor_id"],
        additionalProperties: false,
      },
    },
  ];
}

export async function routeContextBonsaiTool(
  name: string,
  args: unknown,
  deps?: Partial<PruneDependencies>
): Promise<ToolResult> {
  if (name === "context-bonsai-prune") {
    return handlePruneContext((args as PruneArgs) || {}, {
      discoverSessionPath: deps?.discoverSessionPath ?? discoverSessionPath,
      assertArchivedFilterPatchPresent:
        deps?.assertArchivedFilterPatchPresent ?? assertRunningClaudeHasArchivedFilterPatch,
    });
  }

  if (name === "context-bonsai-retrieve") {
    return handleRetrieveContext((args as RetrieveArgs) || {});
  }
  throw new Error(`Unknown tool: ${name}`);
}

const server = new Server(
  {
    name: "context-bonsai-v2",
    version: "0.1.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: listContextBonsaiTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  return routeContextBonsaiTool(request.params.name, request.params.arguments);
});

export async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.main) {
  main().catch(() => {
    console.error("Fatal error: failed to start context-bonsai-v2 MCP server.");
    process.exit(1);
  });
}
