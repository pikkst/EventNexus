import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, showBackButton = true }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Back Button */}
      {showBackButton && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>
      )}

      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          to="/"
          className="flex items-center text-slate-400 hover:text-white transition-colors"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              {item.path && !isLast ? (
                <Link
                  to={item.path}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-white font-medium' : 'text-slate-400'}>
                  {item.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};

export default Breadcrumbs;
