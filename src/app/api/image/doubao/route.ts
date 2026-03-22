import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ARK_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-seedream-5-0-260128',
        prompt,
        size: '1920x1920',
        response_format: 'url',
        watermark: false,
      }),
    });

    if (!response.ok) {
      let errMsg = 'Image generation failed';
      try {
        const errData = await response.json();
        errMsg = errData.error?.message || errData.message || errMsg;
        console.error('Doubao image API error:', errData);
      } catch {
        const errText = await response.text();
        console.error('Doubao image API error:', errText);
      }
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      console.error('Doubao image response:', JSON.stringify(data));
      return NextResponse.json({ error: 'No image URL in response' }, { status: 502 });
    }

    // 服务端代理下载图片并转为 base64，避免浏览器端 CORS 限制
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to fetch generated image: ${imgRes.status}` }, { status: 502 });
    }
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString('base64');
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    return NextResponse.json({ image_url: `data:${contentType};base64,${base64}` });
  } catch (error) {
    console.error('Doubao image error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
