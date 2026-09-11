import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileSearch, Eye, X } from 'lucide-react';

interface ContractPreviewModalProps {
  previewData: any;
  setPreviewData: (data: any) => void;
  bulkFiles: File[];
  viewContract: (url: string, name?: string) => void;
  calculateExpiry: (start: string, months?: number) => string;
  isExpired: (date: string) => boolean;
  onSyncProperty: () => Promise<void>;
  loading: boolean;
}

export const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({
  previewData,
  setPreviewData,
  bulkFiles,
  viewContract,
  calculateExpiry,
  isExpired,
  onSyncProperty,
  loading
}) => {
  if (!previewData) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setPreviewData(null)}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
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
                  onChange={(e) => setPreviewData({ ...previewData, dir: e.target.value })}
                  className="w-full bg-transparent font-bold text-sm outline-none text-ink"
                  placeholder="Ingrese dirección..."
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all md:col-span-1">
                <p className="text-[8px] text-muted uppercase font-black mb-1">Canon Mensual (Solo números)</p>
                <input
                  type="number"
                  value={previewData.can || ''}
                  onChange={(e) => setPreviewData({ ...previewData, can: e.target.value })}
                  className="w-full bg-transparent font-black text-sm text-primary outline-none"
                  placeholder="0"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl focus-within:ring-2 ring-primary/20 transition-all md:col-span-1">
                <p className="text-[8px] text-muted uppercase font-black mb-1">Moneda</p>
                <select
                  value={previewData.tipoMonto || 'pesos'}
                  onChange={(e) => setPreviewData({ ...previewData, tipoMonto: e.target.value as 'pesos' | 'uf' })}
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
                  className="w-full bg-transparent font-bold text-sm outline-none text-ink cursor-pointer"
                >
                  <option value={1}>1 mes</option>
                  <option value={3}>3 meses</option>
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
                  onChange={(e) => setPreviewData({ ...previewData, f_ven: e.target.value })}
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
                    onChange={(e) => setPreviewData({ ...previewData, a_nom: e.target.value })}
                    className="w-full bg-transparent font-bold text-[10px] outline-none resize-none break-words min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[7px] text-muted uppercase font-black mb-1">RUT</p>
                    <input
                      type="text"
                      value={previewData.a_rut || ''}
                      onChange={(e) => setPreviewData({ ...previewData, a_rut: e.target.value })}
                      className="w-full bg-transparent font-bold text-[10px] outline-none"
                    />
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[7px] text-muted uppercase font-black mb-1">Teléfono</p>
                    <input
                      type="text"
                      value={previewData.a_tel || ''}
                      onChange={(e) => setPreviewData({ ...previewData, a_tel: e.target.value })}
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
                    onChange={(e) => setPreviewData({ ...previewData, av_nom: e.target.value })}
                    className="w-full bg-transparent font-bold text-[10px] outline-none resize-none break-words min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[7px] text-muted uppercase font-black mb-1">RUT</p>
                    <input
                      type="text"
                      value={previewData.av_rut || ''}
                      onChange={(e) => setPreviewData({ ...previewData, av_rut: e.target.value })}
                      className="w-full bg-transparent font-bold text-[10px] outline-none"
                    />
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[7px] text-muted uppercase font-black mb-1">Teléfono</p>
                    <input
                      type="text"
                      value={previewData.av_tel || ''}
                      onChange={(e) => setPreviewData({ ...previewData, av_tel: e.target.value })}
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
                  onChange={(e) => setPreviewData({ ...previewData, d_nom: e.target.value })}
                  className="w-full bg-transparent font-bold text-[10px] outline-none resize-none break-words min-h-[80px]"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-[7px] text-muted uppercase font-black mb-1">RUT</p>
                <input
                  type="text"
                  value={previewData.d_rut || ''}
                  onChange={(e) => setPreviewData({ ...previewData, d_rut: e.target.value })}
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
            Cancelar
          </button>
          <button
            onClick={onSyncProperty}
            disabled={loading}
            className={`flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-primary/20 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
          >
            {loading ? 'Procesando...' : 'Sincronizar Esta Unidad'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
