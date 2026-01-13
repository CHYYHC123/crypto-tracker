import { useState, useEffect } from 'react';

import { Menu } from 'lucide-react';
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';

import Dialog from '@/components/common/dialog';
import Loading from '@/components/common/loading';
import DataSource from './DataSource';

import { ExchangeListMap, type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { exportCryptoData } from '../utils/exportData';

/**
 * 需求：
 * 1、实现导入需求：点击 <ActionMenuItem>导入币种</ActionMenuItem>导入,弹出一个 
 */
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

  return (
    <>
      <div className="cursor-pointer w-[24px] h-[24px] flex items-center justify-center rounded-md transition-all duration-200 hover:scale-110" onClick={handleOpen}>
        <Menu size={24} aria-haspopup="true" className="text-white/70 transition-colors duration-200 hover:text-white" />
      </div>

      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <ActionMenuItem onClick={handleDataSource}>Data source（{currentDataSource}）</ActionMenuItem>
        <ActionMenuItem onClick={handleExport}>Export coins</ActionMenuItem>
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
    </>
  );
};
export default MenuCenter;
