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
  created_at: string          // ISO-8601 timestamptz
  lat: number
  lng: number
  ward_name: string
  issue_type: IssueType | string
  severity: Severity
  description: string | null
  image_url: string | null
  report_hash: string | null
  status: ReportStatus
  email_draft: string | null
  tweet_thread: TweetThread | null
  // geography column is PostGIS-managed; omit from client reads
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
