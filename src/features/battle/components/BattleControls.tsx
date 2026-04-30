interface BattleControlsProps {
  phase: string;
  clockState: string;
  runMode: string;
  actorActionIndex: number;
  isProcessing: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onAuto: () => void;
}

export function BattleControls({
  phase,
  clockState,
  runMode,
  actorActionIndex,
  isProcessing,
  onStart,
  onPause,
  onResume,
  onStep,
  onAuto,
}: BattleControlsProps) {
  const btnStyle = (disabled?: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    margin: '0 4px',
    borderRadius: 4,
    border: 'none',
    background: disabled ? '#444' : '#2196f3',
    color: disabled ? '#888' : '#fff',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 13,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <span style={{ color: '#aaa', fontSize: 12, marginRight: 8 }}>
        Phase: {phase} | Mode: {runMode} | Clock: {clockState} | Action: #{actorActionIndex}
      </span>

      {phase === 'PREPARING' && (
        <button style={btnStyle()} onClick={onStart}>
          Start Battle
        </button>
      )}

      {phase === 'RUNNING' && clockState === 'PLAYING' && (
        <button style={btnStyle()} onClick={onPause}>
          Pause
        </button>
      )}

      {phase === 'RUNNING' && clockState === 'PAUSED' && (
        <>
          <button style={btnStyle()} onClick={onResume}>
            Resume
          </button>
          <button style={btnStyle(isProcessing)} onClick={onStep} disabled={isProcessing}>
            Step
          </button>
          <button style={btnStyle()} onClick={onAuto}>
            Auto
          </button>
        </>
      )}

      {isProcessing && <span style={{ color: '#ffeb3b', fontSize: 12 }}>Processing...</span>}
    </div>
  );
}
