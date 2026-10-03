import React from 'react';
import { 
  X, 
  Search, 
  RotateCcw, 
  Filter, 
  Calendar, 
  Folder, 
  Wrench, 
  Building2, 
  Layers 
} from 'lucide-react';
import { FilterState, DriveFolder } from '../types';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onApply: () => void;
  onReset: () => void;
  folders: DriveFolder[];
  availableEquipments: string[];
  availableManufacturers: string[];
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onApply,
  onReset,
  folders,
  availableEquipments,
  availableManufacturers
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#0a1329] border border-[#1e2f5b] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0e1935] border-b border-[#1b2b52]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Pesquisa Avançada
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Filtre os documentos técnicos por atributos de engenharia
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#152349] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Form */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-sans text-xs">
          
          {/* 1. File Type / Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                Tipo de Arquivo / Formato
              </label>
              <select
                value={filters.fileFormat}
                onChange={(e) => onFilterChange({ fileFormat: e.target.value })}
                className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="all">Todos os Formatos</option>
                <option value="PDF">PDF (Documentos e Manuais)</option>
                <option value="DWG">DWG (AutoCAD / Plantas)</option>
                <option value="DXF">DXF (Desenho Vetorial)</option>
                <option value="STEP">STEP / STP (CAD 3D)</option>
                <option value="IMAGE">Imagens (JPG / PNG)</option>
                <option value="SHEET">Planilhas (XLSX / CSV)</option>
                <option value="DOC">Documentos de Texto (DOCX)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                Categoria / Área Fabril
              </label>
              <select
                value={filters.category}
                onChange={(e) => onFilterChange({ category: e.target.value })}
                className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="all">Todas as Categorias</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Equipment & Manufacturer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-blue-400" /> Equipamento
              </label>
              <input
                type="text"
                value={filters.equipment}
                onChange={(e) => onFilterChange({ equipment: e.target.value })}
                placeholder="Ex: Laminadora 01, Extrusora, Chiller..."
                className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Fabricante
              </label>
              <input
                type="text"
                value={filters.manufacturer}
                onChange={(e) => onFilterChange({ manufacturer: e.target.value })}
                placeholder="Ex: Kampf, Siemens, WEG, Atlas Copco..."
                className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 3. Revision & TAG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                Revisão
              </label>
              <input
                type="text"
                value={filters.revision}
                onChange={(e) => onFilterChange({ revision: e.target.value })}
                placeholder="Ex: REV 01, REV 03..."
                className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                TAG / Código
              </label>
              <input
                type="text"
                value={filters.tag}
                onChange={(e) => onFilterChange({ tag: e.target.value })}
                placeholder="Ex: LAM-001, M-302, EL..."
                className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* 4. Modification Date Range */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Data de Modificação no Google Drive
            </label>
            <div className="grid grid-cols-5 gap-2 font-mono">
              {[
                { id: 'all', label: 'Todo o Período' },
                { id: '7d', label: 'Últimos 7 dias' },
                { id: '30d', label: 'Últimos 30 dias' },
                { id: '90d', label: 'Últimos 90 dias' },
                { id: '1y', label: 'Último ano' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onFilterChange({ dateRange: opt.id as any })}
                  className={`py-2 px-1 text-center rounded border transition-colors ${
                    filters.dateRange === opt.id
                      ? 'bg-blue-600 text-white border-blue-400 font-bold'
                      : 'bg-[#060c1c] text-slate-400 border-[#1d2d56] hover:bg-[#101e40]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0e1935] border-t border-[#1b2b52]">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#142247] hover:bg-[#1a2d60] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>LIMPAR FILTROS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>PESQUISAR</span>
          </button>
        </div>

      </div>
    </div>
  );
};
