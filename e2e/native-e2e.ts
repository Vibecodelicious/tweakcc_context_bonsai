#!/usr/bin/env bun

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const targetBundleEnv = 'CB_CLAUDE_TARGET_BUNDLE_JS';

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
}

const argv = parseArgs(process.argv.slice(2));

if (argv.command === 'artifact-evidence') {
  await artifactEvidence(argv);
} else if (argv.command === 'protocol-a-oracle') {
  await protocolAOracle(argv);
} else {
  usage();
  process.exit(argv.command === 'help' || argv.command === undefined ? 0 : 1);
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
    credentialBoundary: 'No credentials, auth files, session transcripts, or ~/.claude config are read by this command.',
  };

  await writeJson(args.out, evidence);
}

async function protocolAOracle(args: Args): Promise<void> {
  if (!args.session) throw new Error('protocol-a-oracle requires --session <session-jsonl>');
  if (!args.secret) throw new Error('protocol-a-oracle requires --secret <literal>');

  const lines = (await readFile(args.session, 'utf8')).split('\n').filter(Boolean);
  const occurrences: Array<{ line: number; uuid?: string; type?: string; archived: boolean; summary: boolean }> = [];

  lines.forEach((line, index) => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      occurrences.push({ line: index + 1, archived: false, summary: false });
      return;
    }

    if (!flatten(parsed).includes(args.secret as string)) return;
    const metadata = parsed.context_bonsai_v2 as { archived?: unknown } | undefined;
    occurrences.push({
      line: index + 1,
      uuid: typeof parsed.uuid === 'string' ? parsed.uuid : undefined,
      type: typeof parsed.type === 'string' ? parsed.type : undefined,
      archived: metadata?.archived === true,
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
  bun run e2e/native-e2e.ts protocol-a-oracle --session session.jsonl --secret SECRET [--out oracle.json]
`);
}
