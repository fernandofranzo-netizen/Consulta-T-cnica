import React from 'react';
import { 
  Eye, 
  ExternalLink, 
  Download, 
  FileText, 
  Calendar,
  Folder
} from 'lucide-react';
import { TechnicalDocument } from '../types';

interface FileTableViewProps {
  documents: TechnicalDocument[];
  onView: (doc: TechnicalDocument) => void;
  onToggleFavorite?: (id: string) => void;
  onOpenInDrive: (doc: TechnicalDocument) => void;
  onDownload: (doc: TechnicalDocument) => void;
}

export const FileTableView: React.FC<FileTableViewProps> = ({
  documents,
  onView,
  onOpenInDrive,
  onDownload
}) => {
  return (
    <div className="bg-[#0b142d] border border-[#1b2b52] rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-[#0e1935] text-slate-400 border-b border-[#1b2b52] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-3">Código</th>
              <th className="py-3 px-4">Nome do Arquivo</th>
              <th className="py-3 px-3">Tipo / Formato</th>
              <th className="py-3 px-3">Categoria / Área</th>
              <th className="py-3 px-3">Subpasta</th>
              <th className="py-3 px-3">Equipamento</th>
              <th className="py-3 px-3">Fabricante</th>
              <th className="py-3 px-3">Revisão</th>
              <th className="py-3 px-3">Modificado</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#152349]">
            {documents.map((doc) => {
              const { technical } = doc;
              const formattedDate = new Date(doc.modifiedTime).toLocaleDateString('pt-BR');

              return (
                <tr 
                  key={doc.id}
                  className="hover:bg-[#0f1d40] transition-colors group cursor-pointer"
                  onClick={() => onView(doc)}
                >
                  {/* Code */}
                  <td className="py-2.5 px-3 font-bold text-blue-400 whitespace-nowrap">
                    {technical.code}
                  </td>

                  {/* Name as Clickable Link */}
                  <td className="py-2.5 px-4 font-sans font-medium max-w-xs truncate" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={doc.url || doc.webViewLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Abrir ${doc.name} no Google Drive`}
                      className="text-blue-300 hover:text-cyan-300 font-semibold underline underline-offset-2 flex items-center gap-1.5 transition-colors group/link"
                    >
                      <span className="truncate group-hover/link:text-cyan-300">{doc.name}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0 text-blue-400 group-hover/link:text-cyan-300" />
                    </a>
                  </td>

                  {/* Format & Type */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-500/30 text-blue-300 text-[10px] mr-1.5">
                      {technical.fileFormat}
                    </span>
                    <span className="text-slate-400 text-[11px] font-sans">
                      {technical.docType}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="py-2.5 px-3 text-slate-300 text-[11px] truncate max-w-[150px]">
                    {technical.category}
                  </td>

                  {/* Subfolder */}
                  <td className="py-2.5 px-3 text-blue-300 text-[11px] whitespace-nowrap font-bold">
                    {technical.subfolder || '-'}
                  </td>

                  {/* Equipment */}
                  <td className="py-2.5 px-3 text-slate-300 text-[11px] truncate max-w-[130px]">
                    {technical.equipment}
                  </td>

                  {/* Manufacturer */}
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {technical.manufacturer}
                  </td>

                  {/* Revision */}
                  <td className="py-2.5 px-3 font-bold text-slate-200">
                    {technical.revision}
                  </td>

                  {/* Modified */}
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onView(doc)}
                        title="Visualizar"
                        className="p-1 rounded bg-[#132247] hover:bg-blue-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenInDrive(doc)}
                        title="Abrir no Google Drive"
                        className="p-1 rounded bg-[#132247] hover:bg-[#1c3061] text-slate-300 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDownload(doc)}
                        title="Baixar arquivo"
                        className="p-1 rounded bg-[#132247] hover:bg-[#1c3061] text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
