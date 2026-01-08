import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: 'Real-time crypto price tracker with floating widget.',
  icons: {
    48: 'public/logo.png'
  },
  background: {
    service_worker: 'src/background/index.js',
    type: 'module'
  },
  action: {
    default_icon: {
      48: 'public/logo.png'
    },
    default_title: 'Crypto Tracker',
    default_popup: 'src/popup/index.html'
  },
  permissions: ['storage', 'activeTab', 'scripting', 'idle'],
  content_scripts: [
    {
      js: ['src/content/main.tsx'],
      matches: ['https://*/*', 'http://*/*'],
      run_at: 'document_idle' // 脚本何时执行
    }
  ],
  host_permissions: ['https://www.okx.com/*', 'https://ipapi.co/*']
  // side_panel: {
  //   // default_path: 'src/sidepanel/index.html'
  // }
});
