import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Power, PowerOff, CircleAlert } from 'lucide-react';

import toast from 'react-hot-toast';
import type { GlobalAlerts } from '@/types/index';
import { loadGlobalAlerts, saveGlobalAlerts } from '@/background/globalAlertsManager';
import Input from '@/components/common/input';
import Button from '@/components/common/button';
import Tooltip from '@/components/common/tooltip';

interface ThresholdInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  max?: number;
}

const ThresholdInput: React.FC<ThresholdInputProps> = ({ label, value, onChange, placeholder = 'e.g. 10', max }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // 1. 只保留数字和小数点
    val = val.replace(/[^\d.]/g, '');

    // 2. 确保只有一个小数点
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }

    // 3. 限制最多两位小数
    if (val.includes('.')) {
      const [intPart, decimalPart] = val.split('.');
      if (decimalPart.length > 2) {
        val = `${intPart}.${decimalPart.slice(0, 2)}`;
      }
    }

    // 4. 限制最大值
    if (max !== undefined && val !== '' && Number(val) > max) {
      val = String(max);
    }

    if (val === '') {
      onChange('');
      return;
    }

    // 4. 处理前导零
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
      if (val === '') val = '0';
    }

    // 5. 范围限制 (0-100)
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (num > 100) {
        onChange('100');
      } else {
        onChange(val);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 允许功能键
    const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key);
    const isSelectAll = (e.ctrlKey || e.metaKey) && e.key === 'a';
    const isCopyPaste = (e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key);

    if (isControlKey || isSelectAll || isCopyPaste) {
      return;
    }

    // 只允许数字键 (0-9) 和小数点 (.)
    if (!/[\d.]/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // 如果已经有小数点，禁止再输入小数点
    if (e.key === '.' && value.includes('.')) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-white/50 tracking-tight uppercase">{label}</div>
      <div className="relative group">
        <Input type="text" inputMode="decimal" value={value} placeholder={placeholder} onChange={handleChange} onKeyDown={handleKeyDown} className="w-full text-sm" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
      </div>
    </div>
  );
};

export default function AlertSettings() {
  const navigate = useNavigate();
  const [limitEnabled, setLimitEnabled] = useState(true);

  const [bullLimit, setBullLimit] = useState('0');
  const [bearLimit, setBearLimit] = useState('0');
  const [stepLimit, setStepLimit] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGlobalAlerts().then(data => {
      setBullLimit(data.bull || '0');
      setBearLimit(data.bear || '0');
      setStepLimit(data.step || '0');
      setLimitEnabled(data.enabled ?? false);
    });
  }, []);

  const saveGlobalSettings = async () => {
    setSaving(true);
    const globalAlerts: GlobalAlerts = {
      bull: bullLimit,
      bear: bearLimit,
      step: stepLimit,
      enabled: limitEnabled
    };

    try {
      await saveGlobalAlerts(globalAlerts);
      toast.success('Global alerts setting saved');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      toast.error('Failed to save settings');
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col font-mono">
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 transition-colors cursor-pointer">
          <ArrowLeft size={24} />
        </button>
        <h3 className="text-[16px] font-semibold">Price Alerts</h3>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6 scrollbar-hide">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white/90 uppercase tracking-wider">Global Price Monitor</h4>
              <p className="text-[11px] text-white/50 mt-0.5">
                Status: <span className={limitEnabled ? 'text-green-500' : 'text-red-500'}>{limitEnabled ? 'ENABLED' : 'DISABLED'}</span>
              </p>
            </div>
            <button onClick={() => setLimitEnabled(!limitEnabled)} className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${limitEnabled ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
              {limitEnabled ? <Power size={18} /> : <PowerOff size={18} />}
            </button>
          </div>

          <div className="space-y-4">
            <ThresholdInput label="BULLISH ALERT (Upward Surge) (%)" value={bullLimit} onChange={setBullLimit} />
            <ThresholdInput label="BEARISH ALERT (Downward Drop) (%)" value={bearLimit} onChange={setBearLimit} />

            <div className="">
              <div className="flex items-center text-[11px] font-medium text-white/50 tracking-tight uppercase">
                <span>TRAILING MODE(%)</span>
                {Number(stepLimit) > 0 && (
                  <Tooltip sideOffset={1} content={<span style={{ display: 'block', maxWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>{`Trailing mode active: After first alert, threshold will increase by ${stepLimit}% each time.`}</span>}>
                    <CircleAlert className="cursor-pointer ml-1" size={14} />
                  </Tooltip>
                )}
              </div>
              <ThresholdInput label="" placeholder="1" value={stepLimit} onChange={setStepLimit} max={10} />
            </div>

            {(bullLimit || bearLimit) && (
              <p className="text-[11px] text-white/40 leading-relaxed italic">
                Alert me when any coin moves {bullLimit ? `>= ${bullLimit}%` : ''} {bullLimit && bearLimit ? 'or' : ''} {bearLimit ? `<= -${bearLimit}%` : ''}.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="p-4 pb-6  backdrop-blur-md">
        <div className="flex gap-2">
          <Button className="flex-1 border border-white/10  hover:bg-white/5 transition-colors" size="lg" onClick={() => navigate(-1)}>
            Cancel
          </Button>

          <Button className="ml-2 bg-blue-600 hover:bg-blue-700" size="lg" loading={saving} onClick={saveGlobalSettings}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
