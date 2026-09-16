const fs = require('fs');
const execSync = require('child_process').execSync;
const res = execSync('findstr /s /i "className=.*drag" src\\renderer\\*').toString();
console.log(res);
