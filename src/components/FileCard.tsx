import React from 'react';
import { 
  FileText, 
  ExternalLink, 
  Download, 
  Eye, 
  Wrench, 
  Building2, 
  Folder, 
  FileCode2,
  Calendar,
  Layers
} from 'lucide-react';
import { TechnicalDocument } from '../types';

interface FileCardProps {
  document: TechnicalDocument;
  onView: (doc: TechnicalDocument) => void;
  onToggleFavorite?: (id: string) => void;
  onOpenInDrive: (doc: TechnicalDocument) => void;
  onDownload: (doc: TechnicalDocument) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  document,
  onView,
  onOpenInDrive,
  onDownload
}) => {
  const { technical } = document;

  // Format date DD/MM/YYYY
  const formattedDate = new Date(document.modifiedTime).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Format badge colors
  const getFormatBadge = (fmt: string) => {
    switch (fmt) {
      case 'DWG':
      case 'DXF':
      case 'CAD':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
      case 'STEP':
      case 'STP':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'PDF':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      case 'IMAGE':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'SHEET':
        return 'bg-teal-950/80 text-teal-300 border-teal-500/40';
      default:
        return 'bg-slate-900/80 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <div className="bg-[#0b142d] border border-[#1b2b52] hover:border-blue-500/70 rounded-xl overflow-hidden shadow-lg hover:shadow-blue-900/20 transition-all duration-200 flex flex-col group">
      
      {/* Card Header & Thumbnail */}
      <div className="relative h-40 bg-[#070e20] overflow-hidden border-b border-[#1b2b52] cursor-pointer" onClick={() => onView(document)}>
        {document.thumbnailLink ? (
          <img 
            src={document.thumbnailLink} 
            alt={document.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0a1228] to-[#070d1e] text-slate-500 group-hover:text-blue-400 transition-colors">
            <FileCode2 className="w-12 h-12 mb-2 stroke-[1.2]" />
            <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
              {technical.fileFormat} Blueprint
            </span>
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shadow-sm ${getFormatBadge(technical.fileFormat)}`}>
            {technical.fileFormat}
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-500/40 shadow-sm">
            {technical.revision}
          </span>
        </div>

        {/* Category Pill on bottom of thumbnail */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-mono bg-[#070e20]/90 backdrop-blur-md px-2.5 py-1 rounded border border-blue-900/40 text-blue-200">
          <div className="flex items-center gap-1.5 truncate">
            <Folder className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="truncate">{technical.category}</span>
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
            {technical.docType}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Technical Code & Title */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="font-mono text-xs font-black tracking-wider text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-600/30">
              {technical.code || document.name.split('.')[0]}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <a
            href={document.url || document.webViewLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            title={`Abrir ${document.name} no Google Drive`}
            className="text-xs font-bold text-blue-300 hover:text-cyan-300 underline underline-offset-2 line-clamp-2 transition-colors leading-relaxed mb-3 flex items-center gap-1 group/link"
          >
            <span className="truncate">{document.name}</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-blue-400 group-hover/link:text-cyan-300" />
          </a>

          {/* Industrial Specs Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#081024] p-2.5 rounded-lg border border-[#162548] mb-3 font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                <Wrench className="w-3 h-3 text-blue-400" /> Equipamento:
              </span>
              <p className="text-slate-200 font-medium truncate mt-0.5">
                {technical.equipment}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-400" /> Fabricante:
              </span>
              <p className="text-slate-200 font-medium truncate mt-0.5">
                {technical.manufacturer}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#162548] flex items-center gap-1.5">
          <button
            onClick={() => onView(document)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visualizar</span>
          </button>

          <button
            onClick={() => onOpenInDrive(document)}
            title="Abrir diretamente no Google Drive"
            className="p-1.5 rounded-lg bg-[#0e1a38] hover:bg-[#15254f] border border-[#20346a] text-slate-300 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDownload(document)}
            title="Baixar arquivo oficial"
            className="p-1.5 rounded-lg bg-[#0e1a38] hover:bg-[#15254f] border border-[#20346a] text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
