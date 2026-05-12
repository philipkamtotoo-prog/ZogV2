import type { DisplayEvent } from '../display/displayTypes';

export function BattleZogSeatPanel({ displayLog }: { displayLog: DisplayEvent[] }) {
  const latestZog = [...displayLog].reverse().find((item) => item.kind === 'ZOG');

  return (
    <section className="battle-zog-panel">
      {latestZog ? (
        <>
          <strong>Zog / 鐜板満鏃佽</strong>
          <p>{latestZog.content}</p>
        </>
      ) : null}
    </section>
  );
}
