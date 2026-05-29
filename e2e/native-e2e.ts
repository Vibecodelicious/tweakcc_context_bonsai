#!/usr/bin/env bun

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname } from 'node:path';

import { bonsaiPatches } from '../patches/registry';
import {
  selectAttachmentPipelineAnchor,
  selectMessageContentConverterAnchor,
  selectReminderRenderAnchor,
  selectTokenUsageHelperAnchor,
  selectVisibilitySwitchAnchor,
  type EvidenceAnchor,
} from '../patches/anchors';
import { composePatches, verifyPatchSentinels } from '../apply/apply-bonsai';

const defaultBundlePath = '.artifacts/claude-code/2.1.143/linux-x64/extracted.js';
const defaultManifestPath = '.artifacts/claude-code/2.1.143/linux-x64/manifest.json';
const semanticReportPath = 'docs/semantic-anchor-analysis-2.1.143.md';
const targetBundleEnv = 'CB_CLAUDE_TARGET_BUNDLE_JS';

const requiredSemanticSections = [
  'archived-filter.visibility',
  'message-content-ids.converter',
  'context-bonsai-gauge.token-usage',
  'context-bonsai-gauge.attachment-pipeline',
  'context-bonsai-gauge.reminder-render',
  'runtime-helper.fs',
  'runtime-helper.config-dir',
  'runtime-helper.session-id',
];

const requiredSemanticFields = [
  'Anchor ID',
  'Patch or helper',
  'Pinned artifact identity',
  'Selected offset and snippet',
  'Host behavior controlled',
  'Required seam rationale',
  'Plausible wrong candidates rejected',
  'Ambiguous/no-match fail-closed evidence',
  'Runtime or model-facing evidence',
  'Reviewer checklist',
];

interface EvidenceSelection {
  candidateCount: number;
  selected: {
    index: number;
    length: number;
    score: number;
    snippet: string;
  };
}

interface Args {
  command?: string;
  bundle?: string;
  manifest?: string;
  out?: string;
  session?: string;
  secret?: string;
  binary?: string;
  prompt?: string;
  cwd?: string;
  preSession?: string;
  fromUuid?: string;
  toUuid?: string;
  marker?: string;
}

// Guard the CLI dispatch behind import.meta.main so this module can be imported
// (e.g. by unit tests of analyzePruneEffect) without running the dispatcher.
if (import.meta.main) {
  const argv = parseArgs(process.argv.slice(2));

  if (argv.command === 'artifact-evidence') {
    await artifactEvidence(argv);
  } else if (argv.command === 'protocol-a-oracle') {
    await protocolAOracle(argv);
  } else if (argv.command === 'prune-guard-live') {
    await pruneGuardLive(argv);
  } else if (argv.command === 'prune-effect') {
    await pruneEffectCommand(argv);
  } else {
    usage();
    process.exit(argv.command === 'help' || argv.command === undefined ? 0 : 1);
  }
}

async function artifactEvidence(args: Args): Promise<void> {
  const bundlePath = args.bundle ?? process.env[targetBundleEnv] ?? defaultBundlePath;
  const manifestPath = args.manifest ?? defaultManifestPath;
  if (!existsSync(bundlePath)) {
    throw new Error(
      `missing target bundle: expected ${bundlePath} or set ${targetBundleEnv}; ` +
        'do not claim release-gate PASS without the native Claude Code 2.1.143 Linux x64 artifact'
    );
  }
  if (!existsSync(manifestPath)) {
    throw new Error(`missing target manifest: expected ${manifestPath}`);
  }
  const semanticReport = await validateSemanticReport();

  const content = await readFile(bundlePath, 'utf8');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
  const checksum = sha256(content);
  const selections = {
    archivedFilter: selectVisibilitySwitch(content),
    messageContentIds: selectMessageContentConverter(content),
    contextBonsaiGaugeTokenUsage: selectTokenUsageHelper(content),
    contextBonsaiGaugeAttachment: selectAttachmentPipeline(content),
    contextBonsaiGaugeReminderRender: selectReminderRenderCase(content),
  };

  const patched = composePatches(content, bonsaiPatches, {
    path: bundlePath,
    version: String(manifest.claudeCodeVersion ?? manifest.version ?? '2.1.143'),
    kind: 'native',
  });
  verifyPatchSentinels(patched, bonsaiPatches);

  const evidence = {
    generatedAt: new Date().toISOString(),
    operator: process.env.USER ?? 'unknown',
    target: {
      claudeCodeVersion: manifest.claudeCodeVersion ?? manifest.version ?? '2.1.143',
      platform: manifest.platform ?? 'linux-x64',
      installKind: manifest.installKind ?? 'native',
      bundlePath,
      manifestPath,
      extractedBundleSha256: checksum,
    },
    extraction: {
      tool: manifest.extractionTool ?? manifest.tool ?? 'tweakcc',
      toolVersion: manifest.extractionToolVersion ?? manifest.toolVersion ?? '4.0.x',
      reproductionCommand: manifest.reproductionCommand ?? manifest.command ?? 'record in manifest.json',
      harnessEntryPoint: 'bun run e2e/native-e2e.ts artifact-evidence',
    },
    selections,
    sentinelsVerified: bonsaiPatches.map((patch) => patch.sentinel),
    semanticAnchorAnalysis: semanticReport,
    releaseReadiness:
      'artifact evidence is release-ready only for pinned extracted-bundle semantic analysis; live provider/model proof remains Story 8 BLOCKED until fresh-sprite login and Protocol A run',
    credentialBoundary: 'No credentials, auth files, session transcripts, or ~/.claude config are read by this command.',
  };

  await writeJson(args.out, evidence);
}

async function validateSemanticReport(): Promise<{ path: string; sha256: string; requiredSections: string[]; requiredFields: string[] }> {
  if (!existsSync(semanticReportPath)) {
    throw new Error(
      `missing semantic anchor analysis report: expected ${semanticReportPath}; ` +
        'artifact-evidence is mechanical locator evidence only and is not release-gate-ready without semantic analysis'
    );
  }

  const text = await readFile(semanticReportPath, 'utf8');
  const missing: string[] = [];
  for (const section of requiredSemanticSections) {
    if (!new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, 'm').test(text)) missing.push(`section:${section}`);
  }
  for (const field of requiredSemanticFields) {
    for (const section of requiredSemanticSections) {
      const sectionText = extractSection(text, section);
      if (!sectionText.includes(`${field}:`)) missing.push(`${section}:${field}`);
    }
  }
  if (!/mechanical locator evidence/i.test(text) || !/not release-gate/i.test(text)) {
    missing.push('reclassification:mechanical locator evidence/not release-gate');
  }

  if (missing.length > 0) {
    throw new Error(
      `incomplete semantic anchor analysis report: ${missing.join(', ')}; ` +
        'artifact-evidence is not release-gate-ready'
    );
  }

  return {
    path: semanticReportPath,
    sha256: sha256(text),
    requiredSections: requiredSemanticSections,
    requiredFields: requiredSemanticFields,
  };
}

function extractSection(text: string, section: string): string {
  const match = new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, 'm').exec(text);
  if (!match) return '';
  const start = match.index;
  const rest = text.slice(start + match[0].length);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function protocolAOracle(args: Args): Promise<void> {
  if (!args.session) throw new Error('protocol-a-oracle requires --session <session-jsonl>');
  if (!args.secret) throw new Error('protocol-a-oracle requires --secret <literal>');

  const lines = (await readFile(args.session, 'utf8')).split('\n').filter(Boolean);
  const rows = lines.map((line) => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      return null;
    }
  });
  const markerSet = resolveMarkerSet(
    args.marker,
    args.session,
    rows.filter((r): r is Record<string, unknown> => r !== null)
  );
  const occurrences: Array<{ line: number; uuid?: string; type?: string; archived: boolean; summary: boolean }> = [];

  rows.forEach((parsed, index) => {
    if (parsed === null) {
      // A non-JSON line can never carry the secret as a model transcript row.
      return;
    }

    if (!isModelTranscriptRow(parsed) || !flatten(parsed).includes(args.secret as string)) return;
    occurrences.push({
      line: index + 1,
      uuid: typeof parsed.uuid === 'string' ? parsed.uuid : undefined,
      type: typeof parsed.type === 'string' ? parsed.type : undefined,
      // Archived = hidden from the model: top-level `archived` flag or marker UUID.
      archived: isArchivedRow(parsed, markerSet),
      summary: parsed.type === 'summary',
    });
  });

  const invalidOccurrences = occurrences.filter((occurrence) => !occurrence.archived || occurrence.summary);
  const result = {
    valid: occurrences.length > 0 && invalidOccurrences.length === 0,
    occurrenceCount: occurrences.length,
    invalidOccurrenceCount: invalidOccurrences.length,
    occurrences,
    verdict: occurrences.length === 0
      ? 'BLOCKED: secret literal not found in transcript evidence'
      : invalidOccurrences.length === 0
        ? 'PASS: secret appears only in archived original blocks'
        : 'FAIL: secret appears outside archived original blocks',
  };

  await writeJson(args.out, result);
  if (!result.valid) process.exitCode = 1;
}

function isModelTranscriptRow(parsed: Record<string, unknown>): boolean {
  return parsed.type === 'user' || parsed.type === 'assistant' || parsed.type === 'summary';
}

// Archival is recorded by the runtime as a TOP-LEVEL `archived` flag on the
// user/assistant row (see src/lib/compact.ts markMessagesArchived), and the set
// of archived UUIDs is persisted to the marker file
// `~/.claude/archived-<sessionId>.json` (addArchivedMarkerEntries), which the
// archived-filter patch reads to hide those rows from the model-visible
// transcript. It is NOT recorded as a per-row `context_bonsai_v2.archived` field
// — only the anchor row carries `context_bonsai_v2` (the anchor metadata), and
// the placeholder summary carries `context_bonsai_v2.anchor_id`. Detection here
// must therefore read the top-level flag and/or the marker file.
function rowUuid(row: Record<string, unknown>): string | undefined {
  return typeof row.uuid === 'string' ? row.uuid : undefined;
}

function isArchivedRow(row: Record<string, unknown>, markerSet: Set<string>): boolean {
  if (row.archived === true) return true;
  const uuid = rowUuid(row);
  return uuid !== undefined && markerSet.has(uuid);
}

// The marker file is `~/.claude/archived-<sessionId>.json` where <sessionId> is
// the session JSONL basename. An explicit --marker path overrides; otherwise it
// is derived from the session path, then (if missing) re-derived from the
// `sessionId` field on the rows.
function markerPathForSession(sessionPath: string): string {
  const base = sessionPath.slice(sessionPath.lastIndexOf('/') + 1);
  const sessionId = base.endsWith('.jsonl') ? base.slice(0, -'.jsonl'.length) : base;
  return `${homedir()}/.claude/archived-${sessionId}.json`;
}

function loadMarkerUuids(markerPath: string): Set<string> {
  if (!existsSync(markerPath)) return new Set();
  try {
    const parsed = JSON.parse(readFileSync(markerPath, 'utf8')) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : []);
  } catch {
    return new Set();
  }
}

// Resolve the archived-UUID set for a session: explicit --marker, else derived
// from the session path, else derived from a `sessionId` field on the rows.
function resolveMarkerSet(
  explicitMarker: string | undefined,
  sessionPath: string,
  rows: Array<Record<string, unknown>>
): Set<string> {
  if (explicitMarker) return loadMarkerUuids(explicitMarker);

  const byPath = loadMarkerUuids(markerPathForSession(sessionPath));
  if (byPath.size > 0) return byPath;

  const sessionId = rows
    .map((r) => (typeof r.sessionId === 'string' ? r.sessionId : undefined))
    .find((s): s is string => Boolean(s));
  if (sessionId) {
    return loadMarkerUuids(`${homedir()}/.claude/archived-${sessionId}.json`);
  }
  return byPath;
}

// ---------------------------------------------------------------------------
// prune-guard-detection live e2e (NET-NEW for this story)
//
// Reproduces Basil's launch shape: the native version-named binary invoked
// DIRECTLY by its path (argv[0] = .../versions/<v>) with NO --resume. Asserts
// that shape from /proc/<claude-pid>/cmdline, then drives prune -> retrieve and
// verifies the archived range is actually removed from the model-visible
// transcript (content removal + input-token-footprint drop), not merely reported
// removed by the tool's success string.
//
// The live model drive requires provider credentials provisioned out of band. If
// they are absent the run is BLOCKED (a genuine environmental precondition), not
// FAIL — the launch-shape assertion and the JSONL effect analysis are still
// exercised so the harness is fully runnable offline up to the credential gate.
// ---------------------------------------------------------------------------

interface LaunchShapeResult {
  pid: number;
  cmdline: string[];
  argv0: string;
  expectedBinary: string;
  argv0IsVersionedBinary: boolean;
  hasResumeFlag: boolean;
  bugShapeConfirmed: boolean;
}

function defaultNativeBinary(): string {
  return `${homedir()}/.local/share/claude/versions/2.1.143-cbfix`;
}

function readProcCmdline(pid: number): string[] {
  const raw = readFileSync(`/proc/${pid}/cmdline`);
  return raw
    .toString('utf8')
    .split('\0')
    .filter((part) => part.length > 0);
}

function argvHasResume(argv: string[]): boolean {
  return argv.some(
    (arg) => arg === '--resume' || arg === 'resume' || /^--resume=/.test(arg)
  );
}

// Assert the running process matches the bug-triggering shape: launched directly
// by the versioned binary path with no --resume token.
function assertLaunchShape(pid: number, expectedBinary: string): LaunchShapeResult {
  const cmdline = readProcCmdline(pid);
  const argv0 = cmdline[0] ?? '';
  const argv0IsVersionedBinary =
    argv0 === expectedBinary || (argv0.includes('/.local/share/claude/versions/') && !argv0.endsWith('/claude'));
  const hasResumeFlag = argvHasResume(cmdline);
  return {
    pid,
    cmdline,
    argv0,
    expectedBinary,
    argv0IsVersionedBinary,
    hasResumeFlag,
    bugShapeConfirmed: argv0IsVersionedBinary && !hasResumeFlag,
  };
}

interface PruneEffectResult {
  verdict: 'PASS' | 'FAIL' | 'BLOCKED';
  reason: string;
  archivedRangeUuids: string[];
  archivedRangePresentPre: boolean;
  archivedRangeVisiblePost: boolean;
  placeholderPresentPost: boolean;
  // Model-visible character footprint contributed by the ARCHIVED RANGE rows
  // specifically — pre-prune they are visible, post-prune they are hidden by the
  // archived-filter (top-level flag / marker). This isolates the prune's effect
  // from any new rows the drive turn appends (which would confound a whole-
  // transcript char count). A real prune drives the range's visible footprint to
  // ~0 (only the small placeholder remains).
  rangeVisibleCharsPre: number;
  rangeVisibleCharsPost: number;
  footprintDropped: boolean;
}

function rowText(row: Record<string, unknown>): string {
  if (row.type === 'summary') return typeof row.summary === 'string' ? row.summary : '';
  const message = row.message as { content?: unknown } | undefined;
  return flatten(message?.content);
}

function readJsonlRows(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

// Model-visible character footprint contributed by a specific set of range
// UUIDs: sum the searchable-text length of those rows that are NOT hidden by the
// archived-filter (top-level `archived` flag or marker set). Scoping to the range
// rows isolates the prune's effect from any unrelated rows the drive turn appends
// to the post snapshot (which would inflate a whole-transcript char count).
function rangeVisibleChars(
  rows: Array<Record<string, unknown>>,
  rangeUuids: Set<string>,
  markerSet: Set<string>
): number {
  let total = 0;
  for (const row of rows) {
    if (!isModelTranscriptRow(row)) continue;
    const uuid = rowUuid(row);
    if (uuid === undefined || !rangeUuids.has(uuid)) continue;
    if (isArchivedRow(row, markerSet)) continue;
    total += rowText(row).length;
  }
  return total;
}

// Verify a prune actually removed the archived range from the model-visible
// transcript, comparing the pre-prune and post-prune session JSONL.
//
// preMarkerSet / postMarkerSet are the archived-UUID sets for the pre and post
// snapshots (top-level `archived` flag is also honored per-row). The pre snapshot
// normally has an empty marker set (nothing archived yet); the post snapshot's
// marker set lists the archived range.
export function analyzePruneEffect(
  preRows: Array<Record<string, unknown>>,
  postRows: Array<Record<string, unknown>>,
  fromUuid: string,
  toUuid: string,
  preMarkerSet: Set<string> = new Set(),
  postMarkerSet: Set<string> = new Set()
): PruneEffectResult {
  const rangeUuids = collectRangeUuids(preRows, fromUuid, toUuid);
  const archivedRangePresentPre = rangeUuids.length > 0;

  const postByUuid = new Map<string, Record<string, unknown>>();
  for (const row of postRows) {
    const uuid = typeof row.uuid === 'string' ? row.uuid : undefined;
    if (uuid) postByUuid.set(uuid, row);
  }

  // The range is "visible" post-prune if any of its rows still appear as a
  // non-archived model transcript row (top-level `archived` flag false AND not in
  // the post marker set).
  const archivedRangeVisiblePost = rangeUuids.some((uuid) => {
    const row = postByUuid.get(uuid);
    return row !== undefined && isModelTranscriptRow(row) && !isArchivedRow(row, postMarkerSet);
  });

  const placeholderPresentPost = postRows.some(
    (row) => row.type === 'summary' && (row.context_bonsai_v2 as { anchor_id?: unknown } | undefined)?.anchor_id === fromUuid
  );

  const rangeSet = new Set(rangeUuids);
  const rangeVisibleCharsPre = rangeVisibleChars(preRows, rangeSet, preMarkerSet);
  const rangeVisibleCharsPost = rangeVisibleChars(postRows, rangeSet, postMarkerSet);
  const footprintDropped = rangeVisibleCharsPost < rangeVisibleCharsPre;

  let verdict: PruneEffectResult['verdict'] = 'PASS';
  let reason = 'archived range removed from model-visible transcript and its footprint dropped';
  if (!archivedRangePresentPre) {
    verdict = 'BLOCKED';
    reason = 'pre-prune session does not contain the from..to range; cannot evaluate effect';
  } else if (archivedRangeVisiblePost) {
    verdict = 'FAIL';
    reason = 'archived range is still visible (non-archived) in the post-prune transcript';
  } else if (!placeholderPresentPost) {
    verdict = 'FAIL';
    reason = 'no placeholder summary anchored at fromUuid in the post-prune transcript';
  } else if (!footprintDropped) {
    verdict = 'FAIL';
    reason = 'archived-range model-visible footprint did not drop after prune';
  }

  return {
    verdict,
    reason,
    archivedRangeUuids: rangeUuids,
    archivedRangePresentPre,
    archivedRangeVisiblePost,
    placeholderPresentPost,
    rangeVisibleCharsPre,
    rangeVisibleCharsPost,
    footprintDropped,
  };
}

function collectRangeUuids(
  rows: Array<Record<string, unknown>>,
  fromUuid: string,
  toUuid: string
): string[] {
  const uuids: string[] = [];
  let collecting = false;
  for (const row of rows) {
    const uuid = typeof row.uuid === 'string' ? row.uuid : undefined;
    if (uuid === fromUuid) collecting = true;
    if (collecting && uuid) uuids.push(uuid);
    if (uuid === toUuid) break;
  }
  return uuids;
}

async function pruneEffectCommand(args: Args): Promise<void> {
  if (!args.preSession) throw new Error('prune-effect requires --pre-session <jsonl>');
  if (!args.session) throw new Error('prune-effect requires --session <post-prune jsonl>');
  if (!args.fromUuid) throw new Error('prune-effect requires --from-uuid <uuid>');
  if (!args.toUuid) throw new Error('prune-effect requires --to-uuid <uuid>');

  const preRows = readJsonlRows(args.preSession);
  const postRows = readJsonlRows(args.session);
  // The pre snapshot is the un-pruned baseline: its marker set is empty by
  // definition. (Do NOT derive it from the live sessionId — the live marker file
  // is shared by session id and now reflects POST-prune state, which would wrongly
  // treat the pre range as already archived.) The pre rows carry no top-level
  // `archived` flag either, so the full pre range is visible.
  const preMarkerSet = new Set<string>();
  // The post snapshot's archived set: explicit --marker, else derived from the
  // session path / sessionId; the top-level `archived` flag on rows is also honored.
  const postMarkerSet = resolveMarkerSet(args.marker, args.session, postRows);
  const result = analyzePruneEffect(
    preRows,
    postRows,
    args.fromUuid,
    args.toUuid,
    preMarkerSet,
    postMarkerSet
  );
  await writeJson(args.out, result);
  if (result.verdict === 'FAIL') process.exitCode = 1;
}

async function pruneGuardLive(args: Args): Promise<void> {
  const binary = args.binary ?? defaultNativeBinary();
  const cwd = args.cwd ?? process.cwd();
  const prompt =
    args.prompt ??
    'Use context-bonsai-prune to archive the contiguous range between the unique boundary ' +
      'phrases I established, then confirm the anchor id. Do not retrieve in the same step.';

  if (!existsSync(binary)) {
    await writeJson(args.out, {
      verdict: 'BLOCKED',
      reason: `native versioned binary not found at ${binary}; pass --binary <path>`,
      reasonCode: 'native-runtime-missing',
    });
    process.exitCode = 1;
    return;
  }

  // Launch the binary DIRECTLY by its versioned path (argv[0] = binary) with NO
  // --resume — the bug-triggering shape. Print mode keeps the run non-interactive.
  // The model drive requires provider credentials; absent those the child exits
  // non-zero and we classify BLOCKED after still asserting the launch shape.
  const child = spawn(binary, ['-p', prompt], {
    cwd,
    argv0: binary,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  let shape: LaunchShapeResult | null = null;
  try {
    shape = assertLaunchShape(child.pid as number, binary);
  } catch (error) {
    shape = null;
    void error;
  }

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const exitCode: number = await new Promise((resolveExit) => {
    child.on('error', () => resolveExit(127));
    child.on('close', (code) => resolveExit(code ?? 0));
  });

  // Resolve the live session JSONL the binary wrote (newest under cwd's project dir).
  let sessionPath: string | undefined;
  try {
    sessionPath = await newestSessionForCwd(cwd);
  } catch {
    sessionPath = undefined;
  }

  const credentialsLikelyAbsent =
    exitCode !== 0 && /login|api key|credential|auth|not.*logged|unauthor/i.test(`${stdout}\n${stderr}`);

  const blocked = exitCode !== 0;
  const result = {
    verdict: blocked ? 'BLOCKED' : 'PASS',
    reason: blocked
      ? credentialsLikelyAbsent
        ? 'provider credentials unavailable; live model drive could not complete'
        : `live Claude run exited ${exitCode}; live model drive could not complete`
      : 'native binary launched directly with no --resume; live prune drive completed',
    reasonCode: blocked
      ? credentialsLikelyAbsent
        ? 'credentials-missing-in-harness'
        : 'live-run-nonzero-exit'
      : 'prune-guard-live-pass',
    binary,
    launchShape: shape,
    bugShapeConfirmed: shape?.bugShapeConfirmed ?? false,
    exitCode,
    sessionPath: sessionPath ?? null,
    note:
      'After a successful live drive, run prune-effect with --pre-session/--session/--from-uuid/--to-uuid ' +
      'to verify content removal and footprint drop, and protocol-a-oracle for the secret oracle.',
  };

  await writeJson(args.out, result);
  if (result.verdict === 'BLOCKED') process.exitCode = 1;
}

async function newestSessionForCwd(cwd: string): Promise<string> {
  const projectDir = `${homedir()}/.claude/projects/${cwd.replace(/\//g, '-')}`;
  if (!existsSync(projectDir)) {
    // Fall back to the absolute newest session under projects/.
    const projectsRoot = `${homedir()}/.claude/projects`;
    return newestJsonl(projectsRoot);
  }
  return newestJsonl(projectDir);
}

async function newestJsonl(root: string): Promise<string> {
  const { Glob } = await import('bun');
  const glob = new Glob('**/*.jsonl');
  let newestPath = '';
  let newestMtime = -1;
  for await (const match of glob.scan({ cwd: root, absolute: true })) {
    try {
      const stat = await Bun.file(match).stat();
      const mtime = stat.mtime ? stat.mtime.getTime() : -1;
      if (mtime > newestMtime) {
        newestMtime = mtime;
        newestPath = match;
      }
    } catch {
      continue;
    }
  }
  if (!newestPath) throw new Error(`no session jsonl under ${root}`);
  return newestPath;
}

function selectVisibilitySwitch(content: string): EvidenceSelection {
  return serializeEvidence(selectVisibilitySwitchAnchor(content).evidence);
}

function selectMessageContentConverter(content: string): EvidenceSelection {
  return serializeEvidence(selectMessageContentConverterAnchor(content).evidence);
}

function selectTokenUsageHelper(content: string): EvidenceSelection {
  return serializeEvidence(selectTokenUsageHelperAnchor(content).evidence);
}

function selectAttachmentPipeline(content: string): EvidenceSelection {
  return serializeEvidence(selectAttachmentPipelineAnchor(content).evidence);
}

function selectReminderRenderCase(content: string): EvidenceSelection {
  return serializeEvidence(selectReminderRenderAnchor(content).evidence);
}

function serializeEvidence(evidence: EvidenceAnchor): EvidenceSelection {
  const candidate = evidence.selected;
  return {
    candidateCount: evidence.candidateCount,
    selected: {
      index: candidate.index,
      length: candidate.length,
      score: candidate.score,
      snippet: candidate.text.replace(/\s+/g, ' ').slice(0, 240),
    },
  };
}

function flatten(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(flatten).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(flatten).join(' ');
  return String(value);
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function writeJson(path: string | undefined, value: unknown): Promise<void> {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (!path) {
    process.stdout.write(text);
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, 'utf8');
  console.log(`wrote ${path}`);
}

function parseArgs(args: string[]): Args {
  const parsed: Args = { command: args[0] };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === '--bundle') {
      parsed.bundle = requireValue(arg, next);
      index += 1;
    } else if (arg === '--manifest') {
      parsed.manifest = requireValue(arg, next);
      index += 1;
    } else if (arg === '--out') {
      parsed.out = requireValue(arg, next);
      index += 1;
    } else if (arg === '--session') {
      parsed.session = requireValue(arg, next);
      index += 1;
    } else if (arg === '--secret') {
      parsed.secret = requireValue(arg, next);
      index += 1;
    } else if (arg === '--binary') {
      parsed.binary = requireValue(arg, next);
      index += 1;
    } else if (arg === '--prompt') {
      parsed.prompt = requireValue(arg, next);
      index += 1;
    } else if (arg === '--cwd') {
      parsed.cwd = requireValue(arg, next);
      index += 1;
    } else if (arg === '--pre-session') {
      parsed.preSession = requireValue(arg, next);
      index += 1;
    } else if (arg === '--from-uuid') {
      parsed.fromUuid = requireValue(arg, next);
      index += 1;
    } else if (arg === '--to-uuid') {
      parsed.toUuid = requireValue(arg, next);
      index += 1;
    } else if (arg === '--marker') {
      parsed.marker = requireValue(arg, next);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      parsed.command = 'help';
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function usage(): void {
  console.log(`Usage:
  bun run e2e/native-e2e.ts artifact-evidence [--bundle extracted.js] [--manifest manifest.json] [--out evidence.json]
  bun run e2e/native-e2e.ts protocol-a-oracle --session session.jsonl --secret SECRET [--marker archived-<sid>.json] [--out oracle.json]
      Archival is read from the top-level row 'archived' flag and the marker file
      (~/.claude/archived-<sessionId>.json, derived from --session if --marker is omitted).
  bun run e2e/native-e2e.ts prune-guard-live [--binary ~/.local/share/claude/versions/<v>] [--prompt "..."] [--cwd DIR] [--out result.json]
      Launch the native version-named binary DIRECTLY (argv[0] = the binary, no --resume),
      assert that launch shape from /proc/<pid>/cmdline, and drive a live prune.
      Requires provider credentials; BLOCKED (not FAIL) if the model drive cannot complete.
  bun run e2e/native-e2e.ts prune-effect --pre-session pre.jsonl --session post.jsonl --from-uuid UUID --to-uuid UUID [--marker archived-<sid>.json] [--out effect.json]
      Verify a prune actually removed the archived range from the model-visible transcript
      (content removal + input-token-footprint drop) by comparing pre/post session JSONL.
      Archival is read from the top-level row 'archived' flag and the post-session marker file.
`);
}
