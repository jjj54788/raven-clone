import { BadRequestException, Injectable } from '@nestjs/common';

type ChatKitSessionResponse = {
  client_secret?: string;
  expires_at?: string;
  error?: { message?: string };
};

@Injectable()
export class ChatKitService {
  getStatus() {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const hasWorkflowId = !!process.env.CHATKIT_WORKFLOW_ID;
    const hasWorkflowVersion = !!process.env.CHATKIT_WORKFLOW_VERSION;
    return {
      hasApiKey,
      hasWorkflowId,
      hasWorkflowVersion,
      ready: hasApiKey && hasWorkflowId,
    };
  }

  async createSession(userId: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    const workflowId = process.env.CHATKIT_WORKFLOW_ID;
    if (!workflowId) {
      throw new BadRequestException('ChatKit workflow is not configured');
    }

    const workflowVersion = process.env.CHATKIT_WORKFLOW_VERSION;

    const payload: Record<string, unknown> = {
      user: userId,
      workflow: {
        id: workflowId,
        ...(workflowVersion ? { version: workflowVersion } : {}),
      },
    };

    const res = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'chatkit_beta=v1',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as ChatKitSessionResponse;

    if (!res.ok || !data?.client_secret) {
      const message = data?.error?.message || 'Failed to create ChatKit session';
      throw new BadRequestException(message);
    }

    return {
      client_secret: data.client_secret,
      expires_at: data.expires_at ?? null,
    };
  }
}
