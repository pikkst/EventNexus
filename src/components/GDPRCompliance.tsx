
import React from 'react';
import { Shield, Eye, Download, Trash2, Edit3, Lock } from 'lucide-react';

const GDPRCompliance: React.FC = () => {
  const rights = [
    { icon: <Eye />, title: 'Right to Access', desc: 'You can request a full copy of all personal data we store about you.' },
    { icon: <Edit3 />, title: 'Right to Rectification', desc: 'Easily update your profile and event data at any time via settings.' },
    { icon: <Download />, title: 'Data Portability', desc: 'Download your ticket history and activity in machine-readable JSON format.' },
    { icon: <Trash2 />, title: 'Right to Erasure', desc: 'Request total deletion of your account and all associated personal records.' },
    { icon: <Lock />, title: 'Restriction of Processing', desc: 'Limit how your data is used for marketing or analytics purposes.' }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-24 space-y-16 animate-in fade-in duration-700">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-white">GDPR <span className="text-emerald-500">Compliance</span></h1>
        <p className="text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          EventNexus is fully committed to the General Data Protection Regulation (GDPR). We believe in total transparency and empower our users with full control over their digital footprint.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rights.map((right, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] hover:border-emerald-500/30 transition-all group">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:text-emerald-500 transition-colors">
              {React.cloneElement(right.icon as React.ReactElement, { className: 'w-6 h-6' })}
            </div>
            <h3 className="font-bold text-white mb-2">{right.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">{right.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="space-y-4 text-center md:text-left">
          <h2 className="text-2xl font-black text-white">Exercise Your Rights</h2>
          <p className="text-slate-400 text-sm max-w-md font-medium">To submit a Data Subject Access Request (DSAR) or request account erasure, please contact our Data Protection Officer.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
          Contact DPO
        </button>
      </div>
    </div>
  );
};

export default GDPRCompliance;
