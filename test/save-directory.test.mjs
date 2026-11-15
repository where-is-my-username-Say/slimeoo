import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {prepareSaveDirectory} from '../scripts/save-directory.mjs';
test('local saves migrate once and a newer destination is never overwritten',async t=>{const root=await mkdtemp(join(tmpdir(),'slimoo-saves-'));t.after(async()=>{if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw Error('Unexpected temporary path');await rm(root,{recursive:true,force:true});});const legacy=join(root,'old'),current=join(root,'new');await mkdir(join(legacy,'v3'),{recursive:true});await writeFile(join(legacy,'v3','save'),'old progress');assert.equal((await prepareSaveDirectory(legacy,current)).migrated,true);assert.equal(await readFile(join(current,'v3','save'),'utf8'),'old progress');await writeFile(join(current,'v3','save'),'newer progress');assert.equal((await prepareSaveDirectory(legacy,current)).migrated,false);assert.equal(await readFile(join(current,'v3','save'),'utf8'),'newer progress');});
