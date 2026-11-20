import fs from 'fs';
import path from 'path';
import { db } from '../store';
import { FileOperationProposal, ToolExecutionResult } from '../types';

export class WorkspaceSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceSecurityError';
  }
}

export class FilesystemTool {
  /**
   * Resolve and validate that a requested path is strictly within the allowed workspace root.
   * Prevents path traversal (e.g. ../../etc/passwd).
   */
  public static resolveSafePath(requestedPath: string, customRoot?: string): string {
    const config = db.getWorkspaceConfig();
    const root = path.resolve(customRoot || config.rootPath || process.cwd());

    // Clean leading slashes if treated as relative to workspace root
    let target = requestedPath.trim();
    if (path.isAbsolute(target)) {
      // If absolute, check if it's already within root
      const rel = path.relative(root, target);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new WorkspaceSecurityError(
          `Akses Ditolak: Jalur "${requestedPath}" berada di luar workspace yang diizinkan (${root}).`
        );
      }
      return target;
    }

    const resolved = path.resolve(root, target);
    const relative = path.relative(root, resolved);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new WorkspaceSecurityError(
        `Akses Ditolak: Path traversal terdeteksi pada "${requestedPath}".`
      );
    }

    // Protect sensitive system files
    const forbiddenPatterns = ['.env', '.git/', '.git\\', 'id_rsa', '.bashrc', '.zshrc'];
    for (const pattern of forbiddenPatterns) {
      if (relative === pattern || relative.startsWith(pattern) || path.basename(resolved) === '.env') {
        throw new WorkspaceSecurityError(
          `Akses Ditolak: File atau folder sensitif "${pattern}" dilindungi dan tidak dapat diakses secara langsung.`
        );
      }
    }

    return resolved;
  }

  /**
   * List files and folders inside the workspace directory.
   */
  public static listDirectory(subDir = '', maxItems = 100): ToolExecutionResult {
    const config = db.getWorkspaceConfig();
    const resolvedPath = this.resolveSafePath(subDir);

    if (!fs.existsSync(resolvedPath)) {
      return {
        toolName: 'Filesystem (List Directory)',
        input: subDir || '.',
        output: `Error: Direktori "${subDir}" tidak ditemukan di dalam workspace.`,
      };
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return {
        toolName: 'Filesystem (List Directory)',
        input: subDir || '.',
        output: `Error: "${subDir}" adalah file, bukan direktori.`,
      };
    }

    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    const items = entries
      .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules')
      .slice(0, maxItems)
      .map((e) => {
        const full = path.join(resolvedPath, e.name);
        const isDir = e.isDirectory();
        let size = 0;
        try {
          if (!isDir) size = fs.statSync(full).size;
        } catch {}
        return `${isDir ? '📁 [DIR]' : '📄 [FILE]'} ${e.name} ${!isDir ? `(${size} bytes)` : ''}`;
      });

    const relRoot = path.relative(config.rootPath, resolvedPath) || '.';
    return {
      toolName: 'Filesystem (List Directory)',
      input: subDir || '.',
      output: `Daftar isi folder "${relRoot}":\n${items.join('\n') || '(Folder kosong)'}`,
    };
  }

  /**
   * Read file content safely up to 100KB.
   */
  public static readFile(filePath: string): ToolExecutionResult {
    const config = db.getWorkspaceConfig();
    const resolvedPath = this.resolveSafePath(filePath);

    if (!fs.existsSync(resolvedPath)) {
      return {
        toolName: 'Filesystem (Read File)',
        input: filePath,
        output: `Error: File "${filePath}" tidak ditemukan di dalam workspace.`,
      };
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      return {
        toolName: 'Filesystem (Read File)',
        input: filePath,
        output: `Error: "${filePath}" adalah direktori. Gunakan listDirectory.`,
      };
    }

    const maxBytes = 100 * 1024; // 100KB limit
    let content = fs.readFileSync(resolvedPath, 'utf-8');
    let truncated = false;
    if (content.length > maxBytes) {
      content = content.slice(0, maxBytes) + '\n\n... [Konten dipotong karena melebihi batas 100KB]';
      truncated = true;
    }

    const relPath = path.relative(config.rootPath, resolvedPath);
    return {
      toolName: 'Filesystem (Read File)',
      input: filePath,
      output: `Isi file "${relPath}" (${stat.size} bytes${truncated ? ', truncated' : ''}):\n\`\`\`\n${content}\n\`\`\``,
      sources: [{ title: `Workspace: ${relPath}`, snippet: content.slice(0, 200) }],
    };
  }

  /**
   * Propose or execute file creation.
   */
  public static proposeCreateFile(
    filePath: string,
    content: string,
    conversationId?: string
  ): { toolResult: ToolExecutionResult; proposal?: FileOperationProposal } {
    const config = db.getWorkspaceConfig();
    const resolvedPath = this.resolveSafePath(filePath);
    const relPath = path.relative(config.rootPath, resolvedPath);

    if (config.readOnly) {
      return {
        toolResult: {
          toolName: 'Filesystem (Create File)',
          input: filePath,
          output: `Error: Workspace sedang dalam mode Read-Only. Pembuatan file "${relPath}" dibatalkan.`,
        },
      };
    }

    if (config.requireConfirmation) {
      const proposal: FileOperationProposal = {
        id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId,
        action: 'create',
        filePath: relPath,
        content,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
      };
      db.saveProposal(proposal);

      return {
        toolResult: {
          toolName: 'Filesystem (Create File Proposal)',
          input: filePath,
          output: `[PROPOSAL DIAJUKAN]: Permintaan membuat file "${relPath}" (${content.length} karakter) menunggu konfirmasi dan persetujuan pengguna.`,
        },
        proposal,
      };
    }

    // Direct execution if confirmation is disabled
    try {
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(resolvedPath, content, 'utf-8');
      return {
        toolResult: {
          toolName: 'Filesystem (Create File)',
          input: filePath,
          output: `Sukses membuat file "${relPath}" (${content.length} karakter).`,
        },
      };
    } catch (err: any) {
      return {
        toolResult: {
          toolName: 'Filesystem (Create File)',
          input: filePath,
          output: `Gagal membuat file "${relPath}": ${err.message}`,
        },
      };
    }
  }

  /**
   * Propose or execute file edit.
   */
  public static proposeEditFile(
    filePath: string,
    newContent: string,
    conversationId?: string
  ): { toolResult: ToolExecutionResult; proposal?: FileOperationProposal } {
    const config = db.getWorkspaceConfig();
    const resolvedPath = this.resolveSafePath(filePath);
    const relPath = path.relative(config.rootPath, resolvedPath);

    if (config.readOnly) {
      return {
        toolResult: {
          toolName: 'Filesystem (Edit File)',
          input: filePath,
          output: `Error: Workspace sedang dalam mode Read-Only. Pengeditan file "${relPath}" dibatalkan.`,
        },
      };
    }

    if (!fs.existsSync(resolvedPath)) {
      return {
        toolResult: {
          toolName: 'Filesystem (Edit File)',
          input: filePath,
          output: `Error: File "${relPath}" tidak ditemukan untuk diedit.`,
        },
      };
    }

    if (config.requireConfirmation) {
      const proposal: FileOperationProposal = {
        id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId,
        action: 'edit',
        filePath: relPath,
        content: newContent,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
      };
      db.saveProposal(proposal);

      return {
        toolResult: {
          toolName: 'Filesystem (Edit File Proposal)',
          input: filePath,
          output: `[PROPOSAL DIAJUKAN]: Permintaan mengedit file "${relPath}" menunggu konfirmasi pengguna.`,
        },
        proposal,
      };
    }

    // Direct execution
    try {
      fs.writeFileSync(resolvedPath, newContent, 'utf-8');
      return {
        toolResult: {
          toolName: 'Filesystem (Edit File)',
          input: filePath,
          output: `Sukses memperbarui file "${relPath}".`,
        },
      };
    } catch (err: any) {
      return {
        toolResult: {
          toolName: 'Filesystem (Edit File)',
          input: filePath,
          output: `Gagal mengedit file "${relPath}": ${err.message}`,
        },
      };
    }
  }

  /**
   * Propose or execute file deletion.
   */
  public static proposeDeleteFile(
    filePath: string,
    conversationId?: string
  ): { toolResult: ToolExecutionResult; proposal?: FileOperationProposal } {
    const config = db.getWorkspaceConfig();
    const resolvedPath = this.resolveSafePath(filePath);
    const relPath = path.relative(config.rootPath, resolvedPath);

    if (config.readOnly) {
      return {
        toolResult: {
          toolName: 'Filesystem (Delete File)',
          input: filePath,
          output: `Error: Workspace sedang dalam mode Read-Only. Penghapusan file "${relPath}" dibatalkan.`,
        },
      };
    }

    if (!fs.existsSync(resolvedPath)) {
      return {
        toolResult: {
          toolName: 'Filesystem (Delete File)',
          input: filePath,
          output: `Error: File "${relPath}" tidak ditemukan untuk dihapus.`,
        },
      };
    }

    if (config.requireConfirmation) {
      const proposal: FileOperationProposal = {
        id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId,
        action: 'delete',
        filePath: relPath,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
      };
      db.saveProposal(proposal);

      return {
        toolResult: {
          toolName: 'Filesystem (Delete File Proposal)',
          input: filePath,
          output: `[PROPOSAL DIAJUKAN]: Permintaan menghapus file "${relPath}" menunggu persetujuan pengguna.`,
        },
        proposal,
      };
    }

    // Direct execution
    try {
      fs.unlinkSync(resolvedPath);
      return {
        toolResult: {
          toolName: 'Filesystem (Delete File)',
          input: filePath,
          output: `Sukses menghapus file "${relPath}".`,
        },
      };
    } catch (err: any) {
      return {
        toolResult: {
          toolName: 'Filesystem (Delete File)',
          input: filePath,
          output: `Gagal menghapus file "${relPath}": ${err.message}`,
        },
      };
    }
  }

  /**
   * Execute an approved proposal.
   */
  public static executeApprovedProposal(proposalId: string): { success: boolean; message: string } {
    const proposal = db.getProposal(proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal tidak ditemukan.' };
    }

    if (proposal.status === 'EXECUTED') {
      return { success: true, message: 'Proposal sudah dijalankan sebelumnya.' };
    }

    if (proposal.status === 'REJECTED') {
      return { success: false, message: 'Proposal telah ditolak.' };
    }

    try {
      const resolvedPath = this.resolveSafePath(proposal.filePath);

      if (proposal.action === 'create' || proposal.action === 'edit') {
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(resolvedPath, proposal.content || '', 'utf-8');
      } else if (proposal.action === 'delete') {
        if (fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
        }
      }

      proposal.status = 'EXECUTED';
      db.saveProposal(proposal);

      return {
        success: true,
        message: `Aksi ${proposal.action.toUpperCase()} pada "${proposal.filePath}" berhasil dieksekusi.`,
      };
    } catch (err: any) {
      proposal.status = 'PENDING';
      proposal.error = err.message;
      db.saveProposal(proposal);
      return { success: false, message: `Gagal mengeksekusi aksi: ${err.message}` };
    }
  }

  /**
   * Reject a proposal.
   */
  public static rejectProposal(proposalId: string): { success: boolean; message: string } {
    const proposal = db.getProposal(proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal tidak ditemukan.' };
    }

    proposal.status = 'REJECTED';
    db.saveProposal(proposal);
    return {
      success: true,
      message: `Aksi ${proposal.action.toUpperCase()} pada "${proposal.filePath}" berhasil ditolak.`,
    };
  }
}

