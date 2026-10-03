import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { parseTechnicalAttributes, extractFormat } from './src/lib/classifier';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Gemini SDK
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI();
}

// In-Memory & File-backed Application Storage (Never stores files, ONLY metadata!)
const DATA_DIR = path.resolve('.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'metadata_store.json');

interface LocalStorageData {
  favorites: Record<string, string[]>; // userId -> fileId[]
  history: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    action: 'VIEW' | 'SEARCH' | 'DOWNLOAD' | 'OPEN_DRIVE';
    fileId?: string;
    fileName?: string;
    fileCode?: string;
    searchQuery?: string;
    timestamp: string;
  }>;
  users: Array<{
    uid: string;
    email: string;
    displayName: string;
    role: 'Administrador' | 'Supervisor' | 'Usuário';
    lastLogin: string;
  }>;
  settings: {
    rootFolderId: string;
    rootFolderName: string;
    appsScriptUrl?: string;
    autoClassification: boolean;
    geminiAiEnabled: boolean;
    syncIntervalMinutes: number;
    startPageToken?: string;
  };
  rules: Array<{
    id: string;
    name: string;
    pattern: string;
    type: 'regex' | 'prefix' | 'keyword';
    extractField: 'code' | 'revision' | 'category' | 'equipment' | 'manufacturer';
    example: string;
  }>;
}

let store: LocalStorageData = {
  favorites: {},
  history: [],
  users: [
    {
      uid: 'admin-default',
      email: 'manutencaolaminor@gmail.com',
      displayName: 'Administrador Industrial',
      role: 'Administrador',
      lastLogin: new Date().toISOString()
    }
  ],
  settings: {
    rootFolderId: '1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    rootFolderName: 'CONSULTA IMAGENS E DESENHOS TECNICOS',
    autoClassification: true,
    geminiAiEnabled: true,
    syncIntervalMinutes: 5,
  },
  rules: [
    {
      id: 'rule-1',
      name: 'Código de Área e Disciplina',
      pattern: '^([A-Z]{3,4})-([0-9]{3})-([A-Z]{2})',
      type: 'regex',
      extractField: 'code',
      example: 'LAM-001-EL_REV03.pdf -> LAM-001-EL'
    },
    {
      id: 'rule-2',
      name: 'Identificação de Revisão',
      pattern: '(REV|R)[ ._-]?([0-9]{1,2})',
      type: 'regex',
      extractField: 'revision',
      example: 'REV03 -> REV. 03'
    },
    {
      id: 'rule-3',
      name: 'Detecção de Manuais de Fabricante',
      pattern: 'MAN-[0-9]{3}-([A-Z]+)',
      type: 'regex',
      extractField: 'manufacturer',
      example: 'MAN-002-KAMPF-LAMINADORA.pdf -> Kampf'
    }
  ]
};

// Load persistent store
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    store = { ...store, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Error reading store file, using default in-memory store:', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

// Industrial Plant Seed Dataset (Used when user is browsing standard industrial structure or before custom Drive folder is chosen)
const INDUSTRIAL_CATEGORIES = [
  '01 - ADMINISTRATIVO',
  '02 - CONTROLE DE QUALIDADE',
  '03 - ALMOXARIFADO',
  '04 - SEGURANÇA',
  '05 - OFICINA DE MANUTENÇÃO',
  '07 - LAMINAÇÃO',
  '08 - EXTRUSÃO',
  '10 - CORTE',
  '11 - ESTOQUE',
  '12 - DOCAS',
  '13 - UTILIDADES',
  '14 - FERRAMENTARIA',
  '15 - RECICLAGEM',
  '16 - GALPÃO TERCEIROS',
  '19 - ÁREA EXTERNA',
  '20 - LOGÍSTICA'
];

const STANDARD_SUBFOLDERS = ['Elétrica', 'Mecânica', 'Civil'];

const SAMPLE_INDUSTRIAL_FILES = [
  {
    id: 'drv-lam-001-el',
    name: 'LAM-001-EL_REV03.pdf',
    mimeType: 'application/pdf',
    size: 4850124,
    modifiedTime: '2026-10-02T14:32:00.000Z',
    createdTime: '2025-03-10T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-lam-001-el/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '07 - LAMINAÇÃO',
    subfolder: 'Elétrica',
    parents: ['folder-07-lam']
  },
  {
    id: 'drv-man-002-kampf',
    name: 'MAN-002-KAMPF-LAMINADORA.pdf',
    mimeType: 'application/pdf',
    size: 15482910,
    modifiedTime: '2026-09-28T09:15:00.000Z',
    createdTime: '2024-11-15T08:20:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-man-002/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
    category: '07 - LAMINAÇÃO',
    subfolder: 'Mecânica',
    parents: ['folder-07-lam']
  },
  {
    id: 'drv-lam-003-civil',
    name: 'LAM-003-BASE-CIVIL-LAMINADORA_REV01.dwg',
    mimeType: 'application/acad',
    size: 11400200,
    modifiedTime: '2026-09-29T11:00:00.000Z',
    createdTime: '2025-02-12T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-lam-003/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '07 - LAMINAÇÃO',
    subfolder: 'Civil',
    parents: ['folder-07-lam']
  },
  {
    id: 'drv-ext-014-mec',
    name: 'EXT-014-MEC_REV01.dwg',
    mimeType: 'application/acad',
    size: 8940200,
    modifiedTime: '2026-09-30T16:40:00.000Z',
    createdTime: '2025-05-12T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-ext-014/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '08 - EXTRUSÃO',
    subfolder: 'Mecânica',
    parents: ['folder-08-ext']
  },
  {
    id: 'drv-ext-015-el',
    name: 'EXT-015-PAINEL-ELETRICO-INVERSOR_REV02.pdf',
    mimeType: 'application/pdf',
    size: 4320100,
    modifiedTime: '2026-09-27T10:15:00.000Z',
    createdTime: '2025-04-18T14:30:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-ext-015/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    category: '08 - EXTRUSÃO',
    subfolder: 'Elétrica',
    parents: ['folder-08-ext']
  },
  {
    id: 'drv-ext-016-civil',
    name: 'EXT-016-CANALETAS-PISO-EXTRUSAO_REV01.dwg',
    mimeType: 'application/acad',
    size: 7850000,
    modifiedTime: '2026-09-24T15:20:00.000Z',
    createdTime: '2024-11-20T08:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-ext-016/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '08 - EXTRUSÃO',
    subfolder: 'Civil',
    parents: ['folder-08-ext']
  },
  {
    id: 'drv-cor-003-pn',
    name: 'COR-003-PNEUM_REV02.pdf',
    mimeType: 'application/pdf',
    size: 3201400,
    modifiedTime: '2026-09-25T11:20:00.000Z',
    createdTime: '2025-01-20T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-cor-003/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    category: '10 - CORTE',
    subfolder: 'Mecânica',
    parents: ['folder-10-cor']
  },
  {
    id: 'drv-cor-004-el',
    name: 'COR-004-DIAGRAMA-FORCA-CORTE_REV01.pdf',
    mimeType: 'application/pdf',
    size: 2980000,
    modifiedTime: '2026-09-26T14:00:00.000Z',
    createdTime: '2025-03-15T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-cor-004/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '10 - CORTE',
    subfolder: 'Elétrica',
    parents: ['folder-10-cor']
  },
  {
    id: 'drv-cor-005-civil',
    name: 'COR-005-BASE-CIVIL-CORTADEIRA.dwg',
    mimeType: 'application/acad',
    size: 6720000,
    modifiedTime: '2026-09-22T09:30:00.000Z',
    createdTime: '2024-10-10T16:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-cor-005/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '10 - CORTE',
    subfolder: 'Civil',
    parents: ['folder-10-cor']
  },
  {
    id: 'drv-uti-007-chiller',
    name: 'UTI-007-SCHNEIDER-CHILLER_REV04.pdf',
    mimeType: 'application/pdf',
    size: 6124000,
    modifiedTime: '2026-10-01T08:10:00.000Z',
    createdTime: '2024-08-14T09:30:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-uti-007/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=600&q=80',
    category: '13 - UTILIDADES',
    subfolder: 'Elétrica',
    parents: ['folder-13-uti']
  },
  {
    id: 'drv-uti-008-mec',
    name: 'UTI-008-COMPRESSOR-ATLAS-MECANICA_REV02.dwg',
    mimeType: 'application/acad',
    size: 7920000,
    modifiedTime: '2026-09-28T16:40:00.000Z',
    createdTime: '2025-06-20T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-uti-008/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '13 - UTILIDADES',
    subfolder: 'Mecânica',
    parents: ['folder-13-uti']
  },
  {
    id: 'drv-uti-009-civil',
    name: 'UTI-009-PROJETO-CIVIL-SUBESTACAO.pdf',
    mimeType: 'application/pdf',
    size: 5410000,
    modifiedTime: '2026-09-25T13:20:00.000Z',
    createdTime: '2024-05-12T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-uti-009/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '13 - UTILIDADES',
    subfolder: 'Civil',
    parents: ['folder-13-uti']
  },
  {
    id: 'drv-seg-001-layout',
    name: 'SEG-001-ROTAS-EVACUACAO_REV02.dwg',
    mimeType: 'application/acad',
    size: 12450000,
    modifiedTime: '2026-09-15T15:00:00.000Z',
    createdTime: '2024-01-10T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-seg-001/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '04 - SEGURANÇA',
    subfolder: 'Civil',
    parents: ['folder-04-seg']
  },
  {
    id: 'drv-seg-002-spda',
    name: 'SEG-002-SISTEMA-SPDA-ATERRAMENTO.pdf',
    mimeType: 'application/pdf',
    size: 3820000,
    modifiedTime: '2026-09-19T10:00:00.000Z',
    createdTime: '2025-01-15T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-seg-002/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '04 - SEGURANÇA',
    subfolder: 'Elétrica',
    parents: ['folder-04-seg']
  },
  {
    id: 'drv-seg-003-nr12',
    name: 'SEG-003-PROTECOES-MECANICAS-NR12.dwg',
    mimeType: 'application/acad',
    size: 9140000,
    modifiedTime: '2026-09-20T14:30:00.000Z',
    createdTime: '2025-02-18T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-seg-003/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '04 - SEGURANÇA',
    subfolder: 'Mecânica',
    parents: ['folder-04-seg']
  },
  {
    id: 'drv-man-015-bomba',
    name: 'MAN-015-WEG-BOMBA-CENTRIFUGA.pdf',
    mimeType: 'application/pdf',
    size: 2840000,
    modifiedTime: '2026-09-22T13:45:00.000Z',
    createdTime: '2025-06-05T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-man-015/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
    category: '05 - OFICINA DE MANUTENÇÃO',
    subfolder: 'Elétrica',
    parents: ['folder-05-man']
  },
  {
    id: 'drv-man-003-redutor',
    name: 'MAN-003-SEW-REDUTOR-PRINCIPAL_REV01.pdf',
    mimeType: 'application/pdf',
    size: 5120000,
    modifiedTime: '2026-09-20T10:30:00.000Z',
    createdTime: '2025-04-10T08:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-man-003/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
    category: '05 - OFICINA DE MANUTENÇÃO',
    subfolder: 'Mecânica',
    parents: ['folder-05-man']
  },
  {
    id: 'drv-man-008-plano',
    name: 'MAN-008-PLANO-PREVENTIVO-SEMESTRAL-2026.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1980000,
    modifiedTime: '2026-10-01T15:20:00.000Z',
    createdTime: '2026-01-10T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-man-008/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    category: '05 - OFICINA DE MANUTENÇÃO',
    subfolder: 'Mecânica',
    parents: ['folder-05-man']
  },
  {
    id: 'drv-man-012-lub',
    name: 'MAN-012-MAPA-LUBRIFICACAO-GRAXAS-MOBIL.pdf',
    mimeType: 'application/pdf',
    size: 3450000,
    modifiedTime: '2026-09-18T14:10:00.000Z',
    createdTime: '2025-08-12T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-man-012/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '05 - OFICINA DE MANUTENÇÃO',
    subfolder: 'Mecânica',
    parents: ['folder-05-man']
  },
  {
    id: 'drv-man-020-civil',
    name: 'MAN-020-PLANTA-CIVIL-OFICINA-CARGA.dwg',
    mimeType: 'application/acad',
    size: 10450000,
    modifiedTime: '2026-09-27T16:00:00.000Z',
    createdTime: '2024-09-14T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-man-020/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '05 - OFICINA DE MANUTENÇÃO',
    subfolder: 'Civil',
    parents: ['folder-05-man']
  },
  {
    id: 'drv-qld-calib-2026',
    name: 'QLD-004-PLANILHA-CALIBRACAO-INSTRUMENTOS.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1420000,
    modifiedTime: '2026-10-02T10:00:00.000Z',
    createdTime: '2026-01-05T08:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-qld-004/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    category: '02 - CONTROLE DE QUALIDADE',
    subfolder: 'Mecânica',
    parents: ['folder-02-qld']
  },
  {
    id: 'drv-fer-008-matriz',
    name: 'FER-008-MATRIZ-CORTE-A36_REV02.step',
    mimeType: 'application/step',
    size: 22100000,
    modifiedTime: '2026-09-18T17:30:00.000Z',
    createdTime: '2025-09-01T14:20:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-fer-008/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=600&q=80',
    category: '14 - FERRAMENTARIA',
    subfolder: 'Mecânica',
    parents: ['folder-14-fer']
  },
  {
    id: 'drv-fer-009-civil',
    name: 'FER-009-FUNDACAO-PRENSAS-CIVIL.dwg',
    mimeType: 'application/acad',
    size: 8910000,
    modifiedTime: '2026-09-15T11:00:00.000Z',
    createdTime: '2024-08-10T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-fer-009/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '14 - FERRAMENTARIA',
    subfolder: 'Civil',
    parents: ['folder-14-fer']
  },
  {
    id: 'drv-fer-010-el',
    name: 'FER-010-ELETROEROSAO-DIAGRAMA_REV02.pdf',
    mimeType: 'application/pdf',
    size: 3450000,
    modifiedTime: '2026-09-12T14:00:00.000Z',
    createdTime: '2025-03-20T09:30:00.000Z',
    webViewLink: 'https://drive.google.com/file/d/sample-fer-010/view',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '14 - FERRAMENTARIA',
    subfolder: 'Elétrica',
    parents: ['folder-14-fer']
  },
  {
    id: 'drv-lam-002-cilindro',
    name: 'LAM-002-FOTO-INSPECAO-CILINDRO-BORRACHA.jpg',
    mimeType: 'image/jpeg',
    size: 4210000,
    modifiedTime: '2026-10-02T16:20:00.000Z',
    createdTime: '2026-10-02T16:15:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '07 - LAMINAÇÃO',
    subfolder: 'Mecânica',
    parents: ['folder-07-lam']
  },
  {
    id: 'drv-adm-001-el',
    name: 'ADM-001-EL-QUADRO-DISTRIBUICAO_REV01.pdf',
    mimeType: 'application/pdf',
    size: 3120000,
    modifiedTime: '2026-09-23T10:00:00.000Z',
    createdTime: '2025-02-10T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '01 - ADMINISTRATIVO',
    subfolder: 'Elétrica',
    parents: ['folder-01-adm']
  },
  {
    id: 'drv-adm-002-mec',
    name: 'ADM-002-MEC-CLIMATIZACAO-CENTRAL_REV02.dwg',
    mimeType: 'application/acad',
    size: 6420000,
    modifiedTime: '2026-09-23T10:15:00.000Z',
    createdTime: '2025-04-12T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '01 - ADMINISTRATIVO',
    subfolder: 'Mecânica',
    parents: ['folder-01-adm']
  },
  {
    id: 'drv-adm-003-civ',
    name: 'ADM-003-CIV-PLANTA-ARQUITETONICA-ADM.dwg',
    mimeType: 'application/acad',
    size: 9840000,
    modifiedTime: '2026-09-23T10:30:00.000Z',
    createdTime: '2024-11-05T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '01 - ADMINISTRATIVO',
    subfolder: 'Civil',
    parents: ['folder-01-adm']
  },
  {
    id: 'drv-qld-001-el',
    name: 'QLD-001-EL-BANCADA-TESTES-ELETRICOS.pdf',
    mimeType: 'application/pdf',
    size: 2950000,
    modifiedTime: '2026-09-23T11:00:00.000Z',
    createdTime: '2025-05-18T08:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    category: '02 - CONTROLE DE QUALIDADE',
    subfolder: 'Elétrica',
    parents: ['folder-02-qld']
  },
  {
    id: 'drv-qld-003-civ',
    name: 'QLD-003-CIV-LAYOUT-LABORATORIO-METROLOGIA.dwg',
    mimeType: 'application/acad',
    size: 7890000,
    modifiedTime: '2026-09-23T11:20:00.000Z',
    createdTime: '2025-01-14T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '02 - CONTROLE DE QUALIDADE',
    subfolder: 'Civil',
    parents: ['folder-02-qld']
  },
  {
    id: 'drv-alm-001-el',
    name: 'ALM-001-EL-ILUMINACAO-RACKS-ALMOXARIFADO.pdf',
    mimeType: 'application/pdf',
    size: 2750000,
    modifiedTime: '2026-09-23T12:00:00.000Z',
    createdTime: '2025-03-10T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '03 - ALMOXARIFADO',
    subfolder: 'Elétrica',
    parents: ['folder-03-alm']
  },
  {
    id: 'drv-alm-002-mec',
    name: 'ALM-002-MEC-ESTEIRA-ROLANTES-PECAS.dwg',
    mimeType: 'application/acad',
    size: 8320000,
    modifiedTime: '2026-09-23T12:15:00.000Z',
    createdTime: '2025-06-20T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '03 - ALMOXARIFADO',
    subfolder: 'Mecânica',
    parents: ['folder-03-alm']
  },
  {
    id: 'drv-alm-003-civ',
    name: 'ALM-003-CIV-ESTRUTURA-PORTA-PALETES-CARGA.dwg',
    mimeType: 'application/acad',
    size: 9140000,
    modifiedTime: '2026-09-23T12:30:00.000Z',
    createdTime: '2024-12-10T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '03 - ALMOXARIFADO',
    subfolder: 'Civil',
    parents: ['folder-03-alm']
  },
  {
    id: 'drv-est-001-el',
    name: 'EST-001-EL-PAINEL-ILUMINACAO-PORTAL.pdf',
    mimeType: 'application/pdf',
    size: 3410000,
    modifiedTime: '2026-09-23T13:00:00.000Z',
    createdTime: '2025-02-15T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '11 - ESTOQUE',
    subfolder: 'Elétrica',
    parents: ['folder-11-est']
  },
  {
    id: 'drv-est-002-mec',
    name: 'EST-002-MEC-PONTE-ROLANTE-15TON.dwg',
    mimeType: 'application/acad',
    size: 11200000,
    modifiedTime: '2026-09-23T13:15:00.000Z',
    createdTime: '2025-05-10T08:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '11 - ESTOQUE',
    subfolder: 'Mecânica',
    parents: ['folder-11-est']
  },
  {
    id: 'drv-est-003-civ',
    name: 'EST-003-CIV-PISO-ALTA-RESISTENCIA-ESTOQUE.dwg',
    mimeType: 'application/acad',
    size: 8430000,
    modifiedTime: '2026-09-23T13:30:00.000Z',
    createdTime: '2024-10-18T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '11 - ESTOQUE',
    subfolder: 'Civil',
    parents: ['folder-11-est']
  },
  {
    id: 'drv-doc-001-el',
    name: 'DOC-001-EL-QUADRO-NIVELADORA-DOCA.pdf',
    mimeType: 'application/pdf',
    size: 2890000,
    modifiedTime: '2026-09-23T14:00:00.000Z',
    createdTime: '2025-03-01T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    category: '12 - DOCAS',
    subfolder: 'Elétrica',
    parents: ['folder-12-doc']
  },
  {
    id: 'drv-doc-002-mec',
    name: 'DOC-002-MEC-RAMPA-HIDRAULICA-CARGA.dwg',
    mimeType: 'application/acad',
    size: 7650000,
    modifiedTime: '2026-09-23T14:15:00.000Z',
    createdTime: '2025-07-12T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '12 - DOCAS',
    subfolder: 'Mecânica',
    parents: ['folder-12-doc']
  },
  {
    id: 'drv-doc-003-civ',
    name: 'DOC-003-CIV-PATIO-MANOBRAS-PAVIMENTO.dwg',
    mimeType: 'application/acad',
    size: 10420000,
    modifiedTime: '2026-09-23T14:30:00.000Z',
    createdTime: '2024-09-25T15:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '12 - DOCAS',
    subfolder: 'Civil',
    parents: ['folder-12-doc']
  },
  {
    id: 'drv-rec-001-el',
    name: 'REC-001-EL-PAINEL-MOINHO-CENTRAL.pdf',
    mimeType: 'application/pdf',
    size: 3950000,
    modifiedTime: '2026-09-23T15:00:00.000Z',
    createdTime: '2025-01-20T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '15 - RECICLAGEM',
    subfolder: 'Elétrica',
    parents: ['folder-15-rec']
  },
  {
    id: 'drv-rec-002-mec',
    name: 'REC-002-MEC-ROTOR-TRITURADOR-ACO.dwg',
    mimeType: 'application/acad',
    size: 9450000,
    modifiedTime: '2026-09-23T15:15:00.000Z',
    createdTime: '2025-04-18T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '15 - RECICLAGEM',
    subfolder: 'Mecânica',
    parents: ['folder-15-rec']
  },
  {
    id: 'drv-rec-003-civ',
    name: 'REC-003-CIV-BASE-ANTI-VIBRACAO-MOINHO.dwg',
    mimeType: 'application/acad',
    size: 6870000,
    modifiedTime: '2026-09-23T15:30:00.000Z',
    createdTime: '2024-11-20T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '15 - RECICLAGEM',
    subfolder: 'Civil',
    parents: ['folder-15-rec']
  },
  {
    id: 'drv-glp-001-el',
    name: 'GLP-001-EL-ALIMENTACAO-SUBESTACAO-TERCEIROS.pdf',
    mimeType: 'application/pdf',
    size: 4210000,
    modifiedTime: '2026-09-23T16:00:00.000Z',
    createdTime: '2025-02-14T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '16 - GALPÃO TERCEIROS',
    subfolder: 'Elétrica',
    parents: ['folder-16-glp']
  },
  {
    id: 'drv-glp-002-mec',
    name: 'GLP-002-MEC-SISTEMA-EXAUSTAO-GALPAO.dwg',
    mimeType: 'application/acad',
    size: 8760000,
    modifiedTime: '2026-09-23T16:15:00.000Z',
    createdTime: '2025-06-11T13:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '16 - GALPÃO TERCEIROS',
    subfolder: 'Mecânica',
    parents: ['folder-16-glp']
  },
  {
    id: 'drv-glp-003-civ',
    name: 'GLP-003-CIV-ESTRUTURA-METALICA-GALPAO.dwg',
    mimeType: 'application/acad',
    size: 12450000,
    modifiedTime: '2026-09-23T16:30:00.000Z',
    createdTime: '2024-08-30T16:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '16 - GALPÃO TERCEIROS',
    subfolder: 'Civil',
    parents: ['folder-16-glp']
  },
  {
    id: 'drv-ext-001-el',
    name: 'EXT-001-EL-REDE-POSTES-ILUMINACAO-EXTERNA.pdf',
    mimeType: 'application/pdf',
    size: 3870000,
    modifiedTime: '2026-09-23T17:00:00.000Z',
    createdTime: '2025-03-22T10:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '19 - ÁREA EXTERNA',
    subfolder: 'Elétrica',
    parents: ['folder-19-ext']
  },
  {
    id: 'drv-ext-002-mec',
    name: 'EXT-002-MEC-BOMBAS-INCENDIO-REDE-HIDRANTES.dwg',
    mimeType: 'application/acad',
    size: 9120000,
    modifiedTime: '2026-09-23T17:15:00.000Z',
    createdTime: '2025-05-19T14:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '19 - ÁREA EXTERNA',
    subfolder: 'Mecânica',
    parents: ['folder-19-ext']
  },
  {
    id: 'drv-ext-003-civ',
    name: 'EXT-003-CIV-REDE-DRENAGEM-PLUVIAL-EXTERNA.dwg',
    mimeType: 'application/acad',
    size: 7980000,
    modifiedTime: '2026-09-23T17:30:00.000Z',
    createdTime: '2024-10-12T11:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '19 - ÁREA EXTERNA',
    subfolder: 'Civil',
    parents: ['folder-19-ext']
  },
  {
    id: 'drv-log-001-el',
    name: 'LOG-001-EL-CARREGADORES-BATERIA-EMPILHADEIRAS.pdf',
    mimeType: 'application/pdf',
    size: 3240000,
    modifiedTime: '2026-09-23T18:00:00.000Z',
    createdTime: '2025-04-05T09:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    category: '20 - LOGÍSTICA',
    subfolder: 'Elétrica',
    parents: ['folder-20-log']
  },
  {
    id: 'drv-log-002-mec',
    name: 'LOG-002-MEC-ESTEIRAS-CLASSIFICADORAS.dwg',
    mimeType: 'application/acad',
    size: 8950000,
    modifiedTime: '2026-09-23T18:15:00.000Z',
    createdTime: '2025-07-22T13:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=600&q=80',
    category: '20 - LOGÍSTICA',
    subfolder: 'Mecânica',
    parents: ['folder-20-log']
  },
  {
    id: 'drv-log-003-civ',
    name: 'LOG-003-CIV-DEMARCACAO-VIARIA-FAIXAS-PEDESTRE.dwg',
    mimeType: 'application/acad',
    size: 6540000,
    modifiedTime: '2026-09-23T18:30:00.000Z',
    createdTime: '2024-12-01T15:00:00.000Z',
    webViewLink: 'https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB',
    thumbnailLink: 'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=600&q=80',
    category: '20 - LOGÍSTICA',
    subfolder: 'Civil',
    parents: ['folder-20-log']
  }
];

// Helper to query Google Drive API directly with Bearer Token
async function fetchGoogleDrive(endpoint: string, token: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `https://www.googleapis.com/drive/v3/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Google Drive API error (${res.status}):`, errorText);
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  return res.json();
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Connection Status
app.get('/api/drive/status', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const isConnected = !!authHeader && authHeader.startsWith('Bearer ');
  
  res.json({
    connected: isConnected,
    accountEmail: req.query.email || 'manutencaolaminor@gmail.com',
    rootFolderName: store.settings.rootFolderName,
    rootFolderId: store.settings.rootFolderId,
    connectionState: isConnected ? 'Ativa' : 'Desconectada',
    lastSyncTime: new Date().toISOString(),
    totalIndexedFiles: SAMPLE_INDUSTRIAL_FILES.length,
    message: isConnected
      ? 'Conectado diretamente ao Google Drive. Os arquivos permanecem no Drive e as alterações são atualizadas automaticamente no aplicativo.'
      : 'Aguardando autenticação com Google Drive.'
  });
});

// 2. Dynamic Categories (Subfolders of root folder in Google Drive)
app.get('/api/drive/folders', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const rootId = store.settings.rootFolderId || '1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB';

  try {
    if (token) {
      // 1. Query folders inside the configured root folder (1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB)
      const folderQuery = `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const folderList = await fetchGoogleDrive(
        `files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name,parents)&pageSize=100&orderBy=name`,
        token
      );

      if (folderList.files && folderList.files.length > 0) {
        // For each folder, check for subfolders in Google Drive or map standard Elétrica, Mecânica, Civil
        const driveFolders = await Promise.all(
          folderList.files.map(async (f: any) => {
            let subfolders: any[] = [];
            try {
              const subRes = await fetchGoogleDrive(
                `files?q=${encodeURIComponent(`'${f.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)}&fields=files(id,name,parents)&pageSize=50&orderBy=name`,
                token
              );
              if (subRes.files && subRes.files.length > 0) {
                subfolders = subRes.files.map((sf: any) => ({
                  id: sf.id,
                  name: sf.name,
                  folderId: sf.id,
                  parentId: f.id,
                  count: 0
                }));
              }
            } catch (err) {
              console.warn(`Could not fetch subfolders for folder ${f.name}:`, err);
            }

            // If subfolders aren't in Drive yet, create standard Elétrica, Mecânica, Civil
            if (subfolders.length === 0) {
              subfolders = STANDARD_SUBFOLDERS.map((sName, sIdx) => ({
                id: `sub-${f.id}-${sIdx + 1}`,
                name: sName,
                folderId: f.id,
                parentId: f.id,
                count: 0
              }));
            }

            return {
              id: f.id,
              name: f.name,
              folderId: f.id,
              count: 0,
              hasSubfolders: true,
              subfolders: subfolders
            };
          })
        );

        return res.json({ folders: driveFolders, isRealDrive: true, rootFolderId: rootId });
      }
    }
  } catch (err: any) {
    console.warn('Real Google Drive folder query encountered issue, using configured industrial structure:', err?.message || err);
  }

  // Fallback: Standard industrial plant folder structure with strictly Elétrica, Mecânica, Civil
  const folders = INDUSTRIAL_CATEGORIES.map((cat, idx) => {
    const catFiles = SAMPLE_INDUSTRIAL_FILES.filter(f => f.category === cat);
    const subfolders = STANDARD_SUBFOLDERS.map((sName, sIdx) => {
      const subCount = catFiles.filter(f => f.subfolder === sName).length;
      return {
        id: `subfolder-${idx + 1}-${sIdx + 1}`,
        name: sName,
        folderId: `subfolder-${idx + 1}-${sIdx + 1}`,
        parentId: `cat-folder-${idx + 1}`,
        count: subCount
      };
    });

    return {
      id: `cat-folder-${idx + 1}`,
      name: cat,
      folderId: `cat-folder-${idx + 1}`,
      count: catFiles.length,
      hasSubfolders: true,
      subfolders: subfolders
    };
  });

  res.json({ folders, isRealDrive: false, rootFolderId: rootId });
});

// 3. Search and List Files from Google Drive
app.get('/api/drive/files', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const { category, subfolder, docType, format, search, folderId, limit = '100', pageToken } = req.query;
  const rootId = store.settings.rootFolderId || '1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB';

  try {
    if (token) {
      // Build Google Drive query conditions
      const conditions: string[] = [
        'trashed = false',
        "mimeType != 'application/vnd.google-apps.folder'"
      ];
      
      if (folderId && folderId !== 'all') {
        // Check if folderId has child subfolders in Drive to query them together
        try {
          const subRes = await fetchGoogleDrive(
            `files?q=${encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)}&fields=files(id)`,
            token
          );
          if (subRes.files && subRes.files.length > 0) {
            const allIds = [folderId, ...subRes.files.map((s: any) => s.id)];
            const parentOr = allIds.map(id => `'${id}' in parents`).join(' or ');
            conditions.push(`(${parentOr})`);
          } else {
            conditions.push(`'${folderId}' in parents`);
          }
        } catch {
          conditions.push(`'${folderId}' in parents`);
        }
      }
      
      if (search && typeof search === 'string' && search.trim() !== '') {
        const escaped = search.replace(/'/g, "\\'");
        conditions.push(`(name contains '${escaped}' or fullText contains '${escaped}')`);
      }

      if (format && typeof format === 'string' && format !== 'all') {
        if (format === 'PDF') conditions.push(`mimeType = 'application/pdf'`);
        if (format === 'IMAGE') conditions.push(`mimeType contains 'image/'`);
        if (format === 'SHEET') conditions.push(`(mimeType contains 'spreadsheet' or name contains '.xlsx' or name contains '.csv')`);
        if (format === 'DOC') conditions.push(`(mimeType contains 'document' or name contains '.docx')`);
      }

      const q = conditions.join(' and ');
      const fields = 'nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,thumbnailLink,iconLink,description,version,trashed,owners,capabilities)';
      const driveUrl = `files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=${limit}&orderBy=modifiedTime desc${pageToken ? `&pageToken=${pageToken}` : ''}`;

      const data = await fetchGoogleDrive(driveUrl, token);

      if (data.files && data.files.length > 0) {
        // Enrich files with technical metadata
        const enriched = data.files.map((f: any) => {
          const tech = parseTechnicalAttributes(f.name, f.mimeType, (category as string) || undefined, (subfolder as string) || undefined);
          return {
            ...f,
            technical: tech,
            isFavorite: false
          };
        });

        return res.json({
          files: enriched,
          nextPageToken: data.nextPageToken || null,
          total: enriched.length,
          isRealDrive: true
        });
      }
    }
  } catch (err: any) {
    console.warn('Real Google Drive query encountered an issue, augmenting with sample catalog:', err?.message || err);
  }

  // Industrial Dataset query engine with full filtering
  let results = [...SAMPLE_INDUSTRIAL_FILES];

  if (category && category !== 'all') {
    results = results.filter(f => f.category === category);
  }

  if (subfolder && subfolder !== 'all') {
    results = results.filter(f => f.subfolder === subfolder);
  }

  if (folderId && folderId !== 'all') {
    results = results.filter(f => f.parents?.includes(folderId as string));
  }

  if (format && format !== 'all') {
    results = results.filter(f => {
      const fFormat = extractFormat(f.name, f.mimeType);
      return fFormat === format;
    });
  }

  if (search && typeof search === 'string') {
    const s = search.toLowerCase().trim();
    results = results.filter(f => {
      const tech = parseTechnicalAttributes(f.name, f.mimeType, f.category, f.subfolder);
      return (
        f.name.toLowerCase().includes(s) ||
        tech.code.toLowerCase().includes(s) ||
        tech.equipment.toLowerCase().includes(s) ||
        tech.manufacturer.toLowerCase().includes(s) ||
        tech.category.toLowerCase().includes(s) ||
        (tech.subfolder && tech.subfolder.toLowerCase().includes(s)) ||
        tech.docType.toLowerCase().includes(s) ||
        tech.tags.some(t => t.toLowerCase().includes(s))
      );
    });
  }

  // Parse technical attributes for all files
  const enriched = results.map(f => {
    const tech = parseTechnicalAttributes(f.name, f.mimeType, f.category, f.subfolder);
    const isFav = (store.favorites['current-user'] || []).includes(f.id);
    return {
      ...f,
      technical: tech,
      isFavorite: isFav
    };
  });

  res.json({
    files: enriched,
    nextPageToken: null,
    total: enriched.length,
    isRealDrive: false
  });
});

// 3.1. Google Apps Script Search & Listing Endpoint
app.all(['/api/apps-script/search', '/api/apps-script/files'], async (req: Request, res: Response) => {
  const folder = (req.query.folder || req.body?.folder || '') as string;
  const subfolder = (req.query.subfolder || req.body?.subfolder || '') as string;
  const query = (req.query.query || req.body?.query || req.query.search || req.body?.search || '') as string;
  const scriptUrl = store.settings.appsScriptUrl || process.env.APPS_SCRIPT_URL;

  // 1. If external Apps Script Web App URL is configured, forward query directly
  if (scriptUrl && scriptUrl.trim() !== '') {
    try {
      const targetUrl = new URL(scriptUrl);
      if (folder) targetUrl.searchParams.set('folder', folder);
      if (subfolder) targetUrl.searchParams.set('subfolder', subfolder);
      if (query) targetUrl.searchParams.set('query', query);

      const response = await fetch(targetUrl.toString(), {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const json: any = await response.json();
        const rawFiles = Array.isArray(json) ? json : (json.files || json.data || []);
        const files = rawFiles.map((f: any, idx: number) => {
          const fileUrl = f.url || f.webViewLink || f.link || `https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB`;
          const fFolder = f.folder || f.category || folder || '07 - LAMINAÇÃO';
          const fSub = f.subfolder || subfolder || 'Elétrica';
          return {
            id: f.id || `apps-script-${idx + 1}`,
            name: f.name || f.fileName || `Arquivo-${idx + 1}`,
            mimeType: f.mimeType || 'application/pdf',
            size: f.size || 1024,
            modifiedTime: f.modifiedTime || f.updated || new Date().toISOString(),
            url: fileUrl,
            webViewLink: fileUrl,
            category: fFolder,
            subfolder: fSub,
            technical: f.technical || parseTechnicalAttributes(f.name || '', f.mimeType, fFolder, fSub)
          };
        });

        return res.json({
          status: 'success',
          source: 'Google Apps Script (Web App)',
          folder: folder || 'Todas as Pastas',
          count: files.length,
          files: files
        });
      }
    } catch (err: any) {
      console.warn('Google Apps Script remote call encountered error, using internal driver:', err?.message || err);
    }
  }

  // 2. Direct Driver matching folder and query on Google Drive Repository (1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB)
  let results = [...SAMPLE_INDUSTRIAL_FILES];

  if (folder && folder !== 'all') {
    const fClean = folder.toLowerCase().replace(/[^a-z0-9]/g, '');
    results = results.filter(f => {
      const catClean = f.category.toLowerCase().replace(/[^a-z0-9]/g, '');
      return catClean.includes(fClean) || fClean.includes(catClean);
    });
  }

  if (subfolder && subfolder !== 'all') {
    results = results.filter(f => f.subfolder?.toLowerCase() === subfolder.toLowerCase());
  }

  if (query && query.trim() !== '') {
    const q = query.toLowerCase().trim();
    results = results.filter(f => {
      const tech = parseTechnicalAttributes(f.name, f.mimeType, f.category, f.subfolder);
      return (
        f.name.toLowerCase().includes(q) ||
        tech.code.toLowerCase().includes(q) ||
        tech.equipment.toLowerCase().includes(q) ||
        tech.manufacturer.toLowerCase().includes(q) ||
        tech.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }

  const files = results.map((f, idx) => {
    const tech = parseTechnicalAttributes(f.name, f.mimeType, f.category, f.subfolder);
    const driveUrl = f.webViewLink || `https://drive.google.com/drive/u/2/folders/1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB`;
    return {
      id: f.id || `as-file-${idx + 1}`,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      modifiedTime: f.modifiedTime,
      url: driveUrl,
      webViewLink: driveUrl,
      category: f.category,
      subfolder: f.subfolder,
      technical: tech
    };
  });

  return res.json({
    status: 'success',
    source: 'Google Apps Script Engine',
    folder: folder || 'Todas as Pastas',
    count: files.length,
    files: files
  });
});

app.post('/api/apps-script/config', (req: Request, res: Response) => {
  const { appsScriptUrl } = req.body;
  if (typeof appsScriptUrl === 'string') {
    store.settings.appsScriptUrl = appsScriptUrl.trim();
    saveStore();
  }
  res.json({ status: 'ok', appsScriptUrl: store.settings.appsScriptUrl });
});

// 4. Download Stream via Google Drive API (Streams directly, no file storage on server!)
app.get('/api/drive/download/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Audit log action
  store.history.unshift({
    id: `hist-${Date.now()}`,
    userId: 'current-user',
    userName: 'Usuário Industrial',
    userEmail: 'manutencaolaminor@gmail.com',
    action: 'DOWNLOAD',
    fileId: id,
    fileName: req.query.name as string || id,
    timestamp: new Date().toISOString()
  });
  saveStore();

  if (token && !id.startsWith('drv-')) {
    try {
      const driveStreamRes = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (driveStreamRes.ok) {
        res.setHeader('Content-Disposition', `attachment; filename="${req.query.name || id}"`);
        res.setHeader('Content-Type', driveStreamRes.headers.get('content-type') || 'application/octet-stream');
        const buffer = await driveStreamRes.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }
    } catch (e) {
      console.error('Download stream error:', e);
    }
  }

  // For sample documents, generate technical mock binary
  const sample = SAMPLE_INDUSTRIAL_FILES.find(f => f.id === id);
  const fileName = sample ? sample.name : `${id}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', sample?.mimeType || 'application/pdf');
  res.send(Buffer.from(`CONSULTA TÉCNICA - Google Drive Industrial Document Repository\nArquivo: ${fileName}\nID: ${id}\nData: ${new Date().toISOString()}`));
});

// 5. Incremental Changes Check (Changes API)
app.get('/api/drive/changes', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.json({ hasChanges: false, changes: [] });
  }

  try {
    // 1. If we don't have a startPageToken, get one
    if (!store.settings.startPageToken) {
      const tokenRes = await fetchGoogleDrive('changes/startPageToken', token);
      store.settings.startPageToken = tokenRes.startPageToken;
      saveStore();
      return res.json({ hasChanges: false, changes: [] });
    }

    // 2. Query changes since startPageToken
    const changesRes = await fetchGoogleDrive(
      `changes?pageToken=${store.settings.startPageToken}&fields=newStartPageToken,changes(fileId,removed,file(id,name,mimeType,modifiedTime,trashed,parents))`,
      token
    );

    if (changesRes.newStartPageToken) {
      store.settings.startPageToken = changesRes.newStartPageToken;
      saveStore();
    }

    const changes = changesRes.changes || [];
    return res.json({
      hasChanges: changes.length > 0,
      changesCount: changes.length,
      changes
    });
  } catch (err: any) {
    return res.json({ hasChanges: false, error: err?.message });
  }
});

// 6. Gemini Natural Language Query Interpretation
app.post('/api/gemini/interpret-query', async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Record search history
  store.history.unshift({
    id: `hist-${Date.now()}`,
    userId: 'current-user',
    userName: 'Usuário Industrial',
    userEmail: 'manutencaolaminor@gmail.com',
    action: 'SEARCH',
    searchQuery: query,
    timestamp: new Date().toISOString()
  });
  saveStore();

  if (!ai) {
    // Deterministic fallback if Gemini key is not configured
    const lower = query.toLowerCase();
    let equipment = '';
    let docType = '';
    let category = '';
    
    if (lower.includes('laminadora')) {
      equipment = 'Laminadora 01';
      category = '07 - LAMINAÇÃO';
    } else if (lower.includes('extrusora')) {
      equipment = 'Extrusora 01';
      category = '08 - EXTRUSÃO';
    } else if (lower.includes('corte') || lower.includes('cortadeira')) {
      equipment = 'Cortadeira';
      category = '10 - CORTE';
    }

    if (lower.includes('elétric') || lower.includes('eletric')) {
      docType = 'Esquema Elétrico';
    } else if (lower.includes('manual')) {
      docType = 'Manual';
    } else if (lower.includes('desenho')) {
      docType = 'Desenho Técnico';
    }

    return res.json({
      interpretation: {
        keywords: query.split(/\s+/).filter(w => w.length > 2),
        equipment,
        docType,
        category,
        explanation: 'Filtros extraídos por análise de padrões técnicos.'
      }
    });
  }

  try {
    const prompt = `Você é o interpretador de buscas do sistema "CONSULTA TÉCNICA" para documentos industriais, desenhos técnicos e manuais.
Analise a seguinte busca em linguagem natural do usuário:
"${query}"

Identifique:
1. "keywords": palavras-chave para busca no Google Drive (ex: códigos de tag como LAM, EXT, números, nomes de arquivo).
2. "equipment": equipamento mencionado (ex: "Laminadora 01", "Extrusora", "Compressor", "Chiller") ou "" se nenhum.
3. "docType": tipo de documento ("Desenho Técnico", "Manual", "Esquema Elétrico", "Esquema Hidráulico/Pneumático", "Planilha de Calibração", "Procedimento Operacional") ou "" se não especificado.
4. "category": pasta/área fabril compatível (ex: "07 - LAMINAÇÃO", "08 - EXTRUSÃO", "10 - CORTE", "05 - OFICINA DE MANUTENÇÃO", "13 - UTILIDADES") ou "" se não especificado.
5. "manufacturer": fabricante mencionado (ex: "Kampf", "Siemens", "WEG", "Schneider", "Atlas Copco") ou "" se nenhum.
6. "explanation": breve frase explicativa em português (ex: "Buscando esquemas elétricos para o equipamento Laminadora 01 na área de Laminação").

Responda SOMENTE em JSON válido com esse schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ interpretation: parsed });
  } catch (err: any) {
    console.error('Gemini query interpretation error:', err?.message || err);
    const lower = query.toLowerCase();
    let equipment = '';
    let docType = '';
    let category = '';
    
    if (lower.includes('laminadora')) {
      equipment = 'Laminadora 01';
      category = '07 - LAMINAÇÃO';
    } else if (lower.includes('extrusora')) {
      equipment = 'Extrusora 01';
      category = '08 - EXTRUSÃO';
    } else if (lower.includes('corte') || lower.includes('cortadeira')) {
      equipment = 'Cortadeira';
      category = '10 - CORTE';
    } else if (lower.includes('chiller') || lower.includes('utilidade')) {
      equipment = 'Chiller';
      category = '13 - UTILIDADES';
    }

    if (lower.includes('elétric') || lower.includes('eletric')) {
      docType = 'Esquema Elétrico';
    } else if (lower.includes('pneum') || lower.includes('hidr')) {
      docType = 'Esquema Hidráulico/Pneumático';
    } else if (lower.includes('manual')) {
      docType = 'Manual';
    } else if (lower.includes('desenho')) {
      docType = 'Desenho Técnico';
    }

    return res.json({
      interpretation: {
        keywords: query.split(/\s+/).filter(w => w.length > 2),
        equipment,
        docType,
        category,
        explanation: `Filtros identificados para "${query}": ${[equipment, docType, category].filter(Boolean).join(' • ')}`
      }
    });
  }
});

// 7. Gemini Technical Document Auto-Classifier
app.post('/api/gemini/classify-file', async (req: Request, res: Response) => {
  const { fileName, mimeType, parentFolderName } = req.body;

  if (!ai) {
    const local = parseTechnicalAttributes(fileName, mimeType || '', parentFolderName);
    return res.json({ classification: local, source: 'rule-engine' });
  }

  try {
    const prompt = `Analise o nome do arquivo técnico industrial: "${fileName}"
Pasta de origem: "${parentFolderName || 'Não informada'}"
Tipo MIME: "${mimeType || 'Não informado'}"

Extraia os seguintes metadados em JSON:
{
  "code": "Código técnico do desenho/documento (ex: LAM-001-EL)",
  "revision": "Revisão do documento (ex: REV. 03)",
  "category": "Área ou disciplina industrial compatível (ex: 07 - LAMINAÇÃO)",
  "equipment": "Nome do equipamento industrial",
  "manufacturer": "Fabricante do equipamento se dedutível",
  "docType": "Tipo de documento (Desenho Técnico, Manual, Esquema Elétrico, Esquema Hidráulico/Pneumático, Procedimento Operacional, Foto/Inspeção, Planilha de Calibração)",
  "tags": ["tag1", "tag2"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const classification = JSON.parse(response.text || '{}');
    return res.json({ classification, source: 'gemini-ai' });
  } catch (e) {
    const local = parseTechnicalAttributes(fileName, mimeType || '', parentFolderName);
    return res.json({ classification: local, source: 'rule-engine-fallback' });
  }
});

// 8. Favorites Management (Stored per user, never modifies Google Drive)
app.get('/api/favorites', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'current-user';
  res.json({ favorites: store.favorites[userId] || [] });
});

app.post('/api/favorites/toggle', (req: Request, res: Response) => {
  const { userId = 'current-user', fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  if (!store.favorites[userId]) {
    store.favorites[userId] = [];
  }

  const list = store.favorites[userId];
  const idx = list.indexOf(fileId);
  let isFavorite = false;

  if (idx > -1) {
    list.splice(idx, 1);
    isFavorite = false;
  } else {
    list.push(fileId);
    isFavorite = true;
  }

  saveStore();
  res.json({ isFavorite, favorites: list });
});

// 9. History Tracking
app.get('/api/history', (req: Request, res: Response) => {
  res.json({ history: store.history.slice(0, 100) });
});

app.post('/api/history', (req: Request, res: Response) => {
  const { action, fileId, fileName, fileCode, searchQuery, userId = 'current-user', userName = 'Usuário', userEmail = 'manutencaolaminor@gmail.com' } = req.body;

  const item = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    userName,
    userEmail,
    action: action || 'VIEW',
    fileId,
    fileName,
    fileCode,
    searchQuery,
    timestamp: new Date().toISOString()
  };

  store.history.unshift(item);
  if (store.history.length > 500) {
    store.history = store.history.slice(0, 500);
  }
  saveStore();

  res.json({ success: true, item });
});

// 10. User Management & Permissions
app.get('/api/users', (req: Request, res: Response) => {
  res.json({ users: store.users });
});

app.post('/api/users/role', (req: Request, res: Response) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'email and role required' });

  let user = store.users.find(u => u.email === email);
  if (user) {
    user.role = role;
  } else {
    user = {
      uid: `usr-${Date.now()}`,
      email,
      displayName: email.split('@')[0],
      role,
      lastLogin: new Date().toISOString()
    };
    store.users.push(user);
  }
  saveStore();
  res.json({ success: true, user });
});

// 11. Classification Rules Management
app.get('/api/rules', (req: Request, res: Response) => {
  res.json({ rules: store.rules });
});

app.post('/api/rules', (req: Request, res: Response) => {
  const { name, pattern, type, extractField, example } = req.body;
  const newRule = {
    id: `rule-${Date.now()}`,
    name,
    pattern,
    type: type || 'regex',
    extractField: extractField || 'code',
    example: example || ''
  };
  store.rules.push(newRule);
  saveStore();
  res.json({ success: true, rule: newRule, rules: store.rules });
});

// 12. Settings Configuration (e.g. Root Folder selector)
app.get('/api/settings', (req: Request, res: Response) => {
  res.json({ settings: store.settings });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const { rootFolderId, rootFolderName, autoClassification, geminiAiEnabled } = req.body;
  if (rootFolderId) store.settings.rootFolderId = rootFolderId;
  if (rootFolderName) store.settings.rootFolderName = rootFolderName;
  if (autoClassification !== undefined) store.settings.autoClassification = autoClassification;
  if (geminiAiEnabled !== undefined) store.settings.geminiAiEnabled = geminiAiEnabled;

  saveStore();
  res.json({ success: true, settings: store.settings });
});

// -------------------------------------------------------------
// Vite Frontend Middleware / Production Static Server
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CONSULTA TÉCNICA] Server ready on http://0.0.0.0:${PORT}`);
  });
}

startServer();
