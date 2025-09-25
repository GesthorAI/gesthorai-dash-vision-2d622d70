export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_api_keys: {
        Row: {
          created_at: string
          id: string
          iv: string
          key_cipher: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          iv: string
          key_cipher: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          iv?: string
          key_cipher?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_embeddings_cache: {
        Row: {
          access_count: number | null
          content_hash: string
          content_type: string
          created_at: string
          embedding: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          model: string
        }
        Insert: {
          access_count?: number | null
          content_hash: string
          content_type: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string
        }
        Update: {
          access_count?: number | null
          content_hash?: string
          content_type?: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string
        }
        Relationships: []
      }
      ai_performance_metrics: {
        Row: {
          cost_estimate: number | null
          created_at: string
          error_type: string | null
          execution_time_ms: number
          feature: string
          id: string
          input_size: number | null
          model_used: string | null
          organization_id: string | null
          output_size: number | null
          success: boolean
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          error_type?: string | null
          execution_time_ms: number
          feature: string
          id?: string
          input_size?: number | null
          model_used?: string | null
          organization_id?: string | null
          output_size?: number | null
          success?: boolean
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          error_type?: string | null
          execution_time_ms?: number
          feature?: string
          id?: string
          input_size?: number | null
          model_used?: string | null
          organization_id?: string | null
          output_size?: number | null
          success?: boolean
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_personas: {
        Row: {
          created_at: string
          description: string | null
          guidelines: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          organization_id: string | null
          tone: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          guidelines?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          organization_id?: string | null
          tone?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          guidelines?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          organization_id?: string | null
          tone?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_personas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_logs: {
        Row: {
          cached: boolean | null
          cost_estimate: number | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          feature_type: string | null
          id: string
          input_hash: string | null
          input_json: Json | null
          lead_id: string | null
          model: string
          organization_id: string | null
          output_json: Json | null
          persona_id: string | null
          retry_count: number | null
          run_id: string | null
          scope: string
          search_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_feedback: number | null
          user_id: string
        }
        Insert: {
          cached?: boolean | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          feature_type?: string | null
          id?: string
          input_hash?: string | null
          input_json?: Json | null
          lead_id?: string | null
          model: string
          organization_id?: string | null
          output_json?: Json | null
          persona_id?: string | null
          retry_count?: number | null
          run_id?: string | null
          scope: string
          search_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_feedback?: number | null
          user_id: string
        }
        Update: {
          cached?: boolean | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          feature_type?: string | null
          id?: string
          input_hash?: string | null
          input_json?: Json | null
          lead_id?: string | null
          model?: string
          organization_id?: string | null
          output_json?: Json | null
          persona_id?: string | null
          retry_count?: number | null
          run_id?: string | null
          scope?: string
          search_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_feedback?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          cost_controls: Json | null
          created_at: string
          feature_flags: Json
          id: string
          limits: Json
          model_preferences: Json | null
          organization_id: string | null
          performance_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_controls?: Json | null
          created_at?: string
          feature_flags?: Json
          id?: string
          limits?: Json
          model_preferences?: Json | null
          organization_id?: string | null
          performance_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_controls?: Json | null
          created_at?: string
          feature_flags?: Json
          id?: string
          limits?: Json
          model_preferences?: Json | null
          organization_id?: string | null
          performance_settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_quotas: {
        Row: {
          cost_incurred: number
          created_at: string
          id: string
          organization_id: string | null
          period_end: string
          period_start: string
          requests_limit: number
          requests_made: number
          tokens_limit: number
          tokens_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_incurred?: number
          created_at?: string
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          requests_limit?: number
          requests_made?: number
          tokens_limit?: number
          tokens_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_incurred?: number
          created_at?: string
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          requests_limit?: number
          requests_made?: number
          tokens_limit?: number
          tokens_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assignment_rules: {
        Row: {
          assign_to: string[]
          created_at: string
          criteria: Json
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assign_to?: string[]
          created_at?: string
          criteria?: Json
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assign_to?: string[]
          created_at?: string
          criteria?: Json
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          record_id: string | null
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          record_id?: string | null
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          record_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_reply_settings: {
        Row: {
          auto_reply_delay_minutes: number | null
          business_days: number[] | null
          business_hours_end: string | null
          business_hours_start: string | null
          created_at: string
          custom_prompt: string | null
          id: string
          is_active: boolean
          max_replies_per_lead: number | null
          organization_id: string | null
          persona_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_reply_delay_minutes?: number | null
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string
          custom_prompt?: string | null
          id?: string
          is_active?: boolean
          max_replies_per_lead?: number | null
          organization_id?: string | null
          persona_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_reply_delay_minutes?: number | null
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          created_at?: string
          custom_prompt?: string | null
          id?: string
          is_active?: boolean
          max_replies_per_lead?: number | null
          organization_id?: string | null
          persona_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          channel: string
          created_at: string
          id: string
          lead_id: string
          message: string | null
          metadata: Json | null
          organization_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          lead_id: string
          message?: string | null
          metadata?: Json | null
          organization_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string
          message?: string | null
          metadata?: Json | null
          organization_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      evolution_settings: {
        Row: {
          created_at: string
          default_instance_name: string | null
          evolution_api_url: string
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_instance_name?: string | null
          evolution_api_url: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_instance_name?: string | null
          evolution_api_url?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_run_items: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          lead_id: string
          message: string | null
          message_sequence: number | null
          run_id: string
          sent_at: string | null
          status: string
          total_messages: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id: string
          message?: string | null
          message_sequence?: number | null
          run_id: string
          sent_at?: string | null
          status?: string
          total_messages?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          message?: string | null
          message_sequence?: number | null
          run_id?: string
          sent_at?: string | null
          status?: string
          total_messages?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      followup_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_count: number | null
          filters: Json
          id: string
          name: string
          organization_id: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          template_id: string | null
          total_leads: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          filters?: Json
          id?: string
          name: string
          organization_id?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_leads?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          filters?: Json
          id?: string
          name?: string
          organization_id?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_leads?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          lead_id: string
          team_member_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          lead_id: string
          team_member_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          lead_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead_assignments_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lead_assignments_team_member"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          lead_id: string
          model: string
          rationale: string | null
          score: number
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          lead_id: string
          model: string
          rationale?: string | null
          score: number
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          lead_id?: string
          model?: string
          rationale?: string | null
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          business: string
          city: string
          collected_at: string | null
          contact_opt_out: boolean | null
          created_at: string
          email: string | null
          embedding: string | null
          id: string
          last_contacted_at: string | null
          name: string
          niche: string | null
          normalized_email: string | null
          normalized_phone: string | null
          organization_id: string
          phone: string | null
          score: number | null
          search_id: string | null
          source: string | null
          status: string | null
          updated_at: string
          user_id: string
          whatsapp_exists: boolean | null
          whatsapp_jid: string | null
          whatsapp_number: string | null
          whatsapp_verified: boolean | null
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          business: string
          city: string
          collected_at?: string | null
          contact_opt_out?: boolean | null
          created_at?: string
          email?: string | null
          embedding?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          niche?: string | null
          normalized_email?: string | null
          normalized_phone?: string | null
          organization_id: string
          phone?: string | null
          score?: number | null
          search_id?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          whatsapp_exists?: boolean | null
          whatsapp_jid?: string | null
          whatsapp_number?: string | null
          whatsapp_verified?: boolean | null
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          business?: string
          city?: string
          collected_at?: string | null
          contact_opt_out?: boolean | null
          created_at?: string
          email?: string | null
          embedding?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          niche?: string | null
          normalized_email?: string | null
          normalized_phone?: string | null
          organization_id?: string
          phone?: string | null
          score?: number | null
          search_id?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_exists?: boolean | null
          whatsapp_jid?: string | null
          whatsapp_number?: string | null
          whatsapp_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          name: string
          organization_id: string | null
          subject: string | null
          updated_at: string
          user_id: string
          variables: string[] | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          name: string
          organization_id?: string | null
          subject?: string | null
          updated_at?: string
          user_id: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          name?: string
          organization_id?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          organization_id: string
          role: string
          token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          organization_id: string
          role?: string
          token: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          max_leads: number | null
          max_users: number | null
          name: string
          plan: string | null
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_leads?: number | null
          max_users?: number | null
          name: string
          plan?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_leads?: number | null
          max_users?: number | null
          name?: string
          plan?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      searches: {
        Row: {
          city: string
          created_at: string
          id: string
          niche: string
          organization_id: string | null
          status: string
          total_leads: number | null
          updated_at: string
          user_id: string
          webhook_id: string | null
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          niche: string
          organization_id?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string
          user_id: string
          webhook_id?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          niche?: string
          organization_id?: string | null
          status?: string
          total_leads?: number | null
          updated_at?: string
          user_id?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          lead_id: string | null
          organization_id: string | null
          priority: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          priority?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          priority?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          capacity: number
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string | null
          role: string
          specialties: string[] | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          email: string
          id?: string
          name: string
          organization_id?: string | null
          role?: string
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          role?: string
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          evolution_instance_id: string | null
          id: string
          last_status: string | null
          metadata: Json
          name: string
          number: string | null
          organization_id: string | null
          owner_jid: string | null
          profile_name: string | null
          shared_with_users: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evolution_instance_id?: string | null
          id?: string
          last_status?: string | null
          metadata?: Json
          name: string
          number?: string | null
          organization_id?: string | null
          owner_jid?: string | null
          profile_name?: string | null
          shared_with_users?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          evolution_instance_id?: string | null
          id?: string
          last_status?: string | null
          metadata?: Json
          name?: string
          number?: string | null
          organization_id?: string | null
          owner_jid?: string | null
          profile_name?: string | null
          shared_with_users?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_rate_limit: {
        Args: {
          max_requests?: number
          operation_type: string
          user_id_param: string
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_embeddings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_invites: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_organization_with_admin: {
        Args: { org_name: string; org_slug: string }
        Returns: Json
      }
      get_current_ai_usage: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: Json
      }
      get_invite_by_token: {
        Args: { invite_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          invited_at: string
          organization_id: string
          organization_name: string
          role: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_org_admin: {
        Args: { org_id: string; user_id?: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id: string; user_id?: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      migrate_existing_data_to_orgs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      redact_pii_from_json: {
        Args: { input_json: Json }
        Returns: Json
      }
      reset_daily_ai_quotas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      validate_organization_access: {
        Args: { org_id: string; user_id?: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
