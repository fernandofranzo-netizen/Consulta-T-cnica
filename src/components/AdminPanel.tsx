import React, { useState } from 'react';
import { 
  X, 
  HardDrive, 
  Users, 
  Layers, 
  Settings as SettingsIcon, 
  FileCode, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  FolderPlus, 
  Check, 
  AlertCircle,
  Clock,
  Save,
  Plus
} from 'lucide-react';
import { DriveConnectionStatus, UserProfile, ClassificationRule, HistoryItem } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: DriveConnectionStatus | null;
  users: UserProfile[];
  rules: ClassificationRule[];
  history: HistoryItem[];
  onUpdateRootFolder: (folderName: string, folderId: string) => void;
  onUpdateUserRole: (email: string, role: string) => void;
  onAddRule: (rule: Partial<ClassificationRule>) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  connectionStatus,
  users,
  rules,
  history,
  onUpdateRootFolder,
  onUpdateUserRole,
  onAddRule
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'drive' | 'appsscript' | 'users' | 'rules' | 'logs' | 'ai'>('drive');
  const [rootName, setRootName] = useState(connectionStatus?.rootFolderName || 'CONSULTA TÉCNICA');
  const [rootId, setRootId] = useState(connectionStatus?.rootFolderId || 'root-consulta-tecnica');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<any>(null);
  const [scriptSavedNotice, setScriptSavedNotice] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // New rule state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleField, setNewRuleField] = useState<'code' | 'revision' | 'category' | 'equipment' | 'manufacturer'>('code');
  const [newRuleExample, setNewRuleExample] = useState('');

  // AI Test state
  const [testAiQuery, setTestAiQuery] = useState('Preciso do desenho elétrico da laminadora 01');
  const [testAiResult, setTestAiResult] = useState<any>(null);
  const [isAiTesting, setIsAiTesting] = useState(false);

  const handleSaveRootFolder = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRootFolder(rootName, rootId);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleSaveAppsScript = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/apps-script/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl })
      });
      setScriptSavedNotice(true);
      setTimeout(() => setScriptSavedNotice(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestAppsScript = async () => {
    setIsTestingScript(true);
    setScriptTestResult(null);
    try {
      const res = await fetch(`/api/apps-script/search?folder=${encodeURIComponent('07 - LAMINAÇÃO')}`);
      const data = await res.json();
      setScriptTestResult(data);
    } catch (err: any) {
      setScriptTestResult({ error: err.message });
    } finally {
      setIsTestingScript(false);
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName || !newRulePattern) return;
    onAddRule({
      name: newRuleName,
      pattern: newRulePattern,
      extractField: newRuleField,
      type: 'regex',
      example: newRuleExample
    });
    setNewRuleName('');
    setNewRulePattern('');
    setNewRuleExample('');
  };

  const handleRunAiTest = async () => {
    setIsAiTesting(true);
    try {
      const res = await fetch('/api/gemini/interpret-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testAiQuery })
      });
      const data = await res.json();
      setTestAiResult(data.interpretation);
    } catch (e: any) {
      setTestAiResult({ error: e.message });
    } finally {
      setIsAiTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#0a1226] border border-[#1e2f5b] rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0e1935] border-b border-[#1b2b52]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Painel Administrativo do Sistema
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Gerenciamento de infraestrutura, permissões e repositório
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#152349] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1b2b52] bg-[#070e1f] px-6 gap-2 overflow-x-auto">
          {[
            { id: 'drive', label: 'Conexão Google Drive', icon: HardDrive },
            { id: 'appsscript', label: 'Google Apps Script', icon: FileCode },
            { id: 'users', label: 'Usuários & Permissões', icon: Users },
            { id: 'rules', label: 'Regras de Classificação', icon: FileCode },
            { id: 'logs', label: 'Logs de Auditoria', icon: Activity },
            { id: 'ai', label: 'Console Gemini AI', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#070d1e] text-slate-200 text-xs">
          
          {/* TAB 1: GOOGLE DRIVE CONNECTION (Section 21) */}
          {activeTab === 'drive' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 rounded-xl bg-[#0d1838] border border-blue-500/30">
                <h3 className="text-sm font-bold text-white font-mono uppercase mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  CONEXÃO COM GOOGLE DRIVE
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-2 border-b border-[#192b57]">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                      CONECTADO
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#192b57]">
                    <span className="text-slate-400">Conta Google:</span>
                    <span className="text-blue-300 font-medium">
                      {connectionStatus?.accountEmail || 'manutencaolaminor@gmail.com'}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#192b57]">
                    <span className="text-slate-400">Pasta Raiz:</span>
                    <span className="text-white font-bold">{rootName}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#192b57]">
                    <span className="text-slate-400">ID da Pasta Raiz no Drive:</span>
                    <span className="text-slate-300">{rootId}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#192b57]">
                    <span className="text-slate-400">Status da Conexão:</span>
                    <span className="text-emerald-400 font-bold">Ativa</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-200 leading-relaxed">
                  Conectado diretamente ao Google Drive. Os arquivos permanecem no Drive e as alterações são atualizadas automaticamente no aplicativo.
                </div>
              </div>

              {/* Edit Root Folder Config */}
              <form onSubmit={handleSaveRootFolder} className="bg-[#0b142d] p-5 rounded-xl border border-[#1b2b52] space-y-4">
                <h4 className="text-xs font-bold text-white font-mono uppercase">
                  Definir Pasta Raiz do Google Drive
                </h4>
                <p className="text-[11px] text-slate-400">
                  O aplicativo varrerá todas as subpastas desta pasta raiz para montar o menu dinâmico de áreas industriais.
                </p>

                <div className="space-y-3 font-mono">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nome da Pasta Raiz:</label>
                    <input
                      type="text"
                      value={rootName}
                      onChange={(e) => setRootName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ID da Pasta no Google Drive:</label>
                    <input
                      type="text"
                      value={rootId}
                      onChange={(e) => setRootId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {savedNotice && (
                    <span className="text-emerald-400 text-xs flex items-center gap-1">
                      <Check className="w-4 h-4" /> Configuração atualizada com sucesso!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Save className="w-4 h-4" /> Salvar Configurações
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: GOOGLE APPS SCRIPT INTEGRATION */}
          {activeTab === 'appsscript' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-4 rounded-xl bg-[#0d1838] border border-blue-500/30">
                <h3 className="text-sm font-bold text-white font-mono uppercase mb-2 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-cyan-400" />
                  GOOGLE APPS SCRIPT WEB APP
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Permite buscar diretamente os arquivos da sua pasta no Google Drive retornando o JSON formatado com os links clicáveis (propriedades <code className="text-cyan-300 bg-blue-950 px-1 py-0.5 rounded">url</code> e <code className="text-cyan-300 bg-blue-950 px-1 py-0.5 rounded">webViewLink</code>).
                </p>
              </div>

              {/* Configure Web App URL */}
              <form onSubmit={handleSaveAppsScript} className="bg-[#0b142d] p-5 rounded-xl border border-[#1b2b52] space-y-4">
                <h4 className="text-xs font-bold text-white font-mono uppercase">
                  URL do Web App do Google Apps Script
                </h4>
                <p className="text-[11px] text-slate-400">
                  Cole aqui a URL de publicação do seu Apps Script (ex: <code>https://script.google.com/macros/s/.../exec</code>). Se deixado em branco, o sistema usará o motor nativo integrado.
                </p>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">
                    URL de Execução do Web App (doGet):
                  </label>
                  <input
                    type="url"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {scriptSavedNotice && (
                    <span className="text-emerald-400 text-xs flex items-center gap-1 font-mono">
                      <Check className="w-4 h-4" /> URL do Apps Script salva com sucesso!
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestAppsScript}
                      disabled={isTestingScript}
                      className="px-3.5 py-2 rounded-lg bg-[#14234c] hover:bg-[#1a2e63] text-cyan-300 border border-cyan-500/40 font-mono text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>{isTestingScript ? 'Testando...' : 'Testar Busca (07 - Laminação)'}</span>
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-md text-xs font-mono"
                    >
                      <Save className="w-4 h-4" /> Salvar URL
                    </button>
                  </div>
                </div>
              </form>

              {/* Test Result Display */}
              {scriptTestResult && (
                <div className="p-4 rounded-xl bg-[#060c1a] border border-cyan-500/40">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Resposta JSON Recebida ({scriptTestResult.count} arquivo(s) em {scriptTestResult.folder}):
                  </h4>
                  <pre className="p-3 bg-[#03060f] rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 scrollbar-thin">
                    {JSON.stringify(scriptTestResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Ready-to-use Apps Script code snippet */}
              <div className="p-4 rounded-xl bg-[#081024] border border-[#1b2b52] space-y-2">
                <h4 className="text-xs font-bold text-white font-mono uppercase flex items-center justify-between">
                  <span>Código Modelo do Google Apps Script (Code.gs)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Copie e cole no script.google.com</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Crie um projeto no Google Apps Script, cole o código abaixo e clique em <strong>Implantar &gt; Nova Implantação &gt; Tipo: App da Web (Quem pode acessar: Qualquer pessoa)</strong>:
                </p>
                <pre className="p-3 bg-[#040814] rounded-lg text-[10px] font-mono text-blue-200 overflow-x-auto max-h-56 scrollbar-thin select-all">
{`function doGet(e) {
  var folderName = e.parameter.folder || "07 - LAMINAÇÃO";
  var rootFolderId = "1m0L8QgOXjS7cTl37rXM3Zwx1fVoxmwGB";
  var filesList = [];
  
  try {
    var rootFolder = DriveApp.getFolderById(rootFolderId);
    var subfolders = rootFolder.getFoldersByName(folderName);
    var targetFolder = subfolders.hasNext() ? subfolders.next() : rootFolder;
    
    var files = targetFolder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      filesList.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        webViewLink: file.getUrl(),
        mimeType: file.getMimeType(),
        size: file.getSize(),
        modifiedTime: file.getLastUpdated().toISOString(),
        folder: folderName
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      folder: folderName,
      count: filesList.length,
      files: filesList
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: USERS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Controle de Usuários e Perfis de Acesso
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Gerencie os níveis de acesso: Administrador, Supervisor ou Usuário
                  </p>
                </div>
              </div>

              <div className="bg-[#0b142d] border border-[#1b2b52] rounded-xl overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#0e1935] text-slate-400 border-b border-[#1b2b52]">
                    <tr>
                      <th className="py-2.5 px-4">Nome / Conta</th>
                      <th className="py-2.5 px-4">E-mail</th>
                      <th className="py-2.5 px-4">Perfil Atual</th>
                      <th className="py-2.5 px-4">Alterar Permissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#152349]">
                    {users.map((u) => (
                      <tr key={u.email} className="hover:bg-[#0e1a38]">
                        <td className="py-3 px-4 font-semibold text-white">{u.displayName}</td>
                        <td className="py-3 px-4 text-slate-300">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'Administrador' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' :
                            u.role === 'Supervisor' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                            'bg-blue-950 text-blue-300 border border-blue-500/40'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => onUpdateUserRole(u.email, e.target.value)}
                            className="bg-[#060c1c] border border-[#1d2d56] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                          >
                            <option value="Administrador">Administrador</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Usuário">Usuário</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CLASSIFICATION RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Regras de Interpretação e Nomenclatura Técnica
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Regras que extraem automaticamente Código, Revisão, Equipamento e Fabricante do nome dos arquivos no Google Drive.
                </p>
              </div>

              {/* Active Rules List */}
              <div className="space-y-2.5">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-3.5 rounded-lg bg-[#0b142d] border border-[#1b2b52] font-mono text-xs flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-400">{rule.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-600/30">
                          Campo: {rule.extractField}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1">
                        Padrão: <code className="text-amber-300 bg-[#060c1c] px-1.5 py-0.5 rounded">{rule.pattern}</code>
                      </p>
                      {rule.example && (
                        <p className="text-slate-500 text-[10px] mt-0.5">Exemplo: {rule.example}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Rule */}
              <form onSubmit={handleCreateRule} className="p-4 rounded-xl bg-[#091126] border border-[#1a2850] space-y-3 font-mono">
                <h4 className="font-bold text-white text-xs uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-400" /> Adicionar Nova Regra de Nomenclatura
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Nome da Regra:</label>
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="Ex: Código de Corte"
                      className="w-full px-2.5 py-1.5 bg-[#060c1c] border border-[#1d2d56] rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Campo Extraído:</label>
                    <select
                      value={newRuleField}
                      onChange={(e) => setNewRuleField(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-[#060c1c] border border-[#1d2d56] rounded text-slate-200"
                    >
                      <option value="code">Código Técnico (Tag)</option>
                      <option value="revision">Revisão</option>
                      <option value="equipment">Equipamento</option>
                      <option value="manufacturer">Fabricante</option>
                      <option value="category">Categoria</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Expressão Regular (Regex):</label>
                    <input
                      type="text"
                      value={newRulePattern}
                      onChange={(e) => setNewRulePattern(e.target.value)}
                      placeholder="Ex: COR-[0-9]{3}"
                      className="w-full px-2.5 py-1.5 bg-[#060c1c] border border-[#1d2d56] rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Exemplo de Nome:</label>
                    <input
                      type="text"
                      value={newRuleExample}
                      onChange={(e) => setNewRuleExample(e.target.value)}
                      placeholder="Ex: COR-003-PNEUM.pdf"
                      className="w-full px-2.5 py-1.5 bg-[#060c1c] border border-[#1d2d56] rounded text-slate-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs cursor-pointer"
                >
                  Cadastrar Regra
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS (Section 18) */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Histórico Geral de Auditoria e Consultas
              </h3>
              <div className="bg-[#0b142d] border border-[#1b2b52] rounded-xl overflow-hidden font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#0e1935] text-slate-400 border-b border-[#1b2b52]">
                    <tr>
                      <th className="py-2.5 px-4">Data / Hora</th>
                      <th className="py-2.5 px-4">Usuário</th>
                      <th className="py-2.5 px-4">Ação</th>
                      <th className="py-2.5 px-4">Documento / Busca</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#152349]">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          Nenhum registro de auditoria até o momento.
                        </td>
                      </tr>
                    ) : (
                      history.slice(0, 50).map((h) => (
                        <tr key={h.id} className="hover:bg-[#0e1a38]">
                          <td className="py-2.5 px-4 text-slate-400">
                            {new Date(h.timestamp).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">{h.userEmail || h.userName}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.action === 'VIEW' ? 'bg-blue-950 text-blue-300' :
                              h.action === 'DOWNLOAD' ? 'bg-emerald-950 text-emerald-300' :
                              'bg-purple-950 text-purple-300'
                            }`}>
                              {h.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-white truncate max-w-xs">
                            {h.fileName || h.searchQuery || h.fileCode}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: GEMINI AI CONSOLE */}
          {activeTab === 'ai' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  Console de Inteligência Técnica (Google Gemini)
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Teste como o Gemini interpreta perguntas em linguagem natural e extrai filtros técnicos sem tocar nos arquivos físicos.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0b142d] border border-[#1b2b52] space-y-3 font-mono">
                <label className="block text-[11px] text-slate-400">
                  Consulta de Exemplo:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testAiQuery}
                    onChange={(e) => setTestAiQuery(e.target.value)}
                    placeholder="Ex: Preciso do desenho elétrico da laminadora 01"
                    className="flex-1 px-3 py-2 bg-[#060c1c] border border-[#1d2d56] rounded-lg text-slate-200"
                  />
                  <button
                    onClick={handleRunAiTest}
                    disabled={isAiTesting}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    {isAiTesting ? 'Interpretando...' : 'Interpretar'}
                  </button>
                </div>

                {testAiResult && (
                  <div className="mt-4 p-3 bg-[#060c1c] border border-blue-900/50 rounded-lg text-xs font-mono space-y-2">
                    <p className="text-emerald-400 font-bold">Resultado Estruturado Gemini:</p>
                    <pre className="text-slate-300 overflow-x-auto text-[11px]">
                      {JSON.stringify(testAiResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
