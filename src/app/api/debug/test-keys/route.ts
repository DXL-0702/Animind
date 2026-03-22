import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { signVisualRequest } from '@/lib/volcengine/signer';

// ============ Key 格式检查 ============

interface KeyCheck {
  name: string;
  value: string | undefined;
  issues: string[];
}

function checkKeyFormat(name: string, value: string | undefined, opts?: {
  expectNumeric?: boolean;
  minLength?: number;
  expectedPrefix?: string;
}): KeyCheck {
  const issues: string[] = [];

  if (!value) {
    issues.push('❌ 未设置（undefined）');
    return { name, value, issues };
  }

  if (value !== value.trim()) {
    issues.push(`⚠️ 包含前后空格/换行！原长度=${value.length}，trim后=${value.trim().length}`);
  }

  if (value.includes('\n') || value.includes('\r')) {
    issues.push('⚠️ 包含换行符');
  }

  const trimmed = value.trim();

  if (opts?.expectNumeric && !/^\d+$/.test(trimmed)) {
    issues.push(`⚠️ 期望纯数字，但实际值包含非数字字符`);
  }

  if (opts?.minLength && trimmed.length < opts.minLength) {
    issues.push(`⚠️ 长度过短（${trimmed.length}），期望至少 ${opts.minLength} 字符`);
  }

  if (opts?.expectedPrefix && !trimmed.startsWith(opts.expectedPrefix)) {
    issues.push(`⚠️ 不以 "${opts.expectedPrefix}" 开头，当前前缀: "${trimmed.slice(0, 8)}..."`);
  }

  if (issues.length === 0) {
    issues.push(`✅ 格式正常（长度=${trimmed.length}，前缀="${trimmed.slice(0, 6)}..."）`);
  }

  return { name, value: `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`, issues };
}

// ============ 测试函数 ============

async function testTTS(): Promise<Record<string, unknown>> {
  const appId = process.env.VOLCENGINE_TTS_APPID?.trim();
  const accessToken = process.env.VOLCENGINE_TTS_ACCESS_TOKEN?.trim();

  if (!appId || !accessToken) {
    return { status: '❌ SKIP', error: 'VOLCENGINE_TTS_APPID 或 VOLCENGINE_TTS_ACCESS_TOKEN 未配置' };
  }

  try {
    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${accessToken}`,
      },
      body: JSON.stringify({
        app: { appid: appId, token: accessToken, cluster: 'volcano_tts' },
        user: { uid: 'debug-test' },
        audio: { voice_type: 'BV700_V2_streaming', encoding: 'mp3' },
        request: { reqid: randomUUID(), text: '测试', operation: 'query' },
      }),
    });

    const httpStatus = response.status;

    if (!response.ok) {
      const errText = await response.text();
      return {
        status: '❌ FAIL',
        http_status: httpStatus,
        error: errText,
        hint: httpStatus === 401 || httpStatus === 403
          ? '🔑 Token 不正确，请确认 VOLCENGINE_TTS_ACCESS_TOKEN 来自「豆包语音控制台 → 应用管理」'
          : '请检查服务是否已开通',
      };
    }

    const data = await response.json();

    if (data.code === 3000) {
      return { status: '✅ OK', code: data.code, message: data.message, audio_length: data.data?.length || 0 };
    }

    return {
      status: '❌ FAIL',
      code: data.code,
      message: data.message,
      hint: '返回码不是 3000，可能 AppID 和 Token 不匹配，或语音服务未开通',
    };
  } catch (err) {
    return { status: '❌ ERROR', error: String(err) };
  }
}

async function testDoubao(): Promise<Record<string, unknown>> {
  const apiKey = process.env.ARK_API_KEY?.trim();

  if (!apiKey) {
    return { status: '❌ SKIP', error: 'ARK_API_KEY 未配置' };
  }

  // 测试两个可能的模型名
  const modelNames = ['doubao-seedream-5-0-260128', 'doubao-seedream-5-0-lite-260128'];
  const results: Record<string, unknown>[] = [];

  for (const model of modelNames) {
    try {
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: 'a simple red circle on white background',
          size: '1920x1920',
          response_format: 'url',
          watermark: false,
        }),
      });

      const httpStatus = response.status;

      if (!response.ok) {
        let errData: Record<string, unknown> = {};
        try { errData = await response.json(); } catch { errData = { raw: await response.text() }; }

        results.push({
          model,
          status: '❌ FAIL',
          http_status: httpStatus,
          error: errData,
          hint: httpStatus === 401
            ? '🔑 ARK_API_KEY 不正确，请确认来自「火山方舟 → API Key 管理」'
            : httpStatus === 404
              ? `模型名 "${model}" 不存在`
              : undefined,
        });
        continue;
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      results.push({
        model,
        status: imageUrl ? '✅ OK' : '⚠️ 无图片URL',
        image_url: imageUrl ? `${imageUrl.slice(0, 60)}...` : null,
      });

      // 如果成功了就不测下一个模型名
      if (imageUrl) break;
    } catch (err) {
      results.push({ model, status: '❌ ERROR', error: String(err) });
    }
  }

  const successModel = results.find(r => (r.status as string).startsWith('✅'));
  return {
    status: successModel ? '✅ OK' : '❌ FAIL',
    working_model: successModel ? successModel.model : null,
    tests: results,
    hint: !successModel
      ? '两个模型名都失败了。如果 HTTP 401 → Key 不对；如果 404 → 模型名不对，请在方舟控制台确认可用模型'
      : undefined,
  };
}

async function testJimeng(): Promise<Record<string, unknown>> {
  const accessKey = process.env.VOLCENGINE_ACCESS_KEY?.trim();
  const secretKey = process.env.VOLCENGINE_SECRET_KEY?.trim();

  if (!accessKey || !secretKey) {
    return { status: '❌ SKIP', error: 'VOLCENGINE_ACCESS_KEY 或 VOLCENGINE_SECRET_KEY 未配置' };
  }

  try {
    // Submit a test task to the Visual API
    const body = {
      req_key: 'jimeng_t2i_v40',
      prompt: 'a simple red circle on white background',
      width: 1024,
      height: 1024,
      return_url: true,
    };

    const signed = signVisualRequest('CVSync2AsyncSubmitTask', '2022-08-31', body);

    const response = await fetch(signed.url, {
      method: 'POST',
      headers: signed.headers,
      body: signed.body,
    });

    const httpStatus = response.status;

    if (!response.ok) {
      let errData: Record<string, unknown> = {};
      try { errData = await response.json(); } catch { errData = { raw: await response.text() }; }

      return {
        status: '❌ FAIL',
        api: 'visual.volcengineapi.com (CVSync2AsyncSubmitTask)',
        http_status: httpStatus,
        error: errData,
        hint: httpStatus === 401 || httpStatus === 403
          ? '🔑 VOLCENGINE_ACCESS_KEY / SECRET_KEY 不正确，或未开通智能视觉服务'
          : '请检查火山引擎智能视觉API服务状态',
      };
    }

    const data = await response.json();
    const taskId = data.data?.task_id;

    return {
      status: taskId ? '✅ OK' : '⚠️ 提交成功但无 task_id',
      api: 'visual.volcengineapi.com (CVSync2AsyncSubmitTask)',
      task_id: taskId || null,
      response_code: data.code,
      hint: taskId
        ? '即梦4.0任务提交成功（诊断不等待生成完成）'
        : `响应: ${JSON.stringify(data).slice(0, 200)}`,
    };
  } catch (err) {
    return { status: '❌ ERROR', api: 'visual.volcengineapi.com', error: String(err) };
  }
}

// ============ 主入口 ============

export async function GET() {
  // 1. Key 格式检查
  const keyChecks = [
    checkKeyFormat('VOLCENGINE_TTS_APPID', process.env.VOLCENGINE_TTS_APPID, { expectNumeric: true, minLength: 5 }),
    checkKeyFormat('VOLCENGINE_TTS_ACCESS_TOKEN', process.env.VOLCENGINE_TTS_ACCESS_TOKEN, { minLength: 20 }),
    checkKeyFormat('ARK_API_KEY', process.env.ARK_API_KEY, { minLength: 20 }),
    checkKeyFormat('VOLCENGINE_ACCESS_KEY', process.env.VOLCENGINE_ACCESS_KEY, { minLength: 10 }),
    checkKeyFormat('VOLCENGINE_SECRET_KEY', process.env.VOLCENGINE_SECRET_KEY, { minLength: 10 }),
  ];

  // 2. 并行测试三个服务
  const [ttsResult, doubaoResult, jimengResult] = await Promise.all([
    testTTS(),
    testDoubao(),
    testJimeng(),
  ]);

  return NextResponse.json({
    message: '🔍 Animind API 诊断报告',
    timestamp: new Date().toISOString(),

    key_format_checks: keyChecks.map(k => ({
      name: k.name,
      masked_value: k.value,
      issues: k.issues,
    })),

    service_tests: {
      tts: { service: '豆包TTS（语音合成）', ...ttsResult },
      doubao: { service: 'Doubao Seedream（方舟文生图）', ...doubaoResult },
      jimeng: { service: '即梦 4.0（智能视觉API jimeng_t2i_v40）', ...jimengResult },
    },

    env_guide: {
      VOLCENGINE_TTS_APPID: '豆包语音控制台 → 应用管理 → AppID（纯数字）',
      VOLCENGINE_TTS_ACCESS_TOKEN: '豆包语音控制台 → 应用管理 → Access Token',
      ARK_API_KEY: '火山方舟 → 左侧 API Key 管理 → 创建/复制（Doubao 文生图）',
      VOLCENGINE_ACCESS_KEY: '火山引擎控制台 → 密钥管理 → Access Key ID（即梦4.0使用）',
      VOLCENGINE_SECRET_KEY: '火山引擎控制台 → 密钥管理 → Secret Access Key（即梦4.0使用）',
      note: 'TTS 使用独立的 AppID + Token；Doubao 使用 ARK_API_KEY；即梦4.0 使用 VOLCENGINE_ACCESS_KEY/SECRET_KEY（HMAC签名）',
    },
  }, { status: 200 });
}
