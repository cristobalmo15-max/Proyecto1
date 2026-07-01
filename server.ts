import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';
import { google } from 'googleapis';
import PDFDocument from 'pdfkit';

// Load Firebase config for server-side
let firebaseConfig: any = {};
let bucket: any = null;

try {
  const firebaseConfigFile = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));
} catch (err) {
  console.warn('[Firebase] Could not load firebase-applet-config.json:', err);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('[Firebase] Admin initialized successfully');
    if (firebaseConfig.storageBucket) {
      bucket = admin.storage().bucket(firebaseConfig.storageBucket);
    }
  } catch (err) {
    console.error('[Firebase] Error initializing Admin SDK:', err);
  }
}

// SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const app = express();
const PORT = 3000;

// Storage setup
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DATA_FILE = path.join(process.cwd(), 'data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ properties: [] }));

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: diskStorage });
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Data helpers
const getData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const saveData = (data: any) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

app.post('/api/create-meeting', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, description, start, end, recipientEmail, smtpConfig } = req.body;

  try {
    const calendarRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: { 
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        description: description,
        start: { dateTime: start },
        end: { dateTime: end },
        conferenceData: {
          createRequest: {
            requestId: Math.random().toString(36).substring(7),
          },
        },
      }),
    });

    if (!calendarRes.ok) {
        const errData = await calendarRes.json();
        console.error('[Calendar] Error creating event:', errData);
        throw new Error(errData.error?.message || 'Failed to create event');
    }

    const event = await calendarRes.json();
    console.log('[Calendar] Event created:', JSON.stringify(event, null, 2));
    
    // Determine meeting link
    const meetLink = event.hangoutLink || (event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri);
    console.log('[Calendar] Determined meetLink:', meetLink);
    
    if (recipientEmail && meetLink) {
        try {
            // Use dynamic SMTP config if available
            let currentTransporter = transporter;
            if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
                currentTransporter = nodemailer.createTransport({
                    host: smtpConfig.host,
                    port: parseInt(smtpConfig.port || '587'),
                    secure: smtpConfig.port === '465',
                    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
                });
            }

            await currentTransporter.sendMail({
              from: (smtpConfig?.user || process.env.SMTP_FROM || process.env.SMTP_USER),
              to: recipientEmail,
              subject: `Reunión Confirmada: ${title}`,
              text: `Se ha agendado una nueva reunión:\n\nAsunto: ${title}\nInicio: ${start}\nFin: ${end}\n\nLink de unión: ${meetLink}\n\nNota: ${description || 'Sin descripción'}`
            });
            console.log(`[Email] Notification sent to ${recipientEmail}`);
        } catch (emailErr) {
            console.error('[Email] Failed to send notification:', emailErr);
        }
    }

    res.json({ ...event, hangoutLink: meetLink });
  } catch (err: any) {
    console.error('[Calendar] API Error:', err);
    res.status(500).json({ error: 'Error creating meeting', details: err.message });
  }
});

// Visor de PDF personalizado con marca Punto Propiedades
app.get('/api/punto-propiedades/visor-pdf/:name', async (req, res) => {
  const fileUrl = req.query.url as string;
  if (!fileUrl) return res.status(400).send('URL de contrato no proporcionada');
  
  // Restore original behavior: redirect to the PDF.
  res.redirect(fileUrl);
});

app.post('/api/generate-report', async (req, res) => {
  const { propertyName, expenses, recipientEmail, smtpConfig } = req.body;

  const doc = new PDFDocument({ margin: 50 });
  const buffers: any[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfData = Buffer.concat(buffers);
    
    try {
        let currentTransporter = transporter;
        if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
            currentTransporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: parseInt(smtpConfig.port || '587'),
                secure: smtpConfig.port === '465',
                auth: { user: smtpConfig.user, pass: smtpConfig.pass },
            });
        }

        await currentTransporter.sendMail({
          from: (smtpConfig?.user || process.env.SMTP_FROM || process.env.SMTP_USER),
          to: recipientEmail,
          subject: `Reporte de Gastos: ${propertyName}`,
          text: `Estimado/a,\n\nSe adjunta el reporte detallado de los gastos correspondientes a la propiedad: ${propertyName}. Puede revisar el detalle a continuación en el cuerpo del correo o visualizar los comprobantes en los enlaces provistos.\n\nAtentamente,\nPunto Propiedades`,
          html: `
            <h2>Reporte de Gastos: ${propertyName}</h2>
            <p>Estimado/a,</p>
            <p>Se adjunta el reporte detallado de los gastos correspondientes a la propiedad: <b>${propertyName}</b>.</p>
            <h3>Detalle de Gastos:</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <tr style="background-color: #f2f2f2;">
                  <th style="padding: 8px;">Tipo</th>
                  <th style="padding: 8px;">Fecha</th>
                  <th style="padding: 8px;">Monto</th>
                  <th style="padding: 8px;">Comprobante</th>
                </tr>
                ${expenses.map((e: any) => `
                    <tr>
                      <td style="padding: 8px;">${e.tipo || 'Gasto'}</td>
                      <td style="padding: 8px;">${e.date ? new Date(e.date).toLocaleDateString() : 'N/A'}</td>
                      <td style="padding: 8px;">$${Number(e.monto).toLocaleString()}</td>
                      <td style="padding: 8px;">${e.link && e.link !== '#' ? `<a href="${e.link.startsWith('http') ? e.link : (process.env.APP_URL || 'https://ais-dev-fg3bbznlssn3osytzphtqt-439168816008.us-east1.run.app') + e.link}" style="text-decoration:none;">📄 Ver Comprobante</a>` : 'Sin archivo'}</td>
                    </tr>
                `).join('')}
            </table>
            <p>Atentamente,<br>Punto Propiedades</p>
          `
        });
        res.json({ success: true });
    } catch (e: any) {
        console.error('[Reporte Error]', e);
        res.status(500).json({ error: e.message });
    }
  });

  doc.fontSize(20).fillColor('navy').text(`Reporte de Gastos: ${propertyName}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).fillColor('black').text(`Emitido el: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  // Draw table header
  const tableTop = doc.y;
  doc.fontSize(10).fillColor('gray').rect(50, tableTop, 500, 20).fill('#f0f0f0');
  doc.fillColor('black').text('Tipo de Gasto', 60, tableTop + 5);
  doc.text('Fecha', 250, tableTop + 5);
  doc.text('Monto', 450, tableTop + 5, { align: 'right' });
  
  // Draw table rows
  let y = tableTop + 30;
  expenses.forEach((e: any) => {
    doc.fontSize(10).fillColor('black').text(e.tipo || 'Gasto', 60, y);
    doc.text(e.date ? new Date(e.date).toLocaleDateString() : 'N/A', 250, y);
    doc.text(`$${e.monto || 0}`, 450, y, { align: 'right' });
    y += 20;
  });

  // Total
  const total = expenses.reduce((sum: number, e: any) => sum + (Number(e.monto) || 0), 0);
  doc.rect(50, y, 500, 0.5).stroke();
  doc.fontSize(12).fillColor('black').font('Helvetica-Bold').text(`Total Gastos: $${total}`, 450, y + 10, { align: 'right' });

  // Add list of expense files
  doc.moveDown(2);
  doc.fontSize(14).fillColor('navy').text('Detalle de Documentos de Soporte:', { underline: true });
  doc.moveDown(0.5);
  expenses.forEach((e: any) => {
    if (e.boleta) {
        doc.fontSize(10).fillColor('black').text(`${e.tipo}: ${e.boleta}`);
    }
  });

  doc.end();
});

app.get('/api/properties', (req, res) => {
  const data = getData();
  res.json(data.properties);
});

app.post('/api/properties', (req, res) => {
  const data = getData();
  const newProp = {
    id: `ID-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    ...req.body,
    expenses: []
  };
  data.properties.push(newProp);
  saveData(data);
  res.json(newProp);
});

app.delete('/api/properties/:id', (req, res) => {
  const data = getData();
  data.properties = data.properties.filter((p: any) => p.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.post('/api/properties/:id/expenses', upload.single('file'), (req: any, res) => {
  const data = getData();
  const prop = data.properties.find((p: any) => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const expense = {
    tipo: req.body.tipo,
    monto: req.body.monto,
    mes: req.body.mes,
    boleta: req.body.boleta,
    link: req.file ? `/uploads/${req.file.filename}` : '#',
    date: new Date().toISOString()
  };

  prop.expenses.push(expense);
  saveData(data);
  res.json(prop);
});

app.delete('/api/properties/:id/expenses/:index', (req, res) => {
  const data = getData();
  const prop = data.properties.find((p: any) => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  prop.expenses.splice(parseInt(req.params.index), 1);
  saveData(data);
  res.json(prop);
});

app.post('/api/properties/:id/renew', (req, res) => {
  const data = getData();
  const prop = data.properties.find((p: any) => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const hoy = new Date();
  let fechaVence = new Date(prop.termino);
  if (isNaN(fechaVence.getTime())) {
    const [d, m, y] = prop.termino.split('/');
    fechaVence = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  while (fechaVence <= hoy) {
    fechaVence.setFullYear(fechaVence.getFullYear() + 1);
  }

  prop.termino = fechaVence.toISOString().split('T')[0];
  saveData(data);
  res.json(prop);
});

app.post('/api/upload', upload.single('file'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

app.post('/api/upload-persistent', memoryUpload.single('file'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const file = bucket.file(fileName);
    
    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      public: false 
    });
    
    // Get Signed URL valid until 2049
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2049'
    });
    
    console.log(`[Upload] Success! File saved to Firebase Storage: ${url}`);
    res.json({ url });
  } catch (err: any) {
    console.error('[Upload] Error saving file to Storage:', err);
    res.status(500).json({ error: 'Failed to save file to Storage', details: err.message });
  }
});

app.post('/api/send-report', async (req, res) => {
  const { to, subject, body, html, attachments, smtpConfig } = req.body;
  console.log(`[Email] Request to send report to: ${to}`);
  
  // Choose transporter based on dynamic config or environment variables
  let currentTransporter = transporter;
  let fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  let isDynamic = false;

  if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
    console.log(`[Email] Using dynamic SMTP config: ${smtpConfig.host}`);
    try {
      currentTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port || '587'),
        secure: smtpConfig.port === '465',
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
      fromEmail = smtpConfig.user;
      isDynamic = true;
    } catch (e) {
      console.error('[Email] Failed to create dynamic transporter:', e);
    }
  }

  if (!process.env.SMTP_HOST && !isDynamic) {
    console.log('[Email] Simulation mode: No SMTP configuration provided.');
    return res.json({ success: true, message: 'Simulado: No hay servidor de correo configurado. Por favor, ingresa los datos SMTP en Configuraciones.' });
  }

  try {
    console.log(`[Email] Attempting to send via ${isDynamic ? 'Dynamic SMTP' : 'Default SMTP'}...`);
    const info = await currentTransporter.sendMail({
      from: fromEmail || 'noreply@puntopropiedades.cl',
      to,
      subject,
      text: body,
      html: html || undefined,
    });
    console.log('[Email] Sent successfully:', info.messageId);
    res.json({ success: true, message: 'Reporte enviado con éxito.' });
  } catch (err: any) {
    console.error('[Email] Error sending mail:', err);
    if (err.message.includes('535 5.7.139')) {
      console.warn('[Email] Critical: SMTP Authentication disabled for this Microsoft 365 Tenant.');
    }
    res.status(500).json({ 
      error: 'Error al enviar el correo', 
      details: err.message,
      code: err.code,
      command: err.command
    });
  }
});

// Cron Job automático mensual para avisar vencimientos de arriendos
app.get('/api/cron/monthly-expiry', async (req, res) => {
  // Opcional: Autorización básica con cabecera Vercel Cron
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { ... }

  try {
    let properties: any[] = [];

    // Intentar leer de Firestore si está inicializado admin
    if (admin.apps.length) {
      try {
        const snapshot = await admin.firestore().collection('properties').get();
        snapshot.forEach(doc => {
          properties.push({ id: doc.id, ...doc.data() });
        });
      } catch (dbErr) {
        console.warn('[Cron] Firestore read failed, falling back to local file:', dbErr);
      }
    }

    // Fallback a archivo local si está vacío
    if (properties.length === 0) {
      properties = getData().properties || [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // fin del mes siguiente

    const expiringProps = properties.filter((p: any) => {
      if (!p.termino) return false;
      const expiryDate = new Date(p.termino + 'T00:00:00');
      return expiryDate <= maxDate;
    });

    if (expiringProps.length === 0) {
      return res.json({ success: true, message: 'No hay propiedades por vencer este mes o el siguiente.' });
    }

    // Obtener email de destino desde la configuración del usuario en settings
    let targetEmail = process.env.SMTP_USER; // Default
    let dynamicTransporter = transporter;

    if (admin.apps.length) {
      try {
        // Buscar el documento de settings de algún usuario administrador
        const settingsSnap = await admin.firestore().collection('settings').limit(1).get();
        if (!settingsSnap.empty) {
          const settingsData = settingsSnap.docs[0].data();
          if (settingsData.reportEmail) {
            targetEmail = settingsData.reportEmail;
          }
          if (settingsData.smtpHost && settingsData.smtpUser && settingsData.smtpPass) {
            dynamicTransporter = nodemailer.createTransport({
              host: settingsData.smtpHost,
              port: parseInt(settingsData.smtpPort || '587'),
              secure: settingsData.smtpPort === '465',
              auth: { user: settingsData.smtpUser, pass: settingsData.smtpPass },
            });
          }
        }
      } catch (settingsErr) {
        console.error('[Cron] Failed to retrieve SMTP settings from Firestore:', settingsErr);
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ error: 'No se encontró correo de destino configurado.' });
    }

    // Crear contenido HTML
    let tableRows = '';
    expiringProps.forEach((p: any) => {
      const parts = (p.termino || '').split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.termino;
      const isExpired = new Date(p.termino + 'T00:00:00') < today;

      tableRows += `
        <tr style="border-b: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: bold; color: #0f172a;">${p.direccion || 'N/A'}</td>
          <td style="padding: 12px; color: #475569;">${p.dueno || 'N/A'}</td>
          <td style="padding: 12px; color: #475569;">${p.arrendatario || 'N/A'}</td>
          <td style="padding: 12px; font-family: monospace; color: #b91c1c;">${p.valor || 'N/A'}</td>
          <td style="padding: 12px; color: #475569;">${p.duracion || 'N/A'}</td>
          <td style="padding: 12px; font-weight: bold; color: ${isExpired ? '#ef4444' : '#d97706'}">${formattedDate} ${isExpired ? '(Vencido)' : ''}</td>
        </tr>
      `;
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #b91c1c; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #b91c1c; padding-bottom: 10px;">Aviso de Vencimientos de Arriendos</h2>
        <p style="color: #475569; font-size: 14px;">Estimado Administrador,</p>
        <p style="color: #475569; font-size: 14px;">A continuación se presenta el listado consolidado de contratos de arriendo que vencen o se encuentran vencidos durante el mes en curso y el próximo:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: bold; text-transform: uppercase; color: #475569;">
              <th style="padding: 12px;">Propiedad</th>
              <th style="padding: 12px;">Propietario</th>
              <th style="padding: 12px;">Arrendatario</th>
              <th style="padding: 12px;">Monto</th>
              <th style="padding: 12px;">Plazo</th>
              <th style="padding: 12px;">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <p style="margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center;">Este es un mensaje generado automáticamente por el sistema Punto Propiedades.</p>
      </div>
    `;

    await dynamicTransporter.sendMail({
      from: `Punto Propiedades <${targetEmail}>`,
      to: targetEmail,
      subject: `Alerta: ${expiringProps.length} arriendos vencidos o por vencer`,
      html: emailHtml
    });

    console.log(`[Cron] Expiry notification successfully sent to ${targetEmail}`);
    res.json({ success: true, message: `Reporte de vencimientos enviado con éxito a ${targetEmail}.` });

  } catch (err: any) {
    console.error('[Cron] Expiry notification error:', err);
    res.status(500).json({ error: 'Error ejecutando el Cron Job de vencimientos', details: err.message });
  }
});


app.get('/api/gmail/messages', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
      headers: { Authorization: token },
    });
    
    if (!gmailRes.ok) {
       throw new Error(`Gmail API error: ${gmailRes.statusText}`);
    }

    const data = await gmailRes.json();
    
    const messages = await Promise.all(
        (data.messages || []).map(async (msg: any) => {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
             headers: { Authorization: token },
            });
            return await detailRes.json();
        })
    );
    
    res.json({ messages });
  } catch (err: any) {
    console.error('[Gmail] Error fetching messages:', err);
    res.status(500).json({ error: 'Error fetching emails', details: err.message });
  }
});

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/uploads', (req, res) => {
  res.status(404).send('File not found');
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded (development)');
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build artifacts not found. Please run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;