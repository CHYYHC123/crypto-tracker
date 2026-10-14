import { useTranslation } from 'react-i18next';

interface AssetInfoData {
  open: string; // 开盘价
  high: string; // 最高价
  low: string; // 最低价
  close: string; // 收盘价
  change: string; // 涨跌幅，如 "-0.31%"
  amplitude: string; // 振幅，如 "2.24%"
  ma7: string; // MA(7)
  ma25: string; // MA(25)
  ma99: string; // MA(99)
}

export default function AssetInfo({ data }: { data: AssetInfoData }) {
  const { t } = useTranslation('translation', { keyPrefix: 'sidepanel.assetInfo' });
  const isNegative = data.change.startsWith('-');

  return (
    <div className="px-3 pt-2 pb-1 space-y-1 text-[11px]">
      {/* 第一行：OHLC — 4 等宽列，不换行 */}
      <div className="grid grid-cols-4 text-foreground/40 leading-snug">
        <span className="truncate">
          {t('open')} <span className="text-pink-400">{data.open}</span>
        </span>
        <span className="truncate">
          {t('high')} <span className="text-pink-400">{data.high}</span>
        </span>
        <span className="truncate">
          {t('low')} <span className="text-pink-400">{data.low}</span>
        </span>
        <span className="truncate">
          {t('close')} <span className="text-pink-400">{data.close}</span>
        </span>
      </div>
      {/* 第二行：涨跌幅 + 振幅 */}
      <div className="flex items-center gap-3 text-foreground/40 leading-snug whitespace-nowrap">
        <span>
          {t('change')} <span className={isNegative ? 'text-red-400' : 'text-green-400'}>{data.change}</span>
        </span>
        <span>
          {t('amplitude')} <span className="text-foreground/80">{data.amplitude}</span>
        </span>
      </div>
      {/* 第三行：MA 均线 — 3 等宽列，不换行 */}
      <div className="grid grid-cols-3 leading-snug">
        <span className="truncate">
          <span className="text-foreground/40">MA(7): </span>
          <span className="text-amber-400">{data.ma7}</span>
        </span>
        <span className="truncate">
          <span className="text-foreground/40">MA(25): </span>
          <span className="text-pink-400">{data.ma25}</span>
        </span>
        <span className="truncate">
          <span className="text-foreground/40">MA(99): </span>
          <span className="text-violet-400">{data.ma99}</span>
        </span>
      </div>
    </div>
  );
}
