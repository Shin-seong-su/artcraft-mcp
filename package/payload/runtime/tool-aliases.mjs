export const PHOTOCRAFT_ALIASES=Object.freeze({photocraft_connect:'artcraft_connect',photocraft_tools:'artcraft_tools',photocraft_call:'artcraft_call',photocraft_launch:'artcraft_launch',photocraft_show_file:'artcraft_show_file'});
export function photoCraftTools(tools){
 return Object.entries(PHOTOCRAFT_ALIASES).map(([name,target])=>{
  const original=tools.find(t=>t.name===target);if(!original)throw Error('Missing ArtCraft tool for PhotoCraft adapter');
  const inputSchema=structuredClone(original.inputSchema);delete inputSchema.properties.app;
  inputSchema.required=(inputSchema.required||[]).filter(k=>k!=='app');
  if(name==='photocraft_connect')inputSchema.properties.mode.default='headless';
  const hint=name==='photocraft_tools'?' AI image enhancement and upscaling: query="upscale" discovers ai_upscale_start and ai_upscale_status; JPEG conversion is automatic, and preserve_size can retain original dimensions.':name==='photocraft_call'?' Use ai_upscale_start for local AI image enhancement; discover its schema with photocraft_tools(query="upscale").':'';
  return {...original,name,description:`PhotoCraft only. No app argument. ${name==='photocraft_connect'?'Connect mode=headless for file editing, or live for a desktop app with its control channel. Default headless.':original.description}${hint}`,inputSchema};
 });
}
