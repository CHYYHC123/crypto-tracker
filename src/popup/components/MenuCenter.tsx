import { useState, useEffect } from 'react';

import { Menu, AlertTriangle, Info, X } from 'lucide-react';
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';

import Dialog from '@/components/common/dialog';
import Loading from '@/components/common/loading';
import ConfirmDialog from '@/components/common/confirm-dialog';
import Tooltip from '@/components/common/tooltip';
import DataSource from './DataSource';
import ImportCoins from './ImportCoins';

import { ExchangeListMap, type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { exportCryptoData } from '../utils/exportData';
import { selectAndImportFile } from '../utils/importData';

const MenuCenter = () => {
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
    const initDataSource = async () => {
      const { data_source } = await chrome.storage.local.get('data_source');
      if (typeof data_source === 'string' && ExchangeListMap[data_source as ExchangeType]) {
        setCurrentDataSource(data_source as ExchangeType);
      } else {
        setCurrentDataSource(defaultDataSource);
      }
    };
    initDataSource();
  }, []);

  // 打开数据源对话框
  const [showDialog, setShowDialog] = useState(false);
  const handleDataSource = () => {
    setShowDialog(true);
    handleClose(); // 关闭主菜单
  };

  // 导出币种功能
  const [showExportLoading, setShowExportLoading] = useState(false);
  const handleExport = async () => {
    setShowExportLoading(true);
    handleClose(); // 关闭主菜单
    try {
      await exportCryptoData();
    } catch (error) {
      console.error('[MenuCenter] 导出失败:', error);
    } finally {
      setShowExportLoading(false);
    }
  };

  // 导入币种功能
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showImportLoading, setShowImportLoading] = useState(false);
  const handleImportClick = () => {
    setShowImportConfirm(true);
    handleClose(); // 关闭主菜单
  };
  const handleImportConfirm = async () => {
    setShowImportConfirm(false);
    setShowImportLoading(true);
    try {
      await selectAndImportFile();
    } catch (error) {
      // 错误已在 importData.ts 中通过 toast 显示，这里只记录日志
      if (error instanceof Error && error.message !== 'File selection cancelled') {
        console.error('[MenuCenter] 导入失败:', error);
      }
    } finally {
      setShowImportLoading(false);
    }
  };

  return (
    <>
      <div className="cursor-pointer w-[24px] h-[24px] flex items-center justify-center rounded-md transition-all duration-200 hover:scale-110" onClick={handleOpen}>
        <Menu size={24} aria-haspopup="true" className="text-white/70 transition-colors duration-200 hover:text-white" />
      </div>

      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <ActionMenuItem onClick={handleDataSource}>Data source（{currentDataSource}）</ActionMenuItem>
        <ActionMenuItem onClick={handleExport}>Export coins</ActionMenuItem>
        <ActionMenuItem onClick={handleImportClick}>Import coins</ActionMenuItem>
      </ActionMenu>

      {/* 数据源选择对话框 */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DataSource
          currentSource={currentDataSource}
          onClose={() => setShowDialog(false)}
          onSelect={source => {
            setCurrentDataSource(source);
          }}
        />
      </Dialog>

      {/*导出币种 Loading 弹窗*/}
      <Dialog open={showExportLoading} onClose={() => {}} closeOnBackdropClick={false}>
        <div className="p-6 flex flex-col items-center justify-center min-h-[120px]">
          <Loading size={32} />
          <p className="mt-4 text-white/70 text-sm">Exporting data...</p>
        </div>
      </Dialog>

      {/*导入币种确认对话框*/}
      <ConfirmDialog
        open={showImportConfirm}
        onClose={() => setShowImportConfirm(false)}
        onConfirm={handleImportConfirm}
        header={
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
              <h3 className="text-white font-semibold text-base">Import Coins</h3>
              <Tooltip sideOffset={1} content="Imported alerts replace existing ones for the same token.">
                <Info className="w-4 h-4 text-white/50 hover:text-white/70 transition-colors cursor-pointer" />
              </Tooltip>
            </div>
            <button onClick={() => setShowImportConfirm(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        }
        description={<ImportCoins />}
        confirmText="Select File"
        cancelText="Cancel"
        type="info"
      />

      {/*导入币种 Loading 弹窗*/}
      <Dialog open={showImportLoading} onClose={() => {}} closeOnBackdropClick={false}>
        <div className="p-6 flex flex-col items-center justify-center min-h-[120px]">
          <Loading size={32} />
          <p className="mt-4 text-white/70 text-sm">Importing data...</p>
        </div>
      </Dialog>
    </>
  );
};
export default MenuCenter;
