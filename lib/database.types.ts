// Database types for ChemDeck application
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: 'manager' | 'supervisor' | 'lifeguard' | 'admin';
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: 'manager' | 'supervisor' | 'lifeguard' | 'admin';
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: 'manager' | 'supervisor' | 'lifeguard' | 'admin';
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pools: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          volume_gallons: number | null;
          pool_type: string | null;
          is_baby_pool: boolean | null;
          target_chlorine_min: number | null;
          target_chlorine_max: number | null;
          target_ph_min: number | null;
          target_ph_max: number | null;
          default_chlorine_type: string | null;
          default_chlorine_strength: number | null;
          max_single_dose_oz: number | null;
          retest_minutes: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          volume_gallons?: number | null;
          pool_type?: string | null;
          is_baby_pool?: boolean | null;
          target_chlorine_min?: number | null;
          target_chlorine_max?: number | null;
          target_ph_min?: number | null;
          target_ph_max?: number | null;
          default_chlorine_type?: string | null;
          default_chlorine_strength?: number | null;
          max_single_dose_oz?: number | null;
          retest_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          volume_gallons?: number | null;
          pool_type?: string | null;
          is_baby_pool?: boolean | null;
          target_chlorine_min?: number | null;
          target_chlorine_max?: number | null;
          target_ph_min?: number | null;
          target_ph_max?: number | null;
          default_chlorine_type?: string | null;
          default_chlorine_strength?: number | null;
          max_single_dose_oz?: number | null;
          retest_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chemical_logs: {
        Row: {
          id: string;
          pool_id: string;
          user_id: string;
          chemical_type: string;
          amount: number;
          unit: string;
          notes: string | null;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          user_id: string;
          chemical_type: string;
          amount: number;
          unit: string;
          notes?: string | null;
          logged_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          user_id?: string;
          chemical_type?: string;
          amount?: number;
          unit?: string;
          notes?: string | null;
          logged_at?: string;
          created_at?: string;
        };
      };
    };
  };
}