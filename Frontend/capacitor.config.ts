import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.babujichaay.pos',
  appName: 'Babuji Chaay',
  webDir: 'dist',
  server: {
    androidScheme: 'https', 
    hostname: 'localhost', 
    cleartext: true,
  }
};

export default config;