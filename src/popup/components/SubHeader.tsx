import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type SubHeaderProps = {
  title: string;
};

const SubHeader = ({ title }: SubHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="p-3 border-b border-border flex items-center gap-2">
      <button onClick={() => navigate(-1)} className="p-1 transition-colors cursor-pointer font-semibold ">
        <ArrowLeft size={20} className="hover:opacity-80" />
      </button>
      {title ? <h3 className="text-[14px] font-semibold text-foreground-bold">{title}</h3> : null}
    </div>
  );
};

export default SubHeader;
