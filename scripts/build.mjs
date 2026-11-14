import {mkdir,copyFile,readdir,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
const project=resolve(import.meta.dirname,'..'),output=resolve(project,'dist');
if(!output.startsWith(project+sep)||output===project)throw Error('Invalid output directory');
await rm(output,{recursive:true,force:true});
await mkdir('dist/vendor',{recursive:true});
for(const file of await readdir('.'))if(/^(index\.html|fight\.html|rpg-(?!server).*\.(mjs|css)|meadow-.*\.mjs|.*\.mp3)$/.test(file))await copyFile(file,'dist/'+file);
await copyFile('node_modules/three/build/three.module.js','dist/vendor/three.module.js');
console.log('Built Slimeoo RPG + preserved fight rooms.');
