import { Component } from 'react';

import { Placeholder } from './Placeholder';
import type { MapViewProps } from './react-native-maps';

/** Stub web de `react-native-map-clustering` (default): mismo placeholder que el mapa. */
export default class ClusteredMapView extends Component<MapViewProps> {
  render() {
    return <Placeholder style={this.props.style} label="Mapa no disponible en la vista web" />;
  }
}
