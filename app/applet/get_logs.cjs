const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "ai-studio-3855d0b1-99e2-4f40-9ff5-b39b8506c4a7"
});

const db = admin.firestore();

async function run() {
  const logsSnapshot = await db.collection('activityLogs').orderBy('timestamp', 'desc').limit(5).get();
  logsSnapshot.forEach(doc => {
    console.log(doc.data().action, doc.data().timestamp.toDate());
  });
  
  console.log("--- Properties ---");
  const snapshot = await db.collection('properties').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.f_ini && data.f_ini.startsWith('2026') && data.duracionMeses == 24) {
      console.log(doc.id, data.direccion, data.f_ini, data.termino);
    }
  });
}

run().catch(console.error);
