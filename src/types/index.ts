export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
};

export type PlanLimits = {
  maxMembers: number | null;
  maxProjects: number | null;
  auditLogRetentionDays: number;
  mfaRequired: boolean;
  ssoEnabled: boolean;
  prioritySupport: boolean;
};
