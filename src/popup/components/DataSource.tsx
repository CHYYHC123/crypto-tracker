import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { ExchangeListMap, type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface DataSourceProps {
  onClose?: () => void;
  onSelect?: (source: ExchangeType) => void;
}

const DataSource: React.FC<DataSourceProps> = ({ onClose, onSelect }) => {
  const [currentSource, setCurrentSource] = useState<ExchangeType>(defaultDataSource);

  // 初始化当前选中的数据源
  useEffect(() => {
    const initDataSource = async () => {
      const { data_source } = await chrome.storage.local.get('data_source');
      if (typeof data_source === 'string' && ExchangeListMap[data_source as ExchangeType]) {
        setCurrentSource(data_source as ExchangeType);
      } else {
        setCurrentSource(defaultDataSource);
      }
    };
    initDataSource();
  }, []);

  // 处理选择数据源
  const handleSelect = async (source: ExchangeType) => {
    const info = ExchangeListMap[source];
    if (info.disabled) return; // 跳过禁用的数据源

    await chrome.storage.local.set({ data_source: source });
    setCurrentSource(source);

    // 调用回调
    onSelect?.(source);
    onClose?.();
    toast.success(`Data source switched to ${info.name}`, { duration: 2000 });
  };

  return (
    <div className="h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="text-white font-medium text-sm">Select Data Source</div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Data Source List */}
      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {Object.entries(ExchangeListMap)
          .filter(([_, info]) => !info.disabled)
          .map(([source, info]) => {
            const exchangeType = source as ExchangeType;
            const isSelected = currentSource === exchangeType;

            return (
              <motion.button
                key={source}
                onClick={() => handleSelect(exchangeType)}
                className={cn('w-full px-2 py-1 rounded-xl border-2 transition-all cursor-pointer text-left', isSelected ? 'bg-purple-500/30 border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-gray-800/50 border-white/10 hover:bg-gray-800 hover:border-white/20')}
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 0 12px rgba(255, 255, 255, 0.15)'
                }}
                whileTap={{ scale: 0.98 }}
                animate={!isSelected ? { opacity: [1, 0.85, 1] } : {}}
                transition={{
                  opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                  scale: { type: 'spring', stiffness: 300, damping: 20 },
                  boxShadow: { duration: 0.3 }
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={info.logo} alt={info.name} className="w-full h-full object-contain" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium text-sm">{info.name}</span>
                      <div className="text-gray-400 text-xs mt-0.5">{info.needsVPN ? 'Need VPN' : 'No VPN'}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                  </div>
                </div>
              </motion.button>
            );
          })}
      </div>
    </div>
  );
};

export default DataSource;
