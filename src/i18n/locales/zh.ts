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
        titlePrefix: '',
        titleSuffix: '价格预警',
        alertEnabled: '价格预警已启用',
        alertDisabled: '价格预警已禁用',
        current: '当前价格：{{price}}',
        save: '保存',
        cancel: '取消'
      },
      priceAlert: {
        alertPrice: '价格',
        above: '高于',
        below: '低于',
        hint: '价格突破时通知。设为 0 则禁用。'
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
  dataSource: {
    title: '数据源',
    switched: '数据源已切换为 {{name}}',
    spot: '(现货)',
    futures: '(合约)',
    needVpn: '需要 VPN',
    noVpn: '无需 VPN'
  },
  connectUs: {
    title: '联系我们',
    email: {
      hint: '如有任何问题或需要帮助，请随时联系我们。'
    },
    license: {
      label: '授权码',
      placeholder: '请输入授权码',
      hint: '输入授权码以激活高级功能。',
      saved: '授权码保存成功'
    },
    support: {
      title: '支持项目',
      desc: '如果您喜欢使用 Crypto Tracker，欢迎支持本项目。您的支持将帮助项目持续运营与成长。',
      networkAddress: '网络 / 地址',
      usdtNotice: '仅支持',
      networkNotice: '发送时请确保选择正确的网络。'
    }
  },
  alertSettings: {
    title: '价格预警',
    globalMonitor: '全局价格监控',
    status: '状态',
    enabled: '已启用',
    disabled: '已禁用',
    bullishLabel: '涨幅预警（上涨）(%)',
    bearishLabel: '跌幅预警（下跌）(%)',
    trailingLabel: '追踪模式(%)',
    trailingTooltip: '追踪模式已启用：首次触发预警后，每次阈值将增加 {{step}}%。',
    alertSummaryBoth: '当任意币种涨幅 >= {{bull}}% 或跌幅 <= -{{bear}}% 时提醒我。',
    alertSummaryBull: '当任意币种涨幅 >= {{bull}}% 时提醒我。',
    alertSummaryBear: '当任意币种跌幅 <= -{{bear}}% 时提醒我。',
    saved: '全局预警设置已保存',
    saveFailed: '保存设置失败',
    cancel: '取消',
    save: '保存设置'
  },
  content: {
    home: {}
  }
} as const;
