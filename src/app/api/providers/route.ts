import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS_CONFIG } from '@/lib/providers-config';
import { providerManager } from '@/lib/provider-manager';
import { keyManager } from '@/lib/key-manager';
import { db } from '@/lib/store';
import { ProviderId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const allKeys = keyManager.getAllKeys();
  const enabledMap = db.getProviderEnabled();

  const providers = Object.values(PROVIDERS_CONFIG).map((cfg) => {
    const providerKeys = allKeys.filter((k) => k.provider === cfg.id);
    const activeKeys = providerKeys.filter((k) => k.status === 'ACTIVE');
    const isEnabled = enabledMap[cfg.id as ProviderId] !== false;

    return {
      ...cfg,
      isEnabled,
      totalKeys: providerKeys.length,
      activeKeys: activeKeys.length,
      hasAvailableKeys: activeKeys.length > 0,
    };
  });

  return NextResponse.json({ success: true, providers });
}

export async function POST(req: NextRequest) {
  try {
    const { provider, enabled } = await req.json();
    if (!provider) {
      return NextResponse.json({ success: false, error: 'Provider is required' }, { status: 400 });
    }
    db.setProviderEnabled(provider as ProviderId, Boolean(enabled));
    return NextResponse.json({ success: true, provider, enabled: Boolean(enabled) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
