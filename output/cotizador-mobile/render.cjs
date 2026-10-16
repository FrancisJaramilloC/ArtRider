const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/ASUS FLOW/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
async function main(){const names=fs.readdirSync(__dirname).filter(n=>n.endsWith('.svg'));for(const name of names){const isSheet=name.includes('lamina');await sharp(path.join(__dirname,name),{density:isSheet?72:144}).png().toFile(path.join(__dirname,name.replace(/\.svg$/,'.png')));}console.log(JSON.stringify({rendered:names.length}));}main().catch(e=>{console.error(e.message);process.exit(1)});

