import { ReactNode, useRef, useState } from 'react';
import { motion, PanInfo } from 'framer-motion';

interface DraggableWidgetProps {
  disabled: boolean;  // 禁用拖拽
  children: ReactNode;
}

export default function DraggableWidget({ disabled, children }: DraggableWidgetProps) {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 设置拖拽位置 - 自动吸附到边缘
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

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    snapToEdge(info.point.x, info.point.y);
  };

  return (
    <motion.div
      ref={widgetRef}
      drag={!disabled}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 right-4 z-99999999"
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, willChange: 'transform' }}
      translate="no"
      data-notranslate="true"
    >
      {children}
    </motion.div>
  );
}
