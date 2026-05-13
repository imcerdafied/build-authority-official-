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
      auth_settings: {
        Row: {
          id: number
          updated_at: string
          workspace_domain: string | null
        }
        Insert: {
          id: number
          updated_at?: string
          workspace_domain?: string | null
        }
        Update: {
          id?: number
          updated_at?: string
          workspace_domain?: string | null
        }
        Relationships: []
      }
      bet_findings: {
        Row: {
          aligned_outcomes: Json
          bet_id: string
          confidence: number
          created_at: string | null
          description: string
          effort: number
          id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          aligned_outcomes?: Json
          bet_id: string
          confidence?: number
          created_at?: string | null
          description: string
          effort?: number
          id?: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          aligned_outcomes?: Json
          bet_id?: string
          confidence?: number
          created_at?: string | null
          description?: string
          effort?: number
          id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bet_findings_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_findings_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
        ]
      }
      bet_initiatives: {
        Row: {
          aligned_outcomes: Json
          bet_id: string
          confidence: number
          created_at: string | null
          description: string
          effort: number
          id: string
          last_score_delta: number
          outcome_multiplier: number
          roadmap_position: number
          score_v3: number
          updated_at: string | null
          value: number
        }
        Insert: {
          aligned_outcomes?: Json
          bet_id: string
          confidence?: number
          created_at?: string | null
          description: string
          effort?: number
          id?: string
          last_score_delta?: number
          outcome_multiplier?: number
          roadmap_position?: number
          score_v3?: number
          updated_at?: string | null
          value?: number
        }
        Update: {
          aligned_outcomes?: Json
          bet_id?: string
          confidence?: number
          created_at?: string | null
          description?: string
          effort?: number
          id?: string
          last_score_delta?: number
          outcome_multiplier?: number
          roadmap_position?: number
          score_v3?: number
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bet_initiatives_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_initiatives_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
        ]
      }
      bet_metrics: {
        Row: {
          bet_id: string
          created_at: string | null
          current_value: number
          id: string
          last_updated_at: string | null
          metric_name: string
          outcome_key: string
          status: string
          target_value: number
        }
        Insert: {
          bet_id: string
          created_at?: string | null
          current_value?: number
          id?: string
          last_updated_at?: string | null
          metric_name: string
          outcome_key: string
          status?: string
          target_value: number
        }
        Update: {
          bet_id?: string
          created_at?: string | null
          current_value?: number
          id?: string
          last_updated_at?: string | null
          metric_name?: string
          outcome_key?: string
          status?: string
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bet_metrics_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_metrics_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
        ]
      }
      bet_monitoring: {
        Row: {
          bet_id: string
          drift_flags: Json
          last_recalculated_at: string | null
        }
        Insert: {
          bet_id: string
          drift_flags?: Json
          last_recalculated_at?: string | null
        }
        Update: {
          bet_id?: string
          drift_flags?: Json
          last_recalculated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bet_monitoring_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: true
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_monitoring_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: true
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_pod_events: {
        Row: {
          changed_by: string | null
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          org_id: string
          pod_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id: string
          pod_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id?: string
          pod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_pod_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_pod_events_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "capability_pods"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_pods: {
        Row: {
          created_at: string
          created_by: string | null
          customer_validated: boolean
          cycle_time_days: number | null
          deliverable: string | null
          dependencies: Json
          description: string | null
          id: string
          kpi_targets: Json
          name: string
          org_id: string
          owner: string
          primary_bet_id: string
          production_shipped: boolean
          prototype_built: boolean
          secondary_bet_id: string | null
          status: Database["public"]["Enums"]["capability_pod_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_validated?: boolean
          cycle_time_days?: number | null
          deliverable?: string | null
          dependencies?: Json
          description?: string | null
          id?: string
          kpi_targets?: Json
          name: string
          org_id: string
          owner: string
          primary_bet_id: string
          production_shipped?: boolean
          prototype_built?: boolean
          secondary_bet_id?: string | null
          status?: Database["public"]["Enums"]["capability_pod_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_validated?: boolean
          cycle_time_days?: number | null
          deliverable?: string | null
          dependencies?: Json
          description?: string | null
          id?: string
          kpi_targets?: Json
          name?: string
          org_id?: string
          owner?: string
          primary_bet_id?: string
          production_shipped?: boolean
          prototype_built?: boolean
          secondary_bet_id?: string | null
          status?: Database["public"]["Enums"]["capability_pod_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_pods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_pods_primary_bet_id_fkey"
            columns: ["primary_bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_pods_primary_bet_id_fkey"
            columns: ["primary_bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_pods_secondary_bet_id_fkey"
            columns: ["secondary_bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_pods_secondary_bet_id_fkey"
            columns: ["secondary_bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_activity: {
        Row: {
          changed_by: string | null
          created_at: string | null
          decision_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          org_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          decision_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          decision_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_activity_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_activity_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_activity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_events: {
        Row: {
          actor_id: string | null
          created_at: string
          decision_id: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          org_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          decision_id: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          org_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          decision_id?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_events_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_events_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_interruptions: {
        Row: {
          created_at: string | null
          decision_id: string
          description: string
          engineers_diverted: number | null
          estimated_days: number | null
          id: string
          impact_note: string | null
          logged_by: string | null
          org_id: string
          source: string
        }
        Insert: {
          created_at?: string | null
          decision_id: string
          description: string
          engineers_diverted?: number | null
          estimated_days?: number | null
          id?: string
          impact_note?: string | null
          logged_by?: string | null
          org_id: string
          source?: string
        }
        Update: {
          created_at?: string | null
          decision_id?: string
          description?: string
          engineers_diverted?: number | null
          estimated_days?: number | null
          id?: string
          impact_note?: string | null
          logged_by?: string | null
          org_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_interruptions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_interruptions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_interruptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_projections: {
        Row: {
          created_at: string
          decision_id: string
          id: string
          model: string
          org_id: string
          projection: Json
        }
        Insert: {
          created_at?: string
          decision_id: string
          id?: string
          model: string
          org_id: string
          projection: Json
        }
        Update: {
          created_at?: string
          decision_id?: string
          id?: string
          model?: string
          org_id?: string
          projection?: Json
        }
        Relationships: []
      }
      decision_risk: {
        Row: {
          decision_id: string
          org_id: string
          risk_indicator: string
          risk_reason: string
          risk_score: number
          risk_source: string
          updated_at: string
        }
        Insert: {
          decision_id: string
          org_id: string
          risk_indicator: string
          risk_reason: string
          risk_score: number
          risk_source: string
          updated_at?: string
        }
        Update: {
          decision_id?: string
          org_id?: string
          risk_indicator?: string
          risk_reason?: string
          risk_score?: number
          risk_source?: string
          updated_at?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          activated_at: string | null
          blocked_dependency_owner: string | null
          blocked_reason: string | null
          capacity_allocated: number | null
          capacity_diverted: number | null
          created_at: string | null
          created_by: string | null
          current_delta: string | null
          decision_health: string | null
          escalation_count: number | null
          executive_attention_required: boolean
          expected_impact: string | null
          exposure_value: string | null
          id: string
          impact_tier: string
          legacy_status_text: string | null
          linked_okr_app: string | null
          linked_okr_id: string | null
          linked_okr_title: string | null
          linked_outcome_ids: string[] | null
          linked_outcome_titles: Json | null
          measured_outcome_result: string | null
          momentum_score: number | null
          org_id: string
          outcome_category: string | null
          outcome_category_key: string | null
          outcome_target: string | null
          owner: string
          owner_user_id: string | null
          pod_configuration: Json | null
          previous_exposure_value: string | null
          revenue_at_risk: string | null
          risk_level: Database["public"]["Enums"]["bet_risk_level"]
          segment_impact: string | null
          shipped_slice_date: string | null
          slice_deadline_days: number | null
          slice_due_at: string | null
          solution_domain: Database["public"]["Enums"]["solution_domain"]
          sponsor: string | null
          state_change_note: string | null
          state_changed_at: string | null
          status: Database["public"]["Enums"]["decision_status"] | null
          surface: string
          title: string
          trigger_signal: string | null
          unplanned_interrupts: number | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          capacity_allocated?: number | null
          capacity_diverted?: number | null
          created_at?: string | null
          created_by?: string | null
          current_delta?: string | null
          decision_health?: string | null
          escalation_count?: number | null
          executive_attention_required?: boolean
          expected_impact?: string | null
          exposure_value?: string | null
          id?: string
          impact_tier: string
          legacy_status_text?: string | null
          linked_okr_app?: string | null
          linked_okr_id?: string | null
          linked_okr_title?: string | null
          linked_outcome_ids?: string[] | null
          linked_outcome_titles?: Json | null
          measured_outcome_result?: string | null
          momentum_score?: number | null
          org_id: string
          outcome_category?: string | null
          outcome_category_key?: string | null
          outcome_target?: string | null
          owner: string
          owner_user_id?: string | null
          pod_configuration?: Json | null
          previous_exposure_value?: string | null
          revenue_at_risk?: string | null
          risk_level?: Database["public"]["Enums"]["bet_risk_level"]
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          solution_domain: Database["public"]["Enums"]["solution_domain"]
          sponsor?: string | null
          state_change_note?: string | null
          state_changed_at?: string | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          surface: string
          title: string
          trigger_signal?: string | null
          unplanned_interrupts?: number | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          capacity_allocated?: number | null
          capacity_diverted?: number | null
          created_at?: string | null
          created_by?: string | null
          current_delta?: string | null
          decision_health?: string | null
          escalation_count?: number | null
          executive_attention_required?: boolean
          expected_impact?: string | null
          exposure_value?: string | null
          id?: string
          impact_tier?: string
          legacy_status_text?: string | null
          linked_okr_app?: string | null
          linked_okr_id?: string | null
          linked_okr_title?: string | null
          linked_outcome_ids?: string[] | null
          linked_outcome_titles?: Json | null
          measured_outcome_result?: string | null
          momentum_score?: number | null
          org_id?: string
          outcome_category?: string | null
          outcome_category_key?: string | null
          outcome_target?: string | null
          owner?: string
          owner_user_id?: string | null
          pod_configuration?: Json | null
          previous_exposure_value?: string | null
          revenue_at_risk?: string | null
          risk_level?: Database["public"]["Enums"]["bet_risk_level"]
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          solution_domain?: Database["public"]["Enums"]["solution_domain"]
          sponsor?: string | null
          state_change_note?: string | null
          state_changed_at?: string | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          surface?: string
          title?: string
          trigger_signal?: string | null
          unplanned_interrupts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_outcome_category_key_fk"
            columns: ["outcome_category_key"]
            isOneToOne: false
            referencedRelation: "outcome_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string | null
          feedback_type: string | null
          id: string
          message: string
          org_id: string | null
          page: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message: string
          org_id?: string | null
          page?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message?: string
          org_id?: string | null
          page?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_friction_points: {
        Row: {
          cluster: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          org_id: string
          severity: string
          source_id: string
          summary: string
          title: string
        }
        Insert: {
          cluster?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          org_id: string
          severity?: string
          source_id: string
          summary: string
          title: string
        }
        Update: {
          cluster?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          org_id?: string
          severity?: string
          source_id?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "intel_friction_points_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intel_friction_points_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intel_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_hypotheses: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          description: string
          effort_score: number | null
          expected_impact: string | null
          id: string
          org_id: string
          promoted_at: string | null
          promoted_to_roadmap: boolean | null
          source_id: string
          title: string
          v_squared: number | null
          value_score: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          description: string
          effort_score?: number | null
          expected_impact?: string | null
          id?: string
          org_id: string
          promoted_at?: string | null
          promoted_to_roadmap?: boolean | null
          source_id: string
          title: string
          v_squared?: number | null
          value_score?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          effort_score?: number | null
          expected_impact?: string | null
          id?: string
          org_id?: string
          promoted_at?: string | null
          promoted_to_roadmap?: boolean | null
          source_id?: string
          title?: string
          v_squared?: number | null
          value_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intel_hypotheses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intel_hypotheses_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intel_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          org_id: string
          severity: string
          source_id: string
          summary: string
          title: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          org_id: string
          severity?: string
          source_id: string
          summary: string
          title: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          org_id?: string
          severity?: string
          source_id?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "intel_insights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intel_insights_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intel_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_sources: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          org_id: string
          processing_status: string
          source_type: string
          uploaded_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          processing_status?: string
          source_type?: string
          uploaded_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          processing_status?: string
          source_type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intel_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          current_value: number | null
          id: string
          metric_type: string
          okr_id: string
          org_id: string
          status: string
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric_type?: string
          okr_id: string
          org_id: string
          status?: string
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric_type?: string
          okr_id?: string
          org_id?: string
          status?: string
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_results_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "okrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loop_versions: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          decision: Database["public"]["Enums"]["loop_decision"] | null
          decision_notes: string | null
          id: string
          learning: string | null
          learning_date: string | null
          loop_id: string
          ship_date: string | null
          ship_summary: string | null
          status: Database["public"]["Enums"]["loop_status"] | null
          version_number: number
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["loop_decision"] | null
          decision_notes?: string | null
          id?: string
          learning?: string | null
          learning_date?: string | null
          loop_id: string
          ship_date?: string | null
          ship_summary?: string | null
          status?: Database["public"]["Enums"]["loop_status"] | null
          version_number: number
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["loop_decision"] | null
          decision_notes?: string | null
          id?: string
          learning?: string | null
          learning_date?: string | null
          loop_id?: string
          ship_date?: string | null
          ship_summary?: string | null
          status?: Database["public"]["Enums"]["loop_status"] | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "loop_versions_loop_id_fkey"
            columns: ["loop_id"]
            isOneToOne: false
            referencedRelation: "outcome_loops"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_check_ins: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          id: string
          key_result_id: string
          notes: string | null
          org_id: string
          value: number
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          key_result_id: string
          notes?: string | null
          org_id: string
          value: number
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          key_result_id?: string
          notes?: string | null
          org_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "okr_check_ins_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_check_ins_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      okrs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          org_id: string
          owner_id: string | null
          quarter: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          org_id: string
          owner_id?: string | null
          quarter?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          org_id?: string
          owner_id?: string | null
          quarter?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okrs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_access_allowlist: {
        Row: {
          created_at: string
          email: string
          org_id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          org_id: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          org_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_access_allowlist_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_join_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          org_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          org_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          org_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_join_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_migration_log: {
        Row: {
          id: string
          migrated_at: string | null
          migrated_by: string | null
          notes: string | null
          source_org_id: string
          source_tool: string
          target_org_id: string
        }
        Insert: {
          id?: string
          migrated_at?: string | null
          migrated_by?: string | null
          notes?: string | null
          source_org_id: string
          source_tool: string
          target_org_id: string
        }
        Update: {
          id?: string
          migrated_at?: string | null
          migrated_by?: string | null
          notes?: string | null
          source_org_id?: string
          source_tool?: string
          target_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_migration_log_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tool_access: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          org_id: string
          tool: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          org_id: string
          tool: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          org_id?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_tool_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string | null
          id: string
          org_id: string | null
          role: string | null
          role_label: string | null
          source_tool: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          role?: string | null
          role_label?: string | null
          source_tool?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          role?: string | null
          role_label?: string | null
          source_tool?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          allowed_email_domain: string | null
          created_at: string | null
          created_by: string | null
          custom_outcome_categories: Json | null
          id: string
          name: string
          product_areas: Json
          setup_complete: boolean
          updated_at: string | null
        }
        Insert: {
          allowed_email_domain?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_outcome_categories?: Json | null
          id?: string
          name: string
          product_areas?: Json
          setup_complete?: boolean
          updated_at?: string | null
        }
        Update: {
          allowed_email_domain?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_outcome_categories?: Json | null
          id?: string
          name?: string
          product_areas?: Json
          setup_complete?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      outcome_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      outcome_loops: {
        Row: {
          bet_id: string
          contributors: Json | null
          created_at: string
          created_by: string | null
          current_decision: Database["public"]["Enums"]["loop_decision"]
          decision_notes: string | null
          hypothesis: string | null
          id: string
          last_learning: string | null
          last_learning_date: string | null
          last_ship_date: string | null
          last_ship_summary: string | null
          org_id: string
          owner_user_id: string
          priority: number
          status: Database["public"]["Enums"]["loop_status"]
          title: string
          updated_at: string
          use_case: string
          version_number: number
        }
        Insert: {
          bet_id: string
          contributors?: Json | null
          created_at?: string
          created_by?: string | null
          current_decision?: Database["public"]["Enums"]["loop_decision"]
          decision_notes?: string | null
          hypothesis?: string | null
          id?: string
          last_learning?: string | null
          last_learning_date?: string | null
          last_ship_date?: string | null
          last_ship_summary?: string | null
          org_id: string
          owner_user_id: string
          priority?: number
          status?: Database["public"]["Enums"]["loop_status"]
          title: string
          updated_at?: string
          use_case: string
          version_number?: number
        }
        Update: {
          bet_id?: string
          contributors?: Json | null
          created_at?: string
          created_by?: string | null
          current_decision?: Database["public"]["Enums"]["loop_decision"]
          decision_notes?: string | null
          hypothesis?: string | null
          id?: string
          last_learning?: string | null
          last_learning_date?: string | null
          last_ship_date?: string | null
          last_ship_summary?: string | null
          org_id?: string
          owner_user_id?: string
          priority?: number
          status?: Database["public"]["Enums"]["loop_status"]
          title?: string
          updated_at?: string
          use_case?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "outcome_loops_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_loops_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_loops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes: {
        Row: {
          bet_id: string | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          org_id: string
          owner_id: string | null
          shipped_date: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bet_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          org_id: string
          owner_id?: string | null
          shipped_date?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bet_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          shipped_date?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcomes_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcomes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invitations: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          org_id: string
          role: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pod_initiatives: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          pod_id: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          pod_id: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          pod_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_initiatives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pod_initiatives_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          pod_initiatives: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          pod_initiatives?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          pod_initiatives?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_events: {
        Row: {
          created_at: string
          event_name: string
          id: number
          metadata: Json
          org_id: string | null
          route: string | null
          session_id: string | null
          severity: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: number
          metadata?: Json
          org_id?: string | null
          route?: string | null
          session_id?: string | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: number
          metadata?: Json
          org_id?: string | null
          route?: string | null
          session_id?: string | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          initials: string | null
          notification_settings: Json | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          initials?: string | null
          notification_settings?: Json | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          initials?: string | null
          notification_settings?: Json | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          bet_id: string | null
          created_at: string | null
          description: string | null
          id: string
          org_id: string
          outcome_id: string | null
          quarter: string | null
          status: string
          title: string
        }
        Insert: {
          bet_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          org_id: string
          outcome_id?: string | null
          quarter?: string | null
          status?: string
          title: string
        }
        Update: {
          bet_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          org_id?: string
          outcome_id?: string | null
          quarter?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history: {
        Row: {
          bet_id: string
          calculated_at: string | null
          id: string
          initiative_id: string
          new_rank: number
          new_score: number
          previous_rank: number
          previous_score: number
          trigger_event: string
        }
        Insert: {
          bet_id: string
          calculated_at?: string | null
          id?: string
          initiative_id: string
          new_rank: number
          new_score: number
          previous_rank: number
          previous_score: number
          trigger_event: string
        }
        Update: {
          bet_id?: string
          calculated_at?: string | null
          id?: string
          initiative_id?: string
          new_rank?: number
          new_score?: number
          previous_rank?: number
          previous_score?: number
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_history_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "bet_initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          payload: Json | null
          severity: string | null
          source: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          payload?: Json | null
          severity?: string | null
          source?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          payload?: Json | null
          severity?: string | null
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      story_votes: {
        Row: {
          created_at: string | null
          episode_id: string
          id: string
          option_chosen: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          episode_id: string
          id?: string
          option_chosen: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          episode_id?: string
          id?: string
          option_chosen?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      decisions_computed: {
        Row: {
          activated_at: string | null
          age_days: number | null
          blocked_dependency_owner: string | null
          blocked_reason: string | null
          capacity_allocated: number | null
          capacity_diverted: number | null
          created_at: string | null
          created_by: string | null
          current_delta: string | null
          decision_health: string | null
          escalation_count: number | null
          executive_attention_required: boolean | null
          expected_impact: string | null
          exposure_value: string | null
          id: string | null
          impact_tier: string | null
          is_aging: boolean | null
          is_exceeded: boolean | null
          is_unbound: boolean | null
          is_urgent: boolean | null
          legacy_status_text: string | null
          measured_outcome_result: string | null
          momentum_score: number | null
          needs_exec_attention: boolean | null
          org_id: string | null
          outcome_category: string | null
          outcome_category_key: string | null
          outcome_target: string | null
          owner: string | null
          owner_user_id: string | null
          pod_configuration: Json | null
          previous_exposure_value: string | null
          revenue_at_risk: string | null
          risk_level: Database["public"]["Enums"]["bet_risk_level"] | null
          segment_impact: string | null
          shipped_slice_date: string | null
          slice_deadline_days: number | null
          slice_due_at: string | null
          slice_remaining: number | null
          solution_domain: Database["public"]["Enums"]["solution_domain"] | null
          sponsor: string | null
          state_change_note: string | null
          state_changed_at: string | null
          status: Database["public"]["Enums"]["decision_status"] | null
          surface: string | null
          title: string | null
          trigger_signal: string | null
          unplanned_interrupts: number | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          age_days?: never
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          capacity_allocated?: number | null
          capacity_diverted?: number | null
          created_at?: string | null
          created_by?: string | null
          current_delta?: string | null
          decision_health?: string | null
          escalation_count?: number | null
          executive_attention_required?: boolean | null
          expected_impact?: string | null
          exposure_value?: string | null
          id?: string | null
          impact_tier?: string | null
          is_aging?: never
          is_exceeded?: never
          is_unbound?: never
          is_urgent?: never
          legacy_status_text?: string | null
          measured_outcome_result?: string | null
          momentum_score?: number | null
          needs_exec_attention?: never
          org_id?: string | null
          outcome_category?: string | null
          outcome_category_key?: string | null
          outcome_target?: string | null
          owner?: string | null
          owner_user_id?: string | null
          pod_configuration?: Json | null
          previous_exposure_value?: string | null
          revenue_at_risk?: string | null
          risk_level?: Database["public"]["Enums"]["bet_risk_level"] | null
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          slice_remaining?: never
          solution_domain?:
            | Database["public"]["Enums"]["solution_domain"]
            | null
          sponsor?: string | null
          state_change_note?: string | null
          state_changed_at?: string | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          surface?: string | null
          title?: string | null
          trigger_signal?: string | null
          unplanned_interrupts?: number | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          age_days?: never
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          capacity_allocated?: number | null
          capacity_diverted?: number | null
          created_at?: string | null
          created_by?: string | null
          current_delta?: string | null
          decision_health?: string | null
          escalation_count?: number | null
          executive_attention_required?: boolean | null
          expected_impact?: string | null
          exposure_value?: string | null
          id?: string | null
          impact_tier?: string | null
          is_aging?: never
          is_exceeded?: never
          is_unbound?: never
          is_urgent?: never
          legacy_status_text?: string | null
          measured_outcome_result?: string | null
          momentum_score?: number | null
          needs_exec_attention?: never
          org_id?: string | null
          outcome_category?: string | null
          outcome_category_key?: string | null
          outcome_target?: string | null
          owner?: string | null
          owner_user_id?: string | null
          pod_configuration?: Json | null
          previous_exposure_value?: string | null
          revenue_at_risk?: string | null
          risk_level?: Database["public"]["Enums"]["bet_risk_level"] | null
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          slice_remaining?: never
          solution_domain?:
            | Database["public"]["Enums"]["solution_domain"]
            | null
          sponsor?: string | null
          state_change_note?: string | null
          state_changed_at?: string | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          surface?: string | null
          title?: string | null
          trigger_signal?: string | null
          unplanned_interrupts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_outcome_category_key_fk"
            columns: ["outcome_category_key"]
            isOneToOne: false
            referencedRelation: "outcome_categories"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Functions: {
      approve_join_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      bulk_update_initiative_scores: {
        Args: { updates: Json }
        Returns: undefined
      }
      deny_join_request: { Args: { p_request_id: string }; Returns: undefined }
      find_org_by_email_domain: {
        Args: { p_domain: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_org_members: {
        Args: { target_org_id: string }
        Returns: {
          display_name: string
          email: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_overview_metrics: { Args: { _org_id: string }; Returns: Json }
      get_user_role_in_org: {
        Args: { org_id: string; user_id: string }
        Returns: string
      }
      is_admin_of_org: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      is_workspace_email_allowed: { Args: never; Returns: boolean }
      org_has_tool_access: {
        Args: { _org_id: string; _tool: string }
        Returns: boolean
      }
      request_to_join_org: { Args: { p_org_id: string }; Returns: string }
    }
    Enums: {
      bet_risk_level: "healthy" | "watch" | "at_risk"
      capability_pod_status:
        | "proposed"
        | "prototyping"
        | "validated"
        | "building"
        | "in_production"
        | "paused"
      decision_status:
        | "defined"
        | "activated"
        | "proving_value"
        | "scaling"
        | "durable"
        | "closed"
      loop_decision: "scale" | "iterate" | "kill" | "unclear"
      loop_status: "proposed" | "active" | "iterating" | "completed" | "killed"
      solution_domain: "S1" | "S2" | "S3" | "Cross" | "S4" | "S5" | "S6" | "S7"
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
      bet_risk_level: ["healthy", "watch", "at_risk"],
      capability_pod_status: [
        "proposed",
        "prototyping",
        "validated",
        "building",
        "in_production",
        "paused",
      ],
      decision_status: [
        "defined",
        "activated",
        "proving_value",
        "scaling",
        "durable",
        "closed",
      ],
      loop_decision: ["scale", "iterate", "kill", "unclear"],
      loop_status: ["proposed", "active", "iterating", "completed", "killed"],
      solution_domain: ["S1", "S2", "S3", "Cross", "S4", "S5", "S6", "S7"],
    },
  },
} as const
