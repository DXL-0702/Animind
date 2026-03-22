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

  // Proactive greeting on page load
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
  }, [selectedCharacter?.id, relationship?.id, userId]);

  // Silence detection (every 60s)
  useEffect(() => {
    if (!selectedCharacter?.id || !userId) return;

    const interval = setInterval(async () => {
      if (!detectSilence(lastUserMessageTime)) return;

      try {
        const breaker = await generateSilenceBreaker(selectedCharacter.id);
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

  // Scheduled greeting scheduler
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
      // Cascade soft-delete: messages, memories, relationship, then character
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
      alert(t('companion.delete.fail'));
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
      alert(t('companion.fail'));
    } finally {
      setLoading(false);
    }
  };

  if (!userId || characters.length === 0) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('companion.empty')}</h2>
          <a href="/oc-generator" className="btn btn-primary">{t('companion.create')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        <div className="mb-4">
          <a href="/" className="btn btn-ghost btn-sm">{t('nav.back')}</a>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="w-64 bg-base-100 rounded-lg shadow-xl p-4 overflow-y-auto">
            <h2 className="font-bold mb-4">{t('companion.title')}</h2>
            {characters.map(char => (
              <div
                key={char.id}
                className={`group flex items-center w-full rounded-lg mb-2 ${
                  selectedCharacter?.id === char.id ? 'bg-primary text-white' : 'hover:bg-base-200'
                }`}
              >
                <button
                  className="flex-1 text-left p-3"
                  onClick={() => setSelectedCharacter(char)}
                >
                  {char.name}
                </button>
                <button
                  className={`btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 mr-1 ${
                    selectedCharacter?.id === char.id ? 'text-white hover:bg-white/20' : ''
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

          <div className="flex-1 bg-base-100 rounded-lg shadow-xl flex flex-col">
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
                  className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                >
                  <div className="chat-header">
                    {msg.role === 'user' ? t('companion.you') : selectedCharacter?.name}
                  </div>
                  <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : ''}`}>
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
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder={t('companion.input.placeholder')}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  disabled={loading}
                />
                <button
                  className={`btn btn-primary ${loading ? 'loading' : ''}`}
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
