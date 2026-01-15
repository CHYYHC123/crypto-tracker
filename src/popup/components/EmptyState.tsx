// 空状态组件
export const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[150px] text-white/40">
      <div className="text-sm">No tokens yet</div>
      <div className="text-xs mt-1 opacity-60">Add a token to get started</div>
    </div>
  );
};

