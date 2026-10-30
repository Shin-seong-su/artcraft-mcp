import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {download,extractExecutable,extractExactFile,sha} from './downloads.mjs';
const exec=promisify(execFile),bundle=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export async function registerMarketplace(home,pluginRoot){
 const file=path.join(home,'.agents/plugins/marketplace.json');let catalog;
 try{catalog=JSON.parse(await fs.readFile(file,'utf8'));if(!Array.isArray(catalog.plugins)||typeof catalog.name!=='string')throw Error('Existing marketplace format is invalid; it was not overwritten');}
 catch(error){if(error.code!=='ENOENT')throw error;catalog={name:'personal-local',interface:{displayName:'개인 로컬 플러그인'},plugins:[]};}
 const relative='./'+path.relative(home,pluginRoot).split(path.sep).join('/');
 const existing=catalog.plugins.find(p=>p.name==='artcraft-control');
 if(existing&&existing.source?.path!==relative)throw Error('An unrelated artcraft-control marketplace entry already exists; it was not replaced');
 const entry={name:'artcraft-control',source:{source:'local',path:relative},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Productivity'};
 if(existing)Object.assign(existing,entry);else catalog.plugins.push(entry);
 await fs.mkdir(path.dirname(file),{recursive:true});
 try{await fs.copyFile(file,file+'.backup-'+Date.now());}catch(error){if(error.code!=='ENOENT')throw error;}
 const temp=file+'.new';await fs.writeFile(temp,JSON.stringify(catalog,null,2)+'\n',{mode:0o600});await fs.rename(temp,file);return file;
}
async function verifyPayload(manifest){
 for(const row of manifest.files){const p=path.resolve(bundle,row.path);if(!p.startsWith(bundle+path.sep))throw Error('Invalid bundle manifest path');const stat=await fs.lstat(p);if(!stat.isFile()||stat.isSymbolicLink()||sha(await fs.readFile(p))!==row.sha256)throw Error('Bundle integrity check failed for '+row.path);}
}
export async function install(options){
 const home=options.home||os.homedir(),root=path.resolve(options.installRoot),manifest=JSON.parse(await fs.readFile(path.join(bundle,'bundle.json'),'utf8'));
 await verifyPayload(manifest);
 let previous={};try{previous=JSON.parse(await fs.readFile(path.join(root,'config.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const workspace=options.workspace||previous.workspace||path.join(home,'Documents/ArtCraft 작업');
 if(!path.isAbsolute(workspace))throw Error('Workspace must be an absolute path');
 const runtimeRoot=path.join(root,'versions',manifest.version+'-'+manifest.fingerprint.slice(0,12),'runtime');
 await fs.mkdir(root,{recursive:true,mode:0o700});await fs.mkdir(workspace,{recursive:true});
 let installed=false;try{installed=(await fs.readFile(path.join(runtimeRoot,'.bundle-fingerprint'),'utf8'))===manifest.fingerprint;}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!installed){
  const stage=runtimeRoot+'.installing-'+process.pid;await fs.mkdir(path.dirname(stage),{recursive:true});await fs.cp(path.join(bundle,'payload/runtime'),stage,{recursive:true,errorOnExist:true,force:false});
  console.log('MCP 실행 의존성을 설치합니다.');
  const env={HOME:home,PATH:path.dirname(process.execPath)+':/usr/bin:/bin',NPM_CONFIG_REGISTRY:'https://registry.npmjs.org',NPM_CONFIG_USERCONFIG:'/dev/null',npm_config_cache:path.join(root,'npm-cache')};
  await exec(path.join(path.dirname(process.execPath),'npm'),['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:stage,env,timeout:180000,maxBuffer:1024*1024});
  await fs.writeFile(path.join(stage,'.bundle-fingerprint'),manifest.fingerprint);
  await fs.rename(stage,runtimeRoot);
 }
 const catalog=JSON.parse(await fs.readFile(path.join(bundle,'cli-catalog.json'),'utf8'));
 const selected=options.apps?options.apps.split(','):catalog.map(c=>c.app);
 if(selected.some(app=>!catalog.some(row=>row.app===app)))throw Error('Unsupported app selection');
 const cache=path.join(root,'cli');await fs.mkdir(cache,{recursive:true});
 let cliManifest={apps:[]};try{cliManifest=JSON.parse(await fs.readFile(path.join(cache,'manifest.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const row of catalog.filter(r=>selected.includes(r.app))){
  console.log(row.app+' '+row.version+' 공식 CLI 준비');
  const archive=path.join(cache,'archives',row.app+'-'+row.version+'.zip');await download(row.url,archive,row.archive_sha256);
  const binary=path.join(cache,'bin',row.app+'-'+row.version,row.app+'-cli');const binarySha256=await extractExecutable(archive,row.app+'-cli',binary);
  const item={...row,binary:path.relative(cache,binary),binarySha256,verified:true};cliManifest.apps=cliManifest.apps.filter(r=>r.app!==row.app).concat(item);
 }
 let upscaleEngineDir=previous.upscaleEngineDir;
 if(selected.includes('photocraft')){
  const engineUrl='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-macos.zip';
  const engineArchive=path.join(root,'engines/realesrgan-20220424.zip');
  const engineSha='e0ad05580abfeb25f8d8fb55aaf7bedf552c375b5b4d9bd3c8d59764d2cc333a';
  console.log('로컬 AI 업스케일 엔진과 모델 준비');await download(engineUrl,engineArchive,engineSha);
  upscaleEngineDir=path.join(root,'engines/realesrgan-20220424');
  for(const member of ['realesrgan-ncnn-vulkan','models/realesrgan-x4plus.bin','models/realesrgan-x4plus.param','models/realesrgan-x4plus-anime.bin','models/realesrgan-x4plus-anime.param'])
   await extractExactFile(engineArchive,member,path.join(upscaleEngineDir,member),member==='realesrgan-ncnn-vulkan'?0o755:0o600);
  await fs.copyFile(path.join(bundle,'licenses/Real-ESRGAN.txt'),path.join(upscaleEngineDir,'LICENSE-Real-ESRGAN.txt'));
  await fs.copyFile(path.join(bundle,'licenses/ncnn.txt'),path.join(upscaleEngineDir,'LICENSE-ncnn.txt'));
 }
 await fs.writeFile(path.join(cache,'manifest.json'),JSON.stringify(cliManifest,null,2)+'\n',{mode:0o600});
 const config={workspace,cliRoot:cache,stateDir:path.join(root,'state'),docsRoot:path.join(runtimeRoot,'docs'),runtimeRoot,version:manifest.version,bundleFingerprint:manifest.fingerprint,...(upscaleEngineDir?{upscaleEngineDir}:{})};
 await fs.mkdir(config.stateDir,{recursive:true,mode:0o700});await fs.chmod(config.stateDir,0o700);
 await fs.writeFile(path.join(root,'config.json'),JSON.stringify(config,null,2)+'\n',{mode:0o600});
 await fs.mkdir(path.join(root,'bin'),{recursive:true});
 const nodeLink=path.join(root,'bin/node');try{await fs.symlink(process.execPath,nodeLink);}catch(error){if(error.code!=='EEXIST')throw error;const real=await fs.realpath(nodeLink);if(real!==await fs.realpath(process.execPath))throw Error('Existing runtime Node link differs; update was not forced');}
 for(const file of ['launch-mcp.sh','tunnel-command.mjs','run-tunnel.mjs','downloads.mjs'])await fs.copyFile(path.join(bundle,'installer',file),path.join(root,file));
 await fs.chmod(path.join(root,'launch-mcp.sh'),0o755);
 const pluginRoot=path.join(home,'.codex/plugins/artcraft-control');
 const marker=path.join(pluginRoot,'.artcraft-install');
 try{await fs.access(pluginRoot);await fs.access(marker);}catch(error){if(error.code!=='ENOENT')throw error;try{await fs.access(pluginRoot);throw Error('Existing plugin directory is not owned by this installer');}catch(e){if(e.code!=='ENOENT')throw e;}}
 await fs.mkdir(pluginRoot,{recursive:true});await fs.cp(path.join(bundle,'plugins/artcraft-control'),pluginRoot,{recursive:true});await fs.writeFile(marker,'ArtCraft MCP local installer\n');
 const mcpFile=path.join(pluginRoot,'mcp.json'),mcp=JSON.parse(await fs.readFile(mcpFile,'utf8'));mcp.mcpServers.artcraft.env={ARTCRAFT_INSTALL_ROOT:root};await fs.writeFile(mcpFile,JSON.stringify(mcp,null,2)+'\n');
 const marketplace=await registerMarketplace(home,pluginRoot);
 await fs.copyFile(path.join(bundle,'tools-catalog.json'),path.join(root,'tools-catalog.json'));
 const {checkInstall}=await import(pathToFileURL(path.join(runtimeRoot,'check-install.mjs')).href);const check=await checkInstall(root);
 const result={installed:true,version:manifest.version,workspace,root,runtimeRoot,marketplace,pluginRoot,check};
 await fs.writeFile(path.join(root,'installation-report.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(result,null,2));return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const values={};const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2){if(!['--install-root','--workspace','--apps'].includes(args[i])||!args[i+1])throw Error('Unknown or missing installer option');values[args[i]]=args[i+1];}
 if(!values['--install-root'])throw Error('--install-root is required');
 try{await install({installRoot:values['--install-root'],workspace:values['--workspace'],apps:values['--apps']});}catch(error){console.error('설치 실패: '+error.message);process.exitCode=1;}
}
