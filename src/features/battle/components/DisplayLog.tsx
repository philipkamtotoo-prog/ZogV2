import { useRef, useEffect } from 'react';
import type { DisplayEvent } from '../display/displayTypes';

interface DisplayLogProps {
  items: DisplayEvent[];
  actors?: Array<{ actorId: string; name: string }>;
}

const KIND_COLORS: Record<string, string> = {
  ACTOR_LINE: '#eee',
  ACTOR_ACTION: '#88ccff',
  DAMAGE: '#f44336',
  HEAL: '#4caf50',
  STATUS: '#ffa726',
  ELIMINATION: '#ff5252',
  ITEM: '#ce93d8',
  BROADCAST: '#ce93d8',
  REPORTER: '#80cbc4',
  ZOG: '#ffd54f',
  MUTATION: '#ff9800',
  PROMPT: '#80deea',
};

function getActorId(item: DisplayEvent): string | undefined {
  if ('actorId' in item) return item.actorId;
  if ('targetId' in item) return item.targetId;
  return undefined;
}

export function DisplayLog({ items, actors = [] }: DisplayLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

  const getActorName = (actorId: string | undefined) => {
    if (!actorId) return '';
    const actor = actors.find((a) => a.actorId === actorId);
    return actor?.name ?? '';
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: 8,
        background: '#0a0a1a',
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {items.length === 0 && (
        <div style={{ color: '#555', textAlign: 'center', padding: 20 }}>
          等待战斗开始...
        </div>
      )}
      {items.map((item) => {
        const actorId = getActorId(item);
        const actorName = getActorName(actorId);
        return (
          <div key={item.eventId} style={{ color: KIND_COLORS[item.kind] ?? '#eee', marginBottom: 2 }}>
            <span style={{ color: '#555', fontSize: 10, marginRight: 6 }}>#{item.actorActionIndex}</span>
            {actorName && <span style={{ color: '#ffeb3b', fontWeight: 'bold', marginRight: 6 }}>{actorName}:</span>}
            {item.content}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
