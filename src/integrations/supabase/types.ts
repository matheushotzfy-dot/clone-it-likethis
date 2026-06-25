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
      ad_spend: {
        Row: {
          amount: number
          campaign: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          platform: string
          spend_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          campaign?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          platform?: string
          spend_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          platform?: string
          spend_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string
          link_url: string | null
          sort_order: number
          title: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url: string
          link_url?: string | null
          sort_order?: number
          title?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string
          link_url?: string | null
          sort_order?: number
          title?: string | null
        }
        Relationships: []
      }
      game_rounds: {
        Row: {
          after_balance: number | null
          before_balance: number | null
          bet: number
          created_at: string
          game_code: string | null
          game_type: string | null
          id: string
          payload: Json | null
          provider: string | null
          round_id: string | null
          txn_id: string
          txn_type: string | null
          user_id: string
          win: number
        }
        Insert: {
          after_balance?: number | null
          before_balance?: number | null
          bet?: number
          created_at?: string
          game_code?: string | null
          game_type?: string | null
          id?: string
          payload?: Json | null
          provider?: string | null
          round_id?: string | null
          txn_id: string
          txn_type?: string | null
          user_id: string
          win?: number
        }
        Update: {
          after_balance?: number | null
          before_balance?: number | null
          bet?: number
          created_at?: string
          game_code?: string | null
          game_type?: string | null
          id?: string
          payload?: Json | null
          provider?: string | null
          round_id?: string | null
          txn_id?: string
          txn_type?: string | null
          user_id?: string
          win?: number
        }
        Relationships: []
      }
      gateway_credentials: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      gateway_reconciliation: {
        Row: {
          created_at: string
          created_by: string | null
          fees: number
          id: string
          notes: string | null
          real_amount: number
          ref_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fees?: number
          id?: string
          notes?: string | null
          real_amount?: number
          ref_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fees?: number
          id?: string
          notes?: string | null
          real_amount?: number
          ref_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          created_at: string
          document_type: string
          id: string
          id_back_url: string | null
          id_front_url: string
          rejection_reason: string | null
          residence_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["kyc_submission_status"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          id?: string
          id_back_url?: string | null
          id_front_url: string
          rejection_reason?: string | null
          residence_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["kyc_submission_status"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string
          rejection_reason?: string | null
          residence_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["kyc_submission_status"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          bonus_balance: number
          bonus_expires_at: string | null
          bonus_used: boolean
          cpf: string | null
          created_at: string
          fbc: string | null
          fbp: string | null
          freeze_reason: string | null
          full_name: string | null
          id: string
          is_frozen: boolean
          kyc_status: string
          kyc_verified: boolean
          phone: string | null
          referrer: string | null
          signup_ip: string | null
          signup_user_agent: string | null
          updated_at: string
          username: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          bonus_balance?: number
          bonus_expires_at?: string | null
          bonus_used?: boolean
          cpf?: string | null
          created_at?: string
          fbc?: string | null
          fbp?: string | null
          freeze_reason?: string | null
          full_name?: string | null
          id: string
          is_frozen?: boolean
          kyc_status?: string
          kyc_verified?: boolean
          phone?: string | null
          referrer?: string | null
          signup_ip?: string | null
          signup_user_agent?: string | null
          updated_at?: string
          username?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          bonus_balance?: number
          bonus_expires_at?: string | null
          bonus_used?: boolean
          cpf?: string | null
          created_at?: string
          fbc?: string | null
          fbp?: string | null
          freeze_reason?: string | null
          full_name?: string | null
          id?: string
          is_frozen?: boolean
          kyc_status?: string
          kyc_verified?: boolean
          phone?: string | null
          referrer?: string | null
          signup_ip?: string | null
          signup_user_agent?: string | null
          updated_at?: string
          username?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          gateway_external_id: string | null
          gateway_qrcode: string | null
          id: string
          kyc_required: boolean
          kyc_submission_id: string | null
          pix_key: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          gateway_external_id?: string | null
          gateway_qrcode?: string | null
          id?: string
          kyc_required?: boolean
          kyc_submission_id?: string | null
          pix_key?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          gateway_external_id?: string | null
          gateway_qrcode?: string | null
          id?: string
          kyc_required?: boolean
          kyc_submission_id?: string | null
          pix_key?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_playfivers_transaction: {
        Args: {
          p_bet: number
          p_game_code: string
          p_game_type: string
          p_payload: Json
          p_provider: string
          p_round_id: string
          p_txn_id: string
          p_txn_type: string
          p_user_id: string
          p_win: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_sports_bet: {
        Args: {
          p_description: string
          p_match_id: string
          p_odd: number
          p_pick: string
          p_stake: number
          p_user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
      kyc_submission_status: "pending" | "approved" | "rejected"
      transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
        | "approved"
        | "rejected"
      transaction_type: "deposit" | "withdrawal" | "bet" | "win" | "bonus"
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
      app_role: ["admin", "user"],
      kyc_submission_status: ["pending", "approved", "rejected"],
      transaction_status: [
        "pending",
        "completed",
        "failed",
        "cancelled",
        "approved",
        "rejected",
      ],
      transaction_type: ["deposit", "withdrawal", "bet", "win", "bonus"],
    },
  },
} as const
