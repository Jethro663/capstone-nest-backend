const appStoreBundleIdentifier = "com.nexora.lms.mobile.7A4H2D888M";

module.exports = ({ config }) => {
  const requestedBundleIdentifier =
    process.env.NEXORA_IOS_BUNDLE_IDENTIFIER?.trim();

  if (
    requestedBundleIdentifier &&
    requestedBundleIdentifier !== appStoreBundleIdentifier
  ) {
    throw new Error(
      `NEXORA_IOS_BUNDLE_IDENTIFIER must be ${appStoreBundleIdentifier}.`,
    );
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier:
        requestedBundleIdentifier || config.ios.bundleIdentifier,
    },
  };
};
