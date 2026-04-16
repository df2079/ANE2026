export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          is_reusable: boolean;
          max_uses: number | null;
          notes: string | null;
          updated_at: string;
          used_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_reusable?: boolean;
          max_uses?: number | null;
          notes?: string | null;
          updated_at?: string;
          used_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_reusable?: boolean;
          max_uses?: number | null;
          notes?: string | null;
          updated_at?: string;
          used_count?: number;
        };
        Relationships: [];
      };
      admin_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          created_at: string;
          id: string;
          metadata: Json | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          created_at: string;
          display_name: string;
          eligible_category_2: boolean;
          exclude_from_awards: boolean;
          id: string;
          importer_notes: string | null;
          is_active: boolean;
          is_romanian_brand: boolean;
          normalized_name: string;
          source_sheet_name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          eligible_category_2?: boolean;
          exclude_from_awards?: boolean;
          id?: string;
          importer_notes?: string | null;
          is_active?: boolean;
          is_romanian_brand?: boolean;
          normalized_name: string;
          source_sheet_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          eligible_category_2?: boolean;
          exclude_from_awards?: boolean;
          id?: string;
          importer_notes?: string | null;
          is_active?: boolean;
          is_romanian_brand?: boolean;
          normalized_name?: string;
          source_sheet_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          is_active: boolean;
          name: string;
          nominee_type: "brand" | "perfume";
          sort_order: number;
        };
        Insert: {
          id: string;
          is_active?: boolean;
          name: string;
          nominee_type: "brand" | "perfume";
          sort_order: number;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          name?: string;
          nominee_type?: "brand" | "perfume";
          sort_order?: number;
        };
        Relationships: [];
      };
      category_nominees: {
        Row: {
          brand_id: string | null;
          category_id: string;
          created_at: string;
          id: string;
          perfume_id: string | null;
          sort_label: string;
        };
        Insert: {
          brand_id?: string | null;
          category_id: string;
          created_at?: string;
          id?: string;
          perfume_id?: string | null;
          sort_label: string;
        };
        Update: {
          brand_id?: string | null;
          category_id?: string;
          created_at?: string;
          id?: string;
          perfume_id?: string | null;
          sort_label?: string;
        };
        Relationships: [];
      };
      category_tie_breaks: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          nominee_brand_id: string | null;
          nominee_key: string;
          nominee_perfume_id: string | null;
          priority: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          nominee_brand_id?: string | null;
          nominee_key: string;
          nominee_perfume_id?: string | null;
          priority: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          nominee_brand_id?: string | null;
          nominee_key?: string;
          nominee_perfume_id?: string | null;
          priority?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_logs: {
        Row: {
          created_at: string;
          created_by: string | null;
          filename: string;
          id: string;
          status: "uploaded" | "synced" | "failed";
          storage_path: string | null;
          summary: Json | null;
          workbook_sha1: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          filename: string;
          id?: string;
          status?: "uploaded" | "synced" | "failed";
          storage_path?: string | null;
          summary?: Json | null;
          workbook_sha1?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          filename?: string;
          id?: string;
          status?: "uploaded" | "synced" | "failed";
          storage_path?: string | null;
          summary?: Json | null;
          workbook_sha1?: string | null;
        };
        Relationships: [];
      };
      import_warnings: {
        Row: {
          brand_name: string;
          code: string;
          created_at: string;
          id: string;
          import_log_id: string;
          message: string;
          row_number: number | null;
          severity: "info" | "warning" | "error";
          sheet_name: string;
        };
        Insert: {
          brand_name: string;
          code: string;
          created_at?: string;
          id?: string;
          import_log_id: string;
          message: string;
          row_number?: number | null;
          severity?: "info" | "warning" | "error";
          sheet_name: string;
        };
        Update: {
          brand_name?: string;
          code?: string;
          created_at?: string;
          id?: string;
          import_log_id?: string;
          message?: string;
          row_number?: number | null;
          severity?: "info" | "warning" | "error";
          sheet_name?: string;
        };
        Relationships: [];
      };
      perfumes: {
        Row: {
          brand_id: string;
          created_at: string;
          display_name: string;
          id: string;
          include_override: boolean | null;
          is_active: boolean;
          launched_2026: boolean;
          normalized_name: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          display_name: string;
          id?: string;
          include_override?: boolean | null;
          is_active?: boolean;
          launched_2026?: boolean;
          normalized_name: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          include_override?: boolean | null;
          is_active?: boolean;
          launched_2026?: boolean;
          normalized_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vote_attempt_logs: {
        Row: {
          action: string;
          category_id: string | null;
          created_at: string;
          id: string;
          ip_hash: string | null;
          metadata: Json | null;
          voter_id: string | null;
        };
        Insert: {
          action: string;
          category_id?: string | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          metadata?: Json | null;
          voter_id?: string | null;
        };
        Update: {
          action?: string;
          category_id?: string | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          metadata?: Json | null;
          voter_id?: string | null;
        };
        Relationships: [];
      };
      voters: {
        Row: {
          access_code_id: string | null;
          created_at: string;
          device_token: string | null;
          email: string;
          id: string;
          newsletter_opt_in: boolean;
          normalized_email: string;
          updated_at: string;
        };
        Insert: {
          access_code_id?: string | null;
          created_at?: string;
          device_token?: string | null;
          email: string;
          id?: string;
          newsletter_opt_in?: boolean;
          normalized_email: string;
          updated_at?: string;
        };
        Update: {
          access_code_id?: string | null;
          created_at?: string;
          device_token?: string | null;
          email?: string;
          id?: string;
          newsletter_opt_in?: boolean;
          normalized_email?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          ip_hash: string | null;
          nominee_brand_id: string | null;
          nominee_perfume_id: string | null;
          voter_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          nominee_brand_id?: string | null;
          nominee_perfume_id?: string | null;
          voter_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          nominee_brand_id?: string | null;
          nominee_perfume_id?: string | null;
          voter_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      replace_category_nominees: {
        Args: {
          payload: Json;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
