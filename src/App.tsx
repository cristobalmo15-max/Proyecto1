/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Plus, 
  X, 
  FileText, 
  Trash2, 
  ChevronLeft, 
  Mail, 
  RefreshCw, 
  ExternalLink,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  User as UserIcon,
  Users,
  CreditCard,
  Phone,
  ShieldCheck,
  LayoutDashboard,
  FileSearch,
  CopyX,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Zap,
  Globe,
  Pencil,
  Headset,
  Video,
  CalendarDays,
  PieChart,
  Eye,
  Search,
  Clock,
  Download,
  Fingerprint,
  MapPin,
  Send,
  Settings2,
  FileCheck,
  Cloud,
  ChevronDown,
  Inbox,
  Star,
  ArrowLeft,
  Lock,
  UserCheck,
  FlaskConical,
  Flag,
  TrendingUp
} from 'lucide-react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ReportModal } from './components/ReportModal';
import { AdminPanel } from './components/AdminPanel';
import { auth, db, storage, loginWithGoogle, logout, sendAccessLink, isSignInWithEmailLink, signInWithEmailLink, getAccessToken } from './lib/firebase';
import { GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  writeBatch,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// --- Types ---
interface Expense {
  tipo: string;
  monto: string;
  mes: string;
  boleta: string;
  link: string;
  date: string;
}

interface Property {
  id: string;
  direccion: string;
  valor: string;
  dueno: string;
  rutDue: string;
  telD: string;
  mailD: string;
  arrendatario: string;
  rutArr: string;
  telA: string;
  mailA: string;
  termino: string;
  duracion: string; // "1 año", "6 meses", etc.
  pdf: string;
  aval: string;
  rutAval: string;
  telAval: string;
  mailAval: string;
  f_ini?: string;
  expenses: Expense[];
  contractFile?: File | null;
  docArr?: { carnet: string; liq: string };
  docAval?: { carnet: string; liq: string };
  tipoMonto?: string;
  duracionMeses?: number;
  flagged?: boolean;
}

// --- Constants ---
const getCurrentYear = new Date().getFullYear();
const MONTHS_WITH_YEAR = [
  ...[ 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre' ].map(m => `${m} ${getCurrentYear - 1}`),
  ...[ 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre' ].map(m => `${m} ${getCurrentYear}`)
].reverse(); // from newest to oldest

const EXPENSE_CATEGORIES_COLORS: Record<string, string> = {
  'ARRIENDO': 'bg-red-600',
  'LUZ': 'bg-zinc-800',
  'AGUA': 'bg-zinc-500',
  'GAS': 'bg-zinc-400',
  'GASTOS COMUNES': 'bg-stone-900',
  'MANTENCION': 'bg-red-800',
  'OTROS': 'bg-zinc-600'
};
const getCategoryColor = (cat: string) => EXPENSE_CATEGORIES_COLORS[cat?.toUpperCase()] || 'bg-primary';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const EXPENSE_TYPES = ['ARRIENDO', 'LUZ', 'AGUA', 'BASURA', 'GAS', 'OTROS'];

// Helper para formatear RUT
const formatRut = (rut: string): string => {
  if (!rut || rut === 'N/A') return 'N/A';
  const cleanRut = rut.replace(/[^0-9Kk]/g, '').toUpperCase();
  if (cleanRut.length < 2) return cleanRut;
  const dv = cleanRut.slice(-1);
  const body = cleanRut.slice(0, -1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
};

const getSectionTitle = (names: string[], type: 'dueno' | 'arrendatario'): string => {
  const fullNamesList = names.join(' ').toUpperCase();
  if (fullNamesList.includes('SUCESION') || fullNamesList.includes('SUCESIÓN')) return 'PROPIEDAD: SUCESIÓN';
  if (fullNamesList.includes('SOCIEDAD') || fullNamesList.includes('SPA') || fullNamesList.includes('LTDA') || fullNamesList.includes(' S . A .')) return 'SOCIEDAD / EMPRESA';
  if (fullNamesList.includes('MUNICIPALIDAD')) return 'ENTIDAD PÚBLICA';
  return type === 'dueno' ? 'PROPIETARIO / SOCIEDAD' : 'ARRENDATARIO / INQUILINOS';
};

// --- Components ---

const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  label,
  placeholder = "Seleccionar...",
  className = "" 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  label?: string;
  placeholder?: string; 
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="text-[9px] font-black text-muted uppercase mb-1.5 block tracking-widest">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-border/60 rounded-xl px-3 py-3 text-[11px] font-bold outline-none flex items-center justify-between hover:border-primary/50 hover:bg-white transition-all text-ink shadow-sm group"
      >
        <span className="uppercase truncate pr-1 tracking-tight">{value || placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-500 shrink-0 group-hover:text-primary ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all hover:bg-primary/5 hover:text-primary ${
                    value === option ? 'bg-primary/10 text-primary' : 'text-muted'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [impersonatedUid, setImpersonatedUid] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeModule, setActiveModule] = useState<'dashboard' | 'properties' | 'ai' | 'expenses' | 'reports' | 'support' | 'settings' | 'email' | 'admin'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState('');
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'gmail' | 'outlook' | null>(null);
  const [emailFilter, setEmailFilter] = useState<'all' | 'payments' | 'maintenance' | 'contracts'>('all');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);

  const startConnectionFlow = (provider: 'gmail' | 'outlook') => {
    if (!customEmailInput.includes('@')) {
      showToast('Ingrese un correo institucional válido', 'error');
      return;
    }
    setPendingProvider(provider);
    setShowPermissionModal(true);
  };

  const finalizeConnection = async () => {
    setShowPermissionModal(false);
    setIsAuthenticating(true);
    
    try {
        const result = await loginWithGoogle();
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        
        if (!token) throw new Error("No token");

        // Fetch messages
        const res = await fetch('/api/gmail/messages', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const messages = data.messages || [];
        
        setConnectedEmail(result.user.email || customEmailInput);
        setEmails(messages.map((m: any) => ({
             id: m.id,
             from: m.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Desconocido',
             subject: m.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'Sin asunto',
             date: 'Hoy',
             body: m.snippet || '',
             read: true,
             category: 'general'
        })));
        setIsEmailConnected(true);
        showToast('Gmail sincronizado', 'success');
    } catch (err) {
        console.error(err);
        showToast('Error de autenticación: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
    } finally {
        setIsAuthenticating(false);
    }
  };
  
  const cleanRutInput = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, '');
    if (clean.length > 0) {
      const last = clean.slice(-1);
      const start = clean.slice(0, -1).replace(/[kK]/g, '');
      clean = start + last;
    }
    return clean.slice(0, 9);
  };

  const cleanPhoneInput = (value: string) => {
    let clean = value.replace(/[^0-9]/g, '');
    return clean.slice(0, 9);
  };

  const cleanMultipleRutsInput = (value: string) => {
    return value.replace(/[^0-9kK,.\s-]/g, '');
  };

  const cleanMultiplePhonesInput = (value: string) => {
    return value.replace(/[^0-9,.\s\+-]/g, '');
  };

  const validateRut = (rut: string) => {
    const clean = rut.replace(/[^0-9kK]/g, '');
    if (clean.length < 8 || clean.length > 9) return false;
    const body = clean.slice(0, -1);
    if (/[kK]/.test(body)) return false;
    return true;
  };

  const validatePhone = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    return clean.length === 9;
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateMultipleRuts = (ruts: string) => {
    if (!ruts) return true;
    const parts = ruts.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return true;
    return parts.every(part => validateRut(part));
  };

  const validateMultiplePhones = (phones: string) => {
    if (!phones) return true;
    const parts = phones.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return true;
    return parts.every(part => validatePhone(part));
  };

  const validateMultipleEmails = (emails: string) => {
    if (!emails) return true;
    const parts = emails.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return true;
    return parts.every(part => validateEmail(part));
  };

  const validateDates = (f_ini: string, termino: string) => {
    if (!f_ini || !termino) {
      return { valid: false, message: 'Las fechas de inicio y término ciclo son obligatorias.' };
    }
    const start = new Date(f_ini + 'T00:00:00');
    const end = new Date(termino + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, message: 'Alguna de las fechas ingresadas no es válida.' };
    }
    if (end < start) {
      return { valid: false, message: 'La fecha de término no puede ser anterior a la fecha de inicio.' };
    }
    return { valid: true, message: '' };
  };

  const [properties, setProperties] = useState<Property[]>([]);
  const [appSettings, setAppSettings] = useState({ 
    reportEmail: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    emailSubject: '',
    emailTemplate: '',
    tickets: [] as any[],
    meetings: [] as any[]
  });
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedProp, setSelectedProp] = useState<Property | null>(null);
  const [selectedReportPropId, setSelectedReportPropId] = useState<string | null>(null);
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>(MONTHS_WITH_YEAR[0]);
  const [reportsTab, setReportsTab] = useState<'details' | 'preview'>('details');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedReportsYear, setSelectedReportsYear] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [emailForLogin, setEmailForLogin] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  // Filtrado de propiedades por dirección, dueño, arrendatario o aval
  const filterProperties = (propList: Property[], search: string) => {
    const s = search.toLowerCase();
    return propList.filter(p => 
      (p.direccion || '').toLowerCase().includes(s) ||
      (p.dueno || '').toLowerCase().includes(s) ||
      (p.mailD || '').toLowerCase().includes(s) ||
      (p.arrendatario || '').toLowerCase().includes(s) ||
      (p.mailA || '').toLowerCase().includes(s) ||
      (p.aval || '').toLowerCase().includes(s) ||
      (p.mailAval || '').toLowerCase().includes(s)
    );
  };

  useEffect(() => {
    // Verificar si venimos de un link de acceso por email
    const urlParams = new URLSearchParams(window.location.search);
    const isPermissionRequest = urlParams.get('permission') === 'true';

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Por favor, ingresa tu correo para confirmar el acceso:');
      }
      
      if (email) {
        setIsLoggingIn(true);
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            setIsLoggingIn(false);
            if (isPermissionRequest) {
              console.log('Permission granted to:', email);
              showToast('Acceso concedido correctamente', 'success');
              // TODO: Update Firestore to grant permission
            }
          })
          .catch((error) => {
            console.error(error);
            showToast('El link de acceso ha expirado o ya fue usado', 'error');
            setIsLoggingIn(false);
          });
      }
    }
  }, []);

  const handleEmailAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForLogin) return;
    
    setIsLoggingIn(true);
    try {
      await sendAccessLink(emailForLogin);
      setLinkSent(true);
      // No cerramos el estado de login para mostrar la pantalla de "Correo Enviado"
    } catch (err) {
      console.error(err);
      showToast('Error al enviar el link, revisa tu conexión', 'error');
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setIsLoggingIn(false);
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Validación cancelada por el usuario');
      } else {
        showToast('Error de conexión con el servidor seguro', 'error');
      }
    }
  };

  const viewContract = (pdfUrl: string | undefined, ownerName?: string) => {
    if (!pdfUrl || pdfUrl === '#') {
      showToast('No hay contrato digital disponible', 'error');
      return;
    }
    const cleanName = (ownerName || 'Documento').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const proxyUrl = `/api/punto-propiedades/visor-pdf/Contrato_${cleanName}?url=${encodeURIComponent(pdfUrl)}`;
    window.open(proxyUrl, '_blank');
  };
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'legal' | 'finances' | 'document'>('legal');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  // ... search and admin logic
  const [propSearch, setPropSearch] = useState('');
  
  const isAdmin = user?.email?.toLowerCase().trim() === 'cristobalmo15@gmail.com' || user?.uid === 'oU8w9h5h7lZ9mN6rK7aN1P1G1B12';

  // Inside the main layout component, add search and admin entry.

  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [sortType, setSortType] = useState<'date' | 'name-asc' | 'name-desc'>('date');
  const [showConfirmDelete, setShowConfirmDelete] = useState<{ 
    type: 'property' | 'expense' | 'reset', 
    id?: string, 
    index?: number 
  } | null>(null);

  const [pdfUrlForPreview, setPdfUrlForPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const currentUploadPromise = useRef<Promise<string> | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Property>>({});
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // New states for interactive Support and Correo settings
  const [supportTab, setSupportTab] = useState<'meetings' | 'tickets' | 'faq'>('meetings');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Lector IA');
  const [ticketPriority, setTicketPriority] = useState('Alta');
  const [ticketMessage, setTicketMessage] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const [selectedMeetingType, setSelectedMeetingType] = useState('Capacitación de Lector IA');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingReason, setMeetingReason] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  const [correoStep, setCorreoStep] = useState<number>(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [previewPropId, setPreviewPropId] = useState<string>('');
  const [smtpError, setSmtpError] = useState<string | null>(null);

  const getFileFingerprint = async (file: File): Promise<string> => {
    try {
      const chunk = file.slice(0, 64 * 1024);
      const arrayBuffer = await chunk.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `${file.size}-${hashHex}`;
    } catch (err) {
      return `${file.name}-${file.size}-${file.lastModified}`;
    }
  };

  const deleteDuplicates = () => {
    const originalCount = bulkData.length;
    const filteredData = bulkData.filter(item => !item.isDuplicate);
    setBulkData(filteredData);
    setHasDuplicates(false);
    showToast(`Se eliminaron ${originalCount - filteredData.length} duplicados`);
  };
  const [aiStream, setAiStream] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any | null>(null);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    tipo: 'ARRIENDO',
    mes: MONTHS_WITH_YEAR[0],
    monto: '',
    boleta: '',
    file: null as File | null
  });

  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
  }, []);

  useEffect(() => {
    console.log('[DEBUG] user updated:', user ? user.email : 'null');
    if (!user || !user.uid) {
      setProperties([]);
      return;
    }

    const activeUid = impersonatedUid || user.uid;
    console.log('[DEBUG-PROPS] user updated properties loading, activeUid:', activeUid, 'isAdmin:', isAdmin, 'impersonatedUid:', impersonatedUid);
    
    let q;
    if (isAdmin && !impersonatedUid) {
        console.log('[DEBUG-PROPS] Querying ALL properties as admin');
        q = query(collection(db, 'properties'));
    } else {
        console.log('[DEBUG-PROPS] Querying properties for ownerUid:', activeUid);
        q = query(collection(db, 'properties'), where('ownerUid', '==', activeUid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[DEBUG-PROPS] Snapshot received, docs:', snapshot.docs.length);
      const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
      console.log('[DEBUG] Props loaded:', props.length);
      setProperties(props);
      
      // Sincronizar propiedad seleccionada si existe
      setSelectedProp(current => {
        if (!current) return null;
        const updated = props.find((p: any) => p.id === current.id);
        return updated || null;
      });
    }, (err) => {
      console.error('[DEBUG] Firestore error:', err);
    });

    return () => unsubscribe();
  }, [user, impersonatedUid]);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'settings', user.uid);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      console.log('[DEBUG] onSnapshot update:', snapshot.data());
      if (snapshot.exists()) {
        setAppSettings(snapshot.data() as any);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || properties.length === 0) return;
    
    // Check for deep link to specific property
    const params = new URLSearchParams(window.location.search);
    const propId = params.get('propId');
    if (propId) {
      const target = properties.find(p => p.id === propId);
      if (target) {
        setSelectedProp(target);
        setActiveModule('properties');
        showToast(`Cargando: ${target.direccion}`);
        // Clean URL to avoid re-triggering
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, properties]);

  const updateAppSettings = async (newSettings: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'settings', user.uid), newSettings, { merge: true });
      showToast('Configuraciones guardadas');
    } catch (err) {
      showToast('Error al guardar configuraciones', 'error');
    }
  };

  const fetchProperties = async () => {
    // Replaced by onSnapshot sync
  };

  const bulkSync = async () => {
    if (!user) return;
    setLoading(true);
    setProgress(0);
    setLoadingStatus('Iniciando sincronización masiva...');

    try {
      const total = bulkData.length;
      if (total === 0) {
        showToast('No hay datos para sincronizar', 'error');
        return;
      }
      setLoadingStatus(`Subiendo ${total} contratos en paralelo...`);
      setProgress(10);

      const syncedData = await Promise.all(bulkData.map(async (d) => {
        let pdfUrl = d.pdf || '#';
        const file = bulkFiles.find(f => f.name === d.fileName);

        if (file && (pdfUrl === '#' || !pdfUrl)) {
          try {
            pdfUrl = await uploadFileToStorage(file, 'contracts/bulk');
          } catch (e) {
            console.error(`Error subiendo ${file.name}:`, e);
          }
        }
        return { ...d, pdf: pdfUrl };
      }));

      setProgress(80);
      setLoadingStatus('Confirmando cambios en la base de datos...');
      const batch = writeBatch(db);

      syncedData.forEach(d => {
        const propData = {
          direccion: d.dir || '',
          valor: Number(d.can) || 0,
          tipoMonto: d.tipoMonto || 'pesos',
          duracionMeses: Number(d.duracionMeses) || 12,
          termino: d.f_ven || d.f_ini || '',
          f_ini: d.f_ini || '',
          duracion: d.duracion || '12 meses',
          dueno: d.d_nom || '',
          rutDue: d.d_rut || '',
          telD: d.d_tel || '',
          mailD: d.d_mail || '',
          arrendatario: d.a_nom || '',
          rutArr: d.a_rut || '',
          telA: d.a_tel || '',
          mailA: d.a_mail || '',
          aval: d.av_nom || '',
          rutAval: d.av_rut || '',
          telAval: d.av_tel || '',
          mailAval: d.av_mail || '',
          ownerUid: user.uid,
          expenses: [],
          pdf: d.pdf || '#',
          updatedAt: serverTimestamp()
        };

        if (d.existingId) {
          const existingDocRef = doc(db, 'properties', d.existingId);
          batch.update(existingDocRef, propData);
        } else {
          const newDocRef = doc(collection(db, 'properties'));
          batch.set(newDocRef, { ...propData, createdAt: serverTimestamp() });
        }
      });

      await batch.commit();
      setBulkData([]);
      setBulkFiles([]);
      showToast('Sincronización masiva completada exitosamente');
      setActiveModule('properties');
    } catch (error) {
      console.error('Error in bulk sync:', error);
      showToast('Error en la sincronización', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const testCloudConnectivity = async () => {
    try {
      if (!user) {
        showToast('Error: Debes iniciar sesión primero', 'error');
        return;
      }
      
      console.log('[Diagnostic] 🔍 Iniciando chequeo integral...');
      console.log('[Diagnostic] Project ID:', firebaseConfig.projectId);
      console.log('[Diagnostic] Bucket:', firebaseConfig.storageBucket);
      
      showToast('Paso 1: Verificando Auth...', 'success');
      
      // 1. Test Auth
      console.log('[Diagnostic] Auth State:', user.uid);
      
      // 2. Test Firestore
      showToast('Paso 2: Escribiendo en Firestore...', 'success');
      const testDoc = doc(db, 'settings', user.uid);
      await setDoc(testDoc, { 
        last_check: serverTimestamp(), 
        env_diagnostic: 'checking',
        bucket: firebaseConfig.storageBucket
      }, { merge: true });
      console.log('[Diagnostic] Firestore: ✅ OK');
      // 3. Test Storage (Subida)
      showToast('Paso 3: Enviando archivo de prueba...', 'success');
      const diagFileName = `diag_${user.uid}_${Date.now()}.txt`;
      const testRef = ref(storage, `diagnostics/${user.uid}/${diagFileName}`);
      const blob = new Blob(['diagnostic_pulse_' + new Date().toISOString()], { type: 'text/plain' });
      
      console.log(`[Diagnostic] Intentando subida a ${firebaseConfig.storageBucket}...`);
      
      // Usamos Resumable con un timeout estricto de 25s
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          task.cancel();
          reject(new Error('TIMEOUT CRÍTICO: El servidor no responde. ACCIÓN REQUERIDA: Ve a tu Consola Firebase > Storage. Si ves un botón "Comenzar" o un wizard, complétalo hasta el final. SI YA LO HICISTE Y VES UN ERROR DESCONOCIDO EN FIREBASE: Recarga la página de Firebase y vuelve a intentar subir un archivo.'));
        }, 25000);

        const task = uploadBytesResumable(testRef, blob);
        task.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes * 100).toFixed(0);
            console.log(`[Diag-Storage] Progreso: ${progress}%`);
            if (parseInt(progress) > 0) showToast(`Trasmisión Storage: ${progress}%`, 'success');
          },
          (err) => {
            clearTimeout(timeout);
            console.error('[Diagnostic Storage Error]', err);
            if (err.code === 'storage/unauthorized') {
              reject(new Error('ERROR DE PERMISOS: No tienes permiso para escribir en Storage. Verifica la pestaña "Rules" y asegúrate de que permitan escritura pública para pruebas.'));
            } else if (err.code === 'storage/bucket-not-found') {
              reject(new Error('ERROR DE BUCKET: El bucket no se ha creado aún en la consola de Firebase.'));
            } else {
              reject(err);
            }
          },
          () => {
            clearTimeout(timeout);
            resolve();
          }
        );
      });
      console.log('[Diagnostic] Storage Write: ✅ OK');
      
      // 4. Test Storage (Lectura)
      showToast('Paso 4: Verificando enlace de descarga...', 'success');
      const downloadUrl = await getDownloadURL(testRef);
      console.log('[Diagnostic] Storage Read URL: ✅ OK');
      
      showToast('✅ Nube operacional al 100%. Conexión estable.', 'success');
    } catch (error: any) {
      console.error('[Diagnostic CRITICAL ERROR]', error);
      const errorMsg = error.code ? `[${error.code}] ${error.message}` : error.message;
      showToast(`❌ Error: ${errorMsg}`, 'error');
    }
  };

  const uploadFileToStorage = async (file: File, pathDir: string, retryCount = 0): Promise<string> => {
    if (!user) {
      showToast("Por favor, inicia sesión para subir archivos", "error");
      return Promise.reject(new Error('Sesión no iniciada'));
    }
    
    // Si estamos impersonando, usamos esa UID para la ruta de storage
    const targetUid = impersonatedUid || user.uid;
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `${pathDir}/${targetUid}/${fileName}`;
    const storageRef = ref(storage, filePath);
    
    setIsUploading(true);
    setUploadProgress(1);

    console.log(`[Storage] 🛫 Sincronizando (${retryCount}): ${file.name}`);

    // Protocolo Atómico para archivos pequeños (< 1.5MB)
    if (file.size < 1.5 * 1024 * 1024 && retryCount === 0) {
      try {
        console.log("[Storage] Intentando envío directo...");
        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || 'application/pdf' });
        const url = await getDownloadURL(snapshot.ref);
        setUploadProgress(100);
        setIsUploading(false);
        console.log("[Storage] ✅ Sincronización Directa Exitosa");
        return url;
      } catch (e) {
        console.warn("[Storage] Fallo envío directo, usando protocolo de flujo...", e);
      }
    }

    return new Promise<string>((resolve, reject) => {
      const metadata = { contentType: file.type || 'application/pdf' };
      const task = uploadBytesResumable(storageRef, file, metadata);
      
      const timeout = setTimeout(() => {
        task.cancel();
        reject(new Error('ERROR DE CONEXIÓN: El servicio de Storage no responde. Por favor, verifica en tu consola de Firebase que la pestaña "Storage" esté activa (clic en "Crear" o "Comenzar"). Si ya lo hiciste, recarga la página de Firebase.'));
      }, 60000); // 60 segundos

      task.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(Math.max(1, progress));
        }, 
        async (error) => {
          clearTimeout(timeout);
          console.error(`[Storage Error] ${error.code}:`, error.message);
          
          if (retryCount < 1 && error.code !== 'storage/unauthorized' && error.code !== 'storage/canceled') {
            console.log("[Storage] Reintentando transmisión por fallo de red...");
            setTimeout(() => {
              uploadFileToStorage(file, pathDir, retryCount + 1).then(resolve).catch(reject);
            }, 2000);
          } else {
            setIsUploading(false);
            const userFriendlyMsg = error.code === 'storage/unauthorized' 
              ? 'Error de Permisos: Verifica las reglas de Storage en Firebase.' 
              : `Error de carga: ${error.message}`;
            showToast(userFriendlyMsg, 'error');
            reject(error);
          }
        }, 
        async () => {
          clearTimeout(timeout);
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            console.log("[Storage] ✅ Sincronización Exitosa");
            setIsUploading(false);
            setUploadProgress(100);
            resolve(url);
          } catch (err: any) {
            console.error("[Storage URL Error]", err);
            setIsUploading(false);
            reject(err);
          }
        }
      );
    });
  };

  const cleanupPropertiesWithoutContract = async () => {
    try {
      setLoading(true);
      setLoadingStatus('Analizando persistencia de contratos...');
      
      // Target properties with old /uploads links OR empty/missing persistent links
      const toFix = properties.filter(p => 
        typeof p.pdf === 'string' && (p.pdf.startsWith('/uploads/') || !p.pdf.startsWith('http') && p.pdf !== '#')
      );
      
      if (toFix.length === 0) {
        showToast('No se encontraron contratos con enlaces temporales');
        return;
      }

      const totalToFix = toFix.length;
      // Removed native confirm to prevent hangs in preview
      setLoadingStatus(`Corrigiendo ${totalToFix} contratos...`);

      const batch = writeBatch(db);
      toFix.forEach(p => {
        batch.update(doc(db, 'properties', p.id), {
          pdf: '#'
        });
      });
      
      await batch.commit();
      showToast(`${totalToFix} enlaces corregidos. Por favor, vuelve a subir los PDF en "Editar Ficha" para asegurarlos en la nube.`);
    } catch (e) {
      console.error('Error in cleanup:', e);
      showToast('Error al corregir enlaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllProperties = async () => {
    try {
      setLoading(true);
      setLoadingStatus('Eliminando base de datos completa...');
      const batch = writeBatch(db);
      properties.forEach(p => {
        batch.delete(doc(db, 'properties', p.id));
      });
      await batch.commit();
      setSelectedProp(null);
      showToast('Base de datos reiniciada');
    } catch (e) {
      showToast('Error al reiniciar base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const processContractWithGemini = async (file: File) => {
    if (!ai) {
      showToast('Error: La API Key de Gemini no está configurada en este entorno.', 'error');
      throw new Error('Gemini API Key is not configured');
    }
    const reader = new FileReader();
    return new Promise<any>((resolve, reject) => {
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        try {
          const prompt = `Analiza este contrato de arriendo chileno y extrae la información clave en formato JSON. 
          Si un dato no está presente, deja el campo como "".
          CAMPOS REQUERIDOS:
          - dir: Dirección de la propiedad.
          - can: Canon de arriendo mensual (solo números, por ejemplo 850000 o 25 o 15.5; no metas letras ni símbolos, si está en UF ingresa solo el valor con punto decimal si aplica).
          - tipo_mon: Tipo de moneda para el arriendo. Debe ser exactamente de dos opciones: "pesos" o "uf" (según lo que indique el contrato).
          - f_ini: Fecha de inicio, firma o fecha de celebración del contrato, usualmente en la primera cláusula o al inicio (AAAA-MM-DD).
          - dur_meses: Duración del contrato expresado únicamente en número entero de meses (ej: 6, 12, 18, 24, 36, 60, etc). Si indica 1 año pon 12, 2 años pon 24, etc.
          - d_nom, d_rut, d_tel, d_mail: Nombre, RUT, Teléfono y Email del Arrendador (Dueño). IMPORTANTE MÁXIMA PRIORIDAD: Si se identifica que el Arrendador (Dueño) es una sociedad, empresa, o está representado por más de una persona, o existen múltiples copropietarios, extrae TODOS ellos y colócalos juntos separados obligatoriamente por una coma (,). Mantén exactamente el mismo orden de correspondencia para d_nom, d_rut, d_tel y d_mail de modo que queden alineados uno a uno. Ejemplo: d_nom: "Inmobiliaria S.A., Carlos Muñoz (repre)", d_rut: "76.452.122-K, 14.223.111-2", d_tel: "22345678, 912345678", d_mail: "contacto@inmobiliaria.cl, carlos@mail.com".
          - a_nom, a_rut, a_tel, a_mail: Nombre, RUT, Teléfono y Email del Arrendatario. IMPORTANTE MÁXIMA PRIORIDAD: Si se identifica que el Arrendatario es una sociedad, empresa, o está representado por más de una persona, o existen múltiples arrendatarios/ocupantes, extrae TODOS ellos y colócalos juntos separados obligatoriamente por una coma (,). Mantén exactamente el mismo orden de correspondencia para a_nom, a_rut, a_tel y a_mail de modo que queden alineados uno a uno. Ejemplo: a_nom: "Constructora Beta S.A., Ana Gómez (repre)", a_rut: "77.123.456-7, 12.345.678-9", a_tel: "22876543, 987654321", a_mail: "contacto@beta.cl, ana@betacorp.cl".
          - av_nom, av_rut, av_tel, av_mail: Nombre, RUT, Teléfono y Email del Aval / Codeudor Solidario.
          
          JSON SCHEMA: {"dir":"","can":"","tipo_mon":"pesos","f_ini":"","dur_meses":12,"d_nom":"","d_rut":"","d_tel":"","d_mail":"","a_nom":"","a_rut":"","a_tel":"","a_mail":"","av_nom":"","av_rut":"","av_tel":"","av_mail":""}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [
              { text: prompt },
              { inlineData: { mimeType: "application/pdf", data: base64 } }
            ],
            config: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
            }
          });

          const result = JSON.parse(response.text || '{}');
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const normalizeAddress = (addr: string) => {
    if (!addr) return '';
    return addr
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Limpiar acentos
      .replace(/\b(calle|av|avenida|pasaje|pje|nro|n|numero|num|de|la|el|los|las|departamento|depto|unidad|casa|block|lote|isla|maipo|comuna|region|metropolitana)\b/gi, '')
      .replace(/[^a-z0-9]/g, '') // Ahora sí eliminar todo lo demás
      .trim();
  };

  const normalizeText = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Limpiar preview anterior si existe
    if (pdfUrlForPreview) {
      URL.revokeObjectURL(pdfUrlForPreview);
    }

    try {
      // Generar URL local para vista previa instantánea
      const localUrl = URL.createObjectURL(file);
      setPdfUrlForPreview(localUrl);
      
      // Estado inicial con datos mínimos para que no se vea vacío
      setFormData(prev => ({ 
        ...prev,
        direccion: file.name.replace('.pdf', ''), 
        pdf: '#', 
        f_ini: new Date().toISOString().split('T')[0] 
      }));
      
      setIsAdding(true);
      setAiStream([]);
      
      // Iniciar subida y análisis en paralelo inmediatamente
      const uploadPromise = uploadFileToStorage(file, 'contracts').catch(err => {
        console.error('Upload Error Task:', err);
        showToast('Error al respaldar PDF en la nube', 'error');
        throw err;
      });
      
      currentUploadPromise.current = uploadPromise;
      
      // Análisis de IA en segundo plano
      processContractWithGemini(file).then(data => {
        const extractedMonths = Number(data.dur_meses) || 12;
        const initialTipoMon = (data.tipo_mon === 'uf' || data.tipo_mon === 'pesos') ? data.tipo_mon : 'pesos';

        setFormData(prev => ({
          ...prev,
          direccion: data.dir || prev.direccion,
          valor: data.can || prev.valor,
          tipoMonto: initialTipoMon,
          duracionMeses: extractedMonths,
          duracion: `${extractedMonths} meses`,
          termino: calculateExpiry(data.f_ini || '', extractedMonths),
          f_ini: data.f_ini || prev.f_ini,
          dueno: data.d_nom || prev.dueno,
          rutDue: data.d_rut || prev.rutDue,
          telD: data.d_tel || prev.telD,
          mailD: data.d_mail || prev.mailD,
          arrendatario: data.a_nom || prev.arrendatario,
          rutArr: data.a_rut || prev.rutArr,
          telA: data.a_tel || prev.telA,
          mailA: data.a_mail || prev.mailA,
          aval: data.av_nom || prev.aval,
          rutAval: data.av_rut || prev.rutAval,
          telAval: data.av_tel || prev.telAval,
          mailAval: data.av_mail || prev.mailAval,
        }));
        
        setAiStream([
          { entity: 'Dirección', value: data.dir || 'Detectada', confidence: 0.95 },
          { entity: 'Canon', value: data.can || 'Detectado', confidence: 0.98 },
          { entity: 'Partes', value: data.a_nom || 'Identificadas', confidence: 0.96 }
        ]);
        showToast('IA finalizó análisis con éxito');
      }).catch(err => {
        console.error('AI Processing Error:', err);
        let errorMsg = 'Error en extracción IA';
        if (err.message?.includes('quota')) errorMsg = 'Límite de IA excedido temporalmente';
        showToast(errorMsg, 'error');
      });

      // Actualizar URL final de PDF cuando termine la subida
      uploadPromise.then(url => {
        setFormData(prev => ({ ...prev, pdf: url }));
        currentUploadPromise.current = null;
        showToast('PDF sincronizado permanentemente');
      });

    } catch (err: any) {
      console.error('Local Processing Error:', err);
      showToast('Error crítico: El navegador bloqueó el archivo local.', 'error');
    }
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    setLoadingStatus('Iniciando análisis paralelo...');
    setProgress(0);
    
    // Process in chunks of 5 to avoid rate limits and memory issues
    const CHUNK_SIZE = 5;
    const results: any[] = [];
    
    // Calculate fingerprints first for all files
    const fingerprints = await Promise.all(files.map(f => getFileFingerprint(f)));
    
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunkIndices = Array.from({ length: Math.min(CHUNK_SIZE, files.length - i) }, (_, k) => i + k);
      setLoadingStatus(`Procesando lote ${Math.floor(i / CHUNK_SIZE) + 1} de ${Math.ceil(files.length / CHUNK_SIZE)}...`);
      
      const chunkPromises = chunkIndices.map(async (idx) => {
        const file = files[idx];
        try {
          const [data, pdfUrl] = await Promise.all([
            processContractWithGemini(file),
            uploadFileToStorage(file, 'contracts')
          ]);

          const extractedMonths = Number(data.dur_meses) || 12;
          const initialTipoMon = (data.tipo_mon === 'uf' || data.tipo_mon === 'pesos') ? data.tipo_mon : 'pesos';

          return {
            ...data,
            dir: data.dir || file.name,
            valor: data.can || '0',
            tipoMonto: initialTipoMon,
            duracionMeses: extractedMonths,
            f_ini: data.f_ini || new Date().toISOString().split('T')[0],
            f_ven: calculateExpiry(data.f_ini || '', extractedMonths),
            duracion: `${extractedMonths} meses`,
            fileName: file.name,
            pdf: pdfUrl,
            fingerprint: fingerprints[idx]
          };
        } catch (err) {
          console.error(`Error processing ${file.name}`, err);
          return null;
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(r => r !== null));
      setProgress(Math.round(((Math.min(i + CHUNK_SIZE, files.length)) / files.length) * 100));
    }

    // Advanced Duplicate detection: Multi-Factor (Fingerprint, Address+Amount, Tenant)
    const seenHashes = new Set();
    const seenContentKeys = new Set();
    
    // Create maps for existing data
    const existingAddressMap = new Map(properties.map(p => [normalizeAddress(p.direccion), p.id]));
    const existingTenantMap = new Map(properties.map(p => [normalizeText(p.arrendatario), p.id]));
    
    let duplicatesOverall = 0;
    
    const processedResults = results.map(res => {
      if (!res) return null;
      const normDir = normalizeAddress(res.dir);
      const normTenant = normalizeText(res.a_nom);
      const amountVal = (res.valor || '0').toString().replace(/[^0-9]/g, '');
      const hashKey = res.fingerprint;
      
      // Key of address + amount for intra-batch detection
      const contentKey = `${normDir}_${amountVal}`;
      
      const isAddressInDB = normDir ? existingAddressMap.has(normDir) : false;
      const isTenantInDB = normTenant ? existingTenantMap.has(normTenant) : false;
      
      // We consider it a duplicate in DB if:
      // 1. Address matches EXACTLY (after normalization)
      // 2. OR Tenant matches AND Amount matches (since tenant might have multiple properties, but rarely with same amount)
      const isAlreadyInDB = isAddressInDB || (isTenantInDB && amountVal !== '0');
      const existingId = isAddressInDB ? existingAddressMap.get(normDir) : (isTenantInDB ? existingTenantMap.get(normTenant) : null);
      
      // Duplicate if SAME fingerprint OR SAME content key in current batch
      const isRelativelyDuplicate = (hashKey && seenHashes.has(hashKey)) || 
                                    (contentKey && seenContentKeys.has(contentKey));

      if (isAlreadyInDB || isRelativelyDuplicate) {
        duplicatesOverall++;
        return { ...res, isDuplicate: true, alreadyExists: isAlreadyInDB, existingId };
      }
      
      if (hashKey) seenHashes.add(hashKey);
      if (contentKey && contentKey.length > 5) seenContentKeys.add(contentKey);
      
      return { ...res, isDuplicate: false };
    }).filter(r => r !== null);

    setBulkFiles(files);
    setBulkData(processedResults);
    setHasDuplicates(duplicatesOverall > 0);
    setLoading(false);
    
    if (duplicatesOverall > 0) {
      showToast(`Hemos detectado ${duplicatesOverall} posibles duplicados`, 'error');
    } else {
      showToast(`Analizados ${results.length} contratos correctamente`);
    }
  };

  const saveProperty = async () => {
    if (!user) return;
    
    setLoading(true);
    let finalPdfUrl = formData.pdf || '#';

    try {
      if (isUploading && currentUploadPromise.current) {
        setLoadingStatus('Finalizando sincronización del contrato...');
        finalPdfUrl = await currentUploadPromise.current;
      }

      setLoadingStatus('Guardando...');
      const propData = {
        direccion: formData.direccion || '',
        valor: Number(formData.valor) || 0,
        tipoMonto: formData.tipoMonto || 'pesos',
        duracionMeses: Number(formData.duracionMeses) || 12,
        termino: formData.termino || '',
        duracion: formData.duracion || '12 meses',
        f_ini: formData.f_ini || '',
        dueno: formData.dueno || '',
        rutDue: formData.rutDue || '',
        telD: formData.telD || '',
        mailD: formData.mailD || '',
        arrendatario: formData.arrendatario || '',
        rutArr: formData.rutArr || '',
        telA: formData.telA || '',
        mailA: formData.mailA || '',
        aval: formData.aval || '',
        rutAval: formData.rutAval || '',
        telAval: formData.telAval || '',
        mailAval: formData.mailAval || '',
        ownerUid: impersonatedUid || user.uid,
        expenses: formData.expenses || [],
        pdf: finalPdfUrl,
        updatedAt: serverTimestamp()
      };
      
      if (formData.id) {
        await updateDoc(doc(db, 'properties', formData.id), propData);
      } else {
        await addDoc(collection(db, 'properties'), { ...propData, createdAt: serverTimestamp() });
      }
      await fetchProperties();
      
      setIsAdding(false);
      setFormData({});
      showToast('Propiedad guardada correctamente');
    } catch (e: any) {
      console.error('Error saving property:', e);
      showToast(`Error al guardar: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadingStatus('Eliminando propiedad...');
      await deleteDoc(doc(db, 'properties', id));
      showToast('Propiedad eliminada correctamente');
    } catch (e: any) {
      console.error('Error deleting property:', e);
      showToast('Error al eliminar la propiedad: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setLoadingStatus('');
      setShowConfirmDelete(null);
      setSelectedProp(null);
    }
  };

  const togglePropertyFlag = async (id: string, currentVal: boolean) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'properties', id), {
        flagged: !currentVal
      });
      showToast(!currentVal ? 'Propiedad marcada con banderita' : 'Marca removida');
    } catch (e: any) {
      console.error('Error toggling property flag:', e);
      showToast('Error al actualizar marca: ' + e.message, 'error');
    }
  };

  const addExpense = async () => {
    if (!selectedProp || !user) return;
    setLoading(true);
    setLoadingStatus('Subiendo comprobante...');
    try {
      let fileUrl = '#';
      if (expenseForm.file) {
        fileUrl = await uploadFileToStorage(expenseForm.file, 'expenses');
      }

      const newExpense = {
        tipo: expenseForm.tipo,
        mes: expenseForm.mes,
        monto: expenseForm.monto,
        boleta: expenseForm.boleta,
        date: new Date().toISOString(),
        link: fileUrl
      };

      const updatedExpenses = [...(selectedProp.expenses || []), newExpense];
      await updateDoc(doc(db, 'properties', selectedProp.id), {
        expenses: updatedExpenses
      });

      setExpenseForm({ ...expenseForm, monto: '', boleta: '', file: null });
      showToast('Gasto registrado');
    } catch (e: any) {
      console.error('Error adding expense:', e);
      showToast(`Error al registrar gasto: ${e.message || 'Error desconocido'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (propId: string, expenseIndex: number) => {
    try {
      const prop = properties.find(p => p.id === propId);
      if (!prop) return;
      const updatedExpenses = [...(prop.expenses || [])];
      updatedExpenses.splice(expenseIndex, 1);
      await updateDoc(doc(db, 'properties', propId), {
        expenses: updatedExpenses,
        updatedAt: serverTimestamp()
      });
      showToast('Gasto eliminado correctamente');
    } catch (e: any) {
      console.error('Error deleting expense:', e);
      showToast('Error al eliminar el gasto', 'error');
    } finally {
      setShowConfirmDelete(null);
    }
  };

  const renewContract = async () => {
    if (!selectedProp) return;
    
    // Limit renewal to currentYear + 1
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYearLimit = currentYear + 1;
    
    const terminoDate = new Date(selectedProp.termino);
    if (terminoDate.getFullYear() >= nextYearLimit) {
      showToast(`Límite de renovación alcanzado (${nextYearLimit}). Para corregir, usa "Editar Ficha".`, 'error');
      return;
    }

    setLoading(true);
    try {
      const oldTermino = selectedProp.termino;
      const currentTermino = new Date(selectedProp.termino);
      currentTermino.setFullYear(currentTermino.getFullYear() + 1);
      
      await updateDoc(doc(db, 'properties', selectedProp.id), {
        f_ini: oldTermino,
        termino: currentTermino.toISOString().split('T')[0]
      });
      showToast('Contrato renovado');
    } catch (e) {
      showToast('Error al renovar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendReport = async (prop: Property, mes: string) => {
    if (!prop) return;
    const isMatchingMonth = (eMes: string, targetMonth: string) => eMes === targetMonth || (eMes && !eMes.includes(' ') && `${eMes} ${new Date().getFullYear()}` === targetMonth);
    const mesExpenses = prop.expenses?.filter(e => isMatchingMonth(e.mes, mes)) || [];
    if (mesExpenses.length === 0) {
      showToast('No hay gastos para este mes', 'error');
      return;
    }

    const body = `Estimado(a) ${prop.dueno}:\n\nAdjunto resumen de gastos para ${prop.direccion} (${mes}):\n\n` +
      mesExpenses.map(e => `- ${e.tipo}: $${e.monto} (Bol/Rol: ${e.boleta || 'S/N'})`).join('\n') +
      `\n\nAtentamente,\nPUNTO PROPIEDADES`;

    setLoading(true);
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: prop.mailD,
          subject: `Informe de Gastos - ${mes} - ${prop.direccion}`,
          body,
          smtpConfig: {
            host: appSettings.smtpHost,
            port: appSettings.smtpPort,
            user: appSettings.smtpUser,
            pass: appSettings.smtpPass
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
      } else {
        const errorMsg = data.details || data.error || 'Error al enviar informe';
        showToast(`Error: ${errorMsg}`, 'error');
      }
    } catch (e) {
      showToast('Error al enviar informe', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendTestReport = async () => {
    if (!appSettings.reportEmail) {
      showToast('Debe configurar un correo primero', 'error');
      return;
    }

    const expired = properties.filter(p => p && p.termino && isExpired(p.termino));
    const upcoming = properties.filter(p => {
      if (!p || !p.termino) return false;
      const d = new Date(p.termino);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return d.getMonth() === nextMonth.getMonth() && d.getFullYear() === nextMonth.getFullYear();
    });

    const baseUrl = window.location.origin;
    const expiredHtml = expired.length > 0 ? expired.map(p => `
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 24px; border-radius: 20px; margin-bottom: 16px; font-family: 'Inter', system-ui, sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 12px;">
          <div style="width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; margin-top: 6px;"></div>
          <h4 style="margin: 0; color: #0f172a; text-transform: uppercase; font-size: 14px; font-weight: 900; letter-spacing: 0.05em; line-height: 1.2;">${p.direccion || 'Sin direccion'}</h4>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
          <div style="background-color: #fef2f2; padding: 6px 12px; border-radius: 8px;">
            <p style="margin: 0; color: #ef4444; font-size: 11px; font-weight: 800; text-transform: uppercase;">Contrato Vencido</p>
          </div>
          <div style="padding: 6px 0;">
            <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase;">Venció el: <span style="color: #0f172a;">${p.termino || 'Sin fecha'}</span></p>
          </div>
        </div>
        <a href="${baseUrl}?propId=${p.id || ''}" style="display: block; text-align: center; background-color: #2563eb; color: white; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.2s;">Gestionar Propiedad</a>
      </div>
    `).join('') : '<p style="color: #64748b; font-style: italic; text-align: center;">No hay contratos vencidos actualmente.</p>';

    const html = `
      <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Inter', system-ui, sans-serif; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="margin: 0; font-size: 12px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 0.2em;">Resumen de Gestión Inmobiliaria</h1>
            <h2 style="margin: 8px 0 0 0; font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.025em;">Informe de Vencimientos</h2>
          </div>

          <div style="display: grid; grid-template-cols: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; display: flex;">
            <div style="flex: 1; background: white; padding: 20px; border-radius: 24px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              <p style="margin: 0; font-size: 28px; font-weight: 900; color: #2563eb;">${properties.length}</p>
              <p style="margin: 4px 0 0 0; font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Total</p>
            </div>
            <div style="flex: 1; background: #2563eb; padding: 20px; border-radius: 24px; text-align: center; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);">
              <p style="margin: 0; font-size: 28px; font-weight: 900; color: white;">${expired.length}</p>
              <p style="margin: 4px 0 0 0; font-size: 9px; font-weight: 900; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.1em;">Vencidos</p>
            </div>
            <div style="flex: 1; background: white; padding: 20px; border-radius: 24px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              <p style="margin: 0; font-size: 28px; font-weight: 900; color: #10b981;">${upcoming.length}</p>
              <p style="margin: 4px 0 0 0; font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">A Vencer</p>
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Acciones Pendientes</p>
          </div>
          
          ${expiredHtml}

          <div style="margin-top: 48px; text-align: center;">
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Punto Propiedades • Sistema Operativo Inmobiliario</p>
            <p style="margin: 8px 0 0 0; font-size: 10px; color: #cbd5e1;">Este informe ha sido generado automáticamente para ${appSettings.reportEmail}</p>
          </div>
        </div>
      </div>
    `;

    setSmtpError(null);

    try {
      setLoading(true);
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: appSettings.reportEmail,
          subject: 'Informe de Vencimientos - Gestión Inmobiliaria',
          body: `Informe de Vencimientos: ${expired.length} vencidos, ${upcoming.length} próximos.`,
          html,
          smtpConfig: {
            host: appSettings.smtpHost,
            port: appSettings.smtpPort,
            user: appSettings.smtpUser,
            pass: appSettings.smtpPass
          }
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message);
      } else {
        let errorMsg = result.details || result.error || 'Error desconocido';
        if (errorMsg.includes('535 5.7.139')) {
             errorMsg = 'Error de Autenticación 535: Cuenta de Outlook Bloqueada (Locked) o SMTP Deshabilitado. Por favor revisa la guía de ayuda abajo.';
        }
        setSmtpError(errorMsg);
        showToast(`Error: ${errorMsg}`, 'error');
      }
    } catch (e: any) {
      const eMsg = e?.message || 'Error de conexión con el servidor';
      setSmtpError(eMsg);
      showToast(eMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val: string | number, tipoMonto?: string) => {
    if (tipoMonto === 'uf') {
      const parsed = Number(val);
      return `UF ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parsed)}`;
    }
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(val));
  };

  const isExpired = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    return date < new Date();
  };

  const addMonthsToDate = (startDateStr: string, months: number): string => {
    if (!startDateStr) return '';
    const date = new Date(startDateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return startDateStr;
    date.setMonth(date.getMonth() + Number(months));
    return date.toISOString().split('T')[0];
  };

  const calculateExpiry = (startDate: string, months: number = 12) => {
    return addMonthsToDate(startDate, months);
  };

  if (!isAuthReady) return null;

  if (isLoggingIn && !user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="mb-12 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-primary/5 rounded-[2rem] flex items-center justify-center border border-primary/10 shadow-[0_20px_50px_rgba(59,130,246,0.1)]">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -inset-4 bg-primary/10 rounded-[3rem] animate-pulse -z-10" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black uppercase tracking-tighter text-ink mb-2">Punto Propiedades</h2>
          <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em] mb-12 opacity-60">
            {linkSent ? 'Correo de Acceso Enviado' : 'Sincronización de Identidad Cloud'}
          </p>
          
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col items-center gap-6">
            {!linkSent ? (
               <>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={`skeleton-dot-${i}`} 
                      className="w-2 h-2 bg-primary/20 rounded-full animate-bounce" 
                      style={{ animationDelay: `${i * 0.1}s` }} 
                    />
                  ))}
                </div>
                <p className="text-[11px] font-medium text-muted leading-relaxed max-w-[240px]">
                  Estamos estableciendo la conexión segura. Por favor, completa la verificación en el portal que se abrirá.
                </p>
               </>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-[11px] font-medium text-muted leading-relaxed">
                  Hemos enviado un link de acceso seguro a <span className="text-ink font-bold">{emailForLogin}</span>. Revisa tu bandeja de entrada y haz clic en el botón para entrar.
                </p>
                <button 
                  onClick={() => {
                    setIsLoggingIn(false);
                    setLinkSent(false);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Regresar al inicio
                </button>
              </div>
            )}
          </div>
        </motion.div>
        
        <div className="fixed bottom-12 text-[10px] font-bold text-muted uppercase tracking-widest opacity-40">
          Cifrado Bancario SSL 256-bit
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-ink font-sans selection:bg-primary/20">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-border">
          <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
            <div className="text-xl font-black tracking-tighter flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">P</div>
              PUNTO PROPIEDADES
            </div>
            <div className="flex items-center gap-8">
              <a href="#features" className="text-sm font-bold text-muted hover:text-primary transition-colors">Características</a>
              <a href="#market" className="text-sm font-bold text-muted hover:text-primary transition-colors">Mercado</a>
              {showEmailInput ? (
                <button 
                  onClick={() => setShowEmailInput(false)}
                  className="text-sm font-bold text-muted hover:text-ink transition-colors"
                >
                  Atrás
                </button>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-primary hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg shadow-primary/20"
                >
                  Ingresar / Registrarse
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section - Split Layout (Recipe 11) */}
        <section className="pt-32 pb-24 max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-red-50 text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3" /> Ingeniería Inmobiliaria v15.0
            </div>
            <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-black tracking-tight leading-[0.88] uppercase">
              <span className="text-accent">G</span>estión <br /> <span className="text-primary">Inteligente.</span>
            </h1>
            <p className="text-xl text-muted leading-relaxed max-w-lg font-medium">
              La plataforma definitiva para administradores de propiedades. Automatización total con IA, liquidaciones en tiempo real y seguridad bancaria.
            </p>
            <div className="w-full max-w-sm">
              {!showEmailInput ? (
                <div className="flex flex-col gap-4">
                  <button onClick={handleLogin} className="w-full bg-ink text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-gray-800 transition-all shadow-2xl shadow-ink/20 flex items-center justify-center gap-3">
                    Ingresar con Google <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                  <button 
                    onClick={() => setShowEmailInput(true)}
                    className="w-full bg-white text-ink border border-gray-200 px-10 py-5 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                  >
                    Ingresar con Email <Mail className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <motion.form 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleEmailAccess} 
                  className="bg-gray-50 p-6 rounded-3xl border border-gray-100"
                >
                  <input 
                    type="email" 
                    value={emailForLogin}
                    onChange={(e) => setEmailForLogin(e.target.value)}
                    placeholder="tu@correo.com" 
                    required
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 bg-white text-ink font-bold text-center focus:ring-2 focus:ring-primary/20 outline-none transition-all mb-4"
                  />
                  <button 
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                  >
                    Enviar Link de Acceso
                  </button>
                  <p className="mt-4 text-[9px] font-bold text-muted uppercase tracking-widest opacity-60">
                    Recibirás un link directo en tu inbox
                  </p>
                </motion.form>
              )}
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="relative bg-gray-100 rounded-[48px] p-4 border border-border shadow-2xl overflow-hidden group"
          >
            {/* Mock Dashboard Preview */}
            <div className="bg-white rounded-[40px] shadow-2xl border border-border overflow-hidden flex h-[500px]">
              {/* Mini Sidebar */}
              <div className="w-16 border-r border-border bg-gray-50 flex flex-col items-center py-6 gap-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-[10px] font-black">P</div>
                <div className="space-y-4">
                  {[LayoutDashboard, Building2, FileSearch, Receipt].map((Icon, i) => (
                    <div key={`line-1721-${i}`} className={`p-2 rounded-lg ${i === 0 ? 'bg-primary text-white' : 'text-muted'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                {/* Mini Header */}
                <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-white">
                  <div className="h-2 w-32 bg-gray-100 rounded-full"></div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full"></div>
                    <div className="w-6 h-6 bg-gray-100 rounded-full"></div>
                  </div>
                </div>

                {/* Dashboard Grid */}
                <div className="p-6 space-y-6 overflow-hidden">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-border/50">
                      <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">Propiedades</p>
                      <p className="text-xl font-black text-ink">24</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl border border-primary/10">
                      <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Recaudación</p>
                      <p className="text-xl font-black text-primary">$12.5M</p>
                    </div>
                  </div>

                    <div className="space-y-3">
                      <p className="text-[8px] font-black text-muted uppercase tracking-widest">Actividad Reciente</p>
                      {[
                        { dir: 'Av. Las Condes 1240', status: 'Vigente', color: 'bg-green-100 text-accent' },
                        { dir: 'Calle Nueva York 45', status: 'Vencido', color: 'bg-orange-100 text-warning' },
                        { dir: 'Paseo Ahumada 312', status: 'Vigente', color: 'bg-green-100 text-accent' }
                      ].map((item, i) => (
                        <div key={`recent-activity-${i}-${item.dir}`} className="flex justify-between items-center p-3 bg-white border border-border/50 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gray-50 rounded flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-muted" />
                          </div>
                          <p className="text-[10px] font-bold">{item.dir}</p>
                        </div>
                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${item.color}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* AI Status Mini Widget */}
                  <div className="ai-gradient p-4 rounded-2xl text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 animate-pulse" />
                      <div>
                        <p className="text-[8px] font-black uppercase opacity-70">Motor IA Activo</p>
                        <p className="text-[10px] font-bold">IA Avanzada Estándar</p>
                      </div>
                    </div>
                    <div className="h-1 w-12 bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ x: [-48, 48] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="h-full w-full bg-white"
                      />
                    </div>
                  </div>

                  {/* New Contact Support Widget in Dashboard */}
                  <div 
                    onClick={() => setActiveModule('support')}
                    className="p-4 bg-ink text-white rounded-2xl flex items-center justify-between cursor-pointer hover:bg-black transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                        <CalendarDays className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase opacity-60">¿Necesitas ayuda?</p>
                        <p className="text-[10px] font-bold">Agenda una reunión</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 rotate-180 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Detail Card */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-12 -right-4 bg-white p-5 rounded-3xl shadow-2xl border border-border flex flex-col gap-3 w-48"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-muted uppercase">Contrato</p>
                  <p className="text-xs font-bold">Analizado</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-1.5 bg-gray-100 rounded-full w-full"></div>
                <div className="h-1.5 bg-gray-100 rounded-full w-2/3"></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[8px] font-black text-accent uppercase">98% Precisión</span>
                <CheckCircle2 className="w-3 h-3 text-accent" />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Product Showcase Section */}
        <section id="features" className="bg-ink text-white py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-1 space-y-6">
                <h2 className="text-5xl font-black tracking-tight leading-none uppercase">Características <br /> de Elite.</h2>
                <p className="text-white/60 text-lg leading-relaxed">
                  Diseñado por ingenieros para administradores que buscan la perfección operativa.
                </p>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { icon: <ShieldCheck className="w-8 h-8" />, title: "Seguridad Bancaria", desc: "Cifrado de extremo a extremo para todos sus contratos y datos financieros." },
                  { icon: <Zap className="w-8 h-8" />, title: "IA Avanzada", desc: "El motor de IA más rápido del mundo procesando sus documentos en milisegundos." },
                  { icon: <Globe className="w-8 h-8" />, title: "Acceso Universal", desc: "Gestione su cartera desde cualquier lugar, en cualquier dispositivo, en tiempo real." },
                  { icon: <BarChart3 className="w-8 h-8" />, title: "Reportes Pro", desc: "Liquidaciones mensuales automáticas enviadas directamente al propietario." }
                ].map((item, i) => (
                  <div key={`line-1855-${i}`} className="bg-white/5 p-8 rounded-[32px] border border-white/10 hover:bg-white/10 transition-all group">
                    <div className="text-primary mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Market Competitiveness (Recipe 1) */}
        <section id="market" className="py-32 max-w-7xl mx-auto px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black tracking-tight uppercase mb-4">Análisis de Competitividad</h2>
            <div className="h-1 w-20 bg-primary mx-auto"></div>
          </div>
          <div className="border border-border rounded-[40px] overflow-hidden shadow-2xl">
            <div className="grid grid-cols-4 bg-gray-50 p-6 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted">
              <div className="col-span-1">Funcionalidad</div>
              <div className="text-center text-primary">Punto Propiedades</div>
              <div className="text-center">Software Tradicional</div>
              <div className="text-center">Excel / Manual</div>
            </div>
            {[
              { label: 'Procesamiento IA', punto: '✓ Full', trad: '✗ No', manual: '✗ No' },
              { label: 'Liquidación Automática', punto: '✓ 1-Click', trad: '⚠ Limitado', manual: '✗ Manual' },
              { label: 'Gestión Documental', punto: '✓ Cloud', trad: '✓ Cloud', manual: '✗ Local' },
              { label: 'Costo Operativo', punto: '↓ Mínimo', trad: '↑ Alto', manual: '↑↑ Máximo' }
            ].map((row, i) => (
              <div key={`line-1885-${i}`} className="grid grid-cols-4 p-8 border-b border-border hover:bg-gray-50 transition-all items-center">
                <div className="text-sm font-bold text-ink">{row.label}</div>
                <div className="text-center text-primary font-black">{row.punto}</div>
                <div className="text-center text-muted font-bold">{row.trad}</div>
                <div className="text-center text-muted font-bold">{row.manual}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="bg-gray-50 border-t border-border py-16">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white text-xs shadow-lg shadow-primary/20">P</div>
              <span className="text-ink">PUNTO PROPIEDADES</span>
            </div>
            <p className="text-muted text-sm font-bold uppercase tracking-widest">© 2026 Ingeniería Inmobiliaria de Clase Mundial.</p>
            <div className="flex gap-6">
              <a href="#" className="text-muted hover:text-primary transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" className="text-muted hover:text-primary transition-colors"><Mail className="w-5 h-5" /></a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  const sortedProperties = [...filterProperties(properties, propSearch)]
    .sort((a, b) => {
    if (sortType === 'date') {
      const dateA = a.termino ? new Date(a.termino).getTime() : Infinity;
      const dateB = b.termino ? new Date(b.termino).getTime() : Infinity;
      return dateA - dateB;
    }
    if (sortType === 'name-asc') {
      return (a.direccion || '').localeCompare(b.direccion || '');
    }
    if (sortType === 'name-desc') {
      return (b.direccion || '').localeCompare(a.direccion || '');
    }
    return 0;
  });

  const availableYears = Array.from(new Set(
    properties
      .map(p => {
        if (!p.inicio) return null;
        const parts = p.inicio.split('-');
        return parts[0];
      })
      .filter(Boolean)
  ))
  .sort((a, b) => b!.localeCompare(a!));

  const filteredSidebarProps = filterProperties(properties, propSearch)
    .filter(p => !onlyFlagged || !!p.flagged)
    .filter(p => {
      if (selectedYearFilter === 'all') return true;
      if (!p.inicio) return false;
      return p.inicio.startsWith(selectedYearFilter);
    });
  
  return (
    <div className="flex h-screen bg-[#faf9f6]/40 text-[#1a1a1a] overflow-hidden selection:bg-primary/20">
      {/* Sidebar: Clean & Bright */}
      <aside className={`bg-white transition-all duration-500 ease-in-out flex flex-col z-40 relative border-r border-border/50 shadow-sm ${sidebarOpen ? 'w-[260px]' : 'w-[80px]'}`}>
        <div className={`py-6 mb-4 flex items-center transition-all duration-500 ${sidebarOpen ? 'px-6 justify-between' : 'px-4 justify-center gap-3'}`}>
          <div className={`flex items-center gap-3 transition-all duration-500 ${!sidebarOpen && 'scale-105'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
               <span className="text-white font-bold text-sm">P</span>
            </div>
            {sidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-0.5 min-w-0"
              >
                <span className="text-ink font-black text-sm tracking-tight leading-none uppercase truncate">Punto</span>
                <span className="text-primary font-bold text-[8px] tracking-widest leading-none uppercase truncate">Propiedades</span>
              </motion.div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`text-muted hover:text-ink transition-all shrink-0 ${!sidebarOpen ? 'p-2 hover:bg-gray-50 rounded-lg' : ''}`}>
             <Menu className={sidebarOpen ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 mt-4">
          {[
            { id: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Panel de Control' },
            { id: 'properties', icon: <Building2 className="w-4 h-4" />, label: 'Propiedades Activas' },
            { id: 'ai', icon: <Zap className="w-4 h-4" />, label: 'Procesador IA' },
            { id: 'reports', icon: <PieChart className="w-4 h-4" />, label: 'Reportes Mensuales' },
            { id: 'support', icon: <Calendar className="w-4 h-4" />, label: 'Soporte y Reuniones' },
            { id: 'email', icon: <Mail className="w-4 h-4" />, label: 'Correo' },
            ...(isAdmin ? [{ id: 'admin', icon: <ShieldCheck className="w-4 h-4" />, label: 'Admin Master' }] : [])
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-full font-bold text-[11px] tracking-wider relative group overflow-hidden smooth-transition ${
                activeModule === item.id 
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-premium shadow-accent/20 scale-[1.02] glow-hover' 
                  : 'text-muted hover:text-primary hover:bg-slate-50 hover:translate-x-1'
              }`}
            >
              <div className="relative z-10 shrink-0">
                {item.icon}
              </div>
              {sidebarOpen && <span className="relative z-10 truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
        
        <div className="px-4 py-6">
          <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white border border-border/50 shadow-sm ${!sidebarOpen && 'justify-center'}`}>
            {impersonatedUid && (
              <button className="px-2 py-1 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded-lg" onClick={() => setImpersonatedUid(null)}>
                Volver
              </button>
            )}
            <div className="relative shrink-0">
               <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
               <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold truncate text-ink">{user.displayName || 'Corredor'}</p>
                <p className="text-[8px] text-muted font-medium truncate">{user.email}</p>
              </div>
            )}
            {sidebarOpen && (
               <button onClick={() => auth.signOut()} className="text-muted hover:text-red-500 transition-colors ml-1">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
               </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${activeModule === 'properties' ? 'overflow-hidden' : 'overflow-y-auto'} ${activeModule === 'properties' ? 'p-3 md:p-6' : activeModule === 'settings' || activeModule === 'support' || activeModule === 'admin' ? 'p-6 pt-4' : 'p-8'} relative`}>
        {activeModule !== 'properties' && activeModule !== 'ai' && activeModule !== 'reports' && (
          <header className={`flex justify-between items-center ${activeModule === 'settings' || activeModule === 'support' || activeModule === 'admin' ? 'mb-4' : 'mb-8'}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-red-600 to-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-ink leading-tight">
                  {activeModule === 'dashboard' && 'Panel de Control'}
                  {/* {activeModule === 'email' && 'Centro de Comunicaciones'} */}
                  {activeModule === 'ai' && 'Motor de Inteligencia'}
                  {activeModule === 'reports' && 'Reportes Mensuales'}
                  {activeModule === 'support' && 'Soporte y Agenda'}
                  {activeModule === 'settings' && 'Correo'}
                  {activeModule === 'admin' && 'Administración Master'}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">Terminal Pro</p>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <p className="text-[10px] text-muted font-medium uppercase tracking-widest">Inmuebles Activos: {properties.length}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {activeModule !== 'settings' && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="bg-primary hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4" /> Nueva Propiedad
                </button>
              )}
            </div>
          </header>
        )}


        {activeModule === 'email' && (
          <div className="flex-1 p-8 text-center">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-ink mb-6">Centro de Comunicaciones</h2>
            <button 
              onClick={() => setShowReportModal(true)}
              className="bg-accent text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 mx-auto"
            >
                <FileCheck className="w-5 h-5" /> Generar Reporte
            </button>
            <p className="text-muted text-sm italic mt-4">Apartado en desarrollo para gestionar correos.</p>
          </div>
        )}

        {activeModule === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-700">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Left: Property Summary - Wider for better impact */}
               <div className="lg:col-span-8 bg-white rounded-[40px] border border-border/10 shadow-premium overflow-hidden h-fit">
                  <div className="p-8 border-b border-border/5 flex justify-between items-center bg-bg/20">
                     <div>
                        <h4 className="text-[10px] font-black text-ink/20 uppercase tracking-[0.4em] font-mono">Gestión de Activos</h4>
                        <p className="text-xl font-bold text-ink uppercase tracking-tight mt-1">Resumen de Propiedades</p>
                     </div>
                     <button onClick={() => setActiveModule('properties')} className="px-6 py-3 bg-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-premium">Propiedades Activas</button>
                  </div>
                  <div className="divide-y divide-border/5 overflow-hidden">
                    {properties.slice(0, 10).map((p, i) => (
                      <div 
                        key={`dashboard-prop-${p.id || 'virtual'}-${i}`} 
                        onClick={() => { setSelectedProp(p); setActiveModule('properties'); }}
                        className="p-6 px-10 flex justify-between items-center hover:bg-bg/10 transition-all cursor-pointer group"
                      >
                         <div className="flex items-center gap-8 min-w-0 flex-1">
                            <div className="w-16 h-16 bg-bg rounded-[26px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 shrink-0">
                               <Building2 className="w-7 h-7 text-ink/20 group-hover:text-accent" />
                            </div>
                            <div className="min-w-0 flex-1 text-ink">
                               <div className="flex gap-2 text-[10px] font-black text-ink uppercase tracking-[0.2em] mb-1 font-mono truncate">
                                  <span className="truncate">{p.dueno || 'Sin Dueño'}</span>
                                  <span className="text-ink/40">vs</span>
                                  <span className="truncate">{p.arrendatario || 'Sin Inquilino'}</span>
                               </div>
                               <div className="h-6 flex items-center gap-3">
                                  <p className="text-[8px] font-bold text-muted uppercase tracking-widest break-words">
                                    {p.direccion || 'Sin dirección'}
                                  </p>
                                  {p.flagged && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePropertyFlag(p.id, true);
                                      }}
                                      className="text-red-500 hover:text-gray-300 p-1 rounded-md transition-all self-center shrink-0"
                                      title="Quitar banderita"
                                    >
                                      <Flag className="w-3 h-3 fill-current" />
                                    </button>
                                  )}
                               </div>
                            </div>
                         </div>
                         <div className="text-right ml-10 shrink-0">
                            <p className="text-xl font-bold text-ink leading-none mb-2.5">{formatMoney(p.valor, p.tipoMonto)}</p>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border ${isExpired(p.termino) ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                               {isExpired(p.termino) ? 'Vencido' : 'Vigente'}
                            </span>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               {/* Right: Metrics - Compact for better visibility */}
               <div className="lg:col-span-4 space-y-4">
                 {/* Total Inmuebles */}
                 <div className="bg-white p-6 rounded-[28px] border border-border/10 shadow-premium group hover:-translate-y-1 transition-all flex flex-col justify-between h-[120px]">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bg rounded-[14px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner text-accent">
                           <Building2 size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-ink/20 uppercase tracking-[0.3em] font-mono leading-none mb-1">Total</p>
                          <p className="text-[11px] font-black text-ink uppercase tracking-tight leading-none">Inmuebles</p>
                        </div>
                      </div>
                      <div className="bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
                         <p className="text-[8px] font-black text-accent uppercase tracking-widest">Activas</p>
                      </div>
                    </div>
                    <div className="flex justify-end items-baseline gap-1.5">
                      <p className="text-4xl font-bold text-ink tracking-tighter leading-none">{properties.length}</p>
                      <span className="text-[9px] font-black text-muted uppercase">Unid.</span>
                    </div>
                 </div>

                 {/* Ingreso Bruto */}
                 <div className="bg-ink p-6 rounded-[28px] shadow-2xl relative overflow-hidden group flex flex-col justify-between h-[120px]">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 rounded-full blur-[40px]" />
                    <div className="relative z-10 flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/5 rounded-[14px] flex items-center justify-center border border-white/5 shadow-inner text-accent">
                             <BarChart3 size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono leading-none mb-1">Ingreso</p>
                            <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none">Mensual</p>
                          </div>
                       </div>
                    </div>
                    <div className="relative z-10">
                       <div className="flex items-baseline justify-end gap-2">
                           {(() => {
                             const pesosTotal = properties.filter(p => !p.tipoMonto || p.tipoMonto === 'pesos').reduce((acc, p) => acc + Number(p.valor), 0);
                             const ufTotal = properties.filter(p => p.tipoMonto === 'uf').reduce((acc, p) => acc + Number(p.valor), 0);
                             return (
                               <div className="flex flex-col items-end">
                                 {pesosTotal > 0 && <span className="text-xl font-bold text-white leading-none">{formatMoney(pesosTotal, 'pesos')}</span>}
                                 {ufTotal > 0 && <span className="text-xs font-bold text-accent leading-none mt-1">{formatMoney(ufTotal, 'uf')}</span>}
                                 {pesosTotal === 0 && ufTotal === 0 && <span className="text-xl font-bold text-white leading-none">$0</span>}
                               </div>
                             );
                           })()}
                       </div>
                    </div>
                 </div>

                 {/* Vencimientos */}
                 <div className="bg-[#fffaf5] p-6 rounded-[28px] border border-[#f5e6d3] shadow-premium group transition-all flex flex-col justify-between h-[120px]">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-sm border border-[#f5e6d3]/30 text-[#d97706]">
                           <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-[#d97706]/40 uppercase tracking-[0.3em] font-mono leading-none mb-1">Alertas</p>
                          <p className="text-[11px] font-black text-[#d97706] uppercase tracking-tight leading-none">Vencimientos</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end items-baseline gap-1.5">
                      <p className="text-4xl font-bold text-ink tracking-tighter leading-none">{properties.filter(p => isExpired(p.termino)).length}</p>
                      <span className="text-[9px] font-black text-muted uppercase">prop.</span>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        )}


        {activeModule === 'properties' && (
          <div className="flex flex-col lg:flex-row h-full overflow-hidden rounded-xl lg:rounded-[24px] border border-border/10 bg-white shadow-sm relative z-10">
            {/* Left: List - Stable width on desktop, full-width on mobile/zoom */}
            <div 
              className={`overflow-hidden flex flex-col h-full w-full lg:w-[400px] shrink-0 border-r border-border/10 bg-white/40 backdrop-blur-md z-20 relative ${
                selectedProp ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="flex flex-col gap-4 p-6 mt-4">
                <div className="flex gap-2 relative">
                  <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Buscar por dirección, dueño, arrendatario..." 
                      className="w-full bg-white border border-border/70 rounded-xl py-2.5 pr-4 pl-10 text-[11px] font-bold tracking-wide outline-none focus:border-primary focus:ring-4 ring-primary/5 transition-all shadow-sm text-ink placeholder:text-muted/50"
                      value={propSearch}
                      onChange={(e) => setPropSearch(e.target.value)}
                    />
                    {propSearch.length > 0 && (
                         <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
                            <div className="px-4 py-2 text-[9px] font-black text-muted uppercase bg-gray-50 border-b border-border">Propiedades</div>
                            {filteredSidebarProps.slice(0, 5).map(p => (
                                <button key={`prop-search-result-${p.id}`} className="w-full text-left px-4 py-2 hover:bg-primary/5 text-[11px] font-bold text-ink" onClick={() => { setSelectedProp(p); setPropSearch(''); }}>
                                    {p.direccion}
                                </button>
                            ))}
                            <div className="px-4 py-2 text-[9px] font-black text-muted uppercase bg-gray-50 border-b border-border border-t">Participantes</div>
                            {filteredSidebarProps.slice(0, 5).map(p => (
                                <div key={`prop-search-participants-${p.id}`} className="w-full text-left px-4 py-2 hover:bg-primary/5 text-[11px] font-bold text-ink">
                                    {p.dueno && <div className="cursor-pointer py-1" onClick={() => { setPropSearch(''); setSelectedProp(p); }}>Dueño: {p.dueno}</div>}
                                    {p.arrendatario && <div className="cursor-pointer py-1" onClick={() => { setPropSearch(''); setSelectedProp(p); }}>Arrendatario: {p.arrendatario}</div>}
                                    {p.aval && <div className="cursor-pointer py-1" onClick={() => { setPropSearch(''); setSelectedProp(p); }}>Aval: {p.aval}</div>}
                                </div>
                            ))}
                         </div>
                    )}
                  </div>
                  {/* Year Filter Dropdown */}
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                    className={`h-10 px-2 rounded-xl border bg-white text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer transition-all shrink-0 ${
                      selectedYearFilter !== 'all' 
                        ? 'border-primary text-primary bg-red-50/30' 
                        : 'border-border/70 text-muted hover:border-primary'
                    }`}
                  >
                    <option value="all">Año: Todos</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>

                  <button 
                    onClick={() => setOnlyFlagged(!onlyFlagged)}
                    className={`w-10 h-10 rounded-xl transition-all border flex items-center justify-center shrink-0 ${
                      onlyFlagged 
                        ? 'bg-red-50 text-red-500 border-red-200' 
                        : 'bg-white text-[#d1d5db] border-border/70 hover:text-red-500'
                    }`}
                    title={onlyFlagged ? "Mostrar todas" : "Mostrar destacadas (banderita)"}
                  >
                    <Flag className={`w-4 h-4 ${onlyFlagged ? 'fill-current' : ''}`} />
                  </button>
                  <button 
                    onClick={() => { setFormData({}); setIsAdding(true); }}
                    className="w-10 h-10 bg-primary text-white rounded-xl hover:bg-red-600 transition-all shadow-md flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex justify-between items-end px-2 mt-4 mb-2">
                   <span className="text-primary font-bold text-[10px] uppercase tracking-widest leading-tight">
                     {properties.length} UNIDADES
                   </span>
                   <span className="text-muted font-bold text-[10px] uppercase tracking-widest">
                     VENCIMIENTO
                   </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-0 space-y-3">
                {filteredSidebarProps.length > 0 ? (
                  filteredSidebarProps
                    .sort((a, b) => {
                      if (sortType === 'name-asc') return (a.direccion || '').localeCompare(b.direccion || '');
                      if (sortType === 'name-desc') return (b.direccion || '').localeCompare(a.direccion || '');
                      const dateA = a.inicio ? new Date(a.inicio).getTime() : 0;
                      const dateB = b.inicio ? new Date(b.inicio).getTime() : 0;
                      return dateB - dateA;
                    })
                    .map((p, i) => (
                      <div 
                      key={`prop-list-item-${p.id || 'virtual'}-${i}`} 
                      onClick={() => { setSelectedProp(p); setActiveTab('legal'); }} 
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border group/item ${
                         selectedProp?.id === p.id 
                           ? 'bg-red-50/30 border-red-200/50 shadow-sm ring-1 ring-red-100' 
                           : 'bg-white border-border/60 hover:border-red-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[7px] text-slate-400 font-bold uppercase">Contrato</span>
                        {p.inicio && (
                          <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded font-mono shadow-sm">
                            {(() => {
                              const parts = p.inicio.split('-');
                              if (parts.length >= 2) {
                                return `${parts[0]}-${parts[1]}`;
                              }
                              return p.inicio;
                            })()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <div className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate" title={p.dueno || 'Sin Dueño'}>{p.dueno || 'Sin Dueño'}</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase italic">vs</div>
                              <div className="text-[10px] font-black text-red-700 uppercase tracking-tight truncate" title={p.arrendatario || 'Sin Inquilino'}>{p.arrendatario || 'Sin Inquilino'}</div>
                          </div>
                      
                          <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePropertyFlag(p.id, !!p.flagged);
                            }}
                            className={`shrink-0 p-1 rounded-md transition-all ${
                                p.flagged 
                                  ? 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-200/50' 
                                  : 'text-gray-200 hover:text-red-400 hover:bg-gray-50'
                            }`}
                          >
                            <Flag className={`w-3.5 h-3.5 ${p.flagged ? 'fill-current' : ''}`} />
                          </button>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 mt-3">
                        <div className="flex items-center gap-2">
                             {isExpired(p.termino) && (
                                <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-md shrink-0 border border-red-100">
                                    <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">Vencido</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                </div>
                              )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 px-6 text-center bg-gray-50/50 rounded-2xl border border-dashed border-border/40">
                    <Search className="w-8 h-8 text-muted/30 mx-auto mb-3" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50">Sin Coincidencias</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Details */}
            <div 
              id="property-details-container"
              className={`flex-1 overflow-y-auto custom-scrollbar bg-bg relative z-10 transition-all ${
                selectedProp ? 'flex flex-col' : 'hidden lg:flex'
              }`}
            >
              {selectedProp ? (
                <div className="min-h-full flex flex-col w-full">
                  {/* Property Header - Robust Adaptive Layout */}
                  <div className="py-3 lg:py-4 px-6 lg:px-10 border-b border-border/10 bg-white shadow-sm shrink-0">
                    <div className="flex flex-col gap-4">
                      {/* Responsive Back Button */}
                      <button 
                        onClick={() => setSelectedProp(null)}
                        className="lg:hidden flex items-center gap-1.5 self-start text-[10px] font-black uppercase tracking-widest text-ink/70 hover:text-ink transition-all bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-border/10 mb-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver al Listado
                      </button>
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex items-center gap-4 min-w-0 w-full lg:w-auto">
                          <div className="w-12 h-12 bg-[#1a1a1a] text-white rounded-[14px] flex items-center justify-center shrink-0 shadow-md">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <div className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-red-50 text-red-600 rounded-full border border-red-100 flex items-center gap-1 shadow-sm font-mono">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                {isExpired(selectedProp.termino) ? 'VENCIDA' : 'ACTIVA'}
                              </div>
                              <span className="text-[8px] font-mono font-medium text-ink/20 uppercase tracking-widest">REF: {selectedProp.id}</span>
                            </div>
                            
                            <div className="py-0.5">
                              <h3 className={`font-black tracking-tight text-ink leading-[1.1] uppercase transition-all max-w-2xl ${
                                selectedProp.direccion.length > 100 ? 'text-xs lg:text-sm' : 
                                selectedProp.direccion.length > 70 ? 'text-sm lg:text-base' : 
                                selectedProp.direccion.length > 40 ? 'text-base lg:text-lg' : 
                                'text-lg lg:text-xl'
                              }`}>
                                {selectedProp.direccion}
                              </h3>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/5">
                          <div className="text-right">
                             <p className="text-[8px] text-muted font-bold uppercase tracking-widest mb-0.5 opacity-60">VALORIZACIÓN</p>
                             <p className="text-xl lg:text-2xl font-black text-primary leading-none tracking-tighter">
                               {formatMoney(selectedProp.valor, selectedProp.tipoMonto)}
                             </p>
                          </div>
                          <button onClick={() => { setFormData(selectedProp); setIsAdding(true); }} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-ink rounded-xl border border-border/40 transition-all flex items-center justify-center shadow-sm group">
                             <Pencil size={16} className="group-hover:scale-110 transition-transform duration-500" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap items-center gap-3 bg-red-50/40 p-2 lg:px-4 lg:py-2 rounded-[16px] border border-red-100/50 shadow-sm flex-1 lg:flex-none">
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-red-100/50 flex items-center justify-center">
                               <CalendarDays className="w-4 h-4 text-red-600" />
                             </div>
                             <div className="flex items-center gap-6">
                               <div className="text-center sm:text-left">
                                 <span className="text-[7px] font-black uppercase tracking-[0.15em] text-red-600/50 block mb-0.5 leading-none">Inicio Contrato</span>
                                 <span className="text-[11px] font-black text-ink tracking-tight leading-none">{selectedProp.f_ini || 'N/A'}</span>
                               </div>
                               <div className="w-px h-6 bg-red-100/30" />
                               <div className="text-center sm:text-left">
                                 <span className="text-[7px] font-black uppercase tracking-[0.15em] text-red-600/50 block mb-0.5 leading-none">Vencimiento</span>
                                 <span className="text-[11px] font-black text-ink tracking-tight leading-none">{selectedProp.termino || 'Indef'}</span>
                               </div>
                             </div>
                           </div>
                           
                           <div className="hidden sm:block w-px h-6 bg-red-100/30 mx-1.5" />
                           
                           <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                             <div className="flex flex-col items-center">
                               <span className="text-[6px] font-bold text-red-600/40 uppercase tracking-widest mb-0.5 leading-none">Plazo</span>
                               <span className="text-[8px] font-black text-red-700 bg-white px-1.5 py-0.5 rounded border border-red-50 shadow-sm leading-none">{selectedProp.duracion || '12M'}</span>
                             </div>
                             <button onClick={renewContract} className="bg-ink text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                               <RefreshCw className="w-3 h-3" /> Renovar
                             </button>
                           </div>
                        </div>
                        
                        <button 
                            onClick={() => viewContract(selectedProp.pdf, selectedProp.arrendatario)}
                            className="px-4 py-2 bg-white border border-border/60 rounded-2xl flex items-center gap-2 transition-all hover:bg-gray-50 hover:border-border shadow-sm h-full self-stretch lg:self-auto group"
                        >
                          <FileText className="w-4 h-4 text-ink/70 group-hover:text-primary transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-ink">Ver Contrato PDF</span>
                        </button>
                      </div>
                      
                      {/* Integrated Tabs Selector */}
                      <div className="border-t border-border/10 pt-3 flex justify-center">
                        <div className="flex bg-gray-100/60 p-1 rounded-full border border-border/30">
                          {[
                            { id: 'legal', label: 'Identidad', icon: Users },
                            { id: 'finances', label: 'Gastos', icon: Receipt },
                            { id: 'document', label: 'Contrato', icon: ShieldCheck }
                          ].map(tab => (
                            <button 
                              key={tab.id}
                              onClick={() => {
                                  setActiveTab(tab.id as any);
                                  document.getElementById('property-details-container')?.scrollTo({ top: 0, behavior: 'auto' });
                              }}
                              className={`py-1.5 px-4 lg:px-6 rounded-full font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-1.5 ${
                                activeTab === tab.id 
                                  ? 'bg-ink text-white shadow-sm scale-105 z-10' 
                                  : 'text-muted hover:text-ink hover:bg-white/40'
                              }`}
                            >
                              <tab.icon size={11} className={activeTab === tab.id ? 'text-white' : 'opacity-40'} />
                              <span>{tab.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div id="details-scroll-area" className="flex-1 p-6 bg-gray-50/40">
                    {activeTab === 'legal' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                        
                        {/* PROFILE: OWNER */}
                        <div className="bg-white p-6 rounded-2xl border border-border/60 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md min-h-[220px]">
                          {(() => {
                            const names = (selectedProp.dueno || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const ruts = (selectedProp.rutDue || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const tels = (selectedProp.telD || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const splittedEmails = (selectedProp.mailD || '').split(',').map((s: string) => s.trim()).filter(Boolean);

                            return (
                              <div className="h-full flex flex-col">
                                <div className="flex items-center gap-2.5 mb-5 relative z-10 shrink-0">
                                  <div className="w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                      <UserIcon className="w-3.5 h-3.5 text-ink" />
                                  </div>
                                  <span className="text-[11px] font-bold text-ink uppercase tracking-widest">{getSectionTitle(names, 'dueno')}</span>
                                </div>
                                
                                {names.length === 0 && (
                                  <div className="flex-1 flex items-center justify-center py-6">
                                    <p className="text-xs font-medium text-gray-400">Sin Registro</p>
                                  </div>
                                )}
                                
                                {names.length > 0 && (
                                  <div className="flex flex-col flex-1">
                                    {/* Names vertical list matching h-auto height vibe */}
                                    <div className="h-auto min-h-[80px] flex flex-col justify-center py-1 overflow-visible relative z-10">
                                      {names.map((name, i) => (
                                        <p key={`${name}-${i}`} className={`font-extrabold text-ink leading-tight uppercase break-words px-1 py-0.5 ${
                                          names.length > 2 ? 'text-[9px]' : names.length > 1 ? 'text-[10px]' : 'text-xs'
                                        }`} title={name}>
                                          {`${i + 1}. `}{name}
                                        </p>
                                      ))}
                                    </div>
                                    {/* Shared structured section details */}
                                    <div className="space-y-3 mt-auto border-t border-border/50 pt-4 px-1 relative z-10">
                                      {/* RUT Row */}
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">RUT</span>
                                        <div className="text-right space-y-0.5 min-w-0 flex-1">
                                          {ruts.length > 0 ? (
                                            ruts.map((rut, idx) => (
                                              <span key={idx} className="text-[10px] font-bold text-ink tracking-tight block truncate" title={rut}>
                                                <span className="text-gray-400 font-medium text-[8px] mr-1">#{idx + 1}</span>
                                                {formatRut(rut)}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-400 block">N/A</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* TEL Row */}
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">TEL</span>
                                        <div className="text-right space-y-0.5 min-w-0 flex-1">
                                          {tels.length > 0 ? (
                                            tels.map((tel, idx) => (
                                              <span key={idx} className="text-[10px] font-bold text-ink tracking-tight block truncate" title={tel}>
                                                {tels.length > 1 ? <span className="text-gray-400 font-medium text-[8px] mr-1">#{idx + 1}</span> : null}
                                                {tel}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-400 block">N/A</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* EMAIL Row */}
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">EMAIL</span>
                                        <div className="text-right space-y-0.5 min-w-0 flex-1">
                                          {splittedEmails.length > 0 ? (
                                            splittedEmails.map((email, idx) => (
                                              <span key={idx} className="text-[10px] font-bold text-ink hover:text-primary transition-colors cursor-pointer block truncate lowercase selection:bg-accent/20" title={email}>
                                                {splittedEmails.length > 1 ? <span className="text-gray-400 font-medium text-[8px] mr-1">#{idx + 1}</span> : null}
                                                {email}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-400 block">N/A</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* PROFILE: TENANT */}
                        <div className="bg-white p-6 rounded-2xl border border-border/60 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md min-h-[220px]">
                          {(() => {
                            const names = (selectedProp.arrendatario || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const ruts = (selectedProp.rutArr || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const tels = (selectedProp.telA || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const splittedEmails = (selectedProp.mailA || '').split(',').map((s: string) => s.trim()).filter(Boolean);

                            return (
                              <div className="h-full flex flex-col">
                                <div className="flex items-center gap-2.5 mb-5 relative z-10 shrink-0">
                                  <div className="w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                      <Users className="w-3.5 h-3.5 text-green-600" />
                                  </div>
                                  <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">{getSectionTitle(names, 'arrendatario')}</span>
                                </div>
                                
                                {names.length === 0 && (
                                  <div className="flex-1 flex items-center justify-center py-6">
                                    <p className="text-xs font-medium text-gray-400">Sin Registro</p>
                                  </div>
                                )}
                                
                                {names.length > 0 && (
                                  <div className="flex flex-col flex-1">
                                    {/* Names vertical list matching h-auto height vibe */}
                                    <div className="h-auto min-h-[80px] flex flex-col justify-center py-1 overflow-visible relative z-10">
                                      {names.map((name, i) => (
                                        <p key={`${name}-${i}`} className={`font-extrabold text-ink leading-tight uppercase break-words px-1 py-0.5 ${
                                          names.length > 2 ? 'text-[9px]' : names.length > 1 ? 'text-[10px]' : 'text-xs'
                                        }`} title={name}>
                                          {`${i + 1}. `}{name}
                                        </p>
                                      ))}
                                    </div>
                                    {/* Shared structured section details */}
                                    <div className="space-y-3 mt-auto border-t border-border/50 pt-4 px-1 relative z-10">
                                      {/* RUT Row */}
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">RUT</span>
                                        <div className="text-right space-y-0.5 min-w-0 flex-1">
                                          {ruts.length > 0 ? (
                                            ruts.map((rut, idx) => (
                                              <span key={idx} className="text-[10px] font-bold text-ink tracking-tight block truncate" title={rut}>
                                                <span className="text-gray-400 font-medium text-[8px] mr-1">#{idx + 1}</span>
                                                {formatRut(rut)}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-400 block">N/A</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* TEL Row */}
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">TEL</span>
                                        <div className="text-right space-y-0.5 min-w-0 flex-1">
                                          {tels.length > 0 ? (
                                            tels.map((tel, idx) => (
                                              <span key={idx} className="text-[10px] font-bold text-ink tracking-tight block truncate" title={tel}>
                                                {tels.length > 1 ? <span className="text-gray-400 font-medium text-[8px] mr-1">#{idx + 1}</span> : null}
                                                {tel}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-400 block">N/A</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* EMAIL Row */}
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">EMAIL</span>
                                        <div className="text-right space-y-0.5 min-w-0 flex-1">
                                          {splittedEmails.length > 0 ? (
                                            splittedEmails.map((email, idx) => (
                                              <span key={idx} className="text-[10px] font-bold text-ink hover:text-primary transition-colors cursor-pointer block truncate lowercase selection:bg-accent/20" title={email}>
                                                {splittedEmails.length > 1 ? <span className="text-gray-400 font-medium text-[8px] mr-1">#{idx + 1}</span> : null}
                                                {email}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-400 block">N/A</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* PROFILE: GUARANTOR */}
                        <div className="bg-white p-6 rounded-2xl border border-border/60 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md min-h-[220px]">
                          <div className="flex items-center gap-2.5 mb-5 relative z-10">
                            <div className="w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                            </div>
                            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">AVAL / CODEUDOR</span>
                          </div>
                          
                          <div className="h-auto min-h-[80px] flex items-center py-2">
                            <p className="font-bold tracking-tight text-ink leading-tight relative z-10 transition-all text-sm break-words">
                              {selectedProp.aval || 'Sin Registro'}
                            </p>
                          </div>
                          
                          <div className="space-y-3 mt-auto border-t border-border/50 pt-4 px-1 relative z-10">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">RUT</span>
                                <span className="text-[10px] font-bold text-ink tracking-tight">{selectedProp.rutAval || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">TEL</span>
                                <span className="text-[10px] font-bold text-ink tracking-tight">{selectedProp.telAval || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">EMAIL</span>
                                <span className="text-[10px] font-bold text-ink hover:text-primary transition-colors cursor-pointer truncate max-w-[140px] lowercase selection:bg-accent/20">{selectedProp.mailAval || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                          {activeTab === 'finances' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-4 duration-500">
                              <AnimatePresence>
                                {showExpenseForm && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0, y: -10, scale: 0.98 }} 
                                    animate={{ height: 'auto', opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ height: 0, opacity: 0, y: -10, scale: 0.98 }}
                                    className="bg-white p-4 rounded-xl border border-border/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-4 shadow-sm relative overflow-visible"
                                  >
                                     <div className="md:col-span-2">
                                       <CustomSelect 
                                         label="Categoría"
                                         value={expenseForm.tipo}
                                         onChange={(val) => setExpenseForm({...expenseForm, tipo: val})}
                                         options={EXPENSE_TYPES}
                                       />
                                     </div>
                                     <div className="md:col-span-3">
                                       <CustomSelect 
                                         label="Mes Fiscal"
                                         value={expenseForm.mes}
                                         onChange={(val) => setExpenseForm({...expenseForm, mes: val})}
                                         options={MONTHS_WITH_YEAR}
                                       />
                                     </div>
                                     <div className="md:col-span-2">
                                      <div className="bg-gray-50 border border-border/50 rounded-xl px-3 py-1.5 focus-within:border-ink/20 focus-within:ring-2 ring-ink/5 transition-all shadow-sm group">
                                        <label className="text-[9px] font-bold text-muted group-hover:text-ink uppercase mb-1 block tracking-widest transition-colors">Monto</label>
                                        <div className="flex items-center gap-3">
                                           <span className="text-muted font-bold text-base leading-none">$</span>
                                           <input 
                                            type="number" 
                                            value={expenseForm.monto}
                                            onChange={(e) => setExpenseForm({...expenseForm, monto: e.target.value})}
                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                            className="w-full bg-transparent text-base font-black outline-none text-ink placeholder:text-muted/50"
                                            placeholder="0"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="md:col-span-2">
                                      <div className="bg-gray-50 border border-border/50 rounded-xl px-3 py-1.5 focus-within:border-ink/20 focus-within:ring-2 ring-ink/5 transition-all shadow-sm group">
                                        <label className="text-[9px] font-bold text-muted group-hover:text-ink uppercase mb-1 block tracking-widest transition-colors">Comprobante</label>
                                        <div className="flex items-center gap-2">
                                          <label className="flex items-center gap-1.5 justify-center w-full bg-white border border-border/40 hover:bg-gray-50 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-ink/70 cursor-pointer shadow-sm transition-all active:scale-95 truncate">
                                            <Upload className="w-3.5 h-3.5 text-primary shrink-0" />
                                            <span className="truncate">{expenseForm.file ? (expenseForm.file as File).name : 'Subir Archivo'}</span>
                                            <input 
                                              type="file" 
                                              accept="application/pdf,image/*" 
                                              className="hidden" 
                                              onChange={(e) => {
                                                const uploadedFile = e.target.files?.[0] || null;
                                                setExpenseForm({...expenseForm, file: uploadedFile});
                                              }} 
                                            />
                                          </label>
                                          {expenseForm.file && (
                                            <button 
                                              onClick={() => setExpenseForm({...expenseForm, file: null})} 
                                              className="p-1 hover:text-red-500 text-muted transition-colors rounded hover:bg-gray-100 shrink-0"
                                              title="Eliminar archivo"
                                              type="button"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="md:col-span-3">
                                      <button 
                                        onClick={async () => {
                                          await addExpense();
                                          setShowExpenseForm(false);
                                        }}
                                        className="w-full bg-ink text-white h-[46px] rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 group border-none"
                                      >
                                        {loading && loadingStatus.includes('comprobante') ? (
                                          <div className="flex items-center gap-2">
                                             <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                                             <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                                             <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                                          </div>
                                        ) : (
                                          <span>Registrar Pago</span>
                                        )}
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
                                <div className="py-1.5 px-4 border-b border-border/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white relative z-10">
                                  <div>
                                     <h4 className="text-[8px] leading-[11px] font-bold uppercase tracking-widest text-muted mb-0.5">Métricas Financieras</h4>
                                     <p className="text-sm font-bold text-ink uppercase tracking-tight">Cuentas y Pagos</p>
                                  </div>
                                  <button 
                                    onClick={() => setShowExpenseForm(!showExpenseForm)} 
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showExpenseForm ? 'bg-gray-100 text-ink shadow-sm' : 'bg-ink text-white shadow-md hover:bg-black active:scale-95'}`}
                                  >
                                    {showExpenseForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    {showExpenseForm ? 'Cerrar' : 'Nueva Transacción'}
                                  </button>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                  <thead>
                                    <tr className="text-left text-muted border-b border-border bg-gray-50 uppercase tracking-widest text-[9px] font-bold">
                                      <th className="p-4 pl-6">Tipo de Transacción</th>
                                      <th className="p-4">Mes</th>
                                      <th className="p-4 text-ink">Monto</th>
                                      <th className="p-4 text-right pr-6">Controles</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/50">
                                    {selectedProp.expenses?.length > 0 ? selectedProp.expenses.map((exp: any, idx: number) => (
                                      <tr key={`expense-${selectedProp.id || 'current'}-${idx}`} className="hover:bg-gray-50/80 transition-all group duration-300">
                                        <td className="p-4 pl-6">
                                          <div className="flex items-center gap-3">
                                             <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                             <span className="font-bold text-xs text-ink">{exp.tipo}</span>
                                          </div>
                                        </td>
                                        <td className="p-4">
                                          <div className="bg-white px-2.5 py-1 rounded-lg border border-border/80 inline-block shadow-sm">
                                             <span className="text-ink/70 font-bold uppercase text-[9px] tracking-widest">{exp.mes}</span>
                                          </div>
                                        </td>
                                        <td className="p-4">
                                          <span className="font-black text-ink text-sm tracking-tight">{formatMoney(exp.monto)}</span>
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            {exp.link && exp.link !== '#' && (
                                              <button 
                                                onClick={() => window.open(exp.link, '_blank')}
                                                className="w-8 h-8 bg-white border border-border/80 text-muted hover:text-ink hover:border-ink/30 rounded-lg flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                            <button 
                                              onClick={() => setShowConfirmDelete({ type: 'expense', id: selectedProp.id, index: idx })}
                                              className="w-8 h-8 bg-gray-50 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )) : (
                                      <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                           <div className="max-w-xs mx-auto">
                                             <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-border/50">
                                                <Receipt className="w-5 h-5 text-muted" />
                                             </div>
                                             <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Sin Registros</p>
                                             <p className="text-[11px] text-ink/40 leading-relaxed">Agregue pagos o cuentas para mantener el historial financiero de esta propiedad.</p>
                                           </div>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeTab === 'document' && (
                             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 flex flex-col items-center">

                              <div className="w-full bg-white rounded-3xl border border-border/60 p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between shadow-sm relative overflow-hidden gap-8">
                                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                                  <div className="w-24 h-32 bg-gray-50 rounded-2xl shadow-sm flex flex-col items-center justify-center border border-border/50 shrink-0 hover:scale-105 hover:-rotate-2 transition-transform duration-300 group cursor-pointer">
                                     <FileText className="w-8 h-8 text-muted group-hover:text-ink transition-colors" />
                                  </div>
                                  
                                  <div className="text-center md:text-left">
                                     <h5 className="text-lg font-bold text-ink uppercase tracking-tight mb-2">Contrato de Arriendo</h5>
                                     <p className="text-xs text-muted max-w-md mb-6 leading-relaxed">
                                       Documento legal actual. Puedes revisarlo en una nueva pestaña o exportar una copia física de ser necesario.
                                     </p>
                                     
                                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                       <button 
                                          onClick={() => viewContract(selectedProp.pdf, selectedProp.arrendatario)}
                                          className="h-10 px-6 bg-ink text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-md hover:bg-black transition-all flex items-center gap-2.5 active:scale-95"
                                       >
                                         <Eye className="w-3.5 h-3.5" /> Ver Contrato
                                       </button>
                                       <button className="h-10 px-6 bg-white border border-border/80 text-ink rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2.5 shadow-sm hover:border-ink/20">
                                         <Download className="w-3.5 h-3.5" /> Descargar PDF
                                       </button>
                                     </div>
                                  </div>
                                </div>
                                
                                <div className="flex md:flex-col items-center md:items-end gap-6 md:gap-5 md:border-l border-border/50 md:pl-8 pt-6 md:pt-0 border-t md:border-t-0 w-full md:w-auto mt-2 md:mt-0">
                                   <div className="text-center md:text-right flex-1 md:flex-none">
                                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5">Inicio Vigencia</p>
                                      <p className="text-sm font-bold text-ink tracking-tight">{selectedProp.inicio || 'No registrado'}</p>
                                   </div>
                                   <div className="text-center md:text-right flex-1 md:flex-none">
                                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5">Estado Operativo</p>
                                      <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md border border-green-200 shadow-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest">Activo</p>
                                      </div>
                                   </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                      {/* Property Footer - SOPHISTICATED MINIMALISM */}
                      <div className="mt-auto px-10 py-8 border-t border-border/10 bg-white/50 backdrop-blur-sm flex justify-between items-center h-24">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            <p className="text-[10px] font-black text-ink/20 uppercase tracking-[0.3em] font-mono">Operations Active</p>
                          </div>
                          <div className="w-px h-4 bg-border/20" />
                          <p className="text-[10px] font-medium text-ink/10 uppercase tracking-widest italic">Document Engineering by PNT</p>
                        </div>
                        
                        <button 
                          onClick={() => setShowConfirmDelete({ type: 'property', id: selectedProp.id })}
                          className="group flex items-center gap-3 px-6 py-3 rounded-2xl border border-danger/5 text-danger/20 hover:text-danger hover:border-danger hover:bg-danger/5 transition-all text-[11px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-xl active:scale-95"
                        >
                          <Trash2 className="w-4 h-4 transition-transform group-hover:rotate-12" /> 
                          <span>Decommission Asset</span>
                        </button>
                      </div>
                    </div>
              ) : (
                <div className="h-full bento-card border-dashed flex flex-col items-center justify-center text-muted p-20 text-center animate-pulse">
                  <Building2 className="w-20 h-20 mb-8 opacity-5" />
                  <h3 className="text-xl font-black uppercase tracking-widest text-ink/20">Seleccione una Propiedad</h3>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-10 mt-2">Visor de Gestión Administrativa Activo</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeModule === 'ai' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto py-6 px-6 lg:px-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">Cognitive Processing</h4>
                    <p className="text-3xl lg:text-4xl font-bold text-ink uppercase tracking-tight">
                      Inteligencia <span className="text-accent underline decoration-4 underline-offset-8">Artificial</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={bulkSync} disabled={loading} className="h-12 px-6 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Todo
                    </button>
                    <button className="h-12 px-6 bg-white border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-muted hover:bg-gray-50 transition-all flex items-center gap-2">
                      <Download className="w-4 h-4" /> Exportar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                   <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-border shadow-sm flex flex-col pt-10">
                      <div className="mb-6 text-center">
                         <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                           <Upload className="w-8 h-8" />
                         </div>
                         <h4 className="text-lg font-black text-ink mb-1 uppercase tracking-tight">Carga de Documentos</h4>
                         <p className="text-xs text-muted font-medium">Sube los contratos para iniciar la auditoría IA.</p>
                      </div>
                      <div className="space-y-4 max-w-sm mx-auto w-full pb-2">
                        <label className="flex items-center justify-between w-full bg-bg border border-border rounded-2xl p-6 cursor-pointer hover:bg-gray-50 hover:border-red-200/50 hover:shadow-sm transition-all group">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-border/50 flex items-center justify-center group-hover:text-red-600 transition-colors">
                               <FileText className="w-5 h-5" />
                             </div>
                             <div className="text-left">
                               <p className="text-sm font-bold text-ink">Subir Contrato Individual</p>
                               <p className="text-[10px] text-muted mt-0.5">Archivo PDF (Máx 10MB)</p>
                             </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-border/50 group-hover:bg-red-50 group-hover:border-red-100 transition-colors">
                            <Plus className="w-4 h-4 text-ink group-hover:text-red-600 transition-colors" />
                          </div>
                          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                        
                        <label className="flex items-center justify-between w-full bg-white border border-border rounded-2xl p-6 cursor-pointer hover:bg-gray-50 hover:border-red-200/50 hover:shadow-sm transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                             <Zap className="w-16 h-16" />
                          </div>
                          <div className="flex items-center gap-4 relative z-10">
                             <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl shadow-sm border border-red-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                               <FileSearch className="w-5 h-5" />
                             </div>
                             <div className="text-left">
                               <p className="text-sm font-bold text-ink group-hover:text-red-700 transition-colors">Procesamiento Masivo Lote</p>
                               <p className="text-[10px] text-muted mt-0.5">Sube múltiples PDFs a la vez</p>
                             </div>
                          </div>
                           <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shadow-sm border border-red-100 group-hover:bg-red-600 group-hover:border-transparent transition-colors relative z-10">
                            <Plus className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                          </div>
                          <input type="file" accept="application/pdf" multiple className="hidden" onChange={handleBulkFileChange} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 bg-white rounded-3xl border border-border flex flex-col min-h-[700px] overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-6">
                      <div>
                        <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Queue de Procesamiento</h4>
                        <p className="text-xs font-medium text-ink">Extrayendo datos de contratos en tiempo real</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {bulkData.length > 0 && (
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Activos en cola</p>
                              <p className="text-xl font-black text-primary leading-none">{bulkData.length}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {hasDuplicates && (
                                <button 
                                  onClick={deleteDuplicates}
                                  className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all flex items-center gap-2 border border-orange-100 shadow-sm"
                                >
                                  <CopyX className="w-4 h-4" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Borrar Duplicados</span>
                                </button>
                              )}
                              <button 
                                onClick={() => { setBulkData([]); setBulkFiles([]); setHasDuplicates(false); }}
                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2">Limpiar</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-white">
                      {bulkData.length > 0 ? (
                        <div className="space-y-4">
                          {bulkData.map((d, i) => (
                            <motion.div 
                              key={`bulk-${i}-${d.dir || 'virtual'}`} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-6 rounded-2xl border transition-all ${d.isDuplicate ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-border hover:border-accent hover:shadow-md'}`}
                            >
                              <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${d.isDuplicate ? 'bg-gray-200 text-gray-400' : 'bg-accent/10 text-accent'}`}>
                                   <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-bold text-ink truncate">
                                         {d.dir || 'Dirección no detectada'}
                                      </p>
                                      {d.isDuplicate && (
                                        <div className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black uppercase tracking-widest rounded-md border border-orange-200 shrink-0">
                                           Duplicado
                                        </div>
                                      )}
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{d.a_nom || 'S/A'}</span>
                                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                                      <span className="text-[10px] font-mono text-muted">{d.fileName}</span>
                                   </div>
                                </div>
                                <div className="text-right shrink-0 px-6 border-l border-border flex flex-col items-end gap-2">
                                   <p className="text-base font-bold text-ink">{formatMoney(d.can, d.tipoMonto)}</p>
                                   <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => setPreviewData(d)}
                                        className="p-1.5 hover:bg-bg rounded-lg text-muted hover:text-primary transition-colors"
                                        title="Vista Previa"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <p className="text-[9px] font-bold text-accent uppercase tracking-widest">Verificado core</p>
                                   </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 grayscale opacity-40">
                          <RefreshCw className="w-12 h-12 text-muted mb-4 animate-spin-slow" />
                          <h5 className="text-sm font-bold text-ink uppercase tracking-widest mb-1">Esperando Archivos</h5>
                          <p className="text-[10px] text-muted uppercase tracking-widest">Sube contratos para iniciar el análisis automático</p>
                        </div>
                      )}
                    </div>

                    {bulkData.length > 0 && (
                       <div className="p-8 bg-gray-50 border-t border-border">
                          <button 
                             disabled={loading}
                             onClick={async () => {
                               if (!user) return;
                           setLoading(true);
                           setProgress(0);
                           setLoadingStatus('Iniciando sincronización masiva...');
                           
                           try {
                             const total = bulkData.length;
                             setLoadingStatus(`Subiendo ${total} contratos en paralelo...`);
                             setProgress(10);
                             
                             // Fully parallel for maximum speed
                             const syncedData = await Promise.all(bulkData.map(async (d) => {
                               let pdfUrl = d.pdf || '#';
                               const file = bulkFiles.find(f => f.name === d.fileName);
                               
                               if (file && (pdfUrl === '#' || !pdfUrl)) {
                                 try {
                                   pdfUrl = await uploadFileToStorage(file, 'contracts/bulk');
                                 } catch (e) {
                                   console.error(`Error subiendo ${file.name}:`, e);
                                 }
                               }
                               return { ...d, pdf: pdfUrl };
                             }));

                             setProgress(80);
                             setLoadingStatus('Confirmando cambios en la base de datos...');
                             const batch = writeBatch(db);
                           
                           syncedData.forEach(d => {
                             const propData = {
                               direccion: d.dir || '',
                               valor: Number(d.can) || 0,
                               termino: d.f_ven || d.f_ini || '',
                               f_ini: d.f_ini || '',
                               duracion: d.duracion || '12 meses',
                               dueno: d.d_nom || '',
                               rutDue: d.d_rut || '',
                               telD: d.d_tel || '',
                               mailD: d.d_mail || '',
                               arrendatario: d.a_nom || '',
                               rutArr: d.a_rut || '',
                               telA: d.a_tel || '',
                               mailA: d.a_mail || '',
                               aval: d.av_nom || '',
                               rutAval: d.av_rut || '',
                               telAval: d.av_tel || '',
                               mailAval: d.av_mail || '',
                               ownerUid: user.uid,
                               expenses: [],
                               pdf: d.pdf || '#',
                               updatedAt: serverTimestamp()
                             };
                             
                             if (d.existingId) {
                               const existingDocRef = doc(db, 'properties', d.existingId);
                               batch.update(existingDocRef, propData);
                             } else {
                               const newDocRef = doc(collection(db, 'properties'));
                               batch.set(newDocRef, { ...propData, createdAt: serverTimestamp() });
                             }
                           });

                           await batch.commit();
                           setBulkData([]);
                           setBulkFiles([]);
                           showToast('Sincronización masiva completada exitosamente');
                           setActiveModule('properties');
                         } catch (error) {
                           console.error('Error in bulk sync:', error);
                           showToast('Error en la sincronización', 'error');
                         } finally {
                           setLoading(false);
                         }
                       }}
                       className="group relative w-full h-[100px] bg-ink text-white rounded-[40px] font-black uppercase text-[14px] tracking-[0.4em] hover:bg-accent transition-all shadow-[0_30px_60px_-10px_rgba(0,0,0,0.3)] active:scale-95 flex items-center justify-center gap-8 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                      <div className="relative z-10 flex items-center gap-8">
                         {loading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <ShieldCheck className="w-8 h-8 group-hover:scale-110 transition-transform duration-500" />}
                         <span>{loading ? 'Ejecutando Sincronización...' : 'Finalizar Lote Operativo'}</span>
                      </div>
                    </button>
                    <div className="mt-8 flex justify-between items-center px-4">
                       <p className="text-[10px] font-black text-ink/20 uppercase tracking-[0.3em] font-mono">Consolidación Operativa</p>
                       <p className="text-[10px] font-black text-ink/20 uppercase tracking-[0.3em] font-mono">Sistema Raíz</p>
                    </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeModule === 'reports' && (() => {
          const reportsAvailableYears = Array.from(new Set(
            properties
              .map(p => {
                if (!p.inicio) return null;
                const parts = p.inicio.split('-');
                return parts[0];
              })
              .filter(Boolean)
          ))
          .sort((a, b) => b!.localeCompare(a!));

          const propertiesWithExpenses = properties
            .filter(p => p.inicio && p.expenses && p.expenses.length > 0)
            .filter(p => {
              if (selectedReportsYear === 'all') return true;
              return p.inicio!.startsWith(selectedReportsYear);
            })
            .sort((a, b) => {
              const dateA = a.inicio ? new Date(a.inicio).getTime() : 0;
              const dateB = b.inicio ? new Date(b.inicio).getTime() : 0;
              return dateB - dateA;
            });

          const selectedProp = properties.find(p => p.id === selectedReportPropId) || null;
          
          const isMatchingMonth = (eMes: string, targetMonth: string) => {
            const normE = (eMes || '').trim().toLowerCase();
            const normT = (targetMonth || '').trim().toLowerCase();
            return normE === normT || (!normE.includes(' ') && `${normE} ${new Date().getFullYear()}` === normT);
          };
          
          const getMonthTotal = (prop: Property, month: string) => {
            if (!prop.expenses) return 0;
            return prop.expenses.filter(e => isMatchingMonth(e.mes, month)).reduce((sum, e) => {
              const val = parseFloat(e.monto.replace(/[^\d.-]/g, '')) || 0;
              return sum + val;
            }, 0);
          };

          const getYearTotal = (prop: Property, year: string) => {
            if (!prop.expenses) return 0;
            return prop.expenses.filter(e => {
              const eMes = (e.mes || '').toLowerCase();
              return eMes.includes(year) || (!eMes.includes(' ') && year === new Date().getFullYear().toString());
            }).reduce((sum, e) => sum + (parseFloat(e.monto.replace(/[^\d.-]/g, '')) || 0), 0);
          };

          const getYearCategories = (prop: Property, year: string) => {
            const catTotals: Record<string, number> = {};
            if (!prop.expenses) return catTotals;
            prop.expenses.filter(e => {
              const eMes = (e.mes || '').toLowerCase();
              return eMes.includes(year) || (!eMes.includes(' ') && year === new Date().getFullYear().toString());
            }).forEach(e => {
               const val = parseFloat(e.monto.replace(/[^\d.-]/g, '')) || 0;
               catTotals[e.tipo] = (catTotals[e.tipo] || 0) + val;
            });
            return catTotals;
          };

          const formatCurrency = (val: number) => {
             return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
          };

          const monthExpenses = selectedProp ? (selectedProp.expenses?.filter(e => isMatchingMonth(e.mes, selectedReportMonth)) || []) : [];
          const totalMonthExp = monthExpenses.reduce((sum, e) => sum + (parseFloat(e.monto.replace(/[^\d.-]/g, '')) || 0), 0);
          
          const txCount = monthExpenses.length;
          
          const monthCatTotals: Record<string, number> = {};
          monthExpenses.forEach(e => {
            const val = parseFloat(e.monto.replace(/[^\d.-]/g, '')) || 0;
            monthCatTotals[e.tipo] = (monthCatTotals[e.tipo] || 0) + val;
          });
          
          let highestCatName = '-';
          let highestCatVal = 0;
          Object.entries(monthCatTotals).forEach(([cat, val]) => {
            if (val > highestCatVal) {
              highestCatVal = val;
              highestCatName = cat;
            }
          });
          
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto py-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-4">
                <div className="space-y-2">
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">Centro de Notificaciones</h4>
                   <p className="text-4xl lg:text-5xl font-bold text-ink uppercase tracking-tight">
                      Reportes <span className="opacity-30">Mensuales</span>
                   </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: Property List */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-border shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                      <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest">Registro de Gastos</h3>
                      
                      {/* Year Filter Dropdown select */}
                      <select
                        value={selectedReportsYear}
                        onChange={(e) => setSelectedReportsYear(e.target.value)}
                        className="bg-gray-50 border border-border text-[9px] font-black uppercase tracking-wider rounded-lg p-1 outline-none text-ink cursor-pointer shrink-0"
                      >
                        <option value="all">Año: Todos</option>
                        {reportsAvailableYears.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[600px]">
                      {propertiesWithExpenses.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted">No hay gastos</p>
                        </div>
                      ) : (
                        propertiesWithExpenses.map(p => {
                          const isSel = selectedReportPropId === p.id;
                          const reportYear = selectedReportMonth.split(' ').pop() || new Date().getFullYear().toString();
                          const propYearTotal = getYearTotal(p, reportYear);
                          const propYearCats = getYearCategories(p, reportYear);
                          return (
                            <button
                              key={p.id}
                              onClick={() => setSelectedReportPropId(p.id!)}
                              className={`p-4 rounded-2xl flex flex-col items-start gap-2 text-left transition-all duration-300 relative border overflow-hidden smooth-transition ${
                                isSel 
                                  ? 'bg-gradient-to-tr from-primary to-slate-900 border-primary shadow-lg shadow-primary/20 scale-[1.02] transform' 
                                  : 'bg-bg border-transparent hover:border-border hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full mb-1">
                                <span className={`text-[7px] font-bold uppercase ${isSel ? 'text-white/50' : 'text-slate-400'}`}>Contrato</span>
                                {p.inicio && (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded font-mono shadow-sm ${
                                    isSel ? 'bg-white/20 text-white' : 'bg-red-600 text-white'
                                  }`}>
                                    {(() => {
                                      const parts = p.inicio.split('-');
                                      if (parts.length >= 2) {
                                        return `${parts[0]}-${parts[1]}`;
                                      }
                                      return p.inicio;
                                    })()}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-start justify-between gap-3 mb-1 w-full text-left font-sans">
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                  <div className={`text-[10px] font-black uppercase tracking-tight truncate ${isSel ? 'text-white' : 'text-slate-700'}`} title={p.dueno || 'Sin Dueño'}>
                                    {p.dueno || 'Sin Dueño'}
                                  </div>
                                  <div className={`text-[9px] font-bold uppercase italic ${isSel ? 'text-white/40' : 'text-slate-400'}`}>vs</div>
                                  <div className={`text-[10px] font-black uppercase tracking-tight truncate ${isSel ? 'text-accent' : 'text-red-700'}`} title={p.arrendatario || 'Sin Inquilino'}>
                                    {p.arrendatario || 'Sin Inquilino'}
                                  </div>
                                </div>
                              </div>

                              <p className={`text-[9px] font-semibold truncate w-full uppercase tracking-tight ${isSel ? 'text-white/80' : 'text-ink/70'} mb-2 text-left`}>
                                {p.direccion}
                              </p>
                              
                              <div className={`w-full mt-2 pt-2 border-t ${isSel ? 'border-white/10' : 'border-border/60'}`}>
                                 <div className="flex justify-between w-full items-end mb-2">
                                    <p className={`text-[9px] uppercase tracking-widest font-bold mb-0.5 ${isSel ? 'text-white/40' : 'text-muted/50'}`}>Gastos Anuales ({reportYear})</p>
                                    <p className={`text-sm font-black tracking-tight ${isSel ? 'text-accent' : 'text-primary'}`}>
                                      {formatCurrency(propYearTotal)}
                                    </p>
                                 </div>
                                 <div className="flex gap-1 flex-wrap">
                                    {Object.entries(propYearCats).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(([cat, val]) => (
                                      <span key={cat} className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest ${isSel ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-muted'}`}>
                                         <div className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(cat)}`} />
                                         {cat}
                                      </span>
                                    ))}
                                    {Object.entries(propYearCats).length > 3 && (
                                       <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest ${isSel ? 'bg-white/5 text-white/50' : 'bg-transparent text-muted/50'}`}>
                                          +{Object.entries(propYearCats).length - 3}
                                       </span>
                                    )}
                                 </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Analytics & Sending */}
                <div className="lg:col-span-8 flex flex-col">
                  {!selectedProp ? (
                    <div className="bg-white rounded-3xl border border-border flex flex-col items-center justify-center p-12 min-h-[500px] shadow-sm text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-8 h-8 text-muted" />
                      </div>
                      <h3 className="text-xl font-black text-ink uppercase tracking-tight mb-2">Seleccione una Propiedad</h3>
                      <p className="text-sm font-medium text-muted max-w-sm">Elija una propiedad de la lista para previsualizar los gastos y generar el reporte mensual.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-border shadow-sm p-8 flex flex-col animate-in fade-in zoom-in-95 duration-500">
                      
                      {/* Header & Navigation Tabs */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-border/60">
                        <div>
                          <h2 className="text-2xl font-black text-ink uppercase tracking-tight mb-1">{selectedProp.direccion}</h2>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] bg-gray-100 text-muted px-2 py-1 rounded font-mono uppercase tracking-widest">
                              {selectedProp.dueno || 'Sin Doc.'}
                            </span>
                            <span className="text-[10px] text-muted font-mono">{selectedProp.mailD || 'Sin email'}</span>
                          </div>
                        </div>
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-gray-100 p-1 rounded-xl border border-border mt-4 md:mt-0">
                          <button
                            onClick={() => setReportsTab('details')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                              reportsTab === 'details'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-muted hover:text-ink'
                            }`}
                          >
                            Detalle de Gastos
                          </button>
                          <button
                            onClick={() => setReportsTab('preview')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                              reportsTab === 'preview'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-muted hover:text-ink'
                            }`}
                          >
                            Previsualizar Informe
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Subcolumna Izquierda: Historial Anual (común para ambas vistas) */}
                        <div className="xl:col-span-5 flex flex-col">
                           <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-6 border-b border-border/60 pb-2">
                             Historial Anual de Gastos {new Date().getFullYear()}
                           </h4>
                           <div className="flex flex-col gap-1">
                              {MONTHS_WITH_YEAR.filter(m => m.endsWith(new Date().getFullYear().toString())).reverse().map((m) => {
                                 const mTotal = getMonthTotal(selectedProp, m);
                                 const mExps = selectedProp.expenses?.filter(e => isMatchingMonth(e.mes, m)) || [];
                                 
                                 // agrupar por categoría
                                 const catTotals: Record<string, number> = {};
                                 mExps.forEach(e => {
                                    const val = parseFloat(e.monto.replace(/[^\d.-]/g, '')) || 0;
                                    catTotals[e.tipo] = (catTotals[e.tipo] || 0) + val;
                                 });

                                 const isSel = selectedReportMonth === m;

                                 return (
                                   <button 
                                      key={m}
                                      onClick={() => setSelectedReportMonth(m)}
                                      className={`w-full flex items-center p-3 rounded-xl cursor-pointer smooth-transition border text-left ${
                                        isSel ? 'bg-gray-50 border-border shadow-sm ring-1 ring-border relative z-10' : 'bg-transparent border-transparent hover:bg-gray-50/50'
                                      }`}
                                   >
                                     <div className={`w-16 font-bold text-[10px] uppercase tracking-widest shrink-0 ${isSel ? 'text-ink' : 'text-muted'}`}>
                                       {m.split(' ')[0]}
                                     </div>
                                     
                                     <div className="flex-1 px-3 flex items-center h-2">
                                        {mTotal > 0 ? (
                                          <div className="w-full h-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                                             {Object.entries(catTotals).map(([cat, val], i) => (
                                                <div 
                                                   key={i} 
                                                   title={`${cat}: ${formatCurrency(val)}`}
                                                   className={`h-full ${getCategoryColor(cat)}`} 
                                                   style={{ width: `${(val / mTotal) * 100}%` }} 
                                                />
                                             ))}
                                          </div>
                                        ) : (
                                          <div className="w-full h-[1px] border-t border-dashed border-border/60" />
                                        )}
                                     </div>

                                     <div className={`w-16 text-right font-black text-[10px] tracking-tight shrink-0 ${mTotal > 0 ? 'text-ink' : 'text-muted/40'}`}>
                                        {mTotal > 0 ? formatCurrency(mTotal) : '-'}
                                     </div>
                                   </button>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Subcolumna Derecha: Detalle de Gastos o Previsualización */}
                        <div className="xl:col-span-7 flex flex-col">
                          {reportsTab === 'details' ? (
                            <div className="flex flex-col bg-bg/50 p-6 rounded-3xl border border-border/80 relative h-full">
                               <div className="mb-6 flex justify-between items-end">
                                  <div>
                                     <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Detalle del Mes</h4>
                                     <h3 className="text-xl font-black text-ink uppercase tracking-tight">{selectedReportMonth}</h3>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Total</p>
                                     <p className="text-2xl font-black text-ink tracking-tight leading-none">{formatCurrency(totalMonthExp)}</p>
                                  </div>
                               </div>

                               {/* High-level Metric Cards */}
                               <div className="grid grid-cols-3 gap-3 mb-6">
                                 <div className="bg-white p-3 rounded-2xl border border-border shadow-sm">
                                   <p className="text-[8px] font-bold text-muted uppercase tracking-wider mb-1">Total Gastado</p>
                                   <p className="text-xs font-black text-ink tracking-tight">{formatCurrency(totalMonthExp)}</p>
                                 </div>
                                 <div className="bg-white p-3 rounded-2xl border border-border shadow-sm">
                                   <p className="text-[8px] font-bold text-muted uppercase tracking-wider mb-1">Transacciones</p>
                                   <p className="text-xs font-black text-ink tracking-tight">{txCount} reg.</p>
                                 </div>
                                 <div className="bg-white p-3 rounded-2xl border border-border shadow-sm">
                                   <p className="text-[8px] font-bold text-muted uppercase tracking-wider mb-1">Mayor Gasto</p>
                                   <p className="text-[9px] font-black text-primary truncate tracking-tight uppercase" title={highestCatName}>
                                     {highestCatName !== '-' ? `${highestCatName}: ${formatCurrency(highestCatVal)}` : '-'}
                                   </p>
                                 </div>
                                </div>

                               {/* Category Graph / Progress Bars */}
                               {monthExpenses.length > 0 && (
                                 <div className="mb-6 bg-white p-4 rounded-2xl border border-border shadow-sm">
                                   <p className="text-[9px] font-black uppercase text-muted tracking-widest mb-3 border-b border-border/50 pb-2">Distribución de Gastos</p>
                                   <div className="space-y-3">
                                     {Object.entries(monthCatTotals).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => {
                                       const pct = totalMonthExp > 0 ? (val / totalMonthExp) * 100 : 0;
                                       return (
                                         <div key={cat} className="space-y-1">
                                           <div className="flex justify-between text-[9px] font-bold text-ink uppercase tracking-wider">
                                             <span className="flex items-center gap-1.5">
                                               <div className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(cat)}`} />
                                               {cat}
                                             </span>
                                             <span>{formatCurrency(val)} ({pct.toFixed(0)}%)</span>
                                           </div>
                                           <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                             <div className={`h-full ${getCategoryColor(cat)}`} style={{ width: `${pct}%` }} />
                                           </div>
                                         </div>
                                       );
                                     })}
                                   </div>
                                 </div>
                               )}
                               
                               <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar max-h-[300px]">
                                  {monthExpenses.length === 0 ? (
                                     <div className="flex flex-col items-center justify-center text-center py-12 text-muted/50">
                                       <FileText className="w-8 h-8 mb-3 opacity-20" />
                                       <p className="text-[10px] font-bold uppercase tracking-widest">No hay registros</p>
                                     </div>
                                  ) : (
                                     <div className="space-y-3 pr-2">
                                        <p className="text-[9px] font-black uppercase text-muted tracking-widest mb-2 border-b border-border/50 pb-2">Transacciones Registradas</p>
                                        {monthExpenses.map((exp, idx) => (
                                          <div key={idx} className="bg-white px-4 py-3 rounded-2xl border border-border flex flex-col gap-2 shadow-sm relative overflow-hidden group">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${getCategoryColor(exp.tipo)}`} />
                                            <div className="flex justify-between items-start">
                                               <div className="flex flex-col">
                                                  <span className="text-[10px] font-black uppercase text-ink tracking-tight mb-0.5">{exp.tipo}</span>
                                                  <span className="text-[8px] font-bold text-muted uppercase font-mono tracking-widest">Boleta/Folio: {exp.boleta || 'S/N'}</span>
                                               </div>
                                               <span className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-md">{exp.monto}</span>
                                            </div>
                                            {exp.link && (
                                              <div className="pt-2 mt-1 border-t border-dashed border-border/60">
                                                <a href={exp.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-accent hover:text-red-700 transition-colors">
                                                  <FileText className="w-3 h-3" /> Ver Adjunto PDF
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                     </div>
                                  )}
                               </div>

                               {/* Email Section inside the month detail */}
                               <div className="mt-auto pt-6 border-t border-border/60">
                                  <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-3">Acciones Rápidas</p>
                                  <button 
                                     onClick={() => sendReport(selectedProp, selectedReportMonth)}
                                     disabled={loading || monthExpenses.length === 0}
                                     className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] smooth-transition flex items-center justify-center gap-2 ${
                                       loading || monthExpenses.length === 0 
                                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-transparent' 
                                         : 'bg-gradient-to-r from-primary to-slate-900 border border-primary text-white hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 glow-hover'
                                     }`}
                                   >
                                     <Mail className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} /> 
                                     {loading ? 'Enviando Reporte...' : 'Enviar Reporte al Propietario'}
                                   </button>
                               </div>
                            </div>
                          ) : (
                            <div className="flex flex-col bg-stone-50 p-6 rounded-3xl border border-stone-200 shadow-inner relative font-sans text-stone-800 h-full">
                              {/* Email Client Header */}
                              <div className="border-b border-stone-200 pb-4 mb-4 text-[10px] font-semibold text-stone-500 space-y-1">
                                <div><span className="font-bold uppercase tracking-wider text-stone-400">De:</span> Punto Propiedades &lt;contacto@puntopropiedades.cl&gt;</div>
                                <div><span className="font-bold uppercase tracking-wider text-stone-400">Para:</span> {selectedProp.dueno || 'Sin Dueño'} &lt;{selectedProp.mailD || 'sin-correo@correo.com'}&gt;</div>
                                <div><span className="font-bold uppercase tracking-wider text-stone-400">Asunto:</span> <span className="text-stone-800 font-bold">Informe de Gastos - {selectedReportMonth} - {selectedProp.direccion}</span></div>
                              </div>
                              
                              {/* Email Body Preview Container */}
                              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4 min-h-[300px] text-xs leading-relaxed text-stone-700 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {/* Brand Header */}
                                <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-2">
                                  <span className="font-black tracking-wider text-primary text-sm uppercase">PUNTO PROPIEDADES</span>
                                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{selectedReportMonth}</span>
                                </div>
                                
                                <p>Estimado(a) <strong>{selectedProp.dueno || 'Propietario'}</strong>,</p>
                                
                                <p>Junto con saludarle de parte de Punto Propiedades, a continuación se detalla el desglose consolidado de los gastos operacionales registrados para su propiedad ubicada en <strong>{selectedProp.direccion}</strong> correspondientes al mes de <strong>{selectedReportMonth}</strong>:</p>
                                
                                {/* Table Mockup */}
                                {monthExpenses.length === 0 ? (
                                  <p className="text-center py-6 text-stone-400 italic">No se registran gastos para este período.</p>
                                ) : (
                                  <div className="border border-stone-100 rounded-xl overflow-hidden my-2 shadow-sm">
                                    <table className="w-full text-left border-collapse text-[10px]">
                                      <thead>
                                        <tr className="bg-stone-50 text-stone-500 font-black uppercase tracking-wider border-b border-stone-100">
                                          <th className="p-3">Categoría</th>
                                          <th className="p-3">Boleta/Folio</th>
                                          <th className="p-3 text-right">Monto</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {monthExpenses.map((exp, idx) => (
                                          <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50/50">
                                            <td className="p-3 font-bold uppercase tracking-tight">{exp.tipo}</td>
                                            <td className="p-3 text-stone-500 font-mono">{exp.boleta || 'S/N'}</td>
                                            <td className="p-3 text-right font-black text-stone-900">{exp.monto}</td>
                                          </tr>
                                        ))}
                                        <tr className="bg-stone-50 font-black text-stone-900 border-t border-stone-100">
                                          <td colSpan={2} className="p-3 text-right uppercase tracking-wider text-[9px] text-stone-500">Monto Total Operacional</td>
                                          <td className="p-3 text-right text-xs text-primary">{formatCurrency(totalMonthExp)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                
                                <p className="mt-2">Quedamos atentos a cualquier duda o comentario que pueda tener respecto a este informe.</p>
                                
                                <div className="border-t border-stone-100 pt-4 mt-2 text-[9px] text-stone-400">
                                  <p className="font-bold text-stone-600">Atentamente,</p>
                                  <p className="font-bold text-primary uppercase">Administración Punto Propiedades</p>
                                </div>
                              </div>

                              {/* Send Email Action Trigger */}
                              <div className="mt-6 pt-4 border-t border-stone-200 flex flex-col gap-2">
                                <button 
                                   onClick={() => sendReport(selectedProp, selectedReportMonth)}
                                   disabled={loading || monthExpenses.length === 0}
                                   className={`w-full py-3.5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] smooth-transition flex items-center justify-center gap-2 ${
                                     loading || monthExpenses.length === 0 
                                       ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-transparent' 
                                       : 'bg-primary border border-primary text-white hover:bg-red-700 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5'
                                   }`}
                                 >
                                   <Send className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
                                   {loading ? 'Enviando Reporte...' : 'Enviar Reporte por Correo'}
                                 </button>
                                 {monthExpenses.length === 0 && (
                                   <p className="text-[9px] text-center text-red-500 font-bold uppercase tracking-widest mt-1">
                                     * Agregue gastos a esta propiedad en este mes antes de enviar el reporte.
                                   </p>
                                 )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {activeModule === 'settings' && (
          <div className="max-w-6xl mx-auto py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Context Heading */}
            <div className="mb-8 bg-white p-6 rounded-3xl border border-border shadow-sm">
              <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                <span className="p-1.5 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </span>
                Centro de Alertas de Vencimiento para el Administrador
              </h3>
              <p className="text-xs text-muted font-semibold mt-1 max-w-2xl leading-relaxed">
                ¿Para qué es este correo? Este sistema **no envía correos directos a tus dueños ni arrendatarios** para evitar roces o malentendidos. En su lugar, es un **asistente automático para TI (el Administrador)**. Al conectar tu cuenta, te despachará avisos directos a tu propio correo (personal o ejecutivo) informándote con nombre y dirección qué contratos están por expirar.
              </p>
            </div>

            {/* Steps Stepper Indicator */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { step: 1, label: '1. SMTP Remitente', desc: 'De dónde se envía' },
                { step: 2, label: '2. Correo de Destino', desc: 'Dónde lo recibes' },
                { step: 3, label: '3. Formato del Aviso', desc: 'Personalizar texto' },
                { step: 4, label: '4. Envío de Prueba', desc: 'Enviar alerta ya' }
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setCorreoStep(s.step)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-300 relative ${
                    correoStep === s.step
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                      : 'bg-white text-ink border-border hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      correoStep === s.step ? 'bg-white text-primary' : 'bg-gray-100 text-muted'
                    }`}>
                      {s.step}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide truncate">{s.label}</span>
                  </div>
                  <p className={`text-[9px] font-medium mt-1 truncate ${
                    correoStep === s.step ? 'text-white/80' : 'text-muted'
                  }`}>
                    {s.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Stepper Content Panel */}
              <div className="lg:col-span-7 bg-white p-6 rounded-[32px] border border-border shadow-sm space-y-6">
                {correoStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h4 className="text-sm font-black uppercase text-primary mb-1">Paso 1: Configurar Correo Remitente (SMTP)</h4>
                      <button 
                        onClick={() => setShowReportModal(true)}
                        className="bg-accent text-white px-4 py-2 rounded-full text-xs font-bold mb-4 flex items-center gap-2"
                      >
                          <FileCheck className="w-4 h-4" /> Generar Reporte
                      </button>
                      <p className="text-xs text-muted font-bold leading-tight">Elige el correo de origen mediante el cual la plataforma despachará los correos informativos.</p>
                    </div>

                    <div className="flex gap-2 pb-2">
                      <button
                        onClick={() => {
                          setAppSettings({
                            ...appSettings,
                            smtpHost: 'smtp.gmail.com',
                            smtpPort: '587'
                          });
                          showToast('Configurado para Gmail automáticamente');
                        }}
                        className="flex-1 py-3 px-4 rounded-xl border border-border bg-gray-50/50 hover:bg-white text-xs font-black flex items-center justify-center gap-2 transition-all hover:border-accent"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Gmail SMTP
                      </button>
                      <button
                        onClick={() => {
                          setAppSettings({
                            ...appSettings,
                            smtpHost: 'smtp.office365.com',
                            smtpPort: '587'
                          });
                          showToast('Configurado para Outlook automáticamente');
                        }}
                        className="flex-1 py-3 px-4 rounded-xl border border-border bg-gray-50/50 hover:bg-white text-xs font-black flex items-center justify-center gap-2 transition-all hover:border-accent"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Outlook SMTP
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-muted uppercase tracking-wider">Tu Correo Remitente (SMTP User)</label>
                          {appSettings.smtpUser && (
                            <span className="text-[8px] bg-green-50 text-green-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-tight">
                              Remitente Activo
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          placeholder="ejemplo@correo-de-envios.com"
                          value={appSettings.smtpUser || ''}
                          onChange={(e) => setAppSettings({ ...appSettings, smtpUser: e.target.value })}
                          className="w-full bg-gray-50 hover:bg-white border border-border rounded-xl p-3 text-xs font-semibold outline-none focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-muted uppercase tracking-wider mb-1 block">Contraseña Especial de Aplicación</label>
                        <input
                          type="password"
                          placeholder="•••• •••• •••• ••••"
                          value={appSettings.smtpPass || ''}
                          onChange={(e) => setAppSettings({ ...appSettings, smtpPass: e.target.value })}
                          className="w-full bg-gray-50 hover:bg-white border border-border rounded-xl p-3 text-xs font-semibold outline-none focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all font-mono"
                        />
                      </div>

                      {/* Explicit interactive tips */}
                      {appSettings.smtpUser?.includes('@gmail.com') ? (
                        <div className="p-4 bg-red-50/40 rounded-2xl border border-red-100 flex gap-3">
                          <span className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                            <Lock className="w-4 h-4 text-red-600" />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-red-800 uppercase tracking-tight mb-0.5">¿Cómo conseguir la contraseña en Gmail?</p>
                            <p className="text-[11px] text-muted font-medium leading-relaxed">
                              Por seguridad, Google te pide crear una contraseña especial para aplicaciones de terceros:
                            </p>
                            <ol className="list-decimal text-[11px] text-muted font-medium ml-4 mt-1 space-y-0.5">
                              <li>Ve a tu Cuenta Google (Seguridad).</li>
                              <li>Activa la "Verificación en 2 pasos" (es obligatorio).</li>
                              <li>Abajo busca "Contraseñas de aplicación".</li>
                              <li>Digita un nombre como "Arriendos" y copia el código de 16 caracteres.</li>
                            </ol>
                            <button
                              onClick={() => window.open('https://myaccount.google.com/apppasswords', '_blank')}
                              className="mt-2 text-[10px] font-bold text-accent hover:underline flex items-center gap-1 uppercase tracking-wider"
                            >
                              Abrir Configuración de Clave Google <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (appSettings.smtpUser?.includes('@outlook.com') || appSettings.smtpUser?.includes('@hotmail.com')) ? (
                        <div className="p-4 bg-red-50/40 rounded-2xl border border-red-100 flex gap-3">
                          <span className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                            <Lock className="w-4 h-4 text-red-600" />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-red-800 uppercase tracking-tight mb-0.5">¿Configuración en cuentas Microsoft?</p>
                            <p className="text-[11px] text-muted font-medium leading-relaxed">
                              Microsoft requiere generar una contraseña exclusiva si tienes habilitada la autenticación en dos factores en tu cuenta Outlook/Hotmail.
                            </p>
                            <button
                              onClick={() => window.open('https://account.microsoft.com/security', '_blank')}
                              className="mt-2 text-[10px] font-bold text-accent hover:underline flex items-center gap-1 uppercase tracking-wider"
                            >
                              Seguridad Cuenta Microsoft <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-border flex gap-3">
                          <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                            <Settings2 className="w-4 h-4 text-gray-600" />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-gray-800 uppercase tracking-tight mb-0.5">Servidor SMTP Avanzado</p>
                            <p className="text-[11px] text-muted font-medium leading-relaxed">
                              Si tienes un correo propio corporativo o dominio personalizado, puedes especificar manualmente el host y puerto SMTP.
                            </p>
                            <button
                              onClick={() => setShowAdvanced(!showAdvanced)}
                              className="mt-2 text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                            >
                              {showAdvanced ? 'Ocultar Datos Técnicos' : 'Mostrar Datos Técnicos SMTP'}
                            </button>
                          </div>
                        </div>
                      )}

                      {showAdvanced && (
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-border animate-in fade-in duration-300">
                          <div>
                            <label className="text-[9px] font-black text-muted uppercase block mb-1">Dirección de Servidor SMTP</label>
                            <input
                              type="text"
                              placeholder="smtp.miproveedor.com"
                              value={appSettings.smtpHost || ''}
                              onChange={(e) => setAppSettings({ ...appSettings, smtpHost: e.target.value })}
                              className="w-full bg-white border border-border rounded-xl p-2.5 text-xs font-bold outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-muted uppercase block mb-1">Puerto de Envío</label>
                            <input
                              type="text"
                              placeholder="587"
                              value={appSettings.smtpPort || ''}
                              onChange={(e) => setAppSettings({ ...appSettings, smtpPort: e.target.value })}
                              className="w-full bg-white border border-border rounded-xl p-2.5 text-xs font-bold outline-none font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          updateAppSettings(appSettings);
                          setCorreoStep(2);
                        }}
                        className="bg-primary hover:bg-primary/95 text-white font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl transition-all"
                      >
                        Guardar & Continuar Paso 2
                      </button>
                    </div>
                  </div>
                )}

                {correoStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h4 className="text-sm font-black uppercase text-primary mb-1">Paso 2: Correo Destinatario (A dónde te llegará)</h4>
                      <p className="text-xs text-muted font-bold leading-tight">Digita la dirección de correo personal o ejecutiva a la que quieres que te lleguen las alertas de vencimiento.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-border">
                        <label className="text-[10px] font-black text-muted uppercase tracking-wider block mb-1.5">Tu Correo donde Recibirás las Alertas (Ejecutivo / Personal)</label>
                        <input
                          type="email"
                          placeholder="tu-correo-personal-o-de-trabajo@ejemplo.com"
                          value={appSettings.reportEmail || ''}
                          onChange={(e) => setAppSettings({ ...appSettings, reportEmail: e.target.value })}
                          className="w-full bg-white border border-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-accent font-mono"
                        />
                        <p className="text-[11px] text-muted font-bold mt-2 leading-relaxed">
                          📌 ¡Toda la información clave a tu bandeja! Cuando un contrato esté por expirar, te notificaremos aquí con el listado detallando dirección de la casa, nombre del dueño y arrendatario involucrado.
                        </p>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl border border-border space-y-3">
                        <label className="text-[10px] font-black text-muted uppercase tracking-wider block">Frecuencia de las Alertas del Administrador</label>
                        
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border">
                          <input type="checkbox" defaultChecked disabled id="trig-1" className="w-4 h-4 text-accent border-border rounded focus:ring-accent" />
                          <label htmlFor="trig-1" className="text-xs font-bold text-ink cursor-pointer select-none">
                            Enviar reporte de contratos que vencen <span className="text-accent italic">dentro de los próximos 30 días</span>.
                          </label>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border">
                          <input type="checkbox" defaultChecked disabled id="trig-2" className="w-4 h-4 text-accent border-border rounded focus:ring-accent" />
                          <label htmlFor="trig-2" className="text-xs font-bold text-ink cursor-pointer select-none">
                            Enviar auditoría de contratos <span className="text-danger italic">ya vencidos sin renovar</span>.
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        onClick={() => setCorreoStep(1)}
                        className="border border-border bg-white text-muted hover:text-ink font-black uppercase text-[10px] tracking-widest py-3 px-5 rounded-xl transition-all"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={() => {
                          updateAppSettings(appSettings);
                          setCorreoStep(3);
                        }}
                        className="bg-primary hover:bg-primary/95 text-white font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl transition-all"
                      >
                        Guardar & Continuar Paso 3
                      </button>
                    </div>
                  </div>
                )}

                {correoStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-300 w-full">
                    <div>
                      <h4 className="text-sm font-black uppercase text-primary mb-1">Paso 3: Redacción del Mensaje de Alerta</h4>
                      <p className="text-xs text-muted font-bold leading-tight">Configura la estructura. Usa variables dinámicas para plasmar los datos de propiedad, dueño y arrendatario automáticamente.</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black text-muted uppercase tracking-wider mb-1 block">Asunto de la Notificación</label>
                        <input
                          type="text"
                          placeholder="[Alerta Vencimiento] Propiedad: {DIRECCION} - Dueño: {DUENO}"
                          value={appSettings.emailSubject || ''}
                          onChange={(e) => setAppSettings({ ...appSettings, emailSubject: e.target.value })}
                          className="w-full bg-gray-50 border border-border rounded-xl p-3 text-xs font-bold outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-muted uppercase tracking-wider mb-1 block">Plantilla del Mensaje de Alerta para Administrador</label>
                        <textarea
                          rows={8}
                          placeholder={`Hola,\nLe recordamos que el arriendo de {DIRECCION} del dueño {DUENO} con el inquilino {INQUILINO} vencerá pronto el {FECHA_VENCIMIENTO}...`}
                          value={appSettings.emailTemplate || ''}
                          onChange={(e) => setAppSettings({ ...appSettings, emailTemplate: e.target.value })}
                          className="w-full bg-gray-50 border border-border rounded-xl p-3 text-xs font-medium outline-none focus:border-accent font-sans leading-relaxed text-ink h-48"
                        />
                      </div>

                      {/* Dynamic variables list helper */}
                      <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-border">
                        <p className="text-[9px] font-black text-muted uppercase tracking-wider mb-2">Variables Especiales Disponibles (Haz Clic para Añadir)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { tag: '{DIRECCION}', desc: 'Ubicación / Dirección de la casa' },
                            { tag: '{DUENO}', desc: 'Nombre del Dueño/Propietario' },
                            { tag: '{INQUILINO}', desc: 'Nombre del Arrendatario' },
                            { tag: '{FECHA_VENCIMIENTO}', desc: 'Día exacto del vencimiento' },
                            { tag: '{VALOR}', desc: 'Monto de renta mensual' }
                          ].map((item) => (
                            <button
                              key={item.tag}
                              type="button"
                              onClick={() => {
                                const currentText = appSettings.emailTemplate || '';
                                setAppSettings({ ...appSettings, emailTemplate: currentText + ' ' + item.tag });
                                showToast(`Variable ${item.tag} añadida al cuerpo`);
                              }}
                              className="text-[10px] bg-white hover:bg-accent hover:text-white border border-border/80 text-ink rounded-lg px-2.5 py-1 font-mono font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95"
                              title={item.desc}
                            >
                              {item.tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {properties.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 overflow-hidden">
                          <label className="text-[10px] font-black text-muted uppercase shrink-0">Simular Vista Previa con:</label>
                          <select
                            value={previewPropId}
                            onChange={(e) => setPreviewPropId(e.target.value)}
                            className="w-full sm:w-auto max-w-full bg-white border border-border text-xs rounded-xl p-1.5 font-bold outline-none min-w-0 flex-1 truncate"
                          >
                            <option value="">-- Elige una propiedad --</option>
                            {properties.map((p, i) => (
                              <option key={`${p.id}-${i}`} value={p.id}>{p.direccion || 'Sin dirección'}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-between">
                      <button
                        onClick={() => setCorreoStep(2)}
                        className="border border-border bg-white text-muted hover:text-ink font-black uppercase text-[10px] tracking-widest py-3 px-5 rounded-xl transition-all"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={() => {
                          updateAppSettings(appSettings);
                          setCorreoStep(4);
                        }}
                        className="bg-primary hover:bg-primary/95 text-white font-black uppercase text-[10px] tracking-widest py-3 px-6 rounded-xl transition-all"
                      >
                        Guardar & Continuar Paso 4
                      </button>
                    </div>
                  </div>
                )}

                {correoStep === 4 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h4 className="text-sm font-black uppercase text-primary mb-1">Paso 4: Probar Despacho de la Alerta</h4>
                      <p className="text-xs text-muted font-bold leading-tight">Garantiza los flujos enviándote una alerta-informe de prueba a tu dirección de destino de inmediato.</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-[24px] border border-border/60 flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                        <Send className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted">Bandeja de Entrada</p>
                        <p className="text-sm font-extrabold text-ink leading-tight truncate">Enviar reporte unificado a mi correo</p>
                        <p className="text-[9px] text-muted font-bold truncate">Destino: {appSettings.reportEmail || 'Sin configurar'}</p>
                      </div>
                      <button
                        onClick={sendTestReport}
                        className="bg-accent hover:bg-accent/95 text-white font-black uppercase text-[9px] tracking-widest py-2.5 px-4 rounded-xl transition-all hover:scale-105 shrink-0"
                      >
                        Enviar Ahora
                      </button>
                    </div>

                    {smtpError && (
                      <div className="p-4 bg-red-50 text-red-950 border border-red-200 rounded-[24px] text-xs space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-start gap-3">
                          <span className="text-red-600 text-lg">⚠️</span>
                          <div className="space-y-1">
                            <p className="font-black uppercase tracking-wider text-red-800 text-[10px]">Error al Despachar Alerta</p>
                            <p className="font-bold text-[11px] leading-relaxed">{smtpError}</p>
                          </div>
                        </div>
                        {smtpError.toLowerCase().includes('lock') ? (
                          <div className="bg-white p-4 rounded-2xl space-y-2 text-[11px] border border-red-200/50">
                            <p className="font-extrabold text-red-800 uppercase tracking-wide text-[10px]">💡 Guía de Desbloqueo (Microsoft 365 / Outlook):</p>
                            <p className="font-bold text-slate-700 leading-normal">
                              Este error indica que Outlook ha bloqueado temporalmente los accesos automatizados SMTP para tu cuenta por seguridad. Sigue estos pasos:
                            </p>
                            <ol className="list-decimal pl-4.5 space-y-1.5 text-slate-600 font-semibold leading-normal">
                              <li>Inicia sesión de forma manual en <a href="https://login.microsoftonline.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-red-600 hover:text-red-800">Microsoft Portal</a> para confirmar si te pide cambio de contraseña o verificación adicional de identidad.</li>
                              <li>Solicita al administrador de TI/Soporte Técnico de tu empresa que habilite expresamente el check de **SMTP Autenticado** en los atributos de tu usuario de correo dentro del **Centro de Administración de Microsoft 365**.</li>
                              <li>Si usas autenticación multifactor (MFA), crea y utiliza una **Contraseña de Aplicación** ("App Password") en vez de tu clave habitual.</li>
                            </ol>
                          </div>
                        ) : smtpError.toLowerCase().includes('535') ? (
                          <div className="bg-white p-4 rounded-2xl space-y-2 text-[11px] border border-red-200/50">
                            <p className="font-extrabold text-red-800 uppercase tracking-wide text-[10px]">💡 Soluciones comunes para Error 535 / Autenticación:</p>
                            <ul className="list-disc pl-4.5 space-y-1.5 text-slate-600 font-semibold leading-normal">
                              <li>**Si es Gmail:** Tu contraseña normal está bloqueada por Google. Activa la verificación en 2 pasos de tu cuenta Google y genera una **Contraseña de Aplicación**. Configura esa clave especial en el Paso 1.</li>
                              <li>**Si es Outlook/Office 365:** El protocolo de autenticación básica SMTP suele estar inactivo por defecto bajo las políticas modernizadas de Microsoft. Pídele al administrador de TI de tu correo activar **"SMTP Autenticado"** para tu casilla.</li>
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 rounded-[24px] border border-border/60 flex items-center gap-4 animate-pulse">
                      <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted">Frecuencia Automática</p>
                        <p className="text-xs font-black text-ink leading-tight">El sistema vigila y notifica en segundo plano</p>
                      </div>
                      <span className="text-[9px] text-green-600 font-extrabold bg-green-50 px-2 py-1 rounded">VIGILANDO</span>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-between items-center">
                      <button
                        onClick={() => setCorreoStep(3)}
                        className="border border-border bg-white text-muted hover:text-ink font-black uppercase text-[10px] tracking-widest py-3 px-5 rounded-xl transition-all"
                      >
                        Atrás
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                        <p className="text-[9px] font-black uppercase tracking-wider text-green-600">Servidor Automatizado Activo</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Live Real-Time Interactive Mockup Preview Panel */}
              <div className="lg:col-span-5 space-y-4">
                <div className="text-center">
                  <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em] bg-gray-100 px-3 py-1 rounded-full border border-border">VISTA PREVIA EN TU CORREO</span>
                </div>

                <div className="relative bg-gradient-to-br from-gray-700 to-primary p-6 rounded-[32px] shadow-xl text-white overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-6 translate-x-6" />
                  
                  {/* Mockup Top Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] font-mono text-white/50 tracking-widest uppercase">CORREO ADMINISTRADOR</span>
                  </div>

                  {/* Envelope Header fields */}
                  <div className="space-y-1.5 border-b border-white/10 pb-4 mb-4 text-xs font-mono">
                    <p className="text-white/45 truncate"><span className="text-white/60 font-bold uppercase">De (Tu SMTP Remitente):</span> <span className="text-white font-semibold">{appSettings.smtpUser || 'correo-remitente-smtp@punto.cl'}</span></p>
                    <p className="text-white/45 truncate"><span className="text-white/60 font-bold uppercase">Para (Tu Correo Destinatario):</span> <span className="text-accent-light font-bold underline">{appSettings.reportEmail || 'tu-correo-administracióndonde-recibes@correo.com'}</span></p>
                    <p className="text-white/45 truncate"><span className="text-white/60 font-bold uppercase">Asunto de Alerta:</span> <span className="text-accent-light font-bold">
                      {
                        (() => {
                          const target = properties.find(p => p.id === previewPropId) || properties[0] || {
                            direccion: 'Av. Vitacura 2930, Depto 1402',
                            dueno: 'Juan Carlos Pérez'
                          };
                          const rawSubject = appSettings.emailSubject || '[Alerta Vencimiento] Propiedad: {DIRECCION} - Dueño: {DUENO}';
                          return rawSubject
                            .replace(/{DIRECCION}/g, target.direccion || 'Av. Vitacura 2930, Depto 1402')
                            .replace(/{DUENO}/g, target.dueno || 'Juan Carlos Pérez');
                        })()
                      }
                    </span></p>
                  </div>

                  {/* Letter Content Simulation */}
                  <div className="bg-white text-primary p-5 rounded-2xl min-h-[220px] shadow-inner font-sans text-[11px] leading-relaxed select-none overflow-y-auto max-h-[300px] border border-white/10">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                      <span className="text-[9px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded uppercase">Para el Administrador</span>
                      <span className="text-[9px] font-mono text-muted">Aviso Interno #PP-2026</span>
                    </div>

                    <div className="whitespace-pre-wrap font-medium text-ink">
                      {
                        (() => {
                          const target = properties.find(p => p.id === previewPropId) || properties[0] || {
                            direccion: 'Av. Vitacura 2930, Depto 1402',
                            dueno: 'Juan Carlos Pérez',
                            arrendatario: 'Valentina Martínez',
                            monto: 850000,
                            vencimiento: '30/06/2026',
                            mailD: 'juan@propietario.cl'
                          };
                          const rawTemplate = appSettings.emailTemplate || `Estimado Administrador,

Te notificamos que el contrato de arriendo para la propiedad en {DIRECCION} está próximo a vencer.

Detalles de la Gestión:
🏠 Dirección de Propiedad: {DIRECCION}
👤 Nombre del Dueño / Propietario: {DUENO}
🔑 Nombre del Arrendatario / Inquilino: {INQUILINO}
📅 Fecha exacta del Vencimiento: {FECHA_VENCIMIENTO}
💵 Renta de Arriendo Mensual: {VALOR}

Recuerda contactar al propietario y al inquilino para coordinar la renovación o entrega segura del inmueble.`;

                          return rawTemplate
                            .replace(/{INQUILINO}/g, target.arrendatario || 'Valentina Martínez')
                            .replace(/{DIRECCION}/g, target.direccion || 'Av. Vitacura 2930, Depto 1402')
                            .replace(/{DUENO}/g, target.dueno || 'Juan Carlos Pérez')
                            .replace(/{VALOR}/g, `$${(target.monto || 850000).toLocaleString('cl-CL')}`)
                            .replace(/{FECHA_VENCIMIENTO}/g, target.vencimiento || '30/06/2026');
                        })()
                      }
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-[9px] text-muted font-bold tracking-tight">
                      <p>PuntoPropiedades • Panel Administrativo</p>
                      <p className="text-xs">🔒 Conexión Encriptada SSL</p>
                    </div>
                  </div>
                </div>

                {/* Automation Summary Card */}
                <div className="bg-gradient-to-tr from-gray-50 to-gray-100 p-5 rounded-3xl border border-border shadow-sm space-y-3">
                  <h4 className="text-[10px] font-black text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    Auditoría de Envíos Segura
                  </h4>
                  <p className="text-[11px] text-muted font-medium leading-relaxed">
                    Tus conexiones SMTP son almacenadas de forma estrictamente segura. Las transmisiones usan cifrado SSL/TLS de punto a punto, imposibilitando fugas de seguridad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAdmin && activeModule === 'admin' && (
          <AdminPanel 
            setImpersonatedUid={setImpersonatedUid} 
            currentImpersonatedUid={impersonatedUid} 
            appSettings={appSettings}
            updateAppSettings={updateAppSettings}
          />
        )}

        {activeModule === 'support' && (
          <div className="max-w-6xl mx-auto py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="text-center space-y-2 mb-8 bg-white p-8 rounded-[36px] border border-border shadow-sm">
              <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent font-black tracking-widest px-4 py-1.5 rounded-full uppercase">Mesa de Ayuda & Consultorías</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-ink uppercase italic shrink-0 leading-none">Acompañamiento Técnico & Reuniones</h2>
              <p className="text-muted font-bold text-sm max-w-xl mx-auto">
                No queremos que seas un usuario, queremos que seas un experto. Agenda una reunión personalizada con nuestro equipo de éxito o abre un ticket prioritario con nosotros.
              </p>

              {/* Support Module Subtab selector */}
              <div className="flex justify-center gap-3 mt-6">
                {[
                  { id: 'meetings', icon: <Calendar className="w-4 h-4" />, label: 'Asesoría & Reuniones' },
                  { id: 'tickets', icon: <Inbox className="w-4 h-4" />, label: 'Tickets de Soporte' },
                  { id: 'faq', icon: <Globe className="w-4 h-4" />, label: 'Centro de Ayuda / FAQ' }
                ].map((tab: any) => (
                  <button
                    key={tab.id}
                    onClick={() => setSupportTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black uppercase text-[10px] tracking-wider transition-all duration-300 border ${
                      supportTab === tab.id
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10'
                        : 'bg-gray-50 text-muted border-border/60 hover:bg-white hover:text-ink'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTAINER 1: MEETINGS SCHEDULE */}
            {supportTab === 'meetings' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left block - Consult types */}
                  <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-xs font-black uppercase text-muted tracking-wider mb-2">1. Selecciona el Tipo de Reunión</h3>
                    
                    {[
                      { type: 'Capacitación de Lector IA', duration: '60 min', desc: 'Exploración profunda del procesador de contratos, optimización de variables y corrección de rutinas.', color: 'border-accent' },
                      { type: 'Automatización de Envíos SMTP', duration: '45 min', desc: 'Te ayudamos a enlazar tu correo corporativo y estructurar tus avisos para eliminar rebotes de cobranza.', color: 'border-green-500' },
                      { type: 'Migración Masiva de Portafolio', duration: '30 min', desc: 'Asistencia técnica directa para subir todo tu listado histórico de contratos desde planillas o carpetas.', color: 'border-yellow-500' }
                    ].map((meet) => (
                      <button
                        key={meet.type}
                        onClick={() => setSelectedMeetingType(meet.type)}
                        className={`w-full text-left p-5 bg-white border rounded-[28px] transition-all space-y-2 relative group hover:-translate-y-0.5 ${
                          selectedMeetingType === meet.type
                            ? `border-l-8 ${meet.color} ring-2 ring-primary/5 shadow-md`
                            : 'border-border hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-primary uppercase tracking-tight truncate max-w-[70%]">{meet.type}</span>
                          <span className="text-[9px] bg-gray-100 text-muted font-black uppercase tracking-widest px-2 py-0.5 rounded-full">{meet.duration}</span>
                        </div>
                        <p className="text-[11px] text-muted font-medium leading-relaxed leading-tight">
                          {meet.desc}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Calendar booking form inside */}
                  <div className="lg:col-span-8 bg-white p-6 rounded-[36px] border border-border shadow-sm space-y-6">
                    <div>
                      <h4 className="text-sm font-black uppercase text-primary mb-1">2. Fecha & Hora de la Reunión</h4>
                      <p className="text-xs text-muted font-bold">Disponible sólo de lunes a sábado. Horarios garantizados con expertos de PuntoPropiedades.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Visual mock calendar */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest block">Seleccionar Día (Próximos 7 días)</label>
                        <div className="grid grid-cols-7 gap-1.5 p-3 bg-gray-50 rounded-2xl border border-border text-center font-bold text-xs">
                          {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(d => (
                            <span key={d} className="text-[10px] text-muted uppercase font-black py-1">{d}</span>
                          ))}
                          {(() => {
                            const cells = [];
                            const today = new Date();
                            // Generate starting from yesterday to cover slots or show actual printable days
                            const start = new Date(today);
                            start.setDate(today.getDate() - today.getDay()); // Start of week

                            for (let i = 0; i < 14; i++) {
                              const d = new Date(start);
                              d.setDate(start.getDate() + i);
                              const isSunday = d.getDay() === 0;
                              const isPast = d < today && d.toDateString() !== today.toDateString();
                              const dateStr = d.toISOString().split('T')[0];
                              const isSelected = meetingDate === dateStr;

                              cells.push(
                                <button
                                  key={`line-3052-${i}`}
                                  type="button"
                                  disabled={isSunday || isPast}
                                  onClick={() => setMeetingDate(dateStr)}
                                  className={`aspect-square rounded-xl text-[11px] flex flex-col items-center justify-center font-bold transition-all ${
                                    isSelected
                                      ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-105'
                                      : isSunday || isPast
                                      ? 'text-muted/20 cursor-not-allowed bg-transparent'
                                      : 'bg-white border border-border text-ink hover:border-accent hover:text-accent'
                                  }`}
                                >
                                  {d.getDate()}
                                </button>
                              );
                            }
                            return cells;
                          })()}
                        </div>
                        {meetingDate ? (
                          <p className="text-[11px] text-accent font-black uppercase tracking-wider text-right">Día: {meetingDate}</p>
                        ) : (
                          <p className="text-[10px] text-danger font-bold tracking-tight text-right italic">Debe seleccionar un día válido</p>
                        )}
                      </div>

                      {/* Hour slots */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest block">Horarios Disponibles (Hora Chilena)</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['09:00', '10:30', '14:30', '16:00'].map((hour) => (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => setMeetingTime(hour)}
                              className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border text-center ${
                                meetingTime === hour
                                  ? 'bg-primary text-white border-primary shadow-md scale-[1.03]'
                                  : 'bg-white border-border hover:border-accent text-ink'
                              }`}
                            >
                              🕒 {hour} Hrs
                            </button>
                          ))}
                        </div>
                        {meetingTime ? (
                          <p className="text-[11px] text-accent font-black uppercase tracking-wider text-right">Hora: {meetingTime} Hrs</p>
                        ) : (
                          <p className="text-[10px] text-danger font-bold tracking-tight text-right italic">Debe elegir un horario</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted tracking-widest block">¿Qué duda o requerimiento técnico tienes hoy?</label>
                      <input
                        type="text"
                        placeholder="Ej: Automatizar lectura de 50 contratos de arriendo..."
                        value={meetingReason}
                        onChange={(e) => setMeetingReason(e.target.value)}
                        className="w-full bg-gray-50 border border-border rounded-xl p-3 text-xs font-semibold outline-none focus:bg-white focus:border-accent"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={async () => {
                          if (!meetingDate || !meetingTime) {
                            showToast('Por favor, selecciona fecha y hora en los paneles de arriba', 'error');
                            return;
                          }
                          let newMeeting = {
                            id: `meet-${Date.now()}`,
                            tipo: selectedMeetingType,
                            fecha: meetingDate,
                            hora: meetingTime,
                            duda: meetingReason || 'Dudas generales en la plataforma',
                            meetLink: '',
                            estado: 'Confirmada'
                          };

                          // Crear evento en Calendar si está autenticado
                          const token = getAccessToken();
                          if (token) {
                            try {
                              const meetingRes = await fetch('/api/create-meeting', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({
                                  title: `Reunión: ${newMeeting.tipo}`,
                                  description: newMeeting.duda,
                                  start: new Date(newMeeting.fecha + 'T' + newMeeting.hora).toISOString(),
                                  end: new Date(new Date(newMeeting.fecha + 'T' + newMeeting.hora).getTime() + 60 * 60 * 1000).toISOString(),
                                  recipientEmail: appSettings.reportEmail || 'cristobalmo15@gmail.com',
                                  smtpConfig: {
                                    host: appSettings.smtpHost,
                                    port: appSettings.smtpPort,
                                    user: appSettings.smtpUser,
                                    pass: appSettings.smtpPass
                                  }
                                })
                              });
                              
                              if (meetingRes.ok) {
                                  const meetingData = await meetingRes.json();
                                  console.log('[DEBUG] meetingData:', meetingData);
                                  newMeeting.meetLink = meetingData.hangoutLink;
                              } else {
                                  newMeeting.meetLink = 'Error al generar';
                              }
                            } catch (e) {
                              newMeeting.meetLink = 'Error al generar';
                            }
                          } else {
                            newMeeting.meetLink = 'Pendiente de enlace';
                          }

                          const updatedMeetings = [newMeeting, ...(appSettings.meetings || [])];
                          console.log('[DEBUG] Saving new meeting:', newMeeting, 'New list:', updatedMeetings);
                          const updatedSettings = { ...appSettings, meetings: updatedMeetings };
                          setAppSettings(updatedSettings);
                          await updateAppSettings(updatedSettings);
                          
                          showToast('Reunión agendada con éxito. Se ha enviado una confirmación al correo.', 'success');
                          
                          // No longer calling /api/send-report here as meeting email is handled in /api/create-meeting

                          setMeetingDate('');
                          setMeetingTime('');
                          setMeetingReason('');
                        }}
                        className="bg-accent hover:bg-accent/95 hover:shadow-lg text-white font-black uppercase text-[10px] tracking-widest py-3.5 px-8 rounded-xl transition-all"
                      >
                        ✓ Agendar con un solo Click
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scheduled list section */}
                <div className="bg-white p-6 rounded-[36px] border border-border shadow-sm space-y-4">
                  <h3 className="text-sm font-black uppercase text-primary flex items-center gap-2">
                    <span className="w-1.5 h-[14px] bg-accent rounded" />
                    Tus Reuniones Confirmadas ({appSettings.meetings?.length || 0})
                  </h3>

                  {(!appSettings.meetings || appSettings.meetings.length === 0) ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-border">
                      <p className="text-xs text-muted font-bold uppercase tracking-widest">Aún no agendas reuniones técnicas para esta semana.</p>
                      <p className="text-[10px] text-muted mt-1">Usa el programador interactivo de arriba para asegurar tu bloque con un especialista.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {appSettings.meetings.map((meet: any, i: number) => (
                        <div key={meet.id || `meet-${i}-${meet.fecha || 'no-date'}`} className="p-5 rounded-2xl border border-border bg-gray-50/30 hover:bg-white hover:shadow-md transition-all space-y-3 relative group">
                          <span className="absolute top-4 right-4 text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                            ● {meet.estado || 'Sin estado'}
                          </span>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-accent font-mono block mb-1">PROGRAMADO CON ÉXITO</span>
                            <h4 className="text-xs font-black text-ink uppercase tracking-tight truncate leading-tight">{meet.tipo}</h4>
                            <p className="text-[10px] font-black text-muted uppercase mt-1">📅 {meet.fecha} &nbsp;|&nbsp; 🕒 {meet.hora} Hrs</p>
                            <p className="text-[11px] text-muted italic mt-2 leading-snug">" {meet.duda} "</p>
                          </div>
                          
                          <div className="pt-2 flex justify-between items-center gap-2 border-t border-dashed border-border">
                            <button
                              onClick={() => {
                                window.open(meet.meetLink, '_blank');
                              }}
                              className="bg-ink hover:bg-black text-white rounded-xl py-2 px-4 font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
                            >
                              <Video className="w-3 h-3 text-green-400" /> Unirse a Google Meet
                            </button>

                            <button
                              onClick={async () => {
                                const remain = appSettings.meetings.filter((m: any) => m.id !== meet.id);
                                const updated = { ...appSettings, meetings: remain };
                                setAppSettings(updated);
                                await updateAppSettings(updated);
                                showToast('Reunión cancelada correctamente');
                              }}
                              className="text-[9px] font-bold text-danger hover:underline uppercase tracking-wide shrink-0"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTAINER 2: INCIDENT TICKETS */}
            {supportTab === 'tickets' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
                {/* Send a dynamic ticket */}
                <div className="lg:col-span-5 bg-white p-6 rounded-[36px] border border-border shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-black uppercase text-primary mb-1">Abrir un Ticket Técnico</h4>
                    <p className="text-xs text-muted font-bold leading-tight">Envíanos tu reporte de error, duda o sugerencia de forma prioritaria.</p>
                  </div>

                  <div className="space-y-3 font-medium text-xs">
                    <div>
                      <label className="text-[9px] font-black uppercase text-muted tracking-widest block mb-1">Asunto de Incidente</label>
                      <input
                        type="text"
                        placeholder="Ej: Contrato no extrae el aval legal..."
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full bg-gray-50 border border-border rounded-xl p-3 text-xs font-semibold outline-none focus:bg-white focus:border-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest block mb-1">Módulo / Categoría</label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="w-full bg-gray-50 border border-border rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="Lector IA">Lector IA</option>
                          <option value="Sincronización Correo">Sincronización Correo</option>
                          <option value="Carga Masiva">Carga Masiva</option>
                          <option value="Facturación">Cobros / Facturación</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-muted tracking-widest block mb-1">Prioridad de Ticket</label>
                        <select
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value)}
                          className="w-full bg-gray-50 border border-border rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="Alta">Alta (Crítica)</option>
                          <option value="Media">Media</option>
                          <option value="Baja">Baja</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-muted tracking-widest block mb-1">Mensaje en Detalle</label>
                      <textarea
                        rows={4}
                        placeholder="Digita con precisión los pasos de reproducción o detalle técnico..."
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        className="w-full bg-gray-50 border border-border rounded-xl p-3 text-xs font-medium outline-none focus:bg-white focus:border-accent"
                      />
                    </div>

                    <button
                      onClick={async () => {
                        if (!ticketSubject || !ticketMessage) {
                          showToast('Debe ingresar un Asunto y Mensaje', 'error');
                          return;
                        }

                        // Create simulated support replies
                        let responseText = `Hola Cristóbal. Hemos recibido tu incidente en el módulo ${ticketCategory}. `;
                        if (ticketCategory === 'Lector IA') {
                          responseText += 'Nuestro modelo de Inteligencia Artificial para contratos se encuentra funcionando con normalidad. No obstante, te sugerimos verificar que el documento cuente con el texto legible en PDF. Si el contenido fue digitalizado de forma errónea o desenfocada, procesaremos un rasterizado OCR inteligente de inmediato para asegurar su extracción.';
                        } else if (ticketCategory === 'Sincronización Correo') {
                          responseText += 'Garantizamos soporte continuo. El error 535 se debe habitualmente a la desactivación del protocolo SMTP autenticado por las directivas de seguridad de tu proveedor de Microsoft 365 o Google Workspace. Por favor, asegúrate de activar la Clave de Aplicación o solicitar la habilitación técnica del SMTP Autenticado.';
                        } else {
                          responseText += 'Un ejecutivo de soporte ha sido asignado y está revisando tu caso directamente en base a tus propiedades activas. Estimamos resolver este ticket en menos de 2 horas.';
                        }

                        const newTicket = {
                          id: `ticket-${Date.now()}`,
                          asunto: ticketSubject,
                          mensaje: ticketMessage,
                          fecha: new Date().toISOString(),
                          categoria: ticketCategory,
                          prioridad: ticketPriority,
                          estado: 'Respondido',
                          respuestas: [
                            {
                              remitente: 'Claudio - Soporte Técnico',
                              avatar: 'CS',
                              mensaje: responseText,
                              fecha: new Date().toISOString()
                            }
                          ]
                        };

                        const userTickets = appSettings.tickets || [
                          {
                            id: 'ticket-1',
                            asunto: 'Error en procesamiento de contrato PDF pesado',
                            mensaje: 'Traté de subir un documento de 45 páginas y me arroja un error de memoria.',
                            fecha: '2026-05-18T10:30:00Z',
                            categoria: 'Lector IA',
                            prioridad: 'Alta',
                            estado: 'Respondido',
                            respuestas: [
                              {
                                remitente: 'Claudio - Soporte Técnico',
                                avatar: 'CS',
                                mensaje: 'Hola Cristóbal. Hemos optimizado temporalmente el límite para tu cuenta de Terminal Pro. Ya puedes procesar contratos de hasta 100 páginas en el módulo Procesador IA. Por favor, pruébalo ahora.',
                                fecha: '2026-05-18T11:15:00Z'
                              }
                            ]
                          }
                        ];

                        const updatedTickets = [newTicket, ...userTickets];
                        const updated = { ...appSettings, tickets: updatedTickets };
                        setAppSettings(updated);
                        await updateAppSettings(updated);

                        showToast('¡Ticket enviado! Se generó una respuesta de soporte técnica automatizado en el panel.', 'success');
                        setTicketSubject('');
                        setTicketMessage('');
                      }}
                      className="w-full bg-primary hover:bg-black text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all"
                    >
                      Enviar Reporte Técnico
                    </button>
                  </div>
                </div>

                {/* Right block: Live visual list of open tickets */}
                <div className="lg:col-span-7 bg-white p-6 rounded-[36px] border border-border shadow-sm space-y-4">
                  <h3 className="text-sm font-black uppercase text-primary">Listado Histórico de Incidentes</h3>

                  {(() => {
                    const ticketsToRender = appSettings.tickets?.length > 0 ? appSettings.tickets : [
                      {
                        id: 'ticket-1',
                        asunto: 'Error en procesamiento de contrato PDF pesado',
                        mensaje: 'Traté de subir un documento de 45 páginas y me arroja un error de memoria.',
                        fecha: '2026-05-18T10:30:00Z',
                        categoria: 'Lector IA',
                        prioridad: 'Alta',
                        estado: 'Respondido',
                        respuestas: [
                          {
                            remitente: 'Claudio - Soporte Técnico',
                            avatar: 'CS',
                            mensaje: 'Hola Cristóbal. Hemos optimizado temporalmente el límite para tu cuenta de Terminal Pro. Ya puedes procesar contratos de hasta 100 páginas en el módulo Procesador IA. Por favor, pruébalo ahora.',
                            fecha: '2026-05-18T11:15:00Z'
                          }
                        ]
                      },
                      {
                        id: 'ticket-2',
                        asunto: 'Sincronizar emails desde dominio propio',
                        mensaje: '¿Soportan correos corporativos que no sean Gmail o Outlook?',
                        fecha: '2026-05-15T14:22:00Z',
                        categoria: 'Sincronización Correo',
                        prioridad: 'Media',
                        estado: 'Solucionado',
                        respuestas: [
                          {
                            remitente: 'Sofía - Éxito Cliente',
                            avatar: 'SM',
                            mensaje: 'Hola. ¡Sí, por supuesto! Puedes activar "Ajustes de Servidor SMTP Avanzados" en el módulo de Correo e ingresar los datos del host SMTP y puerto de tu dominio corporativo directamente.',
                            fecha: '2026-05-15T15:00:00Z'
                          }
                        ]
                      }
                    ];

                    return (
                      <div className="space-y-3">
                        {ticketsToRender.map((ticket: any) => {
                          const isExpanded = expandedTicketId === ticket.id;
                          return (
                            <div key={ticket.id} className="border border-border rounded-2xl overflow-hidden transition-all bg-gray-50/25 hover:bg-white hover:border-accent">
                              {/* Header button click */}
                              <button
                                onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                                className="w-full text-left p-4 flex justify-between items-start gap-3"
                              >
                                <div className="space-y-1 py-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                      ticket.prioridad === 'Alta' ? 'bg-red-50 text-danger' : 'bg-gray-100 text-muted'
                                    }`}>
                                      {ticket.prioridad}
                                    </span>
                                    <span className="text-[9px] text-muted font-bold font-mono tracking-widest">{ticket.categoria}</span>
                                  </div>
                                  <h4 className="text-xs font-black text-ink uppercase leading-snug tracking-tight">{ticket.asunto}</h4>
                                  <p className="text-[9px] text-muted block">Abierto el: {new Date(ticket.fecha).toLocaleDateString()}</p>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className={`text-[8px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                    ticket.estado === 'Respondido' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-accent'
                                  }`}>
                                    ● {ticket.estado}
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                                </div>
                              </button>

                              {/* Conversation detail expanded */}
                              {isExpanded && (
                                <div className="p-4 border-t border-border bg-white space-y-4 animate-in slide-in-from-top-2 duration-300">
                                  {/* Original Doubt */}
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 bg-primary text-white font-black text-[10px] rounded-full flex items-center justify-center uppercase shrink-0">
                                      TÚ
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-2xl border border-border shrink-1 max-w-[85%]">
                                      <p className="text-xs font-semibold text-ink leading-relaxed font-sans">{ticket.mensaje}</p>
                                      <span className="text-[8px] text-muted/50 font-mono tracking-widest uppercase block mt-1">{new Date(ticket.fecha).toLocaleTimeString()}</span>
                                    </div>
                                  </div>

                                  {/* Responses list */}
                                  {ticket.respuestas?.map((resp: any, rIdx: number) => (
                                    <div key={rIdx} className="flex items-start justify-end gap-3">
                                      <div className="bg-red-50 p-3 rounded-2xl border border-red-100 max-w-[85%] text-right shrink-1">
                                        <p className="text-[9px] font-mono font-black uppercase text-accent tracking-widest mb-1">{resp.remitente}</p>
                                        <p className="text-xs font-medium text-red-900 leading-relaxed font-sans text-left">{resp.mensaje}</p>
                                        <span className="text-[8px] text-accent/40 font-mono tracking-widest uppercase block mt-1 text-right">{new Date(resp.fecha).toLocaleTimeString()}</span>
                                      </div>
                                      <div className="w-7 h-7 bg-accent text-white font-black text-[9px] rounded-full flex items-center justify-center shrink-0">
                                        {resp.avatar || 'PP'}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Send custom message reply to continue */}
                                  <div className="flex gap-2 pt-2 border-t border-dashed border-border">
                                    <input
                                      type="text"
                                      placeholder="Digitar respuesta de seguimiento..."
                                      id={`reply-input-${ticket.id}`}
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          const input = document.getElementById(`reply-input-${ticket.id}`) as HTMLInputElement;
                                          if (!input || !input.value.trim()) return;

                                          const userReply = {
                                            remitente: 'Cristóbal',
                                            avatar: 'YO',
                                            mensaje: input.value,
                                            fecha: new Date().toISOString()
                                          };

                                          // Submitting follow up simulated text
                                          const adminReply = {
                                            remitente: 'Claudio - Soporte Técnico',
                                            avatar: 'CS',
                                            mensaje: 'Correcto. Nuestro equipo está depurando la bitácora técnica de tu cuenta en tiempo real. Conserva este ticket abierto para notificarte de inmediato.',
                                            fecha: new Date().toISOString()
                                          };

                                          const updatedTickets = appSettings.tickets.map((t: any) => {
                                            if (t.id === ticket.id) {
                                              return {
                                                ...t,
                                                respuestas: [...(t.respuestas || []), userReply, adminReply]
                                              };
                                            }
                                            return t;
                                          });

                                          const updated = { ...appSettings, tickets: updatedTickets };
                                          setAppSettings(updated);
                                          await updateAppSettings(updated);
                                          input.value = '';
                                          showToast('Mensaje enviado. Respuesta coordinada.', 'success');
                                        }
                                      }}
                                      className="flex-1 bg-gray-50 border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-accent"
                                    />
                                    <button
                                      onClick={() => {
                                        const input = document.getElementById(`reply-input-${ticket.id}`) as HTMLInputElement;
                                        if (input) {
                                          const e = new KeyboardEvent('keydown', { key: 'Enter' });
                                          input.dispatchEvent(e);
                                        }
                                      }}
                                      className="p-2.5 bg-primary hover:bg-black text-white rounded-xl flex items-center justify-center shrink-0"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB CONTAINER 3: FAQ KNOWLEDGE BASE */}
            {supportTab === 'faq' && (
              <div className="max-w-4xl mx-auto bg-white p-8 rounded-[36px] border border-border shadow-sm space-y-6 animate-in fade-in duration-300">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black uppercase text-primary">Centro de Respuestas Rápidas</h3>
                  <p className="text-xs text-muted font-bold">Obtén soluciones inmediatas y óptimas de manera directa sobre procesos críticos.</p>
                </div>

                {/* Sub accordion collapsible items wrapper */}
                <div className="space-y-3 font-semibold text-xs">
                  {[
                    {
                      q: '¿Cómo funciona la sincronización automática de arriendos por correo?',
                      a: 'Consiste en habilitar un canal SMTP seguro de escucha bidireccional. Cada vez que recibas un correo con boletas, contratos o liquidaciones de arriendo en tu remitente SMTP, PuntoPropiedades lee el cuerpo del archivo usando el extractor del módulo Procesador IA y lo sincroniza de manera automática sin necesidad de intervención manual.',
                      cat: 'Correo'
                    },
                    {
                      q: '¿Qué es un archivo o huella dactilar de un contrato?',
                      a: 'Es un identificador único SHA-256 (hash) calculado sobre tus PDFs. Evita completamente que subas o sincronices contratos duplicados por accidente. Si un archivo fue subido en el pasado, el importador masivo lo omitirá de inmediato para proteger la integridad y limpieza de tus números globales.',
                      cat: 'Lector IA'
                    },
                    {
                      q: '¿Cómo puedo agendar asesorías de integración masiva?',
                      a: 'A través de la sección "Asesoría & Reuniones" de este módulo. Contamos con ingenieros dedicados dispuestos a capacitarte, estructurar tu SMTP corporativo de dominio propio, o recibir lotes de arriendos en Excel para dejarlos completamente cargados en tu cuenta.',
                      cat: 'General'
                    },
                    {
                      q: '¿Los datos extraídos son editables?',
                      a: 'Sí, absolutamente. Una vez procesados por la inteligencia artificial, se genera una tarjeta borrador que te permite revisar, validar ruts exentos y corregir cualquier parámetro de fecha u obligación antes de confirmarlo permanentemente en el listado activo.',
                      cat: 'Lector IA'
                    }
                  ].map((faq, i) => (
                    <div key={`line-4513-${i}`} className="p-5 rounded-2xl bg-gray-50/50 border border-border/80 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[9px] font-mono tracking-widest font-black uppercase text-accent bg-accent/10 px-2.5 py-0.5 rounded-full shrink-0">
                          {faq.cat}
                        </span>
                        <h4 className="text-xs font-black text-ink uppercase leading-snug tracking-tight flex-1">
                          {faq.q}
                        </h4>
                      </div>
                      <p className="text-[11px] text-muted font-medium leading-relaxed mt-1 font-sans">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {previewData && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewData(null)} className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-border flex justify-between items-center bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileSearch className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Vista Previa de Extracción</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{previewData.fileName}</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const file = bulkFiles.find(f => f.name === previewData.fileName);
                            if (file) {
                              const url = URL.createObjectURL(file);
                              window.open(url, '_blank');
                            } else if (previewData.pdf && previewData.pdf !== '#') {
                              viewContract(previewData.pdf, previewData.a_nom);
                            }
                          }}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all group"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Ver PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setPreviewData(null)} className="p-2 hover:bg-white rounded-full transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Ubicación y Canon</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all md:col-span-1">
                        <p className="text-[8px] text-muted uppercase font-black mb-1">Dirección Detectada</p>
                        <input 
                          type="text"
                          value={previewData.dir || ''}
                          onChange={(e) => setPreviewData({...previewData, dir: e.target.value})}
                          className="w-full bg-transparent font-bold text-sm outline-none text-ink"
                          placeholder="Ingrese dirección..."
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all md:col-span-1">
                        <p className="text-[8px] text-muted uppercase font-black mb-1">Canon Mensual (Solo números)</p>
                        <input 
                          type="number"
                          value={previewData.can || ''}
                          onChange={(e) => setPreviewData({...previewData, can: e.target.value})}
                          className="w-full bg-transparent font-black text-sm text-primary outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all md:col-span-1">
                        <p className="text-[8px] text-muted uppercase font-black mb-1">Moneda</p>
                        <select
                          value={previewData.tipoMonto || 'pesos'}
                          onChange={(e) => setPreviewData({...previewData, tipoMonto: e.target.value as 'pesos' | 'uf'})}
                          className="w-full bg-transparent font-bold text-sm outline-none text-ink"
                        >
                          <option value="pesos">Pesos ($)</option>
                          <option value="uf">UF</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Vigencia del Contrato</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all">
                        <p className="text-[8px] text-muted uppercase font-black mb-1">Fecha Inicio</p>
                        <input 
                          type="date"
                          value={previewData.f_ini || ''}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const months = Number(previewData.duracionMeses) || 12;
                            setPreviewData({
                              ...previewData, 
                              f_ini: newStart,
                              f_ven: calculateExpiry(newStart, months)
                            });
                          }}
                          className="w-full bg-transparent font-bold text-sm outline-none text-ink"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all">
                        <p className="text-[8px] text-muted uppercase font-black mb-1">Duración (Meses)</p>
                        <select
                          value={previewData.duracionMeses || 12}
                          onChange={(e) => {
                            const months = Number(e.target.value);
                            setPreviewData({
                              ...previewData,
                              duracionMeses: months,
                              duracion: `${months} meses`,
                              f_ven: calculateExpiry(previewData.f_ini || '', months)
                            });
                          }}
                          className="w-full bg-transparent font-bold text-sm outline-none text-ink"
                        >
                          <option value={6}>6 meses</option>
                          <option value={12}>12 meses (1 año)</option>
                          <option value={18}>18 meses</option>
                          <option value={24}>24 meses (2 años)</option>
                          <option value={30}>30 meses</option>
                          <option value={36}>36 meses (3 años)</option>
                          <option value={48}>48 meses (4 años)</option>
                          <option value={60}>60 meses (5 años)</option>
                          <option value={120}>120 meses (10 años)</option>
                        </select>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all">
                        <p className="text-[8px] text-muted uppercase font-black mb-1">Fecha Vencimiento (Recalculado)</p>
                        <input 
                          type="date"
                          value={previewData.f_ven || ''}
                          onChange={(e) => setPreviewData({...previewData, f_ven: e.target.value})}
                          className={`w-full bg-transparent font-bold text-sm outline-none ${isExpired(previewData.f_ven) ? 'text-danger' : 'text-ink'}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Arrendatario</h4>
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-[7px] text-muted uppercase font-black mb-1">Nombre</p>
                          <textarea 
                            value={previewData.a_nom || ''}
                            onChange={(e) => setPreviewData({...previewData, a_nom: e.target.value})}
                            className="w-full bg-transparent font-bold text-[10px] outline-none resize-none break-words min-h-[80px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-[7px] text-muted uppercase font-black mb-1">RUT</p>
                            <input 
                              type="text"
                              value={previewData.a_rut || ''}
                              onChange={(e) => setPreviewData({...previewData, a_rut: e.target.value})}
                              className="w-full bg-transparent font-bold text-[10px] outline-none"
                            />
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-[7px] text-muted uppercase font-black mb-1">Teléfono</p>
                            <input 
                              type="text"
                              value={previewData.a_tel || ''}
                              onChange={(e) => setPreviewData({...previewData, a_tel: e.target.value})}
                              className="w-full bg-transparent font-bold text-[10px] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Aval / Codeudor</h4>
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <p className="text-[7px] text-muted uppercase font-black mb-1">Nombre</p>
                          <textarea 
                            value={previewData.av_nom || ''}
                            onChange={(e) => setPreviewData({...previewData, av_nom: e.target.value})}
                            className="w-full bg-transparent font-bold text-[10px] outline-none resize-none break-words min-h-[80px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-[7px] text-muted uppercase font-black mb-1">RUT</p>
                            <input 
                              type="text"
                              value={previewData.av_rut || ''}
                              onChange={(e) => setPreviewData({...previewData, av_rut: e.target.value})}
                              className="w-full bg-transparent font-bold text-[10px] outline-none"
                            />
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <p className="text-[7px] text-muted uppercase font-black mb-1">Teléfono</p>
                            <input 
                              type="text"
                              value={previewData.av_tel || ''}
                              onChange={(e) => setPreviewData({...previewData, av_tel: e.target.value})}
                              className="w-full bg-transparent font-bold text-[10px] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Propietario / Sociedad</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl col-span-2">
                      <p className="text-[7px] text-muted uppercase font-black mb-1">Nombre</p>
                      <textarea 
                        value={previewData.d_nom || ''}
                        onChange={(e) => setPreviewData({...previewData, d_nom: e.target.value})}
                        className="w-full bg-transparent font-bold text-[10px] outline-none resize-none break-words min-h-[80px]"
                      />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[7px] text-muted uppercase font-black mb-1">RUT</p>
                      <input 
                        type="text"
                        value={previewData.d_rut || ''}
                        onChange={(e) => setPreviewData({...previewData, d_rut: e.target.value})}
                        className="w-full bg-transparent font-bold text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
                </div>

                <div className="p-8 bg-gray-50 border-t border-border flex gap-4">
                  <button 
                    onClick={() => setPreviewData(null)}
                    className="flex-1 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-muted hover:bg-white transition-all"
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={() => {
                      const file = bulkFiles.find(f => f.name === previewData.fileName);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        window.open(url, '_blank');
                      } else if (previewData.pdf && previewData.pdf !== '#') {
                        viewContract(previewData.pdf, previewData.a_nom);
                      }
                    }}
                    className="flex-1 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-primary border border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Contrato
                  </button>
                  <button 
                    disabled={loading}
                    onClick={async () => {
                      const dateCheck = validateDates(previewData.f_ini || '', previewData.f_ven || '');
                      if (!dateCheck.valid) {
                        showToast(dateCheck.message, 'error');
                        return;
                      }
                      setLoading(true);
                      setLoadingStatus('Sincronizando...');
                      try {
                        let pdfUrl = previewData.pdf || '#';
                        const file = bulkFiles.find(f => f.name === previewData.fileName);
                        
                        // If file exists and hasn't been uploaded yet (is #), upload it now
                        if (file && (pdfUrl === '#' || !pdfUrl)) {
                          setLoadingStatus('Subiendo contrato a la nube...');
                          pdfUrl = await uploadFileToStorage(file, 'contracts');
                        }

                        await addDoc(collection(db, 'properties'), {
                          direccion: previewData.dir || '',
                          valor: Number(previewData.can) || 0,
                          tipoMonto: previewData.tipoMonto || 'pesos',
                          duracionMeses: Number(previewData.duracionMeses) || 12,
                          termino: previewData.f_ven || previewData.f_ini || '',
                          f_ini: previewData.f_ini || '',
                          duracion: previewData.duracion || '12 meses',
                          dueno: previewData.d_nom || '',
                          rutDue: previewData.d_rut || '',
                          telD: previewData.d_tel || '',
                          mailD: previewData.d_mail || '',
                          arrendatario: previewData.a_nom || '',
                          rutArr: previewData.a_rut || '',
                          telA: previewData.a_tel || '',
                          mailA: previewData.a_mail || '',
                          aval: previewData.av_nom || '',
                          rutAval: previewData.av_rut || '',
                          telAval: previewData.av_tel || '',
                          mailAval: previewData.av_mail || '',
                          ownerUid: user.uid,
                          expenses: [],
                          pdf: pdfUrl,
                          createdAt: serverTimestamp()
                        });
                        setBulkData(bulkData.filter(d => d.fileName !== previewData.fileName));
                        setPreviewData(null);
                        showToast('Propiedad sincronizada con PDF');
                      } catch (e) {
                        console.error('Error syncing single property:', e);
                        showToast('Error al sincronizar', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className={`flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-primary/20 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
                  >
                    {loading ? 'Procesando...' : 'Sincronizar Esta Unidad'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)} 
              className="absolute inset-0 bg-ink/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.98, opacity: 0, y: 20 }} 
              className="relative w-full max-w-7xl bg-[#faf9f6] rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-border/10"
            >
              {/* Header: Compacto */}
              <div className="px-10 py-6 border-b border-border/5 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-bg rounded-[16px] flex items-center justify-center shadow-inner">
                    <Plus className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-[8px] font-black uppercase tracking-[0.4em] text-ink/20 mb-1 font-mono">Maestro de Activos</h3>
                    <p className="text-xl font-bold text-ink uppercase tracking-tight">
                      {formData.id ? 'Edición de Ficha Técnica' : 'Registro de Nueva Propiedad'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-bg hover:bg-white rounded-full transition-all flex items-center justify-center group border border-border/10">
                  <X className="w-4 h-4 text-ink/20 group-hover:text-danger" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-bg/10">
                <div className="space-y-4">
                  
                  {/* Fila 1: Contrato (Compact Hero) */}
                  <div className="bg-ink p-5 rounded-[24px] shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-[40px]" />
                    <div className="relative z-10 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                           <Zap className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-white uppercase tracking-tight">Documentación Operativa</p>
                          <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono">Sincronización de Contrato PDF</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="shrink-0 bg-white text-ink px-6 py-2.5 rounded-[14px] font-black uppercase text-[8px] tracking-[0.2em] cursor-pointer hover:bg-accent hover:text-white transition-all active:scale-95 shadow-sm">
                           {formData.pdf && formData.pdf !== '#' ? 'Reemplazar PDF' : 'Subir Documento'}
                           <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                        {formData.pdf && formData.pdf !== '#' ? (
                          <button 
                            type="button"
                            onClick={() => viewContract(formData.pdf, formData.arrendatario || formData.dueno || 'Contrato')}
                            className="shrink-0 bg-accent text-white px-6 py-2.5 rounded-[14px] font-black uppercase text-[8px] tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
                          >
                            <Eye size={12} />
                            Visualizar Contrato
                          </button>
                        ) : pdfUrlForPreview ? (
                          <button 
                            type="button"
                            onClick={() => viewContract(pdfUrlForPreview, formData.arrendatario || formData.dueno || 'Contrato')}
                            className="shrink-0 bg-accent text-white px-6 py-2.5 rounded-[14px] font-black uppercase text-[8px] tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
                          >
                            <Eye size={12} />
                            Visualizar Vista Previa
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tarjeta 1: Unidad */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Building2 className="w-3.5 h-3.5 text-accent" />
                        <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em]">Ficha de Unidad</h4>
                      </div>
                      <div className="bg-white p-6 rounded-[24px] border border-border/10 shadow-sm space-y-4">
                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Dirección de la Propiedad</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Calle San Pedro 200..."
                            value={formData.direccion || ''}
                            onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                            className="w-full bg-transparent text-xs font-bold outline-none text-ink pb-1.5 border-b border-border/5"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-4 pb-1.5 border-b border-border/5">
                          <div className="col-span-3">
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Canon Mensual</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              value={formData.valor || ''}
                              onChange={(e) => setFormData({...formData, valor: e.target.value})}
                              className="w-full bg-transparent text-xs font-bold outline-none text-ink"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Moneda</label>
                            <select
                              value={formData.tipoMonto || 'pesos'}
                              onChange={(e) => setFormData({...formData, tipoMonto: e.target.value as 'pesos' | 'uf'})}
                              className="w-full bg-transparent text-xs font-bold outline-none text-ink"
                            >
                              <option value="pesos">Pesos ($)</option>
                              <option value="uf">UF</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-1.5 border-b border-border/5">
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Inicio Ciclo</label>
                            <input 
                              type="date" 
                              value={formData.f_ini || ''}
                              onChange={(e) => {
                                const newStart = e.target.value;
                                const months = Number(formData.duracionMeses) || 12;
                                setFormData({
                                  ...formData, 
                                  f_ini: newStart,
                                  termino: calculateExpiry(newStart, months)
                                });
                              }}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink/70"
                            />
                          </div>
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Duración (Meses)</label>
                            <select
                              value={formData.duracionMeses || 12}
                              onChange={(e) => {
                                const months = Number(e.target.value);
                                setFormData({
                                  ...formData,
                                  duracionMeses: months,
                                  duracion: `${months} meses`,
                                  termino: calculateExpiry(formData.f_ini || '', months)
                                });
                              }}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink/70"
                            >
                              <option value={6}>6 meses</option>
                              <option value={12}>12 meses (1 año)</option>
                              <option value={18}>18 meses</option>
                              <option value={24}>24 meses (2 años)</option>
                              <option value={30}>30 meses</option>
                              <option value={36}>36 meses (3 años)</option>
                              <option value={48}>48 meses (4 años)</option>
                              <option value={60}>60 meses (5 años)</option>
                              <option value={120}>120 meses (10 años)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Término Ciclo (Recalculado)</label>
                          <input 
                            type="date" 
                            value={formData.termino || ''}
                            onChange={(e) => setFormData({...formData, termino: e.target.value})}
                            className="w-full bg-transparent text-[10px] font-bold outline-none text-ink/70 pb-1 border-b border-border/5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta 2: Propietario */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <UserIcon className="w-3.5 h-3.5 text-accent" />
                        <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em]">Propietario (Arrendador)</h4>
                      </div>
                      <div className="bg-white p-6 rounded-[24px] border border-border/10 shadow-sm space-y-4">
                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Nombre Completo del Dueño (separados por coma si son varios)</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Juan Pérez, Constructora Alfa SpA..."
                            value={formData.dueno || ''}
                            onChange={(e) => {
                                console.log('Dueno value:', e.target.value);
                                setFormData({...formData, dueno: e.target.value});
                            }}
                            className="w-full bg-transparent text-xs font-bold outline-none text-ink pb-1.5 border-b border-border/5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">RUT Dueño (separados por coma)</label>
                            <input 
                              type="text" 
                              placeholder="12345678K, 765432101"
                              value={formData.rutDue || ''}
                              onChange={(e) => setFormData({...formData, rutDue: e.target.value})}
                              onKeyPress={(e) => { if (e.key === ',') e.stopPropagation(); }}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink pb-1.5 border-b border-border/10 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Tel. Dueño (separados por coma)</label>
                            <input 
                              type="text" 
                              placeholder="912345678, 987654321"
                              value={formData.telD || ''}
                              onChange={(e) => setFormData({...formData, telD: cleanMultiplePhonesInput(e.target.value)})}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink pb-1.5 border-b border-border/10 focus:border-accent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Correo Electrónico Dueño (separados por coma)</label>
                          <input 
                            type="text" 
                            placeholder="dueno@sociedad.com, repre@sociedad.com"
                            value={formData.mailD || ''}
                            onChange={(e) => setFormData({...formData, mailD: e.target.value})}
                            className={`w-full bg-transparent text-[10px] font-bold outline-none pb-1.5 border-b ${formData.mailD && !validateMultipleEmails(formData.mailD) ? 'border-danger text-danger' : 'border-border/10 text-ink'} focus:border-accent`}
                          />
                          {formData.mailD && !validateMultipleEmails(formData.mailD) && (
                            <p className="text-[8px] text-danger font-bold mt-1 uppercase tracking-wider font-mono">
                              ⚠️ UNO O MÁS CORREOS INVÁLIDOS (deben contener '@' y un dominio completo, ej: 'repre@mail.cl')
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta 3: Inquilino (Ocupante) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em]">Ocupante (Arrendatario)</h4>
                      </div>
                      <div className="bg-white p-6 rounded-[24px] border border-border/10 shadow-sm space-y-4">
                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Nombre Completo del Inquilino (separados por coma si son varios)</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Inmobiliaria Beta SpA, Ana Gómez..."
                            value={formData.arrendatario || ''}
                            onChange={(e) => setFormData({...formData, arrendatario: e.target.value})}
                            className="w-full bg-transparent text-xs font-bold outline-none text-ink pb-1.5 border-b border-border/5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">RUT Arrendatario (separados por coma)</label>
                            <input 
                              type="text" 
                              placeholder="771234567, 12345678K"
                              value={formData.rutArr || ''}
                              onChange={(e) => setFormData({...formData, rutArr: e.target.value})}
                              onKeyPress={(e) => { if (e.key === ',') e.stopPropagation(); }}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink pb-1.5 border-b border-border/10 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Teléfono Arrendatario (separados por coma)</label>
                            <input 
                              type="text" 
                              placeholder="912345678, 987654321"
                              value={formData.telA || ''}
                              onChange={(e) => setFormData({...formData, telA: cleanMultiplePhonesInput(e.target.value)})}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink pb-1.5 border-b border-border/10 focus:border-accent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Correo Electrónico Arrendatario (separados por coma)</label>
                          <input 
                            type="text" 
                            placeholder="arrendatario@ejemplo.com, repre@corporacion.com"
                            value={formData.mailA || ''}
                            onChange={(e) => setFormData({...formData, mailA: e.target.value})}
                            className={`w-full bg-transparent text-[10px] font-bold outline-none pb-1.5 border-b ${formData.mailA && !validateMultipleEmails(formData.mailA) ? 'border-danger text-danger' : 'border-border/10 text-ink'} focus:border-accent`}
                          />
                          {formData.mailA && !validateMultipleEmails(formData.mailA) && (
                            <p className="text-[8px] text-danger font-bold mt-1 uppercase tracking-wider font-mono">
                              ⚠️ UNO O MÁS CORREOS INVÁLIDOS (deben contener '@' y un dominio completo, ej: 'repre@mail.cl')
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta 4: Aval / Fiador */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                        <h4 className="text-[10px] font-black text-ink uppercase tracking-[0.2em]">Aval / Fiador (Opcional)</h4>
                      </div>
                      <div className="bg-white p-6 rounded-[24px] border border-border/10 shadow-sm space-y-4">
                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Nombre del Fiador Solidario</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del fiador solidario..."
                            value={formData.aval || ''}
                            onChange={(e) => setFormData({...formData, aval: e.target.value})}
                            className="w-full bg-transparent text-xs font-bold outline-none text-ink pb-1.5 border-b border-border/5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">RUT Aval (8-9 dígitos)</label>
                            <input 
                              type="text" 
                              placeholder="12345678K"
                              value={formData.rutAval || ''}
                              onChange={(e) => setFormData({...formData, rutAval: e.target.value})}
                              onKeyPress={(e) => { if (e.key === ',') e.stopPropagation(); }}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink pb-1.5 border-b border-border/10 focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Tel. Aval (9 dígitos)</label>
                            <input 
                              type="text" 
                              placeholder="912345678"
                              value={formData.telAval || ''}
                              onChange={(e) => setFormData({...formData, telAval: e.target.value})}
                              onKeyPress={(e) => { if (e.key === ',') e.stopPropagation(); }}
                              className="w-full bg-transparent text-[10px] font-bold outline-none text-ink pb-1.5 border-b border-border/10 focus:border-accent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[7px] font-black text-ink/20 uppercase mb-1.5 block font-mono">Correo Electrónico Aval</label>
                          <textarea 
                            placeholder="aval@ejemplo.com, otro@ejemplo.com"
                            value={formData.mailAval || ''}
                            onChange={(e) => setFormData({...formData, mailAval: e.target.value})}
                            className={`w-full bg-transparent text-[10px] font-bold outline-none pb-1.5 border-b ${formData.mailAval && !validateMultipleEmails(formData.mailAval) ? 'border-danger text-danger' : 'border-border/10 text-ink'} focus:border-accent`}
                            rows={2}
                          />
                          {formData.mailAval && !validateMultipleEmails(formData.mailAval) && (
                            <p className="text-[8px] text-danger font-bold mt-1 uppercase tracking-wider font-mono">
                              ⚠️ CORREO INVÁLIDO (falta '@' o dominio como '.cl' o '.com')
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: Compacto */}
              <div className="px-10 py-6 bg-white border-t border-border/5 flex items-center justify-between">
                <button 
                  onClick={() => setIsAdding(false)} 
                  className="text-[9px] font-black uppercase tracking-[0.3em] text-ink/20 hover:text-danger transition-all"
                >
                  Cancelar registro
                </button>
                <div className="flex gap-4">
                  <button 
                    disabled={loading}
                    onClick={() => {
                        const rutV_due = !formData.rutDue || validateMultipleRuts(formData.rutDue);
                        const rutV_arr = !formData.rutArr || validateMultipleRuts(formData.rutArr);
                        const telV_due = !formData.telD || validateMultiplePhones(formData.telD);
                        const telV_arr = !formData.telA || validateMultiplePhones(formData.telA);
                        const mailV_due = !formData.mailD || validateMultipleEmails(formData.mailD);
                        const mailV_arr = !formData.mailA || validateMultipleEmails(formData.mailA);
 
                        const rutV_aval = !formData.rutAval || validateRut(formData.rutAval);
                        const telV_aval = !formData.telAval || validatePhone(formData.telAval);
                        const mailV_aval = !formData.mailAval || validateMultipleEmails(formData.mailAval);
                        
                        if (!rutV_due) {
                            showToast('El o los RUT del Dueño deben ser válidos (ej: 12345678K, 876543210, separados por coma)', 'error');
                            return;
                        }
                        if (!rutV_arr) {
                            showToast('El o los RUT del Ocupante deben ser válidos (ej: 12345678K, 876543210, separados por coma)', 'error');
                            return;
                        }
                        if (formData.rutAval && !validateMultipleRuts(formData.rutAval)) {
                            showToast('El o los RUT del Aval debe tener entre 8 y 9 caracteres cada uno (solo números y K al final), separados por coma', 'error');
                            return;
                        }
                        if (!telV_due) {
                            showToast('El o los Teléfonos del Dueño deben tener exactamente 9 números cada uno, separados por coma', 'error');
                            return;
                        }
                        if (!telV_arr) {
                            showToast('El o los Teléfonos del Ocupante deben tener exactamente 9 números cada uno, separados por coma', 'error');
                            return;
                        }
                        if (formData.telAval && !validateMultiplePhones(formData.telAval)) {
                            showToast('El o los Teléfonos del Aval deben tener exactamente 9 números cada uno, separados por coma', 'error');
                            return;
                        }
                        if (!mailV_due) {
                            showToast('El o los Correos del Dueño deben tener un formato de email válido, separados por coma', 'error');
                            return;
                        }
                        if (!mailV_arr) {
                            showToast('El o los Correos del Ocupante deben tener un formato de email válido, separados por coma', 'error');
                            return;
                        }
                        if (formData.mailAval && !mailV_aval) {
                            showToast('El Correo del Aval debe tener un formato de email válido, separados por coma', 'error');
                            return;
                        }

                        const dateCheck = validateDates(formData.f_ini || '', formData.termino || '');
                        if (!dateCheck.valid) {
                            showToast(dateCheck.message, 'error');
                            return;
                        }
                        
                        saveProperty();
                    }}
                    className="bg-ink text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 active:scale-95"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {loading ? 'Procesando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <AnimatePresence>
          {showPermissionModal && (
            <div className="fixed inset-0 bg-ink/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="bg-white rounded-[48px] w-full max-w-lg overflow-hidden shadow-2xl"
              >
                <div className="p-12 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mx-auto mb-8 relative border border-border/50">
                    {pendingProvider === 'gmail' ? (
                      <svg viewBox="0 0 24 24" className="w-12 h-12"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-12 h-12"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M13 1h10v10H13z"/><path fill="#05a6f0" d="M1 13h10v10H1z"/><path fill="#ffba08" d="M13 13h10v10H13z"/></svg>
                    )}
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center border-4 border-white">
                      <Lock className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-ink mb-3 tracking-tighter uppercase">Solicitud de Acceso</h3>
                  <p className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] mb-10 leading-relaxed max-w-sm mx-auto">
                    Punto Propiedades requiere los siguientes permisos para automatizar su flujo inmobiliario.
                  </p>

                  <div className="space-y-3 mb-12 text-left bg-gray-50/50 p-6 rounded-[32px] border border-border/50">
                    {[
                      { icon: Mail, label: 'Visualizar su dirección de correo electrónico' },
                      { icon: ShieldCheck, label: 'Leer y extraer datos de comprobantes de pago' },
                      { icon: Send, label: 'Responder automáticamante a solicitudes IA' }
                    ].map((item, i) => (
                      <div key={`permission-item-${i}`} className="flex items-center gap-4 py-1">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-border shadow-sm shrink-0">
                          <item.icon className="w-3 h-3 text-primary" />
                        </div>
                        <p className="text-[10px] font-black text-ink/80 uppercase tracking-tight">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={finalizeConnection}
                      className="w-full bg-primary text-white py-5 rounded-[24px] font-black text-xs tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
                    >
                      CONCEDER PERMISOS Y VINCULAR
                    </button>
                    <button 
                      onClick={() => setShowPermissionModal(false)}
                      className="w-full bg-white text-muted py-5 rounded-[24px] font-bold text-[10px] tracking-widest hover:bg-gray-100 transition-all border border-transparent"
                    >
                      CANCELAR OPERACIÓN
                    </button>
                  </div>

                  <p className="mt-8 text-[9px] font-medium text-muted uppercase tracking-widest opacity-40">
                    Sus datos están protegidos por leyes de privacidad de datos locales.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0, x: '-50%' }} 
            animate={{ y: 0, opacity: 1, x: '-50%' }} 
            exit={{ y: 50, opacity: 0, x: '-50%' }} 
            className={`fixed bottom-12 left-1/2 z-[1100] px-6 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3.5 border-2 max-w-[92vw] w-max select-none text-[10px] sm:text-xs leading-normal font-sans uppercase tracking-[0.15em] ${
              toast.type === 'success' 
                ? 'bg-white border-accent text-accent' 
                : 'bg-white border-danger text-danger'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="flex-1 min-w-0 break-words leading-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[max(40px,2.5rem)] p-12 max-w-sm w-full shadow-2xl border border-gray-100 text-[#1A1A1A]"
            >
              <div className="w-24 h-24 bg-red-50 text-danger rounded-[32px] flex items-center justify-center mb-8 mx-auto">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black mb-3 text-center uppercase tracking-tighter italic">¿Confirmas?</h3>
              <p className="text-muted text-sm mb-12 leading-relaxed text-center font-bold px-4">
                {showConfirmDelete.type === 'property' 
                  ? 'Esta acción eliminará permanentemente esta unidad y todos sus gastos de la nube.' 
                  : showConfirmDelete.type === 'expense'
                  ? 'Este registro será borrado de forma irreversible de tu historial financiero.'
                  : 'ESTA ACCIÓN ELIMINARÁ TODA TU BASE DE DATOS. ES IRREVERSIBLE.'}
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    if (showConfirmDelete.id) {
                      if (showConfirmDelete.type === 'property') {
                        deleteProperty(showConfirmDelete.id);
                      } else if (showConfirmDelete.type === 'expense') {
                        deleteExpense(showConfirmDelete.id, showConfirmDelete.index!);
                      }
                    } else if (showConfirmDelete.type === 'reset') {
                      deleteAllProperties();
                    }
                    setShowConfirmDelete(null);
                  }}
                  className="w-full bg-danger text-white py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-red-700 transition-all shadow-2xl shadow-danger/30 font-sans cursor-pointer active:scale-95 text-center"
                >
                  {showConfirmDelete.type === 'reset' ? 'REINICIAR TODO' : 'ELIMINAR AHORA'}
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(null)}
                  className="w-full bg-gray-50 text-muted py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-gray-100 transition-all font-sans cursor-pointer active:scale-95"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showReportModal && (
          <ReportModal properties={properties} appSettings={appSettings} onClose={() => setShowReportModal(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <div className="fixed inset-0 z-[1200] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center p-8">
            <div className="relative w-32 h-32 mb-8">
              <Loader2 className="w-full h-full text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black italic">{progress}%</span>
              </div>
            </div>
            <p className="text-primary font-black uppercase tracking-wider text-[10px] mb-8 text-center">{loadingStatus}</p>
            
            <div className="w-full max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
