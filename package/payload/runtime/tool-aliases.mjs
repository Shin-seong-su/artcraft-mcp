export const PHOTOCRAFT_ALIASES=Object.freeze({photocraft_connect:'artcraft_connect',photocraft_tools:'artcraft_tools',photocraft_call:'artcraft_call',photocraft_launch:'artcraft_launch',photocraft_show_file:'artcraft_show_file'});
export const photoCraftFileTool={
 name:'photocraft_selection_apply_file',
 description:'Apply a reviewed generated PNG supplied as a ChatGPT file to an already prepared PhotoCraft LIVE selection. Use the ChatGPT file input, never a sandbox path. The file is downloaded over HTTPS and applied as a selection-masked layer. Visually review first; never retry an uncertain write.',
 inputSchema:{type:'object',properties:{job_id:{type:'string',pattern:'^[a-f0-9-]{36}$'},file:{type:'object',properties:{download_url:{type:'string'},file_id:{type:'string'},mime_type:{type:'string'},file_name:{type:'string'}},required:['download_url','file_id'],additionalProperties:false},resize_to_canvas:{type:'boolean',default:false},visual_review:{type:'object',properties:{reference_preserved:{type:'boolean'},objects_connected:{type:'boolean'},seams_absent:{type:'boolean'},notes:{type:'string',minLength:10,maxLength:4000}},required:['reference_preserved','objects_connected','seams_absent','notes'],additionalProperties:false}},required:['job_id','file','visual_review'],additionalProperties:false},
 annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},_meta:{'openai/fileParams':['file']}
};
export function selectionFileArguments(args){
 const f=args.file;if(!f||typeof f.download_url!=='string'||typeof f.file_id!=='string'||!f.file_id)throw Error('ChatGPT file input must provide file_id and download_url');
 if(f.mime_type&&f.mime_type!=='image/png')throw Error('Expected a PNG file');
 return {job_id:args.job_id,generated_url:f.download_url,resize_to_canvas:args.resize_to_canvas===true,visual_review:args.visual_review};
}
export function mergePhotoCatalog(native,extras,query='',limit=12,offset=0){
 const q=String(query).trim().toLowerCase();
 const isSelectionIntent=/^(ai|인공지능|생성형|생성|선택|지우기|제거|합성|편집)$/.test(q);
 const added=extras.filter(t=>!q||(t.name+' '+t.description).toLowerCase().includes(q)||(isSelectionIntent&&t.name.startsWith('generative_selection_')));
 const items=[...added,...native.tools.filter(t=>!added.some(a=>a.name===t.name))];
 return {...native,count:items.length,offset,tools:items.slice(offset,offset+limit),nextOffset:offset+limit<items.length?offset+limit:null};
}
export function photoCraftTools(tools){
 return Object.entries(PHOTOCRAFT_ALIASES).map(([name,target])=>{
  const original=tools.find(t=>t.name===target);if(!original)throw Error('Missing ArtCraft tool for PhotoCraft adapter');
  const inputSchema=structuredClone(original.inputSchema);delete inputSchema.properties.app;
  inputSchema.required=(inputSchema.required||[]).filter(k=>k!=='app');
  if(name==='photocraft_connect')inputSchema.properties.mode.default='headless';
  const hint=name==='photocraft_tools'?' Generative AI selection editing is provided separately from native tools: query="generative" discovers generative_selection_prepare and generative_selection_apply. Local AI upscaling: query="upscale" discovers ai_upscale_start and ai_upscale_status.':name==='photocraft_call'?' For generative selection editing discover photocraft_tools(query="generative"); the host must pass the returned reference image to an image editor. For local upscaling discover query="upscale".':'';
  return {...original,name,description:`PhotoCraft only. No app argument. ${name==='photocraft_connect'?'Connect mode=headless for file editing, or live for a desktop app with its control channel. Default headless.':original.description}${hint}`,inputSchema};
 });
}
