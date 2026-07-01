const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
const target = `ruts.map((rut, idx) => (
                                              <span key={idx}`;
const firstOccurrence = code.indexOf(target);
const secondOccurrence = code.indexOf(target, firstOccurrence + 10);
const newCode = code.slice(0, secondOccurrence) + target.replace('key={idx}', 'key={`rut-${i}-${idx}`}') + code.slice(secondOccurrence + target.length);
fs.writeFileSync('src/App.tsx', newCode);
