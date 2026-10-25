import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{chunkSizeWarningLimit:750},server:{watch:{ignored:['**/artifacts/**','**/release/**','**/coverage/**']}}});
