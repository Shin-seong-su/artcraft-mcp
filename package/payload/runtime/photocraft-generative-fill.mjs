import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID, createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import Ajv from 'ajv';
import {downloadImage} from './image-download.mjs';
import {buildGenerationPlan,GENERATION_POLICY_VERSION} from './photocraft-generation-policy.mjs';

const object=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const jobId={type:'string',pattern:'^[a-f0-9-]{36}$'};
const visualReview=object({reference_preserved:{type:'boolean'},objects_connected:{type:'boolean'},seams_absent:{type:'boolean'},notes:{type:'string',minLength:10,maxLength:4000}},['reference_preserved','objects_connected','seams_absent','notes']);
export const fillTools=[
 {name:'generative_reference_chunk',description:'Read one base64 byte chunk of the prepared reference PNG so a host that supports base64 image inputs can reconstruct it without relying on an MCP image block. Verify the returned SHA-256. Do not guess bytes or print base64 in user-visible chat. Use only when the host can provide binary or data-URL image input to an editor. Preview and full source are distinct.',inputSchema:object({job_id:jobId,index:{type:'integer',minimum:0,maximum:2047},representation:{type:'string',enum:['preview','original'],default:'preview'}},['job_id','index']),annotations:{readOnlyHint:true,destructiveHint:false}},
 {name:'generative_upload_chunk',description:'Receive one independently base64-encoded chunk of an AI-generated PNG for a prepared selection job. Encode raw byte chunks separately, use 0-based indices and preserve order. Repeating the identical chunk is safe; conflicting data is rejected. Upload only if the host can access the actual generated PNG bytes; never invent or reconstruct base64.',inputSchema:object({job_id:jobId,index:{type:'integer',minimum:0,maximum:511},data:{type:'string',minLength:4,maxLength:262144,pattern:'^[A-Za-z0-9+/]*={0,2}$'}},['job_id','index','data']),annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'generative_upload_finish',description:'Assemble the uploaded PNG chunks for a prepared selection job. Supply the exact SHA-256 of the original complete PNG bytes. Validates SHA-256 and PNG before returning generated_path for the normal visually reviewed apply. Does not edit the document.',inputSchema:object({job_id:jobId,chunk_count:{type:'integer',minimum:1,maximum:512},sha256:{type:'string',pattern:'^[a-f0-9]{64}$'}},['job_id','chunk_count','sha256']),annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'generative_selection_prepare',description:'Prepare an external AI edit for the current LIVE PhotoCraft selection. Keeps the actual freeform selection for a mask on the generated layer. Inspect the reference and provide a grounded description and constraints. Do not change the document or selection before applying.',inputSchema:object({prompt:{type:'string',minLength:1,maxLength:8000},reference_description:{type:'string',minLength:10,maxLength:3000},structure_constraints:{type:'array',items:{type:'string',minLength:5,maxLength:500},minItems:1,maxItems:12}},['prompt','reference_description','structure_constraints']),annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'generative_selection_apply',description:'Apply a visually reviewed external AI PNG as a new layer masked by the original LIVE selection. The original remains below. Selection and document must be unchanged since preparation. Do not replay an interrupted apply.',inputSchema:{...object({job_id:jobId,generated_path:{type:'string',minLength:1},generated_url:{type:'string',minLength:1},resize_to_canvas:{type:'boolean',default:false},visual_review:visualReview},['job_id','visual_review']),oneOf:[{required:['generated_path'],not:{required:['generated_url']}},{required:['generated_url'],not:{required:['generated_path']}}]},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true}},
 {name:'generative_fill_prepare',description:'Prepare an EXTERNAL image edit with server-owned preservation, structural continuity and visual-review rules. Inspect the reference first and supply reference_description and observable structure_constraints. Intact reference and full_layer output are defaults: the original stays below a complete AI result. rect=[x,y,w,h] is a focus area, not a crop boundary. Use region mode or blank_region=true only when explicitly requested. The host generates externally, reviews the full candidate, then applies.',inputSchema:object({prompt:{type:'string',minLength:1,maxLength:8000},rect:{type:'array',items:{type:'integer',minimum:0},minItems:4,maxItems:4},blank_region:{type:'boolean',default:false},output_mode:{type:'string',enum:['full_layer','region'],default:'full_layer'},scene_type:{type:'string',enum:['general','landscape'],default:'general'},reference_description:{type:'string',minLength:10,maxLength:3000},structure_constraints:{type:'array',items:{type:'string',minLength:5,maxLength:500},minItems:1,maxItems:12}},['prompt','rect','reference_description','structure_constraints']),annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'generative_fill_apply',description:'Add the reviewed external PNG as a new layer above the protected original. Default is the WHOLE AI result; no automatic strip cropping. Provide generated_path or a public HTTPS generated_url, and an honest host visual_review after inspecting the full candidate. Failed visual review rejects application and returns revision instructions. Original pixels are independently verified with the new layer hidden. Size changes require resize_to_canvas=true (same aspect ratio). Never retry interrupted writes.',inputSchema:{...object({job_id:jobId,generated_path:{type:'string',minLength:1},generated_url:{type:'string',minLength:1},resize_to_canvas:{type:'boolean',default:false},visual_review:visualReview},['job_id','visual_review']),oneOf:[{required:['generated_path'],not:{required:['generated_url']}},{required:['generated_url'],not:{required:['generated_path']}}]},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true}},
 {name:'generative_fill_status',description:'Read the prepared/applied/failed status, paths and verification report for a generative fill job. A failed/uncertain application is never automatically replayed.',inputSchema:object({job_id:jobId},['job_id']),annotations:{readOnlyHint:true}}
];
// Present editing first; transfer tools follow preparation and application.
fillTools.push(...fillTools.splice(0,3));
export const isFillTool=name=>fillTools.some(t=>t.name===name);
export const isFillQuery=query=>/^(generative|ai.?fill|생성형)/i.test(String(query||''));
const ajv=new Ajv({strict:false});
const validators=new Map(fillTools.map(t=>[t.name,ajv.compile(t.inputSchema)]));
export function fillCatalog(query='',limit=12,offset=0){
 const q=query.toLowerCase();const matches=fillTools.filter(t=>(t.name+' '+t.description).toLowerCase().includes(q));
 return {app:'photocraft',policyVersion:GENERATION_POLICY_VERSION,defaults:{reference:'intact',outputMode:'full_layer',visualReview:'required_host_report'},count:matches.length,offset,tools:matches.slice(offset,offset+limit),nextOffset:offset+limit<matches.length?offset+limit:null};
}
const decode=r=>{
 if(r.isError)throw Error(r.content?.find(c=>c.type==='text')?.text||'Native PhotoCraft operation failed');
 return JSON.parse(r.content.find(c=>c.type==='text').text);
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const signature=(doc,session)=>JSON.stringify({active:session.active,document:session.documents.find(d=>d.index===session.active),doc});
export function checkRect(rect,width,height){
 if(!Array.isArray(rect)||rect.length!==4||rect.some(n=>!Number.isSafeInteger(n)||n<0)||rect[2]<1||rect[3]<1||rect[0]+rect[2]>width||rect[1]+rect[3]>height)throw Error('rect must be a nonempty [x,y,width,height] inside the document');
}
export function readPng(bytes){
 if(bytes.length>100*1024*1024||bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Expected a bounded PNG image');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
 if(!w||!h||w*h>16777216)throw Error('Image exceeds the 16 megapixel limit');
 return PNG.sync.read(bytes);
}
export function makePatch(source,generated,rect){
 if(generated.width!==source.width||generated.height!==source.height)throw Error(`Generated PNG must match the ${source.width}x${source.height} canvas exactly; automatic resizing is disabled`);
 checkRect(rect,source.width,source.height);
 const patch=new PNG({width:source.width,height:source.height});
 const [x,y,w,h]=rect;
 for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++){
  const i=(row*source.width+col)*4;
  if(generated.data[i+3]!==255)throw Error('Generated rectangle must be opaque');
  generated.data.copy(patch.data,i,i,i+4);
 }
 return patch;
}
export function resizeGenerated(image,width,height,allowPreviewRounding=false){
 if(image.width===width&&image.height===height)return image;
 if(!allowPreviewRounding&&image.width*height!==image.height*width)throw Error('Generated image aspect ratio differs; resampling would distort the result');
 const result=new PNG({width,height});
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=Math.max(0,Math.min(image.width-1,(x+0.5)*image.width/width-0.5));
  const sy=Math.max(0,Math.min(image.height-1,(y+0.5)*image.height/height-0.5));
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(x0+1,image.width-1),y1=Math.min(y0+1,image.height-1),dx=sx-x0,dy=sy-y0;
  for(let c=0;c<4;c++)result.data[(y*width+x)*4+c]=Math.round(
   image.data[(y0*image.width+x0)*4+c]*(1-dx)*(1-dy)+image.data[(y0*image.width+x1)*4+c]*dx*(1-dy)+
   image.data[(y1*image.width+x0)*4+c]*(1-dx)*dy+image.data[(y1*image.width+x1)*4+c]*dx*dy);
 }
 return result;
}
export function verifyComposite(source,result,rect){
 if(source.width!==result.width||source.height!==result.height)throw Error('Result canvas size changed');
 let outsideChanged=0,insideChanged=0;const [x,y,w,h]=rect;
 for(let row=0;row<source.height;row++)for(let col=0;col<source.width;col++){
  const i=(row*source.width+col)*4;
  if(!source.data.subarray(i,i+4).equals(result.data.subarray(i,i+4))){
   if(col>=x&&col<x+w&&row>=y&&row<y+h)insideChanged++;else outsideChanged++;
  }
 }
 return {outsideChangedPixels:outsideChanged,insideChangedPixels:insideChanged,outsidePreserved:outsideChanged===0};
}

// The image model belongs to the calling AI host. No model API keys or silent
// fallback to content-aware fill exist here. HTTPS only downloads host results.
export class PhotoGenerativeFill {
 constructor({root,native}){this.root=root;this.native=native;this.instance=randomUUID();this.queue=Promise.resolve();}
 call(name,args){const work=this.queue.catch(()=>{}).then(()=>{const check=validators.get(name);if(!check||!check(args))throw Error('Invalid generative fill arguments: '+ajv.errorsText(check?.errors));return this.dispatch(name,args);});this.queue=work;return work;}
 async state(){
  const doc=decode(await this.native('doc_inspect',{})),session=decode(await this.native('session_list',{}));
  if(!Array.isArray(session.documents)||!Object.hasOwn(session,'active'))throw Error('This generative fill adapter currently requires a PhotoCraft headless file session. Live GUI editing is not supported yet');
  return {doc,session};
 }
 async command(id,params={}){return decode(await this.native('command_run',{id,params}));}
 dir(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job_id');return path.join(this.root,'output/artcraft-chat/generative-fill',id);}
 async write(job){await fs.writeFile(path.join(this.dir(job.job_id),'job.json'),JSON.stringify(job,null,2),{mode:0o600});}
 async dispatch(name,args){
  if(name==='generative_reference_chunk')return this.referenceChunk(args);
  if(name==='generative_upload_chunk'||name==='generative_upload_finish')return this.upload(name,args);
  if(name==='generative_selection_prepare')return this.prepareSelection(args);
  if(name==='generative_selection_apply')return this.applySelection(args);
  if(name==='generative_fill_prepare')return this.prepare(args);
  const dir=this.dir(args.job_id);const job=JSON.parse(await fs.readFile(path.join(dir,'job.json'),'utf8'));
  if(name==='generative_fill_status')return {content:[{type:'text',text:JSON.stringify(job,null,2)}]};
  if(name!=='generative_fill_apply')throw Error('Unknown generative fill tool');
  if(args.generated_url){
   if(job.status!=='prepared'||job.instance!==this.instance)throw Error('Job is no longer prepared in this adapter session; inspect status and prepare a new job');
   const bytes=await downloadImage(args.generated_url);readPng(bytes);
   const file=path.join(dir,'generated-download.png');await fs.writeFile(file,bytes,{mode:0o600});
   return this.apply(job,file,args.resize_to_canvas===true,args.visual_review);
  }
  return this.apply(job,args.generated_path,args.resize_to_canvas===true,args.visual_review);
 }
 async referenceChunk({job_id,index,representation='preview'}){
  const job=JSON.parse(await fs.readFile(path.join(this.dir(job_id),'job.json'),'utf8'));
  if(job.kind!=='live_selection'||job.status!=='prepared'||job.instance!==this.instance)throw Error('Selection job is not prepared in this server session');
  const file=representation==='original'?job.sourcePath:job.previewPath;
  const expected=representation==='original'?job.sourceSha256:job.previewSha256;
  if(!file||!expected)throw Error('Prepared reference is unavailable; prepare a new job');
  const bytes=await fs.readFile(file);if(hash(bytes)!==expected)throw Error('Prepared reference was modified');
  const chunkSize=49152,count=Math.ceil(bytes.length/chunkSize);
  if(index>=count)throw Error('Reference chunk index is out of range');
  const chunk=bytes.subarray(index*chunkSize,Math.min(bytes.length,(index+1)*chunkSize));
  return {content:[{type:'text',text:JSON.stringify({job_id,representation,index,chunk_count:count,chunk_bytes:chunk.length,total_bytes:bytes.length,sha256:expected,chunk_sha256:hash(chunk),mime_type:'image/png',data:chunk.toString('base64')})}]};
 }
 async upload(name,args){
  const dir=this.dir(args.job_id),job=JSON.parse(await fs.readFile(path.join(dir,'job.json'),'utf8'));
  if(job.kind!=='live_selection'||job.status!=='prepared'||job.instance!==this.instance)throw Error('Selection job is not prepared in this server session; prepare a new job before uploading');
  const chunkDir=path.join(dir,'upload-chunks');await fs.mkdir(chunkDir,{recursive:true,mode:0o700});
  if(name==='generative_upload_chunk'){
   if(args.data.length%4!==0)throw Error('Each chunk must be independently padded base64');
   const bytes=Buffer.from(args.data,'base64');if(!bytes.length||bytes.toString('base64')!==args.data)throw Error('Invalid or noncanonical base64 chunk');
   const filename=path.join(chunkDir,String(args.index).padStart(3,'0'));
   try{await fs.writeFile(filename,bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;const old=await fs.readFile(filename);if(!old.equals(bytes))throw Error('Chunk index already contains different data');}
   return {content:[{type:'text',text:JSON.stringify({job_id:args.job_id,index:args.index,bytes:bytes.length,sha256:hash(bytes)})}]};
  }
  const names=await fs.readdir(chunkDir);const expected=Array.from({length:args.chunk_count},(_,i)=>String(i).padStart(3,'0'));
  if(names.length!==expected.length||expected.some(n=>!names.includes(n)))throw Error('Chunk set is incomplete or contains unexpected indices');
  let total=0;const chunks=[];for(const n of expected){const b=await fs.readFile(path.join(chunkDir,n));total+=b.length;if(total>100*1024*1024)throw Error('Uploaded PNG exceeds 100 MB');chunks.push(b);}
  const bytes=Buffer.concat(chunks);if(hash(bytes)!==args.sha256)throw Error('Uploaded PNG SHA-256 mismatch');
  const img=readPng(bytes),output=path.join(dir,'received.png');
  try{await fs.writeFile(output,bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST'||!(await fs.readFile(output)).equals(bytes))throw e;}
  return {content:[{type:'text',text:JSON.stringify({job_id:args.job_id,status:'received',generated_path:output,sha256:args.sha256,size:[img.width,img.height],bytes:bytes.length,note:'Transfer validated. Inspect the generated image visually before using generative_selection_apply; receiving a file does not edit PhotoCraft.'})}]};
 }
 async liveState(){
  const ui=decode(await this.native('ui_inspect',{}));
  if(!ui?.session||!ui.document||ui.session.active==null)throw Error('Open a document in the live PhotoCraft app first');
  return {doc:ui.document,session:ui.session};
 }
 async liveSelect(index){return decode(await this.native('control_call',{method:'ui.menu.invoke',params:{id:`window.document.${index}`}}));}
 async prepareSelection({prompt,reference_description,structure_constraints}){
  const {doc,session}=await this.liveState();
  if(!doc.hasSelection||!Array.isArray(doc.selectionBounds))throw Error('Select an area in the open PhotoCraft document first');
  if(doc.mode!=='Rgb'||doc.depth!==8||doc.width*doc.height>16777216)throw Error('Only RGB 8-bit documents up to 16 megapixels are supported');
  const rect=doc.selectionBounds;checkRect(rect,doc.width,doc.height);
  const id=randomUUID(),dir=this.dir(id);await fs.mkdir(dir,{recursive:true,mode:0o700});
  const sourcePath=path.join(dir,'source.png');decode(await this.native('doc_export',{path:sourcePath}));
  const after=await this.liveState();
  if(signature(doc,session)!==signature(after.doc,after.session))throw Error('Document or selection changed while preparing');
  const bytes=await fs.readFile(sourcePath),source=readPng(bytes);
  if(source.width!==doc.width||source.height!==doc.height)throw Error('Exported dimensions do not match the document');
  const plan=buildGenerationPlan({prompt,rect,width:doc.width,height:doc.height,blankRegion:false,outputMode:'region',sceneType:'general',referenceDescription:reference_description,structureConstraints:structure_constraints});
  if(!plan.readyForGeneration)throw Error('Provide an observed reference description and concrete constraints');
  const generationPrompt=plan.generationPrompt+`\nThe intended edit is inside the current selection, whose bounding box is [${rect.join(',')}]. The exact selection can be irregular; use the reference image and preserve the surroundings. PhotoCraft will apply your full-size result through its actual selection mask.`;
  const job={job_id:id,kind:'live_selection',status:'prepared',instance:this.instance,created:new Date().toISOString(),rect,plan,prompt,generationPrompt,sourcePath,inputPath:sourcePath,sourceSha256:hash(bytes),signature:signature(doc,session),width:doc.width,height:doc.height,documentIndex:session.active};
  const scale=Math.min(1,1024/Math.max(source.width,source.height));
  const preview=scale===1?bytes:PNG.sync.write(resizeGenerated(source,Math.max(1,Math.round(source.width*scale)),Math.max(1,Math.round(source.height*scale)),true));
  job.previewPath=path.join(dir,'reference-preview.png');job.previewSha256=hash(preview);await fs.writeFile(job.previewPath,preview,{flag:'wx',mode:0o600});await this.write(job);
  return {content:[{type:'text',text:JSON.stringify({job_id:id,status:'prepared',sourcePath,inputPath:sourcePath,selectionBounds:rect,referenceSize:[source.width,source.height],inlineReferenceSize:[Math.max(1,Math.round(source.width*scale)),Math.max(1,Math.round(source.height*scale))],generationPrompt,policy:plan,note:'The local reference is intact at full resolution; the inline image may be reduced for transport. The bounding box uses full-resolution coordinates and does not describe the exact selection shape. The MCP image block is not proof that the host image generator can consume it. Invoke image EDIT with this exact reference only if the host can explicitly include it as an input image. If it cannot, stop: do not generate from text alone, do not claim an edit, and ask the user to attach the source PNG directly or use a host with verified file handoff. Visually review the result and apply without changing the document or selection.'},null,2)},{type:'image',mimeType:'image/png',data:preview.toString('base64')}]};
 }
 async applySelection(args){
  const job=JSON.parse(await fs.readFile(path.join(this.dir(args.job_id),'job.json'),'utf8'));
  if(job.kind!=='live_selection'||job.status!=='prepared'||job.instance!==this.instance)throw Error('Selection job is not prepared in this adapter session; do not retry an uncertain apply');
  const rejected=['reference_preserved','objects_connected','seams_absent'].filter(k=>args.visual_review?.[k]!==true);
  if(rejected.length)throw Error('Visual review rejected the generated result: '+rejected.join(', '));
  let real;
  if(args.generated_url){const bytes=await downloadImage(args.generated_url);readPng(bytes);real=path.join(this.dir(job.job_id),'generated-download.png');await fs.writeFile(real,bytes,{flag:'wx',mode:0o600});}
  else{const root=await fs.realpath(this.root);real=await fs.realpath(path.resolve(this.root,args.generated_path));const rel=path.relative(root,real);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('generated_path must be inside the project');}
  const sourceBytes=await fs.readFile(job.sourcePath);if(hash(sourceBytes)!==job.sourceSha256)throw Error('Prepared source was modified');
  const source=readPng(sourceBytes),raw=readPng(await fs.readFile(real));
  const generated=args.resize_to_canvas?resizeGenerated(raw,source.width,source.height):raw;
  if(generated.width!==source.width||generated.height!==source.height)throw Error('Generated PNG dimensions differ from the original');
  for(let i=3;i<generated.data.length;i+=4)if(generated.data[i]!==255)throw Error('Generated image must be opaque');
  const before=await this.liveState();if(signature(before.doc,before.session)!==job.signature)throw Error('Document or selection changed since preparation; prepare a new job');
  const checkPath=path.join(this.dir(job.job_id),'before-apply.png');decode(await this.native('doc_export',{path:checkPath}));
  const current=readPng(await fs.readFile(checkPath));if(!current.data.equals(source.data))throw Error('Document pixels changed since preparation');
  const recheck=await this.liveState();if(signature(recheck.doc,recheck.session)!==job.signature)throw Error('Document or selection changed during validation');
  const candidate=path.join(this.dir(job.job_id),'candidate.png');await fs.writeFile(candidate,PNG.sync.write(generated),{flag:'wx',mode:0o600});
  job.status='applying';await this.write(job);
  try{
   decode(await this.native('doc_open',{path:candidate}));
   let ui=await this.liveState();const imported=ui.session.active;
   const target=ui.session.documents.find(d=>d.index===job.documentIndex);
   const old=before.session.documents.find(d=>d.index===job.documentIndex);
   if(!target||target.revision!==old.revision||imported===job.documentIndex)throw Error('Target document changed while opening the candidate');
   const placed=await this.command('layer.copyToDocument',{source:imported,document:job.documentIndex,offset:[0,0]});
   const layer=placed.layers?.[0];if(!Number.isInteger(layer))throw Error('PhotoCraft did not report the new layer id');
   job.layer=layer;job.temporaryDocument=imported;await this.write(job);
   await this.liveSelect(job.documentIndex);
   ui=await this.liveState();if(ui.doc.revision!==old.revision+1||!ui.doc.hasSelection||JSON.stringify(ui.doc.selectionBounds)!==JSON.stringify(job.rect))throw Error('Document or selection changed before masking; inspect the document before retrying');
   if(before.doc.layers?.[0]?.id!==layer)await this.command('layer.moveTo',{layer,target:before.doc.layers[0].id,position:'above'});
   await this.command('layer.layerMask.revealSelection',{layer});
   await this.command('layer.renameLayer',{layer,name:'AI Selection '+job.job_id.slice(0,8)});
   const resultPath=path.join(this.dir(job.job_id),'result.png');decode(await this.native('doc_export',{path:resultPath}));
   const result=readPng(await fs.readFile(resultPath));const verification=verifyComposite(source,result,job.rect);
   await this.command('layer.setProps',{layer,visible:false});
   let underlay;try{const f=path.join(this.dir(job.job_id),'underlay.png');decode(await this.native('doc_export',{path:f}));underlay=readPng(await fs.readFile(f));}finally{await this.command('layer.setProps',{layer,visible:true});}
   verification.originalCompositePreserved=underlay.data.equals(source.data);verification.visualReview={...args.visual_review,provenance:'host_reported'};
   const final=await this.liveState();verification.hasMask=!!final.doc.layers.find(l=>l.id===layer)?.hasMask;
   job.verification=verification;job.resultPath=resultPath;
   if(!verification.hasMask||!verification.originalCompositePreserved||!verification.outsidePreserved||!verification.insideChangedPixels)throw Error('Applied layer failed verification; inspect the document and undo manually');
   job.status='applied';job.applied=new Date().toISOString();await this.write(job);
   return {content:[{type:'text',text:JSON.stringify({job_id:job.job_id,status:job.status,layer,resultPath,verification,note:'A masked AI layer was added in the live document. The imported candidate remains open in a separate tab. Save a new native document to retain layers.'},null,2)},{type:'image',mimeType:'image/png',data:PNG.sync.write(result).toString('base64')}]};
  }catch(error){job.status='failed';job.error=String(error.message);await this.write(job);throw error;}
 }
 async prepare({prompt,rect,blank_region=false,output_mode='full_layer',scene_type='general',reference_description,structure_constraints}){
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>8000)throw Error('A nonempty prompt up to 8000 characters is required');
  const before=await this.state();const {doc,session}=before;
  if(session.active==null)throw Error('Open a PhotoCraft document first');
  if(doc.hasSelection)throw Error('Deselect before preparing a generative fill job; rect defines the edit area. Freehand selections are not yet supported');
  if(doc.mode!=='Rgb'||doc.depth!==8)throw Error('Generative fill currently supports RGB 8-bit documents only; original color mode is never converted automatically');
  checkRect(rect,doc.width,doc.height);
  if(doc.width*doc.height>16777216)throw Error('Document exceeds the 16 megapixel limit');
  const id=randomUUID(),dir=this.dir(id);await fs.mkdir(dir,{recursive:true,mode:0o700});
  const sourcePath=path.join(dir,'source.png');
  decode(await this.native('doc_save',{path:sourcePath}));
  const after=await this.state();
  if(signature(doc,session)!==signature(after.doc,after.session))throw Error('Document changed while preparing the fill. No fill job was created; inspect the document');
  const bytes=await fs.readFile(sourcePath),source=readPng(bytes);
  const target=new PNG({width:source.width,height:source.height});source.data.copy(target.data);
  const [x,y,w,h]=rect;
  if(blank_region)for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++){const i=(row*source.width+col)*4;target.data.fill(255,i,i+4);}
  const input=PNG.sync.write(target);const inputPath=path.join(dir,'edit-target.png');await fs.writeFile(inputPath,input,{flag:'wx'});
  const plan=buildGenerationPlan({prompt,rect,width:doc.width,height:doc.height,blankRegion:blank_region,outputMode:output_mode,sceneType:scene_type,referenceDescription:reference_description,structureConstraints:structure_constraints});
  if(!plan.readyForGeneration)throw Error('Supply a grounded reference_description and at least one concrete structure constraint');
  const generationPrompt=plan.generationPrompt;
  const job={job_id:id,status:'prepared',instance:this.instance,created:new Date().toISOString(),rect,blankRegion:blank_region,outputMode:output_mode,plan,prompt:prompt.trim(),generationPrompt,sourcePath,inputPath,sourceSha256:hash(bytes),signature:signature(doc,session),width:doc.width,height:doc.height,originalLayers:doc.layers};
  await this.write(job);
  return {content:[{type:'text',text:JSON.stringify({job_id:id,status:job.status,sourcePath,inputPath,referencePreserved:!blank_region,outputMode:output_mode,generationPrompt,policy:plan,next:'Follow policy.hostWorkflow: generate from the actual attached reference, inspect the WHOLE candidate, then apply with visual_review and a local generated_path or downloadable public HTTPS generated_url. A ChatGPT sandbox path is not a path on the user Mac. If bytes or a downloadable URL cannot be handed off, explain the limitation. Generation and visual review have not run yet.'},null,2)},{type:'image',mimeType:'image/png',data:input.toString('base64')}]};
 }
 async apply(job,generatedPath,resize=false,review){
  if(job.status!=='prepared')throw Error(`Job is ${job.status}; applying again is prohibited. Inspect generative_fill_status and the document`);
  if(job.instance!==this.instance)throw Error('The fill adapter restarted. Prepare a new job against the current document');
  if(typeof generatedPath!=='string')throw Error('generated_path is required');
  const realRoot=await fs.realpath(this.root),real=await fs.realpath(path.resolve(this.root,generatedPath));
  const rel=path.relative(realRoot,real);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('generated_path must be inside the project');
  const sourceBytes=await fs.readFile(job.sourcePath);if(hash(sourceBytes)!==job.sourceSha256)throw Error('Prepared source was modified');
  const source=readPng(sourceBytes),raw=readPng(await fs.readFile(real));
  const generated=resize?resizeGenerated(raw,source.width,source.height):raw;
  const reviewRecord={...review,provenance:'host_reported',candidateSha256:hash(await fs.readFile(real)),time:new Date().toISOString()};
  job.reviews=[...(job.reviews||[]),reviewRecord];
  const rejected=['reference_preserved','objects_connected','seams_absent'].filter(k=>review?.[k]!==true);
  if(rejected.length){
   job.revisionPrompt=job.generationPrompt+'\nREVISION REQUIRED from this SAME ORIGINAL reference, not a clipped/rejected composite. Failed checks: '+rejected.join(', ')+'. Observed issues: '+review?.notes;
   await this.write(job);throw Error('Visual review rejected application before any document change. Read status.revisionPrompt and regenerate from sourcePath. Failed checks: '+rejected.join(', '));
  }
  delete job.revisionPrompt;
  const mode=job.outputMode||'region';
  const appliedRect=mode==='full_layer'?[0,0,source.width,source.height]:job.rect;
  const patch=makePatch(source,generated,appliedRect);
  const state=await this.state();
  if(signature(state.doc,state.session)!==job.signature)throw Error('The active document/session changed since preparation. Prepare a new job; no layer was added');
  if(state.doc.hasSelection)throw Error('Deselect and prepare a new job; rectangle coordinates define the edit area');
  const dir=this.dir(job.job_id);
  const currentPath=path.join(dir,'pre-apply.png');
  decode(await this.native('doc_save',{path:currentPath}));
  const current=readPng(await fs.readFile(currentPath));
  if(current.width!==source.width||current.height!==source.height||!current.data.equals(source.data))throw Error('Current pixels differ from the prepared source. Prepare a new job; no layer was added');
  const recheck=await this.state();
  if(signature(recheck.doc,recheck.session)!==job.signature)throw Error('Document changed during validation. No layer was added');
  // Files and all validation precede the first document mutation.
  const patchPath=path.join(dir,'generated-patch.png');
  await fs.writeFile(patchPath,PNG.sync.write(patch),{flag:'wx'});
  job.status='applying';job.generatedPath=real;job.patchPath=patchPath;
  job.generatedSize=[raw.width,raw.height];job.resizedToCanvas=raw.width!==generated.width||raw.height!==generated.height;await this.write(job);
  try{
   // Ambient file.* engine commands are intentionally denied by PhotoCraft.
   // Use root-scoped doc_open, then copy pixels between in-memory documents.
   const imported=decode(await this.native('doc_open',{path:patchPath}));
   job.temporaryDocument=imported.index;await this.write(job);
   const placed=await this.command('layer.copyToDocument',{source:imported.index,document:state.session.active,center:false,offset:[0,0]});
   decode(await this.native('doc_select',{index:state.session.active}));
   const afterPlace=await this.state();const layer=afterPlace.doc.activeLayer;
   job.layer=layer;job.placement=placed;await this.write(job);
   decode(await this.native('doc_close',{index:imported.index}));
   if(state.doc.layers?.length){await this.command('layer.moveTo',{layer,target:state.doc.layers[0].id,position:'above'});}
   await this.command('layer.renameLayer',{layer,name:(mode==='full_layer'?'AI Full ':'AI Region ')+job.job_id.slice(0,8)});
   const resultPath=path.join(dir,'result.png');decode(await this.native('doc_save',{path:resultPath}));
   const resultImage=readPng(await fs.readFile(resultPath));
   const verification={...verifyComposite(source,resultImage,job.rect),outputMode:mode,originalCompositePreserved:false,visualReview:{...reviewRecord,independentlyVerifiedByServer:false}};
   // Source preservation is measured independently of the AI's visual fidelity.
   // Hide only the layer just added, export the original composite, then restore.
   await this.command('layer.setProps',{layer,visible:false});
   const originalCheckPath=path.join(dir,'original-underlay-check.png');
   let originalCheck;
   try{decode(await this.native('doc_save',{path:originalCheckPath}));originalCheck=readPng(await fs.readFile(originalCheckPath));}
   finally{await this.command('layer.setProps',{layer,visible:true});}
   verification.originalCompositePreserved=originalCheck.width===source.width&&originalCheck.height===source.height&&originalCheck.data.equals(source.data);
   if(mode==='full_layer')verification.resultMatchesGenerated=resultImage.data.equals(generated.data);
   job.verification=verification;job.resultPath=resultPath;job.resultState=(await this.state()).doc;
   if(!verification.originalCompositePreserved||verification.insideChangedPixels===0||(mode==='region'&&!verification.outsidePreserved)||(mode==='full_layer'&&!verification.resultMatchesGenerated))throw Error('Applied layer failed pixel verification. Inspect the document and undo manually if needed; no retry was attempted');
   job.status='applied';job.applied=new Date().toISOString();await this.write(job);
   return {content:[{type:'text',text:JSON.stringify({job_id:job.job_id,status:job.status,layer,resultPath,patchPath,verification,note:'New layer added. Original document has not been overwritten; save a new .pcraft file to preserve layers.'},null,2)},{type:'image',mimeType:'image/png',data:PNG.sync.write(readPng(await fs.readFile(resultPath))).toString('base64')}]};
  }catch(error){job.status='failed';job.error=String(error.message);await this.write(job);throw error;}
 }
}
