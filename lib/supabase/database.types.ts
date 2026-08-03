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
      command_receipts: {
        Row: {
          actor_id: string | null
          command_name: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          project_id: string
          result: Json | null
        }
        Insert: {
          actor_id?: string | null
          command_name: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          project_id: string
          result?: Json | null
        }
        Update: {
          actor_id?: string | null
          command_name?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          project_id?: string
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "command_receipts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_progress_events: {
        Row: {
          actor_id: string | null
          compensates_event_id: string | null
          created_at: string
          id: string
          occurred_on: string
          payload: Json
          phase: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          source: string
          spool_revision_id: string
          stage: Database["public"]["Enums"]["construction_stage"]
        }
        Insert: {
          actor_id?: string | null
          compensates_event_id?: string | null
          created_at?: string
          id?: string
          occurred_on: string
          payload?: Json
          phase: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          source?: string
          spool_revision_id: string
          stage: Database["public"]["Enums"]["construction_stage"]
        }
        Update: {
          actor_id?: string | null
          compensates_event_id?: string | null
          created_at?: string
          id?: string
          occurred_on?: string
          payload?: Json
          phase?: Database["public"]["Enums"]["construction_phase"]
          project_id?: string
          source?: string
          spool_revision_id?: string
          stage?: Database["public"]["Enums"]["construction_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "construction_progress_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_compensates_event_id_fkey"
            columns: ["compensates_event_id"]
            isOneToOne: false
            referencedRelation: "construction_progress_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_compensates_event_id_fkey"
            columns: ["compensates_event_id"]
            isOneToOne: false
            referencedRelation: "spool_stage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      flange_joint_revisions: {
        Row: {
          bolt_quantity: number | null
          bolt_size: string | null
          created_at: string
          diameter_inch: number | null
          flange_joint_id: string
          flange_rating: string | null
          id: string
          is_removed: boolean
          joint_type: string | null
          spool_revision_id: string
        }
        Insert: {
          bolt_quantity?: number | null
          bolt_size?: string | null
          created_at?: string
          diameter_inch?: number | null
          flange_joint_id: string
          flange_rating?: string | null
          id?: string
          is_removed?: boolean
          joint_type?: string | null
          spool_revision_id: string
        }
        Update: {
          bolt_quantity?: number | null
          bolt_size?: string | null
          created_at?: string
          diameter_inch?: number | null
          flange_joint_id?: string
          flange_rating?: string | null
          id?: string
          is_removed?: boolean
          joint_type?: string | null
          spool_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flange_joint_revisions_flange_joint_id_fkey"
            columns: ["flange_joint_id"]
            isOneToOne: false
            referencedRelation: "flange_joints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flange_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "flange_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "flange_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      flange_joints: {
        Row: {
          created_at: string
          flange_number: string
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          flange_number: string
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string
          flange_number?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flange_joints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_files: {
        Row: {
          checksum: string | null
          file_name: string
          file_role: Database["public"]["Enums"]["spoolgen_file_role"]
          id: string
          job_id: string
          media_type: string | null
          size_bytes: number
          storage_path: string | null
          uploaded_at: string
        }
        Insert: {
          checksum?: string | null
          file_name: string
          file_role: Database["public"]["Enums"]["spoolgen_file_role"]
          id?: string
          job_id: string
          media_type?: string | null
          size_bytes: number
          storage_path?: string | null
          uploaded_at?: string
        }
        Update: {
          checksum?: string | null
          file_name?: string
          file_role?: Database["public"]["Enums"]["spoolgen_file_role"]
          id?: string
          job_id?: string
          media_type?: string | null
          size_bytes?: number
          storage_path?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
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
      import_revision_decisions: {
        Row: {
          comment: string | null
          decided_at: string
          decided_by: string | null
          decision: Database["public"]["Enums"]["revision_decision"]
          entity_key: string
          entity_type: Database["public"]["Enums"]["engineering_entity_type"]
          id: string
          iso_number: string
          job_id: string
        }
        Insert: {
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          decision: Database["public"]["Enums"]["revision_decision"]
          entity_key: string
          entity_type: Database["public"]["Enums"]["engineering_entity_type"]
          id?: string
          iso_number: string
          job_id: string
        }
        Update: {
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["revision_decision"]
          entity_key?: string
          entity_type?: Database["public"]["Enums"]["engineering_entity_type"]
          id?: string
          iso_number?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_revision_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_revision_decisions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      isometric_revisions: {
        Row: {
          accepted_at: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          isometric_id: string
          line_number: string | null
          pds_area_id: string | null
          revision_number: string
          revision_ordinal: number
          service_class_id: string | null
          sheet_number: string | null
          source_import_job_id: string | null
          status: Database["public"]["Enums"]["revision_status"]
          superseded_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          isometric_id: string
          line_number?: string | null
          pds_area_id?: string | null
          revision_number: string
          revision_ordinal: number
          service_class_id?: string | null
          sheet_number?: string | null
          source_import_job_id?: string | null
          status?: Database["public"]["Enums"]["revision_status"]
          superseded_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          isometric_id?: string
          line_number?: string | null
          pds_area_id?: string | null
          revision_number?: string
          revision_ordinal?: number
          service_class_id?: string | null
          sheet_number?: string | null
          source_import_job_id?: string | null
          status?: Database["public"]["Enums"]["revision_status"]
          superseded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "isometric_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometric_revisions_isometric_id_fkey"
            columns: ["isometric_id"]
            isOneToOne: false
            referencedRelation: "isometrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometric_revisions_pds_area_id_fkey"
            columns: ["pds_area_id"]
            isOneToOne: false
            referencedRelation: "project_pds_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometric_revisions_service_class_id_fkey"
            columns: ["service_class_id"]
            isOneToOne: false
            referencedRelation: "project_service_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometric_revisions_source_import_job_id_fkey"
            columns: ["source_import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      isometrics: {
        Row: {
          created_at: string
          id: string
          iso_number: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          iso_number: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          iso_number?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "isometrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      laydown_records: {
        Row: {
          created_at: string
          id: string
          location_id: string
          project_id: string
          receipt_id: string | null
          recorded_by: string | null
          spool_revision_id: string
          stored_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          project_id: string
          receipt_id?: string | null
          recorded_by?: string | null
          spool_revision_id: string
          stored_on: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          project_id?: string
          receipt_id?: string | null
          recorded_by?: string | null
          spool_revision_id?: string
          stored_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "laydown_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "project_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laydown_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laydown_records_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laydown_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laydown_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "laydown_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "laydown_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      material_check_items: {
        Row: {
          checked_quantity: number | null
          created_at: string
          id: string
          material_check_record_id: string
          piping_material_record_id: string
          spool_revision_material_id: string
        }
        Insert: {
          checked_quantity?: number | null
          created_at?: string
          id?: string
          material_check_record_id: string
          piping_material_record_id: string
          spool_revision_material_id: string
        }
        Update: {
          checked_quantity?: number | null
          created_at?: string
          id?: string
          material_check_record_id?: string
          piping_material_record_id?: string
          spool_revision_material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_check_items_material_check_record_id_fkey"
            columns: ["material_check_record_id"]
            isOneToOne: false
            referencedRelation: "material_check_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_check_items_piping_material_record_id_fkey"
            columns: ["piping_material_record_id"]
            isOneToOne: false
            referencedRelation: "piping_material_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_check_items_spool_revision_material_id_fkey"
            columns: ["spool_revision_material_id"]
            isOneToOne: false
            referencedRelation: "spool_revision_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_check_records: {
        Row: {
          checked_by: string | null
          checked_on: string
          command_receipt_id: string | null
          created_at: string
          id: string
          project_id: string
          qc13_form_id: string | null
          spool_revision_id: string
          updated_at: string
        }
        Insert: {
          checked_by?: string | null
          checked_on: string
          command_receipt_id?: string | null
          created_at?: string
          id?: string
          project_id: string
          qc13_form_id?: string | null
          spool_revision_id: string
          updated_at?: string
        }
        Update: {
          checked_by?: string | null
          checked_on?: string
          command_receipt_id?: string | null
          created_at?: string
          id?: string
          project_id?: string
          qc13_form_id?: string | null
          spool_revision_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_check_records_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_check_records_command_receipt_id_fkey"
            columns: ["command_receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_check_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_check_records_qc13_form_id_fkey"
            columns: ["qc13_form_id"]
            isOneToOne: false
            referencedRelation: "qc13_progress_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_check_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "material_check_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "material_check_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_revisions"
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
      nde_batch_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          obligation_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          obligation_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          obligation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nde_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "nde_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_batch_items_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: true
            referencedRelation: "nde_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      nde_batches: {
        Row: {
          batch_number: string
          category_code: string
          closed_on: string | null
          created_at: string
          created_by: string | null
          id: string
          issued_on: string | null
          method: Database["public"]["Enums"]["ndt_method"]
          ndt_subcontractor_id: string | null
          project_id: string
          receipt_id: string | null
          report_number: string | null
          responsible_welder_qualification_id: string | null
          returned_on: string | null
          status: string
        }
        Insert: {
          batch_number: string
          category_code: string
          closed_on?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issued_on?: string | null
          method: Database["public"]["Enums"]["ndt_method"]
          ndt_subcontractor_id?: string | null
          project_id: string
          receipt_id?: string | null
          report_number?: string | null
          responsible_welder_qualification_id?: string | null
          returned_on?: string | null
          status?: string
        }
        Update: {
          batch_number?: string
          category_code?: string
          closed_on?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          issued_on?: string | null
          method?: Database["public"]["Enums"]["ndt_method"]
          ndt_subcontractor_id?: string | null
          project_id?: string
          receipt_id?: string | null
          report_number?: string | null
          responsible_welder_qualification_id?: string | null
          returned_on?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nde_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_batches_ndt_subcontractor_id_fkey"
            columns: ["ndt_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_batches_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_batches_responsible_welder_qualification_id_fkey"
            columns: ["responsible_welder_qualification_id"]
            isOneToOne: false
            referencedRelation: "welder_qualifications"
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
      nde_obligations: {
        Row: {
          category_code: string
          created_at: string
          cycle_kind: string
          cycle_ordinal: number
          disposition: string
          id: string
          method: Database["public"]["Enums"]["ndt_method"]
          parent_obligation_id: string | null
          project_id: string
          required_coverage: number
          responsible_welder_qualification_id: string | null
          satisfied_at: string | null
          satisfied_by: string | null
          selection_mode: string
          source_matrix_rule_id: string | null
          spool_revision_id: string
          weld_joint_revision_id: string
        }
        Insert: {
          category_code?: string
          created_at?: string
          cycle_kind?: string
          cycle_ordinal?: number
          disposition?: string
          id?: string
          method: Database["public"]["Enums"]["ndt_method"]
          parent_obligation_id?: string | null
          project_id: string
          required_coverage: number
          responsible_welder_qualification_id?: string | null
          satisfied_at?: string | null
          satisfied_by?: string | null
          selection_mode: string
          source_matrix_rule_id?: string | null
          spool_revision_id: string
          weld_joint_revision_id: string
        }
        Update: {
          category_code?: string
          created_at?: string
          cycle_kind?: string
          cycle_ordinal?: number
          disposition?: string
          id?: string
          method?: Database["public"]["Enums"]["ndt_method"]
          parent_obligation_id?: string | null
          project_id?: string
          required_coverage?: number
          responsible_welder_qualification_id?: string | null
          satisfied_at?: string | null
          satisfied_by?: string | null
          selection_mode?: string
          source_matrix_rule_id?: string | null
          spool_revision_id?: string
          weld_joint_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nde_obligations_parent_obligation_id_fkey"
            columns: ["parent_obligation_id"]
            isOneToOne: false
            referencedRelation: "nde_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_obligations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_obligations_responsible_welder_qualification_id_fkey"
            columns: ["responsible_welder_qualification_id"]
            isOneToOne: false
            referencedRelation: "welder_qualifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_obligations_satisfied_by_fkey"
            columns: ["satisfied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_obligations_source_matrix_rule_id_fkey"
            columns: ["source_matrix_rule_id"]
            isOneToOne: false
            referencedRelation: "nde_matrix_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_obligations_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "nde_obligations_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "nde_obligations_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_obligations_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: false
            referencedRelation: "weld_joint_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_obligations_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: false
            referencedRelation: "weld_progress_summary"
            referencedColumns: ["weld_joint_revision_id"]
          },
        ]
      }
      nde_penalty_population_members: {
        Row: {
          created_at: string
          id: string
          penalty_population_id: string
          weld_joint_revision_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          penalty_population_id: string
          weld_joint_revision_id: string
        }
        Update: {
          created_at?: string
          id?: string
          penalty_population_id?: string
          weld_joint_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nde_penalty_population_members_penalty_population_id_fkey"
            columns: ["penalty_population_id"]
            isOneToOne: false
            referencedRelation: "nde_penalty_populations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_penalty_population_members_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: false
            referencedRelation: "weld_joint_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_penalty_population_members_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: false
            referencedRelation: "weld_progress_summary"
            referencedColumns: ["weld_joint_revision_id"]
          },
        ]
      }
      nde_penalty_populations: {
        Row: {
          category_code: string
          created_at: string
          id: string
          project_id: string
          snapshot_taken_at: string
          triggered_by_obligation_id: string | null
          welder_qualification_id: string
        }
        Insert: {
          category_code: string
          created_at?: string
          id?: string
          project_id: string
          snapshot_taken_at?: string
          triggered_by_obligation_id?: string | null
          welder_qualification_id: string
        }
        Update: {
          category_code?: string
          created_at?: string
          id?: string
          project_id?: string
          snapshot_taken_at?: string
          triggered_by_obligation_id?: string | null
          welder_qualification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nde_penalty_populations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_penalty_populations_triggered_by_obligation_id_fkey"
            columns: ["triggered_by_obligation_id"]
            isOneToOne: false
            referencedRelation: "nde_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_penalty_populations_welder_qualification_id_fkey"
            columns: ["welder_qualification_id"]
            isOneToOne: false
            referencedRelation: "welder_qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      nde_results: {
        Row: {
          batch_item_id: string | null
          comment: string | null
          created_at: string
          defect_rework_code_id: string | null
          examined_on: string
          id: string
          obligation_id: string
          outcome: string
          project_id: string
          receipt_id: string | null
          recorded_by: string | null
          report_number: string | null
          responsible_welder_qualification_id: string | null
        }
        Insert: {
          batch_item_id?: string | null
          comment?: string | null
          created_at?: string
          defect_rework_code_id?: string | null
          examined_on: string
          id?: string
          obligation_id: string
          outcome: string
          project_id: string
          receipt_id?: string | null
          recorded_by?: string | null
          report_number?: string | null
          responsible_welder_qualification_id?: string | null
        }
        Update: {
          batch_item_id?: string | null
          comment?: string | null
          created_at?: string
          defect_rework_code_id?: string | null
          examined_on?: string
          id?: string
          obligation_id?: string
          outcome?: string
          project_id?: string
          receipt_id?: string | null
          recorded_by?: string | null
          report_number?: string | null
          responsible_welder_qualification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nde_results_batch_item_id_fkey"
            columns: ["batch_item_id"]
            isOneToOne: false
            referencedRelation: "nde_batch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_results_defect_rework_code_id_fkey"
            columns: ["defect_rework_code_id"]
            isOneToOne: false
            referencedRelation: "project_rework_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_results_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: true
            referencedRelation: "nde_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_results_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_results_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nde_results_responsible_welder_qualification_id_fkey"
            columns: ["responsible_welder_qualification_id"]
            isOneToOne: false
            referencedRelation: "welder_qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      paint_progress_records: {
        Row: {
          blasting_on: string | null
          created_at: string
          final_coats: number | null
          final_qc_on: string | null
          id: string
          intermediate_coats: number | null
          line_service_id: string
          measured_dft_microns: number | null
          paint_matrix_rule_id: string
          painted_on: string | null
          primer_on: string | null
          project_id: string
          ral_code_id: string
          receipt_id: string | null
          recorded_by: string | null
          required_final_dft_microns: number
          spool_revision_id: string
          updated_at: string
          w10p_form_number: string | null
        }
        Insert: {
          blasting_on?: string | null
          created_at?: string
          final_coats?: number | null
          final_qc_on?: string | null
          id?: string
          intermediate_coats?: number | null
          line_service_id: string
          measured_dft_microns?: number | null
          paint_matrix_rule_id: string
          painted_on?: string | null
          primer_on?: string | null
          project_id: string
          ral_code_id: string
          receipt_id?: string | null
          recorded_by?: string | null
          required_final_dft_microns: number
          spool_revision_id: string
          updated_at?: string
          w10p_form_number?: string | null
        }
        Update: {
          blasting_on?: string | null
          created_at?: string
          final_coats?: number | null
          final_qc_on?: string | null
          id?: string
          intermediate_coats?: number | null
          line_service_id?: string
          measured_dft_microns?: number | null
          paint_matrix_rule_id?: string
          painted_on?: string | null
          primer_on?: string | null
          project_id?: string
          ral_code_id?: string
          receipt_id?: string | null
          recorded_by?: string | null
          required_final_dft_microns?: number
          spool_revision_id?: string
          updated_at?: string
          w10p_form_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paint_progress_records_line_service_id_fkey"
            columns: ["line_service_id"]
            isOneToOne: false
            referencedRelation: "project_line_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_progress_records_paint_matrix_rule_id_fkey"
            columns: ["paint_matrix_rule_id"]
            isOneToOne: false
            referencedRelation: "project_paint_matrix_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_progress_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_progress_records_ral_code_id_fkey"
            columns: ["ral_code_id"]
            isOneToOne: false
            referencedRelation: "project_ral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_progress_records_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_progress_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "paint_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "paint_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_revisions"
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
      pwht_requirements: {
        Row: {
          created_at: string
          id: string
          project_id: string
          source_matrix_rule_id: string | null
          spool_revision_id: string
          thickness_threshold_mm: number | null
          weld_joint_revision_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          source_matrix_rule_id?: string | null
          spool_revision_id: string
          thickness_threshold_mm?: number | null
          weld_joint_revision_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          source_matrix_rule_id?: string | null
          spool_revision_id?: string
          thickness_threshold_mm?: number | null
          weld_joint_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pwht_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_requirements_source_matrix_rule_id_fkey"
            columns: ["source_matrix_rule_id"]
            isOneToOne: false
            referencedRelation: "nde_matrix_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_requirements_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "pwht_requirements_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "pwht_requirements_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_requirements_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: true
            referencedRelation: "weld_joint_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_requirements_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: true
            referencedRelation: "weld_progress_summary"
            referencedColumns: ["weld_joint_revision_id"]
          },
        ]
      }
      pwht_results: {
        Row: {
          chart_number: string
          comment: string | null
          created_at: string
          id: string
          outcome: string
          performed_on: string
          pwht_requirement_id: string
          receipt_id: string | null
          recorded_by: string | null
        }
        Insert: {
          chart_number: string
          comment?: string | null
          created_at?: string
          id?: string
          outcome: string
          performed_on: string
          pwht_requirement_id: string
          receipt_id?: string | null
          recorded_by?: string | null
        }
        Update: {
          chart_number?: string
          comment?: string | null
          created_at?: string
          id?: string
          outcome?: string
          performed_on?: string
          pwht_requirement_id?: string
          receipt_id?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwht_results_pwht_requirement_id_fkey"
            columns: ["pwht_requirement_id"]
            isOneToOne: false
            referencedRelation: "pwht_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_results_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwht_results_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qc13_progress_forms: {
        Row: {
          created_at: string
          form_number: string
          id: string
          project_id: string
          requested_by: string | null
          requested_on: string
          spool_revision_id: string
        }
        Insert: {
          created_at?: string
          form_number: string
          id?: string
          project_id: string
          requested_by?: string | null
          requested_on: string
          spool_revision_id: string
        }
        Update: {
          created_at?: string
          form_number?: string
          id?: string
          project_id?: string
          requested_by?: string | null
          requested_on?: string
          spool_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc13_progress_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc13_progress_forms_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc13_progress_forms_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "qc13_progress_forms_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "qc13_progress_forms_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_release_records: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          obligation_count: number
          phase: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          qc13_form_id: string | null
          receipt_id: string | null
          released_by: string | null
          released_on: string
          spool_revision_id: string
          version: number
          weld_count: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          obligation_count: number
          phase?: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          qc13_form_id?: string | null
          receipt_id?: string | null
          released_by?: string | null
          released_on: string
          spool_revision_id: string
          version?: number
          weld_count: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          obligation_count?: number
          phase?: Database["public"]["Enums"]["construction_phase"]
          project_id?: string
          qc13_form_id?: string | null
          receipt_id?: string | null
          released_by?: string | null
          released_on?: string
          spool_revision_id?: string
          version?: number
          weld_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quality_release_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_release_records_qc13_form_id_fkey"
            columns: ["qc13_form_id"]
            isOneToOne: false
            referencedRelation: "qc13_progress_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_release_records_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_release_records_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_release_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "quality_release_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "quality_release_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: true
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_change_items: {
        Row: {
          change_type: Database["public"]["Enums"]["revision_change_type"]
          created_at: string
          entity_id: string
          entity_key: string
          entity_type: Database["public"]["Enums"]["engineering_entity_type"]
          id: string
          isometric_id: string
          isometric_revision_id: string
          next_payload: Json | null
          previous_isometric_revision_id: string | null
          previous_payload: Json | null
          project_id: string
          source_import_job_id: string | null
        }
        Insert: {
          change_type: Database["public"]["Enums"]["revision_change_type"]
          created_at?: string
          entity_id: string
          entity_key: string
          entity_type: Database["public"]["Enums"]["engineering_entity_type"]
          id?: string
          isometric_id: string
          isometric_revision_id: string
          next_payload?: Json | null
          previous_isometric_revision_id?: string | null
          previous_payload?: Json | null
          project_id: string
          source_import_job_id?: string | null
        }
        Update: {
          change_type?: Database["public"]["Enums"]["revision_change_type"]
          created_at?: string
          entity_id?: string
          entity_key?: string
          entity_type?: Database["public"]["Enums"]["engineering_entity_type"]
          id?: string
          isometric_id?: string
          isometric_revision_id?: string
          next_payload?: Json | null
          previous_isometric_revision_id?: string | null
          previous_payload?: Json | null
          project_id?: string
          source_import_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_change_items_isometric_id_fkey"
            columns: ["isometric_id"]
            isOneToOne: false
            referencedRelation: "isometrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_change_items_isometric_revision_id_fkey"
            columns: ["isometric_revision_id"]
            isOneToOne: false
            referencedRelation: "isometric_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_change_items_previous_isometric_revision_id_fkey"
            columns: ["previous_isometric_revision_id"]
            isOneToOne: false
            referencedRelation: "isometric_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_change_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_change_items_source_import_job_id_fkey"
            columns: ["source_import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_decisions: {
        Row: {
          change_item_id: string
          comment: string | null
          decided_at: string
          decided_by: string | null
          decision: Database["public"]["Enums"]["revision_decision"]
          id: string
        }
        Insert: {
          change_item_id: string
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          decision: Database["public"]["Enums"]["revision_decision"]
          id?: string
        }
        Update: {
          change_item_id?: string
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["revision_decision"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_decisions_change_item_id_fkey"
            columns: ["change_item_id"]
            isOneToOne: true
            referencedRelation: "revision_change_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_progress_copies: {
        Row: {
          change_item_id: string
          copied_at: string
          copied_by: string | null
          copied_payload: Json
          id: string
          progress_kind: string
          source_spool_revision_id: string
          target_spool_revision_id: string
        }
        Insert: {
          change_item_id: string
          copied_at?: string
          copied_by?: string | null
          copied_payload?: Json
          id?: string
          progress_kind: string
          source_spool_revision_id: string
          target_spool_revision_id: string
        }
        Update: {
          change_item_id?: string
          copied_at?: string
          copied_by?: string | null
          copied_payload?: Json
          id?: string
          progress_kind?: string
          source_spool_revision_id?: string
          target_spool_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_progress_copies_change_item_id_fkey"
            columns: ["change_item_id"]
            isOneToOne: false
            referencedRelation: "revision_change_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_progress_copies_copied_by_fkey"
            columns: ["copied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_progress_copies_source_spool_revision_id_fkey"
            columns: ["source_spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "revision_progress_copies_source_spool_revision_id_fkey"
            columns: ["source_spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "revision_progress_copies_source_spool_revision_id_fkey"
            columns: ["source_spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_progress_copies_target_spool_revision_id_fkey"
            columns: ["target_spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "revision_progress_copies_target_spool_revision_id_fkey"
            columns: ["target_spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "revision_progress_copies_target_spool_revision_id_fkey"
            columns: ["target_spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
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
      spool_revision_materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          ident_code: string
          quantity: number | null
          spool_revision_id: string
          trace_number: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          ident_code: string
          quantity?: number | null
          spool_revision_id: string
          trace_number?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          ident_code?: string
          quantity?: number | null
          spool_revision_id?: string
          trace_number?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spool_revision_materials_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "spool_revision_materials_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "spool_revision_materials_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      spool_revisions: {
        Row: {
          created_at: string
          id: string
          is_removed: boolean
          isometric_revision_id: string
          material_class: string | null
          sequence_number: number
          spool_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_removed?: boolean
          isometric_revision_id: string
          material_class?: string | null
          sequence_number?: number
          spool_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_removed?: boolean
          isometric_revision_id?: string
          material_class?: string | null
          sequence_number?: number
          spool_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spool_revisions_isometric_revision_id_fkey"
            columns: ["isometric_revision_id"]
            isOneToOne: false
            referencedRelation: "isometric_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spool_revisions_spool_id_fkey"
            columns: ["spool_id"]
            isOneToOne: false
            referencedRelation: "spools"
            referencedColumns: ["id"]
          },
        ]
      }
      spools: {
        Row: {
          created_at: string
          id: string
          project_id: string
          spool_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          spool_number: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          spool_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "spools_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      support_progress_records: {
        Row: {
          created_at: string
          id: string
          installed_on: string
          phase: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          receipt_id: string | null
          recorded_by: string | null
          spool_revision_id: string
          support_revision_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installed_on: string
          phase?: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          receipt_id?: string | null
          recorded_by?: string | null
          spool_revision_id: string
          support_revision_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installed_on?: string
          phase?: Database["public"]["Enums"]["construction_phase"]
          project_id?: string
          receipt_id?: string | null
          recorded_by?: string | null
          spool_revision_id?: string
          support_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_progress_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_progress_records_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_progress_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "support_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "support_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_progress_records_support_revision_id_fkey"
            columns: ["support_revision_id"]
            isOneToOne: true
            referencedRelation: "support_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_revisions: {
        Row: {
          created_at: string
          id: string
          is_removed: boolean
          quantity: number
          spool_revision_id: string
          support_id: string
          support_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_removed?: boolean
          quantity?: number
          spool_revision_id: string
          support_id: string
          support_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_removed?: boolean
          quantity?: number
          spool_revision_id?: string
          support_id?: string
          support_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "support_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "support_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_revisions_support_id_fkey"
            columns: ["support_id"]
            isOneToOne: false
            referencedRelation: "supports"
            referencedColumns: ["id"]
          },
        ]
      }
      supports: {
        Row: {
          created_at: string
          id: string
          project_id: string
          support_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          support_number: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          support_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "supports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      weld_joint_revisions: {
        Row: {
          created_at: string
          diameter_inch: number | null
          id: string
          is_removed: boolean
          spool_revision_id: string
          thickness_mm: number | null
          weld_joint_id: string
          weld_location: string
          weld_type_id: string | null
        }
        Insert: {
          created_at?: string
          diameter_inch?: number | null
          id?: string
          is_removed?: boolean
          spool_revision_id: string
          thickness_mm?: number | null
          weld_joint_id: string
          weld_location?: string
          weld_type_id?: string | null
        }
        Update: {
          created_at?: string
          diameter_inch?: number | null
          id?: string
          is_removed?: boolean
          spool_revision_id?: string
          thickness_mm?: number | null
          weld_joint_id?: string
          weld_location?: string
          weld_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weld_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "weld_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "weld_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_joint_revisions_weld_joint_id_fkey"
            columns: ["weld_joint_id"]
            isOneToOne: false
            referencedRelation: "weld_joints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_joint_revisions_weld_type_id_fkey"
            columns: ["weld_type_id"]
            isOneToOne: false
            referencedRelation: "project_weld_types"
            referencedColumns: ["id"]
          },
        ]
      }
      weld_joints: {
        Row: {
          created_at: string
          id: string
          project_id: string
          weld_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          weld_number: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          weld_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "weld_joints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weld_point_assignments: {
        Row: {
          completion_percent: number
          created_at: string
          id: string
          point_type: string
          weld_point_id: string
          weld_progress_record_id: string
          welded_on: string
          welder_qualification_id: string
        }
        Insert: {
          completion_percent: number
          created_at?: string
          id?: string
          point_type: string
          weld_point_id: string
          weld_progress_record_id: string
          welded_on: string
          welder_qualification_id: string
        }
        Update: {
          completion_percent?: number
          created_at?: string
          id?: string
          point_type?: string
          weld_point_id?: string
          weld_progress_record_id?: string
          welded_on?: string
          welder_qualification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weld_point_assignments_weld_point_id_fkey"
            columns: ["weld_point_id"]
            isOneToOne: false
            referencedRelation: "weld_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_point_assignments_weld_progress_record_id_fkey"
            columns: ["weld_progress_record_id"]
            isOneToOne: false
            referencedRelation: "weld_progress_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_point_assignments_welder_qualification_id_fkey"
            columns: ["welder_qualification_id"]
            isOneToOne: false
            referencedRelation: "welder_qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      weld_points: {
        Row: {
          created_at: string
          id: string
          point_type: string
          sequence_number: number
          weld_joint_revision_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          point_type: string
          sequence_number: number
          weld_joint_revision_id: string
        }
        Update: {
          created_at?: string
          id?: string
          point_type?: string
          sequence_number?: number
          weld_joint_revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weld_points_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: false
            referencedRelation: "weld_joint_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_points_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: false
            referencedRelation: "weld_progress_summary"
            referencedColumns: ["weld_joint_revision_id"]
          },
        ]
      }
      weld_progress_records: {
        Row: {
          beveling_on: string | null
          created_at: string
          cutting_on: string | null
          dwir_number: string | null
          fitup_on: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          phase: Database["public"]["Enums"]["construction_phase"]
          preheat_on: string | null
          project_id: string
          qc_form_number: string | null
          qc13_form_id: string | null
          receipt_id: string | null
          recorded_by: string | null
          rework_code_id: string | null
          spool_revision_id: string
          subcontractor_id: string
          updated_at: string
          version: number
          weld_joint_revision_id: string
          weld_on: string | null
          welding_procedure_id: string
        }
        Insert: {
          beveling_on?: string | null
          created_at?: string
          cutting_on?: string | null
          dwir_number?: string | null
          fitup_on?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          phase?: Database["public"]["Enums"]["construction_phase"]
          preheat_on?: string | null
          project_id: string
          qc_form_number?: string | null
          qc13_form_id?: string | null
          receipt_id?: string | null
          recorded_by?: string | null
          rework_code_id?: string | null
          spool_revision_id: string
          subcontractor_id: string
          updated_at?: string
          version?: number
          weld_joint_revision_id: string
          weld_on?: string | null
          welding_procedure_id: string
        }
        Update: {
          beveling_on?: string | null
          created_at?: string
          cutting_on?: string | null
          dwir_number?: string | null
          fitup_on?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          phase?: Database["public"]["Enums"]["construction_phase"]
          preheat_on?: string | null
          project_id?: string
          qc_form_number?: string | null
          qc13_form_id?: string | null
          receipt_id?: string | null
          recorded_by?: string | null
          rework_code_id?: string | null
          spool_revision_id?: string
          subcontractor_id?: string
          updated_at?: string
          version?: number
          weld_joint_revision_id?: string
          weld_on?: string | null
          welding_procedure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weld_progress_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_qc13_form_id_fkey"
            columns: ["qc13_form_id"]
            isOneToOne: false
            referencedRelation: "qc13_progress_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_rework_code_id_fkey"
            columns: ["rework_code_id"]
            isOneToOne: false
            referencedRelation: "project_rework_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "weld_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "weld_progress_records_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "project_subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: true
            referencedRelation: "weld_joint_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_progress_records_weld_joint_revision_id_fkey"
            columns: ["weld_joint_revision_id"]
            isOneToOne: true
            referencedRelation: "weld_progress_summary"
            referencedColumns: ["weld_joint_revision_id"]
          },
          {
            foreignKeyName: "weld_progress_records_welding_procedure_id_fkey"
            columns: ["welding_procedure_id"]
            isOneToOne: false
            referencedRelation: "project_welding_procedures"
            referencedColumns: ["id"]
          },
        ]
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
      spool_construction_status: {
        Row: {
          current_stage:
            | Database["public"]["Enums"]["construction_stage"]
            | null
          fabricated_on: string | null
          final_qc_on: string | null
          is_fabricated: boolean | null
          is_releasable: boolean | null
          iso_number: string | null
          laydown_on: string | null
          line_checked: number | null
          line_total: number | null
          material_check_on: string | null
          nde_pending: number | null
          painted_on: string | null
          pds_area_id: string | null
          project_id: string | null
          pwht_pending: number | null
          qc_release_on: string | null
          revision_number: string | null
          sent_to_paint_on: string | null
          spool_number: string | null
          spool_revision_id: string | null
          start_fab_on: string | null
          support_recorded: number | null
          support_total: number | null
          weld_complete: number | null
          weld_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "isometric_revisions_pds_area_id_fkey"
            columns: ["pds_area_id"]
            isOneToOne: false
            referencedRelation: "project_pds_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      spool_fabrication_readiness: {
        Row: {
          fabricated_on: string | null
          is_fabricated: boolean | null
          is_material_checked: boolean | null
          is_releasable: boolean | null
          last_support_on: string | null
          last_weld_on: string | null
          line_checked: number | null
          line_total: number | null
          material_checked_on: string | null
          nde_pending: number | null
          project_id: string | null
          pwht_pending: number | null
          revision_status: Database["public"]["Enums"]["revision_status"] | null
          spool_revision_id: string | null
          support_recorded: number | null
          support_total: number | null
          weld_complete: number | null
          weld_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "isometrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      spool_progress_dates: {
        Row: {
          final_qc_on: string | null
          laydown_on: string | null
          material_check_on: string | null
          painted_on: string | null
          qc_release_on: string | null
          sent_to_paint_on: string | null
          spool_revision_id: string | null
          start_fab_on: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      spool_stage_events: {
        Row: {
          actor_id: string | null
          compensates_event_id: string | null
          created_at: string | null
          id: string | null
          occurred_on: string | null
          payload: Json | null
          phase: Database["public"]["Enums"]["construction_phase"] | null
          project_id: string | null
          source: string | null
          spool_revision_id: string | null
          stage: Database["public"]["Enums"]["construction_stage"] | null
        }
        Insert: {
          actor_id?: string | null
          compensates_event_id?: string | null
          created_at?: string | null
          id?: string | null
          occurred_on?: string | null
          payload?: Json | null
          phase?: Database["public"]["Enums"]["construction_phase"] | null
          project_id?: string | null
          source?: string | null
          spool_revision_id?: string | null
          stage?: Database["public"]["Enums"]["construction_stage"] | null
        }
        Update: {
          actor_id?: string | null
          compensates_event_id?: string | null
          created_at?: string | null
          id?: string | null
          occurred_on?: string | null
          payload?: Json | null
          phase?: Database["public"]["Enums"]["construction_phase"] | null
          project_id?: string | null
          source?: string | null
          spool_revision_id?: string | null
          stage?: Database["public"]["Enums"]["construction_stage"] | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_progress_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_compensates_event_id_fkey"
            columns: ["compensates_event_id"]
            isOneToOne: false
            referencedRelation: "construction_progress_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_compensates_event_id_fkey"
            columns: ["compensates_event_id"]
            isOneToOne: false
            referencedRelation: "spool_stage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "construction_progress_events_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      weld_progress_summary: {
        Row: {
          diameter_inch: number | null
          is_locked: boolean | null
          obligation_pending: number | null
          obligation_total: number | null
          project_id: string | null
          pwht_accepted: boolean | null
          pwht_required: boolean | null
          spool_number: string | null
          spool_revision_id: string | null
          thickness_mm: number | null
          weld_joint_revision_id: string | null
          weld_location: string | null
          weld_number: string | null
          weld_on: string | null
          welders: string[] | null
          wps_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "isometrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weld_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_construction_status"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "weld_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_fabrication_readiness"
            referencedColumns: ["spool_revision_id"]
          },
          {
            foreignKeyName: "weld_joint_revisions_spool_revision_id_fkey"
            columns: ["spool_revision_id"]
            isOneToOne: false
            referencedRelation: "spool_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      allocate_nde_batch_candidates: {
        Args: {
          idempotency_key?: string
          target_batch_id: string
          target_percentage?: number
        }
        Returns: number
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
      apply_spooling_import_job: {
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
      assert_construction_target: {
        Args: { required_capability: string; target_spool_revision_id: string }
        Returns: Database["public"]["CompositeTypes"]["spool_context"]
        SetofOptions: {
          from: "*"
          to: "spool_context"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_tracer_obligation: {
        Args: {
          idempotency_key?: string
          target_parent_obligation_id: string
          tracer_weld_joint_revision_id: string
        }
        Returns: {
          category_code: string
          created_at: string
          cycle_kind: string
          cycle_ordinal: number
          disposition: string
          id: string
          method: Database["public"]["Enums"]["ndt_method"]
          parent_obligation_id: string | null
          project_id: string
          required_coverage: number
          responsible_welder_qualification_id: string | null
          satisfied_at: string | null
          satisfied_by: string | null
          selection_mode: string
          source_matrix_rule_id: string | null
          spool_revision_id: string
          weld_joint_revision_id: string
        }
        SetofOptions: {
          from: "*"
          to: "nde_obligations"
          isOneToOne: true
          isSetofReturn: false
        }
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
      claim_command_receipt: {
        Args: {
          target_command_name: string
          target_idempotency_key: string
          target_project_id: string
        }
        Returns: Json
      }
      close_nde_batch: {
        Args: {
          idempotency_key?: string
          report_number_override?: string
          returned_on_date?: string
          target_batch_id: string
        }
        Returns: {
          batch_number: string
          category_code: string
          closed_on: string | null
          created_at: string
          created_by: string | null
          id: string
          issued_on: string | null
          method: Database["public"]["Enums"]["ndt_method"]
          ndt_subcontractor_id: string | null
          project_id: string
          receipt_id: string | null
          report_number: string | null
          responsible_welder_qualification_id: string | null
          returned_on: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "nde_batches"
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
      complete_command_receipt: {
        Args: {
          command_result: Json
          target_command_name: string
          target_idempotency_key: string
          target_project_id: string
        }
        Returns: Json
      }
      construction_stage_ordinal: {
        Args: {
          target_stage: Database["public"]["Enums"]["construction_stage"]
        }
        Returns: number
      }
      correct_weld_progress: {
        Args: {
          corrections: Json
          expected_version: number
          idempotency_key?: string
          reason: string
          target_weld_joint_revision_id: string
        }
        Returns: {
          beveling_on: string | null
          created_at: string
          cutting_on: string | null
          dwir_number: string | null
          fitup_on: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          phase: Database["public"]["Enums"]["construction_phase"]
          preheat_on: string | null
          project_id: string
          qc_form_number: string | null
          qc13_form_id: string | null
          receipt_id: string | null
          recorded_by: string | null
          rework_code_id: string | null
          spool_revision_id: string
          subcontractor_id: string
          updated_at: string
          version: number
          weld_joint_revision_id: string
          weld_on: string | null
          welding_procedure_id: string
        }
        SetofOptions: {
          from: "*"
          to: "weld_progress_records"
          isOneToOne: true
          isSetofReturn: false
        }
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
      create_manual_revision: {
        Args: {
          decisions?: Json
          new_revision_number: string
          revision_comment?: string
          target_isometric_id: string
        }
        Returns: {
          accepted_at: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          isometric_id: string
          line_number: string | null
          pds_area_id: string | null
          revision_number: string
          revision_ordinal: number
          service_class_id: string | null
          sheet_number: string | null
          source_import_job_id: string | null
          status: Database["public"]["Enums"]["revision_status"]
          superseded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "isometric_revisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_nde_batch: {
        Args: {
          batch_number_override?: string
          category_code: string
          idempotency_key?: string
          method: Database["public"]["Enums"]["ndt_method"]
          subcontractor_id?: string
          target_project_id: string
          welder_id?: string
        }
        Returns: {
          batch_number: string
          category_code: string
          closed_on: string | null
          created_at: string
          created_by: string | null
          id: string
          issued_on: string | null
          method: Database["public"]["Enums"]["ndt_method"]
          ndt_subcontractor_id: string | null
          project_id: string
          receipt_id: string | null
          report_number: string | null
          responsible_welder_qualification_id: string | null
          returned_on: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "nde_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_spooling_import_job: {
        Args: { job_comment?: string; target_project_id: string }
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
      current_user_can_read_fabrication_spool: {
        Args: { target_project_id: string; target_spool_revision_id: string }
        Returns: boolean
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
      derive_repair_and_tracers: {
        Args: { rejected_obligation_id: string }
        Returns: boolean
      }
      effective_stage_date:
        | {
            Args: {
              target_phase: Database["public"]["Enums"]["construction_phase"]
              target_spool_revision_id: string
              target_stage: Database["public"]["Enums"]["construction_stage"]
            }
            Returns: string
          }
        | {
            Args: {
              target_spool_revision_id: string
              target_stage: Database["public"]["Enums"]["construction_stage"]
            }
            Returns: string
          }
      eligible_tracer_candidates: {
        Args: { target_obligation_id: string }
        Returns: {
          spool_number: string
          weld_joint_revision_id: string
          weld_number: string
          weld_on: string
        }[]
      }
      engineering_numeric: { Args: { value: string }; Returns: number }
      engineering_numeric_key: { Args: { value: number }; Returns: string }
      evaluate_nde_penalty: {
        Args: { category: string; target_project_id: string; welder_id: string }
        Returns: boolean
      }
      generate_weld_obligations: {
        Args: { ctx: Database["public"]["CompositeTypes"]["weld_context"] }
        Returns: number
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
      is_welder_on_joint: {
        Args: {
          target_weld_joint_revision_id: string
          target_welder_qualification_id: string
        }
        Returns: boolean
      }
      isometric_revision_project_id: {
        Args: { revision_id: string }
        Returns: string
      }
      issue_nde_batch: {
        Args: { idempotency_key?: string; target_batch_id: string }
        Returns: {
          batch_number: string
          category_code: string
          closed_on: string | null
          created_at: string
          created_by: string | null
          id: string
          issued_on: string | null
          method: Database["public"]["Enums"]["ndt_method"]
          ndt_subcontractor_id: string | null
          project_id: string
          receipt_id: string | null
          report_number: string | null
          responsible_welder_qualification_id: string | null
          returned_on: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "nde_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      materialize_progress_copies: {
        Args: {
          target_idempotency_key?: string
          target_isometric_revision_id: string
        }
        Returns: number
      }
      membership_access_state: {
        Args: { target_membership_id: string }
        Returns: Json
      }
      nde_batch_candidates: {
        Args: { target_batch_id: string }
        Returns: {
          candidate_obligation_id: string
          candidate_weld_number: string
          candidate_welded_on: string
        }[]
      }
      preview_spooling_import: {
        Args: { target_job_id: string }
        Returns: {
          change_type: Database["public"]["Enums"]["revision_change_type"]
          decision: Database["public"]["Enums"]["revision_decision"]
          entity_key: string
          entity_type: Database["public"]["Enums"]["engineering_entity_type"]
          iso_number: string
          next_payload: Json
          previous_payload: Json
          requires_decision: boolean
        }[]
      }
      record_construction_progress: {
        Args: {
          target_idempotency_key?: string
          target_occurred_on: string
          target_payload?: Json
          target_phase: Database["public"]["Enums"]["construction_phase"]
          target_spool_revision_id: string
          target_stage: Database["public"]["Enums"]["construction_stage"]
        }
        Returns: {
          actor_id: string | null
          compensates_event_id: string | null
          created_at: string
          id: string
          occurred_on: string
          payload: Json
          phase: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          source: string
          spool_revision_id: string
          stage: Database["public"]["Enums"]["construction_stage"]
        }
        SetofOptions: {
          from: "*"
          to: "construction_progress_events"
          isOneToOne: true
          isSetofReturn: false
        }
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
      record_laydown: {
        Args: {
          idempotency_key?: string
          location_id: string
          stored_on: string
          target_spool_revision_id: string
        }
        Returns: {
          created_at: string
          id: string
          location_id: string
          project_id: string
          receipt_id: string | null
          recorded_by: string | null
          spool_revision_id: string
          stored_on: string
        }
        SetofOptions: {
          from: "*"
          to: "laydown_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_material_check: {
        Args: {
          target_checked_on: string
          target_idempotency_key?: string
          target_items: Json
          target_qc13_form_id?: string
          target_spool_revision_id: string
        }
        Returns: {
          checked_by: string | null
          checked_on: string
          command_receipt_id: string | null
          created_at: string
          id: string
          project_id: string
          qc13_form_id: string | null
          spool_revision_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "material_check_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_nde_result: {
        Args: {
          comment?: string
          defect_rework_code_id?: string
          examined_on: string
          idempotency_key?: string
          outcome: string
          report_number?: string
          responsible_welder_qualification_id?: string
          target_obligation_id: string
        }
        Returns: {
          batch_item_id: string | null
          comment: string | null
          created_at: string
          defect_rework_code_id: string | null
          examined_on: string
          id: string
          obligation_id: string
          outcome: string
          project_id: string
          receipt_id: string | null
          recorded_by: string | null
          report_number: string | null
          responsible_welder_qualification_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "nde_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_paint_progress: {
        Args: {
          details?: Json
          idempotency_key?: string
          line_service_id: string
          target_spool_revision_id: string
        }
        Returns: {
          blasting_on: string | null
          created_at: string
          final_coats: number | null
          final_qc_on: string | null
          id: string
          intermediate_coats: number | null
          line_service_id: string
          measured_dft_microns: number | null
          paint_matrix_rule_id: string
          painted_on: string | null
          primer_on: string | null
          project_id: string
          ral_code_id: string
          receipt_id: string | null
          recorded_by: string | null
          required_final_dft_microns: number
          spool_revision_id: string
          updated_at: string
          w10p_form_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "paint_progress_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_pwht_result: {
        Args: {
          chart_number: string
          idempotency_key?: string
          outcome: string
          performed_on: string
          target_requirement_id: string
        }
        Returns: {
          chart_number: string
          comment: string | null
          created_at: string
          id: string
          outcome: string
          performed_on: string
          pwht_requirement_id: string
          receipt_id: string | null
          recorded_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pwht_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_revision_decision: {
        Args: {
          chosen_decision: Database["public"]["Enums"]["revision_decision"]
          decision_comment?: string
          target_entity_key: string
          target_entity_type: Database["public"]["Enums"]["engineering_entity_type"]
          target_iso_number: string
          target_job_id: string
        }
        Returns: {
          comment: string | null
          decided_at: string
          decided_by: string | null
          decision: Database["public"]["Enums"]["revision_decision"]
          entity_key: string
          entity_type: Database["public"]["Enums"]["engineering_entity_type"]
          id: string
          iso_number: string
          job_id: string
        }
        SetofOptions: {
          from: "*"
          to: "import_revision_decisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_spooling_validation: {
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
      record_support_progress: {
        Args: {
          idempotency_key?: string
          installed_on: string
          target_support_revision_id: string
        }
        Returns: {
          created_at: string
          id: string
          installed_on: string
          phase: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          receipt_id: string | null
          recorded_by: string | null
          spool_revision_id: string
          support_revision_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_progress_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_weld_progress: {
        Args: {
          dates?: Json
          idempotency_key?: string
          points: Json
          subcontractor_id: string
          target_weld_joint_revision_id: string
          welding_procedure_id: string
        }
        Returns: {
          beveling_on: string | null
          created_at: string
          cutting_on: string | null
          dwir_number: string | null
          fitup_on: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          phase: Database["public"]["Enums"]["construction_phase"]
          preheat_on: string | null
          project_id: string
          qc_form_number: string | null
          qc13_form_id: string | null
          receipt_id: string | null
          recorded_by: string | null
          rework_code_id: string | null
          spool_revision_id: string
          subcontractor_id: string
          updated_at: string
          version: number
          weld_joint_revision_id: string
          weld_on: string | null
          welding_procedure_id: string
        }
        SetofOptions: {
          from: "*"
          to: "weld_progress_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_spooling_import_file: {
        Args: {
          checksum: string
          file_name: string
          media_type: string
          object_path: string
          role: Database["public"]["Enums"]["spoolgen_file_role"]
          size_bytes: number
          target_job_id: string
        }
        Returns: {
          checksum: string | null
          file_name: string
          file_role: Database["public"]["Enums"]["spoolgen_file_role"]
          id: string
          job_id: string
          media_type: string | null
          size_bytes: number
          storage_path: string | null
          uploaded_at: string
        }
        SetofOptions: {
          from: "*"
          to: "import_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_quality_record: {
        Args: {
          comment?: string
          idempotency_key?: string
          qc13_form_id?: string
          released_on: string
          target_spool_revision_id: string
        }
        Returns: {
          comment: string | null
          created_at: string
          id: string
          obligation_count: number
          phase: Database["public"]["Enums"]["construction_phase"]
          project_id: string
          qc13_form_id: string | null
          receipt_id: string | null
          released_by: string | null
          released_on: string
          spool_revision_id: string
          version: number
          weld_count: number
        }
        SetofOptions: {
          from: "*"
          to: "quality_release_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_qc13_form: {
        Args: {
          requested_date?: string
          target_idempotency_key?: string
          target_spool_revision_id: string
        }
        Returns: {
          created_at: string
          form_number: string
          id: string
          project_id: string
          requested_by: string | null
          requested_on: string
          spool_revision_id: string
        }
        SetofOptions: {
          from: "*"
          to: "qc13_progress_forms"
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
      revalidate_spooling_import_job: {
        Args: { target_job_id: string }
        Returns: {
          blocker_count: number
          unresolved_count: number
          warning_count: number
        }[]
      }
      revalidate_spooling_import_job_base: {
        Args: { target_job_id: string }
        Returns: {
          blocker_count: number
          unresolved_count: number
          warning_count: number
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
      spool_revision_project_id: {
        Args: { spool_revision_id: string }
        Returns: string
      }
      spooling_staging: {
        Args: { target_job_id: string }
        Returns: {
          entity_kind: string
          entity_values: Json
          staging_row_number: number
        }[]
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
      weld_joint_context: {
        Args: { target_weld_joint_revision_id: string }
        Returns: Database["public"]["CompositeTypes"]["weld_context"]
        SetofOptions: {
          from: "*"
          to: "weld_context"
          isOneToOne: true
          isSetofReturn: false
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
      construction_phase: "fabrication" | "assembly" | "erection"
      construction_stage:
        | "start_fab"
        | "material_check"
        | "fabricated"
        | "qc_release"
        | "sent_to_paint"
        | "painted"
        | "final_qc"
        | "laydown"
      engineering_entity_type:
        | "spool"
        | "weld_joint"
        | "support"
        | "flange_joint"
      import_issue_severity: "blocker" | "conflict" | "warning"
      ndt_method: "rt" | "ut" | "mt" | "pt" | "pmi" | "ht" | "vt"
      pressure_unit: "bar" | "psi"
      project_reference_status: "active" | "inactive" | "archived"
      revision_change_type: "new" | "revised" | "unchanged" | "removed"
      revision_decision:
        | "not_done"
        | "cancelled"
        | "done_without_modification"
        | "rework"
      revision_status: "draft" | "accepted" | "superseded"
      role_kind: "access" | "functional"
      spoolgen_file_role: "weld" | "trace" | "bolt" | "supp"
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
      spool_context: {
        project_id: string | null
        spool_revision_id: string | null
        isometric_revision_id: string | null
        pds_area_id: string | null
      }
      weld_context: {
        weld_joint_revision_id: string | null
        weld_joint_id: string | null
        weld_number: string | null
        spool_revision_id: string | null
        isometric_revision_id: string | null
        project_id: string | null
        pds_area_id: string | null
        service_class_id: string | null
        weld_type_id: string | null
        weld_location: string | null
        diameter_inch: number | null
        thickness_mm: number | null
        material_class: string | null
        revision_status: Database["public"]["Enums"]["revision_status"] | null
        is_removed: boolean | null
      }
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
      construction_phase: ["fabrication", "assembly", "erection"],
      construction_stage: [
        "start_fab",
        "material_check",
        "fabricated",
        "qc_release",
        "sent_to_paint",
        "painted",
        "final_qc",
        "laydown",
      ],
      engineering_entity_type: [
        "spool",
        "weld_joint",
        "support",
        "flange_joint",
      ],
      import_issue_severity: ["blocker", "conflict", "warning"],
      ndt_method: ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"],
      pressure_unit: ["bar", "psi"],
      project_reference_status: ["active", "inactive", "archived"],
      revision_change_type: ["new", "revised", "unchanged", "removed"],
      revision_decision: [
        "not_done",
        "cancelled",
        "done_without_modification",
        "rework",
      ],
      revision_status: ["draft", "accepted", "superseded"],
      role_kind: ["access", "functional"],
      spoolgen_file_role: ["weld", "trace", "bolt", "supp"],
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

