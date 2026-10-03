import React, { useState, useEffect, useMemo } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './lib/firebase';
import { 
  fetchDriveStatus, 
  fetchDriveFolders, 
  fetchDriveFiles, 
  checkDriveChanges, 
  interpretNaturalQuery, 
  toggleFileFavorite, 
  fetchFavorites, 
  logUserHistory, 
  fetchHistory, 
  fetchUsers, 
  updateUserRole, 
  fetchRules, 
  addClassificationRule, 
  updateAppSettings,
  searchViaAppsScript
} from './lib/driveApi';
import { 
  TechnicalDocument, 
  DriveFolder, 
  UserProfile, 
  UserRole, 
  DriveConnectionStatus, 
  HistoryItem, 
  ClassificationRule, 
  FilterState 
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { QuickAccessCards } from './components/QuickAccessCards';
import { FileCard } from './components/FileCard';
import { FileTableView } from './components/FileTableView';
import { FileViewerModal } from './components/FileViewerModal';
import { AdvancedSearchModal } from './components/AdvancedSearchModal';
import { AdminPanel } from './components/AdminPanel';
import { HistoryModal } from './components/HistoryModal';
import { AuthModal } from './components/AuthModal';
import { SubfolderBar } from './components/SubfolderBar';
import { 
  LayoutGrid, 
  List, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  FileSearch,
  Filter,
  CheckCircle2,
  HardDrive,
  FolderGit2,
  LogIn,
  Bot
} from 'lucide-react';

export default function App() {
  // Authentication & User state
  const [user, setUser] = useState<UserProfile | null>({
    uid: 'admin-default',
    email: 'manutencaolaminor@gmail.com',
    displayName: 'Engenharia / Manutenção',
    role: 'Administrador'
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Drive Repository Data
  const [connectionStatus, setConnectionStatus] = useState<DriveConnectionStatus | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [documents, setDocuments] = useState<TechnicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navigation & Filtering State
  const [activeCategory, setActiveCategory] = useState<string>('05 - OFICINA DE MANUTENÇÃO');
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>('Elétrica');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    '05 - OFICINA DE MANUTENÇÃO': true
  });
  const [quickAccessFilter, setQuickAccessFilter] = useState<'all' | 'cad' | 'images' | 'pdfs' | 'manuals'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modals & Panels State
  const [selectedDoc, setSelectedDoc] = useState<TechnicalDocument | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // AI Interpretation & Assistant
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [assistantResult, setAssistantResult] = useState<{
    active: boolean;
    folder: string;
    source: string;
    count: number;
  } | null>(null);

  // History, Users & Rules
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Advanced Filters State
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'all',
    docType: 'all',
    fileFormat: 'all',
    equipment: '',
    manufacturer: '',
    revision: '',
    tag: '',
    dateRange: 'all',
    onlyFavorites: false,
    sortBy: 'modifiedDesc'
  });

  // 1. Initial Load & Firebase Auth Listener
  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = initAuth(
      (firebaseUser, token) => {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'manutencaolaminor@gmail.com',
          displayName: firebaseUser.displayName || 'Engenheiro Industrial',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'Administrador'
        });
        loadDriveData();
      },
      () => {
        // Fallback user if not logged into Firebase yet
        loadDriveData();
      }
    );

    loadDriveData();

    // 2. Incremental Google Drive Changes Listener (Section 6)
    const interval = setInterval(async () => {
      try {
        const changes = await checkDriveChanges();
        if (changes.hasChanges) {
          console.log(`[Google Drive Changes] Detected ${changes.changesCount} change(s). Updating metadata...`);
          loadDriveData(false);
        }
      } catch (e) {
        // Silently handle transient network errors
      }
    }, 25000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Main data loader from Google Drive API
  const loadDriveData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Connection status
      const status = await fetchDriveStatus(user?.email);
      setConnectionStatus(status);

      // 2. Folders (Categories from Drive)
      const folderRes = await fetchDriveFolders();
      setFolders(folderRes.folders);

      // 3. Files
      const filesRes = await fetchDriveFiles();
      setDocuments(filesRes.files);

      // 4. Favorites & History
      const favRes = await fetchFavorites(user?.uid || 'current-user');
      setFavorites(favRes.favorites || []);

      const histRes = await fetchHistory();
      setHistory(histRes.history || []);

      const usrRes = await fetchUsers();
      setUsersList(usrRes.users || []);

      const ruleRes = await fetchRules();
      setRules(ruleRes.rules || []);

    } catch (err) {
      console.error('Error loading Google Drive data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser({
          uid: res.user.uid,
          email: res.user.email || 'manutencaolaminor@gmail.com',
          displayName: res.user.displayName || 'Usuário Google Drive',
          photoURL: res.user.photoURL || undefined,
          role: 'Administrador'
        });
        setIsAuthModalOpen(false);
        loadDriveData();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao autenticar com Google Drive.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    loadDriveData();
  };

  // AI Interpretation of Technical Queries
  const handleAiInterpretation = async () => {
    if (!searchQuery.trim()) return;
    setIsAiLoading(true);
    setAiNotice(null);

    try {
      const data = await interpretNaturalQuery(searchQuery);
      if (data.interpretation) {
        const interp = data.interpretation;
        setAiNotice(interp.explanation || 'Consulta técnica interpretada com sucesso.');

        // Update filters based on AI
        setAdvancedFilters(prev => ({
          ...prev,
          equipment: interp.equipment || prev.equipment,
          docType: interp.docType || prev.docType,
          category: interp.category || prev.category
        }));

        if (interp.category && interp.category !== 'all') {
          setActiveCategory(interp.category);
        }
      }
    } catch (err: any) {
      console.error('AI interpretation failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Google Apps Script Assistant Query Handler
  const detectFolderFromText = (text: string): string | null => {
    const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (t.includes('07') || t.includes('laminacao') || t.includes('laminadora')) return '07 - LAMINAÇÃO';
    if (t.includes('05') || t.includes('oficina') || t.includes('manutencao')) return '05 - OFICINA DE MANUTENÇÃO';
    if (t.includes('01') || t.includes('administrativo') || t.includes('adm')) return '01 - ADMINISTRATIVO';
    if (t.includes('02') || t.includes('qualidade') || t.includes('qld')) return '02 - CONTROLE DE QUALIDADE';
    if (t.includes('03') || t.includes('almoxarifado') || t.includes('alm')) return '03 - ALMOXARIFADO';
    if (t.includes('04') || t.includes('seguranca') || t.includes('nr12') || t.includes('spda')) return '04 - SEGURANÇA';
    if (t.includes('08') || t.includes('extrusao') || t.includes('extrusora')) return '08 - EXTRUSÃO';
    if (t.includes('10') || t.includes('corte') || t.includes('cortadeira')) return '10 - CORTE';
    if (t.includes('11') || t.includes('estoque')) return '11 - ESTOQUE';
    if (t.includes('12') || t.includes('doca') || t.includes('docas')) return '12 - DOCAS';
    if (t.includes('13') || t.includes('utilidades') || t.includes('chiller') || t.includes('compressor')) return '13 - UTILIDADES';
    if (t.includes('14') || t.includes('ferramentaria') || t.includes('matriz')) return '14 - FERRAMENTARIA';
    if (t.includes('15') || t.includes('reciclagem') || t.includes('moinho')) return '15 - RECICLAGEM';
    if (t.includes('16') || t.includes('terceiros') || t.includes('galpao')) return '16 - GALPÃO TERCEIROS';
    if (t.includes('19') || t.includes('externa')) return '19 - ÁREA EXTERNA';
    if (t.includes('20') || t.includes('logistica')) return '20 - LOGÍSTICA';
    return null;
  };

  const handleAssistantQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    const targetFolder = detectFolderFromText(queryText);
    try {
      const res = await searchViaAppsScript(targetFolder || undefined, queryText);
      if (res.files && res.files.length > 0) {
        setDocuments(res.files);
        setAssistantResult({
          active: true,
          folder: targetFolder || res.folder || 'Resultado da Busca',
          source: res.source,
          count: res.files.length
        });
        if (targetFolder) {
          setActiveCategory(targetFolder);
          setActiveSubfolder(null);
        }
      }
    } catch (e) {
      console.error('Apps Script Assistant error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (fileId: string) => {
    try {
      const res = await toggleFileFavorite(fileId, user?.uid || 'current-user');
      setFavorites(res.favorites);
      setDocuments(prev => prev.map(d => d.id === fileId ? { ...d, isFavorite: res.isFavorite } : d));
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
    }
  };

  // View Document in Modal
  const handleViewDocument = (doc: TechnicalDocument) => {
    setSelectedDoc(doc);
    // Log view action in history
    logUserHistory({
      action: 'VIEW',
      fileId: doc.id,
      fileName: doc.name,
      fileCode: doc.technical.code,
      userName: user?.displayName,
      userEmail: user?.email
    });
  };

  // Open in Google Drive
  const handleOpenInDrive = (doc: TechnicalDocument) => {
    logUserHistory({
      action: 'OPEN_DRIVE',
      fileId: doc.id,
      fileName: doc.name,
      fileCode: doc.technical.code,
      userName: user?.displayName,
      userEmail: user?.email
    });

    const url = doc.webViewLink || `https://drive.google.com/file/d/${doc.id}/view`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Download Document directly via Google Drive API stream
  const handleDownload = (doc: TechnicalDocument) => {
    logUserHistory({
      action: 'DOWNLOAD',
      fileId: doc.id,
      fileName: doc.name,
      fileCode: doc.technical.code,
      userName: user?.displayName,
      userEmail: user?.email
    });

    const link = document.createElement('a');
    link.href = `/api/drive/download/${doc.id}?name=${encodeURIComponent(doc.name)}`;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and Search Documents Computation
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const { technical } = doc;
      const isFav = favorites.includes(doc.id);

      // 1. Sidebar Category Filter
      // When a search query is active, search across the entire repository in CONSULTA IMAGENS E DESENHOS TÉCNICOS
      if (!searchQuery.trim()) {
        if (activeCategory !== 'all' && technical.category !== activeCategory) {
          return false;
        }

        // 1.1. Subfolder Filter (when specific subfolder is selected)
        if (activeCategory !== 'all' && activeSubfolder && activeSubfolder !== 'all') {
          if (technical.subfolder !== activeSubfolder) {
            return false;
          }
        }
      }

      // 2. Quick Access Cards Filter
      if (quickAccessFilter === 'cad') {
        const isCad = ['DWG', 'DXF', 'STEP', 'STP', 'CAD'].includes(technical.fileFormat) || technical.docType === 'Desenho Técnico';
        if (!isCad) return false;
      } else if (quickAccessFilter === 'images') {
        if (technical.fileFormat !== 'IMAGE' && !doc.mimeType.startsWith('image/')) return false;
      } else if (quickAccessFilter === 'pdfs') {
        if (technical.fileFormat !== 'PDF' && !doc.mimeType.includes('pdf')) return false;
      } else if (quickAccessFilter === 'manuals') {
        if (technical.docType !== 'Manual' && !doc.name.toLowerCase().includes('manual')) return false;
      }

      // 3. Search Query (Global Search Bar)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesCode = technical.code.toLowerCase().includes(q);
        const matchesEq = technical.equipment.toLowerCase().includes(q);
        const matchesMfg = technical.manufacturer.toLowerCase().includes(q);
        const matchesCat = technical.category.toLowerCase().includes(q);
        const matchesType = technical.docType.toLowerCase().includes(q);
        const matchesTag = technical.tags.some(t => t.toLowerCase().includes(q));

        if (!matchesName && !matchesCode && !matchesEq && !matchesMfg && !matchesCat && !matchesType && !matchesTag) {
          return false;
        }
      }

      // 4. Advanced Filters Modal
      if (advancedFilters.category !== 'all' && technical.category !== advancedFilters.category) {
        return false;
      }
      if (advancedFilters.fileFormat !== 'all' && technical.fileFormat !== advancedFilters.fileFormat) {
        return false;
      }
      if (advancedFilters.equipment && !technical.equipment.toLowerCase().includes(advancedFilters.equipment.toLowerCase())) {
        return false;
      }
      if (advancedFilters.manufacturer && !technical.manufacturer.toLowerCase().includes(advancedFilters.manufacturer.toLowerCase())) {
        return false;
      }
      if (advancedFilters.revision && !technical.revision.toLowerCase().includes(advancedFilters.revision.toLowerCase())) {
        return false;
      }
      if (advancedFilters.tag && !technical.tags.some(t => t.toLowerCase().includes(advancedFilters.tag.toLowerCase()))) {
        return false;
      }

      return true;
    });
  }, [documents, activeCategory, activeSubfolder, quickAccessFilter, searchQuery, advancedFilters]);

  // Dynamic distinct lists for filters
  const availableEquipments = useMemo(() => {
    return Array.from(new Set(documents.map(d => d.technical.equipment))).filter(Boolean);
  }, [documents]);

  const availableManufacturers = useMemo(() => {
    return Array.from(new Set(documents.map(d => d.technical.manufacturer))).filter(Boolean);
  }, [documents]);

  return (
    <div className="min-h-screen bg-[#060c1c] text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* 1. Header (Industrial Top Navigation) */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={(e) => {
          e.preventDefault();
          handleAssistantQuery(searchQuery);
        }}
        onAiInterpret={handleAiInterpretation}
        isAiLoading={isAiLoading}
        user={user}
        onLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleGoogleLogout}
        onOpenAdvancedSearch={() => setIsAdvancedSearchOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onChangeRole={(role: UserRole) => {
          if (user) setUser({ ...user, role });
        }}
        connectionStatus={connectionStatus}
      />

      {/* 2. Main Layout (Sidebar + Content Workspace) */}
      <div className="flex-1 flex max-w-full">
        
        {/* Dynamic Sidebar with Subfolder Tree */}
        <Sidebar
          folders={folders}
          activeCategory={activeCategory}
          activeSubfolder={activeSubfolder}
          onSelectCategory={(cat) => {
            setActiveCategory(cat);
            setActiveSubfolder('Elétrica');
            setSearchQuery('');
            setExpandedFolders(prev => ({ ...prev, [cat]: true }));
            setQuickAccessFilter('all');
            handleAssistantQuery(cat);
          }}
          onSelectSubfolder={(cat, sub) => {
            setActiveCategory(cat);
            setActiveSubfolder(sub);
            setExpandedFolders(prev => ({ ...prev, [cat]: true }));
            setQuickAccessFilter('all');
            searchViaAppsScript(cat, undefined, sub).then(res => {
              if (res.files && res.files.length > 0) {
                setDocuments(res.files);
                setAssistantResult({
                  active: true,
                  folder: `${cat} › ${sub}`,
                  source: res.source,
                  count: res.files.length
                });
              }
            }).catch(console.error);
          }}
          onOpenAdmin={() => setIsAdminOpen(true)}
          isLoading={isLoading}
          expandedFolders={expandedFolders}
          onToggleExpand={(cat) => {
            setExpandedFolders(prev => ({ ...prev, [cat]: !prev[cat] }));
          }}
        />

        {/* Central Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          
          {/* Quick Access Cards (Acesso Rápido) */}
          <QuickAccessCards
            documents={documents}
            activeFilter={quickAccessFilter}
            onFilterChange={(filter) => {
              setQuickAccessFilter(filter);
              if (filter === 'all') {
                setActiveCategory('all');
                setActiveSubfolder(null);
              }
            }}
          />

          {/* Subfolder Navigation & Breadcrumbs Bar (Shows subfolders when folder is selected) */}
          <SubfolderBar
            activeCategory={activeCategory}
            activeSubfolder={activeSubfolder}
            folders={folders}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setActiveSubfolder('Elétrica');
            }}
            onSelectSubfolder={(cat, sub) => {
              setActiveCategory(cat);
              setActiveSubfolder(sub);
              setExpandedFolders(prev => ({ ...prev, [cat]: true }));
            }}
          />

          {/* Assistant Active Query Banner */}
          {assistantResult?.active && (
            <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-blue-950/80 via-[#0d1d46] to-[#0b1735] border border-cyan-500/50 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Bot className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300 font-bold uppercase tracking-wide">Assistente de Consulta Técnica:</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200">
                      {assistantResult.source}
                    </span>
                  </div>
                  <p className="text-slate-200 mt-0.5">
                    Arquivos da pasta <strong>"{assistantResult.folder}"</strong> carregados via Google Apps Script ({assistantResult.count} arquivo(s)). 
                    <span className="text-cyan-300 ml-1 font-semibold">Os nomes dos arquivos abaixo estão formatados como links clicáveis.</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssistantResult(null)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#102044] hover:bg-blue-900/50 transition-colors font-mono cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          )}

          {/* AI Explanation Banner (if user queried with Gemini) */}
          {aiNotice && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-[#0e1838] border border-blue-500/40 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-yellow-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-blue-300">
                    Interpretação Inteligente Google Gemini
                  </h4>
                  <p className="text-xs text-slate-200 mt-0.5">{aiNotice}</p>
                </div>
              </div>
              <button
                onClick={() => setAiNotice(null)}
                className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#101e40]"
              >
                Dispensar
              </button>
            </div>
          )}

          {/* Section: Arquivos Recentes & Filtros Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#18264e]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                  {activeCategory !== 'all' 
                    ? (activeSubfolder && activeSubfolder !== 'all' ? `${activeCategory} › ${activeSubfolder}` : activeCategory)
                    : 'TODOS OS DOCUMENTOS'}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-500/30">
                  {filteredDocuments.length} arquivo(s)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Repositório oficial: Google Drive • Atualização automática em tempo real
              </p>
            </div>

            {/* View Switcher & Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => loadDriveData(false)}
                disabled={isRefreshing}
                title="Verificar atualizações no Google Drive"
                className="p-2 rounded-lg bg-[#0e1a38] hover:bg-[#162752] border border-[#1e3061] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              <button
                onClick={() => setIsAdvancedSearchOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1a38] hover:bg-[#162752] border border-[#1e3061] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>Filtros</span>
              </button>

              <div className="flex items-center bg-[#0a1329] p-1 rounded-lg border border-[#1e3061]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualização em Grade de Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Visualização em Tabela Industrial"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Documents Content Grid / Table */}
          {isLoading ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-mono text-slate-300">Consultando arquivos no Google Drive...</p>
              <p className="text-xs text-slate-500 mt-1">Lendo metadados e estrutura técnica sem duplicar arquivos físicos.</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-20 text-center bg-[#081024] rounded-2xl border border-[#162548] p-8 max-w-xl mx-auto my-8">
              <FileSearch className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white font-mono uppercase mb-1">
                Nenhum documento encontrado
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
                Nenhum arquivo corresponde aos filtros aplicados para a pesquisa atual no Google Drive.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                  setQuickAccessFilter('all');
                  setAdvancedFilters({
                    searchQuery: '',
                    category: 'all',
                    docType: 'all',
                    fileFormat: 'all',
                    equipment: '',
                    manufacturer: '',
                    revision: '',
                    tag: '',
                    dateRange: 'all',
                    onlyFavorites: false,
                    sortBy: 'modifiedDesc'
                  });
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-md"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((doc) => (
                <FileCard
                  key={doc.id}
                  document={doc}
                  onView={handleViewDocument}
                  onOpenInDrive={handleOpenInDrive}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          ) : (
            <FileTableView
              documents={filteredDocuments}
              onView={handleViewDocument}
              onOpenInDrive={handleOpenInDrive}
              onDownload={handleDownload}
            />
          )}

        </main>
      </div>

      {/* 3. Modals and Drawers */}
      
      {/* File Viewer Modal (PDF, Image, CAD, Sheets, etc.) */}
      <FileViewerModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onOpenInDrive={handleOpenInDrive}
        onDownload={handleDownload}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        filters={advancedFilters}
        onFilterChange={(newF) => setAdvancedFilters(prev => ({ ...prev, ...newF }))}
        onApply={() => {
          if (advancedFilters.category !== 'all') {
            setActiveCategory(advancedFilters.category);
          }
        }}
        onReset={() => {
          setAdvancedFilters({
            searchQuery: '',
            category: 'all',
            docType: 'all',
            fileFormat: 'all',
            equipment: '',
            manufacturer: '',
            revision: '',
            tag: '',
            dateRange: 'all',
            onlyFavorites: false,
            sortBy: 'modifiedDesc'
          });
        }}
        folders={folders}
        availableEquipments={availableEquipments}
        availableManufacturers={availableManufacturers}
      />

      {/* Administration Panel */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        connectionStatus={connectionStatus}
        users={usersList}
        rules={rules}
        history={history}
        onUpdateRootFolder={async (folderName, folderId) => {
          await updateAppSettings({ rootFolderName: folderName, rootFolderId: folderId });
          loadDriveData();
        }}
        onUpdateUserRole={async (email, role) => {
          await updateUserRole(email, role);
          const usrRes = await fetchUsers();
          setUsersList(usrRes.users || []);
        }}
        onAddRule={async (rule) => {
          await addClassificationRule(rule);
          const ruleRes = await fetchRules();
          setRules(ruleRes.rules || []);
        }}
      />

      {/* History Activity Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistorySearch={(query) => {
          setSearchQuery(query);
        }}
      />

      {/* Google Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGoogleSignIn={handleGoogleLogin}
        isLoading={authLoading}
        error={authError}
      />

    </div>
  );
}
