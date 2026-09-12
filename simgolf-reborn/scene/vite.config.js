import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 build:{rollupOptions:{input:{terrainPreview:fileURLToPath(new URL('./terrain-preview.html',import.meta.url)),game:fileURLToPath(new URL('./index.html',import.meta.url)),login:fileURLToPath(new URL('./login.html',import.meta.url))}}},
 server:{proxy:{'/api':'http://127.0.0.1:8788'}}
});
