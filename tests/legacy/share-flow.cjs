// Source behavior only: no browser clicks, screenshots or live sharing.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data={},listeners={},copied=[],downloads=[];
const location={origin:'http://127.0.0.1:4178',pathname:'/',search:'?page=tool&tool=crop&view=work&photo=private-photo',href:'http://127.0.0.1:4178/?page=tool&tool=crop&view=work&photo=private-photo'};
function setLocation(url){const u=new URL(url,location.origin);Object.assign(location,{href:u.href,origin:u.origin,pathname:u.pathname,search:u.search});}
let failCopy=false,holdAsset=null,releaseAsset=null;
const context=vm.createContext({File,URL,URLSearchParams,Blob,Map,Promise,console,Event,location,
  history:{pushState(_,__,url){setLocation(url);}},
  navigator:{clipboard:{async writeText(url){if(failCopy)throw Error('clipboard denied');copied.push(url);}}},
  window:{addEventListener(name,fn){(listeners[name]??=[]).push(fn);},removeEventListener(){},dispatchEvent(e){for(const fn of listeners[e.type]||[])fn(e);}},
  document:{addEventListener(name,fn){if(name==='alpine:init')fn();},getElementById(){return null;},fonts:{ready:Promise.resolve()},createElement(){return {getContext(){return {drawImage(){}};},toBlob(cb){cb(new Blob(['png'],{type:'image/png'}));}};}},
  Alpine:{store(){},data(name,factory){data[name]=factory;}},
  FileReader:class{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload();});}},
  Image:class{set src(_){Promise.resolve().then(()=>this.onload());}},
  fetch:async path=>{if(path===holdAsset)await new Promise(resolve=>releaseAsset=resolve);return {ok:true,blob:async()=>new Blob([path],{type:'image/png'})};},
  downloadAlbumBlob(blob,name){downloads.push({blob,name});}
});
const tools=fs.readFileSync('dist/tools.js','utf8');
vm.runInContext(tools.slice(0,tools.indexOf('function photoToolId')),context);
vm.runInContext(fs.readFileSync('dist/my.js','utf8'),context);
const center=data.myCenter();center.$store={myUi:{opened:false}};center.$el={scrollTop:0};center.$nextTick=fn=>Promise.resolve(fn?.());
center.init();
(async()=>{
  for(const key of ['print','repair','outfit','crop','background','format','resize']){
    const source=key==='print'?'/?page=print&print=preview&order=private-order':`/?page=tool&tool=${key}&view=work&photo=private-photo`;
    setLocation(source);vm.runInContext(`openZhipaiShare('${key}')`,context);await center.loadShareContext();
    assert.equal(new URL(location.href).searchParams.get('my'),'share');
    assert.equal(center.shareEntry.key,key);assert.ok(center.posterMarkup.includes('data:image/png;base64,'),'poster includes embedded image assets');
    const shared=new URL(center.shareUrl);assert.equal(shared.href,'https://www.zhipai.com.cn/h5/index.html');
    for(const field of ['photo','order','address','back','view'])assert.equal(shared.searchParams.has(field),false,'shared link excludes private state');
    await center.copyLink();assert.equal(copied.at(-1),center.shareUrl);
    center.backToMy();assert.equal(location.pathname+location.search,source,'back restores the exact tool view');
  }
  setLocation('/?page=my&my=share&share=repair&back=https%3A%2F%2Fevil.example');await center.loadShareContext();
  center.backToMy();assert.equal(location.search,'?page=tool&tool=repair','foreign return URLs rejected');
  setLocation('/?page=my&my=share&share=crop');await center.loadShareContext();failCopy=true;await center.copyLink();
  assert.equal(center.copyManual,true);assert.match(center.notice,/手动复制/);failCopy=false;
  // Simulate a late poster response after another service has been opened.
  vm.runInContext('sharePosterAssets.clear()',context);holdAsset='assets/share-photo-glass.png';
  setLocation('/?page=my&my=share&share=repair');const late=center.loadShareContext();
  setLocation('/?page=my&my=share&share=format');const latest=center.loadShareContext();releaseAsset();await Promise.all([late,latest]);
  assert.equal(center.shareEntry.key,'format');assert.ok(center.posterMarkup.includes('格式转换'));
  assert.ok(!center.posterMarkup.includes('让不清晰'));
  holdAsset=null;
  // Save must use one poster snapshot, and route departure cancels its download.
  const save=center.savePoster();setLocation('/?page=home');await center.loadShareContext();await save;assert.equal(downloads.length,0);
  setLocation('/?page=my&my=share&share=resize');await center.loadShareContext();await center.savePoster();
  assert.equal(downloads.at(-1).name,'修改体积分享海报.png');assert.equal(downloads.at(-1).blob.type,'image/png');
  // System share passes the prepared PNG immediately, then falls back to a public URL.
  let payload;
  context.navigator.canShare=()=>true;
  context.navigator.share=async data=>{payload=data};
  await center.systemShare();assert.equal(payload.files[0].type,'image/png');assert.equal(payload.files[0].name,'修改体积分享海报.png');
  context.navigator.canShare=()=>false;await center.systemShare();assert.equal(payload.url,center.shareUrl);assert.equal(payload.files,undefined);
  context.navigator.share=async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'})};await center.systemShare();assert.equal(center.notice,'');assert.equal(center.sharing,false);
  context.navigator.share=async()=>{throw Error('denied')};await center.systemShare();assert.match(center.notice,/分享未完成/);
  delete context.navigator.share;await center.systemShare();assert.match(center.notice,/保存图片/);
  setLocation('/?page=my&my=share');await center.loadShareContext();assert.equal(center.shareUrl,'https://www.zhipai.com.cn/h5/index.html');assert.ok(center.posterBlob);assert.ok(center.posterMarkup.includes('扫码体验知拍'));
  console.log('PASS: seven service share pages, safe entry links, exact return routes, embedded posters, manual copy fallback, stale poster isolation and snapshot-safe PNG download.');
})().catch(error=>{console.error(error);process.exitCode=1;});
