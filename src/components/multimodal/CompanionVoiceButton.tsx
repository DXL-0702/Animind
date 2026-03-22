'use client';

import { useState, useCallback } from 'react';

interface Props {
  text: string;
  voiceId: string;
  sharedAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

export default function CompanionVoiceButton({ text, voiceId, sharedAudioRef }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = useCallback(async () => {
    // If playing, stop
    if (isPlaying && sharedAudioRef.current) {
      sharedAudioRef.current.pause();
      sharedAudioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // Stop any currently playing audio
    if (sharedAudioRef.current) {
      sharedAudioRef.current.pause();
      sharedAudioRef.current.currentTime = 0;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 500),
          voice: voiceId,
        }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const rawBlob = await res.blob();
      const blob = new Blob([rawBlob], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      });
      audio.addEventListener('error', () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      });

      sharedAudioRef.current = audio;
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error('Voice generation failed:', e);
      setIsPlaying(false);
    } finally {
      setIsGenerating(false);
    }
  }, [text, voiceId, isPlaying, sharedAudioRef]);

  return (
    <button
      className="btn btn-ghost btn-xs btn-circle"
      onClick={handleClick}
      title={isPlaying ? 'Stop' : 'Play voice'}
    >
      {isGenerating ? (
        <span className="loading loading-spinner loading-xs" />
      ) : isPlaying ? (
        <span className="animate-pulse">🔊</span>
      ) : (
        <span>🔊</span>
      )}
    </button>
  );
}
