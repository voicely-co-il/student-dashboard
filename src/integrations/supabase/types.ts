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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_rarity: Database["public"]["Enums"]["badge_rarity"] | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          requirements: Json
          type: Database["public"]["Enums"]["achievement_type"]
          updated_at: string | null
        }
        Insert: {
          badge_rarity?: Database["public"]["Enums"]["badge_rarity"] | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          requirements: Json
          type: Database["public"]["Enums"]["achievement_type"]
          updated_at?: string | null
        }
        Update: {
          badge_rarity?: Database["public"]["Enums"]["badge_rarity"] | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          requirements?: Json
          type?: Database["public"]["Enums"]["achievement_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_analysis: {
        Row: {
          created_at: string | null
          emotional_expression: number
          feedback: Json
          id: string
          overall_score: number
          pitch_accuracy: number
          processing_time: number
          recommendations: Json
          recording_id: string
          rhythm_timing: number
          tonal_quality: number
        }
        Insert: {
          created_at?: string | null
          emotional_expression: number
          feedback: Json
          id?: string
          overall_score: number
          pitch_accuracy: number
          processing_time: number
          recommendations: Json
          recording_id: string
          rhythm_timing: number
          tonal_quality: number
        }
        Update: {
          created_at?: string | null
          emotional_expression?: number
          feedback?: Json
          id?: string
          overall_score?: number
          pitch_accuracy?: number
          processing_time?: number
          recommendations?: Json
          recording_id?: string
          rhythm_timing?: number
          tonal_quality?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: true
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_cache: {
        Row: {
          cache_key: string
          created_at: string
          created_by: string | null
          data: Json
          expires_at: string | null
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          created_by?: string | null
          data: Json
          expires_at?: string | null
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          expires_at?: string | null
          id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_data: Json
          event_type: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      calcom_availability_cache: {
        Row: {
          cached_at: string
          date: string
          event_type_id: string
          expires_at: string
          id: string
          slots: Json
        }
        Insert: {
          cached_at?: string
          date: string
          event_type_id: string
          expires_at: string
          id?: string
          slots: Json
        }
        Update: {
          cached_at?: string
          date?: string
          event_type_id?: string
          expires_at?: string
          id?: string
          slots?: Json
        }
        Relationships: [
          {
            foreignKeyName: "calcom_availability_cache_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "calcom_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      calcom_bookings: {
        Row: {
          attendee_email: string
          attendee_language: string | null
          attendee_name: string
          attendee_phone: string | null
          attendee_timezone: string | null
          booking_fields_responses: Json | null
          calcom_booking_id: number | null
          calcom_booking_uid: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          chat_session_id: string | null
          confirmed_at: string | null
          created_at: string
          end_time: string
          event_type_id: string | null
          id: string
          lead_id: string | null
          location_type: string | null
          location_value: string | null
          meeting_url: string | null
          metadata: Json | null
          reminder_sent_1h: boolean | null
          reminder_sent_24h: boolean | null
          source: string | null
          start_time: string
          status: string | null
          updated_at: string
        }
        Insert: {
          attendee_email: string
          attendee_language?: string | null
          attendee_name: string
          attendee_phone?: string | null
          attendee_timezone?: string | null
          booking_fields_responses?: Json | null
          calcom_booking_id?: number | null
          calcom_booking_uid?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          chat_session_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          end_time: string
          event_type_id?: string | null
          id?: string
          lead_id?: string | null
          location_type?: string | null
          location_value?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          reminder_sent_1h?: boolean | null
          reminder_sent_24h?: boolean | null
          source?: string | null
          start_time: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          attendee_email?: string
          attendee_language?: string | null
          attendee_name?: string
          attendee_phone?: string | null
          attendee_timezone?: string | null
          booking_fields_responses?: Json | null
          calcom_booking_id?: number | null
          calcom_booking_uid?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          chat_session_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          end_time?: string
          event_type_id?: string | null
          id?: string
          lead_id?: string | null
          location_type?: string | null
          location_value?: string | null
          meeting_url?: string | null
          metadata?: Json | null
          reminder_sent_1h?: boolean | null
          reminder_sent_24h?: boolean | null
          source?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calcom_bookings_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calcom_bookings_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "calcom_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calcom_bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      calcom_config: {
        Row: {
          api_key_encrypted: string | null
          api_version: string | null
          base_url: string | null
          created_at: string
          default_username: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          organization_slug: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          api_version?: string | null
          base_url?: string | null
          created_at?: string
          default_username?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          organization_slug?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          api_version?: string | null
          base_url?: string | null
          created_at?: string
          default_username?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          organization_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calcom_event_types: {
        Row: {
          calcom_event_type_id: number
          calcom_username: string | null
          created_at: string
          currency: string | null
          description: string | null
          event_type: string | null
          hidden: boolean | null
          id: string
          is_active: boolean | null
          length_minutes: number
          price: number | null
          requires_confirmation: boolean | null
          slug: string
          synced_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          calcom_event_type_id: number
          calcom_username?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_type?: string | null
          hidden?: boolean | null
          id?: string
          is_active?: boolean | null
          length_minutes: number
          price?: number | null
          requires_confirmation?: boolean | null
          slug: string
          synced_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          calcom_event_type_id?: number
          calcom_username?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_type?: string | null
          hidden?: boolean | null
          id?: string
          is_active?: boolean | null
          length_minutes?: number
          price?: number | null
          requires_confirmation?: boolean | null
          slug?: string
          synced_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_projects: {
        Row: {
          color: string | null
          context_data: Json | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          name: string
          system_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          context_data?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          name: string
          system_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          context_data?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          ip_address: string | null
          is_live: boolean | null
          last_message_at: string | null
          messages: Json | null
          page_url: string | null
          source: string | null
          status: string | null
          updated_at: string
          user_agent: string | null
          visitor_info: Json | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_live?: boolean | null
          last_message_at?: string | null
          messages?: Json | null
          page_url?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          visitor_info?: Json | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_live?: boolean | null
          last_message_at?: string | null
          messages?: Json | null
          page_url?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          visitor_info?: Json | null
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          content: string
          created_at: string | null
          embedding_vector: number[] | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          metadata: Json | null
          pinecone_id: string | null
          recording_id: string | null
          transcription_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding_vector?: number[] | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          metadata?: Json | null
          pinecone_id?: string | null
          recording_id?: string | null
          transcription_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding_vector?: number[] | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          metadata?: Json | null
          pinecone_id?: string | null
          recording_id?: string | null
          transcription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_sync_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          files_added: number | null
          files_failed: number | null
          files_processed: number | null
          files_updated: number | null
          id: string
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          files_added?: number | null
          files_failed?: number | null
          files_processed?: number | null
          files_updated?: number | null
          id?: string
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          files_added?: number | null
          files_failed?: number | null
          files_processed?: number | null
          files_updated?: number | null
          id?: string
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          current_students: number | null
          description: string | null
          id: string
          is_active: boolean | null
          level: Database["public"]["Enums"]["user_level"] | null
          max_students: number | null
          metadata: Json | null
          name: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_students?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["user_level"] | null
          max_students?: number | null
          metadata?: Json | null
          name: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_students?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: Database["public"]["Enums"]["user_level"] | null
          max_students?: number | null
          metadata?: Json | null
          name?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          calculated_at: string | null
          id: string
          leaderboard_id: string
          metadata: Json | null
          rank: number | null
          score: number
          user_id: string
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          leaderboard_id: string
          metadata?: Json | null
          rank?: number | null
          score?: number
          user_id: string
        }
        Update: {
          calculated_at?: string | null
          id?: string
          leaderboard_id?: string
          metadata?: Json | null
          rank?: number | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_leaderboard_id_fkey"
            columns: ["leaderboard_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          created_at: string | null
          criteria: Json
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          criteria: Json
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          criteria?: Json
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          type?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          chat_session_id: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          chat_session_id?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          chat_session_id?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_insights: {
        Row: {
          based_on_data: Json
          confidence: number
          created_at: string | null
          description: string
          id: string
          insight_type: string
          is_pinned: boolean | null
          is_read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          based_on_data: Json
          confidence: number
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          is_pinned?: boolean | null
          is_read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          based_on_data?: Json
          confidence?: number
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          is_pinned?: boolean | null
          is_read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_participants: {
        Row: {
          attendance_duration: number | null
          attended: boolean | null
          created_at: string | null
          id: string
          lesson_id: string
          notes: string | null
          student_id: string
        }
        Insert: {
          attendance_duration?: number | null
          attended?: boolean | null
          created_at?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          student_id: string
        }
        Update: {
          attendance_duration?: number | null
          attended?: boolean | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_participants_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number
          google_drive_url: string | null
          group_id: string | null
          id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          metadata: Json | null
          scheduled_at: string
          status: string | null
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration: number
          google_drive_url?: string | null
          group_id?: string | null
          id?: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          metadata?: Json | null
          scheduled_at: string
          status?: string | null
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number
          google_drive_url?: string | null
          group_id?: string | null
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          metadata?: Json | null
          scheduled_at?: string
          status?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_cost_usd: number | null
          id: string
          negative_prompt: string | null
          prompt: string | null
          service: string
          settings: Json | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          url: string | null
          used_in_campaigns: string[] | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost_usd?: number | null
          id?: string
          negative_prompt?: string | null
          prompt?: string | null
          service: string
          settings?: Json | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
          used_in_campaigns?: string[] | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_cost_usd?: number | null
          id?: string
          negative_prompt?: string | null
          prompt?: string | null
          service?: string
          settings?: Json | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
          used_in_campaigns?: string[] | null
        }
        Relationships: []
      }
      marketing_models: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_he: string
          thumbnail_url: string | null
          token: string
          tune_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_he: string
          thumbnail_url?: string | null
          token: string
          tune_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_he?: string
          thumbnail_url?: string | null
          token?: string
          tune_id?: string
        }
        Relationships: []
      }
      marketing_scenarios: {
        Row: {
          category: string | null
          created_at: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          name: string
          name_he: string
          prompt_template: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_he: string
          prompt_template: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_he?: string
          prompt_template?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      memory_operations_log: {
        Row: {
          created_at: string
          id: string
          input_data: Json | null
          latency_ms: number | null
          memories_affected: string[] | null
          operation: string
          output_data: Json | null
          session_id: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_data?: Json | null
          latency_ms?: number | null
          memories_affected?: string[] | null
          operation: string
          output_data?: Json | null
          session_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_data?: Json | null
          latency_ms?: number | null
          memories_affected?: string[] | null
          operation?: string
          output_data?: Json | null
          session_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_operations_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooklm_content: {
        Row: {
          answer: string | null
          content_type: string
          content_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          notebook_id: string
          notebook_name: string | null
          progress_percent: number | null
          prompt: string | null
          settings: Json | null
          status: string | null
          task_id: string | null
          thumbnail_url: string | null
          title: string | null
          transcript: string | null
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          notebook_id: string
          notebook_name?: string | null
          progress_percent?: number | null
          prompt?: string | null
          settings?: Json | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          notebook_id?: string
          notebook_name?: string | null
          progress_percent?: number | null
          prompt?: string | null
          settings?: Json | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notion_sync_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_synced_at: string | null
          metadata: Json | null
          notion_id: string
          supabase_id: string | null
          sync_status: string | null
          sync_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          notion_id: string
          supabase_id?: string | null
          sync_status?: string | null
          sync_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          notion_id?: string
          supabase_id?: string | null
          sync_status?: string | null
          sync_type?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: Database["public"]["Enums"]["permission_resource"]
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: Database["public"]["Enums"]["permission_resource"]
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: Database["public"]["Enums"]["permission_resource"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      recordings: {
        Row: {
          audio_url: string
          created_at: string | null
          duration: number
          format: string
          id: string
          is_practice: boolean | null
          lesson_id: string | null
          metadata: Json | null
          size: number
          status: Database["public"]["Enums"]["recording_status"] | null
          title: string
          updated_at: string | null
          user_id: string
          waveform_url: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration: number
          format: string
          id?: string
          is_practice?: boolean | null
          lesson_id?: string | null
          metadata?: Json | null
          size: number
          status?: Database["public"]["Enums"]["recording_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
          waveform_url?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration?: number
          format?: string
          id?: string
          is_practice?: boolean | null
          lesson_id?: string | null
          metadata?: Json | null
          size?: number
          status?: Database["public"]["Enums"]["recording_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          waveform_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string | null
          feedback_helpful: boolean | null
          id: string
          query: string
          query_embedding: number[] | null
          results: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_helpful?: boolean | null
          id?: string
          query: string
          query_embedding?: number[] | null
          results: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_helpful?: boolean | null
          id?: string
          query?: string
          query_embedding?: number[] | null
          results?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          click_count: number | null
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          metadata: Json | null
          slug: string
          target_id: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          link_type: string
          metadata?: Json | null
          slug: string
          target_id: string
        }
        Update: {
          click_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          metadata?: Json | null
          slug?: string
          target_id?: string
        }
        Relationships: []
      }
      student_chat_sessions: {
        Row: {
          chat_type: string | null
          context_used: string[] | null
          created_at: string
          extracted_memories: string[] | null
          id: string
          last_message_at: string | null
          message_count: number | null
          messages: Json | null
          project_id: string | null
          status: string | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_type?: string | null
          context_used?: string[] | null
          created_at?: string
          extracted_memories?: string[] | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          messages?: Json | null
          project_id?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_type?: string | null
          context_used?: string[] | null
          created_at?: string
          extracted_memories?: string[] | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          messages?: Json | null
          project_id?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_chat_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chat_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_name_mapping_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          mapping_id: string | null
          previous_resolved_name: string | null
          previous_status: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          mapping_id?: string | null
          previous_resolved_name?: string | null
          previous_status?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          mapping_id?: string | null
          previous_resolved_name?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_name_mapping_history_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "student_name_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      student_name_mappings: {
        Row: {
          created_at: string | null
          crm_match: string | null
          id: string
          last_seen_at: string | null
          notes: string | null
          original_name: string
          resolved_name: string | null
          status: string | null
          transcript_count: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          crm_match?: string | null
          id?: string
          last_seen_at?: string | null
          notes?: string | null
          original_name: string
          resolved_name?: string | null
          status?: string | null
          transcript_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          crm_match?: string | null
          id?: string
          last_seen_at?: string | null
          notes?: string | null
          original_name?: string
          resolved_name?: string | null
          status?: string | null
          transcript_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sync_audit_log: {
        Row: {
          action: string
          created_at: string | null
          data_snapshot: Json | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          lesson_date: string | null
          student_name: string | null
          transcript_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          lesson_date?: string | null
          student_name?: string | null
          transcript_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          lesson_date?: string | null
          student_name?: string | null
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_chunks_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_insights: {
        Row: {
          action_items: string[] | null
          created_at: string
          id: string
          key_topics: string[] | null
          progress_notes: string | null
          raw_ai_response: Json | null
          skills_practiced: string[] | null
          student_mood: string | null
          teacher_recommendations: string | null
          transcript_id: string
          updated_at: string
        }
        Insert: {
          action_items?: string[] | null
          created_at?: string
          id?: string
          key_topics?: string[] | null
          progress_notes?: string | null
          raw_ai_response?: Json | null
          skills_practiced?: string[] | null
          student_mood?: string | null
          teacher_recommendations?: string | null
          transcript_id: string
          updated_at?: string
        }
        Update: {
          action_items?: string[] | null
          created_at?: string
          id?: string
          key_topics?: string[] | null
          progress_notes?: string | null
          raw_ai_response?: Json | null
          skills_practiced?: string[] | null
          student_mood?: string | null
          teacher_recommendations?: string | null
          transcript_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_insights_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          confidence: number
          created_at: string | null
          google_drive_url: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          language: string | null
          lesson_id: string
          recording_id: string | null
          speaker_labels: Json | null
          timeos_data: Json | null
          transcript: string
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string | null
          google_drive_url?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          language?: string | null
          lesson_id: string
          recording_id?: string | null
          speaker_labels?: Json | null
          timeos_data?: Json | null
          transcript: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string | null
          google_drive_url?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          language?: string | null
          lesson_id?: string
          recording_id?: string | null
          speaker_labels?: Json | null
          timeos_data?: Json | null
          transcript?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcriptions_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          ai_summary: string | null
          created_at: string
          duration_minutes: number | null
          full_text: string | null
          gdrive_ai_notes_id: string | null
          gdrive_file_id: string
          gdrive_folder_id: string | null
          gdrive_modified_at: string | null
          gdrive_recording_id: string | null
          id: string
          language: string | null
          last_synced_at: string | null
          lesson_date: string | null
          source: Database["public"]["Enums"]["transcript_source"] | null
          student_name: string | null
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          duration_minutes?: number | null
          full_text?: string | null
          gdrive_ai_notes_id?: string | null
          gdrive_file_id: string
          gdrive_folder_id?: string | null
          gdrive_modified_at?: string | null
          gdrive_recording_id?: string | null
          id?: string
          language?: string | null
          last_synced_at?: string | null
          lesson_date?: string | null
          source?: Database["public"]["Enums"]["transcript_source"] | null
          student_name?: string | null
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          duration_minutes?: number | null
          full_text?: string | null
          gdrive_ai_notes_id?: string | null
          gdrive_file_id?: string
          gdrive_folder_id?: string | null
          gdrive_modified_at?: string | null
          gdrive_recording_id?: string | null
          id?: string
          language?: string | null
          last_synced_at?: string | null
          lesson_date?: string | null
          source?: Database["public"]["Enums"]["transcript_source"] | null
          student_name?: string | null
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          progress_data: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memories: {
        Row: {
          confidence: number | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          importance: number | null
          is_active: boolean | null
          last_accessed_at: string | null
          memory_type: string
          source: string | null
          source_id: string | null
          superseded_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          memory_type: string
          source?: string | null
          source_id?: string | null
          superseded_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          importance?: number | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          memory_type?: string
          source?: string | null
          source_id?: string | null
          superseded_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memories_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "user_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          average_score: number | null
          best_score: number | null
          completed_at: string
          exercise_id: string
          id: string
          last_attempt_at: string | null
          longest_streak: number | null
          notes: string | null
          score: number | null
          streak_count: number | null
          total_attempts: number | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          completed_at?: string
          exercise_id: string
          id?: string
          last_attempt_at?: string | null
          longest_streak?: number | null
          notes?: string | null
          score?: number | null
          streak_count?: number | null
          total_attempts?: number | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          completed_at?: string
          exercise_id?: string
          id?: string
          last_attempt_at?: string | null
          longest_streak?: number | null
          notes?: string | null
          score?: number | null
          streak_count?: number | null
          total_attempts?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "vocal_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recordings: {
        Row: {
          analysis_data: Json | null
          audio_url: string
          created_at: string
          duration_seconds: number | null
          exercise_id: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recordings_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "vocal_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          duration_seconds: number | null
          exercises_completed: number | null
          id: string
          session_end: string | null
          session_start: string | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          exercises_completed?: number | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          exercises_completed?: number | null
          id?: string
          session_end?: string | null
          session_start?: string | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          average_score: number | null
          emotional_trend: number | null
          id: string
          improvement_areas: string[] | null
          last_practice_date: string | null
          learning_pace: string | null
          lessons_this_month: number | null
          lessons_this_week: number | null
          longest_streak: number | null
          pitch_trend: number | null
          practice_minutes_total: number | null
          practice_minutes_week: number | null
          rhythm_trend: number | null
          streak_days: number | null
          strong_areas: string[] | null
          total_recordings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          emotional_trend?: number | null
          id?: string
          improvement_areas?: string[] | null
          last_practice_date?: string | null
          learning_pace?: string | null
          lessons_this_month?: number | null
          lessons_this_week?: number | null
          longest_streak?: number | null
          pitch_trend?: number | null
          practice_minutes_total?: number | null
          practice_minutes_week?: number | null
          rhythm_trend?: number | null
          streak_days?: number | null
          strong_areas?: string[] | null
          total_recordings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          emotional_trend?: number | null
          id?: string
          improvement_areas?: string[] | null
          last_practice_date?: string | null
          learning_pace?: string | null
          lessons_this_month?: number | null
          lessons_this_week?: number | null
          longest_streak?: number | null
          pitch_trend?: number | null
          practice_minutes_total?: number | null
          practice_minutes_week?: number | null
          rhythm_trend?: number | null
          streak_days?: number | null
          strong_areas?: string[] | null
          total_recordings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          age: number | null
          avatar: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          level: string | null
          name: string
          notion_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          teacher: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          avatar?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          level?: string | null
          name: string
          notion_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          teacher?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          avatar?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          level?: string | null
          name?: string
          notion_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          teacher?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vocal_exercises: {
        Row: {
          audio_url: string | null
          category: string
          created_at: string
          description: string | null
          difficulty_level: number | null
          duration_minutes: number | null
          id: string
          instructions: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          category: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          id?: string
          instructions?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          id?: string
          instructions?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_messages: {
        Row: {
          chat_session_id: string | null
          created_at: string
          duration_seconds: number | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          message_index: number | null
          message_role: string | null
          mime_type: string | null
          storage_path: string
          transcribed_at: string | null
          transcription: string | null
          transcription_error: string | null
          transcription_language: string | null
          transcription_status: string | null
          user_id: string | null
        }
        Insert: {
          chat_session_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          message_index?: number | null
          message_role?: string | null
          mime_type?: string | null
          storage_path: string
          transcribed_at?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_language?: string | null
          transcription_status?: string | null
          user_id?: string | null
        }
        Update: {
          chat_session_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          message_index?: number | null
          message_role?: string | null
          mime_type?: string | null
          storage_path?: string
          transcribed_at?: string | null
          transcription?: string | null
          transcription_error?: string | null
          transcription_language?: string | null
          transcription_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      website_content: {
        Row: {
          content: string
          content_hash: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          id: string
          last_scraped_at: string | null
          metadata: Json | null
          source: Database["public"]["Enums"]["website_source"]
          source_url: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          content_hash?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          metadata?: Json | null
          source: Database["public"]["Enums"]["website_source"]
          source_url: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_hash?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          id?: string
          last_scraped_at?: string | null
          metadata?: Json | null
          source?: Database["public"]["Enums"]["website_source"]
          source_url?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      website_content_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_id: string
          created_at: string
          embedding: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_id: string
          created_at?: string
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_content_chunks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "website_content"
            referencedColumns: ["id"]
          },
        ]
      }
      website_scrape_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          pages_added: number | null
          pages_failed: number | null
          pages_scraped: number | null
          pages_updated: number | null
          source: Database["public"]["Enums"]["website_source"]
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          pages_added?: number | null
          pages_failed?: number | null
          pages_scraped?: number | null
          pages_updated?: number | null
          source: Database["public"]["Enums"]["website_source"]
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          pages_added?: number | null
          pages_failed?: number | null
          pages_scraped?: number | null
          pages_updated?: number | null
          source?: Database["public"]["Enums"]["website_source"]
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          access_token_encrypted: string | null
          auto_reply_enabled: boolean | null
          business_name: string | null
          created_at: string
          default_language: string | null
          display_phone_number: string
          id: string
          messaging_limit: string | null
          phone_number_id: string
          quality_rating: string | null
          status: string | null
          updated_at: string
          verified_at: string | null
          waba_id: string
          webhook_secret: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          auto_reply_enabled?: boolean | null
          business_name?: string | null
          created_at?: string
          default_language?: string | null
          display_phone_number: string
          id?: string
          messaging_limit?: string | null
          phone_number_id: string
          quality_rating?: string | null
          status?: string | null
          updated_at?: string
          verified_at?: string | null
          waba_id: string
          webhook_secret?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          auto_reply_enabled?: boolean | null
          business_name?: string | null
          created_at?: string
          default_language?: string | null
          display_phone_number?: string
          id?: string
          messaging_limit?: string | null
          phone_number_id?: string
          quality_rating?: string | null
          status?: string | null
          updated_at?: string
          verified_at?: string | null
          waba_id?: string
          webhook_secret?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          chat_session_id: string | null
          conversation_type: string | null
          created_at: string
          id: string
          last_customer_message_at: string | null
          metadata: Json | null
          status: string | null
          updated_at: string
          wa_conversation_id: string | null
          wa_phone_number: string
          wa_profile_name: string | null
          whatsapp_account_id: string
          window_expires_at: string | null
        }
        Insert: {
          chat_session_id?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          last_customer_message_at?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          wa_conversation_id?: string | null
          wa_phone_number: string
          wa_profile_name?: string | null
          whatsapp_account_id: string
          window_expires_at?: string | null
        }
        Update: {
          chat_session_id?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          last_customer_message_at?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          wa_conversation_id?: string | null
          wa_phone_number?: string
          wa_profile_name?: string | null
          whatsapp_account_id?: string
          window_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          message_type: string
          pricing_category: string | null
          pricing_model: string | null
          status: string | null
          status_updated_at: string | null
          wa_message_id: string
          wa_timestamp: string | null
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_type: string
          pricing_category?: string | null
          pricing_model?: string | null
          status?: string | null
          status_updated_at?: string | null
          wa_message_id: string
          wa_timestamp?: string | null
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          pricing_category?: string | null
          pricing_model?: string | null
          status?: string | null
          status_updated_at?: string | null
          wa_message_id?: string
          wa_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          approved_at: string | null
          category: string
          components: Json
          created_at: string
          id: string
          is_active: boolean | null
          language: string
          rejection_reason: string | null
          status: string | null
          template_name: string
          updated_at: string
          whatsapp_account_id: string
        }
        Insert: {
          approved_at?: string | null
          category: string
          components: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          language?: string
          rejection_reason?: string | null
          status?: string | null
          template_name: string
          updated_at?: string
          whatsapp_account_id: string
        }
        Update: {
          approved_at?: string | null
          category?: string
          components?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          language?: string
          rejection_reason?: string | null
          status?: string | null
          template_name?: string
          updated_at?: string
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_monthly_skill_trends: {
        Row: {
          month: string | null
          practice_count: number | null
          skill: string | null
          student_count: number | null
        }
        Relationships: []
      }
      mv_monthly_topic_trends: {
        Row: {
          mention_count: number | null
          month: string | null
          student_count: number | null
          topic: string | null
        }
        Relationships: []
      }
      mv_mood_stats: {
        Row: {
          count: number | null
          mood: string | null
          student_count: number | null
        }
        Relationships: []
      }
      mv_skill_stats: {
        Row: {
          first_seen: string | null
          last_seen: string | null
          practice_count: number | null
          skill: string | null
          student_count: number | null
        }
        Relationships: []
      }
      mv_topic_stats: {
        Row: {
          first_seen: string | null
          last_seen: string | null
          mention_count: number | null
          student_count: number | null
          topic: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      clean_expired_availability: { Args: never; Returns: undefined }
      create_short_link: {
        Args: {
          p_custom_slug?: string
          p_link_type: string
          p_target_id: string
        }
        Returns: string
      }
      delete_teacher_chat_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: boolean
      }
      generate_short_slug: { Args: never; Returns: string }
      get_active_chat_session: {
        Args: {
          p_chat_type?: string
          p_max_age_hours?: number
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          messages: Json
          summary: string
        }[]
      }
      get_active_teacher_session: {
        Args: { p_max_age_hours?: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          message_count: number
          messages: Json
          title: string
          updated_at: string
        }[]
      }
      get_analytics_overview: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_analytics_trends: {
        Args: {
          p_end_date?: string
          p_granularity?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_chat_projects: {
        Args: { p_include_archived?: boolean; p_user_id: string }
        Returns: {
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          is_pinned: boolean
          last_activity: string
          name: string
          session_count: number
          system_prompt: string
        }[]
      }
      get_database_size: {
        Args: never
        Returns: {
          size_bytes: number
          size_pretty: string
        }[]
      }
      get_project_sessions: {
        Args: { p_limit?: number; p_project_id: string; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          message_count: number
          preview: string
          title: string
          updated_at: string
        }[]
      }
      get_short_link: {
        Args: { p_link_type: string; p_target_id: string }
        Returns: string
      }
      get_table_sizes: {
        Args: never
        Returns: {
          table_name: string
          total_bytes: number
          total_size: string
        }[]
      }
      get_teacher_chat_sessions: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          message_count: number
          preview: string
          title: string
          updated_at: string
        }[]
      }
      get_user_memory_stats: {
        Args: { p_user_id: string }
        Returns: {
          achievements_count: number
          avg_confidence: number
          challenges_count: number
          facts_count: number
          goals_count: number
          newest_memory: string
          oldest_memory: string
          preferences_count: number
          total_memories: number
        }[]
      }
      get_website_content_by_type: {
        Args: {
          p_content_type: Database["public"]["Enums"]["content_type"]
          p_limit?: number
          p_source?: Database["public"]["Enums"]["website_source"]
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          source: Database["public"]["Enums"]["website_source"]
          source_url: string
          summary: string
          title: string
        }[]
      }
      has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["permission_action"]
          _resource: Database["public"]["Enums"]["permission_resource"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
      match_user_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_user_id: string
          query_embedding: string
        }
        Returns: {
          confidence: number
          content: string
          created_at: string
          id: string
          importance: number
          last_accessed_at: string
          memory_type: string
          similarity: number
        }[]
      }
      refresh_analytics_views: { Args: never; Returns: undefined }
      resolve_short_link: {
        Args: { p_slug: string }
        Returns: {
          link_type: string
          target_id: string
        }[]
      }
      search_all_content: {
        Args: {
          filter_student_id?: string
          include_transcripts?: boolean
          include_website?: boolean
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          metadata: Json
          parent_id: string
          similarity: number
          source_type: string
          title: string
        }[]
      }
      search_transcripts: {
        Args: {
          filter_student_name?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          lesson_date: string
          similarity: number
          student_name: string
          transcript_id: string
        }[]
      }
      search_website_content: {
        Args: {
          filter_content_type?: Database["public"]["Enums"]["content_type"]
          filter_source?: Database["public"]["Enums"]["website_source"]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_content: string
          chunk_id: string
          content_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          metadata: Json
          similarity: number
          source: Database["public"]["Enums"]["website_source"]
          source_url: string
          title: string
        }[]
      }
      touch_memories: { Args: { memory_ids: string[] }; Returns: undefined }
    }
    Enums: {
      achievement_type:
        | "streak"
        | "score"
        | "completion"
        | "milestone"
        | "special"
      app_role: "super_admin" | "admin" | "instructor" | "student"
      badge_rarity: "common" | "rare" | "epic" | "legendary"
      content_type:
        | "page"
        | "service"
        | "course"
        | "faq"
        | "testimonial"
        | "blog_post"
        | "pricing"
        | "teacher_bio"
      interaction_type:
        | "lesson"
        | "practice"
        | "feedback"
        | "question"
        | "answer"
      lesson_type: "one_on_one" | "group"
      permission_action: "create" | "read" | "update" | "delete" | "manage"
      permission_resource:
        | "users"
        | "exercises"
        | "recordings"
        | "progress"
        | "analytics"
        | "system"
      recording_status: "processing" | "processed" | "failed"
      transcript_source: "zoom" | "manual" | "import"
      user_level: "beginner" | "intermediate" | "advanced" | "expert"
      user_role: "student" | "teacher" | "admin"
      website_source: "voicely_main" | "voicely_juniors" | "blog"
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
      achievement_type: [
        "streak",
        "score",
        "completion",
        "milestone",
        "special",
      ],
      app_role: ["super_admin", "admin", "instructor", "student"],
      badge_rarity: ["common", "rare", "epic", "legendary"],
      content_type: [
        "page",
        "service",
        "course",
        "faq",
        "testimonial",
        "blog_post",
        "pricing",
        "teacher_bio",
      ],
      interaction_type: [
        "lesson",
        "practice",
        "feedback",
        "question",
        "answer",
      ],
      lesson_type: ["one_on_one", "group"],
      permission_action: ["create", "read", "update", "delete", "manage"],
      permission_resource: [
        "users",
        "exercises",
        "recordings",
        "progress",
        "analytics",
        "system",
      ],
      recording_status: ["processing", "processed", "failed"],
      transcript_source: ["zoom", "manual", "import"],
      user_level: ["beginner", "intermediate", "advanced", "expert"],
      user_role: ["student", "teacher", "admin"],
      website_source: ["voicely_main", "voicely_juniors", "blog"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.72.7 (currently installed v2.65.5)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
