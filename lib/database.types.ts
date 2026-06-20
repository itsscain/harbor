/**
 * Placeholder Supabase types. Regenerated from the live schema after the
 * migrations in Milestone 2 via the Supabase MCP (generate_typescript_types).
 * Until then this keeps the client generics happy without enforcing columns.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericRow = Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: GenericRow;
        Insert: GenericRow;
        Update: GenericRow;
        Relationships: [];
      };
    };
    Views: { [key: string]: { Row: GenericRow } };
    Functions: {
      [key: string]: { Args: Record<string, unknown>; Returns: unknown };
    };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: GenericRow };
  };
};
