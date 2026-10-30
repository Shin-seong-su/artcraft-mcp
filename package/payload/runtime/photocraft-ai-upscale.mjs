import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import Ajv from 'ajv';
import {runtimeConfig} from './runtime-config.mjs';

const schema=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
export const upscaleTools=[
 {name:'ai_upscale_start',description:'Run local Real-ESRGAN on an explicit PNG file under the workspace. Original remains unchanged; creates a new flattened PNG in a unique job directory. This does not change an open PhotoCraft document. Use doc_export first for layered documents. AI may alter details and alpha edges; compare visually.',inputSchema:schema({input_path:{type:'string',minLength:1},scale:{type:'integer',enum:[2,4],default:2},model:{type:'string',enum:['photo','illustration'],default:'photo'}},['input_path']),annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'ai_upscale_status',description:'Check local AI upscale progress, output path, dimensions, and errors. A finished image can be opened separately with PhotoCraft doc_open or show_file.',inputSchema:schema({job_id:{type:'string',pattern:'^[a-f0-9-]{36}$'}},['job_id']),annotations:{readOnlyHint:true}}
];
export const isUpscaleTool=name=>upscaleTools.some(t=>t.name===name);
export const isUpscaleQuery=query=>/^(upscale|ai.?upscale|업스케일)/i.test(String(query||''));
export function upscaleCatalog(query='',limit=12,offset=0){return {app:'photocraft',mode:'local_external_engine',count:upscaleTools.length,offset,tools:upscaleTools.slice(offset,offset+limit),nextOffset:offset+limit<upscaleTools.length?offset+limit:null};}
const ajv=new Ajv({strict:false});const valid=new Map(upscaleTools.map(t=>[t.name,ajv.compile(t.inputSchema)]));
const response=data=>({content:[{type:'text',text:JSON.stringify(data,null,2)}]});
const defaultEngine=runtimeConfig.upscaleEngineDir;
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
  const relative=path.relative(root,input);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Input must be inside the configured workspace');
  const stat=await fs.stat(input);if(!stat.isFile()||stat.size>100*1024*1024)throw Error('Input must be a PNG file of at most 100 MB');
  const data=await fs.readFile(input),size=dimensions(data);const scale=args.scale??2;
  if(size.width*size.height*scale*scale>64000000)throw Error('Output exceeds 64 megapixels; use a smaller image or scale');
  const bin=path.join(this.engineDir,'realesrgan-ncnn-vulkan'),models=path.join(this.engineDir,'models');
  const model=args.model==='illustration'?'realesrgan-x4plus-anime':'realesrgan-x4plus';
  await Promise.all([fs.access(bin,fs.constants.X_OK),fs.access(path.join(models,model+'.bin')),fs.access(path.join(models,model+'.param'))]);
  const id=randomUUID(),dir=this.directory(id);await fs.mkdir(dir,{recursive:false,mode:0o700}).catch(async e=>{if(e.code!=='ENOENT')throw e;await fs.mkdir(path.dirname(dir),{recursive:true,mode:0o700});await fs.mkdir(dir,{mode:0o700});});
  const local=path.join(dir,'input.png'),output=path.join(dir,'upscaled.png');await fs.writeFile(local,data,{mode:0o600,flag:'wx'});
  const job={job_id:id,status:'running',engine:'Real-ESRGAN ncnn Vulkan',model,scale,input_path:input,source_size:size,output_size:{width:size.width*scale,height:size.height*scale},output_path:output,original_unchanged:true,flattened:true,started_at:new Date().toISOString()};
  await this.save(job);this.running.add(id);
  const child=spawn(bin,['-i',local,'-o',output,'-n',model,'-s',String(scale),'-t','128','-j','1:1:1','-m',models],{stdio:['ignore','ignore','pipe']});
  let errorText='';child.stderr.on('data',b=>{errorText=(errorText+b.toString()).slice(-3000);});
  const timer=setTimeout(()=>child.kill('SIGTERM'),600000);timer.unref();let handled=false;
  const finish=async(error,code)=>{if(handled)return;handled=true;clearTimeout(timer);
   try{if(error||code!==0)throw Error(error?.message||`AI engine exited with code ${code}: ${errorText}`);
    const result=dimensions(await fs.readFile(output));if(result.width!==job.output_size.width||result.height!==job.output_size.height)throw Error('Output dimensions do not match requested scale');
    job.status='completed';job.completed_at=new Date().toISOString();
   }catch(e){job.status='failed';job.error=String(e.message).slice(0,3000);}
   try{await this.save(job);}catch(e){process.stderr.write('Unable to save AI upscale job status: '+String(e.message)+'\n');}finally{this.running.delete(id);}
  };
  child.once('error',e=>void finish(e,null));child.once('close',code=>void finish(null,code));
  return response(job);
 }
}
