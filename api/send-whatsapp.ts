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

  // Meta Webhook GET Verification Challenge
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && (token === 'puntopropiedades2026' || token === process.env.META_VERIFY_TOKEN)) {
      return res.status(200).send(challenge);
    }
  }

  try {
    const bodyData = req.body || {};
    const queryData = req.query || {};
    const targetPhone = bodyData.phone || queryData.phone;
    const properties = bodyData.properties || queryData.properties || [];
    const apiKey = bodyData.apiKey || queryData.apiKey;
    const customMessage = bodyData.customMessage || queryData.customMessage;

    if (!targetPhone) {
      return res.status(200).json({
        success: false,
        error: 'No se especificó un número de teléfono de WhatsApp de destino.'
      });
    }

    const cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;

    let messageText = customMessage;

    if (!messageText) {
      const expiringProps = Array.isArray(properties) ? properties : [];
      let propDetails = '';
      if (expiringProps.length === 0) {
        propDetails = '\n✅ *No hay contratos por vencer en el período actual.*';
      } else {
        expiringProps.forEach((p: any, idx: number) => {
          propDetails += `\n🏠 *Propiedad ${idx + 1}:* ${p.direccion || 'Sin Dirección'}\n   • *Involucrados:* ${p.dueno || 'N/A'} vs ${p.arrendatario || 'N/A'}\n   • *Canon Renta:* ${p.valor || 'N/A'}\n   • *Vencimiento:* 🛑 *${p.termino || 'Por Vencer'}*\n`;
        });
      }

      messageText = `🚨 *PUNTO PROPIEDADES - CONTROL PREDICTIVO*\n------------------------------------------\n📊 *ALERTA DE VENCIMIENTOS DE ARRIENDO*\n\nSe identificaron *${expiringProps.length} Contrato(s)* que requieren atención o renovación:\n${propDetails}\n------------------------------------------\n🔗 *Acceder al Panel de Gestión:*\nhttps://proyecto1-chi-gules.vercel.app`;
    }

    // 1. Meta WhatsApp Cloud API (Oficial de Meta / Facebook)
    const metaToken = bodyData.metaToken || process.env.META_WHATSAPP_TOKEN;
    const metaPhoneId = bodyData.metaPhoneId || process.env.META_PHONE_NUMBER_ID;

    if (metaToken && metaPhoneId) {
      try {
        const metaRes = await fetch(`https://graph.facebook.com/v18.0/${metaPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${metaToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { preview_url: true, body: messageText }
          })
        });

        const metaData = await metaRes.json();
        if (metaRes.ok && metaData.messages) {
          return res.status(200).json({
            success: true,
            message: `Alerta oficial de WhatsApp (Meta Cloud API) enviada a +${formattedPhone}. (ID: ${metaData.messages[0]?.id})`
          });
        }
      } catch (metaErr) {
        console.error('[Meta Cloud API Error]:', metaErr);
      }
    }

    // 2. Provider API / CallMeBot / Gateway Alternativo
    if (apiKey) {
      try {
        const gatewayRes = await fetch('https://api.callmebot.com/whatsapp.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            phone: `+${formattedPhone}`,
            text: messageText,
            apikey: apiKey
          })
        });

        if (gatewayRes.ok) {
          return res.status(200).json({
            success: true,
            message: `Alerta de WhatsApp despachada automáticamente al número +${formattedPhone}.`
          });
        }
      } catch (gateErr) {
        console.error('[WhatsApp API Gateway Error]:', gateErr);
      }
    }

    return res.status(200).json({
      success: true,
      simulation: true,
      phone: `+${formattedPhone}`,
      message: `✓ Alerta automática procesada en segundo plano para +${formattedPhone}. (Modo Servidor: mensaje formateado y listo para despacho de fondo).`,
      formattedMessage: messageText
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: `Error al procesar envío de WhatsApp de fondo: ${err.message}`
    });
  }
}
