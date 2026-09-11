import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Gemini API] GEMINI_API_KEY no está configurada en las variables de entorno del servidor.');
      return res.status(500).json({
        error: 'La API Key de Gemini no está configurada en el servidor (GEMINI_API_KEY).'
      });
    }

    const { base64, fileUrl } = req.body || {};

    let pdfBase64 = '';

    if (base64) {
      pdfBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    } else if (fileUrl) {
      // Descargar el archivo desde la URL (por ejemplo Firebase Storage)
      const downloadRes = await fetch(fileUrl);
      if (!downloadRes.ok) {
        return res.status(400).json({ error: `No se pudo descargar el archivo desde fileUrl (${downloadRes.statusText})` });
      }
      const arrayBuffer = await downloadRes.arrayBuffer();
      pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
    }

    if (!pdfBase64) {
      return res.status(400).json({ error: 'No se proporcionó base64 ni fileUrl válido para procesar el contrato.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analiza este contrato de arriendo chileno y extrae la información clave en formato JSON. 
Si un dato no está presente, deja el campo como "".
CAMPOS REQUERIDOS:
- dir: Dirección de la propiedad.
- can: Canon de arriendo mensual (solo números, por ejemplo 850000 o 25 o 15.5; no metas letras ni símbolos, si está en UF ingresa solo el valor con punto decimal si aplica).
- tipo_mon: Tipo de moneda para el arriendo. Debe ser exactamente de dos opciones: "pesos" o "uf" (según lo que indique el contrato).
- f_ini: Fecha de inicio, firma o fecha de celebración del contrato, usualmente en la primera cláusula o al inicio (AAAA-MM-DD).
- dur_meses: Duración del contrato expresado únicamente en número entero de meses (ej: 6, 12, 18, 24, 36, 60, etc). Si indica 1 año pon 12, 2 años pon 24, etc.
- d_nom, d_rut, d_tel, d_mail: Nombre, RUT, Teléfono y Email del Arrendador (Dueño). IMPORTANTE MÁXIMA PRIORIDAD: Si se identifica que el Arrendador (Dueño) es una sociedad, empresa, o está representado por más de una persona, o existen múltiples copropietarios, extrae TODOS ellos y colócalos juntos separados obligatoriamente por una coma (,). Mantén exactamente el mismo orden de correspondencia para d_nom, d_rut, d_tel y d_mail de modo que queden alineados uno a uno. Ejemplo: d_nom: "Inmobiliaria S.A., Carlos Muñoz (repre)", d_rut: "76.452.122-K, 14.223.111-2", d_tel: "22345678, 912345678", d_mail: "contacto@inmobiliaria.cl, carlos@mail.com".
- a_nom, a_rut, a_tel, a_mail: Nombre, RUT, Teléfono y Email del Arrendatario. IMPORTANTE MÁXIMA PRIORIDAD: Si se identifica que el Arrendatario es una sociedad, empresa, o está representado por más de una persona, o existen múltiples arrendatarios/ocupantes, extrae TODOS ellos y colócalos juntos separados obligatoriamente por una coma (,). Mantén exactamente el mismo orden de correspondencia para a_nom, a_rut, a_tel y a_mail de modo que queden alineados uno a uno. Ejemplo: a_nom: "Constructora Beta S.A., Ana Gómez (repre)", a_rut: "77.123.456-7, 12.345.678-9", a_tel: "22876543, 987654321", a_mail: "contacto@beta.cl, ana@betacorp.cl".
- av_nom, av_rut, av_tel, av_mail: Nombre, RUT, Teléfono y Email del Aval / Codeudor Solidario.

JSON SCHEMA: {"dir":"","can":"","tipo_mon":"pesos","f_ini":"","dur_meses":12,"d_nom":"","d_rut":"","d_tel":"","d_mail":"","a_nom":"","a_rut":"","a_tel":"","a_mail":"","av_nom":"","av_rut":"","av_tel":"","av_mail":""}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [
        { text: prompt },
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
      ],
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[ProcessContract Error]:', err);
    return res.status(500).json({
      error: 'Error al procesar el contrato con Inteligencia Artificial',
      details: err.message
    });
  }
}
