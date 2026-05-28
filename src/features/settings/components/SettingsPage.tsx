import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { PROVIDER_DEFS, type LLMProviderId } from '../../../llm/clients/byokConfig';
import type { LLMRoleConfigMap, LLMRoleId, RoleLLMConfig } from '../../../llm/types/llmRoleTypes';
import { assetPath as gameAssetPath } from '../../../shared/game-ui';
import { saveAudioSettingsDraft } from '../services/audioSettingsService';
import {
  applyModelPreset,
  applyQuickAccessToAll,
  getProviderDefaultConfig,
  patchRoleConfig,
  ROLE_GROUPS,
  ROLE_META,
  saveModelSettingsDraft,
  testModelConnection,
  type ModelPresetId,
} from '../services/modelSettingsService';
import { loadSettingsSnapshot, type AudioSettings } from '../services/settingsRepository';
import { validateRoleModelSettings } from '../services/settingsValidation';
import './SettingsPage.css';

interface SettingsPageProps {
  onBack: () => void;
}

type SettingsTab = 'models' | 'audio' | 'game' | 'debug';

const STAGE_WIDTH = 1448;
const STAGE_HEIGHT = 1086;
const ORIGIN_X = 742;
const ORIGIN_Y = 316;

const settingsAsset = (file: string) => gameAssetPath('settingsOverlay', file);
const backpackAsset = (file: string) => gameAssetPath('backpackOverlay', file);

const SETTINGS_ASSETS = {
  background: settingsAsset('背景.png'),
  navActive: settingsAsset('绿色底板.png'),
  navIdle: settingsAsset('黄色底板.png'),
  models: settingsAsset('模型接入字和图标.png'),
  audio: settingsAsset('音画设置字和图标.png'),
  game: settingsAsset('游戏设置字和图标.png'),
  debug: settingsAsset('高端调试字和图标.png'),
  decor: settingsAsset('旋转装饰1.png'),
  quickTitle: settingsAsset('快速接入标题.png'),
  recommendTitle: settingsAsset('推荐方案标题.png'),
  coreTitle: settingsAsset('核心角色标题.png'),
  optionalTitle: settingsAsset('可选增强标题.png'),
  saveAll: settingsAsset('保存全部按钮.png'),
  test: settingsAsset('测试连接按钮.png'),
  applyAll: settingsAsset('应用到全部按钮.png'),
  advanced: settingsAsset('高级按钮.png'),
  selected: settingsAsset('选择图标.png'),
  unselected: settingsAsset('没选图标.png'),
  budget: settingsAsset('省钱省是时按钮.png'),
  standard: settingsAsset('标准节目按钮.png'),
  premium: settingsAsset('高质量战报按钮.png'),
  close: backpackAsset('退出按钮.png'),
} as const;

const NAV_ITEMS: Array<{ id: SettingsTab; art: string; label: string }> = [
  { id: 'models', art: SETTINGS_ASSETS.models, label: '模型接入' },
  { id: 'audio', art: SETTINGS_ASSETS.audio, label: '音画设置' },
  { id: 'game', art: SETTINGS_ASSETS.game, label: '游戏设置' },
  { id: 'debug', art: SETTINGS_ASSETS.debug, label: '高级调试' },
];

const NAV_BASES: Record<SettingsTab, ReturnType<typeof box>> = {
  models: box(-620, -102, 219, 110),
  audio: box(-620, 32, 219, 114),
  game: box(-620, 168, 219, 114),
  debug: box(-620, 300, 219, 114),
};

const LAYOUT = {
  decor: box(-650, -310, 125, 140),
  save: box(240, -229, 232, 78),
  apiTicker: box(-185, -229, 375, 78),
  close: box(490, -229, 82, 80),
  content: box(-345, -90, 910, 720),
} as const;

export function SettingsPage({ onBack }: SettingsPageProps) {
  const settingsScale = useSettingsScale();
  const [initialSnapshot] = useState(() => loadSettingsSnapshot());
  const [draftMap, setDraftMap] = useState<LLMRoleConfigMap>(() => initialSnapshot.modelConfigMap);
  const [draftAudio, setDraftAudio] = useState<AudioSettings>(() => initialSnapshot.audio);
  const [activeTab, setActiveTab] = useState<SettingsTab>('models');
  const [quickProvider, setQuickProvider] = useState<LLMProviderId>('deepseek');
  const [quickBaseUrl, setQuickBaseUrl] = useState(PROVIDER_DEFS.deepseek.baseUrl);
  const [quickModel, setQuickModel] = useState(PROVIDER_DEFS.deepseek.defaultModel);
  const [quickApiKey, setQuickApiKey] = useState('');
  const [testing, setTesting] = useState<Record<string, string>>({});
  const [selectedPreset, setSelectedPreset] = useState<ModelPresetId | null>(null);

  const quickConfig: RoleLLMConfig = {
    ...draftMap.roles.actor_brain,
    providerId: quickProvider,
    baseUrl: quickBaseUrl,
    model: quickModel,
    apiKey: quickApiKey,
    enabled: true,
  };

  const saveAll = () => {
    const savedModelMap = saveModelSettingsDraft(draftMap);
    const savedAudio = saveAudioSettingsDraft(draftAudio);
    setDraftMap(savedModelMap);
    setDraftAudio(savedAudio);
  };

  const updateRole = (roleId: LLMRoleId, patch: Partial<RoleLLMConfig>) => {
    setDraftMap((prev) => patchRoleConfig(prev, roleId, patch));
  };

  const applyQuick = () => {
    setDraftMap((prev) => applyQuickAccessToAll(prev, quickConfig));
  };

  const applyPreset = (presetId: ModelPresetId) => {
    setDraftMap((prev) => applyModelPreset(prev, presetId, quickProvider, quickConfig));
    setSelectedPreset(presetId);
  };

  const runTest = async (key: string, config: RoleLLMConfig) => {
    setTesting((prev) => ({ ...prev, [key]: 'testing' }));
    const result = await testModelConnection(config);
    setTesting((prev) => ({ ...prev, [key]: result }));
    window.setTimeout(() => {
      setTesting((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2800);
  };

  const selectQuickProvider = (providerId: LLMProviderId) => {
    const provider = getProviderDefaultConfig(providerId);
    setQuickProvider(provider.providerId);
    setQuickBaseUrl(provider.baseUrl);
    setQuickModel(provider.model);
  };

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="设置浮层">
      <div
        className="settings-modal"
        style={{ width: STAGE_WIDTH * settingsScale, height: STAGE_HEIGHT * settingsScale }}
      >
        <div className="settings-stage" style={{ transform: `scale(${settingsScale})` }}>
          <img className="settings-bg" alt="" src={SETTINGS_ASSETS.background} draggable={false} />
          <img className="settings-decor" alt="" src={SETTINGS_ASSETS.decor} draggable={false} style={LAYOUT.decor} />

          <nav className="settings-nav" aria-label="设置导航">
            {NAV_ITEMS.map((item) => (
              <button
                className={`settings-nav-item${activeTab === item.id ? ' is-active' : ''}`}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={NAV_BASES[item.id]}
                type="button"
              >
                <img className="settings-nav-base" alt="" src={activeTab === item.id ? SETTINGS_ASSETS.navActive : SETTINGS_ASSETS.navIdle} draggable={false} />
                <img className="settings-nav-label" alt={item.label} src={item.art} draggable={false} />
              </button>
            ))}
          </nav>

          <button className="settings-close" onClick={onBack} style={LAYOUT.close} type="button" aria-label="关闭设置">
            <img alt="" src={SETTINGS_ASSETS.close} draggable={false} />
          </button>

          <div className="settings-actions" style={LAYOUT.save}>
            <button className="settings-save-all" onClick={saveAll} type="button">
              <img alt="保存全部" src={SETTINGS_ASSETS.saveAll} draggable={false} />
            </button>
          </div>

          <div className="settings-api-ticker" style={LAYOUT.apiTicker} aria-label="API 花费提醒">
            <div className="settings-api-ticker-track">
              <span>API要</span><span className="is-hot">花地球的钱</span><span>。APIs </span>
              <span className="is-hot">Cost Earth Money</span><span>. 像</span>
              <span className="is-hot">保护</span><span>妈妈一样</span>
              <span className="is-hot">保护</span><span>你的API！</span>
              <span className="is-hot">Protect</span><span> Your API Like You </span>
              <span className="is-hot">Protect</span><span> Your Mom！</span>
              <span>API要</span><span className="is-hot">花地球的钱</span><span>。APIs </span>
              <span className="is-hot">Cost Earth Money</span><span>. 像</span>
              <span className="is-hot">保护</span><span>妈妈一样</span>
              <span className="is-hot">保护</span><span>你的API！</span>
              <span className="is-hot">Protect</span><span> Your API Like You </span>
              <span className="is-hot">Protect</span><span> Your Mom！</span>
            </div>
          </div>

          <main className="settings-content" style={LAYOUT.content}>
            {activeTab === 'models' ? (
              <ModelAccessPanel
                draftMap={draftMap}
                quickApiKey={quickApiKey}
                quickBaseUrl={quickBaseUrl}
                quickConfig={quickConfig}
                quickModel={quickModel}
                quickProvider={quickProvider}
                setQuickApiKey={setQuickApiKey}
                setQuickBaseUrl={setQuickBaseUrl}
                setQuickModel={setQuickModel}
                selectQuickProvider={selectQuickProvider}
                applyPreset={applyPreset}
                applyQuick={applyQuick}
                runTest={runTest}
                selectedPreset={selectedPreset}
                testing={testing}
                updateRole={updateRole}
              />
            ) : null}
            {activeTab === 'audio' ? <AudioVisualPanel /> : null}
            {activeTab === 'game' ? <GameSettingsPanel /> : null}
            {activeTab === 'debug' ? (
              <AdvancedDebugPanel
                draftMap={draftMap}
                runTest={runTest}
                testing={testing}
                updateRole={updateRole}
              />
            ) : null}
          </main>

        </div>
      </div>
    </div>
  );
}

function ModelAccessPanel({
  draftMap,
  quickApiKey,
  quickBaseUrl,
  quickConfig,
  quickModel,
  quickProvider,
  setQuickApiKey,
  setQuickBaseUrl,
  setQuickModel,
  selectQuickProvider,
  applyPreset,
  applyQuick,
  runTest,
  selectedPreset,
  testing,
  updateRole,
}: {
  draftMap: LLMRoleConfigMap;
  quickApiKey: string;
  quickBaseUrl: string;
  quickConfig: RoleLLMConfig;
  quickModel: string;
  quickProvider: LLMProviderId;
  setQuickApiKey: (value: string) => void;
  setQuickBaseUrl: (value: string) => void;
  setQuickModel: (value: string) => void;
  selectQuickProvider: (providerId: LLMProviderId) => void;
  applyPreset: (presetId: ModelPresetId) => void;
  applyQuick: () => void;
  runTest: (key: string, config: RoleLLMConfig) => Promise<void>;
  selectedPreset: ModelPresetId | null;
  testing: Record<string, string>;
  updateRole: (roleId: LLMRoleId, patch: Partial<RoleLLMConfig>) => void;
}) {
  return (
    <div className="settings-panel-stack settings-model-panel-stack">
      <SettingsCard titleArt={SETTINGS_ASSETS.quickTitle} className="is-quick">
        <div className="settings-form-grid">
          <Field label="Provider">
            <select value={quickProvider} onChange={(event) => selectQuickProvider(event.target.value as LLMProviderId)}>
              {Object.values(PROVIDER_DEFS).map((provider) => (
                <option key={provider.providerId} value={provider.providerId}>{provider.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Model">
            <ModelInput providerId={quickProvider} value={quickModel} onChange={setQuickModel} />
          </Field>
          <Field label="API Key">
            <input type="password" value={quickApiKey} onChange={(event) => setQuickApiKey(event.target.value)} placeholder="sk-..." />
          </Field>
          {quickProvider === 'custom' ? (
            <Field label="Base URL">
              <input value={quickBaseUrl} onChange={(event) => setQuickBaseUrl(event.target.value)} placeholder="https://your-endpoint/v1" />
            </Field>
          ) : null}
        </div>
        <div className="settings-card-actions">
          <span className={`settings-quick-test-status is-${testing.quick ?? 'idle'}`}>{quickTestStatus(testing.quick)}</span>
          <ImageButton art={SETTINGS_ASSETS.test} label="测试连接" onClick={() => runTest('quick', quickConfig)} />
          <ImageButton art={SETTINGS_ASSETS.applyAll} label="应用到全部" onClick={applyQuick} />
        </div>
      </SettingsCard>

      <SettingsCard titleArt={SETTINGS_ASSETS.recommendTitle} className="is-recommend">
        <div className="settings-presets">
          <PresetButton art={SETTINGS_ASSETS.budget} selected={selectedPreset === 'budget_live'} onClick={() => applyPreset('budget_live')} />
          <PresetButton art={SETTINGS_ASSETS.standard} selected={selectedPreset === 'standard_show'} onClick={() => applyPreset('standard_show')} />
          <PresetButton art={SETTINGS_ASSETS.premium} selected={selectedPreset === 'premium_report'} onClick={() => applyPreset('premium_report')} />
        </div>
      </SettingsCard>

      {ROLE_GROUPS.map((group) => (
        <RoleGroupCard
          key={group.id}
          groupId={group.id}
          titleArt={group.id === 'core' ? SETTINGS_ASSETS.coreTitle : group.id === 'optional' ? SETTINGS_ASSETS.optionalTitle : undefined}
          title={group.id === 'advanced' ? '高级实验组' : undefined}
          roleIds={group.roleIds}
          configs={draftMap.roles}
          testing={testing}
          updateRole={updateRole}
        />
      ))}
    </div>
  );
}

function RoleGroupCard({
  configs,
  groupId,
  roleIds,
  testing,
  title,
  titleArt,
  updateRole,
}: {
  configs: LLMRoleConfigMap['roles'];
  groupId: string;
  roleIds: LLMRoleId[];
  testing: Record<string, string>;
  title?: string;
  titleArt?: string;
  updateRole: (roleId: LLMRoleId, patch: Partial<RoleLLMConfig>) => void;
}) {
  const [advancedRoleId, setAdvancedRoleId] = useState<LLMRoleId | null>(null);

  useEffect(() => {
    if (!advancedRoleId) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.settings-advanced-drawer')) return;
      if (target.closest('.settings-advanced-button')) return;
      setAdvancedRoleId(null);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('mousedown', closeOnOutsidePointer as EventListener, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('mousedown', closeOnOutsidePointer as EventListener, true);
    };
  }, [advancedRoleId]);

  return (
    <div>
      <SettingsCard className={`is-role-group is-${groupId}`} title={title} titleArt={titleArt}>
        <div className="settings-role-list">
          {roleIds.map((roleId) => (
            <RoleRow
              key={roleId}
              config={configs[roleId]}
              isAdvancedOpen={advancedRoleId === roleId}
              onToggleAdvanced={(event) => {
                event.stopPropagation();
                setAdvancedRoleId((current) => current === roleId ? null : roleId);
              }}
              testing={testing[roleId]}
              updateConfig={(patch) => updateRole(roleId, patch)}
            />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function RoleRow({
  config,
  isAdvancedOpen,
  onToggleAdvanced,
  testing,
  updateConfig,
}: {
  config: RoleLLMConfig;
  isAdvancedOpen: boolean;
  onToggleAdvanced: (event: MouseEvent<HTMLButtonElement>) => void;
  testing?: string;
  updateConfig: (patch: Partial<RoleLLMConfig>) => void;
}) {
  const meta = ROLE_META[config.roleId];
  const validationIssues = validateRoleModelSettings(config);
  return (
    <div className="settings-role-row">
      <button className="settings-check" onClick={() => updateConfig({ enabled: !config.enabled })} type="button" aria-label={config.enabled ? '关闭' : '启用'}>
        <img alt="" src={config.enabled ? SETTINGS_ASSETS.selected : SETTINGS_ASSETS.unselected} draggable={false} />
      </button>
      <span className="settings-role-icon">{meta.icon}</span>
      <strong>{meta.label}</strong>
      <select
        value={config.providerId}
        onChange={(event) => {
          const providerId = event.target.value as LLMProviderId;
          const provider = getProviderDefaultConfig(providerId);
          updateConfig(provider);
        }}
      >
        {Object.values(PROVIDER_DEFS).map((provider) => (
          <option key={provider.providerId} value={provider.providerId}>{provider.name}</option>
        ))}
      </select>
      <ModelInput providerId={config.providerId} value={config.model} onChange={(model) => updateConfig({ model })} />
      <button className="settings-advanced-button" onClick={onToggleAdvanced} type="button">
        <img alt="高级" src={SETTINGS_ASSETS.advanced} draggable={false} />
      </button>
      <span className="settings-role-recommendation">{meta.recommendation}</span>
      {isAdvancedOpen ? (
        <AdvancedDrawer config={config} updateConfig={updateConfig} />
      ) : null}
      <span className={`settings-test-dot is-${testing ?? (validationIssues.length ? 'invalid' : 'idle')}`}>
        {testing === 'testing' ? '测试中' : testing === 'ok' ? 'OK' : testing === 'fail' ? '失败' : validationIssues.length ? '缺配置' : ''}
      </span>
    </div>
  );
}

function AdvancedDebugPanel({
  draftMap,
  runTest,
  testing,
  updateRole,
}: {
  draftMap: LLMRoleConfigMap;
  runTest: (key: string, config: RoleLLMConfig) => Promise<void>;
  testing: Record<string, string>;
  updateRole: (roleId: LLMRoleId, patch: Partial<RoleLLMConfig>) => void;
}) {
  return (
    <div className="settings-panel-stack settings-debug-panel-stack">
      <SettingsCard title="高级调试 / 每个功能独立测试">
        <div className="settings-debug-list">
          {Object.values(draftMap.roles).map((config) => (
            <div className="settings-debug-item" key={config.roleId}>
              <div className="settings-debug-row">
                <strong>{ROLE_META[config.roleId].label}</strong>
                <select
                  value={config.providerId}
                  onChange={(event) => {
                    const providerId = event.target.value as LLMProviderId;
                    updateRole(config.roleId, getProviderDefaultConfig(providerId));
                  }}
                >
                  {Object.values(PROVIDER_DEFS).map((provider) => (
                    <option key={provider.providerId} value={provider.providerId}>{provider.name}</option>
                  ))}
                </select>
                <ModelInput providerId={config.providerId} value={config.model} onChange={(model) => updateRole(config.roleId, { model })} />
                <input value={config.baseUrl} onChange={(event) => updateRole(config.roleId, { baseUrl: event.target.value })} placeholder="Base URL" />
                <input type="password" value={config.apiKey} onChange={(event) => updateRole(config.roleId, { apiKey: event.target.value })} placeholder="API Key" />
                <button className="settings-text-button" onClick={() => runTest(config.roleId, config)} type="button">
                  {testLabel(testing[config.roleId])}
                </button>
              </div>
              <p className="settings-debug-copy">
                <span>{ROLE_META[config.roleId].description}</span>
                <span className="settings-debug-recommendation">{ROLE_META[config.roleId].recommendation}</span>
              </p>
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function AudioVisualPanel() {
  return (
    <SettingsCard title="音画设置">
      <div className="settings-empty-panel" aria-label="音画设置暂未开放" />
    </SettingsCard>
  );
}

function GameSettingsPanel() {
  return (
    <SettingsCard title="游戏设置">
      <div className="settings-empty-panel" aria-label="游戏设置暂未开放" />
    </SettingsCard>
  );
}

function AdvancedDrawer({
  config,
  updateConfig,
}: {
  config: RoleLLMConfig;
  updateConfig: (patch: Partial<RoleLLMConfig>) => void;
}) {
  return (
    <div className="settings-advanced-drawer">
      <label>
        timeout
        <input
          type="number"
          value={config.timeout}
          min={5000}
          step={1000}
          onChange={(event) => updateConfig({ timeout: Number(event.target.value) || 5000 })}
        />
      </label>
      <label>
        temp
        <input
          type="number"
          value={config.temperature ?? 0.7}
          min={0}
          max={2}
          step={0.1}
          onChange={(event) => updateConfig({ temperature: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}

function SettingsCard({
  children,
  className = '',
  title,
  titleArt,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  titleArt?: string;
}) {
  return (
    <section className={`settings-card ${className}`}>
      {titleArt ? <img className="settings-card-title-art" alt="" src={titleArt} draggable={false} /> : null}
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ModelInput({
  onChange,
  providerId,
  value,
}: {
  onChange: (value: string) => void;
  providerId: LLMProviderId;
  value: string;
}) {
  const models = PROVIDER_DEFS[providerId].models;
  if (models.length === 0) {
    return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="model name" />;
  }
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {models.map((model) => <option key={model} value={model}>{model}</option>)}
    </select>
  );
}

function ImageButton({ art, label, onClick }: { art: string; label: string; onClick: () => void }) {
  return (
    <button className="settings-image-button" aria-label={label} onClick={onClick} type="button">
      <img alt="" src={art} draggable={false} />
    </button>
  );
}

function PresetButton({ art, onClick, selected }: { art: string; onClick: () => void; selected: boolean }) {
  return (
    <button className={`settings-preset-button${selected ? ' is-selected' : ''}`} onClick={onClick} type="button">
      <img alt="" src={art} draggable={false} />
    </button>
  );
}

function testLabel(status?: string): string {
  if (status === 'testing') return '测试中';
  if (status === 'ok') return '连接成功';
  if (status === 'fail') return '连接失败';
  if (status === 'invalid') return '配置缺失';
  return '测试连接';
}

function quickTestStatus(status?: string): string {
  if (status === 'testing') return '测试中';
  if (status === 'ok') return '成功';
  if (status === 'fail') return '失败';
  if (status === 'invalid') return '缺配置';
  return '';
}

function box(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: ORIGIN_X + x,
    top: ORIGIN_Y + y,
    width,
    height,
  };
}

function useSettingsScale(): number {
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return 0.6;
    return getSettingsScale(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const update = () => setScale(getSettingsScale(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}

function getSettingsScale(viewportWidth: number, viewportHeight: number): number {
  return Math.min(1, (viewportWidth * 0.6) / STAGE_WIDTH, (viewportHeight * 0.92) / STAGE_HEIGHT);
}
