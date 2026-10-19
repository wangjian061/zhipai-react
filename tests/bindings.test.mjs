// Evaluate migrated initial-state binding expressions, not a rendered UI/browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from '@babel/parser';
import generateModule from '@babel/generator';
import {createController,withLocals} from '../src/runtime/state.js';
const generate=generateModule.default||generateModule;
globalThis.location=new URL('http://127.0.0.1:4180/?page=home');
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
globalThis.window=new EventTarget();globalThis.document={hidden:false,querySelector(){return null}};
await import('../src/domain/index.js');
const root=createController('phoneDemo').scope;
const mapping={AppShell:'phoneDemo',ImageCarousel:'imageCarousel',CollectionCarousel:'imageCarousel',SearchPage:'searchPage',AlbumPage:'albumCenter',CameraPage:'cameraStudio',ScanPage:'collectionScanner',ToolsPage:'toolStudio',SupportPage:'supportCenter',PrintPage:'printStudio',MyPage:'myCenter',PhotoPicker:'photoChooser',AccountPage:'accountFlow',CollectionPage:'collectionFlow',LiquidTabs:'liquidTabs'};
const read=(node,s)=>new Function('s','args','return ('+generate(node).code+')')(s,[]);
test('all initial JSX data bindings resolve against the migrated domain state',()=>{
 let count=0;const errors=[];
 for(const folder of ['components','pages'])for(const file of fs.readdirSync('src/'+folder).filter(n=>n.endsWith('.jsx'))){
  const name=file.slice(0,-4),controller=mapping[name];const s=name==='AppShell'?root:controller?createController(controller,controller==='imageCarousel'?[name==='CollectionCarousel'?'collection':'hero']:[],root).scope:root;
  const ast=parse(fs.readFileSync(path.join('src',folder,file),'utf8'),{sourceType:'module',plugins:['jsx']});
  const evaluate=(node,scope)=>{try{count++;return read(node,scope);}catch(error){errors.push(file+': '+generate(node).code+' — '+error.message);return undefined;}};
  const walk=(node,scope)=>{
   if(!node)return;
   if(node.type==='JSXElement'){
    const tag=node.openingElement.name.name;
    const attrs=Object.fromEntries(node.openingElement.attributes.filter(a=>a.type==='JSXAttribute').map(a=>[a.name.name,a.value?.expression||a.value]));
    if(tag==='Controller'){for(const child of node.children)if(child.type==='JSXExpressionContainer')walk(child.expression.body,scope);return;}
    if(tag==='Repeat'){
     const items=evaluate(attrs.items,scope),names=read(attrs.names,scope);const pairs=typeof items==='number'?Array.from({length:items},(_,i)=>[i,i+1]):Array.isArray(items)?items.map((item,i)=>[i,item]):Object.entries(items||{});
     for(const [i,item]of pairs)for(const child of node.children)if(child.type==='JSXExpressionContainer')walk(child.expression.body,withLocals(scope,{[names[0]]:item,...(names[1]?{[names[1]]:i}:{})}));return;
    }
    if(tag!=='View'&&tag!=='Portal')return;
    for(const [key,value]of Object.entries(attrs))if(value&&!['scope','scopeRoot','events','model','as','refName','transition'].includes(key))evaluate(value,scope);
    for(const child of node.children)walk(child,scope);return;
   }
   if(node.type==='JSXFragment'){for(const child of node.children)walk(child,scope);return;}
   if(node.type==='JSXExpressionContainer'){walk(node.expression,scope);return;}
   if(node.type==='ConditionalExpression'){walk(evaluate(node.test,scope)?node.consequent:node.alternate,scope);return;}
  };
  const fn=ast.program.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
  const returned=fn.body.body.find(n=>n.type==='ReturnStatement');walk(returned.argument,s);
 }
 assert.deepEqual(errors,[]);assert.ok(count>1000,'complete initial binding coverage');
});
