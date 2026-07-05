export type UserLanguage = "pl" | "en";
export type UserTheme = "light" | "dark" | "system";

export type Role = "EDITOR" | "MANAGER" | "HR" | "ADMIN";

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  preferred_language?: UserLanguage;
  preferred_theme?: UserTheme;
  avatar_url?: string | null;
  email_notifications_hr_response?: boolean;
  email_notifications_proposal_review?: boolean;
  email_notifications_weekly_mandatory_digest?: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
};

export type ActivationValidation = {
  valid: boolean;
  email?: string | null;
  full_name?: string | null;
  expires_at?: string | null;
  message?: string | null;
};
