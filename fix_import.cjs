const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`  Wand2,
  History
} from 'lucide-react';`,
`  Wand2
} from 'lucide-react';`);

fs.writeFileSync('src/App.tsx', code);
