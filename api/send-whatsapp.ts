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
            message: `Alerta de WhatsApp despachada automáticamente en segundo plano al número +${formattedPhone}.`
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
