// Real migrated controllers + React-observed records + structured-clone storage boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createController,getStore} from '../src/runtime/state.js';
let current=new URL('http://127.0.0.1:4180/?page=camera&camera=capture');
Object.defineProperty(globalThis,'location',{get:()=>current,configurable:true});
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
globalThis.window=new EventTarget();
globalThis.history={pushState(a,b,url){current=new URL(url,current)},replaceState(a,b,url){current=new URL(url,current)}};
globalThis.document={hidden:false,activeElement:null,addEventListener(){},removeEventListener(){}};
const databases=new Map();
globalThis.indexedDB={open(name){
 const request={};queueMicrotask(()=>{
  const fresh=!databases.has(name);if(fresh)databases.set(name,new Map());const database=databases.get(name);
  request.result={createObjectStore(store,options){database.set(store,{records:new Map(),keyPath:options?.keyPath})},transaction(store,mode){
   const transaction={};const table=database.get(store);
   transaction.objectStore=()=>({get(key){const result={};queueMicrotask(()=>{result.result=structuredClone(table.records.get(key));result.onsuccess?.()});return result;},put(value,key){const copy=structuredClone(value);table.records.set(key??copy[table.keyPath],copy);queueMicrotask(()=>transaction.oncomplete?.())},delete(key){table.records.delete(key);queueMicrotask(()=>transaction.oncomplete?.())}});return transaction;
  }};
  if(fresh)request.onupgradeneeded?.();request.onsuccess?.();
 });return request;
}};
await import('../src/domain/index.js');
const {readCameraSession}=await import('../src/domain/camera.js');
const {readAlbumState}=await import('../src/domain/album.js');
test('camera snapshots and paid saves work with React reactive records and actual cloneable photo files',async()=>{
 const root=createController('phoneDemo');root.scope.page='camera';const camera=createController('cameraStudio',[],root.scope);
 camera.refs.liveVideo={srcObject:null};camera.start();
 const blob=new Blob(['actual-photo-file'],{type:'image/jpeg'});
 await camera.scope.newDraft('phone',{id:'source',name:'photo.jpg',width:640,height:480,blob,type:blob.type,size:blob.size});
 assert.equal(camera.scope.step,'confirm');assert.equal(camera.scope.error,'');
 const draft=await readCameraSession(camera.scope.draft.id);assert.equal(await draft.photo.blob.text(),'actual-photo-file');
 const library=getStore('photoLibrary');library.ready=true;
 camera.scope.standardBlob=blob;camera.scope.outputBlob=blob;camera.scope.draft.status='ready';camera.scope.draft.order={id:'paid-one',status:'paid'};
 assert.equal(camera.scope.canSave,true);await camera.scope.saveFinished();assert.equal(camera.scope.step,'saved');assert.equal(camera.scope.error,'');
 const saved=await readAlbumState();assert.equal(saved.finished.length,1);assert.equal(await saved.finished[0].blob.text(),'actual-photo-file');assert.equal(await saved.finished[0].rawBlob.text(),'actual-photo-file');
 const session=await readCameraSession(camera.scope.draft.id);assert.equal(session.draft.savedId,saved.finished[0].id);
 await camera.scope.saveFinished();assert.equal(library.finished.length,1);camera.stop();
});
