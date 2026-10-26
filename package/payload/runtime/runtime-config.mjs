import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
export function readRuntimeConfig(env=process.env){
 const legacyRoot=path.resolve(here,'../..');let config={};
 if(env.ARTCRAFT_CONFIG){
  config=JSON.parse(fs.readFileSync(env.ARTCRAFT_CONFIG,'utf8'));
  if(!config||Array.isArray(config)||typeof config!=='object')throw Error('ArtCraft config must be an object');
 }
 const absolute=(value,fallback)=>{if(value===undefined)return fallback;if(typeof value!=='string'||!path.isAbsolute(value))throw Error('ArtCraft runtime paths must be absolute');return path.resolve(value)};
 const root=absolute(env.ARTCRAFT_PROJECT_ROOT||config.workspace,legacyRoot);
 const cliRoot=absolute(env.ARTCRAFT_CLI_ROOT||config.cliRoot,root);
 const stateDir=absolute(env.ARTCRAFT_STATE_DIR||config.stateDir,path.join(here,'.local'));
 const docsRoot=absolute(env.ARTCRAFT_DOCS_ROOT||config.docsRoot,path.join(legacyRoot,'docs'));
 const appDirs=config.appDirs||['/Applications',path.join(env.HOME||os.homedir(),'Applications')];
 if(!Array.isArray(appDirs)||!appDirs.length||appDirs.some(p=>typeof p!=='string'||!path.isAbsolute(p)))throw Error('appDirs must contain absolute application directories');
 const ports={vectorcraft:7979,figcraft:7980,effectcraft:9877,photocraft:7878};
 for(const [app,port] of Object.entries(config.ports||{})){
  if(!Object.hasOwn(ports,app)||!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid ArtCraft control port');ports[app]=port;
 }
 return {root,cliRoot,stateDir,docsRoot,appDirs,ports};
}
export const runtimeConfig=readRuntimeConfig();
