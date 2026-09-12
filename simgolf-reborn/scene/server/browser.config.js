import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./browser-tests',workers:1,use:{baseURL:'http://127.0.0.1:4177',channel:'chrome',viewport:{width:1440,height:1000}},webServer:{command:'VITE_AUTH_REQUIRED=true npm run dev -- --port 4177',url:'http://127.0.0.1:4177',reuseExistingServer:false},timeout:30000});
