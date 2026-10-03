import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  FolderSync, 
  Shield, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  HardDrive, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { UserProfile, UserRole, DriveConnectionStatus } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onAiInterpret: () => void;
  isAiLoading: boolean;
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenAdvancedSearch: () => void;
  onOpenAdmin: () => void;
  onChangeRole: (newRole: UserRole) => void;
  connectionStatus: DriveConnectionStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onAiInterpret,
  isAiLoading,
  user,
  onLogin,
  onLogout,
  onOpenAdvancedSearch,
  onOpenAdmin,
  onChangeRole,
  connectionStatus
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-[#0b1329] border-b border-[#1e2e5c] sticky top-0 z-40 shadow-xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Industrial Title */}
          <div className="flex items-center gap-3.5 flex-shrink-0 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center border border-blue-400/30">
              <div className="w-full h-full bg-[#0a1228] rounded-[6px] flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-white font-mono uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-blue-200">
                  CONSULTA TÉCNICA
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-500/30 font-semibold">
                  v3.8 Drive
                </span>
              </div>
              <p className="text-[11px] font-medium tracking-widest text-slate-400 uppercase font-sans">
                Documentos e Desenhos Industriais
              </p>
            </div>
          </div>

          {/* Central Search Bar */}
          <div className="flex-1 max-w-2xl mx-2">
            <form onSubmit={onSearchSubmit} className="relative group">
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Pesquisar por nome, código, equipamento, categoria, TAG..."
                  className="w-full pl-10 pr-24 py-2.5 bg-[#0f1b3b]/90 border border-[#233873] rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
                />

                <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                  {/* AI Natural Language Interpretation Button */}
                  <button
                    type="button"
                    onClick={onAiInterpret}
                    disabled={isAiLoading || !searchQuery.trim()}
                    title="Interpretar consulta técnica com Google Gemini AI"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-blue-100 border border-blue-400/40 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isAiLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline font-mono">IA</span>
                  </button>

                  {/* Filter toggle */}
                  <button
                    type="button"
                    onClick={onOpenAdvancedSearch}
                    title="Filtros avançados"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a2c5a] rounded transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Actions: Google Drive Status & User Profile */}
          <div className="flex items-center gap-3">
            {/* Drive Connection Status Pill */}
            <div 
              onClick={onOpenAdmin}
              title={connectionStatus?.message || "Google Drive Conectado"}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0e1a38] border border-blue-500/30 text-xs text-slate-300 cursor-pointer hover:border-blue-400 transition-all shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] text-emerald-400 font-semibold tracking-wide">
                Google Drive
              </span>
              <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5">
                {connectionStatus?.rootFolderName || 'CONSULTA TÉCNICA'}
              </span>
            </div>

            {/* User Profile / Login */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-lg bg-[#0e1a38] border border-[#20346a] hover:border-blue-500 text-slate-200 transition-all"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      className="w-7 h-7 rounded-full border border-blue-400/50"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white font-mono">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[130px]">
                      {user.displayName}
                    </p>
                    <span className="text-[10px] font-mono text-blue-400 font-medium">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#0a1226] border border-[#233873] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-[#1b2b52]">
                      <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Perfil:</span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-bold border border-blue-500/40">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Role switcher for testing & admin simulation */}
                    <div className="px-4 py-2 border-b border-[#1b2b52]">
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                        Alternar Permissão:
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {(['Administrador', 'Supervisor', 'Usuário'] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              onChangeRole(r);
                              setShowUserMenu(false);
                            }}
                            className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${
                              user.role === r 
                                ? 'bg-blue-600 text-white font-semibold' 
                                : 'bg-[#132247] text-slate-300 hover:bg-[#1a2d5e]'
                            }`}
                          >
                            {r.slice(0, 5)}.
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onOpenAdmin();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-[#152349] flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Painel de Administração
                    </button>

                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 border-t border-[#1b2b52] mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Desconectar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
