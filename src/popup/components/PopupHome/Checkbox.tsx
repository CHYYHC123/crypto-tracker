import { motion, AnimatePresence } from 'framer-motion';

import Checkbox from '@/components/common/checkbox';

interface CheckBoxProps {
  visible: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// 批量选择币种的Checkbox
const CheckBox: React.FC<CheckBoxProps> = ({ visible, checked, onChange }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, width: 0, marginRight: 0 }} animate={{ opacity: 1, width: 20, marginRight: 8 }} exit={{ opacity: 0, width: 0, marginRight: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden shrink-0">
          <div className="w-5">
            <Checkbox checked={checked} onChange={e => onChange(e.target.checked)} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CheckBox;
