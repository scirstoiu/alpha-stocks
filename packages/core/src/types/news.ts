export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: number;
  relatedSymbols?: string[];
  category?: string;
}
