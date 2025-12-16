import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Loader2, Check, ScanSearch, Image as ImageIcon, AlertTriangle, ArrowRight, Sparkles, ShieldCheck, Book, Search, CheckCircle2, FileType, Clock, X, Trash2, LogIn, ChevronRight, History, Cookie, Shield, Ban, Moon, Sun, Scale, Gavel, ScanLine, Globe, Link as LinkIcon, Laptop } from 'lucide-react';
import { analyzeContract, FileInput } from './services/geminiService';
import AnalysisDashboard from './components/AnalysisDashboard';
import CookiePolicy from './components/CookiePolicy';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import { AnalysisState, HistoryItem, AnalysisResult } from './types';
import mammoth from 'mammoth';

// Security: Max file size 5MB to prevent browser crashes/DoS
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

const DEMO_CONTRACT_TEXT = `CONTRACT DE PRESTĂRI SERVICII INTERNET

Art. 4. Prețul serviciilor.
Prestatorul își rezervă dreptul de a modifica tarifele lunar, fără a notifica clientul în prealabil. Continuarea utilizării serviciilor reprezintă acceptarea tacită a noilor tarife.

Art. 7. Rezilierea.
Clientul poate rezilia contractul doar prin achitarea unei taxe de reziliere echivalente cu valoarea abonamentului pe 24 de luni.

Art. 9. Răspunderea.
Prestatorul nu este răspunzător pentru nicio întrerupere a serviciului, indiferent de durată sau cauză, inclusiv din culpa sa exclusivă.

Art. 12. Penalități.
Pentru orice întârziere la plată, se aplică penalități de 1% pe zi din valoarea facturii totale.`;

const LOADING_STEPS_DOC = [
    "Inițializez motorul de analiză semantică V4.0...",
    "Verific Legea 193/2000 pentru clauze abuzive...",
    "Validez conformitatea cu Noul Cod Civil și OUG 34/2014...",
    "Identific limitările de răspundere și penalitățile excesive...",
    "Scanez documentul pentru conformitate GDPR...",
    "Generez recomandări legale bazate pe jurisprudența RO..."
];

const LOADING_STEPS_WEB = [
    "V4.0: Inițializez crawler-ul pentru structura legală...",
    "Verific existența link-urilor obligatorii ANPC & SOL (Ord. 449/2022)...",
    "Analizez transparența reducerilor de preț (Directiva Omnibus)...",
    "Verific identitatea fiscală (CUI, Reg. Com) în footer (Lg. 365/2002)...",
    "Detectez Dark Patterns interzise de Digital Services Act (DSA)...",
    "Validez politica de retur și formularul de retragere...",
    "Analizez conformitatea bannerului CMP Cookies (ePrivacy)...",
    "Calculez scorul de încredere E-commerce..."
];

type ViewState = 'main' | 'cookies' | 'terms' | 'privacy';
type InputMode = 'file' | 'url' | 'text';

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('main');

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('juriscan_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'rejected' | null>(null);

  // App State
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDate, setCurrentDate] = useState('');
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [analysis, setAnalysis] = useState<AnalysisState>({
    isLoading: false,
    result: null,
    error: null,
  });

  // Dynamic Loading Steps
  const activeLoadingSteps = inputMode === 'url' ? LOADING_STEPS_WEB : LOADING_STEPS_DOC;

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    setCurrentDate(now.toLocaleDateString('ro-RO', options));
    
    // Load History from LocalStorage
    const savedHistory = localStorage.getItem('juriscan_history');
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to parse history", e);
        }
    }

    // Load Cookie Consent
    const savedConsent = localStorage.getItem('juriscan_cookie_consent');
    if (savedConsent === 'accepted' || savedConsent === 'rejected') {
        setCookieConsent(savedConsent as 'accepted' | 'rejected');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('juriscan_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('juriscan_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let interval: any;
    if (analysis.isLoading) {
        setCurrentStep(0);
        interval = setInterval(() => {
            setCurrentStep(prev => (prev + 1) % activeLoadingSteps.length);
        }, 2000); 
    }
    return () => clearInterval(interval);
  }, [analysis.isLoading, activeLoadingSteps]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Save to history whenever a new result is generated
  const addToHistory = (result: AnalysisResult) => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          dateLabel: new Date().toLocaleString('ro-RO'),
          result: result
      };
      
      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      localStorage.setItem('juriscan_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
      if(window.confirm("Sigur doriți să ștergeți tot istoricul local?")) {
          setHistory([]);
          localStorage.removeItem('juriscan_history');
      }
  };

  const handleCookieConsent = (choice: 'accepted' | 'rejected') => {
      setCookieConsent(choice);
      localStorage.setItem('juriscan_cookie_consent', choice);
  };

  const loadFromHistory = (item: HistoryItem) => {
      setAnalysis({ isLoading: false, result: item.result, error: null });
      setShowHistory(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    if(inputMode !== 'file') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      setUploadError(null); 
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, [inputMode]);

  const handleAnalyze = async (text?: string, fileInput?: FileInput, url?: string) => {
    // Validation
    if (!text && !fileInput && !url) return;

    setAnalysis({ isLoading: true, result: null, error: null });
    try {
      // Pass empty string for text if it's a URL analysis
      const textToAnalyze = text || '';
      const result = await analyzeContract(textToAnalyze, fileInput, url);
      setAnalysis({ isLoading: false, result, error: null });
      addToHistory(result); 
    } catch (err: any) {
      setAnalysis({ 
        isLoading: false, 
        result: null, 
        error: err.message || "Nu am putut finaliza analiza. Vă rog verificați datele și încercați din nou." 
      });
    }
  };

  const runDemo = () => {
    setInputMode('text');
    setInputText(DEMO_CONTRACT_TEXT);
    handleAnalyze(DEMO_CONTRACT_TEXT);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    if(inputMode !== 'file') return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [inputMode]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerLocalError = (message: string) => {
      setUploadError(message);
      setTimeout(() => setUploadError(null), 3000);
  };

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
        triggerLocalError(`Fișier prea mare (${(file.size / 1024 / 1024).toFixed(2)}MB). Limita: 5MB.`);
        return;
    }

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            try {
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                if (result.value && result.value.trim().length > 0) {
                    handleAnalyze(result.value);
                } else {
                    triggerLocalError("Document Word gol sau necitibil.");
                }
            } catch (err) {
                triggerLocalError("Fișier Word corupt.");
            }
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            handleAnalyze('', { data: base64String, mimeType: 'application/pdf' });
        };
        reader.readAsDataURL(file);
        return;
    }

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            handleAnalyze('', { data: base64String, mimeType: file.type });
        };
        reader.readAsDataURL(file);
        return;
    }

    if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = (e.target?.result as string);
            handleAnalyze(text);
        };
        reader.readAsText(file);
        return;
    }

    triggerLocalError("Format fișier neacceptat. Încearcă PDF, Word sau Imagini.");
  };

  // --- LOGO COMPONENT ---
  const BrandLogo = ({ large = false }: { large?: boolean }) => (
    <div className={`flex items-center gap-2 ${large ? 'scale-110' : ''}`}>
        <div className="relative flex items-center justify-center">
             <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                <Gavel className={`${large ? 'w-8 h-8' : 'w-6 h-6'}`} />
             </div>
             <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900">
                <ScanLine className={`${large ? 'w-3 h-3' : 'w-2.5 h-2.5'}`} />
             </div>
        </div>
        <div className="flex flex-col justify-center">
             <span className={`${large ? 'text-3xl' : 'text-2xl'} font-brand font-bold text-slate-900 dark:text-white leading-none tracking-tight`}>
                Juri<span className="text-indigo-600 dark:text-indigo-400">Scan</span>
             </span>
        </div>
    </div>
  );

  // --- COOKIE BANNER COMPONENT ---
  const CookieBanner = () => {
      if (cookieConsent !== null) return null;

      return (
          <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-6 z-[100] animate-slide-up">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-start gap-4 max-w-3xl">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-full hidden md:block">
                          <Cookie className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                          <h4 className="font-brand font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                              <span className="md:hidden"><Cookie className="w-4 h-4 text-indigo-600 dark:text-indigo-400 inline"/></span>
                              Politica de Confidențialitate și Cookies
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                              JuriScan utilizează module cookie pentru a îmbunătăți funcționalitatea platformei (istoric local, setări) și pentru a asigura conformitatea GDPR. 
                              Datele dumneavoastră contractuale nu sunt stocate pe serverele noastre, fiind procesate în timp real.
                              Continuarea navigării implică acceptul dumneavoastră.
                              <br/>
                              <button 
                                onClick={() => setCurrentView('cookies')}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline mt-1 inline-block text-left"
                              >
                                  Citește Politica de Cookies
                              </button>
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                          onClick={() => handleCookieConsent('rejected')}
                          className="flex-1 md:flex-none px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                      >
                          Refuz Tot
                      </button>
                      <button 
                          onClick={() => handleCookieConsent('accepted')}
                          className="flex-1 md:flex-none px-6 py-2.5 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white font-medium hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-slate-900/10 dark:shadow-indigo-900/20 text-sm flex items-center justify-center gap-2"
                      >
                          <ShieldCheck className="w-4 h-4" />
                          Accept Tot
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  // --- LEGAL DISCLAIMER BAR ---
  const LegalDisclaimerBar = () => (
      <div className="fixed bottom-0 left-0 w-full bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 z-[90] text-center shadow-lg">
        <div className="max-w-6xl mx-auto flex items-start justify-center gap-2 px-2">
             <Scale className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0 hidden md:block" />
             <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase mr-1">Exonerare de Răspundere:</span> 
                JuriScan este un instrument automatizat bazat pe inteligență artificială și <span className="underline decoration-red-300 dark:decoration-red-700">nu reprezintă consultanță juridică</span>. 
                Dezvoltatorii nu își asumă răspunderea pentru erori, omisiuni sau interpretări generate de platformă. 
                Pentru decizii contractuale, consultați întotdeauna un avocat specializat. Utilizarea aplicației se face pe propria răspundere.
            </p>
        </div>
      </div>
  );

  // --- ROUTING LOGIC ---
  if (currentView === 'cookies') {
      return (
        <>
            <CookiePolicy onBack={() => setCurrentView('main')} />
            <LegalDisclaimerBar />
        </>
      );
  }

  if (currentView === 'terms') {
      return (
          <>
            <TermsOfService onBack={() => setCurrentView('main')} />
            <LegalDisclaimerBar />
          </>
      );
  }

  if (currentView === 'privacy') {
      return (
          <>
            <PrivacyPolicy onBack={() => setCurrentView('main')} />
            <LegalDisclaimerBar />
          </>
      );
  }

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans relative transition-colors duration-300 pb-20">
             <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 p-10 border border-slate-100 dark:border-slate-800 animate-fade-in-up relative z-10">
                 <div className="text-center mb-10 flex flex-col items-center">
                    <div className="mb-6">
                        <BrandLogo large />
                    </div>
                    <h1 className="text-3xl font-brand font-bold text-slate-900 dark:text-white mb-3">Bine ai venit</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-light">
                        Inteligență artificială pentru analiza rapidă a contractelor.
                    </p>
                 </div>

                 <div className="space-y-4">
                    <button 
                        onClick={() => setIsAuthenticated(true)}
                        className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-medium py-4 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <LogIn className="w-5 h-5" />
                        Accesează Platforma
                    </button>
                    <div className="text-xs text-center text-slate-400 dark:text-slate-500 mt-6 leading-relaxed">
                        Prin accesare, ești de acord cu 
                        <button onClick={() => setCurrentView('terms')} className="underline hover:text-slate-600 dark:hover:text-slate-300 mx-1">
                            Termenii de Utilizare
                        </button>, 
                        <button onClick={() => setCurrentView('privacy')} className="underline hover:text-slate-600 dark:hover:text-slate-300 mx-1">
                            Politica de Confidențialitate
                        </button> și {' '}
                        <button onClick={() => setCurrentView('cookies')} className="underline hover:text-slate-600 dark:hover:text-slate-300 mx-1">
                            Politica de Cookies
                        </button>.
                        <div className="mt-2 flex items-center justify-center gap-1 text-slate-300 dark:text-slate-600">
                             <Shield className="w-3 h-3" /> GDPR Compliant
                        </div>
                    </div>
                 </div>
                 
                 <div className="mt-8 text-center text-slate-300 dark:text-slate-600 text-[10px] opacity-70">
                    Copyright &copy; {new Date().getFullYear()} JuriScan AI <span className="mx-1">&bull;</span> Developed by Christoph Bercea-Rott
                 </div>
             </div>
             <CookieBanner />
             <LegalDisclaimerBar />
        </div>
    )
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 overflow-x-hidden transition-colors duration-300 pb-20">
      
      {/* Navbar: Modern Tech Vibe */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="cursor-pointer group opacity-90 hover:opacity-100 transition-opacity" onClick={() => {
              setAnalysis({ isLoading: false, result: null, error: null });
              setInputText('');
              setInputUrl('');
          }}>
            <BrandLogo />
          </div>
          
          <div className="flex items-center gap-4">
             {/* Dark Mode Toggle */}
             <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isDarkMode ? "Activează modul luminos" : "Activează modul întunecat"}
             >
                 {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             {/* History Button */}
             <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
             >
                <History className="w-4 h-4" />
                <span className="hidden md:inline">Istoric</span>
             </button>

             {/* Dynamic Badge with Tooltip */}
             <div className="group relative hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full cursor-help transition-all hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 hover:shadow-sm">
                <Globe className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>Live Audit V4.0</span>
                
                {/* Sources Tooltip */}
                <div className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50">
                    <div className="absolute top-0 right-8 -mt-2 w-4 h-4 bg-white dark:bg-slate-900 transform rotate-45 border-t border-l border-slate-100 dark:border-slate-800"></div>
                    <h4 className="font-brand font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                        <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Verificare Online V4.0
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        Include verificări obligatorii 2025:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5"></span>
                            <span><strong>Directiva Omnibus</strong> (Transparență Prețuri)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5"></span>
                            <span><strong>Ordin ANPC 449/2022</strong> (Link-uri SAL/SOL)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></span>
                            <span><strong>DSA & GDPR</strong> (Dark Patterns)</span>
                        </li>
                    </ul>
                </div>
             </div>
          </div>
        </div>
      </nav>

      {/* HISTORY SIDEBAR OVERLAY */}
      {showHistory && (
          <>
            <div 
                className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-sm z-[60]"
                onClick={() => setShowHistory(false)}
            ></div>
            <div className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white dark:bg-slate-900 z-[70] shadow-2xl border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-out flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="font-brand font-bold text-xl text-slate-800 dark:text-white">Istoric Analize</h3>
                    </div>
                    <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {history.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <History className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                            <p className="text-slate-500 dark:text-slate-400">Nu există analize salvate.</p>
                        </div>
                    ) : (
                        history.map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => loadFromHistory(item)}
                                className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer transition-all bg-white dark:bg-slate-900 relative"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        {item.dateLabel}
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        item.result.score > 80 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' :
                                        item.result.score > 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                    }`}>
                                        Scor: {item.result.score}
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {item.result.contractHighlights && item.result.contractHighlights.length > 0 
                                        ? `Analiză: ${item.result.contractHighlights[0].substring(0, 30)}...` 
                                        : 'Analiză Contract'}
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {item.result.summary}
                                </p>
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                            </div>
                        ))
                    )}
                </div>

                {history.length > 0 && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <button 
                            onClick={clearHistory}
                            className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 py-3 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/20"
                        >
                            <Trash2 className="w-4 h-4" /> Șterge tot istoricul
                        </button>
                    </div>
                )}
            </div>
          </>
      )}

      <main className="max-w-4xl mx-auto px-6 py-12">
        {analysis.error && !uploadError && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-800 dark:text-red-200 rounded-lg flex items-center gap-3 animate-fade-in shadow-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                {analysis.error}
            </div>
        )}

        {analysis.isLoading ? (
            <div className="py-32 text-center space-y-10 animate-fade-in">
                {/* Modern Loader */}
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-2 border-slate-100 dark:border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                    <Search className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
                
                <div className="max-w-md mx-auto space-y-4">
                    <h3 className="text-2xl font-brand font-bold text-slate-900 dark:text-white">JuriScan analizează...</h3>
                    <div className="h-20 overflow-hidden relative flex items-center justify-center px-4">
                         <p key={currentStep} className="text-slate-500 dark:text-slate-400 animate-slide-up absolute w-full transition-all duration-500 font-medium text-sm md:text-base leading-relaxed">
                            {activeLoadingSteps[currentStep]}
                         </p>
                    </div>
                </div>
            </div>
        ) : analysis.result ? (
            <AnalysisDashboard 
                data={analysis.result} 
                onReset={() => setAnalysis({ isLoading: false, result: null, error: null })} 
                isDarkMode={isDarkMode}
            />
        ) : (
            <div className="space-y-16 animate-fade-in-up">
                
                {/* Hero Section */}
                <div className="text-center space-y-6 pt-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 shadow-sm">
                        <Sparkles className="w-3 h-3 text-indigo-500" /> Analiză Juridică AI
                    </div>
                    <h1 className="text-5xl md:text-6xl font-brand font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                        Contracte sigure,<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">verificate instant.</span>
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                        JuriScan scanează documentele tale pentru clauze abuzive, sau analizează website-uri pentru riscuri GDPR.
                    </p>
                    
                    <button 
                        onClick={runDemo}
                        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors py-2"
                    >
                        Nu ai un contract? <span className="underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4 group-hover:decoration-indigo-300 dark:group-hover:decoration-indigo-500">Vezi un demo JuriScan</span> <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>

                {/* --- TABBED INTERFACE AREA --- */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-3 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-white dark:border-slate-800 transition-colors duration-300 relative overflow-hidden">
                    
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 px-2 overflow-x-auto">
                        {[
                            { id: 'file', label: 'Încarcă Fișier', icon: Upload },
                            { id: 'url', label: 'Audit Website', icon: Globe },
                            { id: 'text', label: 'Text Manual', icon: FileText }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setInputMode(tab.id as InputMode)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                    inputMode === tab.id
                                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area Based on Tab */}
                    
                    {/* 1. FILE UPLOAD TAB */}
                    {inputMode === 'file' && (
                        <div 
                            className={`relative group cursor-pointer transition-all duration-300 ease-out border-2 border-dashed rounded-[1.5rem] p-12 text-center overflow-hidden
                                ${uploadError 
                                    ? 'border-red-400 bg-red-50/50 dark:bg-red-900/20' 
                                    : dragActive 
                                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/20 scale-[1.01] shadow-xl shadow-indigo-100/50 dark:shadow-indigo-900/20' 
                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-black/20'
                                }
                            `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <input 
                                id="file-upload"
                                type="file" 
                                className="hidden" 
                                accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.txt"
                                onChange={handleFileInput}
                            />

                            {/* Error Overlay with animation */}
                            {uploadError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-20 animate-fade-in">
                                    <div className="text-red-500 font-bold flex flex-col items-center gap-2 animate-bounce">
                                        <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full">
                                            <Ban className="w-8 h-8" />
                                        </div>
                                        <span>{uploadError}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className={`transition-all duration-300 ${dragActive ? 'scale-110' : ''}`}>
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-slate-100 dark:shadow-black/30">
                                    <Upload className="w-8 h-8 stroke-[1.5]" />
                                </div>
                                
                                <h3 className="text-xl font-brand font-bold text-slate-900 dark:text-white mb-2">
                                    {dragActive ? "Eliberează fișierul aici" : "Încarcă Contractul"}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-6">
                                    Drag & drop sau click pentru a alege un fișier PDF, DOCX sau Imagini.
                                </p>
                                
                                <div className="inline-flex items-center gap-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><FileType className="w-3 h-3"/> PDF / Docx</span>
                                    <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Foto</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. URL TAB */}
                    {inputMode === 'url' && (
                        <div className="p-8 md:p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 animate-fade-in">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto flex items-center justify-center mb-6">
                                <Laptop className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-brand font-bold text-slate-900 dark:text-white mb-3">Audit Website & GDPR</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-8">
                                Introdu URL-ul site-ului. Vom căuta automat Politica de Confidențialitate și Termenii de utilizare.
                            </p>
                            
                            <div className="max-w-md mx-auto relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <LinkIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input 
                                    type="url"
                                    className="block w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                    placeholder="https://exemplu.ro"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && inputUrl) handleAnalyze(undefined, undefined, inputUrl);
                                    }}
                                />
                                <button 
                                    onClick={() => handleAnalyze(undefined, undefined, inputUrl)}
                                    disabled={!inputUrl}
                                    className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white px-4 rounded-lg font-bold text-xs transition-colors flex items-center gap-2"
                                >
                                    Scanează <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 3. TEXT TAB */}
                    {inputMode === 'text' && (
                         <div className="group bg-slate-50 dark:bg-slate-800/50 p-2 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-inner focus-within:ring-4 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-500/20 transition-all animate-fade-in">
                            <textarea 
                                className="w-full h-48 p-6 resize-none outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 bg-transparent text-sm leading-relaxed font-mono"
                                placeholder="Lipește textul contractului aici..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                maxLength={100000} 
                            ></textarea>
                            <div className="flex justify-between items-center px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-b-xl">
                                <div className="text-xs text-slate-400 font-medium">
                                    {inputText.length > 0 ? `${inputText.length} caractere` : ''}
                                </div>
                                <button 
                                    disabled={!inputText.trim()}
                                    onClick={() => handleAnalyze(inputText)}
                                    className="bg-slate-900 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-sm"
                                >
                                    Analizează Text
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        )}
      <div className="mt-8 text-center text-slate-400 text-xs">
          Copyright &copy; {new Date().getFullYear()} JuriScan AI <span className="mx-1">&bull;</span> Developed by Christoph Bercea-Rott
      </div>
      <CookieBanner />
      <LegalDisclaimerBar />
      </main>
    </div>
  );
}