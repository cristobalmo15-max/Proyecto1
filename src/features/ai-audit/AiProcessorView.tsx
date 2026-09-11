import React from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  Plus,
  Zap,
  FileSearch,
  RefreshCw,
  Download,
  CopyX,
  Trash2,
  FileText,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface AiProcessorViewProps {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBulkFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bulkData: any[];
  bulkFiles: File[];
  hasDuplicates: boolean;
  deleteDuplicates: () => void;
  clearBulk: () => void;
  setPreviewData: (data: any) => void;
  bulkSync: () => Promise<void>;
  loading: boolean;
  onExport?: () => void;
}

export const AiProcessorView: React.FC<AiProcessorViewProps> = ({
  handleFileChange,
  handleBulkFileChange,
  bulkData,
  bulkFiles,
  hasDuplicates,
  deleteDuplicates,
  clearBulk,
  setPreviewData,
  bulkSync,
  loading,
  onExport
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto py-6 px-6 lg:px-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent">Cognitive Processing</h4>
          <p className="text-3xl lg:text-4xl font-bold text-ink uppercase tracking-tight">
            Inteligencia <span className="text-accent underline decoration-4 underline-offset-8">Artificial</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={bulkSync}
            disabled={loading || bulkData.length === 0}
            className={`h-12 px-6 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              loading || bulkData.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700 shadow-md'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Todo
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="h-12 px-6 bg-white border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-muted hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Carga */}
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

        {/* Columna Derecha: Queue */}
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
                      onClick={clearBulk}
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
                    className={`p-6 rounded-2xl border transition-all ${
                      d.isDuplicate ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-border hover:border-accent hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        d.isDuplicate ? 'bg-gray-200 text-gray-400' : 'bg-accent/10 text-accent'
                      }`}>
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
                        <p className="text-xs text-muted truncate">
                          {d.a_nom ? `Inquilino: ${d.a_nom}` : 'Sin datos de inquilino'} • Canon: ${Number(d.can || 0).toLocaleString('es-CL')}
                        </p>
                      </div>
                      <button
                        onClick={() => setPreviewData(d)}
                        className="p-3 hover:bg-gray-100 rounded-xl transition-all text-muted hover:text-ink shrink-0"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300">
                  <FileSearch className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Cola de procesamiento vacía</p>
                  <p className="text-xs text-muted mt-1 max-w-xs">
                    Sube contratos en formato PDF utilizando el panel izquierdo para iniciar el análisis automático.
                  </p>
                </div>
              </div>
            )}
          </div>

          {bulkData.length > 0 && (
            <div className="p-8 bg-gray-50/50 border-t border-border">
              <button
                onClick={bulkSync}
                disabled={loading}
                className="group relative w-full h-[80px] bg-ink text-white rounded-[28px] font-black uppercase text-xs tracking-[0.3em] hover:bg-accent transition-all shadow-xl active:scale-95 flex items-center justify-center gap-6 overflow-hidden"
              >
                <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                <div className="relative z-10 flex items-center gap-6">
                  {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                  <span>{loading ? 'Ejecutando Sincronización...' : 'Finalizar Lote Operativo'}</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
