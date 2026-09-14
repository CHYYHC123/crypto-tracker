import { useTranslation } from 'react-i18next';

// 空状态组件
export const EmptyState = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'popup.home.emptyState' });
  return (
    <div className="flex flex-col items-center justify-center h-[150px] text-white/40">
      <div className="text-sm">{t('noTokens')}</div>
      <div className="text-xs mt-1 opacity-60">{t('hint')}</div>
    </div>
  );
};

