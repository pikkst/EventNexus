import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 animate-pulse">
    <div className="h-6 bg-slate-800 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-slate-800 rounded w-2/3"></div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-950 p-4 md:p-8">
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-12 bg-slate-900 rounded-xl w-1/3"></div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="h-8 bg-slate-800 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-slate-800 rounded w-2/3"></div>
          </div>
        ))}
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-950 p-4 md:p-8 animate-pulse">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-10 bg-slate-900 rounded-xl w-1/2"></div>
      <div className="h-6 bg-slate-900 rounded-xl w-3/4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-slate-900 rounded w-full"></div>
        <div className="h-4 bg-slate-900 rounded w-full"></div>
        <div className="h-4 bg-slate-900 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);
