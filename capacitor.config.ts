import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = {
  appId: 'art.onlyideas.app', appName: 'OnlyIdeas', webDir: 'dist',
  loggingBehavior: 'none',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#f6f4ed' },
  ios: { backgroundColor: '#f6f4ed', contentInset: 'always' },
}
export default config
