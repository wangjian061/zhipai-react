import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.cwd(),'package.json'));
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {parseDocument}=require('htmlparser2');
const {transformWithOxc}=await import(path.join(process.cwd(),'node_modules/vite/dist/node/index.js'));
const source=fs.readFileSync('src/components/ToolNavigation.jsx','utf8').replace(/^import .*;\n/gm,'');
const compiled=await transformWithOxc(source,'ToolNavigation.jsx',{jsx:{runtime:'classic'}});
const Component=new Function('React',compiled.code.replace('export default ','')+';return ToolNavigation;')(React);
const flatten=root=>[root,...(root.children||[]).flatMap(flatten)];
const text=node=>node.type==='text'?node.data:(node.children||[]).map(text).join('');
const titles=['照片精修','照片换装','更换背景','照片裁剪','格式转换','修改体积','精修效果','换装效果','保存完成','冲印照片','裁剪照片','选择排版','确认订单','收货地址','编辑收货地址','订单详情','超长标题用于检查文本完整保留和省略样式的边界'];
let cases=0;
for(const title of titles)for(const disabled of [false,true])for(const withRight of [false,true]){
 let back=0;const tree=Component({title,disabled,onBack:()=>back++,right:withRight?React.createElement('button',{type:'button'},'客服'):null});
 const nodes=flatten(parseDocument(renderToStaticMarkup(tree))),buttons=nodes.filter(n=>n.name==='button'),heading=nodes.find(n=>n.name==='h1');
 assert.equal(text(heading),title);assert.equal(heading.attribs.title,title);assert.equal(buttons[0].attribs['aria-label'],'返回');assert.equal('disabled' in buttons[0].attribs,disabled);assert.equal(buttons.length,withRight?2:1);
 assert.ok(nodes.some(n=>n.name==='use'&&n.attribs.href==='#i-chevron-left'));
 if(!disabled){tree.props.children[0].props.onClick();assert.equal(back,1);}
 cases++;
}
for(const f of ['src/pages/ToolsPage.jsx','src/pages/PrintPage.jsx'])assert.ok(fs.readFileSync(f,'utf8').includes('<ToolNavigation'));
for(const f of ['src/styles/tools.css','src/styles/print.css','src/styles/device-preview.css'])assert.ok(!/\.(?:tool-app-nav|tool-work-nav|tool-round-back|print-back|print-nav)(?=[\s{,.>:\[])\b/.test(fs.readFileSync(f,'utf8')),'old navigation style remains in '+f);
console.log(`PASS: shared navigation static React rendering (${cases} title/disabled/right-slot cases), callback wiring and removal of legacy navigation selectors.`);
console.log('This verifies source/render contracts, not actual browser layout, touch or visual acceptance.');
