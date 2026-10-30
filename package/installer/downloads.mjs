import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function atomicWrite(destination,bytes,mode){
 await fs.mkdir(path.dirname(destination),{recursive:true});const temp=destination+'.new-'+randomUUID();
 try{await fs.writeFile(temp,bytes,{mode,flag:'wx'});await fs.chmod(temp,mode);await fs.rename(temp,destination);}
 finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
export function officialTunnelAsset(release,suffix){
 const name=`tunnel-client-${release.tag_name}-darwin-${suffix}.zip`;
 const asset=release.assets.find(a=>a.name===name);
 if(!asset)throw Error('Official tunnel-client archive missing: '+name);
 return asset;
}
export async function download(url,file,expected){
 if(!/^https:\/\/(github\.com|api\.github\.com|nodejs\.org)\//.test(url))throw Error('Unsupported official download origin');
 try{const bytes=await fs.readFile(file);if(expected&&sha(bytes)===expected)return bytes;}catch(error){if(error.code!=='ENOENT')throw error;}
 const response=await fetch(url,{headers:{'User-Agent':'ArtCraft-MCP-Installer'},signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error(`Official download failed: HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(expected&&sha(bytes)!==expected)throw Error('Official download checksum mismatch');
 await atomicWrite(file,bytes,0o600);return bytes;
}
export async function extractExecutable(archive,basename,destination){
 const {stdout}=await exec('/usr/bin/unzip',['-Z1',archive],{maxBuffer:4*1024*1024});
 const matches=stdout.split('\n').filter(name=>name&&path.posix.basename(name)===basename&&!name.endsWith('/'));
 if(matches.length!==1)throw Error('Archive must contain exactly one '+basename);
 const member=matches[0];
 if(member.startsWith('/')||member.startsWith('-')||member.includes('\\')||member.split('/').includes('..')||/[\x00-\x1f]/.test(member))throw Error('Unsafe archive entry');
 const {stdout:bytes}=await exec('/usr/bin/unzip',['-p',archive,member],{encoding:'buffer',maxBuffer:300*1024*1024});
 if(!['cafebabe','cafebabf','cffaedfe','feedfacf','cefaedfe','feedface'].includes(bytes.subarray(0,4).toString('hex')))throw Error('Expected a native macOS executable');
 await atomicWrite(destination,bytes,0o755);
 return sha(bytes);
}
export async function extractExactFile(archive,member,destination,mode=0o600){
 if(!/^(models\/[a-z0-9-]+\.(?:bin|param)|realesrgan-ncnn-vulkan)$/.test(member))throw Error('Unsupported AI engine archive entry');
 const {stdout}=await exec('/usr/bin/unzip',['-Z1',archive],{maxBuffer:4*1024*1024});
 if(stdout.split('\n').filter(name=>name===member).length!==1)throw Error('Missing or duplicate engine archive entry: '+member);
 const {stdout:bytes}=await exec('/usr/bin/unzip',['-p',archive,member],{encoding:'buffer',maxBuffer:100*1024*1024});
 if(!bytes.length)throw Error('Empty AI engine archive entry: '+member);
 if(member==='realesrgan-ncnn-vulkan'&&!['cafebabe','cafebabf','cffaedfe','feedfacf'].includes(bytes.subarray(0,4).toString('hex')))throw Error('Expected a macOS AI engine executable');
 await atomicWrite(destination,bytes,mode);return sha(bytes);
}
