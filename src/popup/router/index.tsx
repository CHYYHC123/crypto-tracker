import { createHashRouter } from 'react-router-dom';
import { Layout } from '@/popup/components/Layout';
import PopupHome from '@/popup/pages/PopupHome';

export const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <PopupHome />
      },
      {
        path: '/alert-settings',
        lazy: () => import('@/popup/pages/AlertSettings').then(m => ({ Component: m.default }))
      },
      {
        path: '/connect-us',
        lazy: () => import('@/popup/pages/ConnectUs').then(m => ({ Component: m.default }))
      }
    ]
  }
]);
