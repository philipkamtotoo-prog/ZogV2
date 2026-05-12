/**
 * 功能备注：战斗页顶部控制栏。
 * 负责回合/存活/渡渡鸟信息、速度、暂停恢复、手动自动、金币余额和关闭按钮展示。
 */
import type { CSSProperties } from 'react';
import { ArtButton, CurrencyDisplay } from '../../../shared/game-ui';
import {
  BATTLE_ASSETS,
  MODE_BUTTONS,
  RUN_BUTTON_BOX,
  SPEED_BUTTONS,
  TOP_FIELDS,
  box,
} from './battlePageConfig';

interface BattleTopControlsProps {
  actionIndex: number;
  aliveCount: number;
  totalActors: number;
  wildDodos: number;
  totalDodos: number;
  battleSpeedMs: number;
  isPlaying: boolean;
  isProcessing: boolean;
  runMode: 'AUTO' | 'MANUAL';
  gold: number;
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  onSetBattleSpeed: (ms: number) => void;
  onStartAuto: () => void;
  onStep: () => void;
  onSwitchToManual: () => void;
}

export function BattleTopControls({
  actionIndex,
  aliveCount,
  totalActors,
  wildDodos,
  totalDodos,
  battleSpeedMs,
  isPlaying,
  isProcessing,
  runMode,
  gold,
  onClose,
  onPause,
  onResume,
  onSetBattleSpeed,
  onStartAuto,
  onStep,
  onSwitchToManual,
}: BattleTopControlsProps) {
  return (
    <>
      <TopInfoBox value={`#${actionIndex}`} style={TOP_FIELDS.action} />
      <TopInfoBox value={`${aliveCount}/${totalActors}`} style={TOP_FIELDS.alive} />
      <TopInfoBox value={`${wildDodos}/${totalDodos}`} style={TOP_FIELDS.wild} />

      {SPEED_BUTTONS.map((speed) => {
        const active = battleSpeedMs === speed.ms;
        return (
          <ArtButton
            active={active}
            activeSrc={speed.activeAsset}
            className="battle-art-button"
            idleSrc={speed.idleAsset}
            key={speed.ms}
            label={speed.label}
            onClick={() => onSetBattleSpeed(speed.ms)}
            style={active ? speed.activeBox : speed.idleBox}
          />
        );
      })}

      <ArtButton
        active
        activeSrc={isPlaying ? BATTLE_ASSETS.pause : BATTLE_ASSETS.resume}
        className="battle-art-button"
        idleSrc={isPlaying ? BATTLE_ASSETS.pause : BATTLE_ASSETS.resume}
        label={isPlaying ? '暂停' : '恢复'}
        onClick={isPlaying ? onPause : onResume}
        style={RUN_BUTTON_BOX}
      />
      <ArtButton
        active={runMode === 'MANUAL'}
        activeSrc={BATTLE_ASSETS.stepAutoActive}
        className="battle-art-button"
        disabled={isProcessing}
        idleSrc={BATTLE_ASSETS.stepAutoIdle}
        label="手动"
        onClick={runMode === 'MANUAL' ? onStep : onSwitchToManual}
        style={MODE_BUTTONS.manual}
      />
      <ArtButton
        active={runMode === 'AUTO'}
        activeSrc={BATTLE_ASSETS.stepAutoActive}
        className="battle-art-button"
        idleSrc={BATTLE_ASSETS.stepAutoIdle}
        label="自动"
        onClick={onStartAuto}
        style={MODE_BUTTONS.auto}
      />
      <CurrencyDisplay className="battle-top-gold" label="GOLD" style={box(1732, 29, 190, 60)} value={gold} variant="gold" />
      <button className="battle-close-button" onClick={onClose} type="button" style={box(1960, 29.5, 53, 53)} aria-label="Close battle">
        <img alt="" src={BATTLE_ASSETS.close} />
      </button>
    </>
  );
}

function TopInfoBox({ value, style }: { value: string; style: CSSProperties }) {
  return (
    <div className="battle-top-info" style={style}>
      <strong>{value}</strong>
    </div>
  );
}
