export type Role = "EDITOR" | "MANAGER" | "HR" | "ADMIN";

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
};
