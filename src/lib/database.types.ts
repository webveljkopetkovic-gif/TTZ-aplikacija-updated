export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          key: string
          updated_at?: string
          value: NonNullable<Json>
        }
        Update: {
          key?: string
          updated_at?: string
          value?: NonNullable<Json>
        }
        Relationships: []
      }
      feedback_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          feedback_id: string
          id: string
          sent_at: string | null
          sent_channels: Database['public']['Enums']['msg_channel'][]
        }
        ComputedFields: never
        Insert: {
          author_id: string
          body: string
          created_at?: string
          feedback_id: string
          id?: string
          sent_at?: string | null
          sent_channels?: Database['public']['Enums']['msg_channel'][]
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          feedback_id?: string
          id?: string
          sent_at?: string | null
          sent_channels?: Database['public']['Enums']['msg_channel'][]
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_replies_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feedback_replies_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'feedback_replies_feedback_id_fkey'
            columns: ['feedback_id']
            isOneToOne: false
            referencedRelation: 'feedbacks'
            referencedColumns: ['id']
          },
        ]
      }
      feedbacks: {
        Row: {
          answers: Json | null
          due_date: string
          due_day: number
          id: string
          last_reminded_at: string | null
          program_id: string
          reminder_count: number
          status: Database['public']['Enums']['feedback_status']
          submitted_at: string | null
        }
        ComputedFields: never
        Insert: {
          answers?: Json | null
          due_date: string
          due_day: number
          id?: string
          last_reminded_at?: string | null
          program_id: string
          reminder_count?: number
          status?: Database['public']['Enums']['feedback_status']
          submitted_at?: string | null
        }
        Update: {
          answers?: Json | null
          due_date?: string
          due_day?: number
          id?: string
          last_reminded_at?: string | null
          program_id?: string
          reminder_count?: number
          status?: Database['public']['Enums']['feedback_status']
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'feedbacks_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feedbacks_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
        ]
      }
      intake_surveys: {
        Row: {
          activity_level: string
          answers: NonNullable<Json>
          birth_date: string
          client_id: string | null
          consent_health: boolean
          consent_terms: boolean
          country: string
          email: string
          exercise_level: Database['public']['Enums']['exercise_level']
          full_name: string
          height_cm: number
          id: string
          occupation: string
          phone: string
          schema_version: number
          sex: string
          start_weight_kg: number
          submitted_at: string
        }
        ComputedFields: never
        Insert: {
          activity_level: string
          answers: NonNullable<Json>
          birth_date: string
          client_id?: string | null
          consent_health: boolean
          consent_terms: boolean
          country?: string
          email: string
          exercise_level?: Database['public']['Enums']['exercise_level']
          full_name: string
          height_cm: number
          id?: string
          occupation: string
          phone: string
          schema_version?: number
          sex: string
          start_weight_kg: number
          submitted_at?: string
        }
        Update: {
          activity_level?: string
          answers?: NonNullable<Json>
          birth_date?: string
          client_id?: string | null
          consent_health?: boolean
          consent_terms?: boolean
          country?: string
          email?: string
          exercise_level?: Database['public']['Enums']['exercise_level']
          full_name?: string
          height_cm?: number
          id?: string
          occupation?: string
          phone?: string
          schema_version?: number
          sex?: string
          start_weight_kg?: number
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'intake_surveys_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'intake_surveys_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
        ]
      }
      lab_files: {
        Row: {
          client_id: string | null
          id: string
          intake_id: string | null
          label: string | null
          storage_path: string
          uploaded_at: string
        }
        ComputedFields: never
        Insert: {
          client_id?: string | null
          id?: string
          intake_id?: string | null
          label?: string | null
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          client_id?: string | null
          id?: string
          intake_id?: string | null
          label?: string | null
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lab_files_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lab_files_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'lab_files_intake_id_fkey'
            columns: ['intake_id']
            isOneToOne: false
            referencedRelation: 'intake_surveys'
            referencedColumns: ['id']
          },
        ]
      }
      meal_logs: {
        Row: {
          done_at: string
          program_day: number
          program_id: string
          slot: Database['public']['Enums']['meal_slot']
        }
        ComputedFields: never
        Insert: {
          done_at?: string
          program_day: number
          program_id: string
          slot: Database['public']['Enums']['meal_slot']
        }
        Update: {
          done_at?: string
          program_day?: number
          program_id?: string
          slot?: Database['public']['Enums']['meal_slot']
        }
        Relationships: [
          {
            foreignKeyName: 'meal_logs_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_logs_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
        ]
      }
      meal_template_items: {
        Row: {
          description: string | null
          id: string
          photo_path: string | null
          plan_day: number
          recipe: string | null
          slot: Database['public']['Enums']['meal_slot']
          template_id: string
          time_of_day: string
          title: string
        }
        ComputedFields: never
        Insert: {
          description?: string | null
          id?: string
          photo_path?: string | null
          plan_day: number
          recipe?: string | null
          slot: Database['public']['Enums']['meal_slot']
          template_id: string
          time_of_day: string
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          photo_path?: string | null
          plan_day?: number
          recipe?: string | null
          slot?: Database['public']['Enums']['meal_slot']
          template_id?: string
          time_of_day?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_template_items_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'meal_templates'
            referencedColumns: ['id']
          },
        ]
      }
      meal_templates: {
        Row: {
          condition: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        ComputedFields: never
        Insert: {
          condition?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_templates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_templates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
        ]
      }
      measurements: {
        Row: {
          created_at: string
          energy_am: number | null
          id: string
          program_day: number
          program_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          energy_am?: number | null
          id?: string
          program_day: number
          program_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          energy_am?: number | null
          id?: string
          program_day?: number
          program_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'measurements_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'measurements_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body: string
          client_id: string
          created_at: string
          id: string
          needs_team_review: boolean
          program_id: string | null
          proposed_action: Json | null
          review_result: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender: Database['public']['Enums']['msg_sender']
        }
        ComputedFields: never
        Insert: {
          author_id?: string | null
          body: string
          client_id: string
          created_at?: string
          id?: string
          needs_team_review?: boolean
          program_id?: string | null
          proposed_action?: Json | null
          review_result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender: Database['public']['Enums']['msg_sender']
        }
        Update: {
          author_id?: string | null
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          needs_team_review?: boolean
          program_id?: string | null
          proposed_action?: Json | null
          review_result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender?: Database['public']['Enums']['msg_sender']
        }
        Relationships: [
          {
            foreignKeyName: 'messages_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'messages_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'messages_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
          {
            foreignKeyName: 'messages_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database['public']['Enums']['msg_channel']
          client_id: string
          dedupe_key: string | null
          error: string | null
          id: string
          kind: string
          payload: NonNullable<Json>
          scheduled_for: string
          sent_at: string | null
          status: string
          template: string | null
        }
        ComputedFields: never
        Insert: {
          channel: Database['public']['Enums']['msg_channel']
          client_id: string
          dedupe_key?: string | null
          error?: string | null
          id?: string
          kind: string
          payload?: NonNullable<Json>
          scheduled_for: string
          sent_at?: string | null
          status?: string
          template?: string | null
        }
        Update: {
          channel?: Database['public']['Enums']['msg_channel']
          client_id?: string
          dedupe_key?: string | null
          error?: string | null
          id?: string
          kind?: string
          payload?: NonNullable<Json>
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
        ]
      }
      payments: {
        Row: {
          amount_rsd: number
          client_id: string
          created_at: string
          id: string
          paid_at: string | null
          program_id: string
          provider: string
          provider_ref: string | null
          status: Database['public']['Enums']['payment_status']
        }
        ComputedFields: never
        Insert: {
          amount_rsd: number
          client_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          program_id: string
          provider: string
          provider_ref?: string | null
          status?: Database['public']['Enums']['payment_status']
        }
        Update: {
          amount_rsd?: number
          client_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          program_id?: string
          provider?: string
          provider_ref?: string | null
          status?: Database['public']['Enums']['payment_status']
        }
        Relationships: [
          {
            foreignKeyName: 'payments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'payments_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          duration_days: number
          id: string
          kind: Database['public']['Enums']['plan_kind']
          name: string
          price_rsd: number
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          duration_days?: number
          id?: string
          kind: Database['public']['Enums']['plan_kind']
          name: string
          price_rsd: number
        }
        Update: {
          active?: boolean
          duration_days?: number
          id?: string
          kind?: Database['public']['Enums']['plan_kind']
          name?: string
          price_rsd?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_channels: Database['public']['Enums']['msg_channel'][]
          role: Database['public']['Enums']['user_role']
          timezone: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_channels?: Database['public']['Enums']['msg_channel'][]
          role?: Database['public']['Enums']['user_role']
          timezone?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_channels?: Database['public']['Enums']['msg_channel'][]
          role?: Database['public']['Enums']['user_role']
          timezone?: string
        }
        Relationships: []
      }
      program_meals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          photo_path: string | null
          plan_day: number
          program_id: string
          recipe: string | null
          slot: Database['public']['Enums']['meal_slot']
          time_of_day: string
          title: string
          valid_from_cycle: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          photo_path?: string | null
          plan_day: number
          program_id: string
          recipe?: string | null
          slot: Database['public']['Enums']['meal_slot']
          time_of_day: string
          title: string
          valid_from_cycle?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          photo_path?: string | null
          plan_day?: number
          program_id?: string
          recipe?: string | null
          slot?: Database['public']['Enums']['meal_slot']
          time_of_day?: string
          title?: string
          valid_from_cycle?: number
        }
        Relationships: [
          {
            foreignKeyName: 'program_meals_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_meals_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'program_meals_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_meals_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
        ]
      }
      programs: {
        Row: {
          activated_at: string | null
          client_id: string
          created_at: string
          duration_days: number
          ended_at: string | null
          exercise_level: Database['public']['Enums']['exercise_level'] | null
          id: string
          intake_id: string | null
          meal_template_id: string | null
          paid_at: string | null
          plan_focus: string | null
          plan_ready_at: string | null
          previous_program_id: string | null
          product_id: string
          status: Database['public']['Enums']['program_status']
          training_weekdays: number[]
        }
        ComputedFields: never
        Insert: {
          activated_at?: string | null
          client_id: string
          created_at?: string
          duration_days?: number
          ended_at?: string | null
          exercise_level?: Database['public']['Enums']['exercise_level'] | null
          id?: string
          intake_id?: string | null
          meal_template_id?: string | null
          paid_at?: string | null
          plan_focus?: string | null
          plan_ready_at?: string | null
          previous_program_id?: string | null
          product_id: string
          status?: Database['public']['Enums']['program_status']
          training_weekdays?: number[]
        }
        Update: {
          activated_at?: string | null
          client_id?: string
          created_at?: string
          duration_days?: number
          ended_at?: string | null
          exercise_level?: Database['public']['Enums']['exercise_level'] | null
          id?: string
          intake_id?: string | null
          meal_template_id?: string | null
          paid_at?: string | null
          plan_focus?: string | null
          plan_ready_at?: string | null
          previous_program_id?: string | null
          product_id?: string
          status?: Database['public']['Enums']['program_status']
          training_weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: 'programs_meal_template_id_fkey'
            columns: ['meal_template_id']
            isOneToOne: false
            referencedRelation: 'meal_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'programs_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'programs_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'programs_intake_id_fkey'
            columns: ['intake_id']
            isOneToOne: false
            referencedRelation: 'intake_surveys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'programs_previous_program_id_fkey'
            columns: ['previous_program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'programs_previous_program_id_fkey'
            columns: ['previous_program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
          {
            foreignKeyName: 'programs_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      progress_photos: {
        Row: {
          angle: string
          created_at: string
          id: string
          program_day: number
          program_id: string
          storage_path: string
        }
        ComputedFields: never
        Insert: {
          angle: string
          created_at?: string
          id?: string
          program_day: number
          program_id: string
          storage_path: string
        }
        Update: {
          angle?: string
          created_at?: string
          id?: string
          program_day?: number
          program_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'progress_photos_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progress_photos_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        ComputedFields: never
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          client_id: string
          meals: boolean
          supplements: boolean
          workout_time: string
          workouts: boolean
        }
        ComputedFields: never
        Insert: {
          client_id: string
          meals?: boolean
          supplements?: boolean
          workout_time?: string
          workouts?: boolean
        }
        Update: {
          client_id?: string
          meals?: boolean
          supplements?: boolean
          workout_time?: string
          workouts?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'reminder_settings_client_id_fkey'
            columns: ['client_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reminder_settings_client_id_fkey'
            columns: ['client_id']
            isOneToOne: true
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
        ]
      }
      supplement_logs: {
        Row: {
          program_day: number
          program_id: string
          supplement_id: string
          taken_at: string
        }
        ComputedFields: never
        Insert: {
          program_day: number
          program_id: string
          supplement_id: string
          taken_at?: string
        }
        Update: {
          program_day?: number
          program_id?: string
          supplement_id?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplement_logs_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplement_logs_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
          {
            foreignKeyName: 'supplement_logs_supplement_id_fkey'
            columns: ['supplement_id']
            isOneToOne: false
            referencedRelation: 'supplements'
            referencedColumns: ['id']
          },
        ]
      }
      supplements: {
        Row: {
          active: boolean
          id: string
          name: string
          note: string | null
          program_id: string
          timing: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          id?: string
          name: string
          note?: string | null
          program_id: string
          timing: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          note?: string | null
          program_id?: string
          timing?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplements_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplements_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
        ]
      }
      team_notes: {
        Row: {
          author_id: string
          body: string
          client_id: string
          created_at: string
          id: string
        }
        ComputedFields: never
        Insert: {
          author_id: string
          body: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_notes_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_notes_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
          {
            foreignKeyName: 'team_notes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_notes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['client_id']
          },
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string
          duration_min: number | null
          id: string
          program_day: number
          program_id: string
          workout_id: string
        }
        ComputedFields: never
        Insert: {
          completed_at?: string
          duration_min?: number | null
          id?: string
          program_day: number
          program_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string
          duration_min?: number | null
          id?: string
          program_day?: number
          program_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_logs_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_logs_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'team_client_overview'
            referencedColumns: ['program_id']
          },
          {
            foreignKeyName: 'workout_logs_workout_id_fkey'
            columns: ['workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      workouts: {
        Row: {
          description: string | null
          duration_min: number
          id: string
          level: Database['public']['Enums']['exercise_level']
          sort_order: number
          title: string
          video_url: string
        }
        ComputedFields: never
        Insert: {
          description?: string | null
          duration_min: number
          id?: string
          level: Database['public']['Enums']['exercise_level']
          sort_order?: number
          title: string
          video_url: string
        }
        Update: {
          description?: string | null
          duration_min?: number
          id?: string
          level?: Database['public']['Enums']['exercise_level']
          sort_order?: number
          title?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      partner_revenue: {
        Row: {
          kind: Database['public']['Enums']['plan_kind'] | null
          month: string | null
          partner_share_rsd: number | null
          revenue_rsd: number | null
          sales: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      team_client_overview: {
        Row: {
          client_id: string | null
          full_name: string | null
          next_feedback_date: string | null
          next_feedback_day: number | null
          pending_review_count: number | null
          plan_focus: string | null
          plan_name: string | null
          program_day: number | null
          product_kind: Database['public']['Enums']['plan_kind'] | null
          program_id: string | null
          program_status: Database['public']['Enums']['program_status'] | null
          team_status: string | null
        }
        ComputedFields: never
        Relationships: []
      }
    }
    Functions: {
      apply_meal_template: {
        Args: { p_program_id: string; p_template_id: string }
        Returns: number
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      get_partner_revenue: {
        Args: Record<PropertyKey, never>
        Returns: {
          kind: Database['public']['Enums']['plan_kind'] | null
          month: string | null
          partner_share_rsd: number | null
          revenue_rsd: number | null
          sales: number | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'partner_revenue'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin_or_partner: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_own_folder: { Args: { p_name: string }; Returns: boolean }
      is_team: { Args: Record<PropertyKey, never>; Returns: boolean }
      owns_program: { Args: { p_id: string }; Returns: boolean }
      plan_cycle: { Args: { p_day: number }; Returns: number }
      plan_day: { Args: { p_day: number }; Returns: number }
      program_day: { Args: { p_activated: string; p_on?: string }; Returns: number }
    }
    Enums: {
      exercise_level: 'beginner' | 'intermediate' | 'advanced'
      feedback_status: 'scheduled' | 'open' | 'submitted' | 'late' | 'answered'
      meal_slot: 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner'
      msg_channel: 'whatsapp' | 'email' | 'app'
      msg_sender: 'client' | 'assistant' | 'team'
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
      plan_kind: 'nutrition' | 'nutrition_training'
      program_status:
        | 'awaiting_payment'
        | 'building_plan'
        | 'ready'
        | 'active'
        | 'ended'
        | 'renewed'
        | 'cancelled'
      user_role: 'client' | 'nutritionist' | 'trainer' | 'admin' | 'partner'
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
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      exercise_level: ['beginner', 'intermediate', 'advanced'],
      feedback_status: ['scheduled', 'open', 'submitted', 'late', 'answered'],
      meal_slot: ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'],
      msg_channel: ['whatsapp', 'email', 'app'],
      msg_sender: ['client', 'assistant', 'team'],
      payment_status: ['pending', 'paid', 'failed', 'refunded'],
      plan_kind: ['nutrition', 'nutrition_training'],
      program_status: [
        'awaiting_payment',
        'building_plan',
        'ready',
        'active',
        'ended',
        'renewed',
        'cancelled',
      ],
      user_role: ['client', 'nutritionist', 'trainer', 'admin', 'partner'],
    },
  },
} as const
