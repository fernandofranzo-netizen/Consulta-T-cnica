import React, { useRef, useEffect, useState } from 'react';
import { 
  Compass, 
  Layers, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ExternalLink,
  Sliders,
  Grid
} from 'lucide-react';
import { TechnicalDocument } from '../types';

interface CadViewerProps {
  document: TechnicalDocument;
  onOpenInDrive: () => void;
  onDownload: () => void;
}

export const CadViewer: React.FC<CadViewerProps> = ({
  document,
  onOpenInDrive,
  onDownload
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showCenterLines, setShowCenterLines] = useState(true);
  const [activeLayer, setActiveLayer] = useState<'all' | 'mechanical' | 'electrical'>('all');

  // Draw technical vector schematic on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background: Deep technical blueprint navy
    ctx.fillStyle = '#050b18';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.rotate((rotation * Math.PI) / 180);

    // 1. Grid lines
    if (showGrid) {
      ctx.strokeStyle = '#0c1a36';
      ctx.lineWidth = 1;
      const step = 25;
      for (let x = -width; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, -height);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -height; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(-width, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // 2. Industrial mechanical drawings (Rollers, Chassis, Shafts, Motors)
    if (activeLayer === 'all' || activeLayer === 'mechanical') {
      // Main Machine Base Outline
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-220, -140, 440, 280);

      // Inner structural compartments
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-200, -120, 200, 240);
      ctx.strokeRect(20, -120, 180, 240);

      // Roller 1 (Laminating / Extrusion Roller)
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-100, 0, 75, 0, Math.PI * 2);
      ctx.stroke();

      // Roller Center Core & Bearings
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-100, 0, 25, 0, Math.PI * 2);
      ctx.stroke();

      // Roller 2 (Nip roller)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(110, -30, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Roller 3 (Drive shaft)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(110, 60, 35, 0, Math.PI * 2);
      ctx.stroke();

      // Transmission belt / coupling
      ctx.strokeStyle = '#0284c7';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(110, -80);
      ctx.lineTo(110, 95);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Center lines (ISO industrial drafting)
    if (showCenterLines) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1;
      ctx.setLineDash([12, 4, 3, 4]);

      // Horizontal center
      ctx.beginPath();
      ctx.moveTo(-250, 0);
      ctx.lineTo(250, 0);
      ctx.stroke();

      // Vertical center roller 1
      ctx.beginPath();
      ctx.moveTo(-100, -160);
      ctx.lineTo(-100, 160);
      ctx.stroke();

      // Vertical center roller 2
      ctx.beginPath();
      ctx.moveTo(110, -160);
      ctx.lineTo(110, 160);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // 4. Dimension lines & annotations
    if (showDimensions) {
      ctx.strokeStyle = '#fbbf24';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px monospace';
      ctx.lineWidth = 1;

      // Dimension top width
      ctx.beginPath();
      ctx.moveTo(-220, -155);
      ctx.lineTo(220, -155);
      ctx.stroke();

      // Arrows
      ctx.fillRect(-222, -158, 4, 6);
      ctx.fillRect(218, -158, 4, 6);
      ctx.fillText('440.00 mm', -25, -160);

      // Dimension side height
      ctx.beginPath();
      ctx.moveTo(235, -140);
      ctx.lineTo(235, 140);
      ctx.stroke();
      ctx.fillRect(232, -142, 6, 4);
      ctx.fillRect(232, 138, 6, 4);
      ctx.fillText('280.00 mm', 242, 5);

      // Diameter note
      ctx.fillText('Ø 150.00 H7 (ROLO PRINCIPAL)', -165, -85);
      ctx.fillText(`COD: ${document.technical.code || 'DWG-001'}`, -215, 115);
      ctx.fillText(`REV: ${document.technical.revision}`, -215, 130);
    }

    ctx.restore();

    // Corner HUD Title Block (ISO Blueprint border title block)
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(width - 240, height - 75, 230, 65);
    ctx.fillStyle = '#0a1530';
    ctx.fillRect(width - 239, height - 74, 228, 63);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('CONSULTA TÉCNICA - CAD SIMULATOR', width - 230, height - 58);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '8px monospace';
    ctx.fillText(`ARQ: ${document.name.slice(0, 30)}`, width - 230, height - 44);
    ctx.fillText(`FORMATO: ${document.technical.fileFormat} | ESCALA 1:1`, width - 230, height - 32);
    ctx.fillText(`STATUS: GOOGLE DRIVE NATIVE`, width - 230, height - 20);

  }, [zoom, rotation, showGrid, showDimensions, showCenterLines, activeLayer, document]);

  return (
    <div className="flex flex-col h-full bg-[#050b18] text-slate-200">
      
      {/* CAD Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-[#0a1329] border-b border-[#1b2b52] gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-950/60 border border-blue-500/40 text-blue-300 font-mono text-xs">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>Visualizador CAD 2D/3D</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {document.technical.fileFormat} • {document.technical.code}
          </span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
            title="Aproximar Zoom"
            className="p-1.5 rounded bg-[#101e40] hover:bg-blue-600 text-slate-200 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))}
            title="Afastar Zoom"
            className="p-1.5 rounded bg-[#101e40] hover:bg-blue-600 text-slate-200 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            title="Rotacionar 90°"
            className="p-1.5 rounded bg-[#101e40] hover:bg-blue-600 text-slate-200 hover:text-white transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setRotation(0); }}
            title="Redefinir Vista"
            className="px-2 py-1 rounded bg-[#101e40] hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            100%
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Layer toggles */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Grade técnica"
            className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-blue-600 text-white' : 'bg-[#101e40] text-slate-400'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            title="Cotas dimensionais"
            className={`p-1.5 rounded transition-colors ${showDimensions ? 'bg-blue-600 text-white' : 'bg-[#101e40] text-slate-400'}`}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Drive & Download Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1a38] hover:bg-[#15254f] border border-blue-500/40 text-xs font-semibold text-blue-300 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>ABRIR NO GOOGLE DRIVE</span>
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>BAIXAR ARQUIVO</span>
          </button>
        </div>
      </div>

      {/* Interactive Blueprint Canvas */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          className="rounded-lg shadow-2xl border border-blue-900/40 max-w-full max-h-full cursor-grab active:cursor-grabbing"
        />

        {/* Notice Banner */}
        <div className="absolute bottom-6 left-6 max-w-md bg-[#091226]/90 backdrop-blur-md border border-blue-500/30 rounded-lg p-3 text-xs shadow-xl">
          <p className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            Formato CAD Nativo ({document.technical.fileFormat})
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            O arquivo original permanece intacto no Google Drive. Você pode abri-lo no visualizador do Google Drive ou baixá-lo diretamente para abertura no AutoCAD, SolidWorks ou Autodesk Viewer.
          </p>
        </div>
      </div>

    </div>
  );
};
