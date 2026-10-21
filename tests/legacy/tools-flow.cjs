// Source-level checks with mock browser objects: no browser clicking or AI API.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const stores={},data={};let persisted=[],failOrders=false,failAlbum=false,failDownload=false,downloads=[],renders=[],pixels=new Uint8ClampedArray([0,0,255,255,0,0,255,255,0,0,255,255,0,0,255,255,200,0,0,255,0,0,255,255,0,0,255,255,0,0,255,255,0,0,255,255,0,0,255,255]);
class MockImage{constructor(){this.naturalWidth=3;this.naturalHeight=3;}async decode(){}}
const context=vm.createContext({crypto:webcrypto,Blob,URL,URLSearchParams,Intl,Date,Event,history:{pushState(_state,_title,url){context.lastNavigation=String(url);}},Uint8Array,Uint8ClampedArray,Int32Array,Image:MockImage,
 location:{origin:'http://127.0.0.1:4178',pathname:'/',search:'?page=tool&tool=crop',href:'http://127.0.0.1:4178/?page=tool&tool=crop'},navigator:{onLine:true},
 window:{addEventListener(){},removeEventListener(){},dispatchEvent(){}},document:{activeElement:null,addEventListener(n,cb){if(n==='alpine:init')cb();},createElement(){return{width:0,height:0,getContext(){return{drawImage(){},fillRect(){},getImageData(){return{data:new Uint8ClampedArray(pixels)}},putImageData(p){pixels=p.data;}}},toBlob(cb,type,quality=.9){cb(new Blob([new Uint8Array(Math.round(100000*quality))],{type}));}}}},
 Alpine:{store(n,v){if(v)stores[n]=v;return stores[n];},data(n,f){data[n]=f;}},decodePhotoBlob:async()=>new MockImage(),
 renderPhotoBlob:async(blob,settings)=>{renders.push(settings);return new Blob(['rendered'],{type:'image/'+settings.format});},photoCropBounds:(w,h,tw,th)=>({x:0,y:0,w:tw,h:th}),
 actualPhotoURL:p=>'blob:'+p.id,downloadAlbumBlob:(blob,name)=>{if(failDownload)throw Error('download unavailable');downloads.push({blob,name});},setTimeout:cb=>{queueMicrotask(cb);return 1;},clearTimeout(){},readSnapshot:async()=>persisted,writeSnapshot:async x=>{if(failOrders)throw Error('storage');persisted=structuredClone(x);}
});
stores.account={session:{phone:"13800008000"}};
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/tools.js'),'utf8'),context);vm.runInContext('readToolOrders=readSnapshot;writeToolOrders=writeSnapshot;',context);
const photo={id:'finished-1',name:'成片.jpg',width:295,height:413,spec:'一寸 · 25 × 35 mm',type:'image/jpeg',size:10000,blob:new Blob(['real-photo'],{type:'image/jpeg'})};
const library={finished:[photo],ready:true,busy:false,snapshot(){return{finished:this.finished.slice(),archivedOriginals:[]}},async commit(next){if(failAlbum)throw Error('storage');this.finished=next.finished;}};stores.photoLibrary=library;
function studio(action,autoCheck=true){const s=data.toolStudio();s.$store=stores;s.page='tool';s.action=action;s.$nextTick=cb=>Promise.resolve(cb?.());s.route=function(view){this.view=view;};s.openPanel=function(name){if(!this.busy)this.panel=name;};s.go=page=>{s.destination=page};if(autoCheck){const accept=s.accept;s.accept=async function(...args){await accept.apply(this,args);if(this.portraitCheck.status==='awaiting')await this.choosePortraitOutcome('passed');};}return s;}
(async()=>{
 await stores.toolOrders.load();
 for(const action of ['repair','outfit','background']){const s=studio(action);await s.accept({photo,kind:'phone',context:{action}});assert.equal(s.sourceKind,'phone','all tools support phone photos');s.reset();await s.accept({photo:{...photo,id:'forged'},kind:'finished',context:{action}});assert.equal(s.photo,null,'finished photos must belong to the real library');}
 const repair=studio('repair');await repair.start();repair.panel='album';repair.candidateId=photo.id;await repair.useCandidate();assert.equal(repair.panel,null);assert.equal(repair.output,null);await repair.runService();assert.equal(repair.serviceApplied,false,'repair is gated by payment');
 await repair.openPayment();repair.paymentOutcome='cancel';await repair.pay();assert.equal(repair.paid,false);assert.equal(repair.output,null);const pendingId=repair.orderId;
 repair.error='';repair.comparison=72;failAlbum=true;repair.paymentOutcome='success';await Promise.all([repair.pay(),repair.pay()]);assert.equal(repair.orderId,pendingId);assert.equal(stores.toolOrders.items.length,1,'payment retries reuse same order');assert.equal(repair.serviceApplied,true);assert.equal(repair.repairResult,true);assert.equal(repair.primaryLabel,'重试保存');assert.equal(repair.primaryEnabled,true);
 assert.match(repair.error,/保留/);assert.equal(repair.paid,true);assert.equal(library.finished.length,1);failAlbum=false;const repairOrderCount=stores.toolOrders.items.length;await repair.primary();assert.equal(stores.toolOrders.items.length,repairOrderCount,'repair save retry does not charge again');assert.equal(library.finished.length,2);assert.equal(repair.view,'saved');assert.equal(repair.notice,'');assert.equal(repair.flowCompleted,true);assert.equal(repair.primaryLabel,'再处理一张');assert.equal(repair.comparison,72,'comparison remains on the saved result');repair.openResultAlbum();assert.equal(new URL(context.lastNavigation).searchParams.get('photo'),repair.savedRecord.id);assert.equal(library.finished[1].id,photo.id,'original remains');
 await repair.save();assert.equal(library.finished.length,2,'save is idempotent');
 const outfit=studio('outfit');await outfit.accept({photo,kind:'finished',context:{action:'outfit'}});assert.equal(outfit.standardized,true);assert.equal(outfit.primaryLabel,'开始换装');await outfit.runService();assert.equal(outfit.serviceApplied,false,'outfit cannot generate before payment');await outfit.primary();assert.equal(outfit.panel,'payment');assert.equal(library.finished.length,2);
 outfit.paymentOutcome='cancel';await outfit.pay();assert.equal(outfit.paid,false);assert.equal(outfit.serviceApplied,false);const outfitPendingId=outfit.orderId;outfit.error='';outfit.paymentOutcome='success';await outfit.pay();assert.equal(outfit.orderId,outfitPendingId);assert.equal(outfit.unlocked,true);assert.equal(outfit.serviceApplied,true);assert.equal(outfit.canSave,false,'completed paid result cannot save again');assert.equal(library.finished.length,3,'paid generation automatically saves');assert.equal(outfit.view,'saved');assert.equal(outfit.notice,'');assert.equal(outfit.flowCompleted,true);assert.equal(outfit.primaryLabel,'再处理一张');assert.equal(outfit.outfitResult,true);outfit.openResultAlbum();assert.equal(new URL(context.lastNavigation).searchParams.get('photo'),outfit.savedRecord.id,'paid result opens the exact saved photo');await outfit.save();assert.equal(library.finished.length,3,'repeated save is idempotent');
 const history=structuredClone(stores.toolOrders.items);
 const restoredRepair=studio('repair');await restoredRepair.resumeOrder(history.find(o=>o.action==='repair'));assert.equal(restoredRepair.repairResult,true);assert.ok(restoredRepair.savedRecord);assert.equal(restoredRepair.view,'saved');assert.equal(library.finished.length,3,'repair result recovery does not duplicate saved photo');restoredRepair.back();assert.equal(new URL(context.lastNavigation).searchParams.get('page'),'home','top return exits the tool');restoredRepair.view='work';await restoredRepair.primary();assert.equal(restoredRepair.repairResult,false);assert.equal(restoredRepair.photo,null);assert.equal(restoredRepair.step,0);assert.equal(restoredRepair.sourceURL,'');assert.equal(restoredRepair.output,null);assert.equal(restoredRepair.primaryLabel,'选取照片');assert.equal(restoredRepair.comparison,50);assert.equal(JSON.stringify(stores.toolOrders.items),JSON.stringify(history),'continue repair preserves earlier order');
 outfit.continueOutfit();assert.equal(outfit.outfitResult,false);assert.equal(outfit.photo,null);assert.equal(outfit.step,0);assert.equal(outfit.primaryLabel,'选取照片');outfit.selectOutfitCategory('women');assert.equal(outfit.outfit,'women-suit');assert.equal(outfit.unlocked,false);assert.equal(JSON.stringify(stores.toolOrders.items),JSON.stringify(history),'continue outfit leaves prior orders immutable');
 const resumed=studio('outfit');await resumed.resumeOrder(history.find(o=>o.action==='outfit'));assert.equal(resumed.unlocked,true);assert.equal(resumed.outfitResult,true);assert.equal(resumed.primaryLabel,'再处理一张');assert.equal(library.finished.length,3,'restored saved order does not duplicate album record');
 // Album write succeeds but order write fails: reload must target the same record.
 const partial=studio('repair');await partial.accept({photo,kind:'finished',context:{action:'repair'}});await partial.openPayment();failAlbum=true;await partial.pay();failAlbum=false;partial.error='';const partialOrderId=partial.orderId;
 failOrders=true;const beforePartial=library.finished.length;await partial.save();assert.equal(library.finished.length,beforePartial+1);assert.match(partial.error,/保留/);assert.equal(stores.toolOrders.items.find(o=>o.id===partialOrderId).savedId,null);
 failOrders=false;const recovered=studio('repair');await recovered.resumeOrder(stores.toolOrders.items.find(o=>o.id===partialOrderId));await recovered.save();assert.equal(library.finished.length,beforePartial+1,'partial-write reload does not duplicate finished photo');assert.equal(recovered.savedRecord.id,'tool-'+partialOrderId);
 // Restored outfit retains the standard base even when a new outfit is selected.
 const restoredOutfit=studio('outfit');await restoredOutfit.resumeOrder(history.find(o=>o.action==='outfit'));const standardBase=restoredOutfit.standardBlob;assert.ok(standardBase);restoredOutfit.continueOutfit();assert.equal(restoredOutfit.standardBlob,null);await restoredOutfit.accept({photo,kind:'finished',context:{action:'outfit'}});restoredOutfit.selectOutfitCategory('children');await restoredOutfit.openPayment();await restoredOutfit.pay();assert.equal(restoredOutfit.serviceApplied,true);assert.equal(restoredOutfit.outputWidth,restoredOutfit.spec.width);
 const legacy=studio('outfit'),legacyOrder={...history.find(o=>o.action==='outfit'),standardBlob:null};await legacy.resumeOrder(legacyOrder);assert.ok(legacy.standardBlob,'legacy resume rebuilds standard base');assert.equal(legacy.serviceApplied,true,'legacy saved preview is restored after rebuild');assert.equal(legacy.canSave,false);
 // A stale payment may finish its own order, but cannot change a newly opened tool.
 const pending=studio('repair');await pending.accept({photo,kind:'finished',context:{action:'repair'}});const originalCommit=stores.toolOrders.commit.bind(stores.toolOrders);let releaseWrite,enteredWrite;
 const writeEntered=new Promise(r=>enteredWrite=r);stores.toolOrders.commit=async function(mutator){await originalCommit(mutator);enteredWrite();await new Promise(r=>releaseWrite=r);stores.toolOrders.commit=originalCommit;};
 const paying=pending.pay();await writeEntered;pending.reset();pending.action='format';pending.view='home';releaseWrite();await paying;assert.equal(pending.action,'format');assert.equal(pending.view,'home');assert.equal(pending.orderId,null);assert.equal(pending.paid,false);
 // A stale save retains its old snapshots without navigating the new tool.
 const saving=studio('repair');failAlbum=true;await saving.resumeOrder({...history.find(o=>o.action==='repair'),savedId:null});failAlbum=false;saving.error='';const originalAlbumCommit=library.commit.bind(library);let releaseAlbum,enteredAlbum;const albumEntered=new Promise(r=>enteredAlbum=r);
 library.commit=async next=>{await originalAlbumCommit(next);enteredAlbum();await new Promise(r=>releaseAlbum=r);library.commit=originalAlbumCommit;};const savePending=saving.save();await albumEntered;saving.reset();saving.action='crop';saving.view='home';releaseAlbum();await savePending;assert.equal(saving.action,'crop');assert.equal(saving.view,'home');assert.equal(saving.savedRecord,null);
 const left=studio('repair');await left.accept({photo,kind:'finished',context:{action:'repair'}});let releaseOff,enteredOff;const offEntered=new Promise(r=>enteredOff=r);
 stores.toolOrders.commit=async function(m){await originalCommit(m);enteredOff();await new Promise(r=>releaseOff=r);stores.toolOrders.commit=originalCommit;};const offPay=left.pay();await offEntered;context.location.search='?page=home';left.syncLocation();assert.equal(left.paying,false);assert.equal(left.saving,false);context.location.search='?page=tool&tool=repair&view=work';left.syncLocation();assert.equal(left.busy,false,'return to same tool is not locked');releaseOff();await offPay;assert.equal(left.paying,false);
 const before=library.finished.length;
 for(const action of ['crop','format','resize']){const s=studio(action);await s.accept({photo,kind:'phone',context:{action}});assert.equal(s.sourceKind,'phone');assert.equal(s.canSave,true);assert.equal(s.config.sources.includes('finished'),true);await s.save();assert.equal(library.finished.length,before,'free tool must never add album records');assert.equal(s.view,'saved');}
 assert.equal(downloads.length,3);const format=studio('format');await format.accept({photo,kind:'finished',context:{action:'format'}});await format.setFormat('png');assert.equal(format.output.type,'image/png');await format.setFormat('jpeg');assert.equal(format.output.type,'image/jpeg');
 const crop=studio('crop');await crop.accept({photo,kind:'phone',context:{action:'crop'}});await crop.chooseSpec('one');assert.equal(renders.at(-1).outputWidth,295);assert.equal(renders.at(-1).outputHeight,413);const beforeRejected=renders.length;await crop.chooseSpec('custom');assert.equal(crop.specId,'one');assert.equal(renders.length,beforeRejected);
 const resize=studio('resize');await resize.accept({photo,kind:'phone',context:{action:'resize'}});resize.targetValue=20;resize.sizeUnit='KB';await resize.preview();assert.ok(resize.output.size<=20*1024);resize.targetValue=.02;resize.sizeUnit='MB';await resize.preview();assert.ok(resize.output.size<=.02*1048576);resize.targetValue=0;await resize.preview();assert.equal(resize.canSave,false);
 const background=studio('background');await background.accept({photo,kind:'phone',context:{action:'background'}});await background.setBackground('red');assert.equal(pixels[0],214);assert.equal(pixels[4*4],200,'foreground center color is preserved');
 const cancel=studio('repair');await cancel.accept({photo,kind:'finished',context:{action:'repair'}});failOrders=true;await cancel.pay();assert.equal(cancel.paid,false);assert.match(cancel.error,/失败/);failOrders=false;
 const autoRepair=studio('repair');await autoRepair.accept({photo,kind:'finished',context:{action:'repair'}});await autoRepair.primary();const beforeAuto=library.finished.length;await Promise.all([autoRepair.pay(),autoRepair.pay()]);assert.equal(library.finished.length,beforeAuto+1,'repair payment and processing automatically save exactly once');assert.ok(autoRepair.savedRecord);assert.equal(autoRepair.view,'saved');assert.equal(autoRepair.primaryLabel,'再处理一张');
 const failedOutfit=studio('outfit');await failedOutfit.accept({photo,kind:'finished',context:{action:'outfit'}});failAlbum=true;await failedOutfit.openPayment();await failedOutfit.pay();assert.equal(failedOutfit.paid,true);assert.equal(failedOutfit.serviceApplied,true);assert.equal(failedOutfit.savedRecord,null);assert.equal(failedOutfit.primaryLabel,'重试保存');assert.equal(failedOutfit.primaryEnabled,true);const retryOrder=failedOutfit.orderId,orderCount=stores.toolOrders.items.length;failAlbum=false;await failedOutfit.primary();assert.ok(failedOutfit.savedRecord);assert.equal(failedOutfit.orderId,retryOrder);assert.equal(stores.toolOrders.items.length,orderCount,'save retry has no new charge');
 // Previous-step navigation retains the photo, output and user settings across the introduction.
 for(const action of ['repair','outfit','crop','background','format','resize']) {
   const n=studio(action);await n.accept({photo,kind:'finished',context:{action}});
   n.format='png';n.targetValue=123;n.offsetX=12;
   const originalPhoto=n.photo,output=n.output,orderCount=stores.toolOrders.items.length;
   n.previousStep();assert.equal(n.step,0);assert.equal(n.primaryLabel,'下一步');assert.equal(n.photo,originalPhoto);
   n.previousStep();assert.equal(n.view,'work');assert.equal(n.step,0,'selection is the first step and has no previous page');
   await n.primary();assert.equal(n.step,1);assert.equal(n.format,'png');assert.equal(n.targetValue,123);assert.equal(n.offsetX,12);assert.equal(n.output,output);
   assert.equal(stores.toolOrders.items.length,orderCount,'navigation never purchases a service');
   n.returnTo='/?page=album';n.back();assert.equal(new URL(context.lastNavigation).searchParams.get('page'),'album');
 }
 for(const action of ['repair','outfit','crop','background','format','resize']) {
   const n=studio(action);await n.enter({action,returnTo:'/?page=album'});assert.equal(n.view,'work');assert.equal(n.step,0);assert.equal(n.photo,null);
   await n.enter({action,photo,kind:'finished',returnTo:'/?page=album'});assert.equal(n.view,'work');assert.equal(n.step,1);assert.equal(n.photo.id,photo.id);assert.equal(n.returnTo,'/?page=album');
   n.reset();context.location.search='?page=tool&tool='+action;n.syncLocation();assert.equal(n.view,'work');assert.equal(n.step,0,'legacy tool links open selection');
 }
 // Same-photo reselection preserves edits, output, and any pending purchase.
 for(const action of ['repair','outfit','crop','background','format','resize']){
  const n=studio(action);await n.accept({photo,kind:'finished',context:{action}});n.targetValue=35;n.scale=1.4;n.background='red';n.format='png';
  const retainedOutput=n.output,checks=n.portraitCheck;n.previousStep();n.pick();await n.useCandidate();
  assert.equal(n.targetValue,35);assert.equal(n.scale,1.4);assert.equal(n.background,'red');assert.equal(n.format,'png');assert.equal(n.output,retainedOutput);assert.equal(n.portraitCheck,checks);assert.equal(n.panel,null);assert.equal(n.step,1);
 }
 // One replacement entry belongs to selection; cancel preserves edits, replacing resets them.
 for(const action of ['repair','outfit','crop','background','format','resize']){
  const n=studio(action);await n.accept({photo,kind:'finished',context:{action}});
  n.scale=1.6;n.targetValue=35;n.format='png';const oldOutput=n.output,oldPhoto=n.photo;
  n.pick();assert.equal(n.panel,null,'processing step cannot open replacement picker');
  n.previousStep();n.pick();assert.equal(n.panel,'album');n.closePanel();
  assert.equal(n.step,0);assert.equal(n.photo,oldPhoto);assert.equal(n.output,oldOutput);assert.equal(n.scale,1.6);
  await n.primary();assert.equal(n.step,1);assert.equal(n.output,oldOutput);assert.equal(n.format,'png');
  n.previousStep();n.pick();const replacement={...photo,id:'replacement-'+action,blob:new Blob(['replacement'],{type:'image/jpeg'})};
  await n.accept({photo:replacement,kind:'phone',context:{action}});
  assert.equal(n.step,1);assert.equal(n.photo.id,replacement.id);assert.equal(n.scale,1);assert.equal(n.orderId,null);assert.equal(n.serviceApplied,false);
  if(n.output)assert.notEqual(n.output,oldOutput);assert.equal(n.portraitEligible,true);assert.equal(n.panel,null);
 }
 // Non-preset outfit dimensions must survive generation, save and order recovery.
 const square={...photo,id:'square',width:600,height:600,spec:'自定义'};library.finished.push(square);
 const squareTool=studio('outfit');await squareTool.accept({photo:square,kind:'finished',context:{action:'outfit'}});assert.equal(renders.at(-1).outputWidth,600);assert.equal(renders.at(-1).outputHeight,600);await squareTool.pay();assert.equal(squareTool.savedRecord.width,600);assert.equal(squareTool.savedRecord.height,600);
 const squareOrder=stores.toolOrders.items.find(o=>o.id===squareTool.orderId);const squareResume=studio('outfit');await squareResume.resumeOrder(squareOrder);assert.equal(squareResume.outputWidth,600);assert.equal(squareResume.outputHeight,600);
 // A failed initial order read is actually retried rather than reusing the failed promise.
 const storeReady=stores.toolOrders.ready;stores.toolOrders.ready=false;stores.toolOrders.error='读取失败';stores.toolOrders.loading=Promise.resolve();
 const readRetry=studio('repair');await readRetry.accept({photo,kind:'finished',context:{action:'repair'}});await readRetry.openPayment();assert.equal(stores.toolOrders.ready,true);assert.equal(readRetry.panel,'payment');
 // Prototype eligibility: awaiting/rejected/error states cannot purchase or run repair.
 const demo=studio('repair',false),beforeCheckOrders=stores.toolOrders.items.length;
 const checking=demo.accept({photo,kind:'phone',context:{action:'repair'}});assert.equal(demo.stage,'checking');assert.equal(demo.primaryEnabled,false);await demo.pay();await checking;
 assert.equal(demo.sourceKind,'phone');assert.equal(demo.panel,'portraitOutcome');assert.equal(demo.portraitCheck.status,'awaiting');await demo.openPayment();await demo.pay();assert.equal(stores.toolOrders.items.length,beforeCheckOrders);
 demo.choosePortraitOutcome('rejected','no_face');assert.equal(demo.panel,null);assert.match(demo.portraitCheck.reasons[0].message,/人脸/);assert.equal(demo.portraitEligible,false);await demo.openPayment();await demo.pay();await demo.runService();assert.equal(demo.serviceApplied,false);assert.equal(stores.toolOrders.items.length,beforeCheckOrders);
 demo.openPanel('portrait');assert.equal(demo.panel,'portrait');demo.closePanel();await demo.validatePortraitPhoto();demo.choosePortraitOutcome('error');assert.equal(demo.primaryEnabled,false);await demo.validatePortraitPhoto();assert.equal(demo.panel,'portraitOutcome');demo.closePanel();assert.equal(demo.portraitCheck.status,'error','dismissed check never counts as passed');
 await demo.validatePortraitPhoto();demo.choosePortraitOutcome('passed');assert.equal(demo.primaryEnabled,true);await demo.openPayment();assert.equal(demo.panel,'payment');await demo.pay();assert.ok(demo.savedRecord);assert.equal(stores.toolOrders.items.length,beforeCheckOrders+1);const paidPhoto=demo.savedRecord.id;demo.continueService();assert.equal(demo.step,0);assert.equal(demo.photo,null);assert.equal(demo.orderId,null);assert.equal(demo.portraitCheck.status,'idle');assert.ok(library.finished.some(p=>p.id===paidPhoto));
 // Switching tools while the mock check is pending must not open a stale result drawer.
 const staleCheck=studio('repair',false);const stalePending=staleCheck.accept({photo,kind:'phone',context:{action:'repair'}});staleCheck.reset();staleCheck.action='format';await stalePending;assert.equal(staleCheck.panel,null);assert.equal(staleCheck.photo,null);assert.equal(staleCheck.action,'format');
 // Only the three portrait-dependent tools are checked, before standardization, payment or export.
 for(const action of ['repair','outfit','background']){
  const n=studio(action,false);await n.accept({photo,kind:'phone',context:{action}});
  assert.equal(n.config.requiresPortrait,true);assert.equal(n.panel,'portraitOutcome');assert.equal(n.step,0);assert.equal(n.portraitCheck.status,'awaiting');assert.equal(n.standardized,false);assert.equal(n.output,null);assert.equal(n.canSave,false);
  await n.standardize();await n.preview();await n.pay();assert.equal(n.output,null);assert.equal(n.standardized,false);
  await n.choosePortraitOutcome('rejected','not_id');assert.equal(n.portraitEligible,false);assert.equal(n.step,0);assert.equal(n.panel,null);assert.equal(n.photo,photo);assert.equal(n.showPortraitCheck,true);await n.standardize();await n.preview();assert.equal(n.output,null);assert.equal(n.primaryLabel,'下一步');assert.equal(n.primaryEnabled,false);assert.equal(n.canSave,false);n.pick();assert.equal(n.panel,'album');assert.equal(n.step,0);assert.equal(n.photo,photo);n.closePanel();
  await n.validatePortraitPhoto();await n.choosePortraitOutcome('error');assert.equal(n.step,0);assert.equal(n.showPortraitCheck,true);assert.equal(n.primaryLabel,'下一步');assert.equal(n.primaryEnabled,false);assert.equal(n.canSave,false);await n.validatePortraitPhoto();assert.equal(n.panel,'portraitOutcome');await n.choosePortraitOutcome('passed');assert.equal(n.portraitEligible,true);assert.equal(n.panel,null);assert.equal(n.showPortraitCheck,false,'passed checks never leave a success prompt');assert.equal(n.notice,'');assert.equal(n.step,1,'passed checks advance automatically without another next click');assert.equal(n.standardized,action!=='repair');assert.equal(n.canSave,action==='background');if(action==='background')assert.equal(n.backgroundEditing,true);else assert.equal(n.serviceApplied,false,'passing the check does not start a paid service');
  if(action==='background'){const count=downloads.length,albumCount=library.finished.length;await n.save();assert.equal(downloads.length,count+1);assert.equal(library.finished.length,albumCount);assert.equal(n.savedRecord,null);assert.equal(n.view,'saved');assert.equal(n.showPortraitCheck,false);assert.equal(n.canSave,false);n.previousStep();assert.equal(n.view,'saved','background completion cannot go back');const savedColor=n.background;await n.setBackground('red');assert.equal(n.background,savedColor);await n.start();assert.equal(n.step,0);assert.equal(n.photo,null);assert.equal(n.portraitCheck.status,'idle');}
 }
 const cat={...photo,id:'cat',name:'小猫咪.jpg',width:900,height:600,spec:''};
 for(const action of ['crop','format','resize']){
  const n=studio(action,false);await n.accept({photo:cat,kind:'phone',context:{action}});assert.equal(n.portraitCheck.status,'idle');assert.equal(n.panel,null);assert.equal(n.canSave,true,'unrestricted tools accept non-portrait photos');
 }
 // Navigating away during preparation exposes a recovery path, without bypassing the portrait gate.
 for(const action of ['outfit','background']){
  const n=studio(action);await n.accept({photo,kind:'phone',context:{action}});n.stage='standardizing';n.standardized=false;
  context.location.search='?page=home';n.syncLocation();assert.equal(n.stage,'standardize-required');assert.match(n.error,/重试/);
  context.location.search='?page=tool&tool='+action+'&view=work';await n.retry();assert.equal(n.standardized,true);assert.equal(n.error,'');
 }
 // Browser back after completion starts a fresh selection instead of reopening the old editor.
 const completedBackground=studio('background');await completedBackground.accept({photo,kind:'phone',context:{action:'background'}});await completedBackground.save();context.location.search='?page=tool&tool=background&view=work';completedBackground.syncLocation();assert.equal(completedBackground.step,0);assert.equal(completedBackground.photo,null);assert.equal(completedBackground.flowCompleted,false);
 // All free-tool completion pages end the current flow; restart returns to photo selection.
 for(const action of ['crop','background','format','resize']){
  const n=studio(action);await n.accept({photo,kind:'phone',context:{action}});assert.equal(n.canSave,true);await n.save();assert.equal(n.view,'saved');assert.equal(n.flowCompleted,true);assert.equal(n.canSave,false);n.previousStep();assert.equal(n.view,'saved');
  await n.start();assert.equal(n.view,'work');assert.equal(n.step,0);assert.equal(n.photo,null);assert.equal(n.flowCompleted,false);
 }
 // Background now uses device delivery for both sources; it never writes an album or order.
 for(const kind of ['phone','finished']){
  const n=studio('background');await n.accept({photo,kind,context:{action:'background'}});await n.setBackground('red');
  assert.equal(n.primaryLabel,'保存到设备');assert.equal(n.savesToAlbum,false);
  const originalBlob=photo.blob,output=n.output,albumCount=library.finished.length,downloadCount=downloads.length,orderCount=stores.toolOrders.items.length;
  await Promise.all([n.primary(),n.primary()]);
  assert.equal(library.finished.length,albumCount);assert.equal(downloads.length,downloadCount+1);assert.equal(stores.toolOrders.items.length,orderCount);
  assert.equal(n.view,'saved');assert.equal(n.step,2);assert.equal(n.flowCompleted,true);assert.equal(n.savedRecord,null);assert.equal(downloads.at(-1).blob,output);
  assert.equal(library.finished.find(p=>p.id===photo.id).blob,originalBlob);assert.equal(n.resultSummary,'红色背景');
  await n.save();n.previousStep();assert.equal(n.view,'saved');assert.equal(downloads.length,downloadCount+1);
  await n.start();assert.equal(n.step,0);assert.equal(n.photo,null);assert.equal(n.savedRecord,null);assert.equal(n.portraitCheck.status,'idle');
 }
 // Every device-export failure retries the existing output, never renders or creates an order.
 for(const action of ['background','crop','format','resize']){
  const n=studio(action);await n.accept({photo,kind:'phone',context:{action}});
  const output=n.output,original=n.photo,renderCount=renders.length,downloadCount=downloads.length,albumCount=library.finished.length,orderCount=stores.toolOrders.items.length;
  failDownload=true;await n.primary();assert.match(n.error,/保存未完成/);assert.equal(n.saveFailed,true);assert.equal(n.primaryLabel,'重试保存');assert.equal(n.primaryEnabled,true);assert.equal(n.view,'work');assert.equal(n.flowCompleted,false);assert.equal(n.output,output);assert.equal(n.photo,original);
  failDownload=false;await Promise.all([n.primary(),n.primary()]);
  assert.equal(n.view,'saved');assert.equal(n.saveFailed,false);assert.equal(n.error,'');assert.equal(downloads.length,downloadCount+1);assert.equal(downloads.at(-1).blob,output);assert.equal(renders.length,renderCount,'saving retry must not render again');assert.equal(library.finished.length,albumCount);assert.equal(stores.toolOrders.items.length,orderCount);
 }
 // Editing after an export failure invalidates recovery of the old output.
 const revised=studio('format');await revised.accept({photo,kind:'phone',context:{action:'format'}});failDownload=true;await revised.save();failDownload=false;await revised.setFormat('png');assert.equal(revised.saveFailed,false);assert.equal(revised.error,'');await revised.save();assert.equal(downloads.at(-1).blob.type,'image/png');assert.equal(revised.resultSummary,'JPG → PNG');
 const summaryCrop=studio('crop');await summaryCrop.accept({photo,kind:'phone',context:{action:'crop'}});summaryCrop.specId='one';await summaryCrop.preview();await summaryCrop.save();assert.equal(summaryCrop.resultSummary,'一寸 · 25 × 35 mm');assert.match(summaryCrop.outputInfo,/295 × 413/);
 const summarySize=studio('resize');await summarySize.accept({photo,kind:'phone',context:{action:'resize'}});assert.match(summarySize.resultSummary,/目标不超过 200 KB · 实际/);
 // Final paid results cannot mutate outfit settings or run the paid processor again.
 const finalPaid=studio('outfit');await finalPaid.resumeOrder(history.find(o=>o.action==='outfit'));const finalOutput=finalPaid.output,finalOutfit=finalPaid.outfit,paidOrderCount=stores.toolOrders.items.length;await finalPaid.runService();finalPaid.selectOutfitCategory('women');finalPaid.selectOutfit('women-shirt');assert.equal(finalPaid.output,finalOutput);assert.equal(finalPaid.outfit,finalOutfit);assert.equal(stores.toolOrders.items.length,paidOrderCount);assert.equal(finalPaid.view,'saved');
 console.log('PASS: seven-tool source/content rules, prototype portrait gates, paid-before-repair, payment-before-outfit, automatic paid-tool save and result recovery/continuation, duplicate-payment/save protection, order snapshots/recovery, all four free-tool downloads with output-preserving retry, shared paid/free completion and task summaries, formats/preset crop/size limits/background foreground preservation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
