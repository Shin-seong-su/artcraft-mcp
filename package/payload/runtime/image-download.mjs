import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';

const denied=new BlockList();
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])denied.addSubnet(ip,bits,'ipv4');
export function imageUrl(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.hash||(url.port&&url.port!=='443')||isIP(url.hostname)===6||url.hostname.startsWith('['))throw Error('Image URL must be a public HTTPS URL on port 443 without credentials');
 return url;
}
export async function publicImageHost(url){
 const addresses=await lookup(url.hostname,{family:4,all:true});
 if(!addresses.length||addresses.some(a=>denied.check(a.address,'ipv4')))throw Error('Image URL must not resolve to a local, private or reserved network');
 return addresses[0].address;
}
export async function downloadImage(value,redirects=0){
 if(redirects>3)throw Error('Too many image redirects');
 const url=imageUrl(value),address=await publicImageHost(url);
 const response=await new Promise((resolve,reject)=>{
  // Pin the checked address, including on redirects: DNS changes cannot turn
  // a public download into a request to the user's LAN or loopback services.
  const req=https.get(url,{family:4,autoSelectFamily:false,lookup:(_host,_options,cb)=>cb(null,address,4)},resolve);
  req.setTimeout(20000,()=>req.destroy(Error('Image download timed out')));req.once('error',reject);
 });
 if([301,302,303,307,308].includes(response.statusCode)){
  const next=response.headers.location;response.resume();if(!next)throw Error('Image redirect has no location');
  return downloadImage(new URL(next,url).href,redirects+1);
 }
 if(response.statusCode!==200){response.destroy();throw Error('Image download failed with HTTP '+response.statusCode);}
 if(Number(response.headers['content-length'])>100*1024*1024){response.destroy();throw Error('Image download exceeds 100 MB');}
 let size=0;const chunks=[];
 for await(const chunk of response){size+=chunk.length;if(size>100*1024*1024){response.destroy();throw Error('Image download exceeds 100 MB');}chunks.push(chunk);}
 return Buffer.concat(chunks);
}
