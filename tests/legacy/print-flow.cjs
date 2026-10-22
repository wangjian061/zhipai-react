// Source-level behavior checks; no browser or live payment is involved.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const stores = {}, data = {};
let saved, failWrite = false;
const drawCalls=[], cropRenders=[];let failCrop=false, cropResolve=null;
const context = vm.createContext({
  crypto: webcrypto, Blob, URL, URLSearchParams, Intl, Date, Uint8Array, Event,
  history:{pushState(_state,_title,url){context.lastNavigation=String(url);}},
  navigator: {onLine:true, clipboard:{writeText:async()=>{}}},
  location: {origin:'http://127.0.0.1:4178',pathname:'/',search:'?page=print&print=preview',href:'http://127.0.0.1:4178/?page=print&print=preview'},
  window:{addEventListener(){},removeEventListener(){},dispatchEvent(){}},
  document:{activeElement:null,addEventListener(name,callback){if(name==='alpine:init')callback();},createElement(){return {getContext(){return {fillRect(){},drawImage(...args){drawCalls.push(args)},scale(){},save(){},restore(){},translate(){},rotate(){},fillText(){}};},toBlob(callback){callback(new Blob(['preview'],{type:'image/jpeg'}));}};}},
  Alpine:{store(name,value){if(value)stores[name]=value;return stores[name];},data(name,factory){data[name]=factory;}},
  decodePhotoBlob: async()=>({naturalWidth:295,naturalHeight:413}),
  renderPhotoBlob:async(blob,settings)=>{cropRenders.push(settings);if(failCrop)throw Error('encode failed');if(cropResolve)await new Promise(resolve=>{cropResolve=resolve});return new Blob(['cropped'],{type:'image/jpeg'});},
  actualPhotoURL:()=> 'blob:actual-photo',
  setTimeout:callback=>{queueMicrotask(callback);return 1;},
  readSnapshot:async()=>saved,
  writeSnapshot:async value=>{if(failWrite)throw Error('storage unavailable');saved=structuredClone(value);}
});
stores.account={session:{phone:"13800008000"}};
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/print.js'),'utf8'),context);
vm.runInContext('readPrintState=readSnapshot;writePrintState=writeSnapshot;',context);
const albumSource=fs.readFileSync(require('node:path').join(__dirname,'../dist/album.js'),'utf8');
vm.runInContext(albumSource.slice(albumSource.indexOf('function photoCropBounds('),albumSource.indexOf('async function decodePhotoBlob(')),context);
const photo={id:'finished-real',name:'证件照',width:295,height:413,spec:'一寸 · 25 × 35 mm',type:'image/jpeg',blob:new Blob(['actual-file'],{type:'image/jpeg'})};
const library={ready:true,busy:false,finished:[photo],addedIds:[]};
stores.photoLibrary=library;stores.photoChoice={printReturnContext:null};
const store=stores.printLibrary;
const studio=data.printStudio();
studio.$store=stores;studio.page='print';studio.$nextTick=callback=>Promise.resolve(callback?.());
studio.$refs={};studio.route=function(view,extras={}){this.view=view;this.orderId=extras.order||null;};
studio.showModal=function(name){this.modal=name;stores.printUi.opened=true;};studio.closeModal=function(){this.modal=null;stores.printUi.opened=false;};
(async()=>{
  await store.load();
  assert.equal(store.ready,true);
  await studio.choosePhoto(photo,'phone');
  assert.equal(store.draft.photo.id,photo.id,'phone source is allowed');
  await studio.startPrint();
  await studio.choosePhoto({...photo,id:'not-in-library'},'finished');
  assert.equal(store.draft.photo,null,'unknown finished record must be rejected');
  await studio.enter({entry:'home',returnTo:'/?page=home'});assert.equal(studio.view,'select','entry opens photo selection directly');
  await studio.startPrint();assert.equal(studio.view,'select');
  studio.selectCandidate(photo.id);studio.showModal('album');await studio.preparePhoto();
  assert.equal(studio.modal,null,'selection drawer closes when used');assert.equal(studio.view,'layouts','a matching photo immediately advances to layouts');
  const returnContext=studio.returnContext();library.addedIds=['stale-unrelated'];await studio.resumePrint(returnContext);
  assert.equal(store.draft.photo.id,photo.id,'cancel/back preserves selection despite stale transient added IDs');
  const returnPhoto={...photo,id:'returned-new',name:'刚制作的成片'};library.finished.unshift(returnPhoto);library.addedIds=[];
  await studio.resumePrint(returnContext);assert.equal(store.draft.photo.id,returnPhoto.id,'delayed return selects new saved record without transient added IDs');
  await studio.choosePhoto(photo,'finished');library.finished=library.finished.filter(p=>p.id!==returnPhoto.id);
  studio.nextLayouts();assert.equal(studio.view,'layouts');assert.equal(store.draft.kind,'finished');
  assert.equal(store.draft.photo.blob.size,photo.blob.size);
  await studio.loadLayouts();
  assert.equal(studio.layouts.length,2);
  assert.equal(studio.selectedLayout.count,12);
  assert.equal(studio.layouts[0].description,'二寸4张＋一寸8张');
  assert.equal(studio.layouts[1].count,8);
  assert.equal(studio.layouts[0].slots.filter(s=>s.rotated).length,4);
  assert.equal(studio.layouts[1].slots.filter(s=>s.rotated).length,8);
  for(const layout of studio.layouts){
    assert.equal(layout.paperWidth,102);assert.equal(layout.paperHeight,152);
    for(const slot of layout.slots)assert.ok(slot.x>=0&&slot.y>=0&&slot.x+slot.w<=102&&slot.y+slot.h<=141);
    for(let i=0;i<layout.slots.length;i++)for(let j=i+1;j<layout.slots.length;j++){const a=layout.slots[i],b=layout.slots[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'slots do not overlap');}
  }
  assert.match(studio.sheet(studio.layouts[0].id),/rotate\(-90\)/);
  assert.match(studio.sheet(studio.layouts[0].id),/xMidYMid meet/);
  const quote=vm.runInContext('requestPrintQuote',context);
  await assert.rejects(quote({id:'one'},1,{}));
  await assert.rejects(quote(studio.selectedLayout,2,{}));
  await studio.changeDraft('quantity',2);assert.equal(store.draft.quantity,1);
  await studio.changeDraft('addon',1);assert.equal(store.draft.addon,0);
  studio.confirm();await studio.loadQuote();
  assert.equal(studio.quote.shipping,1000);assert.equal(studio.quote.total,2980);assert.equal(studio.quote.unitPrice,1980);
  assert.equal(studio.canSubmit,false,'address is required');
  studio.addressFields={id:null,name:'测试收件人',phone:'13800000000',region:'广东省 深圳市 南山区',street:'测试街道100号测试楼101室',postal:'',default:true};
  studio.addressReturn='confirm';await studio.saveAddress();await studio.loadQuote(true);
  assert.equal(studio.canSubmit,true);
  assert.equal(studio.quote.total,2980);
  await Promise.all([studio.submitOrder(),studio.submitOrder()]);
  assert.equal(store.orders.length,1,'double submit must create one order');
  const orderId=studio.order.id;
  assert.equal(studio.order.quantity,1);assert.equal(studio.order.addon,0);assert.equal(studio.order.total,2980);
  assert.equal(studio.order.layoutSnapshot.slots.filter(s=>s.rotated).length,4);
  studio.order.base=700;await studio.pay();assert.equal(studio.order.status,'pending');assert.match(studio.message,/旧冲印规格或价格/);studio.order.base=1980;
  studio.demoOutcome='timeout';await studio.pay();
  assert.equal(studio.order.status,'verifying');
  await studio.submitOrder();assert.equal(store.orders.length,1,'unknown payment must not create another order');
  const alternate={...photo,id:'finished-second',name:'另一张成片'};library.finished.push(alternate);
  await studio.enter({photo:alternate,kind:'finished',entry:'album',returnTo:'/?page=album'});
  assert.equal(store.draft.orderId,orderId,'album entry must retain unresolved order link');
  assert.equal(store.draft.photo.id,photo.id,'album entry must not replace unresolved payment draft');
  assert.equal(studio.view,'confirm','entry retains its original checkout');assert.equal(studio.modal,'resolution','unknown payment is queried in the original print flow');
  assert.equal(studio.order.id,orderId);assert.equal(studio.order.status,'verifying');
  studio.checkoutPayment=false;studio.resolution='unpaid';await studio.resolvePayment();
  assert.equal(studio.order.id,orderId);assert.equal(studio.order.status,'pending');
  studio.demoOutcome='failed';await studio.pay();assert.equal(studio.order.status,'pending');
  studio.demoOutcome='success';await studio.pay();assert.equal(studio.order.status,'producing');
  assert.equal(studio.view,'confirm');assert.equal(store.orders.length,1);
  library.finished=[];
  assert.equal(studio.order.photo.blob.size,photo.blob.size,'deleting library must preserve order photo');
  await studio.advanceOrder();assert.equal(studio.order.status,'printing');
  await studio.advanceOrder();assert.equal(studio.order.status,'shipped');assert.ok(studio.order.tracking.number.startsWith('DEMO-'));
  await studio.advanceOrder();assert.equal(studio.order.status,'delivered','delivery waits for the recipient confirmation');
  const originalAddress=studio.order.address.street;
  studio.addressFields={...studio.order.address,street:'新的测试街道200号'};
  failWrite=true;await studio.saveAddress();
  assert.match(studio.addressError,/保留/);assert.equal(studio.addressFields.street,'新的测试街道200号');
  assert.equal(studio.order.address.street,originalAddress,'failed writes must preserve order snapshot');
  failWrite=false;
  library.finished=[photo];await studio.enter({entry:'home'});await studio.startPrint();
  assert.equal(studio.view,'select');assert.equal(store.draft.photo,null,'new journey does not reuse previous photo');assert.equal(store.draft.orderId,null);assert.equal(store.draft.quantity,1);
  studio.selectCandidate(photo.id);await studio.preparePhoto();studio.nextLayouts();await studio.loadLayouts();studio.confirm();await studio.loadQuote(true);await studio.submitOrder();
  assert.equal(studio.view,'confirm','submitting does not navigate to order detail');assert.equal(studio.modal,'payment');
  const secondId=studio.order.id;assert.notEqual(secondId,orderId);assert.equal(store.orders.length,2);
  studio.demoOutcome='success';await studio.pay();assert.equal(studio.view,'confirm');assert.equal(studio.flowCompleted,true,'completion stays within third step');assert.equal(studio.modal,null);
  assert.equal(store.draft.completedOrderId,secondId,'completion is persisted with journey');
  context.location.search='?page=print&print=confirm';context.location.href=context.location.origin+'/'+context.location.search;
  const reload=data.printStudio();reload.$store=stores;reload.page='print';reload.$el={querySelectorAll:()=>[]};reload.$nextTick=cb=>Promise.resolve(cb?.());reload.route=studio.route;
  reload.syncLocation();assert.equal(reload.flowCompleted,true,'completed third step survives reload');assert.equal(reload.canSubmit,false);await reload.submitOrder();assert.equal(store.orders.length,2,'reload cannot create a duplicate order');
  await studio.startPrint();assert.equal(studio.flowCompleted,false);assert.equal(store.draft.photo,null);assert.equal(store.orders.length,2,'starting another journey preserves orders');
  const restored=data.printStudio();restored.$store=stores;
  await store.load();assert.equal(store.orders.find(o=>o.id===orderId).status,'delivered');assert.equal(store.orders[0].photo.blob.size,photo.blob.size);
  context.decodePhotoBlob=async()=>({naturalWidth:600,naturalHeight:600});
  const invalid=await vm.runInContext('requestPrintLayouts',context)(photo);
  assert.equal(invalid.options.length,2,'matching metadata receives both layouts');
  for(const call of drawCalls.slice(-20)) assert.equal(call[3],call[4],'square source remains square without stretching');
  const arbitrary=await vm.runInContext('requestPrintLayouts',context)({...photo,spec:'自定义',width:600,height:600});assert.equal(arbitrary.options.length,0,'non-matching ratios cannot request layouts');
  const oldDraft=store.snapshot?store.snapshot():{draft:{...store.draft,quantity:8,addon:5},addresses:store.addresses,orders:store.orders};oldDraft.draft.quantity=8;oldDraft.draft.addon=5;
  const normalized=vm.runInContext('plainPrintState',context)(oldDraft);assert.equal(normalized.draft.quantity,1);assert.equal(normalized.draft.addon,0);
  // Header exit and footer previous are independent; backtracking keeps the draft intact.
  await studio.startPrint();studio.selectCandidate(photo.id);await studio.preparePhoto();studio.nextLayouts();await studio.loadLayouts();studio.confirm();
  const retained=JSON.stringify(store.draft);
  studio.previousStep();assert.equal(studio.view,'layouts');studio.previousStep();assert.equal(studio.view,'select');studio.previousStep();assert.equal(studio.view,'select','first step has no previous page');
  assert.equal(studio.view,'select');assert.equal(JSON.stringify(store.draft),retained);
  store.draft.returnTo='/?page=album';studio.back();assert.equal(new URL(context.lastNavigation).searchParams.get('page'),'album');assert.equal(studio.view,'select','header does not switch steps');
  studio.view='confirm';studio.processing=true;studio.previousStep();assert.equal(studio.view,'confirm');studio.processing=false;
  await studio.enter({photo,kind:'finished',entry:'album',returnTo:'/?page=album'});assert.equal(studio.view,'layouts','album entry skips repeated photo selection');assert.equal(store.draft.photo.id,photo.id);
  await studio.enter({entry:'home'});assert.equal(studio.view,'select');assert.equal(store.draft.photo,null,'fresh entry starts with an empty selector');
  context.location.search='?page=print&print=preview';studio.$el={querySelectorAll:()=>[]};studio.syncLocation();assert.equal(studio.view,'select','legacy service homepage opens selection');
  // Layout and crop steps return to selection before replacing a photo.
  await studio.enter({photo,kind:'finished'});await studio.loadLayouts(true);const selectedDraft=JSON.stringify(store.draft);
  studio.openAlbum();assert.equal(studio.modal,null,'layout step has no direct replacement entry');
  studio.previousStep();assert.equal(studio.view,'select');studio.openAlbum();assert.equal(studio.modal,'album');studio.closeModal();
  assert.equal(JSON.stringify(store.draft),selectedDraft,'cancel replacement retains photo, layout and draft');studio.nextLayouts();assert.equal(studio.view,'layouts');
  // Printing deliberately accepts non-portrait phone photos through the entire order flow.
  const cat={...photo,id:'phone-cat',name:'小猫咪.jpg',width:900,height:600,spec:''};
  await studio.enter({photo:cat,kind:'phone',returnTo:'/?page=home'});assert.equal(studio.view,'crop');assert.equal(store.draft.kind,'phone');assert.equal(store.draft.photo.id,cat.id);
  assert.equal(studio.canSubmit,false);studio.confirm();assert.equal(studio.view,'crop');
  studio.view='layouts';await studio.loadLayouts(true);assert.equal(studio.view,'crop','cannot bypass crop with direct navigation');
  studio.setCrop({scale:1.5,offsetX:30,offsetY:-20});studio.previousStep();assert.equal(studio.view,'select');await studio.choosePhoto(cat,'phone');assert.equal(studio.view,'crop');assert.equal(studio.crop.scale,1.5,'reconfirming the same photo retains manual crop');failCrop=true;await studio.applyCrop();assert.equal(studio.view,'crop');assert.match(studio.error,/裁剪未完成/);assert.equal(store.draft.photo.id,cat.id);assert.equal(studio.crop.scale,1.5);
  failCrop=false;const originalBlob=cat.blob;await Promise.all([studio.applyCrop(),studio.applyCrop()]);assert.equal(studio.view,'layouts');assert.equal(cat.blob,originalBlob);assert.equal(store.draft.photo.width*7,store.draft.photo.height*5);assert.notEqual(store.draft.photo.id,cat.id);const croppedCatId=store.draft.photo.id;
  assert.equal(cropRenders.at(-1).scale,1.5);assert.equal(cropRenders.at(-1).offsetX,30);assert.equal(cropRenders.at(-1).offsetY,-20);assert.equal(cropRenders.length,2,'double confirm only renders once');
  context.decodePhotoBlob=async()=>({naturalWidth:store.draft.photo.width,naturalHeight:store.draft.photo.height});await studio.loadLayouts(true);assert.equal(studio.layouts.length,2);studio.confirm();await studio.loadQuote(true);assert.equal(studio.canSubmit,true,'phone/non-portrait photos can check out');
  const beforeCatOrder=store.orders.length;await studio.submitOrder();assert.equal(store.orders.length,beforeCatOrder+1);assert.equal(studio.order.photo.id,croppedCatId);assert.equal(studio.order.kind,'phone');assert.equal(studio.order.total,2980);assert.equal(studio.modal,'payment');
  studio.demoOutcome='success';await studio.pay();assert.equal(studio.flowCompleted,true);assert.equal(studio.order.status,'producing');const catOrderId=studio.order.id;
  await store.load();assert.equal(store.orders.find(o=>o.id===catOrderId).kind,'phone','phone source survives storage reload');
  // Pixel rounding is accepted, but square, landscape and small-two-inch ratios require a crop.
  const ratio=vm.runInContext('isPrintRatio',context);
  for(const [width,height]of [[25,35],[35,49],[295,413],[413,579]])assert.equal(ratio({width,height}),true);
  for(const [width,height]of [[600,600],[900,600],[350,450],[0,700],[NaN,700]])assert.equal(ratio({width,height}),false);
  await studio.enter({photo,kind:'finished'});assert.equal(studio.view,'layouts');assert.equal(store.draft.photo.id,photo.id,'matching photos are never re-encoded');
  const square={...photo,id:'square-original',width:600,height:600};library.finished.push(square);await studio.choosePhoto(square,'finished');assert.equal(studio.view,'crop');
  const preserved=library.finished.find(p=>p.id===square.id);const renderCount=cropRenders.length;
  studio.openAlbum();studio.closeModal();assert.equal(studio.view,'crop');assert.equal(cropRenders.length,renderCount,'closing picker never confirms crop');
  context.location.search='?page=print&print=confirm';studio.syncLocation();assert.equal(studio.view,'crop','refreshing checkout cannot bypass crop');
  studio.view='crop';studio.setCrop({scale:1,offsetX:0,offsetY:0});await studio.applyCrop();assert.equal(studio.view,'layouts');assert.equal(library.finished.find(p=>p.id===square.id),preserved);assert.equal(preserved.width,600);assert.equal(preserved.blob,square.blob);
  // Leaving during crop must not overwrite the draft when encoding completes later.
  await studio.choosePhoto(square,'finished');const pendingPhoto=store.draft.photo.id;
  cropResolve=true;const pendingCrop=studio.applyCrop();assert.equal(typeof cropResolve,'function');
  context.location.search='?page=home';studio.syncLocation();const resolveCrop=cropResolve;cropResolve=null;resolveCrop();await pendingCrop;
  assert.equal(store.draft.photo.id,pendingPhoto);assert.equal(studio.processing,false,'navigation cancels the pending crop');
  console.log('PASS: fixed 5:7 ratio gate, automatic advance, manual crop/retry/cancellation and immutable originals, direct selection and photo entry, fresh three-step journeys, sheet closure, completion without order navigation, single selection from library or phone, template matching, quote/address gating, double-submit protection, payment timeout/retry, physical fulfillment states, snapshots and failed-write recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;});
