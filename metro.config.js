// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo Router regenerates `.expo/types/router.d.ts` as it resolves routes.
// Without this, Metro's file watcher treats that regeneration as a source
// change and re-triggers bundling, which regenerates the file again —
// an infinite rebuild loop that eventually runs the dev server out of heap.
config.resolver.blockList = [...config.resolver.blockList, /\.expo[\\/].*/];

module.exports = config;
