'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type ImageProvider = 'jimeng' | 'doubao';

interface UseImageGenerationReturn {
  generate: (prompt: string, negativePrompt?: string) => Promise<void>;
  isGenerating: boolean;
  progress: 'idle' | 'submitting' | 'pending' | 'succeeded' | 'failed';
  imageUrl: string | null;
  error: string | null;
  reset: () => void;
}

export function useImageGeneration(provider: ImageProvider = 'jimeng'): UseImageGenerationReturn {
  const [progress, setProgress] = useState<UseImageGenerationReturn['progress']>('idle');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const reset = useCallback(() => {
    setProgress('idle');
    setImageUrl(null);
    setError(null);
  }, []);

  const generateJimeng = useCallback(async (prompt: string, negativePrompt?: string) => {
    setProgress('submitting');

    const res = await fetch('/api/image/jimeng', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, negative_prompt: negativePrompt }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Generation failed');
    }

    const data = await res.json();
    if (!data.image_url) throw new Error('No image URL returned');

    setImageUrl(data.image_url);
    setProgress('succeeded');
  }, []);

  const generateDoubao = useCallback(async (prompt: string) => {
    setProgress('submitting');

    const res = await fetch('/api/image/doubao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Generation failed');
    }

    const data = await res.json();
    if (!data.image_url) throw new Error('No image URL returned');

    setImageUrl(data.image_url);
    setProgress('succeeded');
  }, []);

  const generate = useCallback(async (prompt: string, negativePrompt?: string) => {
    reset();
    try {
      if (provider === 'doubao') {
        await generateDoubao(prompt);
      } else {
        await generateJimeng(prompt, negativePrompt);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setProgress('failed');
      }
    }
  }, [reset, provider, generateDoubao, generateJimeng]);

  return {
    generate,
    isGenerating: progress === 'submitting' || progress === 'pending',
    progress,
    imageUrl,
    error,
    reset,
  };
}
