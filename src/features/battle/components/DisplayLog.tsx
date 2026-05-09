import { useEffect, useRef } from 'react';
import type { DisplayEvent } from '../display/displayTypes';

interface DisplayLogProps {
  items: DisplayEvent[];
  actors?: Array<{ actorId: string; name: string }>;
}

const KIND_LABELS: Record<string, string> = {
  ACTOR_LINE: 'Line',
  ACTOR_ACTION: 'Action',
  DAMAGE: 'Damage',
  HEAL: 'Heal',
  STATUS: 'Status',
  ELIMINATION: 'Exit',
  ITEM: 'Item',
  BROADCAST: 'Director',
  REPORTER: 'Reporter',
  ZOG: 'Zog',
  MUTATION: 'Mutation',
  PROMPT: 'Script',
};

function getActorId(item: DisplayEvent): string | undefined {
  if ('actorId' in item) return item.actorId;
  if ('targetId' in item) return item.targetId;
  return undefined;
}

function getMetadata(item: DisplayEvent) {
  return 'metadata' in item ? item.metadata : undefined;
}

function getPerformanceText(
  metadata: ReturnType<typeof getMetadata>,
  key: 'actionDescription' | 'performanceIntent'
): string {
  const value = (metadata as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' ? value : '';
}

export function DisplayLog({ items, actors = [] }: DisplayLogProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const visibleItems = items.filter((item) => item.kind !== 'REPORTER');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleItems.length]);

  const getActorName = (actorId: string | undefined) => {
    if (!actorId) return '';
    return actors.find((actor) => actor.actorId === actorId)?.name ?? '';
  };

  return (
    <section className="battle-script-panel" aria-label="Battle script">
      <div className="battle-panel-heading">
        <span>Director Script</span>
        <strong>{visibleItems.length}</strong>
      </div>

      <div className="battle-script-list">
        {visibleItems.length === 0 && (
          <div className="battle-empty-state">Waiting for the first cue...</div>
        )}

        {visibleItems.map((item) => {
          const actorId = getActorId(item);
          const actorName = getActorName(actorId);
          const metadata = getMetadata(item);
          const actionDescription = getPerformanceText(metadata, 'actionDescription');
          const performanceIntent = getPerformanceText(metadata, 'performanceIntent');
          const hasPerformanceDetails = Boolean(actionDescription || performanceIntent);

          return (
            <article key={item.eventId} className={`battle-script-entry is-${item.kind.toLowerCase()}`}>
              <div className="battle-script-entry-topline">
                <span className="battle-script-index">#{item.actorActionIndex}</span>
                <span className="battle-script-kind">{KIND_LABELS[item.kind] ?? item.kind}</span>
                {actorName && <strong className="battle-script-actor">{actorName}</strong>}
              </div>

              <p className="battle-script-line">{item.content}</p>

              {hasPerformanceDetails && (
                <div className="battle-script-details">
                  {actionDescription && (
                    <p>
                      <span>Full action</span>
                      {actionDescription}
                    </p>
                  )}
                  {performanceIntent && (
                    <p>
                      <span>Inner intent</span>
                      {performanceIntent}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
        <div ref={endRef} />
      </div>
    </section>
  );
}
