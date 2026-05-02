/**
 * LLM Role 类型定义
 * L1: 冻结 role 配置合同
 */

export type LLMRoleId =
  | 'actor_brain'
  | 'command_gate'
  | 'showrunner_director'
  | 'live_reporter'
  | 'final_reporter'
  | 'referee_llm_advisor'
  | 'zog_lounge'
  | 'zog_battle_reaction';

export type LLMProviderId = 'deepseek' | 'openai' | 'custom';
export type LLMDebugMode = 'off' | 'summary' | 'verbose';

export interface RoleLLMConfig {
  roleId: LLMRoleId;
  enabled: boolean;
  providerId: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  thinkingEnabled: boolean;
  debugMode: LLMDebugMode;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  promptVersion?: string;
  systemPromptOverride?: string;
  tags?: string[];
}

export interface LLMRoleConfigMap {
  version: 2;
  updatedAt: number;
  defaultRoleFallback?: LLMRoleId;
  roles: Record<LLMRoleId, RoleLLMConfig>;
}

/**
 * 默认 Role 配置（用于新角色或迁移时默认值）
 */
export const DEFAULT_ROLE_CONFIGS: Record<LLMRoleId, RoleLLMConfig> = {
  actor_brain: {
    roleId: 'actor_brain',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-pro',
    timeout: 25000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.9,
    maxTokens: 1200,
  },
  command_gate: {
    roleId: 'command_gate',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 15000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.2,
    maxTokens: 500,
  },
  showrunner_director: {
    roleId: 'showrunner_director',
    enabled: false, // 新角色默认关闭，需要用户手动开启
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-pro',
    timeout: 20000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.8,
    maxTokens: 900,
  },
  live_reporter: {
    roleId: 'live_reporter',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 15000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.7,
    maxTokens: 700,
  },
  final_reporter: {
    roleId: 'final_reporter',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-pro',
    timeout: 25000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.8,
    maxTokens: 1500,
  },
  referee_llm_advisor: {
    roleId: 'referee_llm_advisor',
    enabled: false, // 默认关闭，不污染硬规则
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 10000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.2,
    maxTokens: 300,
  },
  zog_lounge: {
    roleId: 'zog_lounge',
    enabled: false, // 用户需在设置页配置 API
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 20000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.8,
    maxTokens: 500,
  },
  zog_battle_reaction: {
    roleId: 'zog_battle_reaction',
    enabled: false,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 15000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.9,
    maxTokens: 200,
  },
};

export const ALL_LLM_ROLE_IDS: LLMRoleId[] = [
  'actor_brain',
  'command_gate',
  'showrunner_director',
  'live_reporter',
  'final_reporter',
  'referee_llm_advisor',
  'zog_lounge',
  'zog_battle_reaction',
];