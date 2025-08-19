export default {
  expo: {
    name: "ShadowRooms",
    slug: "shadowrooms",
    scheme: "shadowrooms",
    version: "0.1.0",
    orientation: "portrait",
    updates: { fallbackToCacheTimeout: 0 },
    assetBundlePatterns: ["**/*"],
    ios: { supportsTablet: false },
    android: { package: "com.shadowrooms.app" },
    extra: {
      API_BASE: process.env.API_BASE || ""
    }
  }
}


