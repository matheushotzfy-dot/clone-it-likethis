export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ad_spend: {
        Row: {
          amount: number;
          campaign: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          notes: string | null;
          platform: string;
          spend_date: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          campaign?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          notes?: string | null;
          platform?: string;
          spend_date: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          campaign?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          notes?: string | null;
          platform?: string;
          spend_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          action: string;
          admin_id: string | null;
          created_at: string;
          details: Json;
          id: number;
          target_id: string | null;
          target_user: string | null;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_id?: string | null;
          target_user?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_id?: string | null;
          target_user?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
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
      banners: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          image_url: string;
          link_url: string | null;
          sort_order: number;
          title: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          image_url: string;
          link_url?: string | null;
          sort_order?: number;
          title?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          image_url?: string;
          link_url?: string | null;
          sort_order?: number;
          title?: string | null;
        };
        Relationships: [];
      };
      game_launches: {
        Row: {
          balance: number | null;
          created_at: string;
          error: string | null;
          game_code: string;
          game_name: string | null;
          id: number;
          ok: boolean;
          provider_code: string;
          user_id: string;
        };
        Insert: {
          balance?: number | null;
          created_at?: string;
          error?: string | null;
          game_code: string;
          game_name?: string | null;
          id?: never;
          ok: boolean;
          provider_code: string;
          user_id: string;
        };
        Update: {
          balance?: number | null;
          created_at?: string;
          error?: string | null;
          game_code?: string;
          game_name?: string | null;
          id?: never;
          ok?: boolean;
          provider_code?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_launches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      game_rounds: {
        Row: {
          after_balance: number | null;
          before_balance: number | null;
          bet: number;
          created_at: string;
          game_code: string | null;
          game_type: string | null;
          id: string;
          payload: Json | null;
          provider: string | null;
          refunded_at: string | null;
          round_id: string | null;
          status: string;
          txn_id: string;
          txn_type: string | null;
          user_id: string;
          win: number;
        };
        Insert: {
          after_balance?: number | null;
          before_balance?: number | null;
          bet?: number;
          created_at?: string;
          game_code?: string | null;
          game_type?: string | null;
          id?: string;
          payload?: Json | null;
          provider?: string | null;
          refunded_at?: string | null;
          round_id?: string | null;
          status?: string;
          txn_id: string;
          txn_type?: string | null;
          user_id: string;
          win?: number;
        };
        Update: {
          after_balance?: number | null;
          before_balance?: number | null;
          bet?: number;
          created_at?: string;
          game_code?: string | null;
          game_type?: string | null;
          id?: string;
          payload?: Json | null;
          provider?: string | null;
          refunded_at?: string | null;
          round_id?: string | null;
          status?: string;
          txn_id?: string;
          txn_type?: string | null;
          user_id?: string;
          win?: number;
        };
        Relationships: [];
      };
      games: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          featured: boolean;
          game_code: string;
          id: number;
          image_url: string | null;
          is_original: boolean;
          last_seen_at: string;
          name: string;
          provider: string;
          provider_code: string;
          sort_order: number;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category?: string;
          created_at?: string;
          featured?: boolean;
          game_code: string;
          id?: never;
          image_url?: string | null;
          is_original?: boolean;
          last_seen_at?: string;
          name: string;
          provider: string;
          provider_code: string;
          sort_order?: number;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          featured?: boolean;
          game_code?: string;
          id?: never;
          image_url?: string | null;
          is_original?: boolean;
          last_seen_at?: string;
          name?: string;
          provider?: string;
          provider_code?: string;
          sort_order?: number;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      gateway_credentials: {
        Row: {
          key: string;
          updated_at: string;
          value: string | null;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: string | null;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string | null;
        };
        Relationships: [];
      };
      gateway_reconciliation: {
        Row: {
          created_at: string;
          created_by: string | null;
          fees: number;
          id: string;
          notes: string | null;
          real_amount: number;
          ref_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          fees?: number;
          id?: string;
          notes?: string | null;
          real_amount?: number;
          ref_date: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          fees?: number;
          id?: string;
          notes?: string | null;
          real_amount?: number;
          ref_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kyc_submissions: {
        Row: {
          created_at: string;
          document_type: string;
          id: string;
          id_back_url: string | null;
          id_front_url: string;
          rejection_reason: string | null;
          residence_url: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          selfie_url: string;
          status: Database["public"]["Enums"]["kyc_submission_status"];
          transaction_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          document_type?: string;
          id?: string;
          id_back_url?: string | null;
          id_front_url: string;
          rejection_reason?: string | null;
          residence_url: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_url: string;
          status?: Database["public"]["Enums"]["kyc_submission_status"];
          transaction_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          document_type?: string;
          id?: string;
          id_back_url?: string | null;
          id_front_url?: string;
          rejection_reason?: string | null;
          residence_url?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          selfie_url?: string;
          status?: Database["public"]["Enums"]["kyc_submission_status"];
          transaction_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      pf_callback_log: {
        Row: {
          balance: number | null;
          created_at: string;
          http_status: number;
          id: number;
          kind: string;
          payload: Json | null;
          provider_balance: number | null;
          result: string;
          txn_id: string | null;
          user_id: string | null;
        };
        Insert: {
          balance?: number | null;
          created_at?: string;
          http_status: number;
          id?: never;
          kind: string;
          payload?: Json | null;
          provider_balance?: number | null;
          result: string;
          txn_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          balance?: number | null;
          created_at?: string;
          http_status?: number;
          id?: never;
          kind?: string;
          payload?: Json | null;
          provider_balance?: number | null;
          result?: string;
          txn_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          balance: number;
          birth_date: string | null;
          bonus_balance: number;
          bonus_expires_at: string | null;
          bonus_used: boolean;
          cpf: string | null;
          created_at: string;
          fbc: string | null;
          fbp: string | null;
          freeze_reason: string | null;
          full_name: string | null;
          id: string;
          is_frozen: boolean;
          kyc_status: string;
          kyc_verified: boolean;
          last_seen_at: string | null;
          phone: string | null;
          referrer: string | null;
          signup_ip: string | null;
          signup_user_agent: string | null;
          updated_at: string;
          username: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          utm_term: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          balance?: number;
          birth_date?: string | null;
          bonus_balance?: number;
          bonus_expires_at?: string | null;
          bonus_used?: boolean;
          cpf?: string | null;
          created_at?: string;
          fbc?: string | null;
          fbp?: string | null;
          freeze_reason?: string | null;
          full_name?: string | null;
          id: string;
          is_frozen?: boolean;
          kyc_status?: string;
          kyc_verified?: boolean;
          last_seen_at?: string | null;
          phone?: string | null;
          referrer?: string | null;
          signup_ip?: string | null;
          signup_user_agent?: string | null;
          updated_at?: string;
          username?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          balance?: number;
          birth_date?: string | null;
          bonus_balance?: number;
          bonus_expires_at?: string | null;
          bonus_used?: boolean;
          cpf?: string | null;
          created_at?: string;
          fbc?: string | null;
          fbp?: string | null;
          freeze_reason?: string | null;
          full_name?: string | null;
          id?: string;
          is_frozen?: boolean;
          kyc_status?: string;
          kyc_verified?: boolean;
          last_seen_at?: string | null;
          phone?: string | null;
          referrer?: string | null;
          signup_ip?: string | null;
          signup_user_agent?: string | null;
          updated_at?: string;
          username?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
        };
        Relationships: [];
      };
      rg_limits: {
        Row: {
          deposit_daily: number | null;
          deposit_monthly: number | null;
          deposit_weekly: number | null;
          loss_daily: number | null;
          pending: Json | null;
          pending_effective_at: string | null;
          self_excluded_reason: string | null;
          self_excluded_until: string | null;
          session_minutes: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          deposit_daily?: number | null;
          deposit_monthly?: number | null;
          deposit_weekly?: number | null;
          loss_daily?: number | null;
          pending?: Json | null;
          pending_effective_at?: string | null;
          self_excluded_reason?: string | null;
          self_excluded_until?: string | null;
          session_minutes?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          deposit_daily?: number | null;
          deposit_monthly?: number | null;
          deposit_weekly?: number | null;
          loss_daily?: number | null;
          pending?: Json | null;
          pending_effective_at?: string | null;
          self_excluded_reason?: string | null;
          self_excluded_until?: string | null;
          session_minutes?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rg_limits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sports_bets: {
        Row: {
          away: string;
          created_at: string;
          event_id: string;
          home: string;
          id: string;
          league: string;
          league_name: string | null;
          odd: number;
          pick: string;
          potential_payout: number;
          score_away: number | null;
          score_home: number | null;
          settle_note: string | null;
          settled_at: string | null;
          settled_by: string | null;
          stake: number;
          starts_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          away: string;
          created_at?: string;
          event_id: string;
          home: string;
          id?: string;
          league: string;
          league_name?: string | null;
          odd: number;
          pick: string;
          potential_payout: number;
          score_away?: number | null;
          score_home?: number | null;
          settle_note?: string | null;
          settled_at?: string | null;
          settled_by?: string | null;
          stake: number;
          starts_at?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          away?: string;
          created_at?: string;
          event_id?: string;
          home?: string;
          id?: string;
          league?: string;
          league_name?: string | null;
          odd?: number;
          pick?: string;
          potential_payout?: number;
          score_away?: number | null;
          score_home?: number | null;
          settle_note?: string | null;
          settled_at?: string | null;
          settled_by?: string | null;
          stake?: number;
          starts_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sports_bets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          created_at: string;
          decided_at: string | null;
          description: string | null;
          fee: number;
          gateway_external_id: string | null;
          gateway_qrcode: string | null;
          id: string;
          kyc_required: boolean;
          kyc_submission_id: string | null;
          pix_key: string | null;
          status: Database["public"]["Enums"]["transaction_status"];
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          decided_at?: string | null;
          description?: string | null;
          fee?: number;
          gateway_external_id?: string | null;
          gateway_qrcode?: string | null;
          id?: string;
          kyc_required?: boolean;
          kyc_submission_id?: string | null;
          pix_key?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          decided_at?: string | null;
          description?: string | null;
          fee?: number;
          gateway_external_id?: string | null;
          gateway_qrcode?: string | null;
          id?: string;
          kyc_required?: boolean;
          kyc_submission_id?: string | null;
          pix_key?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          type?: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wallet_ledger: {
        Row: {
          amount: number;
          balance_after: number;
          balance_before: number;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: number;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["ledger_kind"];
          meta: Json;
          ref_id: string | null;
          ref_table: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          balance_before: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: never;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["ledger_kind"];
          meta?: Json;
          ref_id?: string | null;
          ref_table?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          balance_before?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: never;
          idempotency_key?: string;
          kind?: Database["public"]["Enums"]["ledger_kind"];
          meta?: Json;
          ref_id?: string | null;
          ref_table?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      admin_player_summary: {
        Row: {
          adjustments: number | null;
          balance: number | null;
          casino_bets: number | null;
          casino_wins: number | null;
          cpf: string | null;
          created_at: string | null;
          deposits: number | null;
          full_name: string | null;
          ggr: number | null;
          is_frozen: boolean | null;
          last_bet_at: string | null;
          last_seen_at: string | null;
          phone: string | null;
          sports_returns: number | null;
          sports_stakes: number | null;
          user_id: string | null;
          username: string | null;
          utm_campaign: string | null;
          utm_source: string | null;
          withdraw_pending: number | null;
          withdrawn: number | null;
        };
        Relationships: [];
      };
      admin_wallet_reconciliation: {
        Row: {
          balance: number | null;
          diff: number | null;
          entries: number | null;
          last_at: string | null;
          ledger_total: number | null;
          user_id: string | null;
          username: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_adjust_balance: {
        Args: {
          p_delta: number;
          p_reason: string;
          p_request_id: string;
          p_user_id: string;
        };
        Returns: number;
      };
      admin_daily_stats: {
        Args: {
          p_days: number;
        };
        Returns: {
          day: string;
          deposits: number;
          deposits_count: number;
          withdrawals: number;
          withdrawals_count: number;
          casino_bets: number;
          casino_wins: number;
          sports_stakes: number;
          sports_returns: number;
          adjustments: number;
          signups: number;
          depositors: number;
          active_players: number;
        }[];
      };
      admin_finance_summary: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          deposits: number;
          deposits_count: number;
          depositors: number;
          withdrawals: number;
          withdrawals_count: number;
          withdrawal_fees: number;
          casino_bets: number;
          casino_wins: number;
          sports_stakes: number;
          sports_returns: number;
          adjustments: number;
          ad_spend: number;
          gateway_real: number;
          gateway_fees: number;
          liability: number;
          pending_withdrawals: number;
        }[];
      };
      admin_game_stats: {
        Args: {
          p_days: number;
          p_limit?: number;
        };
        Returns: {
          provider: string;
          game_code: string;
          game_name: string;
          rounds: number;
          players: number;
          bets: number;
          wins: number;
          ggr: number;
        }[];
      };
      admin_log: {
        Args: {
          p_action: string;
          p_details?: Json;
          p_target_id?: string;
          p_target_user?: string;
        };
        Returns: undefined;
      };
      admin_sports_exposure: {
        Args: never;
        Returns: {
          event_id: string;
          league_name: string;
          home: string;
          away: string;
          starts_at: string;
          bets: number;
          stakes: number;
          payout_home: number;
          payout_draw: number;
          payout_away: number;
        }[];
      };
      apply_playfivers_refund: {
        Args: {
          p_payload: Json;
          p_txn_id: string;
          p_user_id: string;
        };
        Returns: {
          balance: number;
          result: string;
        }[];
      };
      apply_playfivers_transaction: {
        Args: {
          p_bet: number;
          p_game_code: string;
          p_game_type: string;
          p_payload: Json;
          p_provider: string;
          p_round_id: string;
          p_txn_id: string;
          p_txn_type: string;
          p_user_id: string;
          p_win: number;
        };
        Returns: number;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_valid_cpf: {
        Args: {
          p_cpf: string;
        };
        Returns: boolean;
      };
      place_sports_bet: {
        Args: {
          p_away: string;
          p_event_id: string;
          p_home: string;
          p_league: string;
          p_league_name: string;
          p_odd: number;
          p_pick: string;
          p_stake: number;
          p_starts_at: string;
          p_user_id: string;
        };
        Returns: {
          bet_id: string;
          balance: number;
        }[];
      };
      rg_check: {
        Args: {
          p_action: string;
          p_amount: number;
          p_user: string;
        };
        Returns: undefined;
      };
      rg_promote_pending: {
        Args: {
          p_user: string;
        };
        Returns: undefined;
      };
      rg_self_exclude: {
        Args: {
          p_days: number;
          p_reason: string;
        };
        Returns: string;
      };
      rg_set_limits: {
        Args: {
          p_deposit_daily: number;
          p_deposit_monthly: number;
          p_deposit_weekly: number;
          p_loss_daily: number;
          p_session_minutes: number;
        };
        Returns: Json;
      };
      settle_sports_bet: {
        Args: {
          p_bet_id: string;
          p_note?: string;
          p_score_away: number;
          p_score_home: number;
          p_settled_by?: string;
          p_status: string;
        };
        Returns: string;
      };
      touch_last_seen: {
        Args: never;
        Returns: undefined;
      };
      wallet_apply: {
        Args: {
          p_amount: number;
          p_created_by?: string;
          p_description?: string;
          p_key: string;
          p_kind: Database["public"]["Enums"]["ledger_kind"];
          p_meta?: Json;
          p_ref_id?: string;
          p_ref_table?: string;
          p_user: string;
        };
        Returns: number;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      kyc_submission_status: "pending" | "approved" | "rejected";
      ledger_kind:
        | "opening"
        | "deposit"
        | "withdrawal_hold"
        | "withdrawal_release"
        | "casino_bet"
        | "casino_win"
        | "casino_refund"
        | "sports_stake"
        | "sports_payout"
        | "sports_refund"
        | "adjustment";
      transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
        | "approved"
        | "rejected";
      transaction_type: "deposit" | "withdrawal" | "bet" | "win" | "bonus";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      kyc_submission_status: ["pending", "approved", "rejected"],
      ledger_kind: [
        "opening",
        "deposit",
        "withdrawal_hold",
        "withdrawal_release",
        "casino_bet",
        "casino_win",
        "casino_refund",
        "sports_stake",
        "sports_payout",
        "sports_refund",
        "adjustment",
      ],
      transaction_status: ["pending", "completed", "failed", "cancelled", "approved", "rejected"],
      transaction_type: ["deposit", "withdrawal", "bet", "win", "bonus"],
    },
  },
} as const;
