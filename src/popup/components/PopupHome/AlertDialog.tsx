import React from 'react';
import { useState, useEffect } from 'react';
import { X, Power, PowerOff } from 'lucide-react';

import toast from 'react-hot-toast';

import ConfirmDialog from '@/components/common/confirm-dialog';
import Tooltip from '@/components/common/tooltip';
import PriceAlertInput from '@/popup/components/PriceAlter';

import type { TokenItem, PriceAlert } from '@/types';
import type { Direction } from '@/popup/components/PriceAlter';

interface AlertDialogProps {
  open: boolean;
  token: TokenItem | null;
  onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ open, token, onClose }) => {
  const [price, setPrice] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [direction, setDirection] = useState<Direction>('above');
  useEffect(() => {
    if (!open || !token) return;
    const loadAlert = async () => {
      const result = await chrome.storage.local.get(['price_alerts']);
      const alerts = (result.price_alerts as PriceAlert[]) ?? [];
      const current = alerts.find(item => item.symbol.toUpperCase() === token.symbol.toUpperCase());
      if (current) {
        setPrice(current.targetPrice);
        setDirection(current.direction);
        setEnabled(current.enabled);
      } else {
        setPrice(token.price ?? 0);
        setDirection('above');
        setEnabled(true);
      }
    };
    loadAlert();
  }, [open, token]);

  // 点击保存按钮
  const handleSave = async () => {
    if (!token) return;
    const newAlert: PriceAlert = {
      symbol: token.symbol,
      targetPrice: price,
      direction,
      enabled,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    try {
      const result = await chrome.storage.local.get(['price_alerts']);
      const oldAlerts = (result.price_alerts as PriceAlert[]) ?? [];
      const index = oldAlerts.findIndex(item => item.symbol.toUpperCase() === token.symbol.toUpperCase());
      let updatedAlerts: PriceAlert[];
      if (index > -1) {
        updatedAlerts = [...oldAlerts];
        updatedAlerts[index] = {
          ...oldAlerts[index],
          targetPrice: price,
          direction,
          enabled,
          updatedAt: Date.now()
        };
      } else {
        updatedAlerts = [...oldAlerts, newAlert];
      }
      await chrome.storage.local.set({
        price_alerts: updatedAlerts
      });
      toast.success(`Price alert set for ${token.symbol}`);
      onClose();
    } catch (error) {
      toast.error('Failed to save price alert');
    }
  };

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
