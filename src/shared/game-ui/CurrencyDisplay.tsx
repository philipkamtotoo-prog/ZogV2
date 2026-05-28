import type { CSSProperties } from 'react';
import './game-ui.css';

export type CurrencyDisplayVariant = 'gold' | 'scoin' | 'plain';

interface CurrencyDisplayProps {
  value: number;
  label: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  style?: CSSProperties;
  variant?: CurrencyDisplayVariant;
}

export function CurrencyDisplay({
  value,
  label,
  className = '',
  labelClassName = '',
  valueClassName = '',
  style,
  variant = 'plain',
}: CurrencyDisplayProps) {
  const normalizedValue = normalizeCurrencyValue(value);
  const iconSrc = variant === 'gold'
    ? '/道具icon/G币icon.png'
    : variant === 'scoin'
      ? '/道具icon/S币icon.png'
      : null;

  return (
    <div className={['game-currency-display', `is-${variant}`, className].filter(Boolean).join(' ')} style={style}>
      {label ? <span className={labelClassName}>{label}</span> : null}
      {iconSrc ? <img className="game-currency-icon" alt={variant === 'gold' ? 'G币' : 'S币'} src={iconSrc} draggable={false} /> : null}
      <strong className={valueClassName} title={`${normalizedValue}`}>
        {formatCompactCurrency(normalizedValue)}
      </strong>
    </div>
  );
}

export function CurrencyAmount({
  value,
  variant,
  showSign = false,
}: {
  value: number;
  variant: Exclude<CurrencyDisplayVariant, 'plain'>;
  showSign?: boolean;
}) {
  const normalizedValue = Math.floor(Number.isFinite(value) ? value : 0);
  const sign = showSign ? (normalizedValue > 0 ? '+' : normalizedValue < 0 ? '-' : '') : '';
  const iconSrc = variant === 'gold' ? '/道具icon/G币icon.png' : '/道具icon/S币icon.png';

  return (
    <span className={['game-currency-amount', `is-${variant}`].join(' ')}>
      <span>{sign}{formatCompactCurrency(Math.abs(normalizedValue))}</span>
      <img className="game-currency-icon" alt={variant === 'gold' ? 'G币' : 'S币'} src={iconSrc} draggable={false} />
    </span>
  );
}

export function formatCompactCurrency(value: number): string {
  const normalized = normalizeCurrencyValue(value);
  if (normalized < 1_000_000) return normalized.toLocaleString('en-US');
  if (normalized < 1_000_000_000) return `${trimCompactNumber(normalized / 1_000_000)}M`;
  return `${trimCompactNumber(normalized / 1_000_000_000)}B`;
}

function normalizeCurrencyValue(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function trimCompactNumber(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '');
}
