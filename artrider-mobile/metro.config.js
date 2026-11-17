// Configuración de Metro. Solo añade un resolver para la vista web de DESARROLLO
// (revisar el diseño en el navegador). iOS y Android usan siempre el resolver por defecto.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const stub = (file) => path.resolve(__dirname, 'src/dev/web-stubs', file);

// Módulos que solo existen en nativo → stubs visuales (solo cuando platform === 'web').
const WEB_STUBS = {
  'react-native-maps': stub('react-native-maps.tsx'),
  'react-native-map-clustering': stub('react-native-map-clustering.tsx'),
  'react-native-webview': stub('react-native-webview.tsx'),
  'expo-secure-store': stub('expo-secure-store.ts'),
};

const defaultResolveRequest = config.resolver.resolveRequest;

// Los stubs son SOLO para la vista previa de desarrollo: en un build de producción no se aplican
// (la web no es un destino de producción; así no se guardaría la sesión sin cifrar en localStorage).
const useWebStubs = process.env.NODE_ENV !== 'production';

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (useWebStubs && platform === 'web' && Object.prototype.hasOwnProperty.call(WEB_STUBS, moduleName)) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] };
  }
  // Cualquier otra plataforma (o módulo): resolución por defecto, sin cambios.
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
