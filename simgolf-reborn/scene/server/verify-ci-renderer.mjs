import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {browserRuntime} from '../browser-runtime.js';
const browser=await chromium.launch({channel:'chrome',headless:browserRuntime.headless,...browserRuntime.launchOptions});
try {
 const page=await browser.newPage();
 page.on('console',message=>console.log(message.type(),message.text()));
 const result=await page.evaluate(()=>{
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2');
  if(!gl)return {error:'WebGL2 context creation failed'};
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),version:gl.getParameter(gl.VERSION)};
 });
 console.log(JSON.stringify(result));
 assert.ok(!result.error,result.error);
 assert.match(result.renderer,/llvmpipe/i);
} finally {await browser.close();}
