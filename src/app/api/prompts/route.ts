import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { PromptVersion } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versions = db.getPromptVersions();
  const activePrompt = db.getActivePrompt();
  return NextResponse.json({
    success: true,
    activePrompt,
    versions,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, name, version, description, systemPrompt } = body;

    if (action === 'activate' && id) {
      db.setActivePrompt(id);
      return NextResponse.json({ success: true, message: `Activated prompt version ${id}` });
    }

    if (action === 'save') {
      if (!name || !systemPrompt) {
        return NextResponse.json(
          { success: false, error: 'Name and system prompt are required' },
          { status: 400 }
        );
      }

      const newVersion: PromptVersion = {
        id: id || `pv_${Date.now()}`,
        name,
        version: version || '1.0.0',
        description: description || '',
        systemPrompt,
        isActive: false,
        createdAt: new Date().toISOString(),
      };

      db.savePromptVersion(newVersion);
      return NextResponse.json({ success: true, prompt: newVersion });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

