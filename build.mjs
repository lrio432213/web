import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const result=await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',target:'es2022',write:false,legalComments:'inline'});
const html=(await readFile('index.template.html','utf8')).replace('/*__STYLE__*/',await readFile('style.css','utf8')).replace('/*__SCRIPT__*/',()=>result.outputFiles[0].text.replaceAll('</script','<\\/script'));
await writeFile('index.html',html);await writeFile('dist/index.html',html);
console.log(`Built offline HTML: ${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB`);
