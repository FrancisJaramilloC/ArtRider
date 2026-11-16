import { Component, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Placeholder } from './Placeholder';

export type WebViewMessageEvent = { nativeEvent: { data: string } };

export type WebViewProps = {
  style?: StyleProp<ViewStyle>;
  source?: { html?: string; uri?: string };
  onMessage?: (event: WebViewMessageEvent) => void;
  javaScriptEnabled?: boolean;
  [key: string]: unknown;
};

/** Stub web de `react-native-webview`: no ejecuta nada; los métodos de la ref son no-ops. */
export class WebView<P = object> extends Component<WebViewProps & P> {
  postMessage(_data: string): void {}
  injectJavaScript(_script: string): void {}
  goBack(): void {}
  reload(): void {}

  render(): ReactNode {
    return <Placeholder style={this.props.style} label="Pago no disponible en la vista web" />;
  }
}

export default WebView;
