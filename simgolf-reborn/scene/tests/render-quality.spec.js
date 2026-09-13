import {test,expect} from '@playwright/test';
import {renderQuality} from '../src/render-quality.js';

function renderer(name, unmasked=true){
 return {getContext:()=>({RENDERER:1,getExtension:()=>unmasked?{UNMASKED_RENDERER_WEBGL:2}:null,getParameter:()=>name})};
}
test('software WebGL keeps shadows within a CPU-friendly budget',()=>{
 for(const name of ['ANGLE (Google, Vulkan SwiftShader Device)', 'llvmpipe (LLVM 18)', 'softpipe']){
  expect(renderQuality(renderer(name),2)).toEqual({pixelRatio:1,shadowSize:1024});
 }
});
test('hardware and privacy-masked renderers retain normal quality',()=>{
 expect(renderQuality(renderer('ANGLE (Apple M4)'),2)).toEqual({pixelRatio:1.75,shadowSize:4096});
 expect(renderQuality(renderer('WebKit WebGL',false),1)).toEqual({pixelRatio:1,shadowSize:4096});
});
