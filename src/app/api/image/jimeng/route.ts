import { NextRequest, NextResponse } from 'next/server';
import { signVisualRequest } from '@/lib/volcengine/signer';

// 即梦 4.0 via 火山引擎智能视觉API（异步提交 + 轮询）
// 端点: https://visual.volcengineapi.com
// 认证: HMAC-SHA256 签名（VOLCENGINE_ACCESS_KEY / VOLCENGINE_SECRET_KEY）

const API_VERSION = '2022-08-31';
const REQ_KEY = 'jimeng_t2i_v40';
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30; // 30 * 2s = 60s timeout

async function submitTask(prompt: string, width: number, height: number): Promise<string> {
  const body = {
    req_key: REQ_KEY,
    prompt,
    width,
    height,
  };

  const signed = signVisualRequest('CVSync2AsyncSubmitTask', API_VERSION, body);

  const response = await fetch(signed.url, {
    method: 'POST',
    headers: signed.headers,
    body: signed.body,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Jimeng submit error:', response.status, errText);
    throw new Error(`Submit failed (HTTP ${response.status}): ${errText}`);
  }

  const data = await response.json();

  if (data.code !== 10000 && data.code !== 0) {
    console.error('Jimeng submit response:', JSON.stringify(data));
    throw new Error(`Submit failed: ${data.message || JSON.stringify(data)}`);
  }

  const taskId = data.data?.task_id;
  if (!taskId) {
    console.error('Jimeng submit response (no task_id):', JSON.stringify(data));
    throw new Error('No task_id in submit response');
  }

  return taskId;
}

async function pollResult(taskId: string): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const body = {
      req_key: REQ_KEY,
      task_id: taskId,
    };

    const signed = signVisualRequest('CVSync2AsyncGetResult', API_VERSION, body);

    const response = await fetch(signed.url, {
      method: 'POST',
      headers: signed.headers,
      body: signed.body,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Jimeng poll error:', response.status, errText);
      throw new Error(`Poll failed (HTTP ${response.status}): ${errText}`);
    }

    const data = await response.json();

    // Status strings: "in_queue", "generate", "done", others=error
    const status = data.data?.status;

    if (status === 'done') {
      // Task completed — image is in binary_data_base64, not image_urls
      const base64 = data.data?.binary_data_base64?.[0];
      if (!base64) {
        console.error('Jimeng poll done but no binary_data_base64:', JSON.stringify(data));
        throw new Error('Task completed but no image data returned');
      }
      return `data:image/png;base64,${base64}`;
    }

    if (status !== 'in_queue' && status !== 'generate') {
      // Error status
      console.error('Jimeng poll error status:', JSON.stringify(data));
      throw new Error(`Task failed with status ${status}: ${data.message || JSON.stringify(data)}`);
    }

    // Still running, continue polling
  }

  throw new Error(`Task timed out after ${MAX_POLLS * POLL_INTERVAL_MS / 1000}s`);
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, negative_prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Build the full prompt (append negative prompt if provided)
    let fullPrompt = prompt;
    if (negative_prompt && typeof negative_prompt === 'string') {
      fullPrompt = `${prompt} --no ${negative_prompt}`;
    }

    // Step 1: Submit async task
    const taskId = await submitTask(fullPrompt, 1024, 1024);
    console.log('Jimeng task submitted:', taskId);

    // Step 2: Poll for result
    const imageUrl = await pollResult(taskId);
    console.log('Jimeng task completed, image URL:', imageUrl.slice(0, 60) + '...');

    return NextResponse.json({ image_url: imageUrl });
  } catch (error) {
    console.error('Jimeng image error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
