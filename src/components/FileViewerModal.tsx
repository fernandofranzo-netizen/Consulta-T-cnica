import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  FileText, 
  Calendar, 
  Wrench, 
  Building2, 
  Tag, 
  ShieldCheck, 
  HardDrive,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TechnicalDocument } from '../types';
import { CadViewer } from './CadViewer';

interface FileViewerModalProps {
  document: TechnicalDocument | null;
  onClose: () => void;
  onOpenInDrive: (doc: TechnicalDocument) => void;
  onDownload: (doc: TechnicalDocument) => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  document,
  onClose,
  onOpenInDrive,
  onDownload
}) => {
  if (!document) return null;

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMetadataTab, setShowMetadataTab] = useState(true);

  const { technical } = document;
  const isCAD = ['DWG', 'DXF', 'STEP', 'STP', 'CAD'].includes(technical.fileFormat);
  const isImage = technical.fileFormat === 'IMAGE' || document.mimeType.startsWith('image/');
  const isPDF = technical.fileFormat === 'PDF' || document.mimeType.includes('pdf');
  const isGoogleDocOrSheet = document.mimeType.includes('spreadsheet') || 
                            document.mimeType.includes('document') || 
                            document.mimeType.includes('presentation') ||
                            ['SHEET', 'DOC', 'SLIDE'].includes(technical.fileFormat);

  // Embedded Google Drive preview URL (standard secure iframe preview)
  // For files in Drive, `https://drive.google.com/file/d/${id}/preview` works natively.
  const previewUrl = document.id.startsWith('drv-') 
    ? null 
    : `https://drive.google.com/file/d/${document.id}/preview`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      
      <div className={`bg-[#0a1226] border border-[#1e2f5b] rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full transition-all duration-200 ${
        isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-6xl h-[90vh]'
      }`}>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1935] border-b border-[#1c2c54]">
          <div className="flex items-center gap-3 truncate min-w-0">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-500/40">
              {technical.code}
            </span>
            <div className="truncate">
              <h2 className="text-sm font-bold text-white truncate leading-tight">
                {document.name}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {technical.category} • {technical.revision} • {technical.docType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenInDrive(document)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14234c] hover:bg-[#1a2d60] border border-blue-500/30 text-xs font-medium text-blue-300 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir no Google Drive</span>
            </button>

            <button
              onClick={() => onDownload(document)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-[#121f42] hover:bg-[#182955] text-slate-300 transition-colors cursor-pointer"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#121f42] hover:bg-rose-900/50 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Area: Viewer & Metadata Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Content Viewer */}
          <div className="flex-1 flex flex-col bg-[#050b18] relative overflow-hidden">
            
            {/* 1. CAD files (DWG, DXF, STEP) */}
            {isCAD ? (
              <CadViewer 
                document={document} 
                onOpenInDrive={() => onOpenInDrive(document)}
                onDownload={() => onDownload(document)}
              />
            ) : isImage ? (
              /* 2. Image Viewer */
              <div className="flex-1 flex flex-col">
                {/* Image Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#0c1630] border-b border-[#1b2b52]">
                  <span className="text-xs font-mono text-slate-300">
                    Visualização de Imagem / Fotografia Técnica
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
                      className="p-1.5 rounded bg-[#132247] hover:bg-blue-600 text-slate-200 transition-colors"
                      title="Aproximar Zoom"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                      className="p-1.5 rounded bg-[#132247] hover:bg-blue-600 text-slate-200 transition-colors"
                      title="Afastar Zoom"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="p-1.5 rounded bg-[#132247] hover:bg-blue-600 text-slate-200 transition-colors"
                      title="Rotacionar"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setZoom(1); setRotation(0); }}
                      className="px-2 py-1 rounded bg-[#132247] hover:bg-blue-600 text-slate-300 text-xs font-mono transition-colors"
                    >
                      100%
                    </button>
                  </div>
                </div>

                {/* Image Canvas Container */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-radial from-[#0c1630] to-[#040813]">
                  <img
                    src={document.thumbnailLink || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'}
                    alt={document.name}
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.15s ease-out'
                    }}
                    className="max-h-[70vh] max-w-full object-contain rounded shadow-2xl border border-blue-900/30"
                  />
                </div>
              </div>
            ) : isPDF ? (
              /* 3. PDF Viewer */
              <div className="flex-1 flex flex-col">
                {/* PDF Controls */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#0c1630] border-b border-[#1b2b52]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-300">
                      Visualizador de Documentos PDF
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-500/40">
                      Google Drive Engine
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#101e40] px-2 py-1 rounded border border-[#1b2b52]">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        title="Página Anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-mono text-slate-200 px-1">
                        Pág. {currentPage}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Próxima Página"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))}
                        className="p-1.5 rounded bg-[#101e40] hover:bg-blue-600 text-slate-200 transition-colors"
                        title="Zoom +"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setZoom(z => Math.max(z - 0.1, 0.6))}
                        className="p-1.5 rounded bg-[#101e40] hover:bg-blue-600 text-slate-200 transition-colors"
                        title="Zoom -"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* PDF Content (Native Drive Preview or Document Stream) */}
                <div className="flex-1 relative bg-[#070e1e] flex items-center justify-center p-2">
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title={document.name}
                      className="w-full h-full border-0 rounded"
                      allow="autoplay"
                    />
                  ) : (
                    /* High-Fidelity Industrial Document Simulation */
                    <div 
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                      className="w-full max-w-2xl bg-[#0d1838] border border-blue-900/50 rounded-xl p-8 shadow-2xl text-slate-200 transition-transform overflow-y-auto max-h-[75vh]"
                    >
                      <div className="border-b-2 border-blue-500 pb-4 mb-6 flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-blue-400">
                            ESPECIFICAÇÃO TÉCNICA INDUSTRIAL
                          </p>
                          <h3 className="text-lg font-bold text-white font-mono mt-1">
                            {technical.code} - {document.name}
                          </h3>
                        </div>
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-blue-900 text-blue-200">
                          {technical.revision}
                        </span>
                      </div>

                      <div className="space-y-4 text-xs font-sans leading-relaxed text-slate-300">
                        <div className="bg-[#080f24] p-4 rounded-lg border border-blue-950 font-mono">
                          <p className="text-blue-400 font-bold mb-2">METADADOS OFICIAIS DO GOOGLE DRIVE:</p>
                          <p><span className="text-slate-500">ID Drive:</span> {document.id}</p>
                          <p><span className="text-slate-500">Área:</span> {technical.category}</p>
                          <p><span className="text-slate-500">Equipamento:</span> {technical.equipment}</p>
                          <p><span className="text-slate-500">Fabricante:</span> {technical.manufacturer}</p>
                          <p><span className="text-slate-500">Modificado:</span> {new Date(document.modifiedTime).toLocaleString('pt-BR')}</p>
                        </div>

                        <p>
                          Este documento está registrado no repositório oficial da planta fabril no Google Drive. 
                          Para visualizar o arquivo com layout vetorial completo ou impressão técnica em alta resolução, utilize os botões de ação do cabeçalho.
                        </p>
                      </div>

                      <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>CONSULTA TÉCNICA - SISTEMA INTEGRADO AO GOOGLE DRIVE</span>
                        <span>FONTE: GOOGLE DRIVE V3</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isGoogleDocOrSheet ? (
              /* 4. Google Docs / Sheets / Slides Viewer */
              <div className="flex-1 flex flex-col">
                <div className="px-4 py-2 bg-[#0c1630] border-b border-[#1b2b52] flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-300">
                    Planilha / Documento Google Workspace
                  </span>
                  <button
                    onClick={() => onOpenInDrive(document)}
                    className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Abrir no editor oficial do Google <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 p-2 bg-[#050b18]">
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title={document.name}
                      className="w-full h-full border-0 rounded"
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <FileText className="w-16 h-16 text-blue-400 mb-3" />
                      <h3 className="text-base font-bold text-white mb-2">{document.name}</h3>
                      <p className="text-xs text-slate-400 max-w-md mb-6">
                        Planilha técnica indexada no Google Drive. O arquivo permanece na nuvem do Google e você pode acessá-lo ou baixá-lo abaixo.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => onOpenInDrive(document)}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
                        >
                          <ExternalLink className="w-4 h-4" />
                          ABRIR NO GOOGLE DRIVE
                        </button>
                        <button
                          onClick={() => onDownload(document)}
                          className="px-4 py-2 rounded-lg bg-[#14234c] hover:bg-[#1a2d60] border border-blue-500/40 text-blue-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          BAIXAR ARQUIVO
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 5. Unsupported file format (Section 15) */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#070e1e]">
                <div className="w-16 h-16 rounded-2xl bg-[#0f1b3b] border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-xl">
                  <HardDrive className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Visualização não disponível para este tipo de arquivo
                </h3>
                <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                  O arquivo <span className="font-mono text-slate-200">{document.name}</span> está armazenado de forma segura no Google Drive. Você pode abri-lo diretamente ou baixá-lo para abertura no software apropriado.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenInDrive(document)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>ABRIR NO GOOGLE DRIVE</span>
                  </button>
                  <button
                    onClick={() => onDownload(document)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#121f42] hover:bg-[#1a2b5e] border border-blue-500/40 text-blue-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>BAIXAR ARQUIVO</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Metadata Inspector Sidebar */}
          <div className="w-80 bg-[#0a1329] border-l border-[#1a2850] p-4 overflow-y-auto space-y-4 hidden md:block">
            <div className="flex items-center gap-2 pb-3 border-b border-[#182548]">
              <Info className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Ficha Técnica do Documento
              </h3>
            </div>

            {/* Industrial Specs */}
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#060c1c] p-3 rounded-lg border border-[#142247]">
                <span className="text-[10px] uppercase text-slate-500 block mb-1">Código Técnico</span>
                <span className="font-bold text-blue-400 text-sm">{technical.code}</span>
              </div>

              <div className="bg-[#060c1c] p-3 rounded-lg border border-[#142247]">
                <span className="text-[10px] uppercase text-slate-500 block mb-1">Revisão</span>
                <span className="font-bold text-slate-200">{technical.revision}</span>
              </div>

              <div className="bg-[#060c1c] p-3 rounded-lg border border-[#142247]">
                <span className="text-[10px] uppercase text-slate-500 block mb-1">Categoria / Área Fabril</span>
                <span className="text-slate-200 font-medium">{technical.category}</span>
              </div>

              <div className="bg-[#060c1c] p-3 rounded-lg border border-[#142247]">
                <span className="text-[10px] uppercase text-slate-500 block mb-1">Equipamento</span>
                <span className="text-slate-200">{technical.equipment}</span>
              </div>

              <div className="bg-[#060c1c] p-3 rounded-lg border border-[#142247]">
                <span className="text-[10px] uppercase text-slate-500 block mb-1">Fabricante</span>
                <span className="text-slate-200">{technical.manufacturer}</span>
              </div>

              <div className="bg-[#060c1c] p-3 rounded-lg border border-[#142247]">
                <span className="text-[10px] uppercase text-slate-500 block mb-1">Tipo de Documento</span>
                <span className="text-slate-200">{technical.docType}</span>
              </div>

              <div className="bg-[#060c1c] p-3 rounded-lg border border-[#142247]">
                <span className="text-[10px] uppercase text-slate-500 block mb-1">Última Modificação no Drive</span>
                <span className="text-slate-300">
                  {new Date(document.modifiedTime).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Tags */}
            {technical.tags && technical.tags.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-400" /> TAGs Indexadas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {technical.tags.map((tag, i) => (
                    <span 
                      key={i} 
                      className="px-2 py-0.5 rounded bg-[#101e40] text-[10px] font-mono text-slate-300 border border-blue-900/40"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Google Drive Security Guarantee */}
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Drive Garantido</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Arquivo consultado em tempo real. Nenhum download permanente ou duplicata foi gravada no servidor.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
