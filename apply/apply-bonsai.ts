import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bonsaiPatches } from '../patches/registry';
import { BonsaiPatchError, type BonsaiPatch } from '../patches/types';
import { tweakccApi, type Installation, type TweakccApi } from './tweakcc-api';

export type InstallState = 'unpatched' | 'already-patched' | 'reverted-after-update';

export interface ApplyOptions {
  path?: string;
  backupPath?: string;
  patches?: readonly BonsaiPatch[];
  api?: TweakccApi;
  stdout?: Pick<typeof console, 'log' | 'error'>;
}

export interface ApplyResult {
  installation: Installation;
  backupPath: string;
  state: InstallState;
  patchesApplied: string[];
  wroteContent: boolean;
}

export interface RestoreOptions {
  path?: string;
  backupPath?: string;
  api?: TweakccApi;
  stdout?: Pick<typeof console, 'log' | 'error'>;
}

export interface RestoreResult {
  installation: Installation;
  backupPath: string;
}

export function backupPathForInstallation(installation: Installation): string {
  const safePath = installation.path.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return join(homedir(), '.context-bonsai', 'tweakcc-backups', `${safePath}.backup`);
}

export function classifyInstallState(
  content: string,
  sentinels: readonly string[],
  backupExists: boolean
): InstallState {
  if (sentinels.length === 0) return 'unpatched';

  const hasAllSentinels = sentinels.length > 0 && sentinels.every((sentinel) => {
    return countOccurrences(content, sentinel) === 1;
  });

  if (hasAllSentinels) return 'already-patched';
  if (backupExists) return 'reverted-after-update';
  return 'unpatched';
}

export function composePatches(
  content: string,
  patches: readonly BonsaiPatch[],
  installation: Installation
): string {
  return patches.reduce((current, patch, patchIndex) => {
    try {
      return patch.apply(current, { installation, originalContent: content, patchIndex });
    } catch (error) {
      if (error instanceof BonsaiPatchError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BonsaiPatchError(patch.name, message, { cause: error });
    }
  }, content);
}

export function verifyPatchSentinels(
  content: string,
  patches: readonly BonsaiPatch[]
): void {
  for (const patch of patches) {
    const count = countOccurrences(content, patch.sentinel);
    if (count !== 1) {
      throw new BonsaiPatchError(
        patch.name,
        `expected sentinel ${patch.sentinel} exactly once, found ${count}`
      );
    }
  }
}

export async function applyBonsai(options: ApplyOptions = {}): Promise<ApplyResult> {
  const api = options.api ?? tweakccApi;
  const output = options.stdout ?? console;
  const patches = options.patches ?? bonsaiPatches;
  const installation = await api.tryDetectInstallation({ path: options.path, interactive: false });
  const backupPath = options.backupPath ?? backupPathForInstallation(installation);
  const priorBackupExists = existsSync(backupPath);

  await mkdir(dirname(backupPath), { recursive: true });
  await api.backupFile(installation.path, backupPath);

  const originalContent = await api.readContent(installation);
  const state = classifyInstallState(
    originalContent,
    patches.map((patch) => patch.sentinel),
    priorBackupExists
  );

  reportInstallState(output, state, patches.length);

  if (state === 'already-patched') {
    output.log(`Context Bonsai already patched at ${installation.path}`);
    return { installation, backupPath, state, patchesApplied: [], wroteContent: false };
  }

  try {
    const patchedContent = composePatches(originalContent, patches, installation);
    verifyPatchSentinels(patchedContent, patches);
    await api.writeContent(installation, patchedContent);

    output.log(`Context Bonsai apply complete for ${installation.path}`);
    output.log(`Backup written to ${backupPath}`);
    output.log(`Patches applied: ${patches.length === 0 ? 'none (identity round-trip)' : patches.map((patch) => patch.name).join(', ')}`);

    return {
      installation,
      backupPath,
      state,
      patchesApplied: patches.map((patch) => patch.name),
      wroteContent: true,
    };
  } catch (error) {
    await api.restoreBackup(backupPath, installation.path);
    const detail = error instanceof BonsaiPatchError
      ? `${error.patchName}: ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
    output.error(`Context Bonsai apply failed; restored backup from ${backupPath}`);
    throw new Error(detail, { cause: error });
  }
}

export async function restoreBonsai(options: RestoreOptions = {}): Promise<RestoreResult> {
  const api = options.api ?? tweakccApi;
  const output = options.stdout ?? console;
  const installation = await api.tryDetectInstallation({ path: options.path, interactive: false });
  const backupPath = options.backupPath ?? backupPathForInstallation(installation);

  await api.restoreBackup(backupPath, installation.path);
  output.log(`Context Bonsai restore complete for ${installation.path}`);
  output.log(`Restored from ${backupPath}`);
  return { installation, backupPath };
}

function reportInstallState(
  output: Pick<typeof console, 'log'>,
  state: InstallState,
  patchCount: number
): void {
  if (patchCount === 0) {
    output.log('No Context Bonsai patches are registered yet; applying identity round-trip.');
  }

  if (state === 'unpatched') {
    output.log('Install state: unpatched');
  } else if (state === 'already-patched') {
    output.log('Install state: already-patched');
  } else {
    output.log('Install state: reverted-after-update');
  }
}

function countOccurrences(content: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = content.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = content.indexOf(needle, index + needle.length);
  }
  return count;
}

function parseArgs(argv: string[]): { restore: boolean; path?: string; backupPath?: string } {
  const parsed: { restore: boolean; path?: string; backupPath?: string } = { restore: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--restore') {
      parsed.restore = true;
    } else if (arg === '--path') {
      parsed.path = argv[++i];
    } else if (arg === '--backup') {
      parsed.backupPath = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printUsage(): void {
  console.log('Usage: bun run apply/apply-bonsai.ts [--path <claude-install>] [--backup <backup-path>] [--restore]');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.restore) {
    await restoreBonsai({ path: args.path, backupPath: args.backupPath });
  } else {
    await applyBonsai({ path: args.path, backupPath: args.backupPath });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
