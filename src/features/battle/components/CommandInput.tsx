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
    case 'QUEUED': return '排队中...';
    case 'JUDGING': return '审查中...';
    case 'WAITING_CLARIFICATION': return '请选择目标';
    case 'READY_TO_INJECT': return '已插入信号';
    case 'REJECTED': return '已拒绝';
    case 'CANCELLED': return '已取消（全额退款）';
    case 'NOT_ENOUGH_GOLD': return '金币不足';
    default: return status ?? '';
  }
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'READY_TO_INJECT': return '#4caf50';
    case 'REJECTED': return '#f44336';
    case 'CANCELLED': return '#888';
    case 'NOT_ENOUGH_GOLD': return '#f44336';
    default: return '#ff9800';
  }
}

export function CommandInput({ value, onChange, onSubmit, onResolveAsk, onCancelAsk, disabled, status, askTargetQuestion, askTargetOptions }: CommandInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
    }
  };

  const isAskMode = status === 'WAITING_CLARIFICATION';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      {isAskMode ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: '#ffeb3b', fontSize: 13 }}>
            {askTargetQuestion ?? '请选择目标'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {askTargetOptions?.map((opt) => (
              <button
                key={opt.actorId}
                onClick={() => onResolveAsk(opt.actorId)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#2196f3',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={onCancelAsk}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                background: '#444',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="导演指令... (例如：下雨了)"
            disabled={disabled}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#1a1a2e',
              color: '#eee',
              fontSize: 14,
            }}
          />
          <button
            onClick={() => value.trim() && onSubmit(value.trim())}
            disabled={disabled || !value.trim()}
            style={{
              padding: '8px 20px',
              borderRadius: 4,
              border: 'none',
              background: disabled || !value.trim() ? '#444' : '#ff9800',
              color: disabled || !value.trim() ? '#888' : '#fff',
              cursor: disabled || !value.trim() ? 'default' : 'pointer',
              fontSize: 13,
            }}
          >
            发送
          </button>
        </>
      )}
      {status && (
        <span style={{ fontSize: 12, color: getStatusColor(status) }}>
          {getStatusText(status)}
        </span>
      )}
    </div>
  );
}
