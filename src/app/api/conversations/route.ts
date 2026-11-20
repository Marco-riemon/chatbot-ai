import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { Conversation } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conversations = db.getConversations();
  return NextResponse.json({ success: true, conversations });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: body.title || 'Percakapan Baru',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: body.provider || 'groq',
      model: body.model || 'openai/gpt-oss-20b',
      messageCount: 0,
    };

    db.saveConversation(newConv);
    return NextResponse.json({ success: true, conversation: newConv });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
