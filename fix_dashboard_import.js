const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');
code = code.replace("import { useEffect, useState, useRef } from 'react'", "import { useEffect, useState, useRef, useCallback } from 'react'");
fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Fixed import');
