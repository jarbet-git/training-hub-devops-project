export type NotificationCounts = {
  editor_inbox: number;
  manager_inbox: number;
  hr_inbox: number;
  hr_training_proposals: number;
  proposal_reviews: number;
  mandatory_training_alerts: number;
};

export type NotificationItem = {
  kind: string;
  title: string;
  body?: string | null;
  url: string;
  created_at: string;
  form_id?: number | null;
};

export type NotificationSummary = {
  counts: NotificationCounts;
  unread_counts: NotificationCounts;
  items: NotificationItem[];
};
