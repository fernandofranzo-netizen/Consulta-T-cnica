import { TechnicalDocument, DriveFolder, HistoryItem, UserProfile, ClassificationRule, DriveConnectionStatus } from '../types';
import { getAccessToken } from './firebase';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  return res.json();
}

export async function fetchDriveStatus(email?: string): Promise<DriveConnectionStatus> {
  const token = await getAccessToken();
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return fetchWithAuth(`/api/drive/status${query}`);
}

export async function fetchDriveFolders(): Promise<{ folders: DriveFolder[]; isRealDrive: boolean; rootFolderId: string }> {
  return fetchWithAuth('/api/drive/folders');
}

export interface FileQueryParams {
  category?: string;
  subfolder?: string;
  docType?: string;
  format?: string;
  search?: string;
  folderId?: string;
  limit?: number;
  pageToken?: string;
}

export async function fetchDriveFiles(params: FileQueryParams = {}): Promise<{
  files: TechnicalDocument[];
  nextPageToken: string | null;
  total: number;
  isRealDrive: boolean;
}> {
  const queryParts: string[] = [];
  if (params.category && params.category !== 'all') queryParts.push(`category=${encodeURIComponent(params.category)}`);
  if (params.subfolder && params.subfolder !== 'all') queryParts.push(`subfolder=${encodeURIComponent(params.subfolder)}`);
  if (params.docType && params.docType !== 'all') queryParts.push(`docType=${encodeURIComponent(params.docType)}`);
  if (params.format && params.format !== 'all') queryParts.push(`format=${encodeURIComponent(params.format)}`);
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.folderId && params.folderId !== 'all') queryParts.push(`folderId=${encodeURIComponent(params.folderId)}`);
  if (params.limit) queryParts.push(`limit=${params.limit}`);
  if (params.pageToken) queryParts.push(`pageToken=${encodeURIComponent(params.pageToken)}`);

  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return fetchWithAuth(`/api/drive/files${qs}`);
}

export async function checkDriveChanges(): Promise<{ hasChanges: boolean; changesCount?: number; changes?: any[] }> {
  return fetchWithAuth('/api/drive/changes');
}

export async function interpretNaturalQuery(query: string) {
  return fetchWithAuth('/api/gemini/interpret-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
}

export async function classifyFileWithGemini(fileName: string, mimeType?: string, parentFolderName?: string) {
  return fetchWithAuth('/api/gemini/classify-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, mimeType, parentFolderName })
  });
}

export async function toggleFileFavorite(fileId: string, userId = 'current-user'): Promise<{ isFavorite: boolean; favorites: string[] }> {
  return fetchWithAuth('/api/favorites/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, userId })
  });
}

export async function fetchFavorites(userId = 'current-user'): Promise<{ favorites: string[] }> {
  return fetchWithAuth(`/api/favorites?userId=${encodeURIComponent(userId)}`);
}

export async function logUserHistory(data: {
  action: 'VIEW' | 'SEARCH' | 'DOWNLOAD' | 'OPEN_DRIVE';
  fileId?: string;
  fileName?: string;
  fileCode?: string;
  searchQuery?: string;
  userName?: string;
  userEmail?: string;
}) {
  return fetchWithAuth('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function fetchHistory(): Promise<{ history: HistoryItem[] }> {
  return fetchWithAuth('/api/history');
}

export async function fetchUsers(): Promise<{ users: UserProfile[] }> {
  return fetchWithAuth('/api/users');
}

export async function updateUserRole(email: string, role: string) {
  return fetchWithAuth('/api/users/role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role })
  });
}

export async function fetchRules(): Promise<{ rules: ClassificationRule[] }> {
  return fetchWithAuth('/api/rules');
}

export async function addClassificationRule(rule: Partial<ClassificationRule>) {
  return fetchWithAuth('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
}

export async function fetchAppSettings() {
  return fetchWithAuth('/api/settings');
}

export async function updateAppSettings(settings: any) {
  return fetchWithAuth('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
}

export async function searchViaAppsScript(folder?: string, query?: string, subfolder?: string): Promise<{
  status: string;
  source: string;
  folder: string;
  count: number;
  files: TechnicalDocument[];
}> {
  const params = new URLSearchParams();
  if (folder) params.set('folder', folder);
  if (query) params.set('query', query);
  if (subfolder) params.set('subfolder', subfolder);

  const res = await fetch(`/api/apps-script/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Google Apps Script search failed: ${res.statusText}`);
  }
  return res.json();
}

export async function updateAppsScriptConfig(appsScriptUrl: string) {
  const res = await fetch('/api/apps-script/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appsScriptUrl })
  });
  return res.json();
}

