// O NativeWind compila o Tailwind. @finapp/shared é um link para ../front-shared, que fica fora
// do projeto e não tem node_modules: o Metro precisa observar a pasta e buscar React aqui.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../front-shared')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = withNativeWind(config, { input: './global.css' });
