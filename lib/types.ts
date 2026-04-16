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

export type BengaluruZone = 'North' | 'South' | 'East' | 'West' | 'Central'

export interface WardData {
  ward_name: string
  officer_name: string
  officer_email: string
  zone: BengaluruZone
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
