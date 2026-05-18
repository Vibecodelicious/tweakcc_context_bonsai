export interface Installation {
  path: string;
  version?: string;
  kind: 'native' | 'npm' | string;
}

export interface DetectInstallationOptions {
  path?: string;
  interactive?: boolean;
}

export interface TweakccApi {
  findAllInstallations(): Promise<Installation[]>;
  tryDetectInstallation(options?: DetectInstallationOptions): Promise<Installation>;
  readContent(installation: Installation): Promise<string>;
  writeContent(installation: Installation, content: string): Promise<void>;
  backupFile(sourcePath: string, backupPath: string): Promise<void>;
  restoreBackup(backupPath: string, targetPath: string): Promise<void>;
}

type RawTweakccApi = TweakccApi;

async function loadTweakcc(): Promise<RawTweakccApi> {
  // tweakcc 4.0.13 declares dist/lib/index.d.ts, but the published tarball omits it.
  // @ts-expect-error local wrapper supplies the types above until tweakcc ships d.ts.
  return await import('tweakcc') as RawTweakccApi;
}

export async function findAllInstallations(): Promise<Installation[]> {
  return (await loadTweakcc()).findAllInstallations();
}

export async function tryDetectInstallation(
  options: DetectInstallationOptions = {}
): Promise<Installation> {
  return (await loadTweakcc()).tryDetectInstallation(options);
}

export async function readContent(installation: Installation): Promise<string> {
  return (await loadTweakcc()).readContent(installation);
}

export async function writeContent(
  installation: Installation,
  content: string
): Promise<void> {
  await (await loadTweakcc()).writeContent(installation, content);
}

export async function backupFile(
  sourcePath: string,
  backupPath: string
): Promise<void> {
  await (await loadTweakcc()).backupFile(sourcePath, backupPath);
}

export async function restoreBackup(
  backupPath: string,
  targetPath: string
): Promise<void> {
  await (await loadTweakcc()).restoreBackup(backupPath, targetPath);
}

export const tweakccApi: TweakccApi = {
  findAllInstallations,
  tryDetectInstallation,
  readContent,
  writeContent,
  backupFile,
  restoreBackup,
};
