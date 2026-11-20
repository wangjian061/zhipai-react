// Real migrated controllers + React-observed records + structured-clone storage boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createController,getStore} from '../src/runtime/state.js';
import {database} from './helpers/memory-indexeddb.mjs';
let current=new URL('http://127.0.0.1:4180/?page=camera&camera=capture');
Object.defineProperty(globalThis,'location',{get:()=>current,configurable:true});
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
globalThis.window=new EventTarget();
globalThis.history={pushState(a,b,url){current=new URL(url,current)},replaceState(a,b,url){current=new URL(url,current)}};
globalThis.document={hidden:false,activeElement:null,addEventListener(){},removeEventListener(){}};
const databases = new Map();
globalThis.indexedDB = {
 open(name) {
  if (!databases.has(name)) databases.set(name, database());
  return databases.get(name).open();
 }
};
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
 camera.scope.standardBlob=blob;camera.scope.outputBlob=blob;camera.scope.draft.status='ready';const owner='13800008000';getStore('account').session={phone:owner};camera.scope.draft.order={id:'paid-one',owner,status:'paid'};
 assert.equal(camera.scope.canSave,true);await camera.scope.saveFinished();assert.equal(camera.scope.step,'saved');assert.equal(camera.scope.error,'');
 const saved=await readAlbumState();assert.equal(saved.finished.length,1);assert.equal(await saved.finished[0].blob.text(),'actual-photo-file');assert.equal(await saved.finished[0].rawBlob.text(),'actual-photo-file');
 const session=await readCameraSession(camera.scope.draft.id);assert.equal(session.draft.savedId,saved.finished[0].id);
 await camera.scope.saveFinished();assert.equal(library.finished.length,1);camera.stop();
});
