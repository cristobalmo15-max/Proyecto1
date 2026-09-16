import webpush from 'web-push';

const PUBLIC_VAPID_KEY = process.env.PUBLIC_VAPID_KEY || 'BHSb32EA6Iiy2u6UM1rgCv8WiuIcaAudv6fPXAzx3G-gVJ0ZKRlM_ImuWZlEzmqVFKDRRIIQr043O54qwHua9gY';
const PRIVATE_VAPID_KEY = process.env.PRIVATE_VAPID_KEY || '0krGgf2UQc6_E_4U-wn8CdRur-E2f7fXHEhsEN5yIas';

webpush.setVapidDetails(
  'mailto:notificaciones@puntopropiedades.cl',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { title, body, targetUrl, userId, subscription, type } = req.body || {};

    const payload = JSON.stringify({
      title: title || 'Punto Propiedades',
      body: body || 'Tienes una nueva notificación.',
      targetUrl: targetUrl || '/?module=reports&sub=expiries',
      icon: '/icon-192.png',
      badge: '/badge-72.png'
    });

    let sentCount = 0;
    let expiredCount = 0;

    if (subscription && subscription.endpoint) {
      try {
        await webpush.sendNotification(subscription, payload);
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Notificación Push procesada. (Enviadas: ${sentCount}, Expiradas: ${expiredCount})`,
      sentCount,
      expiredCount
    });
  } catch (err: any) {
    console.error('[Push Notification Error]:', err);
    return res.status(500).json({
      success: false,
      error: `Error al procesar notificación push: ${err.message}`
    });
  }
}
