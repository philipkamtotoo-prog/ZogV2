import { useRef, useEffect } from 'react';
import type { DisplayItem } from '../../../core/battle/types';

interface DisplayLogProps {
  items: DisplayItem[];
}

const TYPE_COLORS: Record<string, string> = {
  LINE: '#eee',
  ACTION: '#88ccff',
  HP_CHANGE: '#f44336',
  STATUS_CHANGE: '#ffa726',
  BROADCAST: '#ce93d8',
  ELIMINATION: '#ff5252',
  ROUND_END: '#666',
  SCENE_UPDATE: '#81c784',
};

export function DisplayLog({ items }: DisplayLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

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
          Waiting for battle to begin...
        </div>
      )}
      {items.map((item) => (
        <div key={item.itemId} style={{ color: TYPE_COLORS[item.type] ?? '#eee', marginBottom: 2 }}>
          <span style={{ color: '#555', fontSize: 10, marginRight: 6 }}>#{item.actorActionIndex}</span>
          {item.content}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
