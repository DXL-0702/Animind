'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceReturn {
  generateVoice: (text: string, voiceType: string) => Promise<void>;
  isGenerating: boolean;
  isPlaying: boolean;
  audioUrl: string | null;
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
}

export function useVoice(): UseVoiceReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const generateVoice = useCallback(async (text: string, voiceType: string) => {
    setIsGenerating(true);
    setError(null);

    // Clean up previous
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioUrl(null);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voiceType,
        }),
      });

      if (!res.ok) throw new Error('TTS request failed');

      const rawBlob = await res.blob();
      console.log('[TTS] response blob:', rawBlob.type, rawBlob.size, 'bytes');
      const blob = new Blob([rawBlob], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audio.addEventListener('ended', () => {
        console.log('[TTS] playback ended');
        setIsPlaying(false);
      });
      audio.addEventListener('error', () => {
        console.error('[TTS] audio error:', audio.error);
        setIsPlaying(false);
        setError('Audio playback failed');
      });
      audio.addEventListener('loadedmetadata', () => {
        console.log('[TTS] duration:', audio.duration, 'readyState:', audio.readyState);
      });
      audioRef.current = audio;

      // Wait for audio to be ready before playing
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        audio.addEventListener('error', () => reject(new Error('Audio load failed')), { once: true });
        audio.load();
      });

      console.log('[TTS] playing, duration:', audio.duration);
      await audio.play();
      setIsPlaying(true);
      setAudioUrl(url);
    } catch (e) {
      setIsPlaying(false);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (e) {
      console.error('Audio play failed:', e);
      setIsPlaying(false);
      setError('Audio playback failed');
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  return { generateVoice, isGenerating, isPlaying, audioUrl, error, play, pause, stop };
}
