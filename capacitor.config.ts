import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2b7d248d615045f2b25ac5c5ae219ac6',
  appName: 'budget-wiz-app',
  webDir: 'dist',
  server: {
    url: 'https://2b7d248d-6150-45f2-b25a-c5c5ae219ac6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;