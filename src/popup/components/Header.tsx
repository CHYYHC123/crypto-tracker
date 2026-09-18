// import { motion, AnimatePresence } from 'framer-motion';
import MenuCenter from '@/popup/components/MenuCenter';
import NetworkState from '@/content/components/networkState';

import { useDataStatus } from '@/hooks/useDataStatus';
import AssetClasses from '@/popup/components/AssetClasses';

interface HeaderProps {}
export const Header: React.FC<HeaderProps> = () => {
  // 网络状态
  const status = useDataStatus();
  return (
    <div className="flex justify-between shrink-0">
      <div>
        <h1 className="m-0 text-[18px] font-extrabold tracking-tight text-foreground flex items-center gap-1">Crypto Tracker</h1>
        <div className="mt-1">
          <NetworkState status={status} />
        </div>
      </div>
      <div className="flex items-center justify-center h-6 gap-2">
        <AssetClasses />
        <MenuCenter />
      </div>
    </div>
  );
};
