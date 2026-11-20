import { NextResponse } from 'next/server';
import { DEFAULT_MODELS } from '@/lib/providers-config';
import { keyManager } from '@/lib/key-manager';
import { providerManager } from '@/lib/provider-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  const models = [...DEFAULT_MODELS];

  // Try to query dynamically from Groq if key is present
  const groqKey = keyManager.getNextActiveKey('groq');
  if (groqKey) {
    try {
      const groqAdapter = providerManager.getAdapter('groq');
      if (groqAdapter.listModels) {
        const liveGroqModels = await groqAdapter.listModels(groqKey.keySecret);
        if (liveGroqModels.length > 0) {
          // Merge dynamic models
          for (const m of liveGroqModels) {
            if (!models.some((existing) => existing.id === m.id)) {
              models.push(m);
            }
          }
        }
      }
    } catch (e) {
      // Ignore dynamic query errors, fall back to default models
    }
  }

  return NextResponse.json({ success: true, models });
}
