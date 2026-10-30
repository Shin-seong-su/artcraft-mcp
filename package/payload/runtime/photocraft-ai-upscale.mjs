import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import Ajv from 'ajv';
import {runtimeConfig} from './runtime-config.mjs';

const schema=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
export const upscaleTools=[
 {name:'ai_upscale_start',description:'Local AI image enhancement and upscaling. Accepts PNG or JPEG in the workspace or Downloads; JPEG is converted automatically. Set preserve_size=true to AI upscale then resize back to original pixel dimensions. Original file remains unchanged and output is a new flattened PNG, not a live document edit. AI can change text, logos, shapes and transparent edges; compare visually. Layered files need explicit flattened export first.',inputSchema:schema({input_path:{type:'string',minLength:1},scale:{type:'integer',enum:[2,4],default:2},model:{type:'string',enum:['photo','illustration'],default:'photo'},preserve_size:{type:'boolean',default:false}},['input_path']),annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'ai_upscale_status',description:'Check local AI upscale progress, output path, dimensions, and errors. A finished image can be opened separately with PhotoCraft doc_open or show_file.',inputSchema:schema({job_id:{type:'string',pattern:'^[a-f0-9-]{36}$'}},['job_id']),annotations:{readOnlyHint:true}}
];
export const isUpscaleTool=name=>upscaleTools.some(t=>t.name===name);
export const isUpscaleQuery=query=>/^(upscale|ai.?upscale|업스케일)/i.test(String(query||''));
export function upscaleCatalog(query='',limit=12,offset=0){return {app:'photocraft',mode:'local_external_engine',count:upscaleTools.length,offset,tools:upscaleTools.slice(offset,offset+limit),nextOffset:offset+limit<upscaleTools.length?offset+limit:null};}
const ajv=new Ajv({strict:false});const valid=new Map(upscaleTools.map(t=>[t.name,ajv.compile(t.inputSchema)]));
const response=data=>({content:[{type:'text',text:JSON.stringify(data,null,2)}]});
const defaultEngine=runtimeConfig.upscaleEngineDir;
const exec=promisify(execFile);
function dimensions(buf){
 if(buf.length<33||buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||buf.toString('ascii',12,16)!=='IHDR')throw Error('Input must be a PNG image');
 const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20);if(!width||!height||buf[24]!==8)throw Error('Only 8-bit PNG images are supported');
 return {width,height};
}
export class PhotoAiUpscale {
 constructor({root,engineDir=defaultEngine}={}){this.root=path.resolve(root);this.engineDir=engineDir;this.running=new Set();this.starting=false;}
 directory(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job id');return path.join(this.root,'output/artcraft-chat/ai-upscale',id);}
 async save(job){const dir=this.directory(job.job_id),tmp=path.join(dir,'status.tmp');await fs.writeFile(tmp,JSON.stringify(job,null,2),{mode:0o600});await fs.rename(tmp,path.join(dir,'status.json'));}
 async call(name,args){
  const check=valid.get(name);if(!check||!check(args))throw Error('Invalid upscale arguments: '+ajv.errorsText(check?.errors));
  if(name==='ai_upscale_status'){
   const job=JSON.parse(await fs.readFile(path.join(this.directory(args.job_id),'status.json'),'utf8'));
   if(job.status==='running'&&!this.running.has(job.job_id))return response({...job,status:'unknown',error:'This server instance cannot confirm whether the job is still running; inspect the job directory before starting a new job.'});
   return response(job);
  }
  if(this.starting||this.running.size)throw Error('Another AI upscale is running; wait for it to finish before starting another');
  this.starting=true;try{return await this.start(args);}finally{this.starting=false;}
 }
 async start(args){
  const root=await fs.realpath(this.root);const input=await fs.realpath(path.resolve(root,args.input_path));
  const downloads=await fs.realpath(path.join(os.homedir(),'Downloads')).catch(()=>null);
  const inside=base=>{if(!base)return false;const rel=path.relative(base,input);return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};
  if(!inside(root)&&!inside(downloads))throw Error('Input must be inside the configured workspace or Downloads');
  const stat=await fs.stat(input);if(!stat.isFile()||stat.size>100*1024*1024)throw Error('Input must be an image file of at most 100 MB');
  const data=await fs.readFile(input),isPng=data.subarray(0,8).toString('hex')==='89504e470d0a1a0a',isJpeg=data.subarray(0,3).toString('hex')==='ffd8ff';
  if(!isPng&&!isJpeg)throw Error('Input must be PNG or JPEG');
  const scale=args.scale??2;
  const bin=path.join(this.engineDir,'realesrgan-ncnn-vulkan'),models=path.join(this.engineDir,'models');
  const model=args.model==='illustration'?'realesrgan-x4plus-anime':'realesrgan-x4plus';
  await Promise.all([fs.access(bin,fs.constants.X_OK),fs.access(path.join(models,model+'.bin')),fs.access(path.join(models,model+'.param'))]);
  const id=randomUUID(),dir=this.directory(id);await fs.mkdir(dir,{recursive:false,mode:0o700}).catch(async e=>{if(e.code!=='ENOENT')throw e;await fs.mkdir(path.dirname(dir),{recursive:true,mode:0o700});await fs.mkdir(dir,{mode:0o700});});
  const local=path.join(dir,'input.png'),output=path.join(dir,'upscaled.png');
  if(isPng)await fs.writeFile(local,data,{mode:0o600,flag:'wx'});
  else{
   const source=path.join(dir,'source.jpg');await fs.writeFile(source,data,{mode:0o600,flag:'wx'});
   const properties=await exec('/usr/bin/sips',['-g','pixelWidth','-g','pixelHeight',source],{timeout:30000,maxBuffer:4096});
   const width=Number(properties.stdout.match(/pixelWidth:\s*(\d+)/)?.[1]),height=Number(properties.stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
   if(!width||!height||width*height*16>64000000)throw Error('The 4x AI processing image exceeds 64 megapixels; use an input of at most 4 megapixels');
   await exec('/usr/bin/sips',['-s','format','png',source,'--out',local],{timeout:60000,maxBuffer:4096});
  }
  const size=dimensions(await fs.readFile(local));if(size.width*size.height*16>64000000)throw Error('The 4x AI processing image exceeds 64 megapixels; use an input of at most 4 megapixels');
  const preserveSize=args.preserve_size===true,processingSize={width:size.width*4,height:size.height*4};
  const outputSize=preserveSize?size:{width:size.width*scale,height:size.height*scale};const needsResize=preserveSize||scale!==4;
  const aiOutput=needsResize?path.join(dir,'ai-upscaled-intermediate.png'):output;
  let photoCli=null;
  if(needsResize){const manifest=JSON.parse(await fs.readFile(path.join(runtimeConfig.cliRoot,'manifest.json'),'utf8'));const row=manifest.apps.find(a=>a.app==='photocraft');if(!row)throw Error('PhotoCraft CLI is required for resampling');photoCli=path.resolve(runtimeConfig.cliRoot,row.binary);await fs.access(photoCli,fs.constants.X_OK);}
  const job={job_id:id,status:'running',engine:'Real-ESRGAN ncnn Vulkan',model,scale,native_scale:4,input_path:input,input_format:isJpeg?'jpeg':'png',source_size:size,processing_size:processingSize,preserve_size:preserveSize,output_size:outputSize,output_path:output,original_unchanged:true,flattened:true,started_at:new Date().toISOString()};
  await this.save(job);this.running.add(id);
  const child=spawn(bin,['-i',local,'-o',aiOutput,'-n',model,'-s','4','-t','128','-j','1:1:1','-m',models],{stdio:['ignore','ignore','pipe']});
  let errorText='';child.stderr.on('data',b=>{errorText=(errorText+b.toString()).slice(-3000);});
  const timer=setTimeout(()=>child.kill('SIGTERM'),600000);timer.unref();let handled=false;
  const finish=async(error,code)=>{if(handled)return;handled=true;clearTimeout(timer);
   try{if(error||code!==0)throw Error(error?.message||`AI engine exited with code ${code}: ${errorText}`);
    const intermediate=dimensions(await fs.readFile(aiOutput));if(intermediate.width!==processingSize.width||intermediate.height!==processingSize.height)throw Error('AI output dimensions do not match requested scale');
    if(needsResize)await exec(photoCli,['run',aiOutput,'--cmd','image.imageSize','--params',JSON.stringify({width:outputSize.width,height:outputSize.height,resample:'lanczos'}),'--out',output],{timeout:180000,maxBuffer:8192});
    const result=dimensions(await fs.readFile(output));if(result.width!==job.output_size.width||result.height!==job.output_size.height)throw Error('Output dimensions do not match requested size');
    job.status='completed';job.completed_at=new Date().toISOString();
   }catch(e){job.status='failed';job.error=String(e.message).slice(0,3000);}
   try{await this.save(job);}catch(e){process.stderr.write('Unable to save AI upscale job status: '+String(e.message)+'\n');}finally{this.running.delete(id);}
  };
  child.once('error',e=>void finish(e,null));child.once('close',code=>void finish(null,code));
  return response(job);
 }
}
