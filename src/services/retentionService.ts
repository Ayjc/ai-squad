import { invoke } from '@tauri-apps/api/core';

export type RetentionReport = {
  db_path: string;
  db_size_bytes: number;
  max_bytes: number;
  max_days: number;
  deleted_rows: number;
};

export async function retentionRun(dryRun = false): Promise<RetentionReport> {
  return await invoke<RetentionReport>('retention_run', { dryRun });
}
