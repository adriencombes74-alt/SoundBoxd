import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.combes.soundboxd',
  appName: 'SoundBoxd',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
