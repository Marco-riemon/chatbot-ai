import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/store';

export const dynamic = 'force-dynamic';

function safeListDirectory(rootPath: string): { name: string; type: 'file' | 'directory'; path: string }[] {
  if (!rootPath || !fs.existsSync(rootPath)) return [];
  try {
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    const IGNORE = new Set(['.git', 'node_modules', '.next', '__pycache__', '.DS_Store']);
    return entries
      .filter((e) => !IGNORE.has(e.name))
      .slice(0, 100)
      .map((e): { name: string; type: 'file' | 'directory'; path: string } => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        path: path.join(rootPath, e.name),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}

export async function GET() {
  const config = db.getWorkspaceConfig();
  const proposals = db.getProposals().filter((p) => p.status === 'PENDING');
  const listing = safeListDirectory(config.rootPath);

  return NextResponse.json({
    success: true,
    config,
    listing,
    pendingProposals: proposals,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rootPath, readOnly, requireConfirmation, enabled } = body;

    const updates: any = {};

    if (rootPath !== undefined) {
      const trimmed = rootPath.trim();
      if (trimmed === '') {
        // Allow clearing the path
        updates.rootPath = '';
        updates.enabled = false;
      } else {
        const resolved = path.resolve(trimmed);
        if (!fs.existsSync(resolved)) {
          return NextResponse.json(
            { success: false, error: `Folder "${resolved}" tidak ditemukan di komputer lokal.` },
            { status: 400 }
          );
        }
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
          return NextResponse.json(
            { success: false, error: `Path "${resolved}" bukan folder (direktori).` },
            { status: 400 }
          );
        }
        updates.rootPath = resolved;
      }
    }

    if (readOnly !== undefined) updates.readOnly = Boolean(readOnly);
    if (requireConfirmation !== undefined) updates.requireConfirmation = Boolean(requireConfirmation);
    if (enabled !== undefined) updates.enabled = Boolean(enabled);

    const updatedConfig = db.updateWorkspaceConfig(updates);
    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
