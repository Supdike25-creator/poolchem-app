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
          email: string;
          full_name: string;
          role: 'manager' | 'guard';
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'manager' | 'guard';
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'manager' | 'guard';
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pools: {
        Row: {
          id: string;
          name: string;
          organization_id: string;
          volume_gallons: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organization_id: string;
          volume_gallons: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          organization_id?: string;
          volume_gallons?: number;
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
          logged_at: string;
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