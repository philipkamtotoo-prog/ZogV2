/**
 * 功能备注：战斗页下方日志区右侧三个小工具按钮。
 * 负责打开全记录流、本局资料和设置入口，只处理按钮展示与点击回调。
 */
import type { CSSProperties } from 'react';
import { BATTLE_ASSETS, box } from './battlePageConfig';
import type { BattleOverlay } from './battleUiTypes';

interface BattleToolButtonsProps {
  onOpenOverlay: (overlay: Exclude<BattleOverlay, null>) => void;
  onOpenSettings: () => void;
}

export function BattleToolButtons({ onOpenOverlay, onOpenSettings }: BattleToolButtonsProps) {
  return (
    <>
      <ToolIconButton
        ariaLabel="Open all records"
        onClick={() => onOpenOverlay('records')}
        src={BATTLE_ASSETS.filter}
        style={box(1329, 868.5, 50.5, 48)}
      />
      <ToolIconButton
        ariaLabel="Open battle briefing"
        onClick={() => onOpenOverlay('briefing')}
        src={BATTLE_ASSETS.allRecords}
        style={box(1386, 868.5, 53.5, 48)}
      />
      <ToolIconButton
        ariaLabel="Open settings"
        onClick={onOpenSettings}
        src={BATTLE_ASSETS.settings}
        style={box(1446, 868.5, 50.5, 48)}
      />
    </>
  );
}

function ToolIconButton({
  ariaLabel,
  onClick,
  src,
  style,
}: {
  ariaLabel: string;
  onClick: () => void;
  src: string;
  style: CSSProperties;
}) {
  return (
    <button aria-label={ariaLabel} className="battle-small-tool-button" onClick={onClick} style={style} type="button">
      <img alt="" src={src} />
    </button>
  );
}
