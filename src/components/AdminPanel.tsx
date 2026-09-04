import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, Save, Search, Trash2 } from 'lucide-react';

export const AdminPanel = ({ 
  setImpersonatedUid, 
  currentImpersonatedUid,
  appSettings,
  updateAppSettings,
  properties
}: { 
  setImpersonatedUid: (uid: string | null) => void, 
  currentImpersonatedUid: string | null,
  appSettings: any,
  updateAppSettings: (settings: any) => Promise<void>,
  properties: any[]
}) => {
  const [reportEmail, setReportEmail] = useState(appSettings.reportEmail || '');
  const [smtpHost, setSmtpHost] = useState(appSettings.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(appSettings.smtpPort || '');
  const [smtpUser, setSmtpUser] = useState(appSettings.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(appSettings.smtpPass || '');
  const [users, setUsers] = useState<{uid: string, email: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugSearch, setDebugSearch] = useState('');
  const [debugResults, setDebugResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'properties'));
        const userMap = new Map<string, { email: string, name: string }>();

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          if (data.ownerUid && !userMap.has(data.ownerUid)) {
            userMap.set(data.ownerUid, { email: data.ownerEmail || 'Sin email', name: '' });
          }
        }

        for (const [uid, info] of userMap.entries()) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            info.name = userDoc.data().name || '';
          }
        }
        setUsers(Array.from(userMap.entries()).map(([uid, info]) => ({ uid, ...info })));
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const searchDebug = async () => {
    const querySnapshot = await getDocs(collection(db, 'properties'));
    const results = querySnapshot.docs.filter(doc => (doc.data().direccion || '').toLowerCase().includes(debugSearch.toLowerCase()));
    setDebugResults(results.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  const deleteProperty = async (id: string) => {
    console.log("Delete button clicked for:", id);
    const confirmed = confirm(`¿Estás seguro de eliminar la propiedad con ID: ${id}?`);
    console.log("Confirmed result:", confirmed);
    
    if (confirmed) {
        try {
            console.log("Executing deleteDoc for:", id);
            await deleteDoc(doc(db, 'properties', id));
            console.log("Delete successful for:", id);
            alert("Eliminado exitosamente.");
            searchDebug();
        } catch (e: any) {
            console.error("Delete failed, error object:", e);
            alert("Error al eliminar (código: " + e.code + "): " + e.message);
        }
    }
  }

  const [isLinking, setIsLinking] = useState(false);

  const vincularPropiedadesA = async (targetUid: string, targetEmail: string, currentProperties: any[]) => {
    if (!targetUid || !targetEmail) {
      alert("Por favor, guarda el correo electrónico primero.");
      return;
    }
    const cleanEmail = targetEmail.trim().toLowerCase();
    const count = currentProperties.length;

    const confirmed = confirm(`¿Estás seguro de asignar las ${count} propiedades que ves en pantalla al usuario ${cleanEmail} (UID: ${targetUid})?`);
    if (!confirmed) return;

    try {
      setIsLinking(true);
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const prop of currentProperties) {
        if (prop.id) {
          const docRef = doc(db, 'properties', prop.id);
          batch.update(docRef, { 
            ownerUid: targetUid,
            ownerEmail: cleanEmail
          });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        alert(`¡Traspaso exitoso! Se asignaron las ${updatedCount} propiedades a la cuenta ${cleanEmail}.`);
      } else {
        alert("No hay propiedades para transferir.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error al traspasar propiedades: ${e.message}`);
    } finally {
      setIsLinking(false);
    }
  };

  const saveName = async (uid: string, name: string, email: string) => {
    try {
      await setDoc(doc(db, 'users', uid), { name, email }, { merge: true });
      setUsers(users.map(u => u.uid === uid ? { ...u, name } : u));
    } catch (err) {
      console.error("Error saving name:", err);
    }
  };

  const testMonthlyExpiryCron = async () => {
    try {
      const target = reportEmail || smtpUser;
      const url = `/api/cron/monthly-expiry?action=monthly-expiry${target ? `&email=${encodeURIComponent(target)}` : ''}`;
      const response = await fetch(url);
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        alert(`Respuesta del servidor (${response.status}): ${text.replace(/<[^>]*>/g, '').substring(0, 120)}...`);
        return;
      }
      if (response.ok && data.success) {
        alert(`¡Éxito! ${data.message || 'Reporte de vencimientos procesado.'}`);
      } else {
        alert(`Respuesta del servidor: ${data.message || data.error || 'No se pudo enviar la alerta de vencimientos.'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error al ejecutar cron de vencimientos: ${err.message}`);
    }
  };

  const sendTestEmail = async () => {
    if (!reportEmail) {
      alert('Por favor, primero guarda un correo de recepción.');
      return;
    }
    try {
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reportEmail,
          subject: 'Reporte de Prueba - App Arriendos',
          body: 'Este es un reporte de prueba generado desde el panel de administración para verificar la configuración SMTP.',
          smtpConfig: {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass
          }
        })
      });
      if (response.ok) {
        alert('Reporte de prueba enviado exitosamente.');
      } else {
        alert('Error al enviar el reporte de prueba.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al intentar enviar el correo.');
    }
  };

  const saveEmailSettings = async () => {
    await updateAppSettings({ 
      ...appSettings, 
      reportEmail,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass
    });
    alert('Configuración guardada.');
  };

  if (loading) return <div className="p-4 flex items-center justify-center"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-6">
      {/* Buscador de depuración */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-red-200 shadow-sm">
        <h3 className="text-xs sm:text-sm font-bold text-red-600 mb-3">Depuración de Propiedades (Buscar Propiedad Perdida)</h3>
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
          <input
            type="text"
            value={debugSearch}
            onChange={(e) => setDebugSearch(e.target.value)}
            className="w-full sm:flex-1 bg-gray-50 border border-border rounded-xl px-4 py-2.5 text-xs text-ink outline-none"
            placeholder="Dirección..."
          />
          <button 
            onClick={searchDebug} 
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shrink-0 shadow-sm active:scale-95 transition-all"
          >
            <Search className="w-4 h-4" /> Buscar en BD
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {debugResults.map(res => (
            <div key={res.id} className="p-3 sm:p-4 border border-border rounded-xl text-xs space-y-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-gray-50/40">
                <div className="space-y-0.5">
                    <div className="font-bold text-ink">{res.direccion}</div>
                    <div className="text-[10px] text-muted">ID: {res.id}</div>
                    <div className="text-[10px] text-muted">Arrendatario: {res.arrendatario}</div>
                    <div className="text-[10px] text-muted">Owner: {res.ownerUid}</div>
                </div>
                <button onClick={() => deleteProperty(res.id)} className="self-end sm:self-auto bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
          ))}
        </div>
      </div>

      {/* Administración de Usuarios */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-xs sm:text-sm font-bold text-ink mb-4">Administración General de Usuarios</h3>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.uid} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 sm:p-4 border border-border/80 rounded-xl bg-gray-50/50">
              <div className="flex-1 min-w-0 space-y-2">
                {user.email === 'Sin email' || !user.email ? (
                  <div>
                    <label className="block text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Asociar Correo Electrónico</label>
                    <input 
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs text-ink outline-none"
                      value={user.email === 'Sin email' ? '' : user.email}
                      onChange={(e) => setUsers(users.map(u => u.uid === user.uid ? { ...u, email: e.target.value } : u))}
                    />
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-muted uppercase truncate">{user.email}</p>
                )}
                
                <input 
                  type="text"
                  placeholder="Nombre de usuario"
                  className="w-full bg-white border border-border/60 rounded-lg px-3 py-2 text-xs text-ink outline-none"
                  value={user.name}
                  onChange={(e) => setUsers(users.map(u => u.uid === user.uid ? { ...u, name: e.target.value } : u))}
                />
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-end shrink-0">
                <button 
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg border border-primary/20 shrink-0"
                  onClick={() => saveName(user.uid, user.name, user.email)}
                  title="Guardar cambios"
                >
                  <Save className="w-4 h-4" />
                </button>
                
                <button
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-lg text-[10px] font-bold transition-all shrink-0"
                  onClick={() => vincularPropiedadesA(user.uid, user.email, properties)}
                  title={`Asignar las ${properties.length} propiedades en pantalla a este usuario`}
                >
                  Traspasar ({properties.length})
                </button>

                <button 
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all shrink-0 ${currentImpersonatedUid === user.uid ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-ink hover:bg-gray-300'}`}
                  onClick={() => setImpersonatedUid(user.uid === currentImpersonatedUid ? null : user.uid)}
                >
                  {currentImpersonatedUid === user.uid ? 'Implementado' : 'Implementar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuración de SMTP e Informes */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-sm space-y-4">
        <h3 className="text-xs sm:text-sm font-bold text-ink">Configuración de Informes por Correo</h3>
        <div>
          <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-1.5">Correo para recepción de reportes</label>
          <input
            type="email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            className="w-full bg-gray-50 border border-border rounded-xl px-4 py-2.5 text-xs text-ink outline-none"
            placeholder="ejemplo@correo.com"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-1.5">Configuración SMTP</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-2.5 text-xs text-ink outline-none" placeholder="SMTP Host (ej: smtp.gmail.com)" />
            <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-2.5 text-xs text-ink outline-none" placeholder="SMTP Port (ej: 587)" />
            <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-2.5 text-xs text-ink outline-none" placeholder="SMTP Usuario" />
            <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-2.5 text-xs text-ink outline-none" placeholder="SMTP Contraseña" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-2.5 pt-2">
          <button
            onClick={testMonthlyExpiryCron}
            className="w-full sm:w-auto justify-center bg-amber-50 text-amber-800 border border-amber-300 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-amber-100 transition-all flex items-center gap-2"
            title="Probar el cron de alerta de contratos vencidos o por vencer"
          >
             Probar Alerta Vencimientos
          </button>
          <button
            onClick={sendTestEmail}
            className="w-full sm:w-auto justify-center bg-white text-primary border border-primary px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-gray-50 transition-all flex items-center gap-2"
          >
             Probar Correo
          </button>
          <button
            onClick={saveEmailSettings}
            className="w-full sm:w-auto justify-center bg-primary text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Guardar Configuración
          </button>
        </div>
        <p className="text-[10px] text-muted font-medium italic">Nota: Asegúrate de tener un proveedor de correo (SMTP) configurado en el servidor para que los mensajes sean enviados.</p>
      </div>
    </div>
  );
};
