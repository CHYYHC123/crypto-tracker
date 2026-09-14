export default {
  popup: {
    home: {
      header: {
        title: 'Crypto Tracker', // 品牌名保持英文
        crypto: '加密货币',
        stocks: '股票',
        dataSource: '数据源 ({{dataSource}})',
        globalPriceMonitor: '全局价格预警',
        exportCoins: '导出代币',
        connectUs: '联系我们',
        language: '语言 ({{language}})',
        exportingData: '正在导出数据...',
        exchange: {
          BN: '币安现货',
          BNFutures: '币安合约',
          OKX: 'OKX',
          Gate: 'Gate.io',
          HL: 'Hyperliquid',
          BNStock: '币安股票'
        }
      },
      emptyState: {
        noTokens: '暂无代币',
        hint: '添加一个代币开始追踪'
      },
      footer: {
        selectAll: '全选',
        cancelSelectAll: '取消全选',
        cancel: '取消',
        delete: '删除 ({{count}})',
        select: '选择',
        refresh: '刷新'
      },
      actionMenu: {
        priceAlert: '价格预警',
        remove: '删除'
      },
      alertDialog: {
        title: '为 {{symbol}} 设置预警',
        alertEnabled: '价格预警已启用',
        alertDisabled: '价格预警已禁用',
        current: '当前价格：{{price}}',
        save: '保存',
        cancel: '取消'
      },
      tokenSearch: {
        addCrypto: '添加加密货币',
        addStock: '添加股票',
        searchCryptoPlaceholder: '搜索代币（如 BTC）',
        searchStockPlaceholder: '搜索股票代码（如 AAPL）',
        addBtn: '添加',
        maxReached: '已达到追踪上限，请联系管理员解锁。',
        notSupported: '{{symbol}} 不在支持的列表中'
      }
    }
  },
  language: {
    title: '语言',
    options: {
      en: 'English',
      zh: '简体中文'
    },
    switched: '语言已切换为 {{language}}'
  },
  content: {
    home: {}
  }
} as const;
