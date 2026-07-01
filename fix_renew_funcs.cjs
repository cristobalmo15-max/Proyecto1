const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`  const renewContract = async () => {
    if (!selectedProp) return;
    
    const now = new Date();
    const nextYearLimit = now.getFullYear() + 2;
    
    // Ensure we handle timezones correctly to avoid day shifting
    const terminoDateStr = selectedProp.termino.includes('T') ? selectedProp.termino : \`\${selectedProp.termino}T12:00:00\`;
    let currentTermino = new Date(terminoDateStr);
    const monthsToAdd = Number(selectedProp.duracionMeses) || 12;
    
    if (currentTermino.getFullYear() >= nextYearLimit) {
      showToast(\`Límite de renovación alcanzado (\${nextYearLimit}). Para corregir, usa "Editar Ficha".\`, 'error');
      return;
    }

    try {
      // Advance by periods until the expiration is in the future
      if (currentTermino < now) {
        while (currentTermino <= now) {
          currentTermino.setMonth(currentTermino.getMonth() + monthsToAdd);
        }
      } else {
        currentTermino.setMonth(currentTermino.getMonth() + monthsToAdd);
      }
      
      const newTerminoStr = currentTermino.toISOString().split('T')[0];
      
      let newFIni = new Date(currentTermino);
      newFIni.setMonth(newFIni.getMonth() - monthsToAdd);
      const newFIniStr = newFIni.toISOString().split('T')[0];`,
`  const renewContract = async () => {
    if (!selectedProp) return;
    
    const now = new Date();
    const nextYearLimit = now.getFullYear() + 2;
    
    // Ensure we handle timezones correctly to avoid day shifting
    const terminoDateStr = selectedProp.termino.split('T')[0];
    let currentTermino = new Date(\`\${terminoDateStr}T12:00:00Z\`);
    const monthsToAdd = Number(selectedProp.duracionMeses) || 12;
    
    if (currentTermino.getUTCFullYear() >= nextYearLimit) {
      showToast(\`Límite de renovación alcanzado (\${nextYearLimit}). Para corregir, usa "Editar Ficha".\`, 'error');
      return;
    }

    try {
      // Advance by periods until the expiration is in the future
      if (currentTermino < now) {
        while (currentTermino <= now) {
          currentTermino.setUTCMonth(currentTermino.getUTCMonth() + monthsToAdd);
        }
      } else {
        currentTermino.setUTCMonth(currentTermino.getUTCMonth() + monthsToAdd);
      }
      
      const newTerminoStr = currentTermino.toISOString().split('T')[0];
      
      let newFIni = new Date(currentTermino.getTime());
      newFIni.setUTCMonth(newFIni.getUTCMonth() - monthsToAdd);
      const newFIniStr = newFIni.toISOString().split('T')[0];`);

code = code.replace(
`      let updatedCount = 0;
      for (const p of properties) {
        if (p.f_ini && p.duracionMeses && p.termino) {
          const f_iniStr = p.f_ini.includes('T') ? p.f_ini : \`\${p.f_ini}T12:00:00\`;
          const f_iniDate = new Date(f_iniStr);
          const monthsToAdd = Number(p.duracionMeses) || 12;
          let expectedTermino = new Date(f_iniDate);
          expectedTermino.setMonth(expectedTermino.getMonth() + monthsToAdd);
          const expectedTerminoStr = expectedTermino.toISOString().split('T')[0];`,
`      let updatedCount = 0;
      for (const p of properties) {
        if (p.f_ini && p.duracionMeses && p.termino) {
          const f_iniStr = p.f_ini.split('T')[0];
          const f_iniDate = new Date(\`\${f_iniStr}T12:00:00Z\`);
          const monthsToAdd = Number(p.duracionMeses) || 12;
          let expectedTermino = new Date(f_iniDate.getTime());
          expectedTermino.setUTCMonth(expectedTermino.getUTCMonth() + monthsToAdd);
          const expectedTerminoStr = expectedTermino.toISOString().split('T')[0];`);

fs.writeFileSync('src/App.tsx', code);
