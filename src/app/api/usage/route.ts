import { NextResponse } from 'next/server';
import { db } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs = db.getUsageLogs(100);

  let totalRequests = logs.length;
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalLatency = 0;

  const providerCounts: Record<string, number> = {
    groq: 0,
    gemini: 0,
    openrouter: 0,
    cloudflare: 0,
    nvidia: 0,
  };

  const statusCounts = {
    SUCCESS: 0,
    FALLBACK: 0,
    ERROR: 0,
  };

  for (const log of logs) {
    totalTokens += log.totalTokens || 0;
    promptTokens += log.promptTokens || 0;
    completionTokens += log.completionTokens || 0;
    totalLatency += log.latencyMs || 0;

    if (providerCounts[log.provider] !== undefined) {
      providerCounts[log.provider]++;
    }
    if (statusCounts[log.status] !== undefined) {
      statusCounts[log.status]++;
    }
  }

  const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

  return NextResponse.json({
    success: true,
    summary: {
      totalRequests,
      totalTokens,
      promptTokens,
      completionTokens,
      avgLatencyMs,
      providerCounts,
      statusCounts,
    },
    recentLogs: logs,
  });
}
