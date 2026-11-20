import { NextRequest, NextResponse } from 'next/server';
import { FilesystemTool } from '@/lib/tools/filesystem';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposalId, decision } = body;

    if (!proposalId || !decision) {
      return NextResponse.json(
        { success: false, error: 'proposalId dan decision (approve/reject) wajib disertakan.' },
        { status: 400 }
      );
    }

    if (decision === 'approve') {
      const result = FilesystemTool.executeApprovedProposal(proposalId);
      return NextResponse.json({ success: result.success, message: result.message });
    }

    if (decision === 'reject') {
      const result = FilesystemTool.rejectProposal(proposalId);
      return NextResponse.json({ success: result.success, message: result.message });
    }

    return NextResponse.json({ success: false, error: 'Decision tidak valid.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

