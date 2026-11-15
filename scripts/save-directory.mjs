import {access,cp,mkdir} from 'node:fs/promises';
export async function prepareSaveDirectory(legacyDirectory,saveDirectory){
  const exists=async path=>{try{await access(path);return true;}catch{return false;}};
  if(await exists(saveDirectory))return {migrated:false};
  if(await exists(legacyDirectory)){await cp(legacyDirectory,saveDirectory,{recursive:true,force:false,errorOnExist:true});return {migrated:true};}
  await mkdir(saveDirectory,{recursive:true});return {migrated:false};
}
