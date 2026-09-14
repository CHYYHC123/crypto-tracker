import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';
import SubHeader from '@/popup/components/SubHeader';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

type LangOption = {
  code: string;
  nativeLabel: string;
  flag: string;
};

const LANG_OPTIONS: LangOption[] = [
  { code: 'en', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'zh', nativeLabel: '简体中文', flag: '🇨🇳' },
];

const Language = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'language' });
  const navigate = useNavigate();
  const currentLang = i18n.language;

  const handleSelect = (code: string) => {
    if (code === currentLang) return;
    i18n.changeLanguage(code);
    const label = t(`options.${code}`);
    toast.success(t('switched', { language: label }), { duration: 2000 });
    navigate('/');
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col font-mono">
      <SubHeader title={t('title')} />
      <div className="p-4 space-y-2">
        {LANG_OPTIONS.map(({ code, nativeLabel, flag }) => {
          const isSelected = currentLang === code;
          return (
            <motion.button
              key={code}
              onClick={() => handleSelect(code)}
              className={cn(
                'w-full px-3 py-3 rounded-xl border transition-all cursor-pointer text-left',
                isSelected
                  ? 'bg-purple-500/30 border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'bg-gray-800/50 border-white/10 hover:bg-gray-800 hover:border-white/20'
              )}
              whileHover={{ scale: 1.02, boxShadow: '0 0 12px rgba(255, 255, 255, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              animate={!isSelected ? { opacity: [1, 0.85, 1] } : {}}
              transition={{
                opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                scale: { type: 'spring', stiffness: 300, damping: 20 },
                boxShadow: { duration: 0.3 }
              }}
            >
              <div className="flex items-center gap-3">
                {/* Flag */}
                <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0 flex items-center justify-center text-lg">
                  {flag}
                </div>
                {/* Info */}
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium text-sm">{nativeLabel}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{t(`options.${code}`)}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default Language;
