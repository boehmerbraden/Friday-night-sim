import {readFile,writeFile} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const script=(await Promise.all(['states.js','engine.js','graphics.js','logo-background.js','season.js','app.js','season-ui.js'].map(read))).map(s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n');
const html=(await read('index.template.html')).replace('/*STYLE*/',await read('style.css')).replace('/*SCRIPT*/',()=>script.replace(/<\/script/gi,'<\\/script'));
await writeFile(new URL('index.html',import.meta.url),html);
console.log('Built standalone index.html');
