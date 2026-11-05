/**
 * Expo config plugin with the two Android build tweaks this project needs. It runs on every
 * `expo prebuild`, so regenerating the android/ folder keeps them.
 *
 * 1. Release signing: signs release builds with the academy's own keystore instead of the shared debug key.
 *    It reads signing/keystore.properties (storeFile, storePassword, keyAlias, keyPassword). When that file is
 *    missing the release build falls back to the debug key, so a fresh checkout still builds.
 *
 * 2. Windows path limit: Expo raises CMake's object-path limit to 1024 characters, which only works when
 *    Windows long-path support is switched on. On a PC without it the native build stops with
 *    "ninja: error: mkdir(...): No such file or directory" or "Filename longer than 260 characters".
 *    Two settings fix that: the limit goes back to CMake's own default (so CMake shortens long object
 *    paths by itself), and the native build folders move to a short path under the user's home.
 */
const { withAppBuildGradle, withGradleProperties, withProjectBuildGradle } = require("@expo/config-plugins");

const MARKER = "// fajr-release-signing";

const LOADER = `
${MARKER}
def fajrSigningFile = new File(rootDir, "../signing/keystore.properties")
def fajrSigning = new Properties()
if (fajrSigningFile.exists()) {
    fajrSigningFile.withInputStream { fajrSigning.load(it) }
}
`;

const RELEASE_CONFIG = `
        release {
            if (fajrSigningFile.exists()) {
                storeFile new File(rootDir, "../signing/" + fajrSigning["storeFile"])
                storePassword fajrSigning["storePassword"]
                keyAlias fajrSigning["keyAlias"]
                keyPassword fajrSigning["keyPassword"]
            }
        }`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    // 1. Load the properties file before the android { } block
    src = src.replace(/\nandroid \{/, `${LOADER}\nandroid {`);

    // 2. Add a release signing config next to the debug one
    src = src.replace(/signingConfigs \{\s*\n(\s*)debug \{([\s\S]*?)\n\1\}/, (match) => `${match}${RELEASE_CONFIG}`);

    // 3. Point the release build type at it (the template uses the debug key there)
    src = src.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      (_m, before) => `${before}signingConfig fajrSigningFile.exists() ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = src;
    return cfg;
  });
}

function withShortObjectPaths(config) {
  return withGradleProperties(config, (cfg) => {
    const key = "expo.android.cmakeObjectPathMax";
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === "property" && item.key === key));
    // 0 = keep CMake's platform default (250 on Windows), which shortens over-long object paths
    cfg.modResults.push({ type: "property", key, value: "0" });
    return cfg;
  });
}

const STAGING_MARKER = "// fajr-short-native-build-dir";

// CMake can only shorten an over-long object path when the build folder itself is short enough.
// Inside the project the folder is already ~190 characters deep, so native builds are staged in a
// short folder under the user's home instead (one sub-folder per module).
const STAGING_BLOCK = `${STAGING_MARKER}
subprojects { sub ->
    ["com.android.application", "com.android.library"].each { pluginId ->
        sub.pluginManager.withPlugin(pluginId) {
            def stagingName = "m" + Integer.toHexString(sub.path.hashCode())
            sub.extensions.findByName("android")?.externalNativeBuild?.cmake?.buildStagingDirectory = new File(System.getProperty("user.home"), ".fa/cxx/" + stagingName)
        }
    }
}

`;

function withShortNativeBuildDir(config) {
  return withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(STAGING_MARKER)) return cfg;
    // It must be registered before the root plugins evaluate the modules, so it goes above them
    const anchor = /^apply plugin: "expo-root-project"/m;
    src = anchor.test(src) ? src.replace(anchor, (line) => `${STAGING_BLOCK}${line}`) : `${STAGING_BLOCK}${src}`;
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withFajrAndroidBuild(config) {
  return withShortNativeBuildDir(withShortObjectPaths(withReleaseSigning(config)));
};
