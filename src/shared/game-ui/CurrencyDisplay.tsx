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

  return (
    <div className={['game-currency-display', `is-${variant}`, className].filter(Boolean).join(' ')} style={style}>
      <span className={labelClassName}>{label}</span>
      <strong className={valueClassName} title={`${normalizedValue}`}>
        {formatCompactCurrency(normalizedValue)}
      </strong>
    </div>
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

