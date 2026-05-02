import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useBattleStore } from '../battleStore';
import { createZogBattleReactionProvider } from '../../../llm/zogBattleReactionProvider';
import type { ActionType } from '../../../core/battle/types';
import type { DisplayEvent } from '../display/displayTypes';

function isHighlightEvent(event: DisplayEvent): boolean {
  if (event.kind === 'DAMAGE' && event.damage >= 20) return true;
  if (event.kind === 'ELIMINATION') return true;
  if (event.kind === 'HEAL' && event.healAmount > 20) return true;
  return false;
}

function buildFallbackZogReaction(event: DisplayEvent): string {
  switch (event.kind) {
    case 'DAMAGE':
      return event.damage >= 30 ? '这一下终于像点节目了。' : '嗯，这一下还算有点火气。';
    case 'ELIMINATION':
      return '终于有人撑不住了，节目开始像样了。';
    case 'HEAL':
      return '这口命续得不错，我还没看够。';
    default:
      return '总算有点值得我抬眼的东西了。';
  }
}

interface ZogNote {
  id: string;
  content: string;
  createdAt: number;
}

const MAX_NOTES = 4;

export function ZogNoteOverlay() {
  const displayLog = useBattleStore((s) => s.displayLog);
  const battleState = useBattleStore((s) => s.battleState);
  const [notes, setNotes] = useState<ZogNote[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const providerRef = useRef(createZogBattleReactionProvider());

  const addNote = useCallback((content: string) => {
    const id = `zog_${Date.now()}_${Math.random()}`;
    setNotes((prev) => [...prev.slice(-(MAX_NOTES - 1)), { id, content, createdAt: Date.now() }]);
  }, []);

  useEffect(() => {
    if (!battleState) return;

    const latestEvent = [...displayLog].reverse().find((event) => {
      if (seenIds.current.has(event.eventId)) return false;
      return isHighlightEvent(event);
    });

    if (!latestEvent) return;

    seenIds.current.add(latestEvent.eventId);

    providerRef.current
      .generateReaction(
        {
          eventId: latestEvent.eventId,
          actorActionIndex: latestEvent.actorActionIndex,
          type: mapDisplayKindToBattleEventType(latestEvent.kind),
          activeActorId: 'actorId' in latestEvent ? (latestEvent as any).actorId : '',
          targetActorId: 'targetId' in latestEvent ? (latestEvent as any).targetId : undefined,
          actionType: 'MOCK_ANIMAL_MANAGEMENT' as ActionType,
          actionDescription: '',
          line: latestEvent.kind === 'DAMAGE' ? String(latestEvent.damage) : latestEvent.kind,
          diffs: [],
          tags: [],
          createdAt: Date.now(),
        },
        battleState
      )
      .then((reaction) => {
        addNote(reaction.trim() || buildFallbackZogReaction(latestEvent));
      })
      .catch(() => {
        addNote(buildFallbackZogReaction(latestEvent));
      });
  }, [displayLog, battleState, addNote]);

  const headline = useMemo(() => {
    if (notes.length === 0) return 'Zog 正在冷眼旁观';
    return notes[notes.length - 1]?.content ?? 'Zog 正在冷眼旁观';
  }, [notes]);

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 12,
        background: 'linear-gradient(180deg, rgba(30, 30, 48, 0.96), rgba(18, 18, 28, 0.96))',
        border: '1px solid rgba(255, 204, 0, 0.35)',
        borderRadius: 12,
        boxShadow: '0 0 18px rgba(255, 204, 0, 0.12)',
        minHeight: 160,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#ffcc00', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>
            ZOG / 现场旁观
          </div>
          <div style={{ color: '#ddd', fontSize: 11, marginTop: 2 }}>战中前景位，不再是偶发浮层</div>
        </div>
        <div style={{ color: '#999', fontSize: 11 }}>LIVE</div>
      </div>

      <div
        style={{
          color: '#ffec99',
          fontSize: 13,
          lineHeight: 1.5,
          padding: '8px 10px',
          background: 'rgba(255, 204, 0, 0.08)',
          borderRadius: 8,
          minHeight: 44,
        }}
      >
        Zog: {headline}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {notes.length === 0 ? (
          <div style={{ color: '#888', fontSize: 11 }}>暂时没有新的 Zog 批注。</div>
        ) : (
          notes
            .slice()
            .reverse()
            .map((note, index) => (
              <div
                key={note.id}
                style={{
                  color: index === 0 ? '#fff2b8' : '#c9b86d',
                  fontSize: 11,
                  lineHeight: 1.4,
                  opacity: index === 0 ? 1 : 0.82,
                }}
              >
                {index === 0 ? '最新：' : '前条：'}
                {note.content}
              </div>
            ))
        )}
      </div>
    </section>
  );
}

function mapDisplayKindToBattleEventType(kind: DisplayEvent['kind']) {
  switch (kind) {
    case 'DAMAGE':
      return 'DAMAGE_DEALT';
    case 'ELIMINATION':
      return 'ACTOR_ELIMINATED';
    case 'HEAL':
      return 'ACTION_TAKEN';
    default:
      return 'ACTION_TAKEN';
  }
}
