const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`{availableMonths.map(mo => (
                      <option key={mo} value={mo}>{getMonthNameByNum(mo)}</option>
                    ))}`,
`{availableMonths.map(mo => (
                      <option key={mo as string} value={mo as string}>{getMonthNameByNum(mo as string)}</option>
                    ))}`);

fs.writeFileSync('src/App.tsx', code);
