const fs = require('fs');
const data = require('./recover.json');

fs.copyFileSync('Dashboard_backup.tsx', 'src/renderer/src/pages/Dashboard/Dashboard.tsx');

const stepsToReplay = data.filter(d => d.step > 3015 && d.step <= 3705);

for (const s of stepsToReplay) {
  if (s.tool === 'multi_replace_file_content' && s.args.TargetFile && s.args.TargetFile.includes('Dashboard.tsx')) {
    let content = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');
    for (const chunk of s.args.ReplacementChunks) {
      if (!content.includes(chunk.TargetContent)) {
        console.log(`Failed to match chunk in step ${s.step}:\n${chunk.TargetContent.substring(0, 50)}...`);
      } else {
        content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
      }
    }
    fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', content);
    console.log(`Replayed step ${s.step} (multi_replace)`);
  } else if (s.tool === 'run_command' && s.args.CommandLine.includes('node -e') && s.args.CommandLine.includes('Dashboard.tsx')) {
    try {
      const execSync = require('child_process').execSync;
      execSync(s.args.CommandLine, {cwd: 'd:/widget'});
      console.log(`Replayed step ${s.step} (inline node)`);
    } catch(e) {
      console.log(`Error in inline node step ${s.step}`);
    }
  } else if (s.tool === 'write_to_file' && s.args.TargetFile.endsWith('.js') && s.args.CodeContent.includes('Dashboard.tsx')) {
    fs.writeFileSync(s.args.TargetFile, s.args.CodeContent);
    console.log(`Replayed step ${s.step} (wrote ${s.args.TargetFile})`);
    if (s.args.CodeContent.includes('fs.writeFileSync')) {
       try {
         const execSync = require('child_process').execSync;
         execSync(`node ${s.args.TargetFile}`, {cwd: 'd:/widget'});
         console.log(`Executed written script for step ${s.step}`);
       } catch(e) {
         console.log(`Failed to execute script for step ${s.step}`);
       }
    }
  } else if (s.tool === 'run_command' && s.args.CommandLine.startsWith('node ') && s.args.CommandLine.includes('.js')) {
    // some scripts might have already run in the write_to_file block, but let's run anyway if it doesn't fail
    try {
      const execSync = require('child_process').execSync;
      execSync(s.args.CommandLine, {cwd: 'd:/widget'});
      console.log(`Replayed step ${s.step} (run script)`);
    } catch(e) {}
  }
}
