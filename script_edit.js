const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `                    )}

                        {/* PREMIUM TABS CONTROL */}
                        <div className="lg:col-span-3 flex justify-center mt-12 mb-16">`;

const replace1 = `                    )}
`;

const idx = code.indexOf(target1);
if (idx > -1) {
  // Find start of finances
  const financeStartStr = `                          {activeTab === 'finances' && (`;
  const nextFinanceIndex = code.indexOf(financeStartStr, idx);
  if (nextFinanceIndex > -1) {
    code = code.substring(0, idx) + `                    )}
` + code.substring(nextFinanceIndex);
    console.log("Chunk 1 success");
  }
}

// remove the closing div of "TAB CONTENT AREAS"
// Look for document close:

const docEndStr = `                             </div>
                           )}
                         </div>
                       </div>

                       {/* Property Footer - SOPHISTICATED MINIMALISM */}`;

const replaceDocEndStr = `                             </div>
                           )}
                       </div>

                       {/* Property Footer - SOPHISTICATED MINIMALISM */}`;

if (code.indexOf(docEndStr) > -1) {
  code = code.replace(docEndStr, replaceDocEndStr);
  console.log("Chunk 2 success");
}

fs.writeFileSync('src/App.tsx', code);
console.log("Done");
