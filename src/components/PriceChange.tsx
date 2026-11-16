'use client';

import React from 'react';
import { formatINR } from '@/src/lib/i18n';

export function PriceChange({
  change,
  changePercent,
  showCurrency = false,
}: {
  change: number | null | undefined;
  changePercent: number | null | undefined;
  showCurrency?: boolean;
}) {
  if (changePercent === null || changePercent === undefined) {
    return <span className="font-mono tabular-nums text-slate-500">—</span>;
  }

  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : isNegative
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-500 dark:text-slate-400';

  const arrow = isPositive ? '▲' : isNegative ? '▼' : '•';
  const sign = isPositive ? '+' : '';

  return (
    <span className={`font-mono tabular-nums font-medium ${colorClass}`}>
      {arrow}{' '}
      {change !== null && change !== undefined
        ? `${sign}${showCurrency ? formatINR(change) : change.toFixed(2)} (`
        : ''}
      {sign}
      {changePercent.toFixed(2)}%
      {change !== null && change !== undefined ? ')' : ''}
    </span>
  );
}
