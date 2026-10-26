import fs from 'node:fs/promises';
import path from 'node:path';
import {DOCS_ROOT} from './lib.mjs';

const root=path.join(DOCS_ROOT,'effectcraft');
const extra={catalog:{file:'FEATURE_MAP.md',title:'전체 기능 그룹'},'tool-reference':{file:'TOOLS_REFERENCE.md',title:'MCP 도구 인자 요약'}};
export function parseGuideSections(markdown){
 const sections=new Map(),matches=[...markdown.matchAll(/<!-- section:([a-z-]+) -->/g)];
 for(let i=0;i<matches.length;i++){
  const start=matches[i].index+matches[i][0].length,end=matches[i+1]?.index??markdown.length;
  const text=markdown.slice(start,end).trim();sections.set(matches[i][1],{title:text.match(/^## (.+)$/m)?.[1]||matches[i][1],markdown:text});
 }
 return sections;
}
async function source(){
 const [markdown,metadataText]=await Promise.all([fs.readFile(path.join(root,'AGENT_GUIDE.md'),'utf8'),fs.readFile(path.join(root,'reference/metadata.json'),'utf8')]);
 const metadata=JSON.parse(metadataText),sections=parseGuideSections(markdown);
 const info={tool:'artcraft_tools',app:'effectcraft',query:'guide',guideVersion:markdown.match(/문서 기준:.*?\*\*([^*]+)\*\*/)?.[1]||null,
  snapshotVersion:metadata.cliPackageVersion,capturedAt:metadata.capturedAt,
  sections:[...sections].map(([id,s])=>({id,title:s.title})).concat(Object.entries(extra).map(([id,s])=>({id,title:s.title})))};
 return {markdown,sections,info};
}
export async function effectcraftGuideInfo(){return (await source()).info;}
export async function readEffectcraftGuide(query='guide'){
 const {markdown,sections,info}=await source();
 const section=query==='guide'?'quickstart':query.startsWith('guide:')?query.slice(6):'';
 let content;
 if(section==='all')content=markdown;
 else if(sections.has(section))content=sections.get(section).markdown;
 else if(Object.hasOwn(extra,section))content=await fs.readFile(path.join(root,extra[section].file),'utf8');
 else throw Error(`Unknown EffectCraft guide section. Use: ${info.sections.map(s=>s.id).join(', ')}, all`);
 return {type:'agent_guide',...info,section,markdown:content};
}
