import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import SubHeader from '@/popup/components/SubHeader';
import { ExchangeListMap, type ExchangeType, type SelectableExchangeType } from '@/config/exchangeConfig';
import { setDataSource } from '@/utils/local';

function DataSource() {
  const { t } = useTranslation('translation', { keyPrefix: 'dataSource' });
  const navigate = useNavigate();
  const { dataSource } = useLocation().state;

  const [currentSource, setCurrentSource] = useState<null | ExchangeType>(null);

  // 初始化当前选中的数据源
  useEffect(() => {
    if (dataSource) setCurrentSource(dataSource as ExchangeType);
  }, []);

  // 处理选择数据源
  const handleSelect = async (source: ExchangeType) => {
    const info = ExchangeListMap[source as SelectableExchangeType];
    if (info.disabled) return; // 跳过禁用的数据源

    await setDataSource(source);

    toast.success(t('switched', { name: info.name }), { duration: 2000 });
    navigate('/');
  };

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col font-mono">
      <SubHeader title={t('title')} />
      <div className="p-4 space-y-2 max-h-100 overflow-y-auto">
        {Object.entries(ExchangeListMap)
          .filter(([_, info]) => !info.disabled)
          .map(([source, info]) => {
            const exchangeType = source as ExchangeType;
            const isSelected = currentSource === exchangeType;

            return (
              <motion.button
                key={source}
                onClick={() => handleSelect(exchangeType)}
                className={cn('w-full px-3 py-3 rounded-xl border transition-all cursor-pointer text-left', isSelected ? 'bg-primary/30 border-primary shadow-lg shadow-primary/20' : 'bg-input/50 border-border hover:bg-input hover:border-foreground/20')}
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
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                    <img src={info.logo} alt={info.name} className="w-full h-full object-contain" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="text-foreground-bold font-medium text-sm">
                        <span>{info.name}</span>
                        <span className='text-[12px] ml-1'>{info.market === 'futures' ? t('futures') : t('spot')}</span>
                      </span>
                      <div className="text-muted text-xs mt-0.5">{info.needsVPN ? t('needVpn') : t('noVpn')}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </div>
              </motion.button>
            );
          })}
      </div>
    </div>
  );
}

export default DataSource;
