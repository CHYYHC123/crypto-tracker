import MenuCenter from '@/popup/components/MenuCenter';
import NetworkState from '@/content/components/networkState';

import { useDataStatus } from '@/hooks/useDataStatus';

interface HeaderProps {
  // status:
}
export const Header: React.FC<HeaderProps> = () => {
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
      <div className="mt-1">
        <MenuCenter />
      </div>
    </div>
  );
};
