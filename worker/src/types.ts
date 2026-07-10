export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  profileSlug: string;
  bio: string;
  discoverable: boolean;
}

export interface AuthSession {
  id: string;
  userId: string;
  csrfHash: string;
  expiresAt: number;
  lastSeenAt: number;
}

export interface SessionUserRow {
  session_id: string;
  user_id: string;
  csrf_hash: string;
  expires_at: number;
  last_seen_at: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  profile_slug: string;
  bio: string;
  discoverable: number;
}

export type AppBindings = Env;

export type AppVariables = {
  requestId: string;
  user: PublicUser;
  session: AuthSession;
};

export type AppEnvironment = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
