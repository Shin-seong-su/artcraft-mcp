import path from 'node:path';
import fs from 'node:fs/promises';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import readline from 'node:readline';
import {accountFor,SERVICE} from './tunnel-command.mjs';
const root=process.argv[2],exec=promisify(execFile);
if(!root||!path.isAbsolute(root))throw Error('Missing install root');
let key;
try{key=(await exec('/usr/bin/security',['find-generic-password','-a',accountFor(root),'-s',SERVICE,'-w'],{maxBuffer:8192})).stdout.trim();}
catch{throw Error('ArtCraft 런타임 키를 키체인에서 읽지 못했습니다. 연결 설정을 다시 실행하세요.');}
if(!/^sk-[A-Za-z0-9_-]{10,2048}$/.test(key))throw Error('Invalid runtime key in Keychain');
await fs.mkdir(path.join(root,'state'),{recursive:true,mode:0o700});
const env={HOME:process.env.HOME,PATH:path.join(root,'bin')+':/usr/bin:/bin',ARTCRAFT_INSTALL_ROOT:root,CONTROL_PLANE_API_KEY:key,HEALTH_URL_FILE:path.join(root,'state/health-url')};
const child=spawn(path.join(root,'bin/tunnel-client'),['run','--profile','artcraft-local','--profile-dir',path.join(root,'state/profiles')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
for(const [stream,out] of [[child.stdout,process.stdout],[child.stderr,process.stderr]])readline.createInterface({input:stream}).on('line',line=>out.write(line.replaceAll(key,'[redacted]')+'\n'));
child.once('error',()=>{console.error('ArtCraft tunnel-client could not start');process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
child.once('exit',code=>{process.exitCode=code||0;});
