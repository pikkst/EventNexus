
import React from 'react';

interface PlatformSelectorProps {
  selected: string;
  onSelect: (platform: string) => void;
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'FB' },
  { id: 'instagram', name: 'Instagram', icon: 'IG' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'IN' },
  { id: 'tiktok', name: 'TikTok', icon: 'TT' },
  { id: 'youtube', name: 'YouTube', icon: 'YT' },
];

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-5 gap-3 mt-4">
      {PLATFORMS.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
            selected === p.id
              ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
};

export default PlatformSelector;
