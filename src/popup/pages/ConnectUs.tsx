import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import { Heart, Info } from 'lucide-react';
import SubHeader from '@/popup/components/SubHeader';
import Input from '@/components/common/input';
import toast from 'react-hot-toast';
import CopyButton from '@/components/common/copyButton';
import { TIPPING_ADDRESS, type TippingAddress } from '@/config/tippingAddress';
import { formatAddress } from '@/utils';
import { getTokenString, setTokenString } from '@/utils/local';
import { useTranslation } from 'react-i18next';

export default function ConnectUs() {
  const { t } = useTranslation('translation', { keyPrefix: 'connectUs' });
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const licenseKeyRef = useRef(licenseKey);

  useEffect(() => {
    licenseKeyRef.current = licenseKey;
  }, [licenseKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseKey(e.target.value.trim());
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const key = e.currentTarget.value.trim();
      setLicenseKey(key);
      await setTokenString(key);
      toast.success(t('license.saved'));
      navigate('/');
    }
  };

  useEffect(() => {
    getTokenString().then(token => {
      if (token) setLicenseKey(token);
    });

    return () => {
      const key = licenseKeyRef.current;
      if (key) {
        setTokenString(key);
      }
    };
  }, []);

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col font-mono">
      <SubHeader title={t('title')} />
      <div className="overflow-y-auto">
        <section className="p-4">
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20">
                <Mail size={20} className="text-purple-400" />
              </div>

              <div className="flex flex-col gap-1">
                <a href="mailto:henrychen0620@gmail.com" className="mt-1 w-fit text-[14px] font-medium text-purple-400 transition-colors hover:text-purple-300">
                  henrychen0620@gmail.com
                </a>

                <p className="text-[11px] text-white/50">{t('email.hint')}</p>
              </div>
            </div>
          </div>

          <div className=" rounded-xl border border-white/10 bg-white/3 p-3 mt-4">
            <label className="mb-2 block text-sm font-medium text-white/80">{t('license.label')}</label>
            <Input type="text" value={licenseKey} placeholder={t('license.placeholder')} onChange={handleChange} onKeyDown={handleKeyDown} className="h-11 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-sm text-white  placeholder:text-white/30" />
            <p className="mt-1 text-[11px] text-white/40">{t('license.hint')}</p>
          </div>
        </section>

        <section className="p-4">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
            <div className="flex justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Heart size={20} className="text-purple-400" />
                  <h2 className="text-sm font-mediumtext-white/80">{t('support.title')}</h2>
                </div>

                <p className="mt-3 max-w-full text-[11px] text-white/50">{t('support.desc')}</p>
              </div>
            </div>

            {/* Address Table */}
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              {/* Header */}
              <div className="bg-white/5 px-4 py-2 text-xs text-white/50">
                <span>{t('support.networkAddress')}</span>
              </div>

              {TIPPING_ADDRESS.map((item: TippingAddress) => (
                <div key={item.name} className="flex items-center justify-between gap-3 border-t border-white/10 p-2 transition hover:bg-white/3">
                  {/* 图标 + 名称 + 地址（竖排） */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/40">
                      <img src={item.icon} alt={item.name} className="h-6 w-6 object-contain" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium" style={{ color: item.color }}>
                        {item.name}
                      </span>
                      <span className="truncate text-xs text-white/50 font-mono">{formatAddress(item.address)}</span>
                    </div>
                  </div>
                  <CopyButton text={item.address} />
                </div>
              ))}
            </div>

            {/* Notice */}
            <div className="mt-4 flex gap-3 rounded-xl border border-blue-400/20 bg-blue-400/5 p-3">
              <Info size={16} className="text-blue-400 shrink-0" />
              <p className="text-[10px] leading-relaxed text-white/50">
                {t('support.usdtNotice')} <span className="text-green-400 font-medium">USDT</span>.
                <br />
                {t('support.networkNotice')}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
