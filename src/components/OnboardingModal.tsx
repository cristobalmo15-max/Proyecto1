import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Sparkles,
  Zap,
  Brain,
  Clock,
  CalendarCheck,
  Receipt,
  MessageSquare,
  Rocket,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  HelpCircle,
  FileText,
  PieChart,
  Upload,
  Bell,
  ArrowRight,
  TrendingUp,
  Search,
  Filter,
  Check
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

interface SlideData {
  badge: string;
  title: string;
  subtitle: string;
  pointerText: string;
  renderMockup: () => React.ReactNode;
  features: { icon: React.ReactNode; title: string; desc: string }[];
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  userName
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const slides: SlideData[] = [
    {
      badge: 'Paso 1 · Vista General',
      title: userName ? `¡Bienvenido(a), ${userName}!` : '¡Bienvenido a Punto Propiedades!',
      subtitle: 'Explora tu centro de mando con la información consolidada de todos tus arriendos.',
      pointerText: '📌 Panel principal con métricas en tiempo real',
      features: [
        {
          icon: <PieChart className="w-4 h-4 text-red-600" />,
          title: 'Resumen de Cartera',
          desc: 'Visualiza en segundos el total de propiedades activas y el canon mensual.'
        },
        {
          icon: <Clock className="w-4 h-4 text-red-600" />,
          title: 'Alertas Inmediatas',
          desc: 'Identifica arriendos vigentes y aquellos próximos a vencer.'
        }
      ],
      renderMockup: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/60 shadow-2xl text-white font-sans text-left space-y-3">
          {/* Header Mockup */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center font-black text-xs">P</div>
              <span className="font-black text-xs tracking-wider uppercase text-slate-200">Punto Propiedades</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold">15 Propiedades</div>
              <Bell className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Canon Mensual Total</span>
              <span className="text-lg font-black text-emerald-400">$18.450.000</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Arriendos Vigentes</span>
              <span className="text-lg font-black text-blue-400">14 / 15</span>
            </div>
          </div>
          {/* Quick List Item */}
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-bold truncate text-slate-200">Av. Providencia 1240 #802</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[9px] shrink-0">Al día</span>
          </div>
        </div>
      )
    },
    {
      badge: 'Paso 2 · Procesador IA',
      title: 'Extracción Automática en Segundos',
      subtitle: 'Sube tus contratos PDF y la Inteligencia Artificial se encarga de transcribir todo por ti.',
      pointerText: '⚡ Sube aquí tus PDF para extraer datos sin escribir',
      features: [
        {
          icon: <Brain className="w-4 h-4 text-indigo-600" />,
          title: 'Lectura Cognitiva de Contratos',
          desc: 'Detecta direcciones, montos, RUT del dueño, arrendatario y avales.'
        },
        {
          icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
          title: 'Control Anti-Duplicados',
          desc: 'Analiza automáticamente si el contrato ya existe en tu sistema.'
        }
      ],
      renderMockup: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-indigo-500/30 shadow-2xl text-white font-sans text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <Zap className="w-4 h-4" /> Procesador de Contratos PDF
            </div>
            <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">Modelo IA v15</span>
          </div>
          {/* Dropzone mockup */}
          <div className="border-2 border-dashed border-indigo-500/40 rounded-xl p-4 bg-indigo-950/30 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5 animate-bounce" />
            </div>
            <p className="text-xs font-bold text-slate-200">Arrastra tu Contrato PDF aquí</p>
            <p className="text-[9px] text-slate-400">Extracción instantánea de RUT, Montos, Plazos y PDF</p>
          </div>
          {/* AI Result pill */}
          <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-[10px]">
            <span className="text-emerald-300 font-bold flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400" /> Contrato_Providencia_802.pdf
            </span>
            <span className="text-slate-400 font-mono">100% procesado</span>
          </div>
        </div>
      )
    },
    {
      badge: 'Paso 3 · Semáforo & Alertas',
      title: 'Control de Cartera & Vencimientos',
      subtitle: 'Anticípate al fin de cada contrato con alertas de colores y botón de renovación rápida.',
      pointerText: '🚨 Semáforo rojo/amarillo para renovar a tiempo',
      features: [
        {
          icon: <Clock className="w-4 h-4 text-emerald-600" />,
          title: 'Filtro por Estado',
          desc: 'Clasifica por contratos vigentes, próximos a vencer y vencidos.'
        },
        {
          icon: <CalendarCheck className="w-4 h-4 text-emerald-600" />,
          title: 'Renovación en 1 Clic',
          desc: 'Extiende el período preservando el historial completo de arriendos.'
        }
      ],
      renderMockup: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-700/60 shadow-2xl text-white font-sans text-left space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-black text-xs text-slate-200">Propiedades & Cartera</span>
            <div className="flex gap-1">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded-md">1 Por Vencer</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-md">13 Vigentes</span>
            </div>
          </div>
          {/* Card Warning */}
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs font-black text-red-200 truncate">Las Condes #4500 Dpto 1201</p>
              <p className="text-[9px] font-medium text-red-300">Vence en 15 días · $750.000 / mes</p>
            </div>
            <button className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-bold shrink-0 uppercase tracking-wider shadow-sm">
              Renovar
            </button>
          </div>
          {/* Card Normal */}
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-between text-xs opacity-75">
            <span className="font-bold text-slate-300 truncate">Ñuñoa #890 Dpto 304</span>
            <span className="text-emerald-400 text-[9px] font-bold">Vigente (10 meses)</span>
          </div>
        </div>
      )
    },
    {
      badge: 'Paso 4 · Gastos & Canales',
      title: 'Rendición de Gastos & WhatsApp',
      subtitle: 'Asocia boletas de reparación y envía reportes automáticos por WhatsApp y Email.',
      pointerText: '📲 Envío directo de avisos por WhatsApp y Notificaciones Push',
      features: [
        {
          icon: <Receipt className="w-4 h-4 text-amber-600" />,
          title: 'Registro de Egreso con Boleta',
          desc: 'Carga comprobantes de mantenimientos para balances exactos.'
        },
        {
          icon: <MessageSquare className="w-4 h-4 text-amber-600" />,
          title: 'Notificaciones Oficiales',
          desc: 'Dispara cobros y avisos de renovación directamente a WhatsApp.'
        }
      ],
      renderMockup: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-amber-500/30 shadow-2xl text-white font-sans text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-black text-xs text-amber-400 flex items-center gap-1.5">
              <Receipt className="w-4 h-4" /> Balances & Notificaciones
            </span>
            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">WhatsApp Conectado</span>
          </div>
          {/* Expense Item */}
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-200">Mantención Calentador</p>
              <p className="text-[9px] text-slate-400">Comprobante PDF adjunto</p>
            </div>
            <span className="text-xs font-black text-amber-400">-$45.000</span>
          </div>
          {/* WhatsApp Notification Banner */}
          <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-200 font-bold text-[10px]">Aviso enviado a +56 9 5012 5765</span>
            </div>
            <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-md font-bold">Entregado</span>
          </div>
        </div>
      )
    },
    {
      badge: 'Paso 5 · ¡Listo para Iniciar!',
      title: 'Empieza a Gestionar tus Propiedades',
      subtitle: 'Todo está configurado y protegido con seguridad bancaria en la nube.',
      pointerText: '🚀 Haz clic en "Comenzar" para entrar a tu panel',
      features: [
        {
          icon: <Zap className="w-4 h-4 text-red-600" />,
          title: 'Prueba el Procesador IA',
          desc: 'Dirígete a "Procesador IA" en la barra lateral para subir tus contratos.'
        },
        {
          icon: <HelpCircle className="w-4 h-4 text-red-600" />,
          title: 'Acceso a la Guía Siempre',
          desc: 'Puedes reabrir esta guía interactiva desde la barra lateral cuando quieras.'
        }
      ],
      renderMockup: () => (
        <div className="w-full bg-slate-900/90 rounded-2xl p-5 border border-red-500/40 shadow-2xl text-white font-sans text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center mx-auto shadow-lg shadow-red-600/30">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-black uppercase text-slate-100">¡Tu Cartera está Segura!</h4>
            <p className="text-xs text-slate-400 font-medium">Cifrado Bancario SSL 256-bit y respaldos automáticos en la nube.</p>
          </div>
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-red-400" /> Sistema 100% Operativo
          </div>
        </div>
      )
    }
  ];

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentSlide, totalSlides, onClose]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextSlide, prevSlide, onClose]);

  if (!isOpen) return null;

  const current = slides[currentSlide];
  const isLast = currentSlide === totalSlides - 1;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white rounded-[32px] border border-border shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="px-6 sm:px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-red-50 border border-red-100 px-3 py-1 rounded-full shadow-xs">
              {current.badge}
            </span>
            <span className="text-[11px] font-bold text-muted">
              Diapositiva {currentSlide + 1} de {totalSlides}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                onClick={onClose}
                className="text-[11px] font-bold text-muted hover:text-ink px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all uppercase tracking-wider cursor-pointer"
              >
                Saltar
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-border/60 flex items-center justify-center text-muted hover:text-ink transition-all shadow-xs cursor-pointer"
              title="Cerrar tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body Grid: 2 Columns on Desktop */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center"
            >
              {/* Left Column: Text & Bullets */}
              <div className="md:col-span-6 space-y-5 text-left">
                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-ink uppercase tracking-tight leading-tight">
                    {current.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted font-medium leading-relaxed">
                    {current.subtitle}
                  </p>
                </div>

                {/* Feature Bullets */}
                <div className="space-y-3 pt-2">
                  {current.features.map((feat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.2 }}
                      className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3 hover:bg-red-50/30 transition-all"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white shadow-xs border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        {feat.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                          {feat.title}
                        </h4>
                        <p className="text-[11px] text-muted font-medium leading-relaxed mt-0.5">
                          {feat.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right Column: Interactive Screen Mockup with Pointer Arrow */}
              <div className="md:col-span-6 flex flex-col items-center justify-center relative">
                
                {/* Floating Pointer Arrow / Callout Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="mb-3 inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-red-500/20 z-10"
                >
                  <span>{current.pointerText}</span>
                  <motion.span
                    animate={{ y: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    ⬇️
                  </motion.span>
                </motion.div>

                {/* App Screen Mockup Container */}
                <div className="w-full relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-indigo-500/20 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
                  <div className="relative">
                    {current.renderMockup()}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Bar: Navigation & Slide Dots ("puntitos") */}
        <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
          {/* Back Button */}
          <div className="w-28 flex justify-start">
            {currentSlide > 0 ? (
              <button
                onClick={prevSlide}
                className="h-10 px-4 rounded-xl border border-border bg-white text-muted hover:text-ink hover:bg-gray-100 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <div className="h-10" />
            )}
          </div>

          {/* Slide Dots ("puntitos estilo PPT") */}
          <div className="flex items-center gap-2">
            {slides.map((_, index) => {
              const isActive = index === currentSlide;
              return (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  title={`Ir a diapositiva ${index + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-none ${
                    isActive
                      ? 'w-7 sm:w-8 h-2.5 bg-primary shadow-xs shadow-primary/30'
                      : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Diapositiva ${index + 1}`}
                />
              );
            })}
          </div>

          {/* Next / Finish Button */}
          <div className="w-28 flex justify-end">
            <button
              onClick={nextSlide}
              className={`h-10 px-5 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                isLast
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-200'
                  : 'bg-ink hover:bg-black'
              }`}
            >
              <span>{isLast ? 'Comenzar' : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
