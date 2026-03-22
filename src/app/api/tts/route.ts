import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Edge TTS voice_id → 豆包TTS voice_type 映射（兼容旧角色数据）
const VOICE_ID_MAP: Record<string, string> = {
  // 中文声音
  'zh-CN-XiaoxiaoNeural': 'BV700_V2_streaming',
  'zh-CN-XiaoyiNeural': 'BV034_streaming',
  'zh-CN-YunjianNeural': 'BV001_V2_streaming',
  'zh-CN-YunxiNeural': 'BV002_streaming',
  'zh-CN-YunxiaNeural': 'BV021_streaming',
  // 日语声音
  'ja-JP-NanamiNeural': 'BV521_streaming',   // 萌系少女（日语女声）
  'ja-JP-KeitaNeural': 'BV524_streaming',     // 日语男声
  'ja-JP-DaichiNeural': 'BV524_streaming',    // 日语男声（毒舌语气）
};

function resolveVoiceType(voiceId: string): string {
  return VOICE_ID_MAP[voiceId] || voiceId;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const appId = process.env.VOLCENGINE_TTS_APPID;
    const accessToken = process.env.VOLCENGINE_TTS_ACCESS_TOKEN;

    if (!appId || !accessToken) {
      return NextResponse.json({ error: 'TTS credentials not configured' }, { status: 500 });
    }

    const safeText = text.slice(0, 500);
    const voiceType = resolveVoiceType(voice || 'BV700_V2_streaming');

    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${accessToken}`,
      },
      body: JSON.stringify({
        app: { appid: appId, token: accessToken, cluster: 'volcano_tts' },
        user: { uid: 'animind-tts' },
        audio: { voice_type: voiceType, encoding: 'mp3' },
        request: { reqid: randomUUID(), text: safeText, operation: 'query' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Doubao TTS API error:', errText);
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 502 });
    }

    const data = await response.json();

    if (data.code !== 3000) {
      console.error('TTS error code:', data.code, data.message);
      return NextResponse.json({ error: data.message || 'TTS failed' }, { status: 502 });
    }

    if (!data.data) {
      console.error('Doubao TTS response:', JSON.stringify(data));
      return NextResponse.json({ error: 'No audio data in response' }, { status: 502 });
    }

    // Decode base64 audio and return as binary
    const audioBuffer = Buffer.from(data.data, 'base64');

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}
