import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const conversation = db.getConversation(id);
  if (!conversation) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const messages = db.getMessages(id);
  return NextResponse.json({ success: true, conversation, messages });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  db.deleteConversation(id);
  return NextResponse.json({ success: true, deletedId: id });
}

