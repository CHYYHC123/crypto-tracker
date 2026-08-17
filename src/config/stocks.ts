// 默认展示股票
const DEFAULT_STOCKS: string[] = ['ZS', 'CRCL', 'AAPL', 'NVDA', 'TSLA', 'GOOGL', 'SPCX'];

// 热门股票
const POPULAR_STOCKS = ['NVDA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'AVGO'] as const;

const DEFAULT_STOCKS_SET = new Set(DEFAULT_STOCKS);

export { DEFAULT_STOCKS, POPULAR_STOCKS, DEFAULT_STOCKS_SET };
