export type DashboardYearSummary = {
  year: number;
  forms: number;
  items: number;
  participants: number;
  estimated_cost_total: number;
  estimated_hours_total: number;
  approved_budget_total: number;
};

export type DashboardMonthlyPoint = {
  month: number;
  current_forms: number;
  previous_forms: number;
  current_participants: number;
  previous_participants: number;
  current_estimated_cost_total: number;
  previous_estimated_cost_total: number;
};

export type DashboardComparisonResponse = {
  current_year: number;
  previous_year: number;
  has_previous_year_data: boolean;
  current: DashboardYearSummary;
  previous: DashboardYearSummary;
  months: DashboardMonthlyPoint[];
};
