/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "nl.weegstation.app",
  appName: "WeegStation",
  webDir: "dist-mobile",
  android: {
    path: "mobile/android",
    allowMixedContent: true,
  },
  ios: {
    path: "mobile/ios",
    contentInset: "automatic",
  },
  server: {
    androidScheme: "http",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#1a1c1e",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1a1c1e",
    },
  },
};

module.exports = config;
