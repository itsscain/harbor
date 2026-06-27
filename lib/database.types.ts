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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_briefs: {
        Row: {
          brief: string
          created_at: string
          date: string
          household_id: string
        }
        Insert: {
          brief: string
          created_at?: string
          date: string
          household_id: string
        }
        Update: {
          brief?: string
          created_at?: string
          date?: string
          household_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_briefs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_config: {
        Row: {
          anthropic_api_key: string | null
          enabled: boolean
          household_id: string
          updated_at: string
        }
        Insert: {
          anthropic_api_key?: string | null
          enabled?: boolean
          household_id: string
          updated_at?: string
        }
        Update: {
          anthropic_api_key?: string | null
          enabled?: boolean
          household_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_config_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      build_supplies: {
        Row: {
          build_id: string
          created_at: string
          id: string
          item: string
          optional: boolean
          quantity: number
          sort_order: number
          unit_cost: number
          updated_at: string
          url: string | null
          vendor: string
        }
        Insert: {
          build_id: string
          created_at?: string
          id?: string
          item: string
          optional?: boolean
          quantity?: number
          sort_order?: number
          unit_cost?: number
          updated_at?: string
          url?: string | null
          vendor?: string
        }
        Update: {
          build_id?: string
          created_at?: string
          id?: string
          item?: string
          optional?: boolean
          quantity?: number
          sort_order?: number
          unit_cost?: number
          updated_at?: string
          url?: string | null
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_supplies_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          created_at: string
          founder_price: number
          id: string
          is_default: boolean
          name: string
          screen_size: string | null
          sort_order: number
          standard_price: number
          tablet_model: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_price?: number
          id?: string
          is_default?: boolean
          name: string
          screen_size?: string | null
          sort_order?: number
          standard_price?: number
          tablet_model?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_price?: number
          id?: string
          is_default?: boolean
          name?: string
          screen_size?: string | null
          sort_order?: number
          standard_price?: number
          tablet_model?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calm_tools: {
        Row: {
          child_id: string | null
          config: Json
          created_at: string
          deleted_at: string | null
          enabled: boolean
          household_id: string
          id: string
          sort_order: number
          tool_type: Database["public"]["Enums"]["calm_tool_type"]
          updated_at: string
        }
        Insert: {
          child_id?: string | null
          config?: Json
          created_at?: string
          deleted_at?: string | null
          enabled?: boolean
          household_id: string
          id?: string
          sort_order?: number
          tool_type: Database["public"]["Enums"]["calm_tool_type"]
          updated_at?: string
        }
        Update: {
          child_id?: string | null
          config?: Json
          created_at?: string
          deleted_at?: string | null
          enabled?: boolean
          household_id?: string
          id?: string
          sort_order?: number
          tool_type?: Database["public"]["Enums"]["calm_tool_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calm_tools_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calm_tools_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          child_id: string
          created_at: string
          deleted_at: string | null
          feeling: string
          id: string
          note: string | null
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          deleted_at?: string | null
          feeling: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          deleted_at?: string | null
          feeling?: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          ai_profile: Json | null
          avatar: string | null
          birthday: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          name: string
          photo_url: string | null
          settings: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          ai_profile?: Json | null
          avatar?: string | null
          birthday?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          name: string
          photo_url?: string | null
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ai_profile?: Json | null
          avatar?: string | null
          birthday?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          active: boolean
          child_id: string
          created_at: string
          days_of_week: number[] | null
          deleted_at: string | null
          household_id: string
          icon: string | null
          id: string
          points: number
          requires_approval: boolean
          rotation_member_ids: Json | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          child_id: string
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          household_id: string
          icon?: string | null
          id?: string
          points?: number
          requires_approval?: boolean
          rotation_member_ids?: Json | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          child_id?: string
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          points?: number
          requires_approval?: boolean
          rotation_member_ids?: Json | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      corners: {
        Row: {
          child_id: string
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          ended_at: string | null
          feeling: string | null
          household_id: string
          id: string
          outcome: string | null
          plan: Json | null
          reason: string | null
          regulation_seconds: number | null
          report: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          ended_at?: string | null
          feeling?: string | null
          household_id: string
          id?: string
          outcome?: string | null
          plan?: Json | null
          reason?: string | null
          regulation_seconds?: number | null
          report?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          ended_at?: string | null
          feeling?: string | null
          household_id?: string
          id?: string
          outcome?: string | null
          plan?: Json | null
          reason?: string | null
          regulation_seconds?: number | null
          report?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corners_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corners_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          build_id: string | null
          created_at: string
          email: string | null
          founder_number: number | null
          household_id: string | null
          id: string
          install_date: string | null
          install_fee: number | null
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["customer_status"]
          updated_at: string
        }
        Insert: {
          build_id?: string | null
          created_at?: string
          email?: string | null
          founder_number?: number | null
          household_id?: string | null
          id?: string
          install_date?: string | null
          install_fee?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
        }
        Update: {
          build_id?: string | null
          created_at?: string
          email?: string | null
          founder_number?: number | null
          household_id?: string | null
          id?: string
          install_date?: string | null
          install_fee?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      device_pairings: {
        Row: {
          child_id: string | null
          code: string
          created_at: string
          device_label: string | null
          device_secret: string | null
          household_id: string
          id: string
          kind: string
          last_synced_at: string | null
          paired_at: string | null
          status: Database["public"]["Enums"]["pairing_status"]
          updated_at: string
        }
        Insert: {
          child_id?: string | null
          code: string
          created_at?: string
          device_label?: string | null
          device_secret?: string | null
          household_id: string
          id?: string
          kind?: string
          last_synced_at?: string | null
          paired_at?: string | null
          status?: Database["public"]["Enums"]["pairing_status"]
          updated_at?: string
        }
        Update: {
          child_id?: string | null
          code?: string
          created_at?: string
          device_label?: string | null
          device_secret?: string | null
          household_id?: string
          id?: string
          kind?: string
          last_synced_at?: string | null
          paired_at?: string | null
          status?: Database["public"]["Enums"]["pairing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_pairings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_pairings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          child_id: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          emoji: string | null
          ends_at: string | null
          google_event_id: string | null
          household_id: string
          id: string
          is_countdown: boolean
          location: string | null
          person_label: string | null
          recurrence_rule: string | null
          responsible_label: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          child_id?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          ends_at?: string | null
          google_event_id?: string | null
          household_id: string
          id?: string
          is_countdown?: boolean
          location?: string | null
          person_label?: string | null
          recurrence_rule?: string | null
          responsible_label?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          child_id?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          ends_at?: string | null
          google_event_id?: string | null
          household_id?: string
          id?: string
          is_countdown?: boolean
          location?: string | null
          person_label?: string | null
          recurrence_rule?: string | null
          responsible_label?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar: {
        Row: {
          access_token: string | null
          calendar_id: string
          connected_email: string | null
          created_at: string
          household_id: string
          last_synced_at: string | null
          refresh_token: string | null
          sync_token: string | null
          token_expiry: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string
          connected_email?: string | null
          created_at?: string
          household_id: string
          last_synced_at?: string | null
          refresh_token?: string | null
          sync_token?: string | null
          token_expiry?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string
          connected_email?: string | null
          created_at?: string
          household_id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          sync_token?: string | null
          token_expiry?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      groundings: {
        Row: {
          child_id: string
          created_at: string
          deleted_at: string | null
          ends_on: string
          household_id: string
          id: string
          note: string | null
          pause_rewards: boolean
          pause_screen_time: boolean
          privileges_lost: Json | null
          reason: string | null
          started_on: string
          status: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          deleted_at?: string | null
          ends_on: string
          household_id: string
          id?: string
          note?: string | null
          pause_rewards?: boolean
          pause_screen_time?: boolean
          privileges_lost?: Json | null
          reason?: string | null
          started_on?: string
          status?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          deleted_at?: string | null
          ends_on?: string
          household_id?: string
          id?: string
          note?: string | null
          pause_rewards?: boolean
          pause_screen_time?: boolean
          privileges_lost?: Json | null
          reason?: string | null
          started_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groundings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groundings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      house_rules: {
        Row: {
          created_at: string
          deleted_at: string | null
          detail: string | null
          emoji: string | null
          household_id: string
          id: string
          kind: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          detail?: string | null
          emoji?: string | null
          household_id: string
          id?: string
          kind?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          detail?: string | null
          emoji?: string | null
          household_id?: string
          id?: string
          kind?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          profile_id: string
          role: string
        }
        Insert: {
          created_at?: string
          household_id: string
          profile_id: string
          role?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_pin_hash: string | null
          plus_active: boolean
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_pin_hash?: string | null
          plus_active?: boolean
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_pin_hash?: string | null
          plus_active?: boolean
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          on_hand_qty: number
          part_name: string
          reorder_threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          on_hand_qty?: number
          part_name: string
          reorder_threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          on_hand_qty?: number
          part_name?: string
          reorder_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      kiosk_deletions: {
        Row: {
          deleted_at: string
          entity: string
          entity_id: string
          household_id: string
          id: string
        }
        Insert: {
          deleted_at?: string
          entity: string
          entity_id: string
          household_id: string
          id?: string
        }
        Update: {
          deleted_at?: string
          entity?: string
          entity_id?: string
          household_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_deletions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_by_label: string | null
          category: string | null
          checked: boolean
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          list_kind: string
          name: string
          quantity: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          added_by_label?: string | null
          category?: string | null
          checked?: boolean
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          list_kind?: string
          name: string
          quantity?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          added_by_label?: string | null
          category?: string | null
          checked?: boolean
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          list_kind?: string
          name?: string
          quantity?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          emoji: string | null
          household_id: string
          id: string
          meal_type: string
          notes: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          emoji?: string | null
          household_id: string
          id?: string
          meal_type?: string
          notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          emoji?: string | null
          household_id?: string
          id?: string
          meal_type?: string
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          child_id: string
          client_op_id: string | null
          confirmed_by: string | null
          created_at: string
          dose_date: string
          dose_time: string | null
          household_id: string
          id: string
          medication_id: string
          status: string
          taken_at: string
        }
        Insert: {
          child_id: string
          client_op_id?: string | null
          confirmed_by?: string | null
          created_at?: string
          dose_date: string
          dose_time?: string | null
          household_id: string
          id?: string
          medication_id: string
          status?: string
          taken_at?: string
        }
        Update: {
          child_id?: string
          client_op_id?: string | null
          confirmed_by?: string | null
          created_at?: string
          dose_date?: string
          dose_time?: string | null
          household_id?: string
          id?: string
          medication_id?: string
          status?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          child_id: string
          created_at: string
          days_of_week: number[] | null
          deleted_at: string | null
          dose: string | null
          helps_note: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
          parent_administered: boolean
          schedule_times: string[]
          sort_order: number
          updated_at: string
          with_food: boolean
        }
        Insert: {
          active?: boolean
          child_id: string
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          dose?: string | null
          helps_note?: string | null
          household_id: string
          icon?: string | null
          id?: string
          name: string
          parent_administered?: boolean
          schedule_times?: string[]
          sort_order?: number
          updated_at?: string
          with_food?: boolean
        }
        Update: {
          active?: boolean
          child_id?: string
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          dose?: string | null
          helps_note?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          parent_administered?: boolean
          schedule_times?: string[]
          sort_order?: number
          updated_at?: string
          with_food?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "medications_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          name: string
          photo_url: string | null
          role: string
          settings: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          name: string
          photo_url?: string | null
          role?: string
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          role?: string
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      person_completions: {
        Row: {
          client_op_id: string | null
          created_at: string
          household_id: string
          id: string
          person_id: string
          step_id: string | null
        }
        Insert: {
          client_op_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          person_id: string
          step_id?: string | null
        }
        Update: {
          client_op_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          person_id?: string
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_completions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_completions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_completions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "routine_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      plus_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          household_id: string
          id: string
          plan: Database["public"]["Enums"]["plus_plan"] | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          household_id: string
          id?: string
          plan?: Database["public"]["Enums"]["plus_plan"] | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          household_id?: string
          id?: string
          plan?: Database["public"]["Enums"]["plus_plan"] | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plus_subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          must_change_password: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_contact: string | null
          referred_name: string
          referring_customer_id: string | null
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_contact?: string | null
          referred_name: string
          referring_customer_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_contact?: string | null
          referred_name?: string
          referring_customer_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referring_customer_id_fkey"
            columns: ["referring_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          child_id: string | null
          created_at: string
          deleted_at: string | null
          done: boolean
          due_date: string
          household_id: string
          id: string
          repeat_rule: string | null
          snoozed_until: string | null
          title: string
          updated_at: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          deleted_at?: string | null
          done?: boolean
          due_date: string
          household_id: string
          id?: string
          repeat_rule?: string | null
          snoozed_until?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          deleted_at?: string | null
          done?: boolean
          due_date?: string
          household_id?: string
          id?: string
          repeat_rule?: string | null
          snoozed_until?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_log: {
        Row: {
          child_id: string
          chore_id: string | null
          client_op_id: string | null
          created_at: string
          deleted_at: string | null
          delta: number
          id: string
          reason: string | null
          step_id: string | null
          store_item_id: string | null
        }
        Insert: {
          child_id: string
          chore_id?: string | null
          client_op_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delta: number
          id?: string
          reason?: string | null
          step_id?: string | null
          store_item_id?: string | null
        }
        Update: {
          child_id?: string
          chore_id?: string | null
          client_op_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delta?: number
          id?: string
          reason?: string | null
          step_id?: string | null
          store_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_log_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_log_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_log_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "routine_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_log_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          child_id: string
          created_at: string
          id: string
          points_total: number
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          points_total?: number
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          points_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_steps: {
        Row: {
          created_at: string
          deleted_at: string | null
          duration_min: number | null
          icon: string | null
          id: string
          label: string
          order_index: number
          photo_url: string | null
          reward_points: number
          routine_id: string
          start_time: string | null
          step_type: Database["public"]["Enums"]["step_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration_min?: number | null
          icon?: string | null
          id?: string
          label: string
          order_index?: number
          photo_url?: string | null
          reward_points?: number
          routine_id: string
          start_time?: string | null
          step_type?: Database["public"]["Enums"]["step_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration_min?: number | null
          icon?: string | null
          id?: string
          label?: string
          order_index?: number
          photo_url?: string | null
          reward_points?: number
          routine_id?: string
          start_time?: string | null
          step_type?: Database["public"]["Enums"]["step_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_steps_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          active: boolean
          child_id: string | null
          created_at: string
          days_of_week: number[] | null
          deleted_at: string | null
          end_time: string | null
          id: string
          name: string
          person_id: string | null
          sort_order: number
          start_time: string | null
          together: boolean
          type: Database["public"]["Enums"]["routine_type"]
          updated_at: string
          with_child_id: string | null
        }
        Insert: {
          active?: boolean
          child_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          name: string
          person_id?: string | null
          sort_order?: number
          start_time?: string | null
          together?: boolean
          type?: Database["public"]["Enums"]["routine_type"]
          updated_at?: string
          with_child_id?: string | null
        }
        Update: {
          active?: boolean
          child_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          name?: string
          person_id?: string | null
          sort_order?: number
          start_time?: string | null
          together?: boolean
          type?: Database["public"]["Enums"]["routine_type"]
          updated_at?: string
          with_child_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_with_child_id_fkey"
            columns: ["with_child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          child_id: string | null
          cost_points: number
          created_at: string
          deleted_at: string | null
          emoji: string | null
          enabled: boolean
          household_id: string
          id: string
          image_url: string | null
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          child_id?: string | null
          cost_points?: number
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          enabled?: boolean
          household_id: string
          id?: string
          image_url?: string | null
          kind?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          child_id?: string | null
          cost_points?: number
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          enabled?: boolean
          household_id?: string
          id?: string
          image_url?: string | null
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_items_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      tides_insights: {
        Row: {
          child_id: string
          created_at: string
          household_id: string
          id: string
          pattern: Json | null
          period_end: string | null
          period_start: string | null
          status: string
          suggestion: string | null
          summary: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          household_id: string
          id?: string
          pattern?: Json | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          suggestion?: string | null
          summary?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          household_id?: string
          id?: string
          pattern?: Json | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          suggestion?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tides_insights_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tides_insights_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          kids_count: number | null
          name: string
          town: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          kids_count?: number | null
          name: string
          town?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kids_count?: number | null
          name?: string
          town?: string | null
        }
        Relationships: []
      }
      wall_messages: {
        Row: {
          author_label: string | null
          body: string
          bonus_points: number
          child_id: string | null
          created_at: string
          deleted_at: string | null
          emoji: string | null
          expires_at: string | null
          household_id: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_label?: string | null
          body: string
          bonus_points?: number
          child_id?: string | null
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          expires_at?: string | null
          household_id: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_label?: string | null
          body?: string
          bonus_points?: number
          child_id?: string | null
          created_at?: string
          deleted_at?: string | null
          emoji?: string | null
          expires_at?: string | null
          household_id?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wall_messages_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_messages_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      child_is_mine: { Args: { c: string }; Returns: boolean }
      hard_delete_child: { Args: { p_child: string }; Returns: undefined }
      household_is_mine: { Args: { hh: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      kiosk_snapshot: {
        Args: { p_household: string; p_since: string }
        Returns: Json
      }
      reset_household: { Args: { p_household: string }; Returns: undefined }
      routine_is_mine: { Args: { r: string }; Returns: boolean }
      rpc_kiosk_pair: { Args: { p_code: string }; Returns: Json }
      rpc_kiosk_pull: {
        Args: { p_secret: string; p_since?: string }
        Returns: Json
      }
      rpc_kiosk_push: {
        Args: { p_payload: Json; p_secret: string }
        Returns: Json
      }
      rpc_kiosk_reset_points: { Args: { p_secret: string }; Returns: Json }
    }
    Enums: {
      calm_tool_type: "breathing" | "feelings" | "break" | "social_story"
      customer_status: "lead" | "scheduled" | "installed"
      pairing_status: "pending" | "paired"
      plus_plan: "monthly" | "annual"
      referral_status: "pending" | "contacted" | "converted" | "declined"
      routine_type: "schedule" | "first_then"
      step_type: "task" | "first" | "then"
      user_role: "admin" | "parent"
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
    Enums: {
      calm_tool_type: ["breathing", "feelings", "break", "social_story"],
      customer_status: ["lead", "scheduled", "installed"],
      pairing_status: ["pending", "paired"],
      plus_plan: ["monthly", "annual"],
      referral_status: ["pending", "contacted", "converted", "declined"],
      routine_type: ["schedule", "first_then"],
      step_type: ["task", "first", "then"],
      user_role: ["admin", "parent"],
    },
  },
} as const
