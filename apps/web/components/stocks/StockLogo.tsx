'use client';

import { useState, useEffect } from 'react';
import { useStockLogo } from '@alpha-stocks/core';

const COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];

const CACHE_KEY = 'stock-logos';
let memoryCache: Record<string, string> | null = null;

function getLogoCache(): Record<string, string> {
  if (memoryCache) return memoryCache;
  try {
    memoryCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return memoryCache!;
  } catch {
    memoryCache = {};
    return memoryCache;
  }
}

function setLogoCache(symbol: string, url: string) {
  const cache = getLogoCache();
  if (cache[symbol] === url) return;
  cache[symbol] = url;
  try {
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
  // Initialize synchronously from in-memory cache (populated from localStorage on first access)
  const [cachedUrl] = useState<string | null>(() => {
    try {
      return getLogoCache()[symbol] || null;
    } catch {
      return null;
    }
  });
  const [imgError, setImgError] = useState(false);

  // Fetch from API (React Query handles dedup + in-memory caching)
  const { data: logoUrl } = useStockLogo(symbol);

  // Persist new logos to localStorage + in-memory cache
  useEffect(() => {
    if (logoUrl) {
      setLogoCache(symbol, logoUrl);
    }
  }, [logoUrl, symbol]);

  const url = logoUrl || cachedUrl;

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
