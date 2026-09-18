import { cn } from '@/lib/utils';

type ActionMenuItemProps = {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
};

function ActionMenuItem({ children, onClick, danger, disabled }: ActionMenuItemProps) {
  return (
    <div role="menuitem" onClick={() => !disabled && onClick?.()} className={cn('px-3 py-2 text-xs select-none rounded-lg mb-1 transition-all duration-200 text-foreground', disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover', danger && 'text-danger')}>
      {children}
    </div>
  );
}

export default ActionMenuItem;
