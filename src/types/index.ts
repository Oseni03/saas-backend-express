export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
};

export type PlanLimits = {
  maxMembers: number | null;
  maxProjects: number | null;
  auditLogRetentionDays: number;
  mfaRequired: boolean;
  ssoEnabled: boolean;
  prioritySupport: boolean;
};
