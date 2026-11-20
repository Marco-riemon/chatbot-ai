import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { ResponseEvaluation } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const evaluations = db.getResponseEvaluations();

  if (evaluations.length === 0) {
    return NextResponse.json({
      success: true,
      summary: {
        totalEvaluated: 0,
        avgAccuracy: 5.0,
        avgRelevance: 5.0,
        avgNaturalness: 5.0,
        avgContextAwareness: 5.0,
        overallAvg: 5.0,
      },
      evaluations: [],
    });
  }

  let totalAcc = 0;
  let totalRel = 0;
  let totalNat = 0;
  let totalCtx = 0;

  for (const e of evaluations) {
    totalAcc += e.scores.accuracy;
    totalRel += e.scores.relevance;
    totalNat += e.scores.naturalness;
    totalCtx += e.scores.contextAwareness;
  }

  const count = evaluations.length;
  const avgAccuracy = +(totalAcc / count).toFixed(2);
  const avgRelevance = +(totalRel / count).toFixed(2);
  const avgNaturalness = +(totalNat / count).toFixed(2);
  const avgContextAwareness = +(totalCtx / count).toFixed(2);
  const overallAvg = +((avgAccuracy + avgRelevance + avgNaturalness + avgContextAwareness) / 4).toFixed(2);

  return NextResponse.json({
    success: true,
    summary: {
      totalEvaluated: count,
      avgAccuracy,
      avgRelevance,
      avgNaturalness,
      avgContextAwareness,
      overallAvg,
    },
    evaluations: evaluations.slice(-50).reverse(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, messageId, provider, model, scores, feedback } = body;

    if (!conversationId || !messageId || !scores) {
      return NextResponse.json(
        { success: false, error: 'conversationId, messageId, and scores are required' },
        { status: 400 }
      );
    }

    const activePrompt = db.getActivePrompt();

    const newEvaluation: ResponseEvaluation = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      messageId,
      provider: provider || 'groq',
      model: model || 'openai/gpt-oss-20b',
      promptVersion: activePrompt.name,
      scores: {
        accuracy: Math.max(1, Math.min(5, scores.accuracy || 5)),
        relevance: Math.max(1, Math.min(5, scores.relevance || 5)),
        naturalness: Math.max(1, Math.min(5, scores.naturalness || 5)),
        contextAwareness: Math.max(1, Math.min(5, scores.contextAwareness || 5)),
      },
      feedback: feedback?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    db.addResponseEvaluation(newEvaluation);

    return NextResponse.json({ success: true, evaluation: newEvaluation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

