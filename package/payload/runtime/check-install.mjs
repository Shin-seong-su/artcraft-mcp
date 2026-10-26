import fs from 'node:fs/promises';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
export async function checkInstall(root){
 const client=new Client({name:'artcraft-install-check',version:'1'});
 const env={HOME:process.env.HOME,PATH:path.join(root,'bin')+':/usr/bin:/bin',ARTCRAFT_INSTALL_ROOT:root};
 const transport=new StdioClientTransport({command:'/bin/sh',args:[path.join(root,'launch-mcp.sh')],env,stderr:'pipe'});transport.stderr.on('data',()=>{});
 try{
  await client.connect(transport,{timeout:15000});const catalog=await client.listTools();if(catalog.tools.length!==11)throw Error('Expected 11 ArtCraft tools');
  const call=async(name,args)=>{const r=await client.callTool({name,arguments:args},undefined,{timeout:30000});if(r.isError)throw Error(r.content.find(c=>c.type==='text')?.text);return JSON.parse(r.content.find(c=>c.type==='text').text);};
  const status=await call('artcraft_status',{});const policy=await call('photocraft_tools',{query:'generative'});
  const guide=await call('artcraft_tools',{app:'effectcraft',query:'guide'});if(!guide.markdown)throw Error('EffectCraft guide missing');
  const check={tools:catalog.tools.length,apps:status.apps.length,workspace:status.projectRoot,policyVersion:policy.policyVersion,guideLoaded:true,photoSmoke:null};
  if(status.apps.find(a=>a.app==='photocraft')?.cli){
   await call('photocraft_connect',{mode:'headless'});await call('photocraft_call',{tool:'doc_new',arguments:{width:64,height:48,name:'설치 검사',background:'#32678a'}});
   const file=path.join(status.outputRoot,'install-check.png');await fs.mkdir(path.dirname(file),{recursive:true});
   await call('photocraft_call',{tool:'doc_save',arguments:{path:file}});const state=await call('photocraft_call',{tool:'doc_inspect',arguments:{}});
   if(state.width!==64||state.height!==48)throw Error('PhotoCraft document smoke failed');
   check.photoSmoke={passed:true,path:file,size:[state.width,state.height]};
  }
  if(status.apps.find(a=>a.app==='gridcraft')?.cli){
   await call('artcraft_connect',{app:'gridcraft',mode:'headless'});
   const native=(tool,args={})=>call('artcraft_call',{app:'gridcraft',tool,arguments:args});
   await native('write_range',{range:'A1',values:[['공급가액',26000000],['VAT','=B1*10%'],['합계','=SUM(B1:B2)']]});
   const file=path.join(status.outputRoot,'gridcraft-install-check.xlsx');await fs.mkdir(path.dirname(file),{recursive:true});
   await native('save_workbook',{path:file});await native('open_workbook',{path:file});const sum=await native('get_cell',{cell:'B3'});
   if(sum.value!==28600000)throw Error('GridCraft saved formula calculation failed');
   check.gridSmoke={passed:true,path:file,total:sum.value};
  }
  return check;
 }finally{await client.close();}
}
