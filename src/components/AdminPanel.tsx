import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, Save, Search, Trash2 } from 'lucide-react';

export const AdminPanel = ({ 
  setImpersonatedUid, 
  currentImpersonatedUid,
  appSettings,
  updateAppSettings
}: { 
  setImpersonatedUid: (uid: string | null) => void, 
  currentImpersonatedUid: string | null,
  appSettings: any,
  updateAppSettings: (settings: any) => Promise<void>
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

  const [targetEmailToLink, setTargetEmailToLink] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const vincularInmueblesMasivo = async () => {
    if (!targetEmailToLink.trim()) {
      alert("Por favor, ingresa el correo de destino.");
      return;
    }
    const cleanEmail = targetEmailToLink.trim().toLowerCase();
    
    // 1. Encontrar el usuario en la lista local para obtener su UID
    const foundUser = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (!foundUser) {
      alert(`No se encontró ningún usuario con el correo "${cleanEmail}" registrado en el sistema. Asegúrate de que el usuario haya iniciado sesión al menos una vez.`);
      return;
    }

    const confirmed = confirm(`¿Estás seguro de que quieres asignar e importar TODAS las propiedades huérfanas o sin dueño al usuario ${foundUser.email} (UID: ${foundUser.uid})?`);
    if (!confirmed) return;

    try {
      setIsLinking(true);
      const querySnapshot = await getDocs(collection(db, 'properties'));
      let linkedCount = 0;
      
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        // Si no tiene ownerUid (huérfana)
        if (!data.ownerUid) {
          const docRef = doc(db, 'properties', docSnapshot.id);
          batch.update(docRef, { 
            ownerUid: foundUser.uid,
            ownerEmail: foundUser.email
          });
          linkedCount++;
        }
      }

      if (linkedCount > 0) {
        await batch.commit();
        alert(`¡Asociación Exitosa! Se vincularon ${linkedCount} propiedades al correo ${foundUser.email}.`);
      } else {
        alert("No se encontraron propiedades sin dueño en la base de datos.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error al vincular propiedades: ${e.message}`);
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
      {/* Nuevo buscador de depuración */}
      <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
        <h3 className="text-sm font-bold text-red-600 mb-4">Depuración de Propiedades (Buscar Propiedad Perdida)</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={debugSearch}
            onChange={(e) => setDebugSearch(e.target.value)}
            className="flex-1 bg-gray-50 border border-border rounded-xl px-4 py-3"
            placeholder="Dirección..."
          />
          <button onClick={searchDebug} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2">
            <Search className="w-4 h-4" /> Buscar en BD
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {debugResults.map(res => (
            <div key={res.id} className="p-4 border border-border rounded-lg text-xs space-y-1 flex justify-between items-center">
                <div>
                    <div className="font-bold">{res.direccion}</div>
                    <div>ID: {res.id}</div>
                    <div>Arrendatario: {res.arrendatario}</div>
                    <div>Owner: {res.ownerUid}</div>
                </div>
                <button onClick={() => deleteProperty(res.id)} className="bg-red-100 text-red-600 p-2 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50/10 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">⚠️ Traspaso y Vinculación Masiva de Propiedades</h3>
        <p className="text-[10.5px] text-muted font-medium leading-relaxed">
          Usa esta herramienta para asociar de inmediato todas las propiedades del historial previo (que no tienen dueño asignado) al correo de un usuario específico.
        </p>
        <div className="flex gap-4">
          <input
            type="email"
            value={targetEmailToLink}
            onChange={(e) => setTargetEmailToLink(e.target.value)}
            className="flex-1 bg-white border border-border rounded-xl px-4 py-3 text-xs"
            placeholder="Ingresa el correo del corredor/usuario (ej: jmcontacto.propiedades@gmail.com)"
          />
          <button 
            onClick={vincularInmueblesMasivo} 
            disabled={isLinking}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-50"
          >
            {isLinking ? "Vinculando..." : "Asociar Propiedades"}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-sm font-bold text-ink mb-4">Administración General de Usuarios</h3>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.uid} className="flex items-center gap-4 p-4 border border-border rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-muted uppercase">{user.email}</p>
                <input 
                  type="text"
                  placeholder="Nombre de usuario"
                  className="w-full bg-gray-50 border border-border/50 rounded-lg p-2 text-xs text-ink outline-none mt-1"
                  value={user.name}
                  onChange={(e) => setUsers(users.map(u => u.uid === user.uid ? { ...u, name: e.target.value } : u))}
                />
              </div>
              <button 
                className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                onClick={() => saveName(user.uid, user.name, user.email)}
              >
                <Save className="w-4 h-4" />
              </button>
              <button 
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${currentImpersonatedUid === user.uid ? 'bg-primary text-white' : 'bg-gray-100'}`}
                onClick={() => setImpersonatedUid(user.uid === currentImpersonatedUid ? null : user.uid)}
              >
                {currentImpersonatedUid === user.uid ? 'Implementado' : 'Implementar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <h3 className="text-sm font-bold text-ink mb-4">Configuración de Informes por Correo</h3>
        <label className="block text-xs font-black text-muted uppercase tracking-widest mb-2">Correo para recepción de reportes</label>
        <div className="flex gap-4 mb-4">
          <input
            type="email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            className="flex-1 bg-gray-50 border border-border rounded-xl px-4 py-3"
            placeholder="ejemplo@correo.com"
          />
        </div>
        <label className="block text-xs font-black text-muted uppercase tracking-widest mb-2">Configuración SMTP</label>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-3" placeholder="SMTP Host (ej: smtp.gmail.com)" />
          <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-3" placeholder="SMTP Port (ej: 587)" />
          <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-3" placeholder="SMTP Usuario" />
          <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="bg-gray-50 border border-border rounded-xl px-4 py-3" placeholder="SMTP Contraseña" />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={sendTestEmail}
            className="bg-white text-primary border border-primary px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-gray-50 transition-all flex items-center gap-2"
          >
             Probar Correo
          </button>
          <button
            onClick={saveEmailSettings}
            className="bg-primary text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar Configuración
          </button>
        </div>
        <p className="text-[10px] text-muted font-medium mt-3 italic">Nota: Asegúrate de tener un proveedor de correo (SMTP) configurado en el servidor para que los mensajes sean enviados.</p>
      </div>
    </div>
  );
};
