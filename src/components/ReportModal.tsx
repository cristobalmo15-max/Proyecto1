
import React, { useState } from 'react';
import { X, Search, FileCheck, Mail, Loader2, Filter } from 'lucide-react';

export function ReportModal({ properties, appSettings, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProp, setSelectedProp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState<string[]>([]);

  const [selectedOwnerEmails, setSelectedOwnerEmails] = useState<string[]>([]);

  const filteredProperties = (properties || []).filter((p: any) =>
    p.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const expenses = selectedProp ? (selectedProp.expenses || []).filter((e: any) => {
    const matchType = filterType.length === 0 || filterType.includes(e.tipo);
    const eMonth = e.date ? new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'Sin fecha';
    const matchMonth = filterMonth.length === 0 || filterMonth.includes(eMonth);
    return matchType && matchMonth;
  }) : [];

  const expenseTypes = Array.from(new Set(selectedProp?.expenses?.map((e: any) => e.tipo) || []));
  const expenseMonths = Array.from(new Set(selectedProp?.expenses?.map((e: any) => e.date ? new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'Sin fecha') || []));

  const toggleFilter = (setFilter: any, filter: string[], value: string) => {
    if (filter.includes(value)) {
        setFilter(filter.filter(f => f !== value));
    } else {
        setFilter([...filter, value]);
    }
  };

  const toggleEmail = (email: string) => {
    if (selectedOwnerEmails.includes(email)) {
        setSelectedOwnerEmails(selectedOwnerEmails.filter(e => e !== email));
    } else {
        setSelectedOwnerEmails([...selectedOwnerEmails, email]);
    }
  };

  const sendReport = async () => {
    if (selectedOwnerEmails.length === 0) { alert('Debes seleccionar al menos un correo de destino'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyName: selectedProp.direccion,
          expenses: expenses,
          recipientEmail: selectedOwnerEmails.join(','),
          smtpConfig: {
              host: appSettings.smtpHost,
              port: appSettings.smtpPort,
              user: appSettings.smtpUser,
              pass: appSettings.smtpPass
          }
        })
      });
      if (response.ok) alert('Reporte enviado con éxito');
      else throw new Error('Error al enviar');
    } catch (e) {
      alert('Hubo un error al enviar el reporte');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Generar Reporte de Gastos</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        {!selectedProp ? (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted" />
              <input 
                type="text" 
                placeholder="Buscar propiedad..." 
                className="w-full pl-10 pr-4 py-2 border rounded-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {filteredProperties.map((p: any) => (
                <button key={p.id} onClick={() => setSelectedProp(p)} className="w-full p-4 border rounded-xl hover:bg-gray-50 text-left">
                  {p.direccion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setSelectedProp(null)} className="text-sm text-accent mb-4">← Volver</button>
            <h3 className="font-bold text-lg mb-2">{selectedProp.direccion}</h3>
            
            <div className="bg-gray-50 p-4 rounded-xl mb-4 space-y-4">
              <div>
                <p className="text-xs font-bold mb-2">Filtrar por tipo de gasto:</p>
                <div className="flex flex-wrap gap-2">
                    {expenseTypes.map((type: any) => (
                        <label key={type} className="text-xs flex items-center gap-1 cursor-pointer hover:bg-gray-200 p-1 rounded border">
                            <input type="checkbox" checked={filterType.includes(type)} onChange={() => toggleFilter(setFilterType, filterType, type)} />
                            {type || 'Sin tipo'}
                        </label>
                    ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold mb-2">Filtrar por mes:</p>
                <div className="flex flex-wrap gap-2">
                    {expenseMonths.map((month: any) => (
                        <label key={month} className="text-xs flex items-center gap-1 cursor-pointer hover:bg-gray-200 p-1 rounded border">
                            <input type="checkbox" checked={filterMonth.includes(month)} onChange={() => toggleFilter(setFilterMonth, filterMonth, month)} />
                            {month}
                        </label>
                    ))}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-bold mb-2">Enviar a (seleccionar destinatarios):</p>
                <div className="grid grid-cols-2 gap-2">
                    {selectedProp.mailD && selectedProp.mailD.trim() !== '' ? (
                        selectedProp.mailD.split(',').map((email: string) => email.trim()).map((email: string) => (
                            <label key={email} className="text-xs flex items-center gap-1 cursor-pointer hover:bg-gray-200 p-1 rounded">
                                <input type="checkbox" checked={selectedOwnerEmails.includes(email)} onChange={() => toggleEmail(email)} />
                                {email}
                            </label>
                        ))
                    ) : (
                        <p className="text-xs text-red-500">No hay correos configurados para esta propiedad</p>
                    )}
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 border-t pt-2">
              {expenses.map((e: any, i: number) => (
                <div key={i} className="flex justify-between border-b py-2 text-sm">
                  <span>{e.tipo || 'Gasto'} ({e.date ? new Date(e.date).toLocaleDateString() : 'Sin fecha'})</span>
                  <span className="font-bold">${e.monto}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={sendReport}
              disabled={loading}
              className="w-full bg-accent text-white py-3 rounded-full font-bold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Mail className="w-5 h-5" /> Enviar Reporte</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
