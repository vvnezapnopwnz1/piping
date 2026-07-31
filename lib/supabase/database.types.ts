export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      capabilities: {
        Row: {
          code: string
          description: string
          is_mutating: boolean
          requires_functional_role: boolean
        }
        Insert: {
          code: string
          description: string
          is_mutating: boolean
          requires_functional_role: boolean
        }
        Update: {
          code?: string
          description?: string
          is_mutating?: boolean
          requires_functional_role?: boolean
        }
        Relationships: []
      }
      import_job_issues: {
        Row: {
          code: string
          column_name: string | null
          created_at: string
          id: string
          job_id: string
          message: string
          row_number: number | null
          severity: Database["public"]["Enums"]["import_issue_severity"]
        }
        Insert: {
          code: string
          column_name?: string | null
          created_at?: string
          id?: string
          job_id: string
          message: string
          row_number?: number | null
          severity: Database["public"]["Enums"]["import_issue_severity"]
        }
        Update: {
          code?: string
          column_name?: string | null
          created_at?: string
          id?: string
          job_id?: string
          message?: string
          row_number?: number | null
          severity?: Database["public"]["Enums"]["import_issue_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "import_job_issues_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_job_rows: {
        Row: {
          action: string
          created_at: string
          id: string
          job_id: string
          normalized_values: Json
          raw_values: Json
          row_number: number
          target_entity_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          job_id: string
          normalized_values?: Json
          raw_values: Json
          row_number: number
          target_entity_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          job_id?: string
          normalized_values?: Json
          raw_values?: Json
          row_number?: number
          target_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_job_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          affected_entity_ids: string[]
          applied_at: string | null
          applied_row_count: number
          canceled_at: string | null
          completed_at: string | null
          conflicts_confirmed: boolean
          created_at: string
          failure_reason: string | null
          id: string
          import_type: string
          kind: string | null
          project_id: string
          requested_by: string
          source_checksum: string | null
          source_file_name: string | null
          source_media_type: string | null
          source_size_bytes: number | null
          status: string
          storage_path: string | null
          summary: Json
          validated_at: string | null
        }
        Insert: {
          affected_entity_ids?: string[]
          applied_at?: string | null
          applied_row_count?: number
          canceled_at?: string | null
          completed_at?: string | null
          conflicts_confirmed?: boolean
          created_at?: string
          failure_reason?: string | null
          id?: string
          import_type: string
          kind?: string | null
          project_id: string
          requested_by: string
          source_checksum?: string | null
          source_file_name?: string | null
          source_media_type?: string | null
          source_size_bytes?: number | null
          status: string
          storage_path?: string | null
          summary?: Json
          validated_at?: string | null
        }
        Update: {
          affected_entity_ids?: string[]
          applied_at?: string | null
          applied_row_count?: number
          canceled_at?: string | null
          completed_at?: string | null
          conflicts_confirmed?: boolean
          created_at?: string
          failure_reason?: string | null
          id?: string
          import_type?: string
          kind?: string | null
          project_id?: string
          requested_by?: string
          source_checksum?: string | null
          source_file_name?: string | null
          source_media_type?: string | null
          source_size_bytes?: number | null
          status?: string
          storage_path?: string | null
          summary?: Json
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_pds_area_scopes: {
        Row: {
          membership_id: string
          pds_area_id: string
        }
        Insert: {
          membership_id: string
          pds_area_id: string
        }
        Update: {
          membership_id?: string
          pds_area_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_pds_area_scopes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "project_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_pds_area_scopes_pds_area_id_fkey"
            columns: ["pds_area_id"]
            isOneToOne: false
            referencedRelation: "project_pds_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_subcontractor_scopes: {
        Row: {
          membership_id: string
          subcontractor_id: string
        }
        Insert: {
          membership_id: string
          subcontractor_id: string
        }
        Update: {
          membership_id?: string
          subcontractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_subcontractor_scopes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "project_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_subcontractor_scopes_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      nde_matrix_rules: {
        Row: {
          created_at: string
          ht_coverage: number
          id: string
          material_traceability_required: boolean
          mt_coverage: number
          pmi_coverage: number
          project_id: string
          pt_coverage: number
          pwht_required: boolean
          pwht_thickness_threshold: number | null
          rt_coverage: number
          service_class_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
          ut_coverage: number
          weld_location: string
          weld_type_id: string
        }
        Insert: {
          created_at?: string
          ht_coverage?: number
          id?: string
          material_traceability_required?: boolean
          mt_coverage?: number
          pmi_coverage?: number
          project_id: string
          pt_coverage?: number
          pwht_required?: boolean
          pwht_thickness_threshold?: number | null
          rt_coverage?: number
          service_class_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
          ut_coverage?: number
          weld_location: string
          weld_type_id: string
        }
        Update: {
          created_at?: string
          ht_coverage?: number
          id?: string
          material_traceability_required?: boolean
          mt_coverage?: number
          pmi_coverage?: number
          project_id?: string
          pt_coverage?: number
          pwht_required?: boolean
          pwht_thickness_threshold?: number | null
          rt_coverage?: number
          service_class_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
          ut_coverage?: number
          weld_location?: string
          weld_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nde_matrix_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_matrix_rules_service_class_id_fkey"
            columns: ["service_class_id"]
            isOneToOne: false
            referencedRelation: "project_service_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_matrix_rules_weld_type_id_fkey"
            columns: ["weld_type_id"]
            isOneToOne: false
            referencedRelation: "project_weld_types"
            referencedColumns: ["id"]
          },
        ]
      }
      piping_material_records: {
        Row: {
          created_at: string
          id: string
          ident_code: string
          mrr_number: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          trace_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ident_code: string
          mrr_number: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          trace_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ident_code?: string
          mrr_number?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          trace_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "piping_material_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_platform_admin: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      project_area_classifications: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_area_classifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_area_classifications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "project_units"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assembly_settings: {
        Row: {
          default_subcontractor_id: string | null
          enabled: boolean
          project_id: string
          updated_at: string
        }
        Insert: {
          default_subcontractor_id?: string | null
          enabled?: boolean
          project_id: string
          updated_at?: string
        }
        Update: {
          default_subcontractor_id?: string | null
          enabled?: boolean
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assembly_settings_default_subcontractor_id_fkey"
            columns: ["default_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assembly_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_custom_field_definitions: {
        Row: {
          created_at: string
          data_type: string
          field_key: string
          id: string
          label: string
          project_id: string
          scope: string
          sort_order: number
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_type: string
          field_key: string
          id?: string
          label: string
          project_id: string
          scope: string
          sort_order: number
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_type?: string
          field_key?: string
          id?: string
          label?: string
          project_id?: string
          scope?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_custom_field_definitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_device_users: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          membership_id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          membership_id: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          membership_id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_device_users_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "project_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_device_users_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "project_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_device_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_devices: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_devices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_joint_categories: {
        Row: {
          category_code: string
          coefficient: number | null
          created_at: string
          id: string
          joint_definition: string
          project_id: string
          reason: string
          status: Database["public"]["Enums"]["project_reference_status"]
          timing: string
          updated_at: string
        }
        Insert: {
          category_code: string
          coefficient?: number | null
          created_at?: string
          id?: string
          joint_definition: string
          project_id: string
          reason: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          timing: string
          updated_at?: string
        }
        Update: {
          category_code?: string
          coefficient?: number | null
          created_at?: string
          id?: string
          joint_definition?: string
          project_id?: string
          reason?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          timing?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_joint_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_line_services: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_line_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_location_categories: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_location_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_locations: {
        Row: {
          category_id: string
          code: string
          created_at: string
          description: string
          id: string
          mapped_progress_columns: Json
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string
          description: string
          id?: string
          mapped_progress_columns?: Json
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          mapped_progress_columns?: Json
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_locations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_location_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_membership_functional_roles: {
        Row: {
          created_at: string
          membership_id: string
          role_code: string
        }
        Insert: {
          created_at?: string
          membership_id: string
          role_code: string
        }
        Update: {
          created_at?: string
          membership_id?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_membership_functional_roles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "project_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_membership_functional_roles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      project_memberships: {
        Row: {
          access_role_code: string
          created_at: string
          id: string
          is_active: boolean
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_role_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_role_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_access_role_code_fkey"
            columns: ["access_role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_paint_matrix_rules: {
        Row: {
          blasting_required: boolean
          created_at: string
          final_coat_count: number
          id: string
          intermediate_coat_count: number
          line_service_id: string
          primer_required: boolean
          project_id: string
          ral_code_id: string
          required_final_dft_microns: number
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          blasting_required: boolean
          created_at?: string
          final_coat_count: number
          id?: string
          intermediate_coat_count: number
          line_service_id: string
          primer_required: boolean
          project_id: string
          ral_code_id: string
          required_final_dft_microns: number
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          blasting_required?: boolean
          created_at?: string
          final_coat_count?: number
          id?: string
          intermediate_coat_count?: number
          line_service_id?: string
          primer_required?: boolean
          project_id?: string
          ral_code_id?: string
          required_final_dft_microns?: number
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_paint_matrix_rules_line_service_id_fkey"
            columns: ["line_service_id"]
            isOneToOne: false
            referencedRelation: "project_line_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_paint_matrix_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_paint_matrix_rules_ral_code_id_fkey"
            columns: ["ral_code_id"]
            isOneToOne: false
            referencedRelation: "project_ral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pds_areas: {
        Row: {
          area_classification_id: string | null
          assembly_subcontractor_id: string | null
          code: string
          created_at: string
          custom_values: Json
          description: string
          environment: Database["public"]["Enums"]["area_environment"] | null
          field_subcontractor_id: string | null
          id: string
          is_rack: boolean | null
          is_unit: boolean | null
          project_id: string
          shop_subcontractor_id: string | null
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          area_classification_id?: string | null
          assembly_subcontractor_id?: string | null
          code: string
          created_at?: string
          custom_values?: Json
          description: string
          environment?: Database["public"]["Enums"]["area_environment"] | null
          field_subcontractor_id?: string | null
          id?: string
          is_rack?: boolean | null
          is_unit?: boolean | null
          project_id: string
          shop_subcontractor_id?: string | null
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          area_classification_id?: string | null
          assembly_subcontractor_id?: string | null
          code?: string
          created_at?: string
          custom_values?: Json
          description?: string
          environment?: Database["public"]["Enums"]["area_environment"] | null
          field_subcontractor_id?: string | null
          id?: string
          is_rack?: boolean | null
          is_unit?: boolean | null
          project_id?: string
          shop_subcontractor_id?: string | null
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_pds_areas_area_classification_id_fkey"
            columns: ["area_classification_id"]
            isOneToOne: false
            referencedRelation: "project_area_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_pds_areas_assembly_subcontractor_id_fkey"
            columns: ["assembly_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_pds_areas_field_subcontractor_id_fkey"
            columns: ["field_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_pds_areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_pds_areas_shop_subcontractor_id_fkey"
            columns: ["shop_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pressure_units: {
        Row: {
          project_id: string
          unit: Database["public"]["Enums"]["pressure_unit"]
          updated_at: string
        }
        Insert: {
          project_id: string
          unit: Database["public"]["Enums"]["pressure_unit"]
          updated_at?: string
        }
        Update: {
          project_id?: string
          unit?: Database["public"]["Enums"]["pressure_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_pressure_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress_weights: {
        Row: {
          activity: string
          created_at: string
          id: string
          phase: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
          weight: number
        }
        Insert: {
          activity: string
          created_at?: string
          id?: string
          phase: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
          weight: number
        }
        Update: {
          activity?: string
          created_at?: string
          id?: string
          phase?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_weights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_ral_codes: {
        Row: {
          color_code: string
          created_at: string
          id: string
          line_service_id: string
          project_id: string
          ral_code: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          color_code: string
          created_at?: string
          id?: string
          line_service_id: string
          project_id: string
          ral_code: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          color_code?: string
          created_at?: string
          id?: string
          line_service_id?: string
          project_id?: string
          ral_code?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_ral_codes_line_service_id_fkey"
            columns: ["line_service_id"]
            isOneToOne: false
            referencedRelation: "project_line_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_ral_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_rework_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_rework_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_service_classes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          material_type_id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          material_type_id: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          material_type_id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_service_classes_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "system_reference_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_classes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_spooling_checklist_items: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_required: boolean
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          is_required?: boolean
          project_id: string
          sort_order: number
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_required?: boolean
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_spooling_checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_spooling_material_classes: {
        Row: {
          created_at: string
          external_class_code: string
          id: string
          material_type_id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_class_code: string
          id?: string
          material_type_id: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_class_code?: string
          id?: string
          material_type_id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_spooling_material_classes_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "project_spooling_material_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_spooling_material_classes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_spooling_material_types: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_spooling_material_types_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subcontractors: {
        Row: {
          code: string
          contact_details: string | null
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          contact_details?: string | null
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          contact_details?: string | null
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subsystems: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          system_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          system_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_subsystems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_subsystems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "project_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      project_systems: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_teams: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          team_type: Database["public"]["Enums"]["team_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          team_type: Database["public"]["Enums"]["team_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          team_type?: Database["public"]["Enums"]["team_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_thickness_flange_rules: {
        Row: {
          created_at: string
          diameter_inch: number
          flange_rating: string
          id: string
          project_id: string
          service_class_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          thickness_mm: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          diameter_inch: number
          flange_rating: string
          id?: string
          project_id: string
          service_class_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          thickness_mm: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          diameter_inch?: number
          flange_rating?: string
          id?: string
          project_id?: string
          service_class_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          thickness_mm?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_thickness_flange_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_thickness_flange_rules_service_class_id_fkey"
            columns: ["service_class_id"]
            isOneToOne: false
            referencedRelation: "project_service_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_unit_time_references: {
        Row: {
          activity: string
          created_at: string
          id: string
          project_id: string
          project_ut: number
          standard_reference: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          activity: string
          created_at?: string
          id?: string
          project_id: string
          project_ut: number
          standard_reference: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          activity?: string
          created_at?: string
          id?: string
          project_id?: string
          project_ut?: number
          standard_reference?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_unit_time_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_units: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_weld_types: {
        Row: {
          code: string
          counts_in_dia_inch: boolean
          created_at: string
          description: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          code: string
          counts_in_dia_inch?: boolean
          created_at?: string
          description: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          counts_in_dia_inch?: boolean
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_weld_types_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_welding_procedures: {
        Row: {
          approved_on: string
          code: string
          created_at: string
          description: string | null
          diameter_from: number
          diameter_to: number
          id: string
          material_type_id: string
          process: string
          project_id: string
          revision: string
          status: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_id: string
          thickness_from: number
          thickness_to: number
          updated_at: string
        }
        Insert: {
          approved_on: string
          code: string
          created_at?: string
          description?: string | null
          diameter_from: number
          diameter_to: number
          id?: string
          material_type_id: string
          process: string
          project_id: string
          revision: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_id: string
          thickness_from: number
          thickness_to: number
          updated_at?: string
        }
        Update: {
          approved_on?: string
          code?: string
          created_at?: string
          description?: string | null
          diameter_from?: number
          diameter_to?: number
          id?: string
          material_type_id?: string
          process?: string
          project_id?: string
          revision?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_id?: string
          thickness_from?: number
          thickness_to?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_welding_procedures_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "system_reference_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_welding_procedures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_welding_procedures_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          activity_code: string
          contract_number: string | null
          contractor_logo_path: string | null
          contractor_name: string
          created_at: string
          created_by: string
          id: string
          maximum_transit_time_days: number
          owner_logo_path: string | null
          owner_name: string
          status: Database["public"]["Enums"]["project_reference_status"]
          title: string
          updated_at: string
        }
        Insert: {
          activity_code: string
          contract_number?: string | null
          contractor_logo_path?: string | null
          contractor_name: string
          created_at?: string
          created_by: string
          id?: string
          maximum_transit_time_days: number
          owner_logo_path?: string | null
          owner_name: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          title: string
          updated_at?: string
        }
        Update: {
          activity_code?: string
          contract_number?: string | null
          contractor_logo_path?: string | null
          contractor_name?: string
          created_at?: string
          created_by?: string
          id?: string
          maximum_transit_time_days?: number
          owner_logo_path?: string | null
          owner_name?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_capabilities: {
        Row: {
          capability_code: string
          role_code: string
        }
        Insert: {
          capability_code: string
          role_code: string
        }
        Update: {
          capability_code?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_capabilities_capability_code_fkey"
            columns: ["capability_code"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_capabilities_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      roles: {
        Row: {
          bypasses_functional_gate: boolean
          code: string
          created_at: string
          is_active: boolean
          kind: Database["public"]["Enums"]["role_kind"]
          label: string
        }
        Insert: {
          bypasses_functional_gate?: boolean
          code: string
          created_at?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["role_kind"]
          label: string
        }
        Update: {
          bypasses_functional_gate?: boolean
          code?: string
          created_at?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["role_kind"]
          label?: string
        }
        Relationships: []
      }
      system_film_quantity_rules: {
        Row: {
          created_at: string
          diameter_from_inch: number
          diameter_to_inch: number
          film_count: number
          id: string
          thickness_from_mm: number
          thickness_to_mm: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          diameter_from_inch: number
          diameter_to_inch: number
          film_count: number
          id?: string
          thickness_from_mm: number
          thickness_to_mm: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          diameter_from_inch?: number
          diameter_to_inch?: number
          film_count?: number
          id?: string
          thickness_from_mm?: number
          thickness_to_mm?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_reference_entries: {
        Row: {
          attributes: Json
          code: string
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["system_reference_kind"]
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
        }
        Insert: {
          attributes?: Json
          code: string
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["system_reference_kind"]
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Update: {
          attributes?: Json
          code?: string
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["system_reference_kind"]
          status?: Database["public"]["Enums"]["project_reference_status"]
          updated_at?: string
        }
        Relationships: []
      }
      system_ut_calculation_rules: {
        Row: {
          coefficient_diameter: number
          coefficient_rating: number
          created_at: string
          diameter_from_inch: number
          diameter_to_inch: number
          id: string
          updated_at: string
        }
        Insert: {
          coefficient_diameter: number
          coefficient_rating: number
          created_at?: string
          diameter_from_inch: number
          diameter_to_inch: number
          id?: string
          updated_at?: string
        }
        Update: {
          coefficient_diameter?: number
          coefficient_rating?: number
          created_at?: string
          diameter_from_inch?: number
          diameter_to_inch?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      welder_qualifications: {
        Row: {
          certificate_number: string | null
          created_at: string
          expires_on: string
          full_name: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_id: string
          updated_at: string
          welder_code: string
        }
        Insert: {
          certificate_number?: string | null
          created_at?: string
          expires_on: string
          full_name: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_id: string
          updated_at?: string
          welder_code: string
        }
        Update: {
          certificate_number?: string | null
          created_at?: string
          expires_on?: string
          full_name?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_id?: string
          updated_at?: string
          welder_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "welder_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welder_qualifications_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      welder_wps_qualifications: {
        Row: {
          welder_qualification_id: string
          wps_id: string
        }
        Insert: {
          welder_qualification_id: string
          wps_id: string
        }
        Update: {
          welder_qualification_id?: string
          wps_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "welder_wps_qualifications_welder_qualification_id_fkey"
            columns: ["welder_qualification_id"]
            isOneToOne: false
            referencedRelation: "welder_qualifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welder_wps_qualifications_wps_id_fkey"
            columns: ["wps_id"]
            isOneToOne: false
            referencedRelation: "project_welding_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_project_member_by_email: {
        Args: {
          requested_access_role: string
          requested_functional_roles: string[]
          requested_pds_area_ids: string[]
          requested_subcontractor_ids: string[]
          target_email: string
          target_project_id: string
        }
        Returns: {
          access_role_code: string
          created_at: string
          id: string
          is_active: boolean
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "project_memberships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apply_import_job: {
        Args: { confirm_conflicts?: boolean; target_job_id: string }
        Returns: {
          affected_entity_ids: string[]
          applied_at: string | null
          applied_row_count: number
          canceled_at: string | null
          completed_at: string | null
          conflicts_confirmed: boolean
          created_at: string
          failure_reason: string | null
          id: string
          import_type: string
          kind: string | null
          project_id: string
          requested_by: string
          source_checksum: string | null
          source_file_name: string | null
          source_media_type: string | null
          source_size_bytes: number | null
          status: string
          storage_path: string | null
          summary: Json
          validated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "import_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_access_request_is_valid: {
        Args: {
          requested_access_role: string
          requested_functional_roles: string[]
          requested_pds_area_ids: string[]
          requested_subcontractor_ids: string[]
          target_project_id: string
        }
        Returns: undefined
      }
      can_administer_project: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      cancel_import_job: {
        Args: { target_job_id: string }
        Returns: {
          affected_entity_ids: string[]
          applied_at: string | null
          applied_row_count: number
          canceled_at: string | null
          completed_at: string | null
          conflicts_confirmed: boolean
          created_at: string
          failure_reason: string | null
          id: string
          import_type: string
          kind: string | null
          project_id: string
          requested_by: string
          source_checksum: string | null
          source_file_name: string | null
          source_media_type: string | null
          source_size_bytes: number | null
          status: string
          storage_path: string | null
          summary: Json
          validated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "import_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compatibility_membership_role: {
        Args: {
          requested_access_role: string
          requested_functional_roles: string[]
        }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      create_import_job: {
        Args: {
          checksum: string
          file_name: string
          media_type: string
          requested_import_type: string
          size_bytes: number
          target_project_id: string
        }
        Returns: {
          affected_entity_ids: string[]
          applied_at: string | null
          applied_row_count: number
          canceled_at: string | null
          completed_at: string | null
          conflicts_confirmed: boolean
          created_at: string
          failure_reason: string | null
          id: string
          import_type: string
          kind: string | null
          project_id: string
          requested_by: string
          source_checksum: string | null
          source_file_name: string | null
          source_media_type: string | null
          source_size_bytes: number | null
          status: string
          storage_path: string | null
          summary: Json
          validated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "import_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_has_capability: {
        Args: { requested_capability: string; target_project_id: string }
        Returns: boolean
      }
      current_user_has_global_capability: {
        Args: { requested_capability: string }
        Returns: boolean
      }
      current_user_in_pds_scope: {
        Args: { target_pds_area_id: string; target_project_id: string }
        Returns: boolean
      }
      current_user_in_subcontractor_scope: {
        Args: { target_project_id: string; target_subcontractor_id: string }
        Returns: boolean
      }
      get_project_access_matrix: {
        Args: { target_project_id: string }
        Returns: {
          access_role_code: string
          email: string
          full_name: string
          functional_role_codes: string[]
          is_active: boolean
          membership_id: string
          pds_area_ids: string[]
          subcontractor_ids: string[]
          user_id: string
        }[]
      }
      get_project_setup_readiness: {
        Args: { target_project_id: string }
        Returns: {
          admin_complete: boolean
          missing_codes: string[]
          ready_for_import: boolean
        }[]
      }
      has_project_access: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      legacy_access_role: {
        Args: { legacy_role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      legacy_functional_role: {
        Args: { legacy_role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      list_current_user_projects: {
        Args: never
        Returns: {
          access_role_code: string
          activity_code: string
          capability_codes: string[]
          functional_role_codes: string[]
          is_platform_admin: boolean
          membership_id: string
          pds_area_ids: string[]
          project_id: string
          project_status: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_ids: string[]
          title: string
        }[]
      }
      mark_import_job_uploaded: {
        Args: { object_path: string; target_job_id: string }
        Returns: {
          affected_entity_ids: string[]
          applied_at: string | null
          applied_row_count: number
          canceled_at: string | null
          completed_at: string | null
          conflicts_confirmed: boolean
          created_at: string
          failure_reason: string | null
          id: string
          import_type: string
          kind: string | null
          project_id: string
          requested_by: string
          source_checksum: string | null
          source_file_name: string | null
          source_media_type: string | null
          source_size_bytes: number | null
          status: string
          storage_path: string | null
          summary: Json
          validated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "import_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      membership_access_state: {
        Args: { target_membership_id: string }
        Returns: Json
      }
      record_import_validation: {
        Args: { parsed_issues: Json; parsed_rows: Json; target_job_id: string }
        Returns: {
          affected_entity_ids: string[]
          applied_at: string | null
          applied_row_count: number
          canceled_at: string | null
          completed_at: string | null
          conflicts_confirmed: boolean
          created_at: string
          failure_reason: string | null
          id: string
          import_type: string
          kind: string | null
          project_id: string
          requested_by: string
          source_checksum: string | null
          source_file_name: string | null
          source_media_type: string | null
          source_size_bytes: number | null
          status: string
          storage_path: string | null
          summary: Json
          validated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "import_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revalidate_import_job: {
        Args: { target_job_id: string }
        Returns: {
          blocker_count: number
          conflict_count: number
        }[]
      }
      save_welder_qualification: {
        Args: {
          target_project_id: string
          target_welder_id?: string
          target_wps_ids?: string[]
          welder_payload?: Json
        }
        Returns: {
          certificate_number: string | null
          created_at: string
          expires_on: string
          full_name: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          subcontractor_id: string
          updated_at: string
          welder_code: string
        }
        SetofOptions: {
          from: "*"
          to: "welder_qualifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_project_member_active: {
        Args: { requested_active: boolean; target_membership_id: string }
        Returns: {
          access_role_code: string
          created_at: string
          id: string
          is_active: boolean
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "project_memberships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_project_progress_weights: {
        Args: {
          target_phase: string
          target_project_id: string
          weight_items: Json
        }
        Returns: {
          activity: string
          created_at: string
          id: string
          phase: string
          project_id: string
          status: Database["public"]["Enums"]["project_reference_status"]
          updated_at: string
          weight: number
        }[]
        SetofOptions: {
          from: "*"
          to: "project_progress_weights"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      storage_path_project_id: {
        Args: { object_name: string }
        Returns: string
      }
      update_project_member_access: {
        Args: {
          requested_access_role: string
          requested_functional_roles: string[]
          requested_pds_area_ids: string[]
          requested_subcontractor_ids: string[]
          target_membership_id: string
        }
        Returns: {
          access_role_code: string
          created_at: string
          id: string
          is_active: boolean
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "project_memberships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role:
        | "system_admin"
        | "project_manager"
        | "qc_engineer"
        | "nde_inspector"
        | "spooling_team"
        | "subcontractor"
      area_environment: "above_ground" | "underground"
      import_issue_severity: "blocker" | "conflict" | "warning"
      ndt_method: "rt" | "ut" | "mt" | "pt" | "pmi" | "ht" | "vt"
      pressure_unit: "bar" | "psi"
      project_reference_status: "active" | "inactive" | "archived"
      role_kind: "access" | "functional"
      system_reference_kind:
        | "material_type"
        | "film_quantity"
        | "ut_calculation"
        | "torquing_requirement"
      team_type:
        | "line_check"
        | "blinding"
        | "finishing"
        | "reinstatement"
        | "jointer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "system_admin",
        "project_manager",
        "qc_engineer",
        "nde_inspector",
        "spooling_team",
        "subcontractor",
      ],
      area_environment: ["above_ground", "underground"],
      import_issue_severity: ["blocker", "conflict", "warning"],
      ndt_method: ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"],
      pressure_unit: ["bar", "psi"],
      project_reference_status: ["active", "inactive", "archived"],
      role_kind: ["access", "functional"],
      system_reference_kind: [
        "material_type",
        "film_quantity",
        "ut_calculation",
        "torquing_requirement",
      ],
      team_type: [
        "line_check",
        "blinding",
        "finishing",
        "reinstatement",
        "jointer",
      ],
    },
  },
} as const

