import type { CapacitorConfig } from '@capacitor/cli';

// Native iPad/iPhone wrapper. The web build in dist/ ships inside a WKWebView;
// run `npm run build && npx cap sync ios`, then open ios/App in Xcode.
const config: CapacitorConfig = {
  appId: 'com.fairwaymogul.app',
  appName: 'Fairway Mogul',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#4a4d9b',
  },
};

export default config;
