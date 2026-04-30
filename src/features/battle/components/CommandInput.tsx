interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled: boolean;
  status: string | null;
}

export function CommandInput({ value, onChange, onSubmit, disabled, status }: CommandInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Director command... (e.g. 下雨了)"
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
        Send
      </button>
      {status && (
        <span
          style={{
            fontSize: 12,
            color: status === 'READY_TO_INJECT' ? '#4caf50' : status === 'REJECTED' ? '#f44336' : '#ff9800',
          }}
        >
          {status}
        </span>
      )}
    </div>
  );
}
