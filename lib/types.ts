// ─── Enums ────────────────────────────────────────────────────────────────────

export enum IssueType {
  Pothole            = 'Pothole',
  Garbage            = 'Garbage',
  BrokenStreetlight  = 'Broken Streetlight',
  Encroachment       = 'Encroachment',
  Waterlogging       = 'Waterlogging',
  Other              = 'Other',
}

export type Severity = 'low' | 'medium' | 'high'
export type ReportStatus = 'open' | 'in_progress' | 'resolved'

// ─── Report ───────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  created_at: string
  lat: number
  lng: number
  ward_name: string | null
  issue_type: string | null
  severity: string | null
  description: string | null
  image_url: string | null
  report_hash: string | null
  status: string
  email_draft: string | null
  email_subject: string | null
  email_recipient: string | null
  location: unknown | null
  cluster_id: string | null
  triage_level: number
  cluster_count: number
  locality_name: string | null
  pincode: string | null
  nearest_landmark: string | null
  manual_location: boolean | null
  report_id_human: string | null

  tweet_primary: string | null
  tweet_reply_evidence: string | null
  tweet_reply_escalation: string | null

  citizen_email: string | null
  officer_token: string | null
  status_history: Array<{ status: string; at: string }> | null
  resolved_at: string | null
  acknowledged_at: string | null
  escalated_at: string | null
  last_followup_at: string | null
  escalation_level: number | null
  rti_draft: string | null
  rti_generated_at: string | null
  forwarded_channels: Array<{ channel: string; at: string }> | null

  image_phash: string | null

  resolution_image_url: string | null
  resolved_by: 'community_ai' | 'cron_system' | 'officer' | 'manual' | null
  resolution_confidence: number | null
  resolution_note: string | null
  resolution_attempts: number | null
}

export interface TweetThread {
  tweets: string[]
}

// ─── Ward ─────────────────────────────────────────────────────────────────────

export type BengaluruZone = 'North' | 'South' | 'East' | 'West' | 'Central' | 'Bommanahalli' | 'Dasarahalli' | 'RR Nagar'

export interface WardData {
  ward_name: string
  officer_name: string
  officer_email: string
  zone: BengaluruZone
}

// ─── Jurisdiction ─────────────────────────────────────────────────────────────

export interface JurisdictionFlag {
  is_bbmp: boolean;
  authority: string;
  authority_email: string | null;
  flag_reason: string | null;
  likely_private: boolean;
  place_name: string | null;
  nearest_landmark: string | null;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationDetails {
  locality: string;        // sublocality_level_1 or neighborhood
  road: string | null;     // route component
  pincode: string | null;  // postal_code component
  city: string;            // always 'Bengaluru'
  formatted: string;       // locality + ', Bengaluru' for display
}

// ─── Triage & Classification ──────────────────────────────────────────────────

export type TriageLevel = 1 | 2 | 3;

export interface ClusterInfo {
  cluster_count: number;     // total reports within 50m in last 7 days
  is_cluster: boolean;       // true if cluster_count >= 3
  cluster_id: string | null; // id of the earliest report in this cluster
  suggested_action: string | null; // AI-generated root cause suggestion
}

export interface ClassifyResponse {
  is_valid: boolean;
  user_message: string;
  issue_type: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  triage_level: TriageLevel | null;  // 1=urgent, 2=medium, 3=routine
  triage_label: string | null;       // 'Urgent' | 'Medium' | 'Routine'
  triage_reason: string | null;      // why this triage level was assigned
  description: string | null;
  confidence: number | null;
  rejection_reason: string | null;
  cluster: ClusterInfo | null;
  ward_name: string | null;
  ward_zone: string | null;
  ward_is_fallback: boolean;
  locality_name: string | null;
  location_details: LocationDetails | null;
  nearest_landmark: string | null;
  private_property_detected: boolean;
  jurisdiction_flag: JurisdictionFlag | null;
  location_verified: boolean | null;
  report_hash: string | null;
  image_phash: string | null;
  duplicate_of: string | null;
  duplicate_type: 'identical' | 'similar' | null;
}

// ─── Draft Content (email + tweet) ────────────────────────────────────────────

export interface TweetContent {
  primary: string;
  reply_evidence: string;
  reply_escalation: string;
}

export interface DraftContentRequest {
  issue_type: string;
  severity: string;
  triage_level: number;
  triage_label: string;
  description: string;
  locality: string;
  ward_name: string;
  ward_zone: string;
  nearest_landmark: string | null;
  pincode: string | null;
  lat: number;
  lng: number;
  cluster_count: number;
  cluster_suggested_action: string | null;
  report_hash: string;
}

export interface DraftContentResponse {
  // Email fields
  subject: string;
  subject_kannada: string;
  body: string;
  recipient_name: string;
  recipient_email: string;
  cc_emails: string[];
  report_id: string;
  google_maps_url: string;
  // Tweet fields
  tweet: TweetContent;
  officer_token: string;
}

// ─── Verify Resolution ────────────────────────────────────────────────────────

export interface VerifyResolutionRequest {
  report_id_human: string;
  image_base64: string;
  lat: number;
  lng: number;
}

export interface VerifyResolutionResponse {
  verified: boolean;
  confidence: number;
  status: 'resolved' | 'likely_resolved' | 'unverified' | 'error';
  ai_evidence: string;
  user_message: string;
  report_id_human: string;
}

// ─── Public Report (for public report page) ───────────────────────────────────

export interface PublicReport {
  id: string;
  report_id_human: string;
  report_hash: string;
  created_at: string;
  issue_type: string;
  severity: string;
  triage_level: number;
  description: string;
  locality_name: string | null;
  ward_name: string;
  lat: number;
  lng: number;
  status: string;
  email_subject: string | null;
  tweet_primary: string | null;
  tweet_reply_evidence: string | null;
  tweet_reply_escalation: string | null;
  cluster_count: number;
  nearest_landmark: string | null;
  pincode: string | null;
  image_url: string | null;
  escalation_level?: number | null;
}

// ─── Supabase generated types (minimal — extend as schema grows) ───────────────

export interface Database {
  public: {
    Tables: {
      reports: {
        Row: Report
        Insert: Omit<Report, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Report, 'id'>>
      }
    }
  }
}
