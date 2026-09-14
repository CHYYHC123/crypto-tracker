import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Menu } from 'lucide-react';
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';

// import Dialog from '@/components/common/dialog';
// import Loading from '@/components/common/loading';
// import ConfirmDialog from '@/components/common/confirm-dialog';
// import Tooltip from '@/components/common/tooltip';
import { useTranslation } from 'react-i18next';
// import ImportCoins from './ImportCoins';

import { type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { getDataSource } from '@/utils/local';
// import { exportCryptoData } from '../utils/exportData';
import { useAssetType } from '@/popup/hooks/useAssetType';
// import { selectAndImportFile } from '../utils/importData';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  zh: '简体中文'
};

const MenuCenter = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'popup.home.header' });
  const currentLanguage = localStorage.getItem('app_user_lang') || 'en';
  const languageLabel = LANGUAGE_LABELS[currentLanguage] ?? currentLanguage;

  const navigate = useNavigate();
  const { assetType } = useAssetType();
  const isStock = assetType === 'stocks';
  // 控制菜单弹出关闭逻辑
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    // 如果菜单已经打开，再次点击则关闭
    open ? setAnchorEl(null) : setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // 初始化当前选中的数据源
  const [currentDataSource, setCurrentDataSource] = useState<ExchangeType>(defaultDataSource);
  useEffect(() => {
    getDataSource().then(setCurrentDataSource);
  }, []);

  // 打开数据源对话框
  const handleDataSource = () => {
    // 携带参数
    navigate('/data-source', { state: { dataSource: currentDataSource } });
    handleClose(); // 关闭主菜单
  };

  // 导出币种功能
  // const [showExportLoading, setShowExportLoading] = useState(false);
  // const handleExport = async () => {
  //   setShowExportLoading(true);
  //   handleClose(); // 关闭主菜单
  //   try {
  //     await exportCryptoData();
  //   } catch (error) {
  //     console.error('[MenuCenter] 导出失败:', error);
  //   } finally {
  //     setShowExportLoading(false);
  //   }
  // };

  return (
    <>
      <div className="cursor-pointer w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200" onClick={handleOpen}>
        <Menu size={24} aria-haspopup="true" className="text-white/70 transition-colors duration-200 hover:text-white" />
      </div>

      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <ActionMenuItem disabled={isStock} onClick={handleDataSource}>
          {t('dataSource', { dataSource: t(`exchange.${currentDataSource}`) })}
        </ActionMenuItem>

        <ActionMenuItem
          disabled={isStock}
          onClick={() => {
            navigate('/alert-settings');
            handleClose();
          }}
        >
          {t('globalPriceMonitor')}
        </ActionMenuItem>
        <ActionMenuItem
          onClick={() => {
            navigate('/language');
            handleClose();
          }}
        >
          {t('language', { language: languageLabel })}
        </ActionMenuItem>
        {/* <ActionMenuItem onClick={handleImportClick}>Import coins</ActionMenuItem> */}
        <ActionMenuItem
          onClick={() => {
            navigate('/connect-us');
            handleClose();
          }}
        >
          {t('connectUs')}
        </ActionMenuItem>
      </ActionMenu>

      {/*导出币种 Loading 弹窗*/}
      {/* <Dialog open={showExportLoading} onClose={() => {}} closeOnBackdropClick={false}>
        <div className="p-6 flex flex-col items-center justify-center min-h-30">
          <Loading size={32} />
          <p className="mt-4 text-white/70 text-sm">{t('exportingData')}</p>
        </div>
      </Dialog> */}
    </>
  );
};
export default MenuCenter;
