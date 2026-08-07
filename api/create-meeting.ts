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
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(200).json({ success: false, error: 'No se recibió token de autorización de Google.' });
    }

    const { summary, description, startDateTime, endDateTime, attendees } = req.body || {};

    const formattedAttendees = (attendees || [])
      .map((email: string) => ({ email: String(email).trim() }))
      .filter((a: any) => a.email && a.email.includes('@'));

    const event = {
      summary: summary || 'Reunión - Punto Propiedades',
      description: description || 'Reunión agendada desde la aplicación Punto Propiedades.',
      start: { dateTime: startDateTime || new Date().toISOString(), timeZone: 'America/Santiago' },
      end: { dateTime: endDateTime || new Date(Date.now() + 3600000).toISOString(), timeZone: 'America/Santiago' },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      attendees: formattedAttendees,
    };

    const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
    const gRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const data = await gRes.json();
    if (!gRes.ok) {
      return res.status(200).json({ success: false, error: data.error?.message || 'Error al comunicarse con Google Calendar' });
    }

    return res.status(200).json({
      success: true,
      htmlLink: data.htmlLink,
      meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri,
      event: data,
    });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
