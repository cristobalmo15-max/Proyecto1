const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`                        {p.f_ini && (
                          <span className="text-[10px] font-extrabold text-red-600 font-mono tracking-wider">
                            {formatDateDMY(p.f_ini)}
                          </span>
                        )}`,
`                        {p.f_ini && (
                          <span className="text-[10px] font-extrabold text-red-600 font-mono tracking-wider">
                            {getMonthName(p.f_ini)}
                          </span>
                        )}`);

code = code.replace(
`                                {p.f_ini && (
                                  <span className={\`text-[10px] font-extrabold font-mono tracking-wider \${
                                    isSel ? 'text-red-300' : 'text-red-600'
                                  }\`}>
                                    {formatDateDMY(p.f_ini)}
                                  </span>
                                )}`,
`                                {p.f_ini && (
                                  <span className={\`text-[10px] font-extrabold font-mono tracking-wider \${
                                    isSel ? 'text-red-300' : 'text-red-600'
                                  }\`}>
                                    {getMonthName(p.f_ini)}
                                  </span>
                                )}`);

fs.writeFileSync('src/App.tsx', code);
