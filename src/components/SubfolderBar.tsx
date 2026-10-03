import React from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  Layers, 
  Home, 
  FolderTree 
} from 'lucide-react';
import { DriveFolder } from '../types';

interface SubfolderBarProps {
  activeCategory: string;
  activeSubfolder: string | null;
  folders: DriveFolder[];
  onSelectCategory: (category: string) => void;
  onSelectSubfolder: (category: string, subfolder: string) => void;
}

export const SubfolderBar: React.FC<SubfolderBarProps> = ({
  activeCategory,
  activeSubfolder,
  folders,
  onSelectCategory,
  onSelectSubfolder
}) => {
  if (activeCategory === 'all') return null;

  const currentFolder = folders.find(f => f.name === activeCategory);
  const subfolders = currentFolder?.subfolders || [];

  return (
    <div className="mb-6 space-y-3">
      {/* 1. Industrial Breadcrumb Navigation */}
      <nav className="flex items-center text-xs font-mono text-slate-400 bg-[#0a1329] border border-[#1b2b52] px-3.5 py-2 rounded-lg gap-2">
        <button
          onClick={() => {
            onSelectCategory('all');
            onSelectSubfolder('all', 'all');
          }}
          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-blue-400" />
          <span>Início</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

        <button
          onClick={() => onSelectSubfolder(activeCategory, 'all')}
          className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer font-bold ${
            !activeSubfolder || activeSubfolder === 'all' ? 'text-blue-400' : 'text-slate-300'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>{activeCategory}</span>
        </button>

        {activeSubfolder && activeSubfolder !== 'all' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            <span className="flex items-center gap-1.5 text-blue-300 font-bold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/40">
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeSubfolder}</span>
            </span>
          </>
        )}
      </nav>

      {/* 2. Subfolder Cards (Strictly Elétrica, Mecânica, Civil) */}
      {subfolders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-blue-400" />
              Subpastas de {activeCategory}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Individual Subfolder Cards: Elétrica, Mecânica, Civil */}
            {subfolders.map((sub) => {
              const isSubActive = activeSubfolder === sub.name;
              return (
                <button
                  key={sub.id}
                  onClick={() => onSelectSubfolder(activeCategory, sub.name)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                    isSubActive
                      ? 'bg-blue-600/30 text-white border-blue-400 ring-2 ring-blue-500/50 shadow-xl'
                      : 'bg-[#0b142d] border-[#1a2b52] text-slate-200 hover:border-blue-500/70 hover:bg-[#0f1d40]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Folder className={`w-4 h-4 ${isSubActive ? 'text-blue-300' : 'text-blue-400 group-hover:scale-110 transition-transform'}`} />
                      <span className="text-xs font-mono font-bold">{sub.name}</span>
                    </div>
                    {sub.count > 0 && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isSubActive ? 'bg-blue-600 text-white' : 'bg-[#142247] text-blue-300'
                      }`}>
                        {sub.count}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] font-mono ${isSubActive ? 'text-blue-100 font-medium' : 'text-slate-400'}`}>
                    {sub.count} {sub.count === 1 ? 'documento técnico' : 'documentos técnicos'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
