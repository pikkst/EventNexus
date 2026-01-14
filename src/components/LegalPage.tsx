
import React from 'react';

interface LegalSection {
  title: string;
  content: string | React.ReactNode;
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const LegalPage: React.FC<LegalPageProps> = ({ title, lastUpdated, sections }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 space-y-12 animate-in fade-in duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black tracking-tighter text-white">{title}</h1>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Last Updated: {lastUpdated}</p>
      </div>

      <div className="space-y-12">
        {sections.map((section, i) => (
          <div key={i} className="space-y-4">
            <h2 className="text-2xl font-bold text-indigo-400">{section.title}</h2>
            <div className="text-slate-400 leading-relaxed font-medium space-y-4">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LegalPage;
