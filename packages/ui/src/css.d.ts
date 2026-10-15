/**
 * Permite importar folhas de estilo por efeito lateral (`import "./x.css"`)
 * dentro do design system. O bundler (Vite) trata do CSS; o TypeScript só
 * precisa de saber que o módulo existe. Espelha o `declare module "*.css"`
 * do `vite/client`, que o `packages/ui` não inclui (`"types": []`).
 */
declare module "*.css";
