const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`  const restoreFIniDates = async () => {
    if (!user) return;
    setLoading(true);
    setLoadingStatus('Restaurando fechas de inicio...');
    try {
      let updatedCount = 0;
      for (const p of properties) {
        if (p.f_ini && p.duracionMeses && p.termino) {
          // If the duration is 24 months, and f_ini is in 2026, and termino is in 2028, it was a 2018 contract
          // Since the bug was: newFIni was set to currentTermino - monthsToAdd.
          // Let's just calculate how many years to subtract:
          // The old bug added months until it was > now (2026).
          // For a 2018 contract (duracionMeses 24), it added 24 months 4 times to reach 2026, and currentTermino became 2028.
          // Then newFIni was set to 2026.
          // If the user's contract had f_ini changed to exactly today or very recently but the year is wrong, we can revert it.
          // Since the bug only happened when pressing "Renovar", and the bug subtracted EXACTLY the duracionMeses from the new termino to set f_ini.
          // Let's just look for any f_ini >= 2024 that shouldn't be. 
          // Wait, if f_ini was manually entered as 2024, we don't want to break it.
          // Let's specifically target the ones that got messed up in the last 24 hours. Wait, no way to know if they were messed up in the last 24h because we overwrite f_ini.
          // But the user ONLY HAS A FEW properties. They specifically mentioned 2018.
          // Let's just fix the specific case of the 24 month contract:
          if (p.f_ini.startsWith('2026-') && p.duracionMeses == 24 && p.termino.startsWith('2028-')) {
            const f_iniDate = new Date(\`\${p.f_ini.split('T')[0]}T12:00:00Z\`);
            f_iniDate.setUTCFullYear(f_iniDate.getUTCFullYear() - 8); // Revert to 2018
            const fixedFIni = f_iniDate.toISOString().split('T')[0];
            await updateDoc(doc(db, 'properties', p.id), { f_ini: fixedFIni });
            updatedCount++;
          }
          // Also what if it was a 12 month contract from 2025? (12 months added, so it became 2026, f_ini became 2026).
          // We can't know for sure. I will just revert the 24 month one from 2026 to 2018, and any other ones I'll leave to manual edit.
        }
      }
      showToast(updatedCount > 0 ? \`Se restauraron \${updatedCount} fechas de inicio al 2018.\` : 'No se encontraron fechas para restaurar.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al restaurar', 'error');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

`, ``);

code = code.replace(
`                  <button 
                    onClick={restoreFIniDates}
                    className="w-10 h-10 rounded-xl transition-all border flex items-center justify-center shrink-0 bg-white text-orange-400 border-border/70 hover:text-orange-600 hover:border-orange-300 shadow-sm"
                    title="Restaurar Fechas Inicio a 2018 (Bug Fix)"
                  >
                    <History className="w-4 h-4" />
                  </button>`, ``);

fs.writeFileSync('src/App.tsx', code);
