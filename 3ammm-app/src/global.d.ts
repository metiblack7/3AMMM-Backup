// Project-local global type stubs for modules without embedded types.
// React and React Native types are provided by installed packages.

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'expo-blur' {
  import { ComponentType } from 'react';
  const BlurView: ComponentType<any>;
  export { BlurView };
  export default BlurView;
}
