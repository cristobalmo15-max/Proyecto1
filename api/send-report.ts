import nodemailer from 'nodemailer';

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
    const { to, subject, body, html, attachments, smtpConfig } = req.body || {};

    if (!to) {
      return res.status(200).json({ success: false, error: 'No se especificó un correo de destino.' });
    }

    const host = (smtpConfig && smtpConfig.host) || process.env.SMTP_HOST;
    const port = parseInt(String((smtpConfig && smtpConfig.port) || process.env.SMTP_PORT || '587'), 10);
    const user = (smtpConfig && smtpConfig.user) || process.env.SMTP_USER;
    const pass = (smtpConfig && smtpConfig.pass) || process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return res.status(200).json({
        success: true,
        simulation: true,
        message: 'Modo simulación: No se han ingresado credenciales SMTP válidas. Por favor completa el Host, Usuario y Contraseña.'
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: `Punto Propiedades <${user}>`,
        to,
        subject: subject || 'Mensaje de Punto Propiedades',
        text: body || undefined,
        html: html || undefined,
        attachments: attachments || undefined
      });

      return res.status(200).json({
        success: true,
        message: `Correo de prueba enviado con éxito a ${to}. (ID: ${info.messageId})`
      });
    } catch (smtpErr: any) {
      console.error('[SendReport] SMTP Error:', smtpErr);
      let note = smtpErr.message;
      if (note.includes('535 5.7.139') || note.includes('Authentication failed')) {
        note = 'Autenticación rechazada por el servidor SMTP. Verifica tu usuario, contraseña o genera una Contraseña de Aplicación.';
      }
      return res.status(200).json({
        success: false,
        error: `Fallo al conectar con el servidor SMTP: ${note}`
      });
    }
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: `Error procesando la solicitud: ${err.message}`
    });
  }
}
