import React from 'react';
import { 
  FolderArchive, 
  Compass, 
  Image as ImageIcon, 
  FileText, 
  BookOpen 
} from 'lucide-react';
import { TechnicalDocument } from '../types';

interface QuickAccessCardsProps {
  documents: TechnicalDocument[];
  activeFilter: string;
  onFilterChange: (type: 'all' | 'cad' | 'images' | 'pdfs' | 'manuals') => void;
}

export const QuickAccessCards: React.FC<QuickAccessCardsProps> = ({
  documents,
  activeFilter,
  onFilterChange
}) => {
  // Dynamically calculate counts from actual documents in Google Drive / indexed set
  const totalCount = documents.length;
  
  const cadCount = documents.filter(doc => 
    ['DWG', 'DXF', 'STEP', 'STP', 'CAD'].includes(doc.technical.fileFormat) ||
    doc.technical.docType === 'Desenho Técnico'
  ).length;

  const imagesCount = documents.filter(doc => 
    doc.technical.fileFormat === 'IMAGE' || 
    doc.mimeType.startsWith('image/')
  ).length;

  const pdfsCount = documents.filter(doc => 
    doc.technical.fileFormat === 'PDF' || 
    doc.mimeType.includes('pdf')
  ).length;

  const manualsCount = documents.filter(doc => 
    doc.technical.docType === 'Manual' ||
    doc.name.toLowerCase().includes('manual')
  ).length;

  const cards = [
    {
      id: 'all',
      title: 'TODOS OS DOCUMENTOS',
      count: totalCount,
      label: 'arquivos indexados',
      icon: FolderArchive,
      gradient: 'from-blue-600/20 via-blue-500/10 to-indigo-600/20',
      border: 'border-blue-500/40',
      iconColor: 'text-blue-400',
      countColor: 'text-blue-300'
    },
    {
      id: 'cad',
      title: 'DESENHOS TÉCNICOS',
      count: cadCount,
      label: 'arquivos CAD & Plantas',
      icon: Compass,
      gradient: 'from-cyan-600/20 via-cyan-500/10 to-blue-600/20',
      border: 'border-cyan-500/40',
      iconColor: 'text-cyan-400',
      countColor: 'text-cyan-300'
    },
    {
      id: 'images',
      title: 'IMAGENS & FOTOS',
      count: imagesCount,
      label: 'inspeções & fotos',
      icon: ImageIcon,
      gradient: 'from-purple-600/20 via-purple-500/10 to-indigo-600/20',
      border: 'border-purple-500/40',
      iconColor: 'text-purple-400',
      countColor: 'text-purple-300'
    },
    {
      id: 'pdfs',
      title: 'ESQUEMAS & PDFs',
      count: pdfsCount,
      label: 'documentos técnicos',
      icon: FileText,
      gradient: 'from-rose-600/20 via-rose-500/10 to-red-600/20',
      border: 'border-rose-500/40',
      iconColor: 'text-rose-400',
      countColor: 'text-rose-300'
    },
    {
      id: 'manuals',
      title: 'MANUAIS',
      count: manualsCount,
      label: 'guias de operação',
      icon: BookOpen,
      gradient: 'from-amber-600/20 via-amber-500/10 to-yellow-600/20',
      border: 'border-amber-500/40',
      iconColor: 'text-amber-400',
      countColor: 'text-amber-300'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onFilterChange(card.id as any)}
            className={`text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
              isActive 
                ? 'bg-gradient-to-br ' + card.gradient + ' ' + card.border + ' shadow-lg shadow-blue-900/30 ring-2 ring-blue-500/40' 
                : 'bg-[#091124] border-[#18264e] hover:border-blue-500/60 hover:bg-[#0c1630]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {card.title}
              </span>
              <Icon className={`w-4 h-4 ${card.iconColor} group-hover:scale-110 transition-transform`} />
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono tracking-tight ${card.countColor}`}>
                {card.count}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
              {card.label}
            </p>

            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};
