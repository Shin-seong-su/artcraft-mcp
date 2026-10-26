import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {download,extractExecutable,sha} from './downloads.mjs';
const exec=promisify(execFile);
export const SERVICE='local.artcraft.chatgpt';
export const accountFor=root=>'artcraft-'+sha(Buffer.from(path.resolve(root))).slice(0,16);
export const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function launchAgent(root,home=os.homedir()){
 const args=[path.join(root,'bin/node'),path.join(root,'run-tunnel.mjs'),root];
 return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>'+SERVICE+'</string><key>ProgramArguments</key><array>'+args.map(a=>'<string>'+xml(a)+'</string>').join('')+'</array><key>WorkingDirectory</key><string>'+xml(root)+'</string><key>EnvironmentVariables</key><dict><key>HOME</key><string>'+xml(home)+'</string><key>PATH</key><string>'+xml(path.join(root,'bin')+':/usr/bin:/bin')+'</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>StandardOutPath</key><string>'+xml(path.join(root,'state/tunnel.log'))+'</string><key>StandardErrorPath</key><string>'+xml(path.join(root,'state/tunnel-error.log'))+'</string></dict></plist>\n';
}
export async function putKey(root,key,run){
 if(!/^sk-[A-Za-z0-9_-]{10,2048}$/.test(key))throw Error('올바른 런타임 키를 로컬 입력창에 넣어주세요.');
 const input=`add-generic-password -U -a ${accountFor(root)} -s ${SERVICE} -w ${key}\n`;
 // security's interactive command input avoids putting the key in process argv.
 if(run)await run('/usr/bin/security',['-i'],{input});
 else await new Promise((resolve,reject)=>{
   const child=spawn('/usr/bin/security',['-i'],{stdio:['pipe','ignore','pipe']});child.stderr.resume();child.once('error',()=>reject(Error('키체인 저장 실패')));
   child.once('close',code=>code===0?resolve():reject(Error('키체인 저장 실패. 비밀 출력은 표시하지 않았습니다.')));child.stdin.end(input);
  });
 try{const result=await (run||exec)('/usr/bin/security',['find-generic-password','-a',accountFor(root),'-s',SERVICE,'-w'],{maxBuffer:8192});if(result.stdout.trim()!==key)throw Error('mismatch');}
 catch{throw Error('키체인 저장 확인 실패. 연결을 시작하지 않았습니다.');}
}
export async function ensureTunnelClient(root){
 const catalog=JSON.parse(await fs.readFile(path.join(root,'tools-catalog.json'),'utf8'));
 const row=catalog.tunnelClient[process.arch];if(!row)throw Error('지원하지 않는 Mac 아키텍처');
 const binary=path.join(root,'bin/tunnel-client'),record=path.join(root,'state/tunnel-install.json');
 try{const old=JSON.parse(await fs.readFile(record,'utf8'));if(old.archiveSha256===row.sha256&&sha(await fs.readFile(binary))===old.binarySha256)return binary;}catch(error){if(error.code!=='ENOENT')throw error;}
 const archive=path.join(root,'bootstrap',row.asset);await download(row.url,archive,row.sha256);const binarySha256=await extractExecutable(archive,'tunnel-client',binary);
 await fs.writeFile(record,JSON.stringify({version:row.version,archiveSha256:row.sha256,binarySha256},null,2),{mode:0o600});return binary;
}
export async function health(root){
 try{
  const value=(await fs.readFile(path.join(root,'state/health-url'),'utf8')).trim(),url=new URL(value);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('Invalid health URL');
  const response=await fetch(new URL('/readyz',url),{signal:AbortSignal.timeout(1500)});
  return {ready:response.ok,localHealthUrl:url.href};
 }catch{return {ready:false};}
}
export async function configureTunnel(root,tunnelId,key,{home=os.homedir(),start=true,run=exec,client}={}){
 if(!/^tunnel_[A-Za-z0-9_-]+$/.test(tunnelId))throw Error('올바른 Tunnel ID가 필요합니다.');
 const config=JSON.parse(await fs.readFile(path.join(root,'config.json'),'utf8'));if(!config.runtimeRoot)throw Error('설치를 먼저 완료하세요.');
 const file=path.join(home,'Library/LaunchAgents',SERVICE+'.plist');
 try{
  await fs.access(file);const existing=JSON.parse((await exec('/usr/bin/plutil',['-convert','json','-o','-',file])).stdout);
  if(JSON.stringify(existing.ProgramArguments)!==JSON.stringify([path.join(root,'bin/node'),path.join(root,'run-tunnel.mjs'),root]))throw Error('기존의 다른 로그인 서비스는 덮어쓰지 않았습니다.');
 }catch(error){if(error.code!=='ENOENT')throw error;}
 const binary=client||await ensureTunnelClient(root);
 await putKey(root,key,run===exec?undefined:run);
 const profileDir=path.join(root,'state/profiles');await fs.mkdir(profileDir,{recursive:true,mode:0o700});
 await run(binary,['init','--sample','sample_mcp_stdio_local','--profile','artcraft-local','--profile-dir',profileDir,'--force','--tunnel-id',tunnelId,'--control-plane-api-key-ref','env:CONTROL_PLANE_API_KEY','--mcp-command','/bin/sh '+quote(path.join(root,'launch-mcp.sh')),'--health-listen-addr','127.0.0.1:0'],{cwd:root,env:{HOME:home,PATH:path.join(root,'bin')+':/usr/bin:/bin'},timeout:15000,maxBuffer:16384});
 await fs.writeFile(path.join(root,'state/tunnel.json'),JSON.stringify({tunnelId,keychainService:SERVICE,keychainAccount:accountFor(root)},null,2),{mode:0o600});
 await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,launchAgent(root,home),{mode:0o600});
 if(start){
  const target=`gui/${process.getuid()}`;await run('/bin/launchctl',['bootout',target+'/'+SERVICE],{timeout:10000}).catch(()=>{});
  await run('/bin/launchctl',['bootstrap',target,file],{timeout:10000});
 }
 return {configured:true,started:start,tunnelId,launchAgent:file,profileDir,note:'Ready status and a real ChatGPT tool call are still required before claiming an end-to-end connection.'};
}
async function main(){
 const root=process.env.ARTCRAFT_INSTALL_ROOT||path.join(os.homedir(),'Library/Application Support/ArtCraft MCP');const action=process.argv[2];
 if(action==='connect'){
  const id=process.argv[3];let key='';for await(const chunk of process.stdin)key+=chunk;key=key.trim();
  const result=await configureTunnel(root,id,key);key='';
  console.log(JSON.stringify(result,null,2));let state={ready:false};
  for(let i=0;i<30;i++){state=await health(root);if(state.ready)break;await new Promise(r=>setTimeout(r,500));}
  console.log(JSON.stringify(state,null,2));
  console.log('ChatGPT → 플러그인 → 사용자 지정 MCP 추가 → 연결: Tunnel → '+id);
  if(!state.ready){console.error('아직 준비 상태가 아닙니다. 연결 상태.command로 확인하세요.');process.exitCode=1;}
 }else if(action==='status'){
  const state=await health(root);let tunnel=null;try{tunnel=JSON.parse(await fs.readFile(path.join(root,'state/tunnel.json'),'utf8')).tunnelId;}catch{}
  console.log(JSON.stringify({...state,tunnelId:tunnel},null,2));
 }else if(action==='stop'){
  await exec('/bin/launchctl',['bootout',`gui/${process.getuid()}/${SERVICE}`],{timeout:10000}).catch(()=>{});console.log('ArtCraft 개인 터널 중지 요청. 작업 파일과 기존 다른 연결은 유지됩니다.');
 }else throw Error('connect, status 또는 stop을 지정하세요.');
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main().catch(error=>{console.error('연결 설정 실패: '+error.message);process.exitCode=1;});
