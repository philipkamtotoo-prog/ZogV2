interface BattleControlsProps {
  phase: string;
  clockState: string;
  runMode: string;
  battleSpeedMs: number;
  actorActionIndex: number;
  isProcessing: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onAuto: () => void;
  onSpeedChange: (ms: number) => void;
}

export function BattleControls({
  phase,
  clockState,
  runMode,
  battleSpeedMs,
  actorActionIndex,
  isProcessing,
  onStart,
  onPause,
  onResume,
  onStep,
  onAuto,
  onSpeedChange,
}: BattleControlsProps) {
  const btnStyle = (active?: boolean, disabled?: boolean): React.CSSProperties => ({
    minHeight: 30,
    padding: '5px 12px',
    border: '1px solid rgba(234, 197, 124, 0.22)',
    borderRadius: 2,
    background: disabled ? 'rgba(255,255,255,0.04)' : active ? '#d08d2c' : 'rgba(255,255,255,0.08)',
    color: disabled ? '#776f62' : active ? '#130f0a' : '#f8ebd0',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 12,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ color: '#a79b84', fontSize: 12 }}>
        {phase} / {runMode} / {clockState} / #{actorActionIndex}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[{ label: '0.5x', ms: 900 }, { label: '1x', ms: 500 }, { label: '2x', ms: 250 }].map((preset) => (
          <button
            key={preset.ms}
            style={btnStyle(battleSpeedMs === preset.ms)}
            onClick={() => onSpeedChange(preset.ms)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {phase === 'PREPARING' && (
        <button style={btnStyle(true)} onClick={onStart}>
          Start
        </button>
      )}

      {phase === 'RUNNING' && clockState === 'PLAYING' && (
        <button style={btnStyle()} onClick={onPause}>
          Pause
        </button>
      )}

      {phase === 'RUNNING' && clockState === 'PAUSED' && (
        <>
          <button style={btnStyle(true)} onClick={onResume}>
            Resume
          </button>
          <button style={btnStyle(false, isProcessing)} onClick={onStep} disabled={isProcessing}>
            Step
          </button>
          <button style={btnStyle()} onClick={onAuto}>
            Auto
          </button>
        </>
      )}

      {isProcessing && <span style={{ color: '#ffdf8e', fontSize: 12 }}>Processing...</span>}
    </div>
  );
}
