import {defineConfig} from '@playwright/test';
import base from './playwright.config.js';

// Keep playable-game regression separate from isolated executable recovery.
// The latter remains available through the normal test command.
export default defineConfig({
 ...base,
 testMatch:'*.spec.js',
 testIgnore:'**/original-*.spec.js',
});
