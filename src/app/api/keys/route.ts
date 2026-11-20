import { NextRequest, NextResponse } from 'next/server';
import { keyManager } from '@/lib/key-manager';
import { db } from '@/lib/store';
import { ApiKeyRecord, KeyStatus, ProviderId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = keyManager.getKeysSafe();
  return NextResponse.json({ success: true, keys });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, keyId, provider, label, keySecret, status } = body;

    if (action === 'reset' && keyId) {
      keyManager.resetKey(keyId);
      return NextResponse.json({ success: true, message: 'Key cooldown reset to ACTIVE' });
    }

    if (action === 'setStatus' && keyId && status) {
      keyManager.setKeyStatus(keyId, status as KeyStatus);
      return NextResponse.json({ success: true, keyId, status });
    }

    if (action === 'delete' && keyId) {
      db.deleteCustomKey(keyId);
      return NextResponse.json({ success: true, message: 'Custom key deleted' });
    }

    if (action === 'add') {
      if (!provider || !keySecret || !keySecret.trim()) {
        return NextResponse.json({ success: false, error: 'Provider and Key are required' }, { status: 400 });
      }

      const rawKey = keySecret.trim();
      const mask = rawKey.length <= 10 
        ? rawKey.slice(0, 3) + '***' + rawKey.slice(-2) 
        : rawKey.slice(0, 7) + '...' + rawKey.slice(-4);

      const newKey: ApiKeyRecord = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        provider: provider as ProviderId,
        label: label || `Custom ${provider.toUpperCase()} Key`,
        keyMasked: mask,
        keySecret: rawKey,
        status: 'ACTIVE',
        totalRequests: 0,
        totalTokens: 0,
        source: 'user',
      };

      db.saveCustomKey(newKey);
      const { keySecret: _, ...safeKey } = newKey;
      return NextResponse.json({ success: true, key: safeKey });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
