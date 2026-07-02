export const project = {
  // ── App metadata ────────────────────────────────────────────────
  name: "Express SaaS",
  version: "1.0.0",
  apiPrefix: "/api/v1",

  // ── Auth ────────────────────────────────────────────────────────
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireDigit: true,
  },
  bcryptRounds: 12,
  mfaPendingTokenExpiresIn: "5m",
  mfaPendingExpiresInSeconds: 300,
  tokenType: "bearer" as const,

  // ── Rate limiting (auth endpoints) ─────────────────────────────
  rateLimit: {
    login: { windowMs: 15 * 60 * 1000, max: 10 },
    register: { windowMs: 60 * 60 * 1000, max: 5 },
  },

  // ── Pagination ─────────────────────────────────────────────────
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // ── Expiry durations ───────────────────────────────────────────
  expiry: {
    invitationDays: 7,
    passwordResetHours: 1,
    verificationHours: 24,
  },

  // ── JSON body limit ────────────────────────────────────────────
  jsonBodyLimit: "1mb",

  // ── CORS ────────────────────────────────────────────────────────
  cors: {
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  },

  // ── Role rankings ──────────────────────────────────────────────
  roleRank: {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
  },

  // ── OAuth provider URLs ────────────────────────────────────────
  oauth: {
    google: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userinfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile",
      accessType: "offline",
    },
    github: {
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userUrl: "https://api.github.com/user",
      emailsUrl: "https://api.github.com/user/emails",
      scope: "read:user user:email",
      acceptHeader: "application/json",
    },
  },

  // ── Billing ────────────────────────────────────────────────────
  billing: {
    paystackApiBaseUrl: "https://api.paystack.co",
    webhookHmacAlgorithm: "sha512",
    nextBillingMonthOffset: 1,
  },

  // ── Logging ────────────────────────────────────────────────────
  logging: {
    serviceName: "express-saas",
    devLevel: "debug",
    prodLevel: "info",
    timeFormat: "SYS:HH:MM:ss",
    ignoreFields: "pid,hostname",
  },

  // ── Plan limits ────────────────────────────────────────────────
  planLimits: {
    FREE: {
      maxMembers: 5,
      maxProjects: 3,
      auditLogRetentionDays: 7,
      mfaRequired: false,
      ssoEnabled: false,
      prioritySupport: false,
    },
    PRO: {
      maxMembers: 50,
      maxProjects: null as number | null,
      auditLogRetentionDays: 90,
      mfaRequired: false,
      ssoEnabled: false,
      prioritySupport: true,
    },
    ENTERPRISE: {
      maxMembers: null as number | null,
      maxProjects: null as number | null,
      auditLogRetentionDays: 365,
      mfaRequired: true,
      ssoEnabled: true,
      prioritySupport: true,
    },
  },

  // ── Other ──────────────────────────────────────────────────────
  redisMaxRetries: 3,
  healthCheckPaths: ["/api/v1/health", "/api/v1/ready"],
  gracefulShutdownTimeoutMs: 10_000,
};
