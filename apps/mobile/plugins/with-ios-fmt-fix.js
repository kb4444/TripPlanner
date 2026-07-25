const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const reactNativePostInstall = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )`;

const fmtCompatibilityPatch = `

    # Xcode 26.4+ rejects fmt's consteval implementation when React Native is
    # compiled from source for the legacy architecture.
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '#  define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end`;

module.exports = function withIosFmtFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
      const podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("fmt_base = File.join")) return modConfig;
      if (!podfile.includes(reactNativePostInstall)) {
        throw new Error("Could not find the React Native post-install hook to patch fmt.");
      }

      fs.writeFileSync(
        podfilePath,
        podfile.replace(
          reactNativePostInstall,
          `${reactNativePostInstall}${fmtCompatibilityPatch}`,
        ),
      );
      return modConfig;
    },
  ]);
};
