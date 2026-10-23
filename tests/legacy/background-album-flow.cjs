// Integration of the real tool and album controllers with an in-memory storage adapter.
// No browser, AI call, or actual device filesystem operation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const stores = {}, factories = {};
let albumSnapshot, orderSnapshot = [], failWrite = false, failDownload = false, downloads = [], albumWrites = 0;
const pixels = new Uint8ClampedArray(36).fill(255);
class Image { constructor() { this.naturalWidth = 3; this.naturalHeight = 3; } async decode() {} }
const context = vm.createContext({
 crypto: webcrypto, Blob, URL, URLSearchParams, Event, Date, Intl, Map, Set,
 Uint8Array, Uint8ClampedArray, Int32Array, Image,
 location: { origin:'http://127.0.0.1:4180',pathname:'/',search:'?page=tool&tool=background&view=work',href:'http://127.0.0.1:4180/?page=tool&tool=background&view=work' },
 history:{pushState(_state,_title,url){const next=new URL(url,context.location.href);Object.assign(context.location,{href:next.href,search:next.search,pathname:next.pathname});}}, window:new EventTarget(), navigator:{onLine:true},
 document:{activeElement:null,createElement(){return {width:0,height:0,getContext(){return {drawImage(){},getImageData(){return {data:pixels.slice()};},putImageData(){}};},toBlob(cb,type){cb(new Blob(['changed-background'],{type}));}};}},
 Alpine:{store(name,value){if(value)stores[name]=value;return stores[name];},data(name,factory){factories[name]=factory;}},
 setTimeout(cb){queueMicrotask(cb);return 1;},clearTimeout(){},
 readAlbumSnapshot:async()=>structuredClone(albumSnapshot),
 writeAlbumSnapshot:async value=>{if(failWrite)throw Error('storage');albumWrites++;albumSnapshot=structuredClone(value);},
 readOrderSnapshot:async()=>structuredClone(orderSnapshot),writeOrderSnapshot:async value=>{orderSnapshot=structuredClone(value);},
 decodeSnapshot:async()=>new Image(),renderSnapshot:async()=>new Blob(['standardized'],{type:'image/png'}),downloadSnapshot:blob=>{if(failDownload)throw Error('download');downloads.push(blob);},
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/album.js'),'utf8'),context);
vm.runInContext('readAlbumState=readAlbumSnapshot;writeAlbumState=writeAlbumSnapshot;decodePhotoBlob=decodeSnapshot;renderPhotoBlob=renderSnapshot;downloadAlbumBlob=downloadSnapshot;',context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/tools.js'),'utf8'),context);
vm.runInContext('readToolOrders=readOrderSnapshot;writeToolOrders=writeOrderSnapshot;',context);
stores.account={session:{phone:'13800008000'}};
function studio(){const tool=factories.toolStudio();tool.$store=stores;tool.page='tool';tool.action='background';tool.$nextTick=cb=>Promise.resolve(cb?.());tool.openPanel=function(name){if(!this.busy)this.panel=name;};tool.init();return tool;}
(async()=>{
 const library=stores.photoLibrary;await library.load();await stores.toolOrders.load();
 const photo={id:'original',name:'original.jpg',width:295,height:413,type:'image/jpeg',size:8,spec:'一寸 · 25 × 35 mm',blob:new Blob(['original'],{type:'image/jpeg'})};
 await library.commit({finished:[photo],archivedOriginals:[]});
 const tool=studio();await tool.accept({photo,kind:'finished',context:{action:'background'}});assert.equal(tool.step,0);assert.equal(tool.portraitCheck.status,'idle');await tool.primary();await tool.choosePortraitOutcome('passed');
 assert.equal(tool.step,1);assert.equal(tool.primaryLabel,'保存到设备');
 const output=tool.output,task=tool.task,writesBefore=albumWrites;
 failWrite=true;failDownload=true;await tool.primary();assert.equal(tool.view,'work');assert.equal(library.finished.length,1);assert.match(tool.error,/保存未完成/);assert.equal(tool.primaryLabel,'重试保存');assert.equal(tool.output,output);
 // A broken album store cannot block device delivery; actual route events must
 // preserve the result instead of cancelling the save as an interrupted task.
 failDownload=false;await tool.primary();assert.equal(tool.view,'saved');assert.equal(tool.savedRecord,null);assert.equal(tool.flowCompleted,true);assert.equal(tool.saving,false);assert.equal(tool.task,task);assert.equal(tool.output,output);
 assert.equal(new URL(context.location.href).searchParams.get('view'),'saved');
 assert.equal(albumSnapshot.finished.length,1);assert.equal(albumWrites,writesBefore);assert.equal(downloads.length,1);assert.equal(downloads[0],output);assert.equal(orderSnapshot.length,0);
 library.finished=[];library.ready=false;await library.load();
 const original=library.finished.find(p=>p.id===photo.id);
 assert.equal(await downloads[0].text(),'changed-background');assert.equal(await original.blob.text(),'original');assert.equal(tool.outputWidth,295);assert.equal(tool.outputHeight,413);
 await tool.save();assert.equal(downloads.length,1);tool.previousStep();assert.equal(tool.view,'saved');
 await tool.start();assert.equal(tool.step,0);assert.equal(tool.photo,null);assert.equal(tool.output,null);assert.equal(library.finished.length,1);assert.equal(tool.view,'work');assert.equal(new URL(context.location.href).searchParams.get('view'),'work');tool.destroy();
 console.log('PASS: background device delivery with real routing and album store; failed download retries the same output, no album write/payment, original preservation, completion and restart.');
})().catch(error=>{console.error(error);process.exitCode=1;});
