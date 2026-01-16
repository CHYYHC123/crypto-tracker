import { motion, AnimatePresence } from 'framer-motion';
import MenuCenter from '@/popup/components/MenuCenter';
import NetworkState from '@/content/components/networkState';

import { useDataStatus } from '@/hooks/useDataStatus';
import { ListChecks, X } from 'lucide-react';

interface HeaderProps {
  showCheckboxes?: boolean;
  onToggleCheckboxes?: () => void;
}
export const Header: React.FC<HeaderProps> = ({ showCheckboxes, onToggleCheckboxes }) => {
  // 网络状态
  const status = useDataStatus();
  return (
    <div className="flex justify-between flex-shrink-0">
      <div>
        <h2 className="m-0 text-base font-semibold">Crypto Tracker</h2>
        <div className="mt-1">
          <NetworkState status={status} />
        </div>
      </div>
      <div className="flex items-center justify-center h-6">
        <motion.div onClick={onToggleCheckboxes} className="flex items-center mr-3 cursor-pointer group" whileHover={{ scale: 1.05 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
          <div className="relative w-4 h-4 flex items-center justify-center flex-shrink-0">
            <AnimatePresence mode="wait">
              {showCheckboxes ? (
                <motion.div key="cancel" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }} className="absolute inset-0 flex items-center justify-center">
                  <X size={16} className="text-white transition-colors duration-200 group-hover:text-white" />
                </motion.div>
              ) : (
                <motion.div key="select" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }} className="absolute inset-0 flex items-center justify-center">
                  <ListChecks size={16} className="text-white/70 transition-colors duration-200 group-hover:text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative min-w-[40px] ml-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={showCheckboxes ? 'cancel-text' : 'select-text'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className={`text-ms transition-colors duration-200 group-hover:text-white ${showCheckboxes ? 'text-white' : 'text-white/70'}`}
              >
                {showCheckboxes ? 'Cancel' : 'Select'}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>
        <MenuCenter />
      </div>
    </div>
  );
};
