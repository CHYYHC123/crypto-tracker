import React from 'react';
import { Minus, Plus, ArrowUp, ArrowDown } from 'lucide-react';

import Big from 'big.js';

export type Direction = 'above' | 'below';

interface PriceAlertInputProps {
  price: number;
  direction: Direction;
  onPriceChange: (newPrice: number) => void;
  onDirectionChange: (newDirection: Direction) => void;
}

const PriceAlertInput: React.FC<PriceAlertInputProps> = ({ price, direction, onPriceChange, onDirectionChange }) => {
  // 封装动态步长计算逻辑
  const handleAdjust = (isIncrement: boolean) => {
    // 处理 0 或负数的情况
    if (price <= 0) {
      onPriceChange(isIncrement ? 1 : 0);
      return;
    }

    try {
      const bPrice = new Big(price);

      // 计算数量级 (Magnitude)
      // Big.js 没有直接的 log10，我们通过科学计数法字符串来提取幂次
      // 例如 90000 -> "9.0e+4" -> e 为 4
      const exponent = Math.floor(Math.log10(price));

      // 步长设为数量级的 1/10
      // 比如价格 90000 (10^4)，步长就是 10^3 = 1000
      const step = new Big(10).pow(exponent - 1);

      const newPrice = isIncrement ? bPrice.plus(step) : bPrice.minus(step);

      // 确保不小于 0，并转回 number
      // toNumber() 在处理极小值时可能会转为科学计数法，
      // 如果你的父组件 input 需要字符串，建议直接传 bPrice.toFixed()
      const finalPrice = newPrice.lt(0) ? 0 : Number(newPrice.toFixed());

      onPriceChange(finalPrice);
    } catch (e) {
      console.error('Price calculation error', e);
    }
  };

  // 渲染时，为了防止 input 出现科学计数法 (1e-8)
  // 建议在 value 处做转换
  const displayValue = new Big(price || 0).toFixed();

  // 快捷调用
  const handleDecrement = () => handleAdjust(false);
  const handleIncrement = () => handleAdjust(true);

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => onPriceChange(Number(e.target.value));

  return (
    <div className="w-full border border-gray-800 p-3 rounded-xl">
      <h2 className="text-white/90 font-normal text-sm mb-2">Alert Price</h2>

      {/* 价格输入/调节器 */}
      <div className="flex items-center rounded-xl border border-gray-700 mb-4 overflow-hidden">
        <button onClick={handleDecrement} className="p-3 transition-colors text-gray-400 border-r border-gray-700 cursor-pointer transition-all transition-discrete duration-300 hover:bg-gray-600">
          <Minus size={16} />
        </button>

        <input type="number" value={displayValue} onChange={e => onPriceChange(Number(e.target.value))} className="flex-1 bg-transparent text-center text-white text-base font-semibold outline-none w-full" />

        <button onClick={handleIncrement} className="p-3 transition-colors text-indigo-400 border-l border-gray-700 cursor-pointer transition-all transition-discrete duration-300  hover:bg-gray-600">
          <Plus size={16} />
        </button>
      </div>

      {/* 方向选择按钮 */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={() => onDirectionChange('above')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all border cursor-pointer ${direction === 'above' ? 'bg-[#1e3a32] border-[#2d5a4c] text-[#4ade80]' : 'bg-[#131425] border-transparent text-gray-500 hover:border-gray-700'}`}
        >
          <ArrowUp size={18} className={direction === 'above' ? 'text-green-400' : ''} />
          <span className="font-semibold">Above</span>
        </button>

        <button
          onClick={() => onDirectionChange('below')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all border cursor-pointer ${direction === 'below' ? 'bg-[#441d24] border-[#6b252f] text-[#f87171]' : 'bg-[#131425] border-transparent text-gray-500 hover:border-gray-700'}`}
        >
          <ArrowDown size={18} className={direction === 'below' ? 'text-red-400' : ''} />
          <span className="font-semibold">Below</span>
        </button>
      </div>

      <p className="text-gray-500 text-sm text-left"> Notify me when price crosses. Use 0 to disable alerts.</p>
    </div>
  );
};

export default PriceAlertInput;
