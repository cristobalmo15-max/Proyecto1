import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Smartphone, AlertTriangle, Calendar, MessageSquare, ExternalLink, X, CheckCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, setDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';

export const PUBLIC_VAPID_KEY = 'BHSb32EA6Iiy2u6UM1rgCv8WiuIcaAudv6fPXAzx3G-gVJ0ZKRlM_ImuWZlEzmqVFKDRRIIQr043O54qwHua9gY';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  body: string;
  type: 'expiry' | 'meeting' | 'system' | 'whatsapp';
  targetUrl?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  user: any;
  setActiveModule: (mod: any) => void;
  setReportsSubModule?: (sub: any) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  user,
  setActiveModule,
  setReportsSubModule,
  showToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'expiry' | 'meeting'>('all');
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check current notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission as any);
    }
  }, []);

  // Listen for real-time notifications in Firestore (limit 25 for cost optimization)
  useEffect(() => {
    if (!user || !user.uid) return;

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', 'in', [user.uid, 'all_users']),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
      });
      setNotifications(items);
    }, (err) => {
      console.warn('[NotificationCenter Snapshot Warning]:', err.message);
      // Fallback query without compound index if index is building
      const simpleQuery = query(collection(db, 'notifications'), limit(25));
      onSnapshot(simpleQuery, (snap) => {
        const fallbackItems: AppNotification[] = [];
        snap.forEach((d) => fallbackItems.push({ id: d.id, ...d.data() } as AppNotification));
        setNotifications(fallbackItems);
      });
    });

    return () => unsubscribe();
  }, [user]);

  // Register Web Push subscription to subcollection users/{uid}/pushSubscriptions
  const handleActivatePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('Tu navegador no soporta Notificaciones Push Nativas.', 'error');
      return;
    }

    try {
      setIsSubscribing(true);
      const permission = await Notification.requestPermission();
      setPushStatus(permission as any);

      if (permission !== 'granted') {
        showToast('Permiso de notificaciones denegado en tu navegador.', 'error');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });
      }

      const subJson = subscription.toJSON();
      const subHash = btoa(subJson.endpoint || '').slice(-24).replace(/[^a-zA-Z0-9]/g, '');

      // Store in subcollection users/{uid}/pushSubscriptions/{subHash}
      const subDocRef = doc(db, 'users', user.uid, 'pushSubscriptions', subHash || 'default');
      await setDoc(subDocRef, {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast('¡Notificaciones Push activadas con éxito en este celular/dispositivo!', 'success');
    } catch (err: any) {
      console.error('[WebPush Subscribe Error]:', err);
      showToast(`Error al activar notificaciones Push: ${err.message}`, 'error');
    } finally {
      setIsSubscribing(false);
    }
  };

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      showToast('Todas las notificaciones fueron marcadas como leídas.', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.targetUrl) {
      if (notif.targetUrl.includes('reports') || notif.targetUrl.includes('expiries')) {
        setActiveModule('reports');
        if (setReportsSubModule) setReportsSubModule('expiries');
      } else if (notif.targetUrl.includes('meetings')) {
        setActiveModule('meetings');
      } else if (notif.targetUrl.includes('properties')) {
        setActiveModule('properties');
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'expiry') return n.type === 'expiry';
    if (filter === 'meeting') return n.type === 'meeting';
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-muted hover:text-ink hover:bg-slate-100 rounded-xl transition-all active:scale-95 border border-border/50"
        title="Centro de Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-ink uppercase tracking-tight">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {unreadCount} sin leer
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 text-muted hover:text-primary hover:bg-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-muted hover:text-ink rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Web Push Banner (if not yet granted) */}
          {pushStatus !== 'granted' && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
                <p className="text-[10px] text-amber-800 font-bold leading-tight">
                  Activa notificaciones Push nativas en tu celular.
                </p>
              </div>
              <button
                onClick={handleActivatePush}
                disabled={isSubscribing}
                className="bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0 shadow-xs active:scale-95 transition-all"
              >
                {isSubscribing ? 'Activando...' : 'Activar'}
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex p-1.5 bg-gray-100/60 border-b border-border/60 gap-1 text-[10px] font-bold uppercase tracking-wider">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1 rounded-lg transition-all ${filter === 'all' ? 'bg-white text-ink shadow-xs' : 'text-muted'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('expiry')}
              className={`flex-1 py-1 rounded-lg transition-all ${filter === 'expiry' ? 'bg-white text-red-600 shadow-xs' : 'text-muted'}`}
            >
              Vencimientos
            </button>
            <button
              onClick={() => setFilter('meeting')}
              className={`flex-1 py-1 rounded-lg transition-all ${filter === 'meeting' ? 'bg-white text-green-600 shadow-xs' : 'text-muted'}`}
            >
              Reuniones
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted space-y-2">
                <Bell className="w-8 h-8 mx-auto opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Sin notificaciones</p>
                <p className="text-[10px] text-muted">Todo se encuentra al día en el sistema.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                    !notif.read ? 'bg-red-50/20' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'expiry' ? (
                      <div className="w-7 h-7 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    ) : notif.type === 'meeting' ? (
                      <div className="w-7 h-7 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex justify-between items-start">
                      <p className={`text-xs uppercase tracking-tight truncate ${!notif.read ? 'font-black text-ink' : 'font-bold text-slate-700'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-red-600 shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted leading-snug line-clamp-2">{notif.body}</p>
                    <p className="text-[9px] text-muted/60 font-mono mt-1">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
