import { FileFormat, DocType, TechnicalMetadata } from '../types';

// Area code mapping to industrial plant areas
const AREA_PREFIX_MAP: Record<string, string> = {
  'ADM': '01 - ADMINISTRATIVO',
  'QLD': '02 - CONTROLE DE QUALIDADE',
  'ALM': '03 - ALMOXARIFADO',
  'SEG': '04 - SEGURANÇA',
  'MAN': '05 - OFICINA DE MANUTENÇÃO',
  'LAM': '07 - LAMINAÇÃO',
  'EXT': '08 - EXTRUSÃO',
  'COR': '10 - CORTE',
  'EST': '11 - ESTOQUE',
  'DOC': '12 - DOCAS',
  'UTI': '13 - UTILIDADES',
  'FER': '14 - FERRAMENTARIA',
  'REC': '15 - RECICLAGEM',
  'GAL': '16 - GALPÃO TERCEIROS',
  'EXTER': '19 - ÁREA EXTERNA',
  'LOG': '20 - LOGÍSTICA',
};

const KNOWN_MANUFACTURERS = [
  'Kampf', 'Brückner', 'Bruckner', 'Siemens', 'WEG', 'Schneider', 'Schneider Electric',
  'Danfoss', 'Atlas Copco', 'Festo', 'SMC', 'Krones', 'Nordson', 'ABB', 'Fanuc',
  'SEW-Eurodrive', 'Omron', 'Eaton', 'Rexroth', 'Bosch Rexroth', 'Mitsubishi', 'Allen-Bradley',
  'Rockwell', 'Parker', 'SKF', 'Timken', 'Endress+Hauser'
];

const KNOWN_EQUIPMENTS = [
  'Laminadora', 'Laminadora 01', 'Laminadora 02', 'Laminadora Kampf',
  'Extrusora', 'Extrusora 01', 'Extrusora 02', 'Extrusora Principal',
  'Cortadeira', 'Cortadeira Longitudinal', 'Cortadeira Transversal',
  'Rebobinadeira', 'Bobinadeira', 'Calandra',
  'Compressor de Ar', 'Compressor Atlas', 'Torre de Resfriamento',
  'Chiller', 'Chiller 01', 'Caldeira', 'Subestação',
  'Ponte Rolante', 'Talha Elétrica', 'Bomba Centrífuga',
  'Painel Principal', 'Inversor de Frequência', 'Motor Principal'
];

export function extractFormat(fileName: string, mimeType: string): FileFormat {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'dwg') return 'DWG';
  if (ext === 'dxf') return 'DXF';
  if (ext === 'step' || ext === 'stp') return 'STEP';
  if (ext === 'pdf' || mimeType.includes('pdf')) return 'PDF';
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'svg'].includes(ext) || mimeType.startsWith('image/')) return 'IMAGE';
  if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return 'SHEET';
  if (['doc', 'docx', 'odt'].includes(ext) || mimeType.includes('document') || mimeType.includes('word')) return 'DOC';
  if (['ppt', 'pptx'].includes(ext) || mimeType.includes('presentation')) return 'SLIDE';
  if (['iges', 'igs', 'cad'].includes(ext)) return 'CAD';

  return 'OTHER';
}

export function parseTechnicalAttributes(
  fileName: string, 
  mimeType: string, 
  parentFolderName?: string,
  subfolderName?: string
): TechnicalMetadata {
  const cleanName = fileName.replace(/\.[^/.]+$/, ''); // remove extension
  const format = extractFormat(fileName, mimeType);

  // 1. Extract Code (e.g., LAM-001-EL, EXT-014-MEC, COR-003, MAN-002)
  let code = '';
  const codeMatch = cleanName.match(/\b([A-Z]{2,5}[-_][0-9]{2,4}(?:[-_][A-Z0-9]+)?)\b/i);
  if (codeMatch) {
    code = codeMatch[1].toUpperCase().replace(/_/g, '-');
  } else {
    // Fallback: take first part before underscore or hyphen
    const parts = cleanName.split(/[-_]/);
    if (parts.length > 1 && parts[0].length >= 2 && parts[0].length <= 8) {
      code = parts[0].toUpperCase();
    } else {
      code = cleanName.slice(0, 10).toUpperCase();
    }
  }

  // 2. Extract Revision (e.g. REV03, REV. 03, REV_01, R02, V1.2)
  let revision = 'REV. 00';
  const revMatch = cleanName.match(/(?:REV|REVISAO|REV\.|REV_|R)[ ._-]?([0-9]{1,2}|[A-Z])\b/i);
  if (revMatch) {
    revision = `REV. ${revMatch[1].toUpperCase().padStart(2, '0')}`;
  }

  // 3. Extract Manufacturer
  let manufacturer = 'Geral / Fabricação Própria';
  for (const m of KNOWN_MANUFACTURERS) {
    const regex = new RegExp(`\\b${m}\\b`, 'i');
    if (regex.test(cleanName) || (parentFolderName && regex.test(parentFolderName))) {
      manufacturer = m;
      break;
    }
  }

  // 4. Extract Equipment
  let equipment = 'Sistema Geral';
  for (const eq of KNOWN_EQUIPMENTS) {
    const regex = new RegExp(eq, 'i');
    if (regex.test(cleanName)) {
      equipment = eq;
      break;
    }
  }
  // Try pattern like Laminadora 01 / Extrusora 02
  if (equipment === 'Sistema Geral') {
    const numEq = cleanName.match(/(Laminadora|Extrusora|Cortadeira|Compressor|Rebobinadeira|Chiller|Bomba)\s*[-_]?\s*([0-9]{1,2})/i);
    if (numEq) {
      equipment = `${numEq[1]} ${numEq[2].padStart(2, '0')}`;
    }
  }

  // 5. Extract DocType
  let docType: DocType = 'Desenho Técnico';
  const upper = cleanName.toUpperCase();

  if (upper.includes('MANUAL') || upper.includes('MAN-') || upper.includes('GUIA') || upper.includes('INSTRUÇÃO')) {
    docType = 'Manual';
  } else if (upper.includes('EL-') || upper.includes('ELETR') || upper.includes('DIAGRAMA ELÉTRICO') || upper.includes('DIAGRAMA ELETRICO') || upper.includes('SCH-EL')) {
    docType = 'Esquema Elétrico';
  } else if (upper.includes('PNEUM') || upper.includes('HIDR') || upper.includes('SCH-PN')) {
    docType = 'Esquema Hidráulico/Pneumático';
  } else if (upper.includes('PROC') || upper.includes('POP') || upper.includes('IT-')) {
    docType = 'Procedimento Operacional';
  } else if (upper.includes('CALIB') || upper.includes('PLANILHA') || format === 'SHEET') {
    docType = 'Planilha de Calibração';
  } else if (upper.includes('FOTO') || upper.includes('INSPEÇÃO') || format === 'IMAGE') {
    docType = 'Foto/Inspeção';
  } else if (upper.includes('CATALOGO') || upper.includes('CATÁLOGO')) {
    docType = 'Catálogo Técnico';
  } else if (['DWG', 'DXF', 'STEP', 'STP', 'CAD'].includes(format)) {
    docType = 'Desenho Técnico';
  }

  // 6. Category mapping
  let category = parentFolderName || '13 - UTILIDADES';
  if (parentFolderName && /^[0-9]{2}\s*-\s*/.test(parentFolderName)) {
    category = parentFolderName;
  } else {
    // Check if code prefix matches known area
    const prefixMatch = code.match(/^([A-Z]+)/);
    if (prefixMatch && AREA_PREFIX_MAP[prefixMatch[1]]) {
      category = AREA_PREFIX_MAP[prefixMatch[1]];
    }
  }

  // 7. Tags
  const tags: string[] = [];
  if (code) tags.push(code);
  if (revision) tags.push(revision);
  if (format) tags.push(format);
  if (equipment && equipment !== 'Sistema Geral') tags.push(equipment);
  if (manufacturer && manufacturer !== 'Geral / Fabricação Própria') tags.push(manufacturer);

  return {
    code,
    revision,
    category,
    subfolder: subfolderName,
    equipment,
    manufacturer,
    docType,
    tags,
    fileFormat: format,
    folderName: parentFolderName
  };
}
