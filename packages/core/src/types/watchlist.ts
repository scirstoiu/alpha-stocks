export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  notes?: string;
  added_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items?: WatchlistItem[];
}
