import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 智谱 embedding-2 客户端
const zhipuClient = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // 调用智谱 embedding-2
    const response = await zhipuClient.embeddings.create({
      model: 'embedding-2',
      input: text,
    });

    const embedding = response.data[0].embedding;

    return NextResponse.json({
      embedding,
      model: 'embedding-2',
      usage: response.usage,
    });
  } catch (error) {
    console.error('Embedding API error:', error);
    return NextResponse.json(
      { error: 'Embedding generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
