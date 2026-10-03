import React from 'react';
import { 
  Folder, 
  FolderOpen, 
  Settings, 
  RefreshCw, 
  FolderGit2, 
  Cpu, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { DriveFolder } from '../types';

interface SidebarProps {
  folders: DriveFolder[];
  activeCategory: string;
  activeSubfolder: string | null;
  onSelectCategory: (category: string) => void;
  onSelectSubfolder: (category: string, subfolder: string) => void;
  onOpenAdmin: () => void;
  isLoading: boolean;
  expandedFolders: Record<string, boolean>;
  onToggleExpand: (folderName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  activeCategory,
  activeSubfolder,
  onSelectCategory,
  onSelectSubfolder,
  onOpenAdmin,
  isLoading,
  expandedFolders,
  onToggleExpand
}) => {
  return (
    <aside className="w-80 bg-[#070e20] border-r border-[#1a2850] flex flex-col h-[calc(100vh-5rem)] sticky top-20 flex-shrink-0 select-none shadow-2xl">
      
      {/* Dynamic Google Drive Folders Header - Starts directly with official repository folders */}
      <div className="px-4 py-3 flex items-center justify-between bg-[#091228] border-b border-[#18254b]">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-mono uppercase font-bold tracking-wider text-slate-300">
            Pastas do Google Drive
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-500/30">
          {folders.length}
        </span>
      </div>

      {/* Dynamic Google Drive Folders List with Tree Expansion for Subfolders */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-blue-900">
        {isLoading && folders.length === 0 ? (
          <div className="p-4 text-center">
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Lendo estrutura do Drive...</p>
          </div>
        ) : (
          folders.map((folder) => {
            const isSelected = activeCategory === folder.name;
            const isExpanded = expandedFolders[folder.name] ?? isSelected;
            const subfolders = folder.subfolders || [];
            const hasSub = subfolders.length > 0;

            return (
              <div key={folder.id} className="space-y-0.5">
                {/* Main Folder Item */}
                <div
                  onClick={() => {
                    onSelectCategory(folder.name);
                    onToggleExpand(folder.name);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left group cursor-pointer ${
                    isSelected
                      ? 'bg-[#12234e] text-white border border-[#2b51a1] shadow-lg shadow-blue-950/40'
                      : 'text-slate-300 hover:bg-[#0e1a38] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0 mr-1.5">
                    {/* Expand/Collapse Chevron indicator */}
                    {hasSub ? (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpand(folder.name);
                        }}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                        )}
                      </span>
                    ) : (
                      <span className="w-3.5" />
                    )}

                    {/* Folder Icon */}
                    {isSelected || isExpanded ? (
                      <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <Folder className="w-4 h-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                    )}

                    {/* Folder Name */}
                    <span className="truncate tracking-tight font-mono text-[11px] font-semibold">
                      {folder.name}
                    </span>
                  </div>

                  {/* Count Badge */}
                  {folder.count > 0 && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shadow-sm ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-[#142044] text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {folder.count}
                    </span>
                  )}
                </div>

                {/* Subfolders list: strictly Elétrica, Mecânica, Civil */}
                {isExpanded && hasSub && (
                  <div className="ml-4 pl-3.5 border-l-2 border-blue-500/40 py-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {subfolders.map((sub) => {
                      const isSubSelected = isSelected && activeSubfolder === sub.name;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => onSelectSubfolder(folder.name, sub.name)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono transition-all text-left cursor-pointer group/sub ${
                            isSubSelected
                              ? 'bg-blue-600 text-white font-bold shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-[#0f1d40]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate mr-1.5">
                            <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isSubSelected ? 'text-white' : 'text-blue-400 group-hover/sub:text-blue-300'
                            }`} />
                            <span className="truncate">
                              {sub.name}
                            </span>
                          </div>

                          {sub.count > 0 && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                              isSubSelected
                                ? 'bg-blue-800 text-white'
                                : 'bg-[#15244c] text-blue-300'
                            }`}>
                              {sub.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-[#18254b] bg-[#050a18]">
        <button
          onClick={onOpenAdmin}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#0e1a38] hover:bg-[#14234c] border border-blue-900/40 text-xs text-slate-300 transition-colors mb-2 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-200">Painel Administrativo</span>
          </div>
          <Cpu className="w-3 h-3 text-slate-500" />
        </button>

        <div className="text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between font-mono">
            <span>Fonte de Arquivos:</span>
            <span className="text-emerald-400 font-semibold">Google Drive API</span>
          </div>
          <p className="text-[9px] text-slate-500 leading-tight">
            Navegação por pastas e subpastas técnicas (Elétrica, Mecânica, Civil).
          </p>
        </div>
      </div>

    </aside>
  );
};
