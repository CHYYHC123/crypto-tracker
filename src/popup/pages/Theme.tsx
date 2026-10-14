import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, MonitorCog, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import SubHeader from '@/popup/components/SubHeader';
import CustomCard from '@/popup/components/CustomCard';

import { applyTheme, type ThemeId } from '@/utils/theme';
import { getTheme, setTheme } from '@/utils/local';

interface ThemeOptionItem {
  key: ThemeId;
  icon: typeof Sun;
  titleKey: string;
  descKey: string;
}

const THEME_OPTIONS: ThemeOptionItem[] = [
  {
    key: 'ct-light',
    icon: Sun,
    titleKey: 'options.ctLight',
    descKey: 'options.ctLightDesc'
  },
  {
    key: 'ct-dark',
    icon: Moon,
    titleKey: 'options.ctDefault',
    descKey: 'options.ctDefaultDesc'
  },
  {
    key: 'ct-default',
    icon: MonitorCog,
    titleKey: 'options.ctOcean',
    descKey: 'options.ctOceanDesc'
  }
];

const Theme = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'theme' });
  const navigate = useNavigate();

  // storage 加载前不标选中，避免闪错项
  const [currentTheme, setCurrentTheme] = useState<ThemeId | null>(null);

  // 从 storage 读取已保存的主题
  useEffect(() => {
    getTheme().then(setCurrentTheme);
  }, []);

  const handleSelect = async (id: ThemeId) => {
    await setTheme(id);
    applyTheme(id, document.documentElement);
    navigate('/');
  };

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col font-mono">
      <SubHeader title={t('title')} />
      <div className="p-4 space-y-2">
        {THEME_OPTIONS.map(({ key, icon: Icon, titleKey, descKey }) => {
          const isSelected = currentTheme === key;
          return (
            <CustomCard key={key} onClick={() => handleSelect(key)} isSelected={isSelected} animate={!isSelected}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-foreground/10 shrink-0 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="text-foreground-bold font-medium text-sm">{t(titleKey)}</div>
                    <div className="text-muted text-xs mt-0.5">{t(descKey)}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
              </div>
            </CustomCard>
          );
        })}
      </div>
    </div>
  );
};

export default Theme;
