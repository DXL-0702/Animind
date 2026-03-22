'use client';

import { useState, useEffect } from 'react';
import { llmClient } from '@/lib/llm/client';
import { TONE_WRITER_PROMPT } from '@/lib/llm/prompts';
import { extractJSON } from '@/lib/utils/extract-json';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import { dal } from '@/lib/dal';
import { TONE_KEYS, type ToneKey, getVoiceOptionsForLocale, getVoiceTypeById, getDefaultVoiceId } from '@/lib/voice/tone-voice-map';
import type { VoiceOption } from '@/lib/voice/tone-voice-map';
import VoicePlayer from '@/components/multimodal/VoicePlayer';

export default function ToneWriterPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [text, setText] = useState('');
  const [toneKey, setToneKey] = useState<ToneKey>(TONE_KEYS[0]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(() => getDefaultVoiceId(locale));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Reset voice selection when locale changes
  useEffect(() => {
    setSelectedVoiceId(getDefaultVoiceId(locale));
  }, [locale]);

  const voiceOptions = getVoiceOptionsForLocale(locale);
  const voiceType = getVoiceTypeById(selectedVoiceId, locale);

  const handleRewrite = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const toneName = t(toneKey);
      const response = await llmClient.chat({
        messages: [
          { role: 'system', content: TONE_WRITER_PROMPT(locale) },
          { role: 'user', content: `${locale === 'zh-CN' ? '语气风格' : '口調スタイル'}：${toneName}\n${locale === 'zh-CN' ? '原文' : '原文'}：${text}` },
        ],
        temperature: 0.9,
      });

      const parsed = extractJSON<any>(response.content);
      setResult(parsed);
      if (userId) dal.toolUsage.record(userId, 'tone_writer').catch(() => {});
    } catch (error) {
      console.error('Rewrite failed:', error);
      alert(t('tone.fail'));
    } finally {
      setLoading(false);
    }
  };

  const getVoiceName = (v: VoiceOption) => locale === 'ja-JP' ? v.nameJa : v.nameZh;
  const getVoiceStyle = (v: VoiceOption) => locale === 'ja-JP' ? v.styleJa : v.style;

  return (
    <div className="min-h-screen theme-bg p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <a href="/" className="btn btn-ghost btn-sm">{t('nav.back')}</a>
          <h1 className="text-4xl font-bold mt-4 text-secondary">✍️ {t('tone.title')}</h1>
          <p className="opacity-60 mt-2">{t('tone.subtitle')}</p>
        </div>

        {/* Voice Selector */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {t('tone.voice.select')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
              {voiceOptions.map((v) => (
                <button
                  key={v.id}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                    selectedVoiceId === v.id
                      ? 'border-secondary bg-secondary/10 shadow-md'
                      : 'border-base-300 hover:border-secondary/50 hover:bg-base-200'
                  }`}
                  onClick={() => setSelectedVoiceId(v.id)}
                >
                  <span className="font-semibold text-sm">{getVoiceName(v)}</span>
                  <span className="text-xs opacity-60 mt-1">{getVoiceStyle(v)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tone & Input */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{t('tone.select')}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {TONE_KEYS.map((tk) => (
                <button
                  key={tk}
                  className={`btn btn-sm ${toneKey === tk ? 'btn-secondary' : 'btn-outline'}`}
                  onClick={() => setToneKey(tk)}
                >
                  {t(tk)}
                </button>
              ))}
            </div>

            <h2 className="card-title mt-4">{t('tone.input.title')}</h2>
            <textarea
              className="textarea textarea-bordered h-32"
              placeholder={t('tone.input.placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className={`btn btn-secondary ${loading ? 'loading' : ''}`}
              onClick={handleRewrite}
              disabled={loading || !text.trim()}
            >
              {loading ? t('tone.btn.rewriting') : t('tone.btn.rewrite')}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-8 space-y-4">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">{t('tone.result.dialogue')}</h3>
                <div className="p-4 bg-secondary/10 rounded-lg text-lg">
                  {result.dialogue}
                </div>
                <VoicePlayer text={result.dialogue} voiceType={voiceType} />
              </div>
            </div>

            {result.inner_monologue && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">{t('tone.result.monologue')}</h3>
                  <div className="p-4 bg-base-200 rounded-lg italic">
                    {result.inner_monologue}
                  </div>
                </div>
              </div>
            )}

            {result.emotion_gradient && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">{t('tone.result.emotion')}</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="badge badge-info">{t('tone.emotion.start')}</div>
                      <p className="mt-2">{result.emotion_gradient.start}</p>
                    </div>
                    <div className="text-2xl">→</div>
                    <div className="text-center">
                      <div className="badge badge-warning">{t('tone.emotion.peak')}</div>
                      <p className="mt-2">{result.emotion_gradient.peak}</p>
                    </div>
                    <div className="text-2xl">→</div>
                    <div className="text-center">
                      <div className="badge badge-success">{t('tone.emotion.end')}</div>
                      <p className="mt-2">{result.emotion_gradient.end}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result.tone_analysis && (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{result.tone_analysis}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
