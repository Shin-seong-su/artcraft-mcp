import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import {runtimeConfig} from './runtime-config.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = runtimeConfig.root;
export const STATE_DIR=runtimeConfig.stateDir;
export const DOCS_ROOT=runtimeConfig.docsRoot;
export const APPS = ['vectorcraft', 'figcraft', 'pdfcraft', 'cadcraft', 'effectcraft', 'photocraft', 'gridcraft'];
const LABELS = {vectorcraft:'VectorCraft', figcraft:'FigCraft', pdfcraft:'PdfCraft', cadcraft:'CADCraft', effectcraft:'EffectCraft', photocraft:'PhotoCraft', gridcraft:'GridCraft'};
const PORTS = runtimeConfig.ports;
const exec = promisify(execFile);
const validator=new Ajv({strict:false,allErrors:true,validateFormats:false});
const validator2020=new Ajv2020({strict:false,allErrors:true,validateFormats:false});
const compiledSchemas=new WeakMap();
export const reply = data => ({content:[{type:'text',text:JSON.stringify(data,null,2)}]});
export const failure = error => ({isError:true,content:[{type:'text',text:String(error.message || error)}]});
export async function portOpen(port) {
  return new Promise(resolve => {
    const socket=net.createConnection({host:'127.0.0.1',port});
    const finish=value=>{socket.destroy();resolve(value)};
    socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));
    socket.setTimeout(700,()=>finish(false));
  });
}
export function validateApp(app) {
  if (!APPS.includes(app)) throw Error(`Unknown app: ${app}`);
}
export async function runFile(bin,args,options={}) {
  // No shell, no user-supplied executable. Do not retry mutations on failure.
  try {return (await exec(bin,args,{cwd:ROOT,timeout:60000,maxBuffer:12*1024*1024,...options})).stdout;}
  catch(error){throw Error(`Command failed; it was NOT retried. Inspect the app before retrying a write. ${String(error.stderr || error.message).slice(0,3000)}`);}
}

export class AppBridge {
  constructor({root=ROOT,cliRoot=(root===ROOT?runtimeConfig.cliRoot:root),stateDir=STATE_DIR,appDirs=runtimeConfig.appDirs}={}) {this.root=root;this.cliRoot=cliRoot;this.stateDir=stateDir;this.appDirs=appDirs;this.connections=new Map();this.queues=new Map();this.manifest=null;}
  async binary(app) {
    validateApp(app);
    const manifestFile=path.join(this.cliRoot,'manifest.json');const stat=await fs.stat(manifestFile);
    const stamp=`${stat.mtimeMs}:${stat.size}`;
    if(!this.manifest||this.manifestStamp!==stamp){this.manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));this.manifestStamp=stamp;}
    const row=this.manifest.apps.find(x=>x.app===app);
    if(!row) throw Error(`No CLI configured for ${app}`);
    const bin=path.resolve(this.cliRoot,row.binary);await fs.access(bin);return bin;
  }
  controlFile() {return path.join(this.stateDir,'pdfcraft-control.json');}
  photoTokenFile() {return path.join(this.stateDir,'photocraft-control.token');}
  async applicationPath(app){for(const dir of this.appDirs){const candidate=path.join(dir,LABELS[app]+'.app');if(await fs.access(candidate).then(()=>true,()=>false))return candidate;}return null;}
  async installedVersion(app) {
    try{const application=await this.applicationPath(app);if(!application)return null;return (await exec('/usr/bin/plutil',['-extract','CFBundleShortVersionString','raw','-o','-',path.join(application,'Contents/Info.plist')])).stdout.trim();}catch{return null;}
  }
  serial(app,fn) {
    const pending=(this.queues.get(app) || Promise.resolve()).catch(()=>{}).then(fn);
    this.queues.set(app,pending);return pending;
  }
  async status() {
    const apps=[];
    for(const app of APPS) {
      const state=this.connections.get(app);
      let bin=null;try{bin=await this.binary(app)}catch{}
      const cliPackageVersion=this.manifest?.apps.find(x=>x.app===app)?.version||null;
      const desktopVersion=await this.installedVersion(app);
      apps.push({app,cli:bin,connected:!!state,mode:state?.mode || null,
        cliPackageVersion,desktopVersion,versionMatch:cliPackageVersion&&desktopVersion?cliPackageVersion===desktopVersion:null,
        liveAvailable:PORTS[app] ? await portOpen(PORTS[app]) : app==='pdfcraft' ? await fs.access(this.controlFile()).then(()=>true,()=>false) : false,
        liveSupport:app==='cadcraft'?'No live control adapter in this version; file processing only':app==='pdfcraft'?'Native UI control channel':'Native MCP attached to desktop',
        installed:!!await this.applicationPath(app)});
    }
    return {apps,projectRoot:this.root,outputRoot:path.join(this.root,'output/artcraft-chat'),
      note:'Live and headless are distinct. A headless result does not modify the document in an open desktop app. Call artcraft_connect explicitly.'};
  }
  async disconnect(app) {
    const old=this.connections.get(app);this.connections.delete(app);
    if(old?.client) await old.client.close(); // closes CLI subprocess, never the GUI
  }
  async connect(app,mode='live') {return this.serial(app,()=>this.connectUnlocked(app,mode));}
  async connectUnlocked(app,mode) {
    validateApp(app);if(!['live','headless'].includes(mode))throw Error('mode must be live or headless');
    const old=this.connections.get(app);
    if(old?.mode===mode) return {app,mode,connected:true,toolCount:old.tools.length};
    // A failed live connection must not leave a headless backend available by accident.
    await this.disconnect(app);
    if(app==='cadcraft') {
      if(mode==='live')throw Error('CADCraft live connection is not implemented. Use mode=headless, then open the saved drawing in CADCraft.');
      const tools=cadTools();this.connections.set(app,{mode,tools});return {app,mode,connected:true,toolCount:tools.length};
    }
    if(mode==='live' && app==='pdfcraft') {
      await this.checkPdfControl();
      await runFile(await this.binary(app),['ui','--control',this.controlFile(),'inspect']);
      const tools=pdfUiTools();this.connections.set(app,{mode,tools});return {app,mode,connected:true,toolCount:tools.length};
    }
    if(mode==='live' && !await portOpen(PORTS[app]))throw Error(`${LABELS[app]} control port ${PORTS[app]} is not listening. No command was sent; no headless fallback. Save/quit the app yourself if already running, then call artcraft_launch.`);
    const args=['mcp'];
    if(app==='vectorcraft') args.push(...(mode==='live'?['--connect',`127.0.0.1:${PORTS[app]}`]:['--headless']));
    if(app==='figcraft' && mode==='live')args.push('--attach',String(PORTS[app]));
    if(app==='gridcraft' && mode==='live')args.push('--connect',String(PORTS[app]));
    if(app==='effectcraft')args.push(...(mode==='live'?['--bridge',String(PORTS[app])]:['--empty']));
    if(app==='photocraft')args.push('--automation-read-root',this.root,'--automation-write-root',this.root);
    if(app==='photocraft' && mode==='live'){
      const stat=await fs.lstat(this.photoTokenFile());
      if(stat.isSymbolicLink()||!stat.isFile()||stat.uid!==process.getuid()||(stat.mode&0o077))throw Error('Unsafe PhotoCraft token file permissions. Use a private, user-owned control token file.');
      args.push('--bridge',`127.0.0.1:${PORTS[app]}`,'--control-token-file',this.photoTokenFile());
    }
    const client=new Client({name:'artcraft-chat-bridge',version:'0.1.0'});
    const transport=new StdioClientTransport({command:await this.binary(app),args,cwd:this.root,stderr:'pipe'});
    transport.stderr.on('data',()=>{}); // drain; native logs can contain document paths
    try {
      await client.connect(transport,{timeout:15000});
      const tools=[];let cursor;
      do{const list=await client.listTools(cursor?{cursor}:{});tools.push(...list.tools);cursor=list.nextCursor;}while(cursor);
      if(mode==='live') {
        const inspection=await client.callTool({name:app==='gridcraft'?'inspect_workbook':app==='effectcraft'?'get_state':app==='photocraft'?'ui_inspect':'inspect_ui',arguments:{}},undefined,{timeout:15000});
        if(inspection.isError)throw Error(JSON.stringify(inspection));
      }
      this.connections.set(app,{mode,client,transport,tools});
      return {app,mode,connected:true,toolCount:tools.length};
    }catch(error){await client.close();throw error;}
  }
  async checkPdfControl() {
    const stat=await fs.lstat(this.controlFile());
    if(stat.isSymbolicLink() || !stat.isFile() || stat.uid!==process.getuid() || (stat.mode & 0o077))throw Error('Unsafe PdfCraft control file permissions. Native control file must be owned by you and private.');
  }
  async tools(app,query='',limit=12,offset=0) {return this.serial(app,async()=>{
    const state=this.connections.get(app);if(!state)throw Error(`Call artcraft_connect for ${app} first. Default to live for requests about an open app.`);
    const q=query.toLowerCase();const matches=state.tools.filter(t=>(t.name+' '+t.description).toLowerCase().includes(q));
    return {app,mode:state.mode,count:matches.length,offset,tools:matches.slice(offset,offset+limit),nextOffset:offset+limit<matches.length?offset+limit:null};
  });}
  async call(app,name,args={}) {return this.serial(app,async()=>{
    const state=this.connections.get(app);if(!state)throw Error(`Call artcraft_connect for ${app} first.`);
    const tool=state.tools.find(t=>t.name===name);
    if(!tool)throw Error(`Unknown ${app} tool ${name}; call artcraft_tools to discover names and schemas.`);
    let validate=compiledSchemas.get(tool);
    if(!validate){validate=(tool.inputSchema.$schema?.includes('2020-12')?validator2020:validator).compile(tool.inputSchema);compiledSchemas.set(tool,validate);}
    if(!validate(args))throw Error(`Invalid ${app}.${name} arguments: ${validator.errorsText(validate.errors)}`);
    const start=Date.now();
    try {
      let result;
      if(app==='cadcraft')result=await this.cadCall(name,args);
      else if(app==='pdfcraft' && state.mode==='live')result=await this.pdfCall(name,args);
      else result=await state.client.callTool({name,arguments:args},undefined,{timeout:90000});
      await this.audit({app,mode:state.mode,tool:name,ms:Date.now()-start,ok:!result.isError});
      return {...result,_meta:{...result._meta,artcraft:{app,mode:state.mode}}};
    }catch(error){await this.audit({app,mode:state.mode,tool:name,ms:Date.now()-start,ok:false});throw error;}
  });}
  async audit(event) {
    await fs.mkdir(this.stateDir,{recursive:true,mode:0o700});
    await fs.appendFile(path.join(this.stateDir,'audit.jsonl'),JSON.stringify({time:new Date().toISOString(),...event})+'\n',{mode:0o600});
  }
  async launch(app) {return this.serial(app,async()=>{
    validateApp(app);if(app==='cadcraft')throw Error('CADCraft has file processing only in this bridge. Open a saved file with artcraft_show_file.');
    if(PORTS[app] && await portOpen(PORTS[app]))return {app,alreadyListening:true,port:PORTS[app]};
    try{await exec('/usr/bin/pgrep',['-x',LABELS[app]]);throw Error(`${LABELS[app]} is already running without the selected control channel. Save and quit it yourself first; the bridge never terminates existing apps.`);}
    catch(error){if(!Number.isInteger(error.code))throw error;}
    const dir=this.stateDir;await fs.mkdir(dir,{recursive:true,mode:0o700});
    await fs.chmod(dir,0o700);
    const control=app==='pdfcraft'?this.controlFile():String(PORTS[app]);
    const application=await this.applicationPath(app);if(!application)throw Error(`${LABELS[app]} desktop app is not installed in configured appDirs`);
    const bin=path.join(application,'Contents/MacOS',LABELS[app]);
    await fs.access(bin);
    const launchArgs=['--control',control];
    if(app==='photocraft')launchArgs.push('--control-token-file',this.photoTokenFile());
    if(app==='photocraft')launchArgs.push('--automation-read-root',this.root,'--automation-write-root',this.root);
    const child=spawn(bin,launchArgs,{cwd:this.root,detached:true,stdio:'ignore'});
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)});child.unref();
    const until=Date.now()+20000;
    while(Date.now()<until) {
      const ready=app==='pdfcraft'?await fs.access(control).then(()=>true,()=>false):await portOpen(PORTS[app]);
      if(ready)return {app,launched:true,control:app==='pdfcraft'?'private control file':`127.0.0.1:${control}`,next:'Call artcraft_connect with mode=live.'};
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    throw Error(`App launch requested, but ${app} control readiness was not confirmed. Inspect the app before retrying.`);
  });}
  async showFile(app,file) {
    validateApp(app);const absolute=path.resolve(this.root,file);await fs.access(absolute);
    const application=await this.applicationPath(app);if(!application)throw Error(`${LABELS[app]} desktop app is not installed`);
    await runFile('/usr/bin/open',['-a',application,absolute]);
    return {app,path:absolute,requestedOpen:true,note:'Opening requested. Verify the visible document; this does not establish a live control channel.'};
  }
  async cadCall(name,args) {
    const bin=await this.binary('cadcraft');let argv;
    if(name==='drawing_info')argv=['info',args.path];
    else if(name==='drawing_commands')argv=['commands',args.filter || ''];
    else {
      if(!Array.isArray(args.steps) || !args.steps.length || args.steps.length>100)throw Error('steps must contain 1–100 app commands.');
      argv=['run',...(args.path?[args.path]:['--metric'])];
      for(const step of args.steps){if(typeof step.command!=='string')throw Error('Each step needs a command id.');argv.push('--cmd',`${step.command} ${JSON.stringify(step.params || {})}`);}
      if(args.save)argv.push('--save',args.save);if(args.export)argv.push('--export',args.export);
    }
    if(argv.some(x=>typeof x!=='string'))throw Error('Missing path or invalid command argument.');
    const text=await runFile(bin,argv);
    const results=text.split('\n').filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}});
    return {isError:results.some(r=>r.error || r.ok===false),content:[{type:'text',text}]};
  }
  async pdfCall(name,args) {
    await this.checkPdfControl();const method=name.slice(3);const argv=['ui','--control',this.controlFile(),method];
    for(const [key,value] of Object.entries(args))argv.push(`${key}=${typeof value==='string'?value:JSON.stringify(value)}`);
    if(method==='screenshot') {
      const dir=path.join(this.root,'output/artcraft-chat');await fs.mkdir(dir,{recursive:true});
      const output=path.join(dir,`pdfcraft-window-${Date.now()}.png`);argv.push('--out',output);
      const raw=await runFile(await this.binary('pdfcraft'),argv);const bytes=await fs.readFile(output);
      return {content:[{type:'image',mimeType:'image/png',data:bytes.toString('base64')},{type:'text',text:raw}]};
    }
    return {content:[{type:'text',text:await runFile(await this.binary('pdfcraft'),argv)}]};
  }
  async close() {for(const app of this.connections.keys())await this.disconnect(app);}
}
function cadTools() {
  return [
    {name:'drawing_info',description:'Read a DXF/DWG file; does not inspect the open GUI document.',inputSchema:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}},
    {name:'drawing_commands',description:'Discover CADCraft command ids and parameter descriptions.',inputSchema:{type:'object',properties:{filter:{type:'string'}},additionalProperties:false}},
    {name:'drawing_run',description:'Run CAD commands in a headless drawing; save/export a result, then show it in CADCraft if requested. Does not edit an existing GUI session.',inputSchema:{type:'object',properties:{path:{type:'string'},steps:{type:'array',items:{type:'object',properties:{command:{type:'string'},params:{type:'object'}},required:['command']}},save:{type:'string'},export:{type:'string'}},required:['steps'],additionalProperties:false}}
  ];
}
function pdfUiTools() {
  return ['inspect','screenshot','command','click','key','drag','resize','focus'].map(method=>({name:'ui_'+method,description:`PdfCraft native UI method ${method}. Inspect first; official examples: inspect {query}, command {id}, click {label}, key {key,modifiers}, drag {from,to}, resize {width,height}, focus {label}. Screenshots return inline PNG.`,inputSchema:{type:'object',additionalProperties:true}}));
}
