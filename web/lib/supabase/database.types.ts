export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          device_id: string
          id: string
          key_hash: string
          key_prefix: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          key_hash: string
          key_prefix: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_device_id_fkey'
            columns: ['device_id']
            isOneToOne: false
            referencedRelation: 'devices'
            referencedColumns: ['id']
          },
        ]
      }
      api_request_log: {
        Row: {
          body: Json | null
          device_id: string | null
          endpoint: string
          id: number
          ip: string | null
          key_prefix: string | null
          status: number
          ts: string
        }
        Insert: {
          body?: Json | null
          device_id?: string | null
          endpoint: string
          id?: number
          ip?: string | null
          key_prefix?: string | null
          status: number
          ts?: string
        }
        Update: {
          body?: Json | null
          device_id?: string | null
          endpoint?: string
          id?: number
          ip?: string | null
          key_prefix?: string | null
          status?: number
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_request_log_device_id_fkey'
            columns: ['device_id']
            isOneToOne: false
            referencedRelation: 'devices'
            referencedColumns: ['id']
          },
        ]
      }
      cap_zones: {
        Row: {
          cap: string
          geom: unknown
          name: string | null
        }
        Insert: {
          cap: string
          geom: unknown
          name?: string | null
        }
        Update: {
          cap?: string
          geom?: unknown
          name?: string | null
        }
        Relationships: []
      }
      device_heartbeats: {
        Row: {
          battery: number | null
          device_id: string
          geom: unknown | null
          id: number
          ts: string
        }
        Insert: {
          battery?: number | null
          device_id: string
          geom?: unknown | null
          id?: number
          ts?: string
        }
        Update: {
          battery?: number | null
          device_id?: string
          geom?: unknown | null
          id?: number
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: 'device_heartbeats_device_id_fkey'
            columns: ['device_id']
            isOneToOne: false
            referencedRelation: 'devices'
            referencedColumns: ['id']
          },
        ]
      }
      device_readings: {
        Row: {
          device_id: string
          geom: unknown | null
          id: number
          metrics: Json
          ts: string
        }
        Insert: {
          device_id: string
          geom?: unknown | null
          id?: number
          metrics: Json
          ts?: string
        }
        Update: {
          device_id?: string
          geom?: unknown | null
          id?: number
          metrics?: Json
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: 'device_readings_device_id_fkey'
            columns: ['device_id']
            isOneToOne: false
            referencedRelation: 'devices'
            referencedColumns: ['id']
          },
        ]
      }
      devices: {
        Row: {
          active: boolean
          battery: number | null
          created_at: string
          firmware: string | null
          fixed_geom: unknown | null
          id: string
          label: string | null
          last_geom: unknown | null
          last_seen_at: string | null
          name: string
          type: string
        }
        Insert: {
          active?: boolean
          battery?: number | null
          created_at?: string
          firmware?: string | null
          fixed_geom?: unknown | null
          id?: string
          label?: string | null
          last_geom?: unknown | null
          last_seen_at?: string | null
          name: string
          type: string
        }
        Update: {
          active?: boolean
          battery?: number | null
          created_at?: string
          firmware?: string | null
          fixed_geom?: unknown | null
          id?: string
          label?: string | null
          last_geom?: unknown | null
          last_seen_at?: string | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string | null
          id: string
          is_company: boolean
          stripe_session_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          is_company?: boolean
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          is_company?: boolean
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          hours: number | null
          id: string
          kg_collected: number | null
          photo_after_url: string | null
          photo_before_url: string | null
          project_id: string | null
          report_id: string | null
          review_note: string | null
          status: Database['public']['Enums']['mission_status']
          submitted_at: string | null
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          volunteer_id: string | null
          volunteer_note: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          hours?: number | null
          id?: string
          kg_collected?: number | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          project_id?: string | null
          report_id?: string | null
          review_note?: string | null
          status?: Database['public']['Enums']['mission_status']
          submitted_at?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          volunteer_id?: string | null
          volunteer_note?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          hours?: number | null
          id?: string
          kg_collected?: number | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          project_id?: string | null
          report_id?: string | null
          review_note?: string | null
          status?: Database['public']['Enums']['mission_status']
          submitted_at?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          volunteer_id?: string | null
          volunteer_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'missions_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_volunteer_id_fkey'
            columns: ['volunteer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_verified_by_fkey'
            columns: ['verified_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      report_categories: {
        Row: {
          default_severity: number
          icon: string
          name: string
          slug: string
        }
        Insert: {
          default_severity?: number
          icon?: string
          name: string
          slug: string
        }
        Update: {
          default_severity?: number
          icon?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          cap: string | null
          captured_at: string
          category: string
          confidence: number
          created_at: string
          dedupe_group: string | null
          description: string | null
          device_id: string | null
          geom: unknown
          id: string
          metadata: Json
          observations: number
          photo_url: string | null
          resolved_at: string | null
          severity: number
          source: string
          status: string
        }
        Insert: {
          cap?: string | null
          captured_at?: string
          category: string
          confidence?: number
          created_at?: string
          dedupe_group?: string | null
          description?: string | null
          device_id?: string | null
          geom: unknown
          id?: string
          metadata?: Json
          observations?: number
          photo_url?: string | null
          resolved_at?: string | null
          severity?: number
          source: string
          status?: string
        }
        Update: {
          cap?: string | null
          captured_at?: string
          category?: string
          confidence?: number
          created_at?: string
          dedupe_group?: string | null
          description?: string | null
          device_id?: string | null
          geom?: unknown
          id?: string
          metadata?: Json
          observations?: number
          photo_url?: string | null
          resolved_at?: string | null
          severity?: number
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reports_device_id_fkey'
            columns: ['device_id']
            isOneToOne: false
            referencedRelation: 'devices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_category_fkey'
            columns: ['category']
            isOneToOne: false
            referencedRelation: 'report_categories'
            referencedColumns: ['slug']
          },
        ]
      }
      sponsorships: {
        Row: {
          amount: number | null
          caps: string[]
          company_name: string
          created_at: string
          ends_on: string | null
          id: string
          plan: string
          profile_id: string | null
          starts_on: string | null
          status: Database['public']['Enums']['sponsorship_status']
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          caps?: string[]
          company_name: string
          created_at?: string
          ends_on?: string | null
          id?: string
          plan?: string
          profile_id?: string | null
          starts_on?: string | null
          status?: Database['public']['Enums']['sponsorship_status']
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          caps?: string[]
          company_name?: string
          created_at?: string
          ends_on?: string | null
          id?: string
          plan?: string
          profile_id?: string | null
          starts_on?: string | null
          status?: Database['public']['Enums']['sponsorship_status']
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sponsorships_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      volunteer_expenses: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: Database['public']['Enums']['expense_kind']
          mission_id: string
          note: string | null
          receipt_url: string | null
          reimbursed_at: string | null
          self_certified: boolean
          spent_on: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['expense_kind']
          mission_id: string
          note?: string | null
          receipt_url?: string | null
          reimbursed_at?: string | null
          self_certified?: boolean
          spent_on?: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['expense_kind']
          mission_id?: string
          note?: string | null
          receipt_url?: string | null
          reimbursed_at?: string | null
          self_certified?: boolean
          spent_on?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'volunteer_expenses_mission_id_fkey'
            columns: ['mission_id']
            isOneToOne: false
            referencedRelation: 'missions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'volunteer_expenses_volunteer_id_fkey'
            columns: ['volunteer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      volunteer_profiles: {
        Row: {
          created_at: string
          ets_member_at: string | null
          id: string
          insured: boolean
          patto_ref: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ets_member_at?: string | null
          id?: string
          insured?: boolean
          patto_ref?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ets_member_at?: string | null
          id?: string
          insured?: boolean
          patto_ref?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'volunteer_profiles_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ai_calls: {
        Row: {
          conversation_id: string | null
          created_at: string
          duration_ms: number | null
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          profile_id: string | null
          provider: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          profile_id?: string | null
          provider: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          profile_id?: string | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_calls_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'ai_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_calls_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_conversations_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ai_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          parts: NonNullable<Json>
          role: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          parts?: NonNullable<Json>
          role: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: NonNullable<Json>
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'ai_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      ai_settings: {
        Row: {
          base_url: string | null
          id: number
          model: string
          provider: string
          secret_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_url?: string | null
          id?: number
          model: string
          provider: string
          secret_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_url?: string | null
          id?: number
          model?: string
          provider?: string
          secret_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      feature_access: {
        Row: {
          feature_key: string
          level: Database['public']['Enums']['access_level']
          profile_id: string
          updated_at: string
        }
        Insert: {
          feature_key: string
          level: Database['public']['Enums']['access_level']
          profile_id: string
          updated_at?: string
        }
        Update: {
          feature_key?: string
          level?: Database['public']['Enums']['access_level']
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feature_access_feature_key_fkey'
            columns: ['feature_key']
            isOneToOne: false
            referencedRelation: 'features'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'feature_access_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          default_level: Database['public']['Enums']['access_level']
          description: string | null
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_level?: Database['public']['Enums']['access_level']
          description?: string | null
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_level?: Database['public']['Enums']['access_level']
          description?: string | null
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_admin: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          caps: string[]
          budget_hours: number | null
          client_name: string | null
          code: string
          created_at: string
          due_date: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          status: Database['public']['Enums']['project_status']
          updated_at: string
        }
        Insert: {
          caps?: string[]
          budget_hours?: number | null
          client_name?: string | null
          code?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          status?: Database['public']['Enums']['project_status']
          updated_at?: string
        }
        Update: {
          caps?: string[]
          budget_hours?: number | null
          client_name?: string | null
          code?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          status?: Database['public']['Enums']['project_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          report_id: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          position: number
          priority: Database['public']['Enums']['task_priority']
          project_id: string | null
          status: Database['public']['Enums']['task_status']
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          report_id?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          position?: number
          priority?: Database['public']['Enums']['task_priority']
          project_id?: string | null
          status?: Database['public']['Enums']['task_status']
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          report_id?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          position?: number
          priority?: Database['public']['Enums']['task_priority']
          project_id?: string | null
          status?: Database['public']['Enums']['task_status']
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      ticket_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          kind: Database['public']['Enums']['ticket_message_kind']
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['ticket_message_kind']
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['ticket_message_kind']
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_messages_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ticket_messages_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
        ]
      }
      tickets: {
        Row: {
          device_id: string | null
          assignee_id: string | null
          category_id: string | null
          closed_at: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          first_response_at: string | null
          id: string
          priority: Database['public']['Enums']['ticket_priority']
          project_id: string | null
          requester_email: string | null
          requester_id: string | null
          requester_name: string | null
          resolved_at: string | null
          status: Database['public']['Enums']['ticket_status']
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          device_id?: string | null
          assignee_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          first_response_at?: string | null
          id?: string
          priority?: Database['public']['Enums']['ticket_priority']
          project_id?: string | null
          requester_email?: string | null
          requester_id?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          status?: Database['public']['Enums']['ticket_status']
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          device_id?: string | null
          assignee_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          first_response_at?: string | null
          id?: string
          priority?: Database['public']['Enums']['ticket_priority']
          project_id?: string | null
          requester_email?: string | null
          requester_id?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          status?: Database['public']['Enums']['ticket_status']
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tickets_device_id_fkey'
            columns: ['device_id']
            isOneToOne: false
            referencedRelation: 'devices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'ticket_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_pending_sponsorship: {
        Args: { p_caps: string[]; p_company: string; p_plan: string }
        Returns: string
      }
      pod_heartbeat: {
        Args: {
          p_battery: number | null
          p_firmware: string | null
          p_ip: string
          p_key_hash: string
          p_lat: number | null
          p_log_body: Json
          p_lon: number | null
          p_metrics: Json | null
        }
        Returns: Json
      }
      pod_log: {
        Args: {
          p_body: Json
          p_endpoint: string
          p_ip: string
          p_key_hash: string
          p_key_prefix: string
          p_status: number
        }
        Returns: undefined
      }
      pod_open_offline_tickets: { Args: Record<PropertyKey, never>; Returns: number }
      pod_readings: {
        Args: { p_ip: string; p_key_hash: string; p_log_body: Json; p_rows: Json }
        Returns: Json
      }
      pod_report: {
        Args: {
          p_captured_at: string
          p_category: string
          p_confidence: number
          p_description: string | null
          p_ip: string
          p_key_hash: string
          p_lat: number
          p_log_body: Json
          p_lon: number
          p_metadata: Json
          p_photo_url: string | null
        }
        Returns: Json
      }
      public_fleet: { Args: Record<PropertyKey, never>; Returns: { online: number; total: number }[] }
      public_fund: {
        Args: Record<PropertyKey, never>
        Returns: {
          donors: number
          kg_collected: number
          missions_verified: number
          raised: number
          reimbursed: number
          volunteer_hours: number
          zones_adopted: number
        }[]
      }
      public_pod_readings: {
        Args: Record<PropertyKey, never>
        Returns: { device_id: string; lat: number; lon: number; metrics: Json; name: string; ts: string }[]
      }
      public_reports: {
        Args: { p_include_closed?: boolean; p_limit?: number }
        Returns: {
          category: string
          created_at: string
          description: string | null
          id: string
          lat: number
          lon: number
          observations: number
          photo_url: string | null
          resolved_at: string | null
          severity: number
          source: string
          status: string
        }[]
      }
      record_payment: {
        Args: {
          p_amount: number
          p_email: string
          p_is_company: boolean
          p_kind: string
          p_name: string
          p_secret: string
          p_session_id: string
          p_sponsorship_id: string | null
        }
        Returns: string
      }
      submit_citizen_report: {
        Args: {
          p_category: string
          p_description?: string
          p_lat: number
          p_lon: number
          p_photo_url?: string
        }
        Returns: { deduped: boolean; id: string }[]
      }
      access_rank: { Args: { level: Database['public']['Enums']['access_level'] }; Returns: number }
      ai_settings_for_chat: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_key: string
          base_url: string
          model: string
          provider: string
        }[]
      }
      ai_settings_save: {
        Args: { p_api_key: string; p_base_url: string; p_model: string; p_provider: string }
        Returns: undefined
      }
      ai_settings_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          base_url: string
          model: string
          provider: string
          updated_at: string
          updated_by_name: string
        }[]
      }
      current_profile_id: { Args: Record<PropertyKey, never>; Returns: string }
      has_access: {
        Args: { feature: string; required?: Database['public']['Enums']['access_level'] }
        Returns: boolean
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      expense_kind: 'trasporto' | 'materiali' | 'pasto' | 'altro'
      mission_status: 'open' | 'assigned' | 'submitted' | 'verified' | 'rejected'
      sponsorship_status: 'pending' | 'active' | 'ended'
      access_level: 'none' | 'read' | 'write' | 'admin'
      project_status: 'active' | 'paused' | 'closed'
      task_priority: 'low' | 'medium' | 'high'
      task_status: 'todo' | 'in_progress' | 'review' | 'done'
      ticket_message_kind: 'reply' | 'note'
      ticket_priority: 'low' | 'medium' | 'high' | 'urgent'
      ticket_status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ['none', 'read', 'write', 'admin'],
      expense_kind: ['trasporto', 'materiali', 'pasto', 'altro'],
      mission_status: ['open', 'assigned', 'submitted', 'verified', 'rejected'],
      project_status: ['active', 'paused', 'closed'],
      sponsorship_status: ['pending', 'active', 'ended'],
      task_priority: ['low', 'medium', 'high'],
      task_status: ['todo', 'in_progress', 'review', 'done'],
      ticket_message_kind: ['reply', 'note'],
      ticket_priority: ['low', 'medium', 'high', 'urgent'],
      ticket_status: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],
    },
  },
} as const
