export default {
  popup: {
    home: {
      header: {
        title: 'Crypto Tracker',
        crypto: 'Crypto',
        stocks: 'Stocks',
        dataSource: 'Data Source ({{dataSource}})',
        globalPriceMonitor: 'Global Price Alert',
        exportCoins: 'Export Coins',
        connectUs: 'Contact Us',
        language: 'Language ({{language}})',
        exportingData: 'Exporting data...',
        exchange: {
          BN: 'Binance Spot',
          BNFutures: 'Binance Futures',
          OKX: 'OKX',
          Gate: 'Gate.io',
          HL: 'Hyperliquid',
          BNStock: 'Binance Stock'
        }
      },
      emptyState: {
        noTokens: 'No tokens yet',
        hint: 'Add a token to get started'
      },
      footer: {
        selectAll: 'Select All',
        cancelSelectAll: 'Deselect All',
        cancel: 'Cancel',
        delete: 'Delete ({{count}})',
        select: 'Select',
        refresh: 'Refresh'
      },
      actionMenu: {
        priceAlert: 'Price Alert',
        remove: 'Remove'
      },
      alertDialog: {
        title: 'Set alert for {{symbol}}',
        alertEnabled: 'Price alert enabled',
        alertDisabled: 'Price alert disabled',
        current: 'Current: {{price}}',
        save: 'Save',
        cancel: 'Cancel'
      },
      tokenSearch: {
        addCrypto: 'Add Crypto',
        addStock: 'Add Stock',
        searchCryptoPlaceholder: 'Search Symbol (e.g. BTC)',
        searchStockPlaceholder: 'Search Symbol (e.g. AAPL)',
        addBtn: 'Add',
        maxReached: 'Max tracked cryptos reached. Contact admin to unlock.',
        notSupported: '{{symbol}} is not in the supported list'
      }
    }
  },
  language: {
    title: 'Language',
    options: {
      en: 'English',
      zh: 'Simplified Chinese'
    },
    switched: 'Language switched to {{language}}'
  },
  content: {
    home: {}
  }
} as const;
