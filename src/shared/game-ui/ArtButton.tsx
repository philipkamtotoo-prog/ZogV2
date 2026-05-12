import type { CSSProperties, ReactNode } from 'react';
import './game-ui.css';

interface ArtButtonProps {
  active?: boolean;
  activeSrc?: string;
  idleSrc: string;
  label?: ReactNode;
  className?: string;
  activeClassName?: string;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export function ArtButton({
  active = false,
  activeSrc,
  idleSrc,
  label,
  className = '',
  activeClassName = 'is-active',
  disabled,
  style,
  title,
  type = 'button',
  onClick,
}: ArtButtonProps) {
  return (
    <button
      className={['game-art-button', className, active ? activeClassName : ''].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={onClick}
      style={style}
      title={title}
      type={type}
    >
      <img alt="" src={active && activeSrc ? activeSrc : idleSrc} />
      {label !== undefined ? <span>{label}</span> : null}
    </button>
  );
}

