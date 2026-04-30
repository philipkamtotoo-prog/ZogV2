import { useEffect, useState } from 'react';
import { useLoungeStore } from '../loungeStore';
import {
  DEFAULT_LLM_CONFIG,
  PROVIDER_DEFS,
  SUPPORTED_MODELS,
  loadStoredLLMConfig,
  normalizeLLMConfig,
  saveStoredLLMConfig,
  validateLLMConfig,
  type LLMConfig,
  type LLMProviderId,
} from '../../../llm/clients/byokConfig';

interface LoungePageProps {
  onEnterTV: () => void;
  onOpenShop: () => void;
  onOpenReports: () => void;
  onOpenRoster: () => void;
}

export function LoungePage({ onEnterTV, onOpenShop, onOpenReports, onOpenRoster }: LoungePageProps) {
  const {
    gold, zogAffection, begMessage,
    collectIdleIncome, beg, canBeg, giftZog,
  } = useLoungeStore();

  useEffect(() => {
    const result = collectIdleIncome();
    if (result.goldEarned > 0) {
      console.log(`Collected ${result.goldEarned}G idle income`);
    }
  }, [collectIdleIncome]);

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ color: '#ffeb3b', marginBottom: 4, textAlign: 'center' }}>Zog's Living Room</h1>
      <p style={{ color: '#888', textAlign: 'center', marginBottom: 24, fontSize: 13 }}>
        You and Zog are sitting on the couch, watching TV.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
        <Stat label="Gold" value={`${gold}G`} color="#ffeb3b" />
        <Stat label="Zog Affection" value={String(zogAffection)} color="#f48fb1" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <BigButton onClick={onEnterTV} color="#ff9800">
          Watch TV (Start Battle)
        </BigButton>
        <BigButton onClick={onOpenShop} color="#2196f3">
          Shop
        </BigButton>
        <BigButton onClick={onOpenReports} color="#9c27b0">
          Battle Reports
        </BigButton>
        <BigButton onClick={onOpenRoster} color="#4caf50">
          Actor Roster
        </BigButton>
      </div>

      <div style={{ borderTop: '1px solid #333', paddingTop: 16 }}>
        <div style={{ color: '#88ccff', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Zog</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={beg}
            disabled={!canBeg()}
            style={{
              padding: '6px 16px', borderRadius: 4, border: 'none', fontSize: 12,
              background: canBeg() ? '#555' : '#333',
              color: canBeg() ? '#eee' : '#666',
              cursor: canBeg() ? 'pointer' : 'default',
            }}
          >
            Beg for Gold
          </button>
          <button
            onClick={() => giftZog(10)}
            disabled={gold < 10}
            style={{
              padding: '6px 16px', borderRadius: 4, border: 'none', fontSize: 12,
              background: gold >= 10 ? '#555' : '#333',
              color: gold >= 10 ? '#f48fb1' : '#666',
              cursor: gold >= 10 ? 'pointer' : 'default',
            }}
          >
            Gift Zog (10G)
          </button>
        </div>

        {begMessage && (
          <div style={{ color: '#aaa', fontSize: 12, fontStyle: 'italic' }}>{begMessage}</div>
        )}
      </div>

      <ApiKeySection />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, fontSize: 24, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#888', fontSize: 11 }}>{label}</div>
    </div>
  );
}

function BigButton({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 0', borderRadius: 8, border: 'none',
        background: color, color: '#fff', cursor: 'pointer',
        fontSize: 14, fontWeight: 'bold',
      }}
    >
      {children}
    </button>
  );
}

function ApiKeySection() {
  const initialConfig = loadStoredLLMConfig() ?? DEFAULT_LLM_CONFIG;
  const [config, setConfig] = useState<LLMConfig>(initialConfig);
  const [saved, setSaved] = useState(() => validateLLMConfig(initialConfig).valid);
  const [error, setError] = useState<string | null>(null);

  const providerModels = SUPPORTED_MODELS.filter((m) => m.providerId === config.providerId);

  const updateConfig = (patch: Partial<LLMConfig>) => {
    setConfig((prev) => normalizeLLMConfig({ ...prev, ...patch }));
    setSaved(false);
    setError(null);
  };

  const updateProvider = (providerId: LLMProviderId) => {
    const provider = PROVIDER_DEFS[providerId];
    updateConfig({
      providerId,
      baseUrl: provider.baseUrl,
      model: provider.defaultModel,
    });
  };

  const save = () => {
    const normalized = normalizeLLMConfig(config);
    const validation = validateLLMConfig(normalized);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid LLM config');
      setSaved(false);
      return;
    }
    setConfig(saveStoredLLMConfig(normalized));
    setSaved(true);
    setError(null);
  };

  return (
    <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 16 }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>LLM BYOK Settings</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        <select
          value={config.providerId}
          onChange={(e) => updateProvider(e.target.value as LLMProviderId)}
          style={inputStyle}
        >
          {Object.values(PROVIDER_DEFS).map((provider) => (
            <option key={provider.providerId} value={provider.providerId}>
              {provider.name}
            </option>
          ))}
        </select>

        {providerModels.length > 0 ? (
          <select
            value={config.model}
            onChange={(e) => updateConfig({ model: e.target.value })}
            style={inputStyle}
          >
            {providerModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={config.model}
            onChange={(e) => updateConfig({ model: e.target.value })}
            placeholder="model"
            style={inputStyle}
          />
        )}
      </div>

      <input
        value={config.baseUrl}
        onChange={(e) => updateConfig({ baseUrl: e.target.value })}
        placeholder="https://api.example.com/v1"
        style={{ ...inputStyle, width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => updateConfig({ apiKey: e.target.value })}
          placeholder="API key"
          style={{ ...inputStyle, flex: 1 }}
        />
        <select
          value={config.debugMode}
          onChange={(e) => updateConfig({ debugMode: e.target.value as LLMConfig['debugMode'] })}
          style={{ ...inputStyle, width: 92 }}
        >
          <option value="off">debug off</option>
          <option value="verbose">verbose</option>
        </select>
        <button
          onClick={save}
          style={{
            padding: '6px 14px', borderRadius: 4, border: 'none',
            background: saved ? '#2e7d32' : '#555', color: '#eee', fontSize: 12, cursor: 'pointer',
          }}
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 11, marginTop: 6 }}>
        <input
          type="checkbox"
          checked={config.thinkingEnabled}
          onChange={(e) => updateConfig({ thinkingEnabled: e.target.checked })}
        />
        thinking enabled
      </label>

      {error && <div style={{ color: '#f44336', fontSize: 11, marginTop: 4 }}>{error}</div>}
      {!config.apiKey && (
        <div style={{ color: '#ff9800', fontSize: 11, marginTop: 4 }}>
          No API key saved. Battle uses Stub mode.
        </div>
      )}
      <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>
        Requests are sent directly to the selected Base URL. Keys are stored in localStorage on this device.
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid #444',
  background: '#1a1a1a',
  color: '#ccc',
  fontSize: 12,
};
