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
          BN: 'BN Spot',
          BNFutures: 'BN Futures',
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
        titlePrefix: '',
        titleSuffix: 'Price Alert',
        alertEnabled: 'Price alert enabled',
        alertDisabled: 'Price alert disabled',
        current: 'Current: {{price}}',
        save: 'Save',
        cancel: 'Cancel'
      },
      priceAlert: {
        alertPrice: 'Price',
        above: 'Above',
        below: 'Below',
        hint: 'Notify on price crossing. Set 0 to disable.'
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
  dataSource: {
    title: 'Data Source',
    switched: 'Data source switched to {{name}}',
    spot: '(Spot)',
    futures: '(Futures)',
    needVpn: 'Need VPN',
    noVpn: 'No VPN'
  },
  connectUs: {
    title: 'Contact Us',
    email: {
      hint: 'If you have any questions or need help, feel free to contact us.'
    },
    license: {
      label: 'License Key',
      placeholder: 'Enter your license key',
      hint: 'Enter your license key to activate premium features.',
      saved: 'License key saved successfully'
    },
    support: {
      title: 'Support the Project',
      desc: 'If you enjoy using Crypto Tracker, consider supporting the project. Your support helps keep the project running and growing.',
      networkAddress: 'Network / Address',
      usdtNotice: 'Only supports',
      networkNotice: 'Please ensure you select the correct network when sending.'
    }
  },
  alertSettings: {
    title: 'Price Alerts',
    globalMonitor: 'Global Price Monitor',
    status: 'Status',
    enabled: 'ENABLED',
    disabled: 'DISABLED',
    bullishLabel: 'BULLISH ALERT (Upward Surge) (%)',
    bearishLabel: 'BEARISH ALERT (Downward Drop) (%)',
    trailingLabel: 'TRAILING MODE(%)',
    trailingTooltip: 'Trailing mode active: After first alert, threshold will increase by {{step}}% each time.',
    alertSummaryBoth: 'Alert me when any coin moves >= {{bull}}% or <= -{{bear}}%.',
    alertSummaryBull: 'Alert me when any coin moves >= {{bull}}%.',
    alertSummaryBear: 'Alert me when any coin moves <= -{{bear}}%.',
    saved: 'Global alerts setting saved',
    saveFailed: 'Failed to save settings',
    cancel: 'Cancel',
    save: 'Save Settings'
  },
  content: {
  }
} as const;
