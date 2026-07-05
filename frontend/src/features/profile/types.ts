import type { User, UserLanguage, UserTheme } from "@/features/auth/types";

export type UserPreferencesPayload = {
  preferred_language?: UserLanguage;
  preferred_theme?: UserTheme;
  email_notifications_hr_response?: boolean;
  email_notifications_proposal_review?: boolean;
  email_notifications_weekly_mandatory_digest?: boolean;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type MessageResponse = {
  message: string;
};

export type ProfileResponse = User;
