import React, { useState, useEffect } from 'react';
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
  // 使用本地状态保存输入字符串，保留小数位数
  const [inputValue, setInputValue] = useState<string>('');

  // 当外部 price 变化时，同步更新 inputValue（但只在失去焦点时触发，避免输入时被覆盖）
  useEffect(() => {
    // 如果当前输入值转换为数字后与 price 不同，说明是外部更新，需要同步
    const currentNum = inputValue === '' || inputValue === '-' ? 0 : Number(inputValue);
    if (currentNum !== price) {
      // 如果 price 是 0，检查是否有小数部分（通过字符串判断）
      if (price === 0 && !inputValue.includes('.')) {
        // 如果之前没有输入过小数点，保持为 "0"
        setInputValue('0');
      } else {
        // 使用 Big.js 来格式化，保留有效小数位数
        const bigPrice = new Big(price);
        // 如果原输入有小数部分，尝试保留相同的小数位数
        if (inputValue.includes('.')) {
          const decimalPlaces = inputValue.split('.')[1]?.length || 0;
          setInputValue(bigPrice.toFixed(decimalPlaces));
        } else {
          setInputValue(bigPrice.toFixed());
        }
      }
    }
  }, [price]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 允许空字符串、负号、数字和小数点
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      setInputValue(value);

      // 实时更新价格（如果输入有效）
      if (value !== '' && value !== '-' && value !== '.') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          onPriceChange(numValue);
        }
      } else if (value === '' || value === '-') {
        // 空字符串或只有负号时，设置为 0
        onPriceChange(0);
      }
    }
  };

  // 处理失去焦点，规范化输入值
  const handleBlur = () => {
    if (inputValue === '' || inputValue === '-' || inputValue === '.') {
      setInputValue('0');
      onPriceChange(0);
      return;
    }

    const numValue = Number(inputValue);
    if (isNaN(numValue)) {
      setInputValue('0');
      onPriceChange(0);
    } else {
      // 保留小数位数：如果输入有小数部分，保留它
      const bigValue = new Big(numValue);
      if (inputValue.includes('.')) {
        const decimalPlaces = inputValue.split('.')[1]?.length || 0;
        setInputValue(bigValue.toFixed(decimalPlaces));
      } else {
        setInputValue(bigValue.toFixed());
      }
      onPriceChange(numValue);
    }
  };

  // 封装动态步长计算逻辑
  const handleAdjust = (isIncrement: boolean) => {
    const currentPrice = inputValue === '' || inputValue === '-' ? 0 : Number(inputValue);

    // 处理 0 或负数的情况
    if (currentPrice <= 0) {
      const newValue = isIncrement ? 1 : 0;
      setInputValue(newValue.toString());
      onPriceChange(newValue);
      return;
    }

    try {
      const bPrice = new Big(currentPrice);

      // 获取输入值的小数位数
      const decimalPlaces = inputValue.includes('.') ? inputValue.split('.')[1]?.length || 0 : 0;

      // 计算步长：根据小数位数和数值大小动态调整
      let step: Big;

      if (decimalPlaces > 0) {
        // 如果有小数部分，步长应该是最小精度单位（最后一位）
        // 例如：0.00004 -> 步长 0.00001，0.000040 -> 步长 0.000001
        step = new Big(10).pow(-decimalPlaces);
      } else {
        // 如果是整数，使用原来的逻辑：数量级的 1/10
        const exponent = Math.floor(Math.log10(currentPrice));
        step = new Big(10).pow(exponent - 1);
      }

      const newPrice = isIncrement ? bPrice.plus(step) : bPrice.minus(step);

      // 确保不小于 0
      const finalPrice = newPrice.lt(0) ? 0 : newPrice;

      // 保留原有小数位数
      if (decimalPlaces > 0) {
        const formattedValue = finalPrice.toFixed(decimalPlaces);
        setInputValue(formattedValue);
        onPriceChange(Number(formattedValue));
      } else {
        const formattedValue = finalPrice.toFixed();
        setInputValue(formattedValue);
        onPriceChange(Number(formattedValue));
      }
    } catch (e) {
      console.error('Price calculation error', e);
    }
  };

  // 快捷调用
  const handleDecrement = () => handleAdjust(false);
  const handleIncrement = () => handleAdjust(true);

  return (
    <div className="w-full border border-gray-800 p-3 rounded-xl">
      <h2 className="text-white/90 font-normal text-sm mb-2">Alert Price</h2>

      {/* 价格输入/调节器 */}
      <div className="flex items-center rounded-xl border border-gray-700 mb-4 overflow-hidden">
        <button onClick={handleDecrement} className="p-3 transition-colors text-gray-400 border-r border-gray-700 cursor-pointer transition-all transition-discrete duration-300 hover:bg-gray-600">
          <Minus size={16} />
        </button>

        <input type="text" inputMode="decimal" value={inputValue} onChange={handleInputChange} onBlur={handleBlur} className="flex-1 bg-transparent text-center text-white text-base font-semibold outline-none w-full" />

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

      <p className="text-gray-500 text-sm text-left">Notify on price crossing. Set 0 to disable.</p>
    </div>
  );
};

export default PriceAlertInput;
