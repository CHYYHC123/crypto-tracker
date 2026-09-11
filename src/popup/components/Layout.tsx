import { type FC } from 'react';
import { Outlet } from 'react-router-dom';
import { CustomToaster } from '@/components/CustomToaster/index';

export const Layout: FC = () => {
  return (
    <div className="w-[360px] h-[480px] overflow-hidden relative">
      <CustomToaster />
      <Outlet />
    </div>
  );
};
