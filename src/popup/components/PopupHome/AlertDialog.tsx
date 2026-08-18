import React from 'react';
import { X, Power, PowerOff } from 'lucide-react';

import ConfirmDialog from '@/components/common/confirm-dialog';
import Tooltip from '@/components/common/tooltip';
import PriceAlertInput from '@/popup/components/PriceAlter';

import type { AssetItem } from '@/types/asset';

import { useAlertForm } from '@/popup/hooks/useAlertForm';

interface AlertDialogProps {
  open: boolean;
  token: AssetItem | null;
  onClose: () => void;
}
// 价格预警弹窗组件
const AlertDialog: React.FC<AlertDialogProps> = ({ open, token, onClose }) => {
  
  const { price, setPrice, direction, setDirection, enabled, setEnabled, handleSave } = useAlertForm(open, token, onClose);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleSave}
      type="custom"
      header={
        <>
          <div className="p-3 border-b border-gray-600">
            <div className="flex justify-between gap-2">
              <h3 className="text-white/90 font-semibold text-base flex items-center">
                <span>Set alert for {token?.symbol}</span>

                <Tooltip content={enabled ? 'Price alert enabled' : 'Price alert disabled'} side="bottom">
                  {enabled ? <Power size={16} onClick={() => setEnabled(false)} className="ml-4 cursor-pointer text-green-500" /> : <PowerOff size={16} onClick={() => setEnabled(true)} className="ml-4 cursor-pointer text-red-500" />}
                </Tooltip>
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/70 font-normal text-xs">Current: {token?.price}</p>
          </div>
        </>
      }
      description={<PriceAlertInput price={price} direction={direction} onPriceChange={setPrice} onDirectionChange={setDirection} />}
      confirmText="Save"
      cancelText="Cancel"
    />
  );
};

export default AlertDialog;
