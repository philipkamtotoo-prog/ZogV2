import { PROVIDER_DEFS, type LLMProviderId } from '../../../llm/clients/byokConfig';
import {
  ALL_LLM_ROLE_IDS,
  type LLMRoleConfigMap,
  type LLMRoleId,
  type RoleLLMConfig,
} from '../../../llm/types/llmRoleTypes';
import { loadSettingsSnapshot, saveModelConfigMap } from './settingsRepository';
import { validateRoleModelSettings } from './settingsValidation';

export type ModelPresetId = 'budget_live' | 'standard_show' | 'premium_report';

export interface RoleMeta {
  label: string;
  icon: string;
  group: 'core' | 'optional' | 'advanced';
  description: string;
  recommendation: string;
}

export const ROLE_META: Record<LLMRoleId, RoleMeta> = {
  actor_brain: {
    label: '演员脑',
    icon: '🧠',
    group: 'core',
    description: '决定演员临场行动和性格表达，是战斗表演的主脑。',
    recommendation: '推荐高端模型',
  },
  command_gate: {
    label: '指令门卫',
    icon: '📺',
    group: 'core',
    description: '解析玩家临场指令，判断能否注入战斗流程。',
    recommendation: '推荐快速模型',
  },
  live_reporter: {
    label: '战斗快报',
    icon: '🎤',
    group: 'core',
    description: '生成战斗中的即时播报，要求响应快、成本低。',
    recommendation: '推荐快速模型',
  },
  final_reporter: {
    label: '战斗记者',
    icon: '🧾',
    group: 'core',
    description: '生成赛后总结和战报，需要更好的叙事质量。',
    recommendation: '推荐高端模型',
  },
  showrunner_director: {
    label: '战斗导演',
    icon: '🎬',
    group: 'optional',
    description: 'AI写的不一定有古法剧本有趣，需要时再单独打开试验。',
    recommendation: '默认关闭',
  },
  zog_lounge: {
    label: 'Zog 客厅聊天',
    icon: '👽',
    group: 'optional',
    description: '驱动客厅里和 Zog 的闲聊、陪伴与吐槽。',
    recommendation: '推荐快速模型',
  },
  zog_battle_reaction: {
    label: 'Zog 战斗反应',
    icon: '⚔️',
    group: 'optional',
    description: '生成 Zog 对战斗事件的短反应，偏实时反馈。',
    recommendation: '推荐快速模型',
  },
  referee_llm_advisor: {
    label: '裁判顾问',
    icon: '⚖️',
    group: 'advanced',
    description: '实验性的规则顾问，只提供判定建议，不覆盖硬规则。',
    recommendation: '默认关闭',
  },
};

export const ROLE_GROUPS: Array<{
  id: RoleMeta['group'];
  title: string;
  roleIds: LLMRoleId[];
}> = [
  { id: 'core', title: '核心角色组', roleIds: ['actor_brain', 'command_gate', 'live_reporter', 'final_reporter'] },
  { id: 'optional', title: '可选增强组', roleIds: ['showrunner_director', 'zog_lounge', 'zog_battle_reaction'] },
  { id: 'advanced', title: '高级实验组', roleIds: ['referee_llm_advisor'] },
];

export const MODEL_PRESETS: Record<ModelPresetId, {
  label: string;
  description: string;
  roleQuality: Record<LLMRoleId, 'low' | 'high' | 'off'>;
}> = {
  budget_live: {
    label: '省钱实时',
    description: '实时反馈尽量用低成本模型，高级增强默认关闭。',
    roleQuality: {
      actor_brain: 'low',
      command_gate: 'low',
      showrunner_director: 'off',
      live_reporter: 'low',
      final_reporter: 'low',
      referee_llm_advisor: 'off',
      zog_lounge: 'low',
      zog_battle_reaction: 'low',
    },
  },
  standard_show: {
    label: '标准节目',
    description: '演员脑和最终战报用高端模型，其余实时功能用低端模型。',
    roleQuality: {
      actor_brain: 'high',
      command_gate: 'low',
      showrunner_director: 'off',
      live_reporter: 'low',
      final_reporter: 'high',
      referee_llm_advisor: 'off',
      zog_lounge: 'low',
      zog_battle_reaction: 'low',
    },
  },
  premium_report: {
    label: '高质量战报',
    description: '表演和战报链路优先高质量，实验裁判仍保持关闭。',
    roleQuality: {
      actor_brain: 'high',
      command_gate: 'low',
      showrunner_director: 'high',
      live_reporter: 'high',
      final_reporter: 'high',
      referee_llm_advisor: 'off',
      zog_lounge: 'high',
      zog_battle_reaction: 'high',
    },
  },
};

const PROVIDER_MODEL_TIERS: Record<LLMProviderId, { low: string; high: string }> = {
  deepseek: { low: 'deepseek-v4-flash', high: 'deepseek-v4-pro' },
  openai: { low: 'gpt-4o-mini', high: 'gpt-4o' },
  custom: { low: '', high: '' },
};

export function loadModelSettingsDraft(): LLMRoleConfigMap {
  return loadSettingsSnapshot().modelConfigMap;
}

export function saveModelSettingsDraft(configMap: LLMRoleConfigMap): LLMRoleConfigMap {
  return saveModelConfigMap(configMap);
}

export function patchRoleConfig(
  configMap: LLMRoleConfigMap,
  roleId: LLMRoleId,
  patch: Partial<RoleLLMConfig>
): LLMRoleConfigMap {
  return {
    ...configMap,
    roles: {
      ...configMap.roles,
      [roleId]: {
        ...configMap.roles[roleId],
        ...patch,
      },
    },
  };
}

export function applyQuickAccessToAll(
  configMap: LLMRoleConfigMap,
  quickAccess: Pick<RoleLLMConfig, 'providerId' | 'baseUrl' | 'model' | 'apiKey'>
): LLMRoleConfigMap {
  return ALL_LLM_ROLE_IDS.reduce((next, roleId) => (
    patchRoleConfig(next, roleId, {
      enabled: true,
      providerId: quickAccess.providerId,
      baseUrl: quickAccess.baseUrl,
      model: quickAccess.model,
      apiKey: quickAccess.apiKey,
    })
  ), configMap);
}

export function applyModelPreset(
  configMap: LLMRoleConfigMap,
  presetId: ModelPresetId,
  providerId: LLMProviderId,
  shared: Pick<RoleLLMConfig, 'apiKey' | 'baseUrl' | 'model'>
): LLMRoleConfigMap {
  const preset = MODEL_PRESETS[presetId];
  const tiers = PROVIDER_MODEL_TIERS[providerId];

  return ALL_LLM_ROLE_IDS.reduce((next, roleId) => {
    const quality = preset.roleQuality[roleId];
    const model = providerId === 'custom' ? shared.model : tiers[quality === 'high' ? 'high' : 'low'];
    const provider = PROVIDER_DEFS[providerId];
    return patchRoleConfig(next, roleId, {
      enabled: quality !== 'off',
      providerId,
      baseUrl: shared.baseUrl || provider.baseUrl,
      model,
      apiKey: shared.apiKey,
    });
  }, configMap);
}

export async function testModelConnection(config: RoleLLMConfig): Promise<'ok' | 'fail' | 'invalid'> {
  if (validateRoleModelSettings(config).length > 0) return 'invalid';

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
        temperature: config.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(config.timeout),
    });
    return response.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

export function getProviderDefaultConfig(providerId: LLMProviderId): Pick<RoleLLMConfig, 'providerId' | 'baseUrl' | 'model'> {
  const provider = PROVIDER_DEFS[providerId];
  return {
    providerId,
    baseUrl: provider.baseUrl,
    model: provider.defaultModel,
  };
}
