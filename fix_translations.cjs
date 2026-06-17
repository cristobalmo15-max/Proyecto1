const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/Document <br \/>Engine Matrix/g, "Matriz <br />Operativa");
code = code.replace(/The secure encryption protocols are currently facilitating your document migration to the central repository./g, "Los protocolos de seguridad están migrando su documento al repositorio central.");
code = code.replace(/Archival integrity confirmed. The operational agreement is now permanently linked to this asset profile./g, "Integridad confirmada. El contrato operativo está ligado a este perfil.");
code = code.replace(/Direct document link provides the cognitive core with the necessary data for automated management./g, "El acceso al documento nutre al motor central para la gestión automatizada.");
code = code.replace(/'Initializing...' : 'Commit to System'/g, "'Iniciando...' : 'Guardar Cambios'");
code = code.replace(/>Abandon Procedure</g, ">Cancelar Operación<");
code = code.replace(/System.Root.Auth/g, "Sistema Raíz");
code = code.replace(/Consolidated Protocol 7.1/g, "Consolidación Operativa");
code = code.replace(/Active Portfolio/g, "Portafolio Activo");
code = code.replace(/Waitlist Pressure/g, "Presión Demanda");
code = code.replace(/Operational uptime/g, "Tiempo Operativo");
code = code.replace(/"Stable"/g, '"Estable"');
code = code.replace(/"High"/g, '"Alta"');
code = code.replace(/"Optimal"/g, '"Óptimo"');
code = code.replace(/SYSTEM_START check_expiries/g, "INICIO_SISTEMA rev_vencimientos");
code = code.replace(/Monthly Canon/g, "Valor Mensual");

fs.writeFileSync('src/App.tsx', code);
