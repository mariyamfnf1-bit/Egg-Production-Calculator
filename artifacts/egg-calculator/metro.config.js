const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Block pnpm's temporary extraction directories from being watched.
// These _tmp_* dirs don't have a complete directory tree and cause
// Metro's FallbackWatcher to crash with ENOENT on first startup.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nodeModulesPath = escapeRegExp(
  path.resolve(__dirname, "../../node_modules")
);

config.resolver.blockList = [
  new RegExp(`${nodeModulesPath}/\\.pnpm/.*_tmp_[^/]+/.*`),
];

module.exports = config;
