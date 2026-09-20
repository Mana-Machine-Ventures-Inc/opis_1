export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export type ArgumentType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "component"
  | "component[]";

export type ArgumentDefinition = {
  type: ArgumentType;
  values?: string[];
  default?: Json;
  optional?: boolean;
  role?: string;
  description?: string;
  accepts?: string | { protocol: string };
  minItems?: number;
  maxItems?: number;
  availableWhen?: Json;
  forbiddenWhen?: Json;
};

export type OpisDocument = {
  $schema?: string;
  opis: string;
  component: {
    id: string;
    name: string;
    version?: string;
  };
  imports?: {
    tokens?: Array<{ namespace: string; source: string }>;
  };
  arguments?: Record<string, ArgumentDefinition>;
  constraints?: Json[];
  structure: { [key: string]: Json };
};

export type Diagnostic = {
  level: "error" | "warning" | "advisory";
  message: string;
};

export type ResolveContext = {
  arguments: Record<string, Json>;
  supplied: Set<string>;
  environment: Record<string, Json>;
};

export type TokenDocument = Json;

export type TokenSet = Record<string, TokenDocument>;

export type ResolvedInstance = {
  component: OpisDocument["component"];
  arguments: Record<string, Json>;
  tree: Json;
};
