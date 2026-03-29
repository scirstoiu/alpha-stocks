'use client';

import { useState, useEffect } from 'react';
import { useStockLogo } from '@alpha-stocks/core';

const COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];

const CACHE_KEY = 'stock-logos';

function getLogoCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setLogoCache(symbol: string, url: string) {
  try {
    const cache = getLogoCache();
    cache[symbol] = url;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable
  }
}

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
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  // Check localStorage cache synchronously on mount
  useEffect(() => {
    const cache = getLogoCache();
    if (cache[symbol]) {
      setCachedUrl(cache[symbol]);
    }
  }, [symbol]);

  // Fetch from API (will be a no-op if React Query cache already has it)
  const { data: logoUrl } = useStockLogo(symbol);

  // Persist new logos to localStorage
  useEffect(() => {
    if (logoUrl && logoUrl !== cachedUrl) {
      setCachedUrl(logoUrl);
      setLogoCache(symbol, logoUrl);
    }
  }, [logoUrl, symbol, cachedUrl]);

  const url = cachedUrl || logoUrl;

  if (url && !imgError) {
    return (
      <img
        src={url}
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
