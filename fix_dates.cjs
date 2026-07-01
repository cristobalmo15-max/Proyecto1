const admin = require('firebase-admin');

// Ensure we initialize with a project id just in case
admin.initializeApp({
  projectId: "ai-studio-3855d0b1-99e2-4f40-9ff5-b39b8506c4a7"
});

const db = admin.firestore();

async function run() {
  console.log("Fetching properties...");
  const snapshot = await db.collection('properties').get();
  console.log(`Found ${snapshot.size} properties.`);
  
  let updatedCount = 0;
  const batch = db.batch();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.f_ini && data.duracionMeses && data.termino) {
      const f_ini = data.f_ini;
      const f_ini_dateStr = f_ini.includes('T') ? f_ini : `${f_ini}T12:00:00`;
      const f_ini_date = new Date(f_ini_dateStr);
      
      const monthsToAdd = Number(data.duracionMeses) || 12;
      
      let expectedTermino = new Date(f_ini_date);
      expectedTermino.setMonth(expectedTermino.getMonth() + monthsToAdd);
      const expectedTerminoStr = expectedTermino.toISOString().split('T')[0];
      
      if (data.termino !== expectedTerminoStr) {
        console.log(`Updating ${data.direccion}: f_ini=${f_ini}, duracion=${monthsToAdd}, currentTermino=${data.termino}, expected=${expectedTerminoStr}`);
        batch.update(doc.ref, {
          termino: expectedTerminoStr
        });
        updatedCount++;
      }
    }
  }
  
  if (updatedCount > 0) {
    await batch.commit();
    console.log(`Updated ${updatedCount} properties.`);
  } else {
    console.log("No updates needed.");
  }
}

run().catch(console.error);
