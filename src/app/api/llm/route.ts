import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// GLM-4-Flash 客户端（智谱AI，OpenAI兼容）
const glmClient = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
});

// DeepSeek 客户端
const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

export async function POST(request: NextRequest) {
  console.log('[DEBUG] ZHIPU_API_KEY loaded:', !!process.env.ZHIPU_API_KEY, 'length:', process.env.ZHIPU_API_KEY?.length);
  console.log('[DEBUG] DEEPSEEK_API_KEY loaded:', !!process.env.DEEPSEEK_API_KEY, 'length:', process.env.DEEPSEEK_API_KEY?.length);
  try {
    const body = await request.json();
    const { messages, temperature = 0.7, max_tokens = 2000, stream = false, provider } = body;

    // 优先使用指定provider，否则默认GLM
    const preferredProvider = provider || 'glm';

    // 尝试调用LLM（带自动降级）
    try {
      if (preferredProvider === 'glm') {
        return await callGLM(messages, temperature, max_tokens, stream);
      } else {
        return await callDeepSeek(messages, temperature, max_tokens, stream);
      }
    } catch (primaryError) {
      console.error(`Primary provider (${preferredProvider}) failed:`, primaryError);

      // 自动降级到备选provider
      try {
        if (preferredProvider === 'glm') {
          console.log('Falling back to DeepSeek...');
          return await callDeepSeek(messages, temperature, max_tokens, stream);
        } else {
          console.log('Falling back to GLM...');
          return await callGLM(messages, temperature, max_tokens, stream);
        }
      } catch (fallbackError) {
        console.error('Fallback provider also failed:', fallbackError);
        return NextResponse.json(
          {
            error: 'All LLM providers failed. Please check API keys and try again.',
            details: {
              primary: String(primaryError),
              fallback: String(fallbackError),
            },
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('LLM API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

async function callGLM(messages: any[], temperature: number, max_tokens: number, stream: boolean) {
  if (stream) {
    const streamResponse = await glmClient.chat.completions.create({
      model: 'glm-4-flash',
      messages,
      temperature,
      max_tokens,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } else {
    const response = await glmClient.chat.completions.create({
      model: 'glm-4-flash',
      messages,
      temperature,
      max_tokens,
    });

    return NextResponse.json({
      content: response.choices[0].message.content,
      model: 'glm-4-flash',
      usage: response.usage,
    });
  }
}

async function callDeepSeek(messages: any[], temperature: number, max_tokens: number, stream: boolean) {
  if (stream) {
    const streamResponse = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } else {
    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens,
    });

    return NextResponse.json({
      content: response.choices[0].message.content,
      model: 'deepseek-chat',
      usage: response.usage,
    });
  }
}
