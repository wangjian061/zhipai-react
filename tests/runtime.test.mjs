import test from 'node:test';
import assert from 'node:assert/strict';
import {observable,raw,storageValue,subscribe,registerController,registerStore,getStore,createController,withLocals} from '../src/runtime/state.js';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('React subscription sees nested changes and async updates while native blobs remain unwrapped',async()=>{
 const blob=new Blob(['photo'],{type:'image/jpeg'}),state=observable({photo:{blob},items:[],count:0});
 let notices=0;const off=subscribe(()=>notices++);
 state.items.push({id:'one'});state.items[0].id='two';state.count=1;await settle();
 assert.ok(notices>0);assert.equal(state.photo.blob,blob);
 const copy=structuredClone(storageValue(state));assert.equal(copy.items[0].id,'two');assert.equal(await copy.photo.blob.text(),'photo');
 off();assert.equal(raw(state).count,1);
});
test('child state writes shared route on parent and lifecycle methods run only in their own controller',()=>{
 let starts=0,stops=0;
 registerController('test-parent',()=>({page:'home',init(){starts++},destroy(){stops++},go(page){this.page=page}}));
 registerController('test-child',()=>({panel:null}));
 const parent=createController('test-parent'),child=createController('test-child',[],parent.scope);
 parent.start();child.start();child.scope.page='album';assert.equal(parent.scope.page,'album');
 child.scope.go('camera');assert.equal(parent.scope.page,'camera');
 child.stop();parent.stop();assert.equal(starts,1);assert.equal(stops,1);
});
test('derived and cross-store watchers react once to a new value and stop on unmount',async()=>{
 registerStore('runtime-test',{ready:false});let values=[];
 registerController('test-watches',()=>({first:1,last:2,get total(){return this.first+this.last},init(){this.$watch('total',v=>values.push(v));this.$watch('$store.runtime-test.ready',v=>values.push(v));}}));
 const instance=createController('test-watches');instance.start();instance.scope.first=5;getStore('runtime-test').ready=true;await settle();assert.deepEqual(values,[7,true]);
 instance.stop();instance.scope.last=9;await settle();assert.deepEqual(values,[7,true]);
});
test('loop-local names shadow controller state without corrupting it',()=>{
 const parent=observable({index:9,amount:2}),local=withLocals(parent,{index:0,item:{name:'照片'}});
 assert.equal(local.index,0);assert.equal(local.amount,2);local.amount=3;local.index=1;assert.equal(parent.index,9);assert.equal(parent.amount,3);
});
test('storage conversion preserves shared identity and cycles while removing reactive wrappers',()=>{
 const object={name:'photo'};object.self=object;const state=observable({first:object,second:object});const value=storageValue(state);
 assert.equal(value.first,value.second);assert.equal(value.first.self,value.first);assert.doesNotThrow(()=>structuredClone(value));
});
test('read-only constant collections retain identity when read through reactive state',()=>{
 const item=Object.freeze({id:'pass',label:'检测通过'});
 const choices=Object.freeze([item]);
 const checks=Object.freeze({checks:choices});
 const action=()=>true;
 const locked=Object.defineProperty({},'action',{value:action,configurable:false,writable:false});
 const state=observable({choices,checks,locked});
 assert.equal(state.choices[0],item);
 assert.deepEqual(state.choices.map(value=>value.label),['检测通过']);
 assert.equal(state.checks.checks,choices);
 assert.equal(state.locked.action,action);
 assert.throws(()=>{state.choices[0]={id:'changed'}},TypeError);
});
