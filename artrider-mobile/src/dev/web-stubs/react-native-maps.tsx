import { Component, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Placeholder } from './Placeholder';

/** Props aceptadas (se ignoran salvo `style`): cubren lo que usa la app y el resto de MapView. */
export type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  initialRegion?: unknown;
  region?: unknown;
  onPress?: (event: { nativeEvent: { action?: string; coordinate: { latitude: number; longitude: number } } }) => void;
  [key: string]: unknown;
};

/** Stub web de `react-native-maps` (default). Los marcadores hijos no se dibujan. */
export default class MapView extends Component<MapViewProps> {
  render() {
    return <Placeholder style={this.props.style} label="Mapa no disponible en la vista web" />;
  }
}

export type MarkerProps = {
  coordinate?: { latitude: number; longitude: number };
  draggable?: boolean;
  tracksViewChanges?: boolean;
  onPress?: () => void;
  onDragEnd?: (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
  children?: ReactNode;
  [key: string]: unknown;
};

export function Marker(_props: MarkerProps): null {
  return null;
}

export function Callout(_props: { children?: ReactNode; [key: string]: unknown }): null {
  return null;
}

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
export { MapView };
