import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { formatNumberWithCommas } from '@/utils/index';

export default function FloatingCryptoWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tokens, setTokens] = useState<any>([]);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // 监听 background.js 发来的消息
    function handleMessage(msg: any) {
      if (msg.type === 'UPDATE_PRICE' && msg.data) setTokens(msg.data); // 更新 state，触发渲染
    }
    chrome.runtime.onMessage.addListener(handleMessage);
    // 卸载组件时移除监听
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const mackData = () => {
    const fake: any = [
      { id: 'btc', symbol: 'BTC', price: '$64,200', change: '1.25', icon: 'B' },
      { id: 'eth', symbol: 'ETH', price: '$3,200', change: '-0.85', icon: 'E' }
    ];
    setTokens(fake);
  };

  const snapToEdge = (x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const widgetWidth = widgetRef.current?.offsetWidth || 300;
    const widgetHeight = widgetRef.current?.offsetHeight || 200;
    const margin = 16;

    const newY = Math.min(Math.max(y, margin), vh - widgetHeight - margin);

    if (x < vw / 2) {
      setPosition({ x: -vw / 2 + margin, y: newY - vh + widgetHeight });
    } else {
      setPosition({
        x: vw / 2 - widgetWidth - margin,
        y: newY - vh + widgetHeight
      });
    }
  };

  const handleDragEnd = (event: Event, info: any) => {
    snapToEdge(info.point.x, info.point.y);
  };

  // 手动刷新
  const refreshData = () => {
    chrome.runtime.sendMessage({ type: 'REFRESH', payload: { falg: true } }, response => {
      console.log('手动刷新完成！', response);
      if (response.success) {
        toast.success(response?.msg, {
          duration: 2000,
          style: {
            // background: '#1f1f1f', // 暗黑背景
            //   color: '#ffffff', // 字体颜色
            // fontSize: '12px' // 字体大小
            //   padding: '6px', // 内边距
            //   display: 'flex', // 保证图标和文字垂直居中
            //   alignItems: 'center'
          }
        });
      } else {
        toast.error(response?.msg, {
          duration: 2000
          // style: {
          //   background: '#1f1f1f', // 暗黑背景
          //   color: '#ffffff', // 字体颜色
          //   fontSize: '12px', // 字体大小
          //   padding: '6px', // 内边距
          //   display: 'flex', // 保证图标和文字垂直居中
          //   alignItems: 'center'
          // }
        });
      }
    });
  };

  return (
    <>
      <motion.div ref={widgetRef} drag dragMomentum={false} onDragEnd={handleDragEnd} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="fixed bottom-4 right-4 z-99999999" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <motion.div layout className="w-60 max-h-[50vh] overflow-y-auto bg-gray-900 text-white rounded-2xl shadow-2xl backdrop-blur-lg border border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="flex justify-between items-center p-3 cursor-move sticky top-0 bg-gray-900 backdrop-blur-lg z-10">
            <h2 className="text-sm font-semibold text-sans">Crypto Prices</h2>
            <div className="flex gap-2 items-center">
              <button onClick={() => setCollapsed(!collapsed)} className="text-xs px-2 py-2 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer">
                {collapsed ? '+' : '–'}
              </button>
            </div>
          </div>
          <Toaster position="top-right"  />

          <AnimatePresence>
            {!collapsed && (
              <motion.div key="content" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="p-3 space-y-2">
                {tokens.map((coin: any) => (
                  <motion.div key={coin.symbol} whileHover={{ scale: 1.02 }} className="flex justify-between items-center bg-white/5 hover:bg-white/10 p-2 rounded-lg cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-lg font-semibold">{coin.icon}</div>
                      <div>
                        <div className="text-xs font-medium">{coin.symbol}</div>
                        <div className="text-[10px] opacity-60">{coin.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold">{formatNumberWithCommas(coin.price)}</div>
                      <div className={`text-[10px] ${coin.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.change >= 0 ? '+' + coin.change + '%' : coin.change + '%'}</div>
                    </div>
                  </motion.div>
                ))}

                <div className="p-2 border-t border-white/5 flex justify-between items-center text-[10px] opacity-70">
                  <div>Real-time prices</div>
                  <button onClick={refreshData} className="px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 transition cursor-pointer">
                    Refresh
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}
