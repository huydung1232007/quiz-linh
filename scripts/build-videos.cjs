const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname,'..');
const config = JSON.parse(fs.readFileSync(path.join(root,'courses-config.json'),'utf8'));
for (const [lesson,video] of Object.entries(config.videos || {})) {
  if (!/^https?:\/\//.test(video) && !fs.existsSync(path.join(root,video))) throw new Error(`Missing video for ${lesson}: ${video}`);
}
fs.writeFileSync(path.join(root,'courses-config.js'),'// Generated from courses-config.json.\nwindow.ACADEMY_VIDEO_CONFIG = '+JSON.stringify(config)+';\n');
console.log('Prepared shared video configuration.');
