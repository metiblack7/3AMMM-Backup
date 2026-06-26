// This project uses React and React Native types from node_modules.
// Remove any ambient module declarations that would override those package types.

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
