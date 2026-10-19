// One-time migration compiler. It emits ordinary React JSX and ES modules;
// neither the HTML directives nor the Alpine runtime are used by the new app.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseDocument} from 'htmlparser2';
import {parse,parseExpression} from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';
const traverse=traverseModule.default||traverseModule, generate=generateModule.default||generateModule;
const root=process.cwd(), source=path.resolve(process.argv[2]||'../sites/zhipai-mobile-20261009');
const html=fs.readFileSync(path.join(source,'dist/index.html'),'utf8');
const doc=parseDocument(html,{decodeEntities:true,lowerCaseAttributeNames:false,lowerCaseTags:false,recognizeSelfClosing:true});
const files=['app','liquid-tabs','support','album','photo-making','camera','scan','photo-choice','my','print','tools','account','collection'];
const modules=new Map(), symbols=new Map();
for(const name of files){
 const ast=parse(fs.readFileSync(path.join(source,'dist',name+'.js'),'utf8'),{sourceType:'script'});
 const body=[];
 for(const node of ast.program.body){
  if(t.isExpressionStatement(node)&&t.isCallExpression(node.expression)&&t.isMemberExpression(node.expression.callee)&&node.expression.callee.object.name==='document'&&node.expression.callee.property.name==='addEventListener'&&node.expression.arguments[0]?.value==='alpine:init')body.push(...node.expression.arguments[1].body.body);
  else body.push(node);
 }
 ast.program.body=body;
 traverse(ast,{CallExpression(p){
  const c=p.node.callee;
  if(t.isMemberExpression(c)&&t.isIdentifier(c.object,{name:'Alpine'})){
   if(c.property.name==='data')p.node.callee=t.identifier('registerController');
   else if(c.property.name==='store')p.node.callee=t.identifier(p.node.arguments.length>1?'registerStore':'getStore');
   else throw Error('Unsupported framework API '+c.property.name);
  }
  if(t.isMemberExpression(c)&&t.isIdentifier(c.property,{name:'put'})&&p.node.arguments.length)p.node.arguments[0]=t.callExpression(t.identifier('storageValue'),[p.node.arguments[0]]);
 },ExpressionStatement(p){
  const c=p.node.expression;
  if(t.isCallExpression(c)&&t.isMemberExpression(c.callee)&&c.callee.property.name==='setAttribute'&&c.arguments[0]?.value==='x-ignore')p.remove();
 }});
 const declarations=[];
 for(const node of body){if(t.isFunctionDeclaration(node)||t.isClassDeclaration(node))declarations.push(node.id.name);else if(t.isVariableDeclaration(node))for(const entry of node.declarations)declarations.push(...Object.keys(t.getBindingIdentifiers(entry.id)));}
 for(const symbol of declarations){if(symbols.has(symbol))throw Error('Duplicate domain symbol '+symbol);symbols.set(symbol,name);}
 modules.set(name,{ast,declarations});
}
for(const [name,{ast,declarations}] of modules){
 const imports=new Map();
 traverse(ast,{ReferencedIdentifier(p){const key=p.node.name;if(p.scope.hasBinding(key))return;const owner=symbols.get(key);if(owner&&owner!==name){if(!imports.has(owner))imports.set(owner,new Set());imports.get(owner).add(key);}}});
 const prefix=`import {registerController,registerStore,getStore,storageValue} from '../runtime/state.js';\n`+[...imports].map(([owner,names])=>`import {${[...names].join(',')}} from './${owner}.js';`).join('\n');
 fs.writeFileSync(path.join(root,'src/domain',name+'.js'),prefix+'\n'+generate(ast,{comments:true}).code+'\nexport {'+declarations.join(',')+'};\n');
}
fs.writeFileSync(path.join(root,'src/domain/index.js'),files.map(name=>`import * as ${name.replaceAll('-','_')} from './${name}.js';`).join('\n')+'\nimport {setDomainGlobals} from "../runtime/state.js";\nsetDomainGlobals(Object.assign({},'+files.map(n=>n.replaceAll('-','_')).join(',')+'));\n');
const globals=new Set(['Math','Number','String','Boolean','Object','Array','Date','Intl','JSON','URL','URLSearchParams','Blob','File','Promise','Map','Set','RegExp','Error','console','window','document','navigator','location','history','crypto','undefined','NaN','Infinity','parseInt','parseFloat','isNaN','encodeURIComponent','decodeURIComponent','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','globalThis','matchMedia']);
function expression(code,statement=false){
 const ast=parse(`function evaluate(scope,$event,$el){${statement?code:`return (${code});`}}`,{sourceType:'script'});
 traverse(ast,{Identifier(p){
  const name=p.node.name;if(globals.has(name)||['scope','$event','$el'].includes(name)||p.scope.hasBinding(name))return;
  const assignment=(p.parentPath.isAssignmentExpression()&&p.key==='left')||(p.parentPath.isUpdateExpression()&&p.key==='argument');
  if(!p.isReferencedIdentifier()&&!assignment)return;
  p.replaceWith(t.memberExpression(t.identifier('scope'),t.identifier(name)));p.skip();
 }});
 const fn=ast.program.body[0];fn.id=null;return generate(t.functionExpression(null,fn.params,fn.body),{compact:true}).code;
}
function read(code){
 const ast=parse('('+expression(code)+')',{sourceType:'script'});
 traverse(ast,{Function(p){if(p.node===ast.program.body[0].expression)return;if(p.scope.hasOwnBinding('s'))p.scope.rename('s',p.scope.generateUid('item'));}});
 traverse(ast,{FunctionExpression(p){if(p.node===ast.program.body[0].expression){p.scope.rename('scope','s');p.stop();}}});
 return generate(ast.program.body[0].expression.body.body[0].argument,{compact:true}).code;
}
const attrNames={class:'className',for:'htmlFor',tabindex:'tabIndex',readonly:'readOnly',maxlength:'maxLength',minlength:'minLength',inputmode:'inputMode',autocomplete:'autoComplete',autoplay:'autoPlay',playsinline:'playsInline',srcset:'srcSet',fetchpriority:'fetchPriority',viewbox:'viewBox','stroke-width':'strokeWidth','stroke-linecap':'strokeLinecap','stroke-linejoin':'strokeLinejoin','clip-path':'clipPath','fill-rule':'fillRule'};
const booleans=new Set(['disabled','checked','required','multiple','readOnly','autoPlay','muted','playsInline','controls','hidden','inert','selected']);
const screens={phoneDemo:'AppShell',imageCarousel:'ImageCarousel',searchPage:'SearchPage',albumCenter:'AlbumPage',cameraStudio:'CameraPage',collectionScanner:'ScanPage',toolStudio:'ToolsPage',supportCenter:'SupportPage',printStudio:'PrintPage',myCenter:'MyPage',photoChooser:'PhotoPicker',accountFlow:'AccountPage',collectionFlow:'CollectionPage',liquidTabs:'LiquidTabs'};
const screenNames=new Set(Object.values(screens)), created=new Set(), sourceUnits=new Map();
const q=JSON.stringify;
function children(nodes){return nodes.map(node=>render(node)).join('');}
function componentFor(node,controller){
 const name=controller?(controller==='imageCarousel' && node.attribs['x-data'].includes('collection')?'CollectionCarousel':screens[controller]):node.attribs.id==='home-page'?'HomePage':null;
 if(!name)throw Error('Unmapped component');
 if(!created.has(name)){
  created.add(name);const clone={...node,attribs:{...node.attribs}};delete clone.attribs['x-data'];
  const rendered=render(clone,true);
  const code=controller?`export default function ${name}({scope,args=[]}){return <Controller name=${q(controller)} args={args}>{s=>(${rendered})}</Controller>;}`:`export default function ${name}({scope:s}){return (${rendered});}`;
  sourceUnits.set(name,code);
 }
 let args='[]';if(controller){const data=node.attribs['x-data'];const parsed=parseExpression(data);if(t.isCallExpression(parsed))args='['+parsed.arguments.map(arg=>read(generate(arg).code)).join(',')+']';}
 return `<${name} scope={s}${controller?` args={${args}}`:''}/>`;
}
function render(node,rootNode=false){
 if(node.type==='text'){if(!node.data.trim())return '';return `{${q(node.data)}}`;}
 if(node.type!=='tag'&&node.type!=='script'&&node.type!=='style')return '';
 const a=node.attribs||{};
 if(a['x-data']&&!rootNode){const parsed=parseExpression(a['x-data']);return componentFor(node,t.isCallExpression(parsed)?parsed.callee.name:parsed.name);}
 if(a.id==='home-page'&&!rootNode)return componentFor(node,null);
 if(a['x-for']){
  const m=a['x-for'].match(/^\s*(?:\(([^)]+)\)|([\w$]+))\s+(?:in|of)\s+([\s\S]+)$/);if(!m)throw Error('Bad loop '+a['x-for']);
  const names=(m[1]||m[2]).split(',').map(v=>v.trim());const clone={...node,attribs:{...a}};delete clone.attribs['x-for'];delete clone.attribs[':key'];
  return `<Repeat scope={s} items={${read(m[3])}} names={${q(names)}}${a[':key']?` keyFor={${expression(a[':key'])}}`:''}>{s=>(<>${render(clone)}</>)}</Repeat>`;
 }
 if(a['x-if']){const clone={...node,attribs:{...a}};delete clone.attribs['x-if'];return `{${read(a['x-if'])}?(<>${render(clone)}</>):null}`;}
 if(a['x-teleport'])return `<Portal target=${q(a['x-teleport'])}>${children(node.children||[])}</Portal>`;
 if(node.name==='template')return `<>${children(node.children||[])}</>`;
 const attributes=[`as=${q(node.name)}`,'scope={s}'];if(rootNode && node.attribs.id!=='home-page')attributes.push('scopeRoot');
 const events=[];let model=null;
 for(const [key,value] of Object.entries(a)){
  if(key==='x-data'||key==='x-cloak'||key===':key')continue;
  if(key==='x-show'){attributes.push(`show={${read(value)}}`);continue;}
  if(key==='x-ref'){attributes.push(`refName=${q(value)}`);continue;}
  if(key==='x-text'){attributes.push(`text={${read(value)}}`);continue;}
  if(key==='x-html'){attributes.push(`html={${read(value)}}`);continue;}
  if(key.startsWith('x-transition'))continue;
  if(key.startsWith('x-model')){model={read:expression(value),write:expression(value+'=$event',true),number:key.includes('.number'),lazy:key.includes('.lazy')};continue;}
  if(key.startsWith('@')){const [type,...mods]=key.slice(1).split('.');const event={type,prevent:mods.includes('prevent'),stop:mods.includes('stop'),self:mods.includes('self'),passive:mods.includes('passive')};if(mods.includes('arrow-left'))event.key='ArrowLeft';if(mods.includes('arrow-right'))event.key='ArrowRight';events.push({...event,run:expression(value,true)});continue;}
  if(key==='style'){attributes.push(`baseStyle=${q(value)}`);continue;}
  if(key===':style'){attributes.push(`dynamicStyle={${read(value)}}`);continue;}
  if(key===':class'){attributes.push(`dynamicClass={${read(value)}}`);continue;}
  const dynamic=key.startsWith(':'),rawKey=dynamic?key.slice(1):key,prop=attrNames[rawKey]||rawKey;
  if(rawKey.startsWith('x-'))throw Error('Unhandled directive '+rawKey);
  attributes.push(dynamic?`${prop}={${read(value)}}`:booleans.has(prop)?`${prop}={true}`:`${prop}=${q(value)}`);
 }
 if(events.length)attributes.push('events={['+events.map(e=>'{'+Object.entries(e).map(([k,v])=>k+':'+(k==='run'?v:q(v))).join(',')+'}').join(',')+']}');
 if(model)attributes.push(`model={{read:${model.read},write:${model.write},number:${model.number},lazy:${model.lazy}}}`);
 if(Object.keys(a).some(k=>k.startsWith('x-transition')))attributes.push(`transition={${q(a['x-transition:enter']?{enter:a['x-transition:enter'],start:a['x-transition:enter-start'],end:a['x-transition:enter-end']}:{opacity:true,duration:Object.keys(a).some(k=>k.includes('180ms'))?180:150})}}`);
 const inner=a['x-text']!==undefined||a['x-html']!==undefined?'':children(node.children||[]);
 return `<View ${attributes.join(' ')}>${inner}</View>`;
}
const body=doc.children.find(n=>n.name==='html').children.find(n=>n.name==='body');
const entry=children(body.children);
function writeUnit(name,code){
 const refs=[...created].filter(other=>other!==name&&new RegExp('<'+other+'\\b').test(code));
 const folder=['AppShell','ImageCarousel','CollectionCarousel','LiquidTabs','PhotoPicker'].includes(name)?'components':'pages';
 const imports=`import React from 'react';\nimport {Controller,View,Repeat,Portal} from '../runtime/components.jsx';\n`+refs.map(other=>`import ${other} from '../${['AppShell','ImageCarousel','CollectionCarousel','LiquidTabs','PhotoPicker'].includes(other)?'components':'pages'}/${other}.jsx';`).join('\n');
 const full=imports+'\n'+code+'\n';const ast=parse(full,{sourceType:'module',plugins:['jsx']});fs.writeFileSync(path.join(root,'src',folder,name+'.jsx'),generate(ast,{comments:true}).code+'\n');
}
for(const [name,code] of sourceUnits)writeUnit(name,code);
const imports=[...created].filter(name=>new RegExp('<'+name+'\\b').test(entry)).map(name=>`import ${name} from './${['AppShell','ImageCarousel','CollectionCarousel','LiquidTabs','PhotoPicker'].includes(name)?'components':'pages'}/${name}.jsx';`).join('\n');
fs.writeFileSync(path.join(root,'src/App.jsx'),`import React from 'react';\nimport {View} from './runtime/components.jsx';\n${imports}\nexport default function App(){const s={};return <>${entry}</>;}\n`);
const css=[...html.matchAll(/href="([^"]+\.css)"/g)].map(m=>m[1]);
for(const name of css)fs.copyFileSync(path.join(source,'dist',name),path.join(root,'src/styles',name));
fs.cpSync(path.join(source,'dist/assets'),path.join(root,'public/assets'),{recursive:true});
fs.mkdirSync(path.join(root,'public/vendor'),{recursive:true});fs.copyFileSync(path.join(source,'dist/vendor/jsQR.js'),path.join(root,'public/vendor/jsQR.js'));
fs.copyFileSync(path.join(source,'dist/favicon.svg'),path.join(root,'public/favicon.svg'));
fs.writeFileSync(path.join(root,'src/main.jsx'),`import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport './domain/index.js';\nimport {initializeStores} from './runtime/state.js';\nimport App from './App.jsx';\n${css.map(name=>`import './styles/${name}';`).join('\n')}\ninitializeStores();\ncreateRoot(document.getElementById('root')).render(<App/>);\n`);
fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0032FF"><meta name="description" content="知拍首页、相册、客服中心、我的，照片制作与处理工具。"><title>知拍</title><link rel="icon" href="./favicon.svg" type="image/svg+xml"><script src="./vendor/jsQR.js" defer></script></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`);
fs.mkdirSync(path.join(root,'tests/fixtures'),{recursive:true});fs.writeFileSync(path.join(root,'tests/fixtures/original-ui.html'),html);
fs.cpSync(path.join(source,'tests'),path.join(root,'tests/legacy'),{recursive:true});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
fs.writeFileSync(path.join(root,'migration-manifest.json'),JSON.stringify({source,sourceHtmlHash:hash(html),controllers:[...created],domainFiles:files,styles:css.map(name=>({file:name,sha256:hash(fs.readFileSync(path.join(source,'dist',name)))})),assets:fs.readdirSync(path.join(source,'dist/assets')).map(name=>({file:name,sha256:hash(fs.readFileSync(path.join(source,'dist/assets',name)))}))},null,2)+'\n');
console.log('Migrated '+created.size+' React surfaces, '+files.length+' domain modules, '+css.length+' unchanged style sheets.');
