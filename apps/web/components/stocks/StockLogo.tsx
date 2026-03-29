'use client';

import { useState } from 'react';
import { useStockLogo } from '@alpha-stocks/core';

const COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];

function getColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function StockLogo({
  symbol,
  size = 24,
}: {
  symbol: string;
  size?: number;
}) {
  const { data: logoUrl } = useStockLogo(symbol);
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-medium flex-shrink-0 ${getColor(symbol)}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {symbol.charAt(0)}
    </span>
  );
}
