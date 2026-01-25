/**
 * Database Types for Multi-Tenant Application
 * 
 * These types mirror the Supabase schema defined in the migration.
 * In a production setup, these would be auto-generated using:
 * `supabase gen types typescript --project-id <project-id>`
 */

// =============================================================================
// ENUMS
// =============================================================================

export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'internal_auditor'
  | 'supervisor'
  | 'worker';

// =============================================================================
// TABLE ROW TYPES
// =============================================================================

export interface Company {
  id: string;
  name: string;
  wsib_number: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  company_email: string | null;
  registration_status: 'pending' | 'active' | 'suspended';
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  company_id: string;
  role: UserRole;
  invitation_id: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: string | null;
  first_admin: boolean;
  is_active: boolean;
  last_login: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
  hire_date: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  user_id: string | null;
  invitation_id: string | null;
  profile_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Form {
  id: string;
  company_id: string;
  worker_id: string | null;
  form_type: string;
  form_data: Record<string, unknown>;
  created_at: string;
}

export interface EvidenceChain {
  id: string;
  company_id: string;
  audit_element: string;
  evidence_type: string;
  evidence_id: string | null;
  worker_id: string | null;
  timestamp: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkerInvitation {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
  role: UserRole;
  invitation_token: string;
  invited_by: string | null;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
}

// Alias for backward compatibility
export type Invitation = WorkerInvitation;

export interface Certification {
  id: string;
  company_id: string;
  worker_id: string;
  name: string;
  issuing_organization: string | null;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_path: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export type RegistrationTokenStatus = 'pending' | 'used' | 'expired';

export interface RegistrationToken {
  id: string;
  token_hash: string;
  company_name: string;
  wsib_number: string;
  company_email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  registrant_name: string;
  registrant_position: string;
  registrant_email: string;
  status: RegistrationTokenStatus;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface RegistrationAttempt {
  id: string;
  ip_address: string;
  user_agent: string | null;
  company_name: string | null;
  wsib_number: string | null;
  registrant_email: string | null;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

// =============================================================================
// INSERT TYPES (without auto-generated fields)
// =============================================================================

export interface CompanyInsert {
  id?: string;
  name: string;
  wsib_number?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  company_email?: string | null;
  registration_status?: 'pending' | 'active' | 'suspended';
  created_at?: string;
}

export interface UserProfileInsert {
  id?: string;
  user_id: string;
  company_id: string;
  role?: UserRole;
  invitation_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  hire_date?: string | null;
  first_admin?: boolean;
  is_active?: boolean;
  display_name?: string | null;
  created_at?: string;
}

export interface WorkerInsert {
  id?: string;
  company_id?: string; // Auto-injected by safe query
  first_name: string;
  last_name: string;
  email?: string | null;
  position?: string | null;
  hire_date?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  user_id?: string | null;
  invitation_id?: string | null;
  profile_completed?: boolean;
}

export interface WorkerInvitationInsert {
  id?: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
  role?: UserRole;
  invitation_token: string;
  invited_by?: string | null;
  invited_at?: string;
  expires_at?: string;
  status?: InvitationStatus;
}

// Alias for backward compatibility
export type InvitationInsert = WorkerInvitationInsert;

export interface CertificationInsert {
  id?: string;
  company_id?: string;
  worker_id: string;
  name: string;
  issuing_organization?: string | null;
  certificate_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  file_path?: string | null;
  verified?: boolean;
}

export interface FormInsert {
  id?: string;
  company_id?: string; // Auto-injected by safe query
  worker_id?: string | null;
  form_type: string;
  form_data?: Record<string, unknown>;
  created_at?: string;
}

export interface EvidenceChainInsert {
  id?: string;
  company_id?: string; // Auto-injected by safe query
  audit_element: string;
  evidence_type: string;
  evidence_id?: string | null;
  worker_id?: string | null;
  timestamp?: string;
}

// =============================================================================
// UPDATE TYPES (all fields optional except id)
// =============================================================================

export interface CompanyUpdate {
  name?: string;
  wsib_number?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  company_email?: string | null;
  registration_status?: 'pending' | 'active' | 'suspended';
}

export interface UserProfileUpdate {
  role?: UserRole;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  is_active?: boolean;
  last_login?: string | null;
  display_name?: string | null;
}

export interface WorkerUpdate {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  position?: string | null;
  hire_date?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  profile_completed?: boolean;
}

export interface InvitationUpdate {
  status?: InvitationStatus;
  accepted_at?: string;
}

export interface CertificationUpdate {
  name?: string;
  issuing_organization?: string | null;
  certificate_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  file_path?: string | null;
  verified?: boolean;
}

export interface FormUpdate {
  worker_id?: string | null;
  form_type?: string;
  form_data?: Record<string, unknown>;
}

export interface EvidenceChainUpdate {
  audit_element?: string;
  evidence_type?: string;
  evidence_id?: string | null;
  worker_id?: string | null;
}

// =============================================================================
// DATABASE SCHEMA TYPE (for Supabase client typing)
// =============================================================================

type GenericTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: any[];
};

type GenericFunction = {
  Args: Record<string, any> | any;
  Returns: any;
};

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: CompanyInsert;
        Update: CompanyUpdate;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
        Relationships: [];
      };
      workers: {
        Row: Worker;
        Insert: WorkerInsert;
        Update: WorkerUpdate;
        Relationships: [];
      };
      forms: {
        Row: Form;
        Insert: FormInsert;
        Update: FormUpdate;
        Relationships: [];
      };
      evidence_chain: {
        Row: EvidenceChain;
        Insert: EvidenceChainInsert;
        Update: EvidenceChainUpdate;
        Relationships: [];
      };
      worker_invitations: {
        Row: WorkerInvitation;
        Insert: WorkerInvitationInsert;
        Update: InvitationUpdate;
        Relationships: [];
      };
      // Alias for backward compatibility
      invitations: {
        Row: WorkerInvitation;
        Insert: WorkerInvitationInsert;
        Update: InvitationUpdate;
        Relationships: [];
      };
      certifications: {
        Row: Certification;
        Insert: CertificationInsert;
        Update: CertificationUpdate;
        Relationships: [];
      };
      /**
       * Catch-all table typing.
       *
       * Many parts of the app query tables not yet represented in this
       * hand-maintained schema. Without this index signature, Supabase's
       * generics treat unknown tables as `never`, causing cascading TS errors.
       *
       * Prefer running `npm run db:types` to generate exact types long-term.
       */
      [table: string]: GenericTable;
    };
    Views: {
      [view: string]: GenericTable;
    };
    Enums: {
      user_role: UserRole;
      invitation_status: InvitationStatus;
      [enumName: string]: string;
    };
    Functions: {
      get_user_company_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      generate_invitation_token: {
        Args: Record<string, never>;
        Returns: string;
      };
      check_invitation_expired: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_invitation_details: {
        Args: { p_invitation_token: string };
        Returns: {
          valid: boolean;
          error?: string;
          status?: string;
          invitation?: {
            email: string;
            first_name: string;
            last_name: string;
            position: string;
            role: UserRole;
            company_name: string;
            expires_at: string;
          };
        };
      };
      accept_worker_invitation: {
        Args: {
          p_invitation_token: string;
          p_user_id: string;
          p_phone?: string | null;
          p_emergency_contact_name?: string | null;
          p_emergency_contact_phone?: string | null;
        };
        Returns: {
          success: boolean;
          error?: string;
          profile_id?: string;
          worker_id?: string;
          company_id?: string;
          role?: UserRole;
          first_name?: string;
          last_name?: string;
        };
      };
      // Legacy function aliases
      validate_invitation_token: {
        Args: { p_token_hash: string };
        Returns: {
          invitation_id: string;
          company_id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: UserRole;
          position: string | null;
          company_name: string;
        }[];
      };
      accept_invitation: {
        Args: {
          p_token_hash: string;
          p_user_id: string;
          p_phone?: string | null;
          p_emergency_contact_name?: string | null;
          p_emergency_contact_phone?: string | null;
        };
        Returns: {
          success: boolean;
          error?: string;
          worker_id?: string;
          profile_id?: string;
          company_id?: string;
          role?: UserRole;
        };
      };
      [fn: string]: GenericFunction;
    };
    CompositeTypes: {
      [name: string]: unknown;
    };
  };
}

// =============================================================================
// QUERY RESULT TYPES
// =============================================================================

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

export interface QueryListResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}
