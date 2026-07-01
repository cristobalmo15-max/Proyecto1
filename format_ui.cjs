const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace specific UI occurences
code = code.replace(/\{selectedProp\.termino \|\| 'Indef'\}/g, "{formatDisplayDate(selectedProp.termino) || 'Indef'}");
code = code.replace(/\{selectedProp\.f_ini \|\| 'N\/A'\}/g, "{formatDisplayDate(selectedProp.f_ini) || 'N/A'}");
code = code.replace(/\{selectedProp\.f_ini \|\| 'No registrado'\}/g, "{formatDisplayDate(selectedProp.f_ini) || 'No registrado'}");
code = code.replace(/\$\{p\.termino \|\| 'Sin fecha'\}/g, "${formatDisplayDate(p.termino) || 'Sin fecha'}");

code = code.replace(
`                          <span className="text-[11px] font-extrabold text-red-600 font-mono tracking-wider">
                            {(() => {
                              const parts = p.f_ini.split('-');
                              if (parts.length >= 2) {
                                return \`\${parts[0]}-\${parts[1]}\`;
                              }
                              return p.f_ini;
                            })()}
                          </span>`,
`                          <span className="text-[11px] font-extrabold text-red-600 font-mono tracking-wider">
                            {formatDisplayDate(p.f_ini)}
                          </span>`);

code = code.replace(
`                                  <span className={\`text-[10px] font-extrabold font-mono tracking-wider \${
                                    isSel ? 'text-red-300' : 'text-red-600'
                                  }\`}>
                                    {(() => {
                                      const parts = p.f_ini.split('-');
                                      if (parts.length >= 2) {
                                        return \`\${parts[0]}-\${parts[1]}\`;
                                      }
                                      return p.f_ini;
                                    })()}
                                  </span>`,
`                                  <span className={\`text-[10px] font-extrabold font-mono tracking-wider \${
                                    isSel ? 'text-red-300' : 'text-red-600'
                                  }\`}>
                                    {formatDisplayDate(p.f_ini)}
                                  </span>`);

fs.writeFileSync('src/App.tsx', code);
