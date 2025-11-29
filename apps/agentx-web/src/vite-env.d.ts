/// <reference types="vite/client" />

// CSS module declarations
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "@deepractice-ai/agentx-ui/globals.css" {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
