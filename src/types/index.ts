export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
};

export type PlanLimits = {
  maxMembers: number | null;
  maxProjects: number | null;
  auditLogRetentionDays: number;
  mfaRequired: boolean;
  ssoEnabled: boolean;
  prioritySupport: boolean;
};
