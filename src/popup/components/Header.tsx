import MenuCenter from '@/popup/components/MenuCenter';
import NetworkState from '@/content/components/networkState';

import { useDataStatus } from '@/hooks/useDataStatus';
import { ListChecks } from 'lucide-react';

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
        <div onClick={onToggleCheckboxes} className={`flex items-center mr-2 cursor-pointer transition-all duration-300 ${showCheckboxes ? 'text-white' : 'text-white/70 hover:text-white'}`}>
          <ListChecks size={16} className="" />
          <span className="ml-1">Select</span>
        </div>
        <MenuCenter />
      </div>
    </div>
  );
};
