// Source behavior checks with mock geometry, not an automatic browser/UI test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let now=0,nextId=1,page='home',width=240;
const frames=new Map(),classes=new Set(),children=[];
function element(){return{style:{},attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},append(node){this.children.push(node);},remove(){},innerHTML:''};}
const buttons=[0,1,2].map(i=>({innerHTML:'<span>label</span>',getBoundingClientRect(){return{left:105+i*(width-8)/3,right:105+(i+1)*(width-8)/3,top:205,bottom:251};}}));
const menu={get clientWidth(){return width;},clientLeft:1,clientTop:1,querySelectorAll(){return buttons;},getBoundingClientRect(){return{left:100,top:200};},prepend(node){children.unshift(node);},append(node){children.push(node);},classList:{add(c){classes.add(c);},remove(...cs){cs.forEach(c=>classes.delete(c));},toggle(c,on){on?classes.add(c):classes.delete(c);}}};
const motion={matches:false,addEventListener(){},removeEventListener(){}};
const context=vm.createContext({console,Math,Number,CSS:{supports(){return true;}},performance:{now:()=>now},matchMedia:()=>motion,
 requestAnimationFrame(fn){const id=nextId++;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},ResizeObserver:class{observe(){}disconnect(){}},
 document:{createElementNS:element,createElement:element,addEventListener(){}},Alpine:{data(){}}});
vm.runInContext(fs.readFileSync('dist/liquid-tabs.js','utf8'),context);
context.menu=menu;context.readPage=()=>page;vm.runInContext('var indicator=new LiquidTabIndicator(menu,readPage)',context);
const indicator=context.indicator;
function advance(ms){now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));}
function expected(index){return{left:4+index*(width-8)/3,right:4+(index+1)*(width-8)/3,top:4,bottom:50};}
function same(a,b){for(const key of Object.keys(b))assert.ok(Math.abs(a[key]-b[key])<1e-8,key);}
indicator.sync(true);same(indicator.current,expected(0));assert.ok(classes.has('liquid-ready'));
page='album';indicator.sync();advance(80);assert.ok(indicator.current.left>4);assert.ok(indicator.current.right-indicator.current.left>(width-8)/3,'capsule stretches during travel');
const interrupted={...indicator.current};page='my';indicator.sync();same(indicator.current,interrupted);assert.equal(frames.size,1,'new target cancels previous frame');
advance(320);same(indicator.current,expected(2));assert.ok(!classes.has('liquid-moving'));
page='home';indicator.sync();advance(320);same(indicator.current,expected(0));
page='album';indicator.sync();advance(40);motion.matches=true;indicator.sync(true);same(indicator.current,expected(1));assert.equal(frames.size,0,'reduced motion snaps and cancels travel');
motion.matches=false;width=210;indicator.sync(true);same(indicator.current,expected(1));
page='my';indicator.sync();advance(30);indicator.destroy();assert.equal(frames.size,0);assert.ok(!classes.has('liquid-ready'));
assert.ok(!/NaN|Infinity/.test(indicator.path.attrs.d));
console.log('PASS: fluid stretching, exact landing, rapid retarget without jumps, single active animation, reduced motion, resize alignment and cleanup.');
