/**
 * 功能备注：战斗页右下导演指令输入区。
 * 负责指令文本输入、SEND 按钮和澄清选择状态展示，不负责命令解析或执行。
 */
import { BATTLE_ASSETS, box } from './battlePageConfig';

interface BattleAskOption {
  actorId: string;
  label: string;
}

interface BattleCommandPanelProps {
  askTargetOptions?: BattleAskOption[];
  askTargetQuestion?: string;
  commandInput: string;
  commandStatus: string | null;
  disabled: boolean;
  isAskMode: boolean;
  onCancelAsk: () => void;
  onChangeCommandInput: (value: string) => void;
  onResolveAsk: (actorId: string) => void;
  onSubmitCommand: (command: string) => void;
}

export function BattleCommandPanel({
  askTargetOptions,
  askTargetQuestion,
  commandInput,
  commandStatus,
  disabled,
  isAskMode,
  onCancelAsk,
  onChangeCommandInput,
  onResolveAsk,
  onSubmitCommand,
}: BattleCommandPanelProps) {
  return (
    <section className="battle-command-panel">
      {isAskMode ? (
        <div className="battle-ask-box">
          <p>{askTargetQuestion}</p>
          <div>
            {askTargetOptions?.map((option) => (
              <button key={option.actorId} onClick={() => onResolveAsk(option.actorId)} type="button">
                {option.label}
              </button>
            ))}
            <button onClick={onCancelAsk} type="button">取消</button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            className="battle-command-input"
            disabled={disabled}
            onChange={(event) => onChangeCommandInput(event.target.value)}
            placeholder="Director signal..."
            value={commandInput}
          />
          <button
            className="battle-send-button"
            disabled={disabled || !commandInput.trim()}
            onClick={() => commandInput.trim() && onSubmitCommand(commandInput.trim())}
            style={box(1939, 1053.5, 61.5, 32)}
            type="button"
          >
            <img alt="" src={BATTLE_ASSETS.send} />
          </button>
        </>
      )}
      {commandStatus ? <div className="battle-command-status">{commandStatus}</div> : null}
    </section>
  );
}
