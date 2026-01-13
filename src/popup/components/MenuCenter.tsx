import { useState } from 'react';

import { Menu } from 'lucide-react';
import ActionMenu from '@/components/common/ActionMenu';
import ActionMenuItem from '@/components/common/ActionMenuItem';

import Dialog from '@/components/common/dialog';
import DataSource from './DataSource';

import { defaultDataSource } from '@/config/exchangeConfig';

const MenuCenter = () => {
  /**
   * 控制菜单逻辑
   */
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    // 如果菜单已经打开，再次点击则关闭
    open ? setAnchorEl(null) : setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const [currentDataSource, setCurrentDataSource] = useState(defaultDataSource);

  // 打开数据源对话框
  const [showDialog, setShowDialog] = useState(false);
  const handleDataSource = () => {
    setShowDialog(true);
    handleClose(); // 关闭主菜单
  };

  return (
    <>
      <div className="cursor-pointer w-[24px] h-[24px] flex items-center justify-center rounded-md transition-all duration-200 hover:scale-110" onClick={handleOpen}>
        <Menu size={24} aria-haspopup="true" className="text-white/70 transition-colors duration-200 hover:text-white" />
      </div>

      <ActionMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <ActionMenuItem onClick={handleDataSource}>Data source（{currentDataSource}）</ActionMenuItem>
      </ActionMenu>

      {/* 数据源选择对话框 */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DataSource
          onClose={() => setShowDialog(false)}
          onSelect={source => {
            // 数据源切换逻辑已在 DataSource 内部处理
            console.log('Data source selected:', source);
            setCurrentDataSource(source);
          }}
        />
      </Dialog>
    </>
  );
};
export default MenuCenter;
