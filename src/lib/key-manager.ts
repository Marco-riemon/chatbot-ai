import { ApiKeyRecord, ProviderId, KeyStatus } from './types';
import { db } from './store';

export class KeyManager {
  private static instance: KeyManager;

  public static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  private maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 10) return key.slice(0, 3) + '***' + key.slice(-2);
    return key.slice(0, 7) + '...' + key.slice(-4);
  }

  public getAllKeys(): ApiKeyRecord[] {
    const keys: ApiKeyRecord[] = [];
    const env = process.env;

    // Helper to register an env key
    const registerEnvKey = (provider: ProviderId, envVarName: string, label: string) => {
      const val = env[envVarName]?.trim();
      if (val) {
        keys.push({
          id: `env_${envVarName.toLowerCase()}`,
          provider,
          label: `${label} (${envVarName})`,
          keyMasked: this.maskKey(val),
          keySecret: val,
          status: 'ACTIVE',
          totalRequests: 0,
          totalTokens: 0,
          source: 'env',
        });
      }
    };

    // Groq keys
    registerEnvKey('groq', 'GROQ_API_KEY_1', 'Groq Primary');
    registerEnvKey('groq', 'GROQ_API_KEY_2', 'Groq Backup 1');
    registerEnvKey('groq', 'GROQ_API_KEY_3', 'Groq Backup 2');
    if (!env['GROQ_API_KEY_1'] && env['GROQ_API_KEY']) {
      registerEnvKey('groq', 'GROQ_API_KEY', 'Groq Default');
    }

    // Gemini keys
    registerEnvKey('gemini', 'GEMINI_API_KEY_1', 'Gemini Key 1');
    registerEnvKey('gemini', 'GEMINI_API_KEY_2', 'Gemini Key 2');
    if (!env['GEMINI_API_KEY_1'] && env['GEMINI_API_KEY']) {
      registerEnvKey('gemini', 'GEMINI_API_KEY', 'Gemini Default');
    }

    // OpenRouter keys
    registerEnvKey('openrouter', 'OPENROUTER_API_KEY_1', 'OpenRouter Key 1');
    registerEnvKey('openrouter', 'OPENROUTER_API_KEY_2', 'OpenRouter Key 2');
    if (!env['OPENROUTER_API_KEY_1'] && env['OPENROUTER_API_KEY']) {
      registerEnvKey('openrouter', 'OPENROUTER_API_KEY', 'OpenRouter Default');
    }

    // Cloudflare keys (stored as token:accountId)
    const cfToken = env['CLOUDFLARE_API_TOKEN']?.trim();
    const cfAccount = env['CLOUDFLARE_ACCOUNT_ID']?.trim();
    if (cfToken && cfAccount) {
      keys.push({
        id: 'env_cloudflare_token',
        provider: 'cloudflare',
        label: 'Cloudflare Workers AI',
        keyMasked: this.maskKey(cfToken),
        keySecret: `${cfToken}:${cfAccount}`,
        status: 'ACTIVE',
        totalRequests: 0,
        totalTokens: 0,
        source: 'env',
      });
    }

    // NVIDIA NIM keys
    registerEnvKey('nvidia', 'NVIDIA_API_KEY_1', 'NVIDIA NIM Key 1');
    registerEnvKey('nvidia', 'NVIDIA_API_KEY_2', 'NVIDIA NIM Key 2');
    if (!env['NVIDIA_API_KEY_1'] && env['NVIDIA_API_KEY']) {
      registerEnvKey('nvidia', 'NVIDIA_API_KEY', 'NVIDIA Default');
    }

    // Append custom keys added via UI/API
    const customKeys = db.getCustomKeys();
    keys.push(...customKeys);

    // Merge persistent overrides (status, cooldown, request counters, etc.)
    const overrides = db.getKeyStateOverrides();
    const now = Date.now();

    return keys.map((k) => {
      const override = overrides[k.id];
      if (!override) return k;

      let currentStatus = override.status;
      // Auto-recover from cooldown if timer expired (RATE_LIMITED or temporary ERROR)
      if ((currentStatus === 'RATE_LIMITED' || currentStatus === 'ERROR') && override.cooldownUntil && now > override.cooldownUntil) {
        currentStatus = 'ACTIVE';
        db.updateKeyState(k.id, { status: 'ACTIVE', cooldownUntil: undefined, lastError: undefined });
      }

      return {
        ...k,
        status: currentStatus,
        totalRequests: override.totalRequests || k.totalRequests,
        totalTokens: override.totalTokens || k.totalTokens,
        lastError: override.lastError,
        lastUsed: override.lastUsed,
        cooldownUntil: override.cooldownUntil,
      };
    });
  }

  public getActiveKeysForProvider(provider: ProviderId): ApiKeyRecord[] {
    const all = this.getAllKeys();
    return all.filter((k) => k.provider === provider && k.status === 'ACTIVE');
  }

  public getNextActiveKey(provider: ProviderId): ApiKeyRecord | null {
    const available = this.getActiveKeysForProvider(provider);
    if (available.length === 0) return null;

    // Pick least used key to evenly distribute load
    available.sort((a, b) => a.totalRequests - b.totalRequests);
    return available[0];
  }

  public recordKeySuccess(keyId: string, tokensUsed = 0) {
    const overrides = db.getKeyStateOverrides()[keyId] || {
      status: 'ACTIVE',
      totalRequests: 0,
      totalTokens: 0,
    };

    db.updateKeyState(keyId, {
      status: 'ACTIVE',
      totalRequests: (overrides.totalRequests || 0) + 1,
      totalTokens: (overrides.totalTokens || 0) + tokensUsed,
      lastUsed: new Date().toISOString(),
      lastError: undefined,
    });
  }

  public recordKeyFailure(
    keyId: string, 
    status: KeyStatus, 
    errorMessage: string, 
    cooldownSeconds = 60
  ) {
    const overrides = db.getKeyStateOverrides()[keyId] || {
      status: 'ACTIVE',
      totalRequests: 0,
      totalTokens: 0,
    };

    const cooldownUntil = (status === 'RATE_LIMITED' || status === 'ERROR')
      ? Date.now() + cooldownSeconds * 1000 
      : undefined;

    db.updateKeyState(keyId, {
      status,
      lastError: errorMessage,
      lastUsed: new Date().toISOString(),
      cooldownUntil,
    });
  }

  public resetKey(keyId: string) {
    db.updateKeyState(keyId, {
      status: 'ACTIVE',
      cooldownUntil: undefined,
      lastError: undefined,
    });
  }

  public setKeyStatus(keyId: string, status: KeyStatus) {
    db.updateKeyState(keyId, { status });
  }

  // Safe representation for frontend (stripping keySecret)
  public getKeysSafe(): Omit<ApiKeyRecord, 'keySecret'>[] {
    return this.getAllKeys().map(({ keySecret, ...rest }) => rest);
  }
}

export const keyManager = KeyManager.getInstance();

