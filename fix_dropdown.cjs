const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* Year Filter Dropdown \*\/\}.*?<\/select>/s;
const replacement = `{/* Month Filter Dropdown */}
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                    className={\`h-10 px-2 rounded-xl border bg-white text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer transition-all shrink-0 \${
                      selectedYearFilter !== 'all' 
                         ? 'border-primary text-primary bg-red-50/30' 
                         : 'border-border/70 text-muted hover:border-primary'
                    }\`}
                  >
                    <option value="all">Mes: Todos</option>
                    {availableMonths.map(mo => (
                      <option key={mo} value={mo}>{getMonthNameByNum(mo)}</option>
                    ))}
                  </select>`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', code);
