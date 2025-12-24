export type TokenItem = {
  id: string;
  symbol: string;
  price: number | null;
  change: number | null;
  icon: string;
  lastPrice: number | 0;
};

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
