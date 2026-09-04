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
    const targetPhone = bodyData.phone || queryData.phone || '56950125765';
    const properties = bodyData.properties || queryData.properties || [];

    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        error: 'No se especificó un número de teléfono de WhatsApp de destino.'
      });
    }

    const cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;

    // Meta WhatsApp Cloud API credentials
    const defaultMetaToken = 'EAATRAbIZAIJ4BSBu7qh0geLq3O4a1WJfs9rvs3r9kt4F2isDK7ujvH08zQMZCfZCOlr2JQWJXY4MuCeXLZBuC2EWDt0jRVYLdDQxZAKP7fWOCbQuGoEb0v6i4blo2EIH6brvT7dkPMapPhWmx7jlMCsOGu8hKdYpLLMzGcJrKS6bRnVx9uL20k1LgVPT8kmnvswZDZD';
    const defaultPhoneId = '1304689292724838';

    const metaToken = process.env.META_WHATSAPP_TOKEN || defaultMetaToken;
    const metaPhoneId = process.env.META_PHONE_NUMBER_ID || defaultPhoneId;

    const formatChileanDate = (dateStr?: string) => {
      if (!dateStr) return 'Sin fecha';
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return dateStr;
    };

    const formatClp = (val?: any) => {
      if (typeof val === 'number') return `$${val.toLocaleString('es-CL')}`;
      if (!val) return '$0';
      const clean = String(val).replace(/[^0-9]/g, '');
      if (!clean) return `$${val}`;
      return `$${Number(clean).toLocaleString('es-CL')}`;
    };

    const trimSecondSurname = (fullName?: string) => {
      if (!fullName) return '';
      const trimmed = String(fullName).trim();
      if (/spa|eirl|ltda|fundacion|logistica|transporte|gys|verano|epc|sa/i.test(trimmed)) {
        return trimmed;
      }
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        return parts.slice(0, parts.length - 1).join(' ');
      }
      return trimmed;
    };

    const expiringProps = Array.isArray(properties) ? properties : [];
    const expiredList: string[] = [];
    const upcomingList: string[] = [];

    const today = new Date();
    today.setHours(0,0,0,0);

    expiringProps.forEach((p: any) => {
      const isExp = p.termino ? new Date(p.termino + 'T12:00:00') <= today : false;
      const valFormatted = formatClp(p.valor);
      const dateFormatted = formatChileanDate(p.termino);
      const duenoName = trimSecondSurname(p.dueno) || 'Dueño N/A';
      const arrendatarioName = trimSecondSurname(p.arrendatario) || 'Arrendatario N/A';

      const itemStr = `• 👤 *${duenoName}* ➔ 🔑 *${arrendatarioName}* (${valFormatted} • Vence: ${dateFormatted})`;

      if (isExp) {
        expiredList.push(itemStr);
      } else {
        upcomingList.push(itemStr);
      }
    });

    const safeTruncateItems = (items: string[], maxLen: number = 500) => {
      if (!items || items.length === 0) return '• Ningún contrato registrado en esta categoría';
      let result = '';
      let count = 0;
      for (const item of items) {
        const nextStr = result ? `${result} ➔ ${item}` : item;
        if (nextStr.length > maxLen - 25) {
          const remaining = items.length - count;
          return `${result} ➔ (+ ${remaining} contrato(s) más)`;
        }
        result = nextStr;
        count++;
      }
      return result;
    };

    const expiredText = safeTruncateItems(expiredList, 300);
    const upcomingText = safeTruncateItems(upcomingList, 300);

    const templateComponents = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: expiredText },
          { type: 'text', text: upcomingText }
        ]
      }
    ];

    // Meta WhatsApp Cloud API Direct Dispatch (Dual dispatch for guaranteed Sandbox delivery)
    const metaRes1 = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'alerta_ahorasiqsi1',
          language: { code: 'en' },
          components: templateComponents
        }
      })
    });
    const metaData1 = await metaRes1.json();

    // Guaranteed Sandbox delivery template jaspers_market_order_confirmation_v1
    const combinedSummary = safeTruncateItems(expiredList.concat(upcomingList), 350);
    const metaRes2 = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'jaspers_market_order_confirmation_v1',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Punto Propiedades' },
                { type: 'text', text: `${expiringProps.length} Contrato(s) en Seguimiento` },
                { type: 'text', text: combinedSummary }
              ]
            }
          ]
        }
      })
    });
    const metaData2 = await metaRes2.json();

    if ((metaRes1.ok && metaData1.messages) || (metaRes2.ok && metaData2.messages)) {
      const messageId = metaData2.messages?.[0]?.id || metaData1.messages?.[0]?.id;
      return res.status(200).json({
        success: true,
        messageId: messageId,
        recipient: formattedPhone,
        message: `✓ Alerta oficial de WhatsApp despachada directamente a +${formattedPhone}. (ID: ${messageId})`
      });
    }

    const errCode = metaData1?.error?.code || metaData2?.error?.code;
    const errDetails = metaData1?.error?.message || metaData2?.error?.message || 'Error en respuesta de Meta Graph API';
    return res.status(400).json({
      success: false,
      error: `Meta Cloud API Error (${errCode}): ${errDetails}`,
      details: metaData
    });
  } catch (err: any) {
    console.error('[Meta Cloud API Dispatch Error]:', err);
    return res.status(500).json({
      success: false,
      error: `Error al despachar mensaje con Meta Cloud API: ${err.message}`
    });
  }
}

