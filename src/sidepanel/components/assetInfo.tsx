interface AssetInfoData {
  open: string;      // 开盘价
  high: string;      // 最高价
  low: string;       // 最低价
  close: string;     // 收盘价
  change: string;    // 涨跌幅，如 "-0.31%"
  amplitude: string; // 振幅，如 "2.24%"
  ma7: string;       // MA(7)
  ma25: string;      // MA(25)
  ma99: string;      // MA(99)
}

export default function AssetInfo({ data }: { data: AssetInfoData }) {
  const isNegative = data.change.startsWith('-');

  return (
    <div className="px-3 pt-2 pb-1 space-y-1 text-[11px]">
      {/* 第一行：OHLC */}
      <div className="flex items-center gap-2 flex-wrap text-foreground/40 leading-snug">
        <span>
          开 <span className="text-pink-400">{data.open}</span>
        </span>
        <span>
          高 <span className="text-pink-400">{data.high}</span>
        </span>
        <span>
          低 <span className="text-pink-400">{data.low}</span>
        </span>
        <span>
          收 <span className="text-pink-400">{data.close}</span>
        </span>
      </div>
      {/* 第二行：涨跌幅 + 振幅 */}
      <div className="flex items-center gap-3 text-foreground/40 leading-snug">
        <span>
          涨跌幅{' '}
          <span className={isNegative ? 'text-red-400' : 'text-green-400'}>
            {data.change}
          </span>
        </span>
        <span>
          振幅 <span className="text-foreground/80">{data.amplitude}</span>
        </span>
      </div>
      {/* 第三行：MA 均线 */}
      <div className="flex items-center gap-3 leading-snug">
        <span>
          <span className="text-foreground/40">MA(7): </span>
          <span className="text-amber-400">{data.ma7}</span>
        </span>
        <span>
          <span className="text-foreground/40">MA(25): </span>
          <span className="text-pink-400">{data.ma25}</span>
        </span>
        <span>
          <span className="text-foreground/40">MA(99): </span>
          <span className="text-violet-400">{data.ma99}</span>
        </span>
      </div>
    </div>
  );
}
