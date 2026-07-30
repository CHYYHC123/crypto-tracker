import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import SubHeader from '@/popup/components/SubHeader';
import Input from '@/components/common/input';
import toast from 'react-hot-toast';

export default function ConnectUs() {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');

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

      <section className="h-full p-4">
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
    </div>
  );
}
