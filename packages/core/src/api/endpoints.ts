export function quoteUrl(baseUrl: string, symbol: string): string {
  return `${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`;
}

export function quotesUrl(baseUrl: string, symbols: string[]): string {
  return `${baseUrl}/api/stocks/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
}

export function searchUrl(baseUrl: string, query: string): string {
  return `${baseUrl}/api/stocks/search?q=${encodeURIComponent(query)}`;
}

export function historicalUrl(baseUrl: string, symbol: string, range: string): string {
  return `${baseUrl}/api/stocks/historical?symbol=${encodeURIComponent(symbol)}&range=${range}`;
}

export function profileUrl(baseUrl: string, symbol: string): string {
  return `${baseUrl}/api/stocks/profile?symbol=${encodeURIComponent(symbol)}`;
}

export function newsUrl(baseUrl: string, symbol?: string): string {
  const params = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  return `${baseUrl}/api/news${params}`;
}

export function earningsUrl(baseUrl: string, from: string, to: string): string {
  return `${baseUrl}/api/earnings?from=${from}&to=${to}`;
}
