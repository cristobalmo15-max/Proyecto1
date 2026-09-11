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
  PieChart
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

interface SlideItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface SlideData {
  badge: string;
  title: string;
  subtitle: string;
  heroIcon: React.ReactNode;
  heroGradient: string;
  items: SlideItem[];
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  userName
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const slides: SlideData[] = [
    {
      badge: 'Guía de Inicio Rápido',
      title: userName ? `¡Bienvenido(a), ${userName}!` : '¡Bienvenido a Punto Propiedades!',
      subtitle: 'Tu plataforma de gestión inmobiliaria inteligente diseñada para automatizar el control de contratos, arriendos y rentas.',
      heroIcon: <Building2 className="w-8 h-8 text-white" />,
      heroGradient: 'from-red-600 via-red-500 to-rose-600',
      items: [
        {
          icon: <Sparkles className="w-4 h-4 text-red-600" />,
          title: 'Auditoría en Segundos con IA',
          description: 'Extrae automáticamente datos clave de contratos en formato PDF sin transcripción manual.'
        },
        {
          icon: <Clock className="w-4 h-4 text-red-600" />,
          title: 'Semáforo de Vencimientos',
          description: 'Controla qué arriendos están vigentes, próximos a vencer o vencidos con alertas preventivas.'
        },
        {
          icon: <PieChart className="w-4 h-4 text-red-600" />,
          title: 'Panel Unificado & Finanzas',
          description: 'Monitorea el canon total mensual, registro de gastos operacionales y rendiciones a propietarios.'
        }
      ]
    },
    {
      badge: 'Motor Cognitivo IA',
      title: 'Extracción & Análisis Inteligente',
      subtitle: 'Sube contratos en PDF y deja que la Inteligencia Artificial complete toda la ficha técnica por ti.',
      heroIcon: <Brain className="w-8 h-8 text-white" />,
      heroGradient: 'from-indigo-600 via-indigo-500 to-violet-600',
      items: [
        {
          icon: <Zap className="w-4 h-4 text-indigo-600" />,
          title: 'Extracción Completa de Cláusulas',
          description: 'Identifica automáticamente direcciones, valores de canon, moneda (pesos/UF), fechas, propietarios, arrendatarios y avales.'
        },
        {
          icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
          title: 'Detección Inteligente de Duplicados',
          description: 'Detecta de forma automática contratos repetidos mediante huella digital, RUT y coincidencia de dirección.'
        },
        {
          icon: <CheckCircle2 className="w-4 h-4 text-indigo-600" />,
          title: 'Carga Individual o Masiva',
          description: 'Procesa un contrato a la vez o lotes completos y sincronízalos con tu base de datos en un clic.'
        }
      ]
    },
    {
      badge: 'Gestión Operativa',
      title: 'Control de Cartera & Vencimientos',
      subtitle: 'Mantén el estado de cada propiedad al día con visores rápidos y herramientas de renovación.',
      heroIcon: <CalendarCheck className="w-8 h-8 text-white" />,
      heroGradient: 'from-emerald-600 via-teal-500 to-emerald-700',
      items: [
        {
          icon: <Clock className="w-4 h-4 text-emerald-600" />,
          title: 'Monitoreo de Plazos',
          description: 'Visualiza rápidamente qué contratos requieren renovación para gestionar prórrogas con anticipación.'
        },
        {
          icon: <FileText className="w-4 h-4 text-emerald-600" />,
          title: 'Visor de Contratos Integrado',
          description: 'Inspecciona el archivo PDF firmado original en cualquier momento directamente desde la ficha de la propiedad.'
        },
        {
          icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
          title: 'Renovación Rápida con 1 Clic',
          description: 'Extiende el período del contrato automáticamente preservando el historial de renovaciones.'
        }
      ]
    },
    {
      badge: 'Rendición & Comunicación',
      title: 'Gastos, Balances & Canales Oficiales',
      subtitle: 'Administra los egresos de cada inmueble y conecta las alertas con WhatsApp y Correo.',
      heroIcon: <Receipt className="w-8 h-8 text-white" />,
      heroGradient: 'from-amber-600 via-orange-500 to-amber-700',
      items: [
        {
          icon: <Receipt className="w-4 h-4 text-amber-600" />,
          title: 'Registro de Gastos con Comprobante',
          description: 'Asocia boletas y facturas de reparaciones o cuentas básicas a cada propiedad para balances precisos.'
        },
        {
          icon: <PieChart className="w-4 h-4 text-amber-600" />,
          title: 'Informes Mensuales Exportables',
          description: 'Genera reportes de gestión detallados listos para compartir con propietarios e inversionistas.'
        },
        {
          icon: <MessageSquare className="w-4 h-4 text-amber-600" />,
          title: 'Canal Oficial WhatsApp & Email',
          description: 'Envía notificaciones de cobro y avisos de término de contrato de manera profesional y automatizada.'
        }
      ]
    },
    {
      badge: 'Paso Final',
      title: '¡Todo listo para comenzar!',
      subtitle: 'Empieza a transformar la gestión de tus contratos y propiedades hoy mismo.',
      heroIcon: <Rocket className="w-8 h-8 text-white" />,
      heroGradient: 'from-red-600 via-pink-600 to-red-700',
      items: [
        {
          icon: <Zap className="w-4 h-4 text-red-600" />,
          title: 'Prueba el Procesador IA',
          description: 'Dirígete a la sección "Procesador IA" en el menú para subir tus primeros contratos PDF.'
        },
        {
          icon: <HelpCircle className="w-4 h-4 text-red-600" />,
          title: 'Revisa esta guía cuando quieras',
          description: 'Puedes volver a abrir este tutorial en cualquier momento desde la barra lateral o ajustes.'
        },
        {
          icon: <ShieldCheck className="w-4 h-4 text-red-600" />,
          title: 'Tus datos seguros',
          description: 'Toda tu información está respaldada y encriptada en la nube con acceso restringido a tu cuenta.'
        }
      ]
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

  // Keyboard navigation: ArrowLeft, ArrowRight, Escape
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

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-white rounded-[32px] border border-border shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Top Bar / Progress Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-red-50 border border-red-100 px-3 py-1 rounded-full">
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
              className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-border/60 flex items-center justify-center text-muted hover:text-ink transition-all shadow-sm cursor-pointer"
              title="Cerrar tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Body */}
        <div className="p-6 sm:p-8 min-h-[380px] sm:min-h-[400px] flex flex-col justify-between">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-6"
            >
              {/* Slide Hero Banner */}
              <div className="flex items-start gap-4 sm:gap-5">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${current.heroGradient} flex items-center justify-center shrink-0 shadow-lg shadow-black/10`}>
                  {current.heroIcon}
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-ink uppercase tracking-tight leading-tight">
                    {current.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted font-medium leading-relaxed">
                    {current.subtitle}
                  </p>
                </div>
              </div>

              {/* Feature Highlights / Points */}
              <div className="space-y-3 pt-2">
                {current.items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.2 }}
                    className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/80 hover:bg-gray-100/70 border border-gray-100 flex items-start gap-3.5 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                        {item.title}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-muted font-medium leading-relaxed mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Bar: Navigation & Slide Dots ("puntitos") */}
        <div className="px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
          {/* Back Button */}
          <div className="w-28 flex justify-start">
            {currentSlide > 0 ? (
              <button
                onClick={prevSlide}
                className="h-11 px-4 rounded-xl border border-border bg-white text-muted hover:text-ink hover:bg-gray-100 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <div className="h-11" />
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
                      ? 'w-7 sm:w-8 h-2.5 bg-primary shadow-sm shadow-primary/30'
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
              className={`h-11 px-5 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
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
