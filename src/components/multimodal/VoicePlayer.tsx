'use client';

import { useVoice } from '@/hooks/useVoice';
import { useTranslation } from '@/hooks/useTranslation';

interface VoicePlayerProps {
  text: string;
  voiceType: string;
}

export default function VoicePlayer({ text, voiceType }: VoicePlayerProps) {
  const { generateVoice, isGenerating, isPlaying, audioUrl, error, play, pause, stop } = useVoice();
  const { t } = useTranslation();

  const handleGenerate = () => {
    generateVoice(text, voiceType);
  };

  return (
    <div className="flex items-center gap-3 mt-3">
      {!audioUrl && !isGenerating && (
        <button className="btn btn-sm btn-outline btn-secondary" onClick={handleGenerate}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          {t('tone.voice.generate')}
        </button>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2">
          <span className="loading loading-dots loading-sm" />
          <span className="text-sm opacity-70">{t('tone.voice.generating')}</span>
        </div>
      )}

      {audioUrl && !isGenerating && (
        <div className="flex items-center gap-3">
          {isPlaying ? (
            <>
              <button className="btn btn-sm btn-secondary" onClick={pause} aria-label={t('tone.voice.pause')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                {t('tone.voice.pause')}
              </button>
              <div className="flex items-end gap-0.5 h-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="voice-bar bg-secondary" />
                ))}
              </div>
            </>
          ) : (
            <button className="btn btn-sm btn-secondary" onClick={play} aria-label={t('tone.voice.play')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              {t('tone.voice.play')}
            </button>
          )}
          <button className="btn btn-sm btn-outline btn-ghost" onClick={stop} aria-label={t('tone.voice.stop')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
          <button className="btn btn-sm btn-outline btn-ghost" onClick={handleGenerate}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23,4 23,10 17,10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {t('tone.voice.regenerate')}
          </button>
        </div>
      )}

      {error && <span className="text-sm text-error">{error}</span>}
    </div>
  );
}
