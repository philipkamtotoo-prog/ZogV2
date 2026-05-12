import type { ReactNode } from 'react';
import './game-ui.css';

interface GameOverlayPanelProps {
  title: string;
  children: ReactNode;
  classNamePrefix?: string;
  closeLabel?: string;
  onClose: () => void;
}

export function GameOverlayPanel({
  title,
  children,
  classNamePrefix = 'game-overlay',
  closeLabel = '关闭',
  onClose,
}: GameOverlayPanelProps) {
  return (
    <div className={`${classNamePrefix}-shell`} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`${classNamePrefix}-backdrop`} onClick={onClose} />
      <section className={`${classNamePrefix}-panel`}>
        <header className={`${classNamePrefix}-header`}>
          <strong>{title}</strong>
          <button onClick={onClose} type="button">{closeLabel}</button>
        </header>
        {children}
      </section>
    </div>
  );
}

