import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { Heart, Info } from 'lucide-react';
import SubHeader from '@/popup/components/SubHeader';
import Input from '@/components/common/input';
import toast from 'react-hot-toast';
import CopyButton from '@/components/common/copyButton';
import { TIPPING_ADDRESS, type TippingAddress } from '@/config/tippingAddress';
import { formatAddress } from '@/utils';
// import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

export default function ConnectUs() {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');

  // const { copy, copiedText } = useCopyToClipboard();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseKey(e.target.value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setLicenseKey(e.currentTarget.value.trim());
      chrome.storage.local.set({ token_string: licenseKey }, () => {
        toast.success('License key saved successfully');
        navigate('/');
      });
    }
  };

  // 页面销毁的时候如果  licenseKey 存在就存入 storage
  useEffect(() => {
    const fetchLicenseKey = async () => {
      const { token_string } = await chrome.storage.local.get('token_string');
      if (token_string) setLicenseKey(token_string as string);
    };
    fetchLicenseKey();
  }, [licenseKey]);

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col font-mono">
      <SubHeader title="Connect Us" />
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

                <p className="text-[11px] text-white/50">If you have any questions or need help, feel free to contact us.</p>
              </div>
            </div>
          </div>

          <div className=" rounded-xl border border-white/10 bg-white/3 p-3 mt-4">
            <label className="mb-2 block text-sm font-medium text-white/80">License Key</label>
            <Input type="text" value={licenseKey} placeholder="Enter your license key" onChange={handleChange} onKeyDown={handleKeyDown} className="h-11 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-sm text-white  placeholder:text-white/30" />
            <p className="mt-1 text-[11px] text-white/40">Enter your license key to activate premium features.</p>
          </div>
        </section>

        <section className="p-4">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
            <div className="flex justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Heart size={20} className="text-purple-400" />
                  <h2 className="text-sm font-mediumtext-white/80">Support the Project</h2>
                </div>

                <p className="mt-3 max-w-full text-[11px] text-white/50">If you enjoy using Crypto Tracker, consider supporting the project. Your support helps keep the project running and growing.</p>
              </div>
            </div>

            {/* Address Table */}
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              {/* Header */}
              <div className="bg-white/5 px-4 py-2 text-xs text-white/50">
                <span>Network / Address</span>
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
                  {/* Copy */}
                  {/* <button className="shrink-0 text-white/50 hover:text-white cursor-pointer" onClick={() => navigator.clipboard.writeText(item.address)}>
                    {copiedText === item.address ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button> */}
                  <CopyButton text={item.address} />
                </div>
              ))}
            </div>

            {/* Notice */}
            <div className="mt-4 flex gap-3 rounded-xl border border-blue-400/20 bg-blue-400/5 p-3">
              <Info size={16} className="text-blue-400 shrink-0" />
              <p className="text-[10px] leading-relaxed text-white/50">
                All addresses above support <span className="text-green-400 font-medium">USDT</span>.
                <br />
                Please ensure you select the correct network when sending.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
