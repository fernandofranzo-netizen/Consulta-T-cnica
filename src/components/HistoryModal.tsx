import React from 'react';
import { X, History as HistoryIcon, Clock, Eye, Download, Search, ExternalLink, Calendar } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistorySearch: (query: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistorySearch
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#0a1226] border border-[#1e2f5b] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0e1935] border-b border-[#1b2b52]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Histórico de Atividades
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Registro de pesquisas, visualizações e downloads de documentos
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#152349] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="p-6 overflow-y-auto space-y-3 font-mono text-xs">
          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>Nenhuma atividade registrada ainda nesta sessão.</p>
            </div>
          ) : (
            history.map((item) => {
              const date = new Date(item.timestamp);
              const formattedDate = date.toLocaleDateString('pt-BR');
              const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              return (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#0b142d] border border-[#1a2b52] hover:border-blue-500/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#0e1a38] text-blue-400 mt-0.5 border border-[#1b2f5d]">
                      {item.action === 'VIEW' && <Eye className="w-4 h-4" />}
                      {item.action === 'DOWNLOAD' && <Download className="w-4 h-4 text-emerald-400" />}
                      {item.action === 'SEARCH' && <Search className="w-4 h-4 text-purple-400" />}
                      {item.action === 'OPEN_DRIVE' && <ExternalLink className="w-4 h-4 text-cyan-400" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300">
                          {item.action === 'VIEW' ? 'VISUALIZADO' :
                           item.action === 'DOWNLOAD' ? 'DOWNLOAD' :
                           item.action === 'SEARCH' ? 'PESQUISA' : 'ABERTO NO DRIVE'}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {formattedDate} - {formattedTime}
                        </span>
                      </div>

                      <p className="font-semibold text-white mt-1 text-xs">
                        {item.fileName || item.searchQuery || item.fileCode}
                      </p>

                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Usuário: {item.userName || item.userEmail}
                      </p>
                    </div>
                  </div>

                  {item.action === 'SEARCH' && item.searchQuery && (
                    <button
                      onClick={() => {
                        onSelectHistorySearch(item.searchQuery!);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-[#101f44] hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                    >
                      Repetir
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
