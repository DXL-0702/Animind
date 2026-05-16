'use client';

import { useState, useEffect, useRef } from 'react';
import { dal } from '@/lib/dal';
import { llmClient } from '@/lib/llm/client';
import { extractJSON } from '@/lib/utils/extract-json';
import { COMPANION_CHAT_PROMPT } from '@/lib/llm/prompts';
import { getOrCreateRelationship, recordInteraction, getTrustStageDescription } from '@/lib/companion/relationship';
import { updateEmotion, getEmotionEmoji, getEmotionDescription } from '@/lib/companion/emotion';
import { storeMemory, getRecentMemories } from '@/lib/memory/vector-store';
import { evaluateMemoryImportance, shouldStoreMemory } from '@/lib/memory/memory-eval';
import { shouldInitiateProactive, generateProactiveMessage, detectSilence, generateSilenceBreaker } from '@/lib/companion/proactive';
import { startGreetingScheduler } from '@/lib/companion/scheduler';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores/app-store';
import CompanionVoiceButton from '@/components/multimodal/CompanionVoiceButton';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import type { Character, Message } from '@/lib/dal/types';

export default function CompanionPage() {
  const { t, locale } = useTranslation();
  const userId = useAppStore((s) => s.userId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [relationship, setRelationship] = useState<any>(null);
  const [lastUserMessageTime, setLastUserMessageTime] = useState<number>(Date.now());
  const { error: toastError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (userId) loadCharacters();
  }, [userId]);

  useEffect(() => {
    if (selectedCharacter) {
      loadMessages();
      loadRelationship();
    }
  }, [selectedCharacter]);

  useEffect(() => {
    if (!selectedCharacter?.id || !relationship?.id || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const should = await shouldInitiateProactive(selectedCharacter.id, userId);
        if (!should || cancelled) return;
        const result = await generateProactiveMessage(selectedCharacter.id, userId, locale as 'zh-CN' | 'ja-JP');
        if (!result || cancelled) return;

        const msg = await dal.messages.create({
          character_id: selectedCharacter.id,
          user_id: userId,
          role: 'assistant',
          content: result.message,
          emotion: result.emotion,
          deleted_at: null,
        });
        setMessages(prev => [...prev, msg]);
      } catch (e) {
        console.error('Proactive greeting failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedCharacter?.id, relationship?.id, userId, locale]);

  useEffect(() => {
    if (!selectedCharacter?.id || !userId) return;

    const interval = setInterval(async () => {
      if (!detectSilence(lastUserMessageTime)) return;

      try {
        const breaker = await generateSilenceBreaker(selectedCharacter.id, userId, locale as 'zh-CN' | 'ja-JP');
        const msg = await dal.messages.create({
          character_id: selectedCharacter.id,
          user_id: userId,
          role: 'assistant',
          content: breaker,
          emotion: null,
          deleted_at: null,
        });
        setMessages(prev => [...prev, msg]);
        setLastUserMessageTime(Date.now());
      } catch (e) {
        console.error('Silence breaker failed:', e);
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedCharacter?.id, lastUserMessageTime, userId]);

  useEffect(() => {
    if (!selectedCharacter?.id || !userId) return;

    const cleanup = startGreetingScheduler(async (message) => {
      try {
        const msg = await dal.messages.create({
          character_id: selectedCharacter.id,
          user_id: userId,
          role: 'assistant',
          content: message,
          emotion: null,
          deleted_at: null,
        });
        setMessages(prev => [...prev, msg]);
      } catch (e) {
        console.error('Scheduled greeting failed:', e);
      }
    });

    return cleanup;
  }, [selectedCharacter?.id, userId]);

  const loadCharacters = async () => {
    if (!userId) return;
    try {
      let user = await dal.users.getById(userId);
      if (!user) {
        user = await dal.users.create({ id: userId, nickname: '', deleted_at: null });
      }
      const chars = await dal.characters.getByUserId(user.id);
      setCharacters(chars);
      if (chars.length > 0 && !selectedCharacter) {
        setSelectedCharacter(chars[0]);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedCharacter) return;
    try {
      const msgs = await dal.messages.getByCharacterId(selectedCharacter.id, {
        orderBy: 'created_at', orderDirection: 'asc', limit: 50,
      });
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadRelationship = async () => {
    if (!selectedCharacter || !userId) return;
    try {
      const rel = await getOrCreateRelationship(selectedCharacter.id, userId);
      setRelationship(rel);
    } catch (error) {
      console.error('Failed to load relationship:', error);
    }
  };

  const handleDelete = async (charId: string, charName: string) => {
    if (!userId) return;
    const confirmMsg = t('companion.delete.confirm').replace('{name}', charName);
    if (!confirm(confirmMsg)) return;

    try {
      await dal.messages.deleteByCharacterId(charId);

      const memories = await dal.memories.getByCharacterId(charId);
      for (const mem of memories) {
        await dal.memories.delete(mem.id);
      }

      const rel = await dal.relationships.getByCharacterAndUser(charId, userId);
      if (rel) {
        await dal.relationships.delete(rel.id);
      }

      await dal.characters.delete(charId);

      const remaining = characters.filter(c => c.id !== charId);
      setCharacters(remaining);

      if (selectedCharacter?.id === charId) {
        if (remaining.length > 0) {
          setSelectedCharacter(remaining[0]);
        } else {
          setSelectedCharacter(null);
          setMessages([]);
          setRelationship(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete character:', error);
      toastError(t('companion.delete.fail'));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedCharacter || !relationship || !userId) return;
    const userMessage = input.trim();
    setInput('');
    setLastUserMessageTime(Date.now());
    setLoading(true);

    try {
      const userMsg = await dal.messages.create({
        character_id: selectedCharacter.id,
        user_id: userId,
        role: 'user',
        content: userMessage,
        emotion: null,
        deleted_at: null,
      });
      setMessages(prev => [...prev, userMsg]);

      const recentMemories = await getRecentMemories(selectedCharacter.id, 5);
      const personality = JSON.parse(selectedCharacter.personality);
      const response = await llmClient.chat({
        messages: [
          {
            role: 'system',
            content: COMPANION_CHAT_PROMPT({
              name: selectedCharacter.name,
              personality: JSON.stringify(personality),
              trustStage: relationship.trust_stage,
              emotionState: relationship.emotion_state,
              recentMemories: recentMemories.map((m: any) => m.content),
            }, locale),
          },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.9,
      });

      const parsed = extractJSON<any>(response.content);
      const aiMsg = await dal.messages.create({
        character_id: selectedCharacter.id,
        user_id: userId,
        role: 'assistant',
        content: parsed.response,
        emotion: parsed.emotion,
        deleted_at: null,
      });
      setMessages(prev => [...prev, aiMsg]);
      dal.toolUsage.record(userId, 'companion').catch(() => {});

      await updateEmotion(relationship.id, parsed.emotion, parsed.emotion_intensity);
      await recordInteraction(relationship.id, parsed.trust_change || 0);

      if (parsed.memory_worthy) {
        const snippet = `${t('companion.you')}: ${userMessage}\n${selectedCharacter.name}: ${parsed.response}`;
        const evaluation = await evaluateMemoryImportance(snippet);
        if (shouldStoreMemory(evaluation)) {
          await storeMemory(selectedCharacter.id, userId, snippet, evaluation.facts, evaluation.importance_score);
        }
      }
      await loadRelationship();
    } catch (error) {
      console.error('Chat failed:', error);
      toastError(t('companion.fail'));
    } finally {
      setLoading(false);
    }
  };

  if (!userId || characters.length === 0) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('companion.empty')}</h2>
          <Link href="/oc-generator" className="btn btn-primary tap-feedback">{t('companion.create')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg">
      <div className="container mx-auto p-4 h-[calc(100dvh-80px)] flex flex-col">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/" className="btn btn-ghost btn-sm tap-feedback">{t('nav.back')}</Link>
          <button
            className="btn btn-ghost btn-sm lg:hidden tap-feedback"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰ {t('companion.title')}
          </button>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden relative">
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-neutral/20 backdrop-blur-sm lg:hidden transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          {/* Character sidebar - collapsible on mobile */}
          <div className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-40 bg-base-100 p-4 w-64 shadow-2xl transition-transform duration-300 ease-out translate-x-0' : 'fixed inset-y-0 left-0 z-40 bg-base-100 p-4 w-64 shadow-2xl transition-transform duration-300 ease-out -translate-x-full'} lg:static lg:block lg:translate-x-0 lg:w-64 lg:bg-base-100 lg:rounded-xl lg:shadow-xl lg:p-4 lg:overflow-y-auto`}>
            <div className="flex items-center justify-between lg:hidden mb-4">
              <h2 className="font-bold">{t('companion.title')}</h2>
              <button className="btn btn-ghost btn-sm tap-feedback" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>
            <h2 className="font-bold mb-4 hidden lg:block">{t('companion.title')}</h2>
            {characters.map(char => (
              <div
                key={char.id}
                className={`group flex items-center w-full rounded-lg mb-2 ${
                  selectedCharacter?.id === char.id ? 'bg-primary text-primary-content' : 'hover:bg-base-200 active:bg-base-300'
                }`}
              >
                <button
                  className="flex-1 text-left p-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={() => { setSelectedCharacter(char); setSidebarOpen(false); }}
                >
                  {char.name}
                </button>
                <button
                  className={`btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 mr-1 active:scale-90 transition-transform ${
                    selectedCharacter?.id === char.id ? 'text-primary-content hover:bg-primary-content/20' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(char.id, char.name);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 bg-base-100 rounded-xl shadow-xl flex flex-col min-w-0">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCharacter?.name}</h2>
                  {relationship && (
                    <div className="flex gap-2 mt-1">
                      <span className="badge badge-sm">
                        {getTrustStageDescription(relationship.trust_stage)}
                      </span>
                      <span className="badge badge-sm">
                        {getEmotionEmoji(relationship.emotion_state)}{' '}
                        {getEmotionDescription(relationship.emotion_state, relationship.emotion_intensity)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'} message-enter`}
                >
                  <div className="chat-header opacity-70 text-xs">
                    {msg.role === 'user' ? t('companion.you') : selectedCharacter?.name}
                  </div>
                  <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'bg-base-200 text-base-content'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="chat-footer">
                      <CompanionVoiceButton
                        text={msg.content}
                        voiceId={selectedCharacter?.voice_id || 'BV700_V2_streaming'}
                        sharedAudioRef={audioRef}
                      />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="chat chat-start message-enter">
                  <div className="chat-header opacity-70 text-xs">{selectedCharacter?.name}</div>
                  <div className="chat-bubble bg-base-200 text-base-content flex items-center gap-1">
                    <span className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none transition-all"
                  placeholder={t('companion.input.placeholder')}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  disabled={loading}
                />
                <button
                  className={`btn btn-primary ${loading ? 'loading' : ''} active:scale-[0.97] transition-transform focus-visible:ring-2 focus-visible:ring-offset-2`}
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                >
                  {t('companion.btn.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
