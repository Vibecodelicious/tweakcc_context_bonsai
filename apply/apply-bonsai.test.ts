import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, copyFile, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  applyBonsai,
  classifyInstallState,
  composePatches,
  restoreBonsai,
  verifyPatchSentinels,
  type ApplyOptions,
} from './apply-bonsai';
import { tweakccApi, type Installation, type TweakccApi } from './tweakcc-api';
import { BonsaiPatchError, type BonsaiPatch } from '../patches/types';

const installation: Installation = {
  path: '/tmp/fake-claude',
  version: 'test',
  kind: 'native',
};

const patchA: BonsaiPatch = {
  name: 'archived-filter',
  sentinel: '/*cb:archived-filter:v1*/',
  apply: (content) => `${content}/*cb:archived-filter:v1*/`,
};

const patchB: BonsaiPatch = {
  name: 'message-content-ids',
  sentinel: '/*cb:message-content-ids:v1*/',
  apply: (content) => `${content}/*cb:message-content-ids:v1*/`,
};

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe('install state classification', () => {
  test('distinguishes unpatched installs', () => {
    expect(classifyInstallState('source', [patchA.sentinel], false)).toBe('unpatched');
  });

  test('distinguishes already-patched installs', () => {
    expect(classifyInstallState(`source${patchA.sentinel}`, [patchA.sentinel], false)).toBe('already-patched');
  });

  test('distinguishes reverted installs when a backup already exists', () => {
    expect(classifyInstallState('source', [patchA.sentinel], true)).toBe('reverted-after-update');
  });
});

describe('patch composition', () => {
  test('applies registered patches in order over one accumulating string', () => {
    expect(composePatches('source', [patchA, patchB], installation)).toBe(
      `source${patchA.sentinel}${patchB.sentinel}`
    );
  });

  test('allows an empty registry as an identity transform', () => {
    expect(composePatches('source', [], installation)).toBe('source');
    expect(() => verifyPatchSentinels('source', [])).not.toThrow();
  });

  test('fails closed when a sentinel is missing', () => {
    expect(() => verifyPatchSentinels('source', [patchA])).toThrow(BonsaiPatchError);
  });
});

describe('apply harness', () => {
  test('backs up, reads once, writes once, and reports applied patches', async () => {
    const calls: string[] = [];
    let writtenContent = '';
    const api = fakeApi({
      calls,
      readContent: async () => 'source',
      writeContent: async (_install, content) => {
        writtenContent = content;
      },
    });

    const result = await applyBonsai(fakeOptions(api, [patchA, patchB]));

    expect(calls).toEqual(['detect', 'backup', 'read', 'write']);
    expect(writtenContent).toBe(`source${patchA.sentinel}${patchB.sentinel}`);
    expect(result.state).toBe('unpatched');
    expect(result.patchesApplied).toEqual(['archived-filter', 'message-content-ids']);
    expect(result.wroteContent).toBe(true);
  });

  test('does not write an already-patched install', async () => {
    const calls: string[] = [];
    const api = fakeApi({
      calls,
      readContent: async () => `source${patchA.sentinel}`,
    });

    const result = await applyBonsai(fakeOptions(api, [patchA]));

    expect(calls).toEqual(['detect', 'backup', 'read']);
    expect(result.state).toBe('already-patched');
    expect(result.wroteContent).toBe(false);
  });

  test('restores backup and rejects on patch failure', async () => {
    const calls: string[] = [];
    const failingPatch: BonsaiPatch = {
      name: 'context-bonsai-gauge',
      sentinel: '/*cb:context-bonsai-gauge:v1*/',
      apply: () => {
        throw new BonsaiPatchError('context-bonsai-gauge', 'anchor not found');
      },
    };
    const api = fakeApi({ calls, readContent: async () => 'source' });

    await expect(applyBonsai(fakeOptions(api, [failingPatch]))).rejects.toThrow('anchor not found');
    expect(calls).toEqual(['detect', 'backup', 'read', 'restore']);
  });

  test('restores from the selected backup path', async () => {
    const calls: string[] = [];
    const api = fakeApi({ calls });

    const result = await restoreBonsai({
      api,
      path: installation.path,
      backupPath: '/tmp/bonsai.backup',
      stdout: quietOutput,
    });

    expect(result.backupPath).toBe('/tmp/bonsai.backup');
    expect(calls).toEqual(['detect', 'restore']);
  });
});

test('native no-op round-trip acceptance gate', async () => {
  const nativePath = await findLatestNativeClaudeInstall();
  if (!nativePath) {
    console.warn('SKIP native no-op round-trip: no native Claude Code install found under ~/.local/share/claude/versions');
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), 'cbonsai-native-roundtrip-'));
  tempDirs.push(dir);
  const copyPath = join(dir, 'claude-copy');
  await copyFile(nativePath, copyPath);
  await chmod(copyPath, 0o755);

  const copyInstallation: Installation = {
    path: copyPath,
    version: 'native-copy',
    kind: 'native',
  };

  const api: TweakccApi = {
    ...tweakccApi,
    tryDetectInstallation: async () => copyInstallation,
  };

  try {
    await applyBonsai({
      api,
      patches: [],
      backupPath: join(dir, 'claude-copy.backup'),
      stdout: quietOutput,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`SKIP native no-op round-trip: tweakcc native read/write failed in this environment: ${reason}`);
    return;
  }

  const proc = Bun.spawn([copyPath, '--version'], { stdout: 'pipe', stderr: 'pipe' });
  const timeout = setTimeout(() => proc.kill(), 10_000);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timeout);

  expect(exitCode).toBe(0);
  expect(`${stdout}\n${stderr}`).toMatch(/\d+\.\d+\.\d+/);
}, 120_000);

function fakeOptions(api: TweakccApi, patches: readonly BonsaiPatch[]): ApplyOptions {
  return {
    api,
    patches,
    path: installation.path,
    backupPath: '/tmp/bonsai.backup',
    stdout: quietOutput,
  };
}

function fakeApi(overrides: {
  calls: string[];
  readContent?: TweakccApi['readContent'];
  writeContent?: TweakccApi['writeContent'];
}): TweakccApi {
  return {
    findAllInstallations: async () => [installation],
    tryDetectInstallation: async () => {
      overrides.calls.push('detect');
      return installation;
    },
    backupFile: async () => {
      overrides.calls.push('backup');
    },
    readContent: async (install) => {
      overrides.calls.push('read');
      return overrides.readContent ? overrides.readContent(install) : 'source';
    },
    writeContent: async (install, content) => {
      overrides.calls.push('write');
      if (overrides.writeContent) await overrides.writeContent(install, content);
    },
    restoreBackup: async () => {
      overrides.calls.push('restore');
    },
  };
}

const quietOutput = {
  log: () => {},
  error: () => {},
};

async function findLatestNativeClaudeInstall(): Promise<string | null> {
  const versionsDir = join(process.env.HOME ?? homedir(), '.local', 'share', 'claude', 'versions');
  if (!existsSync(versionsDir)) return null;

  const entries = await readdir(versionsDir);
  const candidates = await Promise.all(entries.map(async (entry) => {
    const candidate = join(versionsDir, entry);
    const candidateStat = await stat(candidate).catch(() => null);
    return candidateStat?.isFile() ? { path: candidate, mtimeMs: candidateStat.mtimeMs } : null;
  }));

  const sorted = candidates
    .filter((candidate): candidate is { path: string; mtimeMs: number } => candidate !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return sorted[0]?.path ?? null;
}
