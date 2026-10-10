declare module '*.css';

// Vite's `?raw` imports, used by tests to load captured page fixtures.
declare module '*?raw' {
  const content: string;
  export default content;
}
