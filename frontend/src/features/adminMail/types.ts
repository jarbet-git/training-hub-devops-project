export type MailStatus = {
  enabled: boolean;
  configured: boolean;
  host: string | null;
  port: number | null;
  use_tls: boolean;
  use_ssl: boolean;
  has_credentials: boolean;
  from_email: string | null;
  from_name: string | null;
  timeout_seconds: number;
  relay_mode: boolean;
};

export type MailTestPayload = {
  to_email: string;
  subject?: string;
  body?: string;
};

export type MailTestResponse = {
  success: boolean;
  message: string;
  log_id: number | null;
};

export type MailLogRow = {
  id: number;
  created_at: string;
  kind: string;
  subject: string;
  recipients: string;
  success: boolean;
  provider: string | null;
  error_message: string | null;
  created_by_user_id: number | null;
};
