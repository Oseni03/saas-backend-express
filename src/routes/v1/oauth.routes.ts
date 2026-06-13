import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import axios from "axios";
import { OAuthProvider } from "@prisma/client";
import { authService } from "../../services/authService";
import { config } from "../../config";
import { BadRequestError } from "../../middleware/errors";

const router = Router();

// ── Google ────────────────────────────────────────────────────────────────────

router.get("/google", (_req, res) => {
  if (!config.GOOGLE_CLIENT_ID) throw new BadRequestError("Google OAuth is not configured");
  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: `${config.APP_BASE_URL}/api/v1/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query as { code: string };
    if (!code) throw new BadRequestError("Missing code");

    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${config.APP_BASE_URL}/api/v1/oauth/google/callback`,
      grant_type: "authorization_code",
    });

    const userinfoRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
    });
    const info = userinfoRes.data;

    const tokens = await authService.oauthLoginOrRegister(
      OAuthProvider.GOOGLE,
      info.sub,
      info.email,
      info.name,
      info.picture
    );

    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// ── GitHub ────────────────────────────────────────────────────────────────────

router.get("/github", (_req, res) => {
  if (!config.GITHUB_CLIENT_ID) throw new BadRequestError("GitHub OAuth is not configured");
  const params = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: `${config.APP_BASE_URL}/api/v1/oauth/github/callback`,
    scope: "read:user user:email",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get("/github/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query as { code: string };
    if (!code) throw new BadRequestError("Missing code");

    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: config.GITHUB_CLIENT_ID,
        client_secret: config.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${config.APP_BASE_URL}/api/v1/oauth/github/callback`,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken: string = tokenRes.data.access_token;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [userRes, emailsRes] = await Promise.all([
      axios.get("https://api.github.com/user", { headers }),
      axios.get("https://api.github.com/user/emails", { headers }),
    ]);

    const profile = userRes.data;
    const primaryEmail = (emailsRes.data as Array<{ email: string; primary: boolean; verified: boolean }>)
      .find((e) => e.primary && e.verified)?.email;
    const email = profile.email ?? primaryEmail;

    if (!email) throw new BadRequestError("Could not retrieve a verified email from GitHub");

    const tokens = await authService.oauthLoginOrRegister(
      OAuthProvider.GITHUB,
      String(profile.id),
      email,
      profile.name,
      profile.avatar_url
    );

    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

export default router;
