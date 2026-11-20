import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { aiGateway } from '@/lib/gateway';
import { BenchmarkResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const testCases = db.getTestCases();
  return NextResponse.json({ success: true, testCases });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { testCaseId, provider, model } = body;

    const testCases = db.getTestCases();
    const casesToRun = testCaseId 
      ? testCases.filter((tc) => tc.id === testCaseId)
      : testCases;

    if (casesToRun.length === 0) {
      return NextResponse.json({ success: false, error: 'Test case not found' }, { status: 404 });
    }

    const results: BenchmarkResult[] = [];

    for (const tc of casesToRun) {
      const startTime = Date.now();
      try {
        const resp = await aiGateway.executeChat(
          [{ role: 'user', content: tc.prompt }],
          {
            preferredProvider: provider,
            preferredModel: model,
            temperature: 0.7,
          }
        );

        results.push({
          testCaseId: tc.id,
          testCaseName: tc.name,
          prompt: tc.prompt,
          provider: resp.provider,
          model: resp.model,
          response: resp.content,
          latencyMs: resp.latencyMs,
          tokens: resp.usage.totalTokens,
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        results.push({
          testCaseId: tc.id,
          testCaseName: tc.name,
          prompt: tc.prompt,
          provider: provider || 'groq',
          model: model || 'none',
          response: `Error: ${err.message}`,
          latencyMs: Date.now() - startTime,
          tokens: 0,
          success: false,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

