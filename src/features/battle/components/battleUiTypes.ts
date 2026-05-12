/**
 * 功能备注：战斗 UI 共享类型。
 * 放 Tab、浮层、记者卡片、速度按钮等跨组件复用的轻量类型。
 */
export type BattleLogTab = 'log' | 'director' | 'reporter';
export type BattleOverlay = 'records' | 'briefing' | 'settings' | null;

export type ReporterReportCard = {
  id: string;
  title: string;
  content: string;
  actionIndex: number;
};

export type BattleSpeedOption = {
  label: string;
  ms: number;
};
