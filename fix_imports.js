const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');
if (!code.includes('useCallback')) {
    code = code.replace(/import \{ useEffect, useState, useRef \} from 'react'/, "import { useEffect, useState, useRef, useCallback } from 'react'");
    fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
    console.log('Added useCallback import');
}
