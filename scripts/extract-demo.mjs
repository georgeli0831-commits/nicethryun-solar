import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source=process.argv[2];
if (!source) throw new Error('Usage: node scripts/extract-demo.mjs /path/to/NICETHRYUN_融合版_独立预览.html');
const html=fs.readFileSync(source,'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const start=scripts[2].indexOf('  const INLINE_ASSETS');
const end=scripts[2].indexOf('  const storageKey');
const context={};vm.createContext(context);
vm.runInContext(scripts[2].slice(start,end)+';globalThis.extracted={INLINE_ASSETS,products,applications,familyNames,typeNames}',context);
const {INLINE_ASSETS,products,applications,familyNames,typeNames}=context.extracted;
const resourceContext={window:{}};vm.createContext(resourceContext);vm.runInContext(scripts[1],resourceContext);
const resources=resourceContext.window.NICETHRYUN_RESOURCES;
for(const [name,value] of Object.entries({products,applications,labels:{familyNames,typeNames},resources}))fs.writeFileSync(`${root}/src/data/${name}.json`,JSON.stringify(value,null,2)+'\n');
for(const [name,value] of Object.entries(resources))fs.writeFileSync(`${root}/public/downloads/${name}.${name==='range-overview'?'csv':'txt'}`,(name==='range-overview'?'\uFEFF':'')+value);
const css=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
fs.writeFileSync(`${root}/src/styles/global.css`,css+'\n');
const manifest=[];
const imagePaths={};
for(const [name,uri] of Object.entries(INLINE_ASSETS)) {
 const buffer=Buffer.from(uri.split(',')[1],'base64');
 let output=buffer;let settings=null;
 const before=await sharp(buffer).metadata();
 if(name.endsWith('.png')) {
  for(const quality of [100,95,90,85,80,70,60]) {
   settings={palette:true,quality,compressionLevel:9,effort:10};
   output=await sharp(buffer).png(settings).toBuffer();
   if(output.length<=400*1024)break;
  }
  if(output.length>400*1024) { for(const colours of [128,96,64,48,32]) { settings={palette:true,colours,compressionLevel:9,effort:10};output=await sharp(buffer).png(settings).toBuffer();if(output.length<=400*1024)break; } }
  if(output.length>400*1024)throw new Error('PNG limit not met '+name);
 }
 fs.writeFileSync(`${root}/public/images/${name}`,output);
 imagePaths[name]='/images/'+name;
 let delivery;
 if(name.endsWith('.png')) { const deliveredName=name.replace(/\.png$/,'.webp');const delivered=await sharp(buffer).webp({quality:95,effort:6}).toBuffer();fs.writeFileSync(`${root}/public/images/${deliveredName}`,delivered);imagePaths[name]='/images/'+deliveredName;delivery={name:deliveredName,bytes:delivered.length,quality:95,sha256:crypto.createHash('sha256').update(delivered).digest('hex')}; }
 const after=await sharp(output).metadata();
 manifest.push({name,delivery,sourceBytes:buffer.length,bytes:output.length,width:after.width,height:after.height,sourceWidth:before.width,sourceHeight:before.height,settings,sourceSha256:crypto.createHash('sha256').update(buffer).digest('hex'),sha256:crypto.createHash('sha256').update(output).digest('hex')});
 console.log(name,buffer.length,'->',output.length,after.width,after.height);
}
fs.writeFileSync(`${root}/docs/review/m1/assets.json`,JSON.stringify({source:'NICETHRYUN_融合版_独立预览.html',sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),cssSha256:crypto.createHash('sha256').update(css).digest('hex'),assets:manifest},null,2)+'\n');

fs.writeFileSync(`${root}/src/data/image-paths.json`,JSON.stringify(imagePaths,null,2)+'\n');
