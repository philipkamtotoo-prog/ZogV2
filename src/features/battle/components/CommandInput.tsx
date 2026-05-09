interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onResolveAsk: (actorId: string) => void;
  onCancelAsk: () => void;
  disabled: boolean;
  status: string | null;
  askTargetQuestion?: string;
  askTargetOptions?: { actorId: string; label: string }[];
}

function getStatusText(status: string | null): string {
  switch (status) {
    case 'QUEUED':
      return 'Queued';
    case 'JUDGING':
      return 'Judging';
    case 'WAITING_CLARIFICATION':
      return 'Choose target';
    case 'READY_TO_INJECT':
      return 'Signal injected';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    case 'NOT_ENOUGH_GOLD':
      return 'Not enough gold';
    default:
      return status ?? '';
  }
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'READY_TO_INJECT':
      return '#8ee1c1';
    case 'REJECTED':
    case 'NOT_ENOUGH_GOLD':
      return '#ff6f6f';
    case 'CANCELLED':
      return '#8f887b';
    default:
      return '#ffdf8e';
  }
}

export function CommandInput({
  value,
  onChange,
  onSubmit,
  onResolveAsk,
  onCancelAsk,
  disabled,
  status,
  askTargetQuestion,
  askTargetOptions,
}: CommandInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
    }
  };

  const isAskMode = status === 'WAITING_CLARIFICATION';

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {isAskMode ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ color: '#ffdf8e', fontSize: 13 }}>
            {askTargetQuestion ?? 'Choose a target'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {askTargetOptions?.map((option) => (
              <button
                key={option.actorId}
                onClick={() => onResolveAsk(option.actorId)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 2,
                  border: '1px solid rgba(234,197,124,0.22)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f8ebd0',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={onCancelAsk}
              style={{
                padding: '5px 10px',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: '#aaa08f',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Director signal..."
            disabled={disabled}
            style={{
              minWidth: 0,
              flex: 1,
              padding: '8px 10px',
              borderRadius: 2,
              border: '1px solid rgba(234,197,124,0.22)',
              background: 'rgba(0,0,0,0.32)',
              color: '#f8ebd0',
              fontSize: 13,
            }}
          />
          <button
            onClick={() => value.trim() && onSubmit(value.trim())}
            disabled={disabled || !value.trim()}
            style={{
              padding: '8px 14px',
              borderRadius: 2,
              border: '1px solid rgba(234,197,124,0.22)',
              background: disabled || !value.trim() ? 'rgba(255,255,255,0.04)' : '#d08d2c',
              color: disabled || !value.trim() ? '#776f62' : '#130f0a',
              cursor: disabled || !value.trim() ? 'default' : 'pointer',
              fontSize: 13,
            }}
          >
            Send
          </button>
        </div>
      )}

      {status && (
        <span style={{ fontSize: 12, color: getStatusColor(status) }}>
          {getStatusText(status)}
        </span>
      )}
    </div>
  );
}
