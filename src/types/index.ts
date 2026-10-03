export type UserRole = 'Administrador' | 'Supervisor' | 'Usuário';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
}

export type FileFormat = 
  | 'PDF' 
  | 'DWG' 
  | 'DXF' 
  | 'STEP' 
  | 'STP' 
  | 'IMAGE' 
  | 'DOC' 
  | 'SHEET' 
  | 'SLIDE' 
  | 'CAD' 
  | 'OTHER';

export type DocType = 
  | 'Desenho Técnico' 
  | 'Manual' 
  | 'Esquema Elétrico' 
  | 'Esquema Hidráulico/Pneumático' 
  | 'Procedimento Operacional' 
  | 'Catálogo Técnico' 
  | 'Planilha de Calibração' 
  | 'Foto/Inspeção' 
  | 'Outro';

export interface TechnicalMetadata {
  code: string;
  revision: string;
  category: string;
  subfolder?: string;
  equipment: string;
  manufacturer: string;
  docType: DocType;
  tags: string[];
  fileFormat: FileFormat;
  folderName?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number | string;
  modifiedTime: string;
  createdTime?: string;
  parents?: string[];
  url?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  description?: string;
  version?: string;
  trashed?: boolean;
  capabilities?: {
    canDownload?: boolean;
    canEdit?: boolean;
  };
  owners?: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  fullFileExtension?: string;
}

export interface TechnicalDocument extends DriveFile {
  technical: TechnicalMetadata;
  isFavorite?: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  folderId: string;
  count: number;
  parentId?: string;
  subfolders?: DriveFolder[];
  hasSubfolders?: boolean;
}

export interface HistoryItem {
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
}

export interface ClassificationRule {
  id: string;
  name: string;
  pattern: string;
  type: 'regex' | 'prefix' | 'keyword';
  extractField: 'code' | 'revision' | 'category' | 'equipment' | 'manufacturer';
  example: string;
}

export interface DriveConnectionStatus {
  connected: boolean;
  accountEmail: string;
  rootFolderName: string;
  rootFolderId: string;
  connectionState: 'Ativa' | 'Conectando' | 'Desconectada';
  lastSyncTime: string;
  totalIndexedFiles: number;
  message: string;
}

export interface FilterState {
  searchQuery: string;
  category: string;
  docType: string;
  fileFormat: string;
  equipment: string;
  manufacturer: string;
  revision: string;
  tag: string;
  dateRange: 'all' | '7d' | '30d' | '90d' | '1y';
  onlyFavorites: boolean;
  sortBy: 'modifiedDesc' | 'modifiedAsc' | 'nameAsc' | 'codeAsc';
}
