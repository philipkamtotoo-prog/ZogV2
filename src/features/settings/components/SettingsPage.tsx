/**
 * Settings Page
 * L5: BYOK 角色卡配置 + 音量设置
 */

import { useState } from 'react';
import {
  createLLMRoleRegistry,
} from '../../../llm/clients/llmRoleRegistry';
import {
  ALL_LLM_ROLE_IDS,
  type LLMRoleId,
  type RoleLLMConfig,
} from '../../../llm/types/llmRoleTypes';
import { PROVIDER_DEFS, type LLMProviderId } from '../../../llm/clients/byokConfig';
import { saveStoredLLMRoleConfigMap } from '../../../llm/clients/byokConfig';
import type { LLMRoleConfigMap } from '../../../llm/types/llmRoleTypes';

interface SettingsPageProps {
  onBack: () => void;
}

type TabId = 'byok' | 'volume';

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('byok');

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', color: '#eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          padding: '6px 16px', borderRadius: 4, border: 'none',
          background: '#555', color: '#eee', cursor: 'pointer', fontSize: 13,
        }}>Back</button>
        <h1 style={{ color: '#ffeb3b', margin: 0, fontSize: 20 }}>Settings</h1>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #333' }}>
        <TabButton active={activeTab === 'byok'} onClick={() => setActiveTab('byok')}>BYOK</TabButton>
        <TabButton active={activeTab === 'volume'} onClick={() => setActiveTab('volume')}>Volume</TabButton>
        <TabButton active={false} onClick={() => {}} disabled style={{ opacity: 0.4 }}>Reserved</TabButton>
      </div>

      {activeTab === 'byok' && <BYOKTab />}
      {activeTab === 'volume' && <VolumeTab />}
    </div>
  );
}

function TabButton({ active, onClick, children, disabled, style: extraStyle }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 20px',
        border: 'none',
        borderBottom: active ? '2px solid #ffeb3b' : '2px solid transparent',
        background: 'transparent',
        color: active ? '#ffeb3b' : '#888',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13,
        fontWeight: active ? 'bold' : 'normal',
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

function BYOKTab() {
  const [registry] = useState(() => createLLMRoleRegistry());
  const [configs, setConfigs] = useState(() => {
    return ALL_LLM_ROLE_IDS.reduce((acc, roleId) => {
      acc[roleId] = registry.getRoleConfig(roleId);
      return acc;
    }, {} as Record<LLMRoleId, RoleLLMConfig>);
  });
  const [savedMap, setSavedMap] = useState<Record<LLMRoleId, boolean>>({} as Record<LLMRoleId, boolean>);
  const [expanded, setExpanded] = useState<Record<LLMRoleId, boolean>>({} as Record<LLMRoleId, boolean>);

  const updateConfig = (roleId: LLMRoleId, patch: Partial<RoleLLMConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [roleId]: { ...prev[roleId], ...patch },
    }));
    setSavedMap((prev) => ({ ...prev, [roleId]: false }));
  };

  const saveRole = (roleId: LLMRoleId) => {
    const configMap: LLMRoleConfigMap = {
      version: 2,
      updatedAt: Date.now(),
      roles: { ...configs },
    };
    saveStoredLLMRoleConfigMap(configMap);
    setSavedMap((prev) => ({ ...prev, [roleId]: true }));
  };

  const copyToAll = (roleId: LLMRoleId) => {
    const source = configs[roleId];
    const newConfigs = { ...configs };
    ALL_LLM_ROLE_IDS.forEach((id) => {
      newConfigs[id] = { ...newConfigs[id], apiKey: source.apiKey, baseUrl: source.baseUrl, providerId: source.providerId };
    });
    setConfigs(newConfigs);
  };

  const copyFrom = (fromRoleId: LLMRoleId, toRoleId: LLMRoleId) => {
    const source = configs[fromRoleId];
    setConfigs((prev) => ({
      ...prev,
      [toRoleId]: { ...prev[toRoleId], apiKey: source.apiKey, baseUrl: source.baseUrl, providerId: source.providerId, model: source.model },
    }));
    setSavedMap((prev) => ({ ...prev, [toRoleId]: false }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
        Per-role LLM configuration. Each role can use a different model/provider.
      </div>

      {ALL_LLM_ROLE_IDS.map((roleId) => {
        const config = configs[roleId];
        const providerModels = PROVIDER_DEFS[config.providerId]?.models ?? [];
        const isExpanded = expanded[roleId];

        return (
          <div key={roleId} style={{
            border: '1px solid #333',
            borderRadius: 8,
            padding: 16,
            background: '#1a1a2e',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isExpanded ? 12 : 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updateConfig(roleId, { enabled: e.target.checked })}
                />
                <span style={{ color: config.enabled ? '#ffeb3b' : '#666', fontWeight: 'bold', fontSize: 14 }}>
                  {roleId}
                </span>
              </label>

              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <select
                  value={config.providerId}
                  onChange={(e) => {
                    const pid = e.target.value as LLMProviderId;
                    const provider = PROVIDER_DEFS[pid];
                    updateConfig(roleId, { providerId: pid, baseUrl: provider.baseUrl, model: provider.defaultModel });
                  }}
                  disabled={!config.enabled}
                  style={inputStyle}
                >
                  {Object.values(PROVIDER_DEFS).map((p) => (
                    <option key={p.providerId} value={p.providerId}>{p.name}</option>
                  ))}
                </select>

                <select
                  value={config.model}
                  onChange={(e) => updateConfig(roleId, { model: e.target.value })}
                  disabled={!config.enabled}
                  style={inputStyle}
                >
                  {providerModels.length > 0 ? providerModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  )) : (
                    <option value={config.model}>{config.model || 'custom'}</option>
                  )}
                </select>
              </div>

              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [roleId]: !prev[roleId] }))}
                style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#333', color: '#aaa', cursor: 'pointer', fontSize: 11 }}
              >
                {isExpanded ? 'Less' : 'More'}
              </button>

              <button
                onClick={() => saveRole(roleId)}
                style={{
                  padding: '4px 12px', borderRadius: 4, border: 'none',
                  background: savedMap[roleId] ? '#2e7d32' : '#555',
                  color: '#eee', cursor: 'pointer', fontSize: 11,
                }}
              >
                {savedMap[roleId] ? 'Saved' : 'Save'}
              </button>
            </div>

            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={config.baseUrl}
                  onChange={(e) => updateConfig(roleId, { baseUrl: e.target.value })}
                  placeholder="Base URL"
                  disabled={!config.enabled}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => updateConfig(roleId, { apiKey: e.target.value })}
                  placeholder="API Key"
                  disabled={!config.enabled}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888' }}>
                    timeout:
                    <input
                      type="number"
                      value={config.timeout}
                      onChange={(e) => updateConfig(roleId, { timeout: parseInt(e.target.value) || 20000 })}
                      disabled={!config.enabled}
                      style={{ ...inputStyle, width: 80 }}
                    />
                    ms
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888' }}>
                    temp:
                    <input
                      type="number"
                      value={config.temperature ?? 0.7}
                      onChange={(e) => updateConfig(roleId, { temperature: parseFloat(e.target.value) || 0.7 })}
                      disabled={!config.enabled}
                      step="0.1"
                      style={{ ...inputStyle, width: 60 }}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => copyToAll(roleId)} style={smallBtnStyle}>Copy to All</button>
                  <span style={{ color: '#666', fontSize: 11, alignSelf: 'center' }}>or copy from:</span>
                  {ALL_LLM_ROLE_IDS.filter((id) => id !== roleId).map((sourceId) => (
                    <button key={sourceId} onClick={() => copyFrom(sourceId, roleId)} style={smallBtnStyle}>
                      {sourceId}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VolumeTab() {
  return (
    <div style={{ color: '#888', fontSize: 13 }}>
      <p>Volume controls coming soon.</p>
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

const smallBtnStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 4,
  border: 'none',
  background: '#333',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 11,
};