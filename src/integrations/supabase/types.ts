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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_at: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["assignment_status"] | null
          student_id: string
          title: string
          type: Database["public"]["Enums"]["assignment_type"] | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          student_id: string
          title: string
          type?: Database["public"]["Enums"]["assignment_type"] | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          student_id?: string
          title?: string
          type?: Database["public"]["Enums"]["assignment_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          assignment_id: string | null
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          lesson_id: string | null
          read_at: string | null
          recording_id: string | null
          student_id: string
          type: Database["public"]["Enums"]["feedback_type"] | null
        }
        Insert: {
          assignment_id?: string | null
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          read_at?: string | null
          recording_id?: string | null
          student_id: string
          type?: Database["public"]["Enums"]["feedback_type"] | null
        }
        Update: {
          assignment_id?: string | null
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          read_at?: string | null
          recording_id?: string | null
          student_id?: string
          type?: Database["public"]["Enums"]["feedback_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attendance_note: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notion_lesson_id: string | null
          recording_url: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["lesson_status"] | null
          student_id: string
          teacher_id: string | null
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          attendance_note?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notion_lesson_id?: string | null
          recording_url?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["lesson_status"] | null
          student_id: string
          teacher_id?: string | null
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          attendance_note?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notion_lesson_id?: string | null
          recording_url?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["lesson_status"] | null
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notion_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notion_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notion_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          assignment_id: string | null
          duration_seconds: number | null
          file_type: Database["public"]["Enums"]["file_type"] | null
          file_url: string
          id: string
          student_id: string
          uploaded_at: string
        }
        Insert: {
          assignment_id?: string | null
          duration_seconds?: number | null
          file_type?: Database["public"]["Enums"]["file_type"] | null
          file_url: string
          id?: string
          student_id: string
          uploaded_at?: string
        }
        Update: {
          assignment_id?: string | null
          duration_seconds?: number | null
          file_type?: Database["public"]["Enums"]["file_type"] | null
          file_url?: string
          id?: string
          student_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          goals: string | null
          id: string
          level: Database["public"]["Enums"]["student_level"] | null
          medical_notes: string | null
          progress_score: number | null
          start_date: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goals?: string | null
          id?: string
          level?: Database["public"]["Enums"]["student_level"] | null
          medical_notes?: string | null
          progress_score?: number | null
          start_date?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goals?: string | null
          id?: string
          level?: Database["public"]["Enums"]["student_level"] | null
          medical_notes?: string | null
          progress_score?: number | null
          start_date?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_notes: {
        Row: {
          created_at: string
          id: string
          is_operational: boolean | null
          note: string
          reminder_date: string | null
          student_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_operational?: boolean | null
          note: string
          reminder_date?: string | null
          student_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_operational?: boolean | null
          note?: string
          reminder_date?: string | null
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          created_at: string
          exercises: Json | null
          goals: string[] | null
          id: string
          student_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          exercises?: Json | null
          goals?: string[] | null
          id?: string
          student_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          exercises?: Json | null
          goals?: string[] | null
          id?: string
          student_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_student_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      assignment_status: "assigned" | "submitted" | "reviewed"
      assignment_type: "song" | "breathing_drill" | "diction" | "warm_up"
      feedback_type: "text" | "audio" | "video"
      file_type: "audio" | "video"
      lesson_status: "scheduled" | "completed" | "cancelled" | "no_show"
      student_level: "beginner" | "intermediate" | "advanced"
      user_status: "active" | "paused" | "archived"
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
      app_role: ["student", "teacher", "admin"],
      assignment_status: ["assigned", "submitted", "reviewed"],
      assignment_type: ["song", "breathing_drill", "diction", "warm_up"],
      feedback_type: ["text", "audio", "video"],
      file_type: ["audio", "video"],
      lesson_status: ["scheduled", "completed", "cancelled", "no_show"],
      student_level: ["beginner", "intermediate", "advanced"],
      user_status: ["active", "paused", "archived"],
    },
  },
} as const
