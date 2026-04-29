// config.ts - Configuration handling for snapshot index
import { mkdir } from 'fs/promises';
import type { SnapshotIndex } from '../types';
import { getSnapshotsDir, getSnapshotIndexPath } from './paths';

/**
 * Reads the snapshot index for a project, or returns an empty index if not found.
 * Handles missing file gracefully by returning a valid empty index.
 */
export async function readSnapshotIndex(projectPath: string): Promise<SnapshotIndex> {
  const indexPath = getSnapshotIndexPath(projectPath);
  const file = Bun.file(indexPath);

  const exists = await file.exists();
  if (!exists) {
    return { version: 1, snapshots: [] };
  }

  try {
    const content = await file.json();
    // Basic validation - ensure it has the expected structure
    if (content && typeof content === 'object' && 'version' in content && 'snapshots' in content) {
      return content as SnapshotIndex;
    }
    // If structure is invalid, return empty index
    return { version: 1, snapshots: [] };
  } catch {
    // JSON parse error - return empty index
    return { version: 1, snapshots: [] };
  }
}

/**
 * Writes the snapshot index atomically.
 * Creates the snapshots directory if it doesn't exist.
 */
export async function writeSnapshotIndex(projectPath: string, index: SnapshotIndex): Promise<void> {
  await ensureSnapshotsDir(projectPath);
  const indexPath = getSnapshotIndexPath(projectPath);

  // Write atomically: write to temp file, then rename
  const tempPath = `${indexPath}.tmp`;
  const content = JSON.stringify(index, null, 2);

  await Bun.write(tempPath, content);

  // Rename temp to final (atomic on POSIX systems)
  const fs = await import('fs/promises');
  try {
    await fs.rename(tempPath, indexPath);
  } catch (err) {
    // Clean up temp file on rename failure
    try { await fs.unlink(tempPath); } catch { /* ignore cleanup errors */ }
    throw err;
  }
}

/**
 * Ensures the .claude-snapshots directory exists for a project.
 * Creates it if needed with appropriate permissions.
 */
export async function ensureSnapshotsDir(projectPath: string): Promise<void> {
  const snapshotsDir = getSnapshotsDir(projectPath);
  await mkdir(snapshotsDir, { recursive: true });
}
