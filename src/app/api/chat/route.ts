import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/gateway';
import { db } from '@/lib/store';
import { ChatMessage } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      messages, 
      conversationId, 
      providerPreference, 
      modelPreference,
      temperature,
      maxTokens 
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    // If conversationId is provided, save user's latest message
    const lastUserMsg = messages[messages.length - 1];
    let currentConvId = conversationId;

    if (currentConvId && lastUserMsg && lastUserMsg.role === 'user') {
      const userMsgRecord: ChatMessage = {
        id: `msg_${Date.now()}_u`,
        conversationId: currentConvId,
        role: 'user',
        content: lastUserMsg.content,
        createdAt: new Date().toISOString(),
      };
      db.addMessage(currentConvId, userMsgRecord);
    }

    // Call AI Gateway
    const gatewayResponse = await aiGateway.executeChat(messages, {
      conversationId: currentConvId,
      preferredProvider: providerPreference,
      preferredModel: modelPreference,
      temperature,
      maxTokens,
    });

    // Save assistant message to conversation if conversationId is provided
    if (currentConvId) {
      const assistantMsgRecord: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        conversationId: currentConvId,
        role: 'assistant',
        content: gatewayResponse.content,
        provider: gatewayResponse.provider,
        model: gatewayResponse.model,
        intent: gatewayResponse.intent,
        toolsUsed: gatewayResponse.toolsUsed,
        proposals: gatewayResponse.proposals,
        tokens: gatewayResponse.usage,
        failoverTrail: gatewayResponse.failoverTrail,
        createdAt: new Date().toISOString(),
      };
      db.addMessage(currentConvId, assistantMsgRecord);
    }

    return NextResponse.json({
      success: true,
      data: gatewayResponse,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gateway failed to process request',
        failoverTrail: error.failoverTrail || [],
      },
      { status: 500 }
    );
  }
}

