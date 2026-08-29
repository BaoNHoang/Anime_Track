import type { ServerResponse } from "node:http";
import {
  ApiError,
  appUrl,
  enforceAuthRateLimit,
  readJson,
  requireMethod,
  requireSameOrigin,
  routeParameter,
  sendError,
  sendJson,
  type ApiRequest
} from "../_lib/http.js";
import {
  USERNAME_PATTERN,
  accountDeletionConfirmation,
  accountAvatarId,
  accountBannerId,
  accountEmail,
  accountPassword,
  accountRecord,
  accountScoreStep,
  accountFavorites,
  accountUsername,
  loginIdentifier,
  loginPassword,
  passkeyCredential,
  passkeyUuid,
  verificationCode
} from "../_lib/accountValidation.js";
import {
  PKCE_COOKIE,
  REFRESH_COOKIE,
  accountUser,
  authenticateRequest,
  clearPkceCookie,
  clearSessionCookies,
  createAdminClient,
  createPublicClient,
  createUserClient,
  readCookie,
  setPkceCookie,
  setSessionCookies
} from "../_lib/supabase.js";
import {
  profileMediaKind,
  sanitizeProfileMedia
} from "../_lib/profileMedia.js";

async function passkeySessionClient(
  request: ApiRequest,
  response: ServerResponse
) {
  const auth = await authenticateRequest(request, response);
  const storage = new Map<string, string>();
  const client = createPublicClient({
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
      removeItem: (key) => {
        storage.delete(key);
      }
    }
  });
  if (!auth.refreshToken) throw new ApiError(401, "Authentication required.");
  const { data, error } = await client.auth.setSession({
    access_token: auth.accessToken,
    refresh_token: auth.refreshToken
  });
  if (error || !data.session) {
    throw new ApiError(401, "Authentication required.");
  }
  if (data.session.access_token !== auth.accessToken) {
    setSessionCookies(response, data.session);
  }
  return { auth, client };
}

async function startPasskeyAuthentication(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  await enforceAuthRateLimit(request, "passkey-login-start", {
    limit: 20,
    windowSeconds: 15 * 60
  });
  const client = createPublicClient();
  const { data, error } = await client.auth.passkey.startAuthentication();
  if (error || !data) {
    throw new ApiError(503, "Passkey sign-in is unavailable.");
  }
  sendJson(response, 200, {
    challengeId: data.challenge_id,
    options: data.options
  });
}

async function verifyPasskeyAuthentication(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request, 32_000));
  const challengeId = passkeyUuid(body.challengeId, "Passkey challenge");
  const credential = passkeyCredential(body.credential);
  await enforceAuthRateLimit(request, "passkey-login-verify", {
    limit: 10,
    windowSeconds: 15 * 60
  });
  const client = createPublicClient();
  const { data, error } = await client.auth.passkey.verifyAuthentication({
    challengeId,
    credential: credential as unknown as Parameters<
      typeof client.auth.passkey.verifyAuthentication
    >[0]["credential"]
  });
  if (error || !data.session || !data.user?.email_confirmed_at) {
    throw new ApiError(401, "Passkey sign-in could not be completed.");
  }
  setSessionCookies(response, data.session);
  sendJson(response, 200, {
    user: await accountUser(
      data.user,
      createUserClient(data.session.access_token)
    )
  });
}

async function startPasskeyRegistration(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const { auth, client } = await passkeySessionClient(request, response);
  await enforceAuthRateLimit(request, "passkey-register-start", {
    limit: 10,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { data, error } = await client.auth.passkey.startRegistration();
  if (error || !data) {
    throw new ApiError(503, "Passkey registration is unavailable.");
  }
  sendJson(response, 200, {
    challengeId: data.challenge_id,
    options: data.options
  });
}

async function verifyPasskeyRegistration(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request, 32_000));
  const challengeId = passkeyUuid(body.challengeId, "Passkey challenge");
  const credential = passkeyCredential(body.credential);
  const { auth, client } = await passkeySessionClient(request, response);
  await enforceAuthRateLimit(request, "passkey-register-verify", {
    limit: 10,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { data, error } = await client.auth.passkey.verifyRegistration({
    challengeId,
    credential: credential as unknown as Parameters<
      typeof client.auth.passkey.verifyRegistration
    >[0]["credential"]
  });
  if (error || !data) {
    throw new ApiError(400, "Passkey registration could not be completed.");
  }
  sendJson(response, 200, {
    message: "Passkey added.",
    passkey: data
  });
}

async function listPasskeys(request: ApiRequest, response: ServerResponse) {
  requireMethod(request, "GET");
  const { client } = await passkeySessionClient(request, response);
  const { data, error } = await client.auth.passkey.list();
  if (error) throw new ApiError(502, "Passkeys could not be loaded.");
  sendJson(response, 200, { passkeys: data ?? [] });
}

async function deletePasskey(request: ApiRequest, response: ServerResponse) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const passkeyId = passkeyUuid(body.passkeyId, "Passkey");
  const { auth, client } = await passkeySessionClient(request, response);
  await enforceAuthRateLimit(request, "passkey-delete", {
    limit: 10,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { error } = await client.auth.passkey.delete({ passkeyId });
  if (error) throw new ApiError(400, "Passkey could not be removed.");
  sendJson(response, 200, { message: "Passkey removed." });
}

async function revokeOtherSessions(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const { auth, client } = await passkeySessionClient(request, response);
  await enforceAuthRateLimit(request, "session-revoke-others", {
    limit: 5,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { error } = await client.auth.signOut({ scope: "others" });
  if (error) throw new ApiError(502, "Other sessions could not be signed out.");
  sendJson(response, 200, { message: "Other devices signed out." });
}

async function login(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const identifier = loginIdentifier(body.identifier);
  const submittedPassword = loginPassword(body.password);
  await enforceAuthRateLimit(request, "login", {
    limit: 10,
    windowSeconds: 15 * 60,
    subject: identifier
  });

  let resolvedEmail = identifier;
  if (!identifier.includes("@")) {
    if (!USERNAME_PATTERN.test(identifier)) {
      throw new ApiError(401, "Email, username, or password is incorrect.");
    }
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id")
      .eq("username_normalized", identifier)
      .maybeSingle();
    if (profileError) {
      console.error("Username sign-in profile lookup failed.", {
        code: profileError.code,
        message: profileError.message
      });
      throw new ApiError(503, "Username sign-in is temporarily unavailable.");
    }
    if (!profile?.user_id) {
      throw new ApiError(401, "Email, username, or password is incorrect.");
    }
    const { data, error: userError } = await admin.auth.admin.getUserById(
      profile.user_id
    );
    if (userError || !data.user?.email) {
      console.error("Username sign-in account lookup failed.", {
        code: userError?.code,
        message: userError?.message,
        status: userError?.status
      });
      throw new ApiError(503, "Username sign-in is temporarily unavailable.");
    }
    resolvedEmail = data.user.email;
  } else {
    try {
      accountEmail(identifier);
    } catch {
      throw new ApiError(401, "Email, username, or password is incorrect.");
    }
  }

  const client = createPublicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: resolvedEmail,
    password: submittedPassword
  });
  if (
    error ||
    !data.session ||
    !data.user?.email_confirmed_at
  ) {
    throw new ApiError(401, "Email, username, or password is incorrect.");
  }
  setSessionCookies(response, data.session);
  const user = await accountUser(
    data.user,
    createUserClient(data.session.access_token)
  );
  sendJson(response, 200, { user });
}

async function signup(request: ApiRequest, response: ServerResponse) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const signupEmail = accountEmail(body.email);
  const signupUsername = accountUsername(body.username);
  const signupPassword = accountPassword(body.password);
  await enforceAuthRateLimit(request, "signup", {
    limit: 5,
    windowSeconds: 60 * 60,
    subject: signupEmail
  });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username_normalized", signupUsername.toLowerCase())
    .maybeSingle();
  const genericSignupMessage =
    "If these details can be used, check your email for a verification code.";
  if (existing) {
    sendJson(response, 200, { message: genericSignupMessage });
    return;
  }

  const client = createPublicClient();
  const { data, error } = await client.auth.signUp({
    email: signupEmail,
    password: signupPassword,
    options: {
      data: { username: signupUsername },
      emailRedirectTo: `${appUrl(request)}/account`
    }
  });
  const pendingUser = data.user;
  if (error) {
    if (pendingUser && !pendingUser.email_confirmed_at) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(
        pendingUser.id
      );
      if (rollbackError) {
        console.error("Failed to roll back an unverified signup.", {
          message: rollbackError.message,
          status: rollbackError.status
        });
      }
    }
    throw new ApiError(
      502,
      "Verification email could not be sent. No account was created."
    );
  }
  if (data.user?.identities?.length === 0) {
    sendJson(response, 200, { message: genericSignupMessage });
    return;
  }
  if (data.session || data.user?.email_confirmed_at) {
    if (data.user) await admin.auth.admin.deleteUser(data.user.id);
    throw new ApiError(
      503,
      "Email verification is required but is not configured correctly."
    );
  }
  sendJson(response, 200, {
    message: genericSignupMessage
  });
}

async function verifyEmail(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const verificationEmail = accountEmail(body.email);
  const token = verificationCode(body.code, "Verification code");
  await enforceAuthRateLimit(request, "verify-email", {
    limit: 8,
    windowSeconds: 15 * 60,
    subject: verificationEmail
  });
  const client = createPublicClient();
  const { data, error } = await client.auth.verifyOtp({
    email: verificationEmail,
    token,
    type: "signup"
  });
  if (
    error ||
    !data.session ||
    !data.user?.email_confirmed_at
  ) {
    throw new ApiError(400, "The verification code is invalid or expired.");
  }
  setSessionCookies(response, data.session);
  sendJson(response, 200, {
    user: await accountUser(
      data.user,
      createUserClient(data.session.access_token)
    )
  });
}

async function resendVerification(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const verificationEmail = accountEmail(body.email);
  await enforceAuthRateLimit(request, "resend-verification", {
    limit: 5,
    windowSeconds: 60 * 60,
    subject: verificationEmail
  });
  const client = createPublicClient();
  const { error } = await client.auth.resend({
    type: "signup",
    email: verificationEmail,
    options: { emailRedirectTo: `${appUrl(request)}/account` }
  });
  if (error) {
    throw new ApiError(502, "Verification email could not be sent. Try again later.");
  }
  sendJson(response, 200, {
    message: "If an unverified account exists, a new code has been sent."
  });
}

async function forgotPassword(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const recoveryEmail = accountEmail(body.email);
  await enforceAuthRateLimit(request, "forgot-password", {
    limit: 5,
    windowSeconds: 60 * 60,
    subject: recoveryEmail
  });
  const client = createPublicClient();
  const { error } = await client.auth.resetPasswordForEmail(recoveryEmail, {
    redirectTo: `${appUrl(request)}/account`
  });
  if (error) {
    console.error("Password reset email dispatch failed.", {
      code: error.code,
      message: error.message,
      status: error.status
    });
    throw new ApiError(
      502,
      "Password reset email could not be sent. Try again later."
    );
  }
  sendJson(response, 200, {
    message:
      "If the account exists, a password reset code has been sent."
  });
}

async function resetPassword(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const recoveryEmail = accountEmail(body.email);
  const token = verificationCode(body.code, "Reset code");
  const nextPassword = accountPassword(body.password, "New password");
  await enforceAuthRateLimit(request, "reset-password", {
    limit: 8,
    windowSeconds: 15 * 60,
    subject: recoveryEmail
  });
  const client = createPublicClient();
  const { data, error } = await client.auth.verifyOtp({
    email: recoveryEmail,
    token,
    type: "recovery"
  });
  if (error || !data.session) {
    throw new ApiError(400, "The reset code is invalid or expired.");
  }
  await client.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
  const { error: updateError } = await client.auth.updateUser({
    password: nextPassword
  });
  if (updateError) {
    throw new ApiError(400, "The password could not be updated.");
  }
  setSessionCookies(response, data.session);
  sendJson(response, 200, { message: "Password updated." });
}

async function session(request: ApiRequest, response: ServerResponse) {
  requireMethod(request, "GET");
  try {
    const auth = await authenticateRequest(request, response);
    sendJson(response, 200, {
      user: await accountUser(auth.user, auth.client)
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      sendJson(response, 200, { user: null });
      return;
    }
    throw error;
  }
}

async function updateUsername(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const username = accountUsername(body.username);
  const auth = await authenticateRequest(request, response);
  await enforceAuthRateLimit(request, "update-username", {
    limit: 10,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { error } = await auth.client
    .from("profiles")
    .update({ username })
    .eq("user_id", auth.user.id);
  if (error?.code === "23505") {
    throw new ApiError(409, "That username is unavailable.");
  }
  if (error) throw new ApiError(502, "Username could not be updated.");
  sendJson(response, 200, {
    user: await accountUser(auth.user, auth.client)
  });
}

async function updateAvatar(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const avatarId = accountAvatarId(body.avatarId);
  const auth = await authenticateRequest(request, response);
  await enforceAuthRateLimit(request, "update-avatar", {
    limit: 20,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { error } = await auth.client
    .from("profiles")
    .update({ avatar_id: avatarId, avatar_path: null })
    .eq("user_id", auth.user.id);
  if (error) throw new ApiError(502, "Profile picture could not be updated.");
  const { error: removeError } = await auth.client.storage
    .from("profile-media")
    .remove([`${auth.user.id}/avatar.webp`]);
  if (removeError) {
    throw new ApiError(502, "Previous profile picture could not be removed.");
  }
  sendJson(response, 200, {
    user: await accountUser(auth.user, auth.client),
    message: "Profile picture updated."
  });
}

async function updateBanner(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const bannerId = accountBannerId(body.bannerId);
  const auth = await authenticateRequest(request, response);
  await enforceAuthRateLimit(request, "update-banner", {
    limit: 20,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { error } = await auth.client
    .from("profiles")
    .update({ banner_id: bannerId, banner_path: null })
    .eq("user_id", auth.user.id);
  if (error) throw new ApiError(502, "Profile banner could not be updated.");
  const { error: removeError } = await auth.client.storage
    .from("profile-media")
    .remove([`${auth.user.id}/banner.webp`]);
  if (removeError) {
    throw new ApiError(502, "Previous profile banner could not be removed.");
  }
  sendJson(response, 200, {
    user: await accountUser(auth.user, auth.client),
    message: "Profile banner updated."
  });
}

async function uploadProfileMedia(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const auth = await authenticateRequest(request, response);
  await enforceAuthRateLimit(request, "profile-media", {
    limit: 10,
    ipLimit: 30,
    windowSeconds: 60 * 60,
    subject: auth.user.id
  });
  const body = accountRecord(await readJson(request, 2_100_000));
  const kind = profileMediaKind(body.kind);
  const image = await sanitizeProfileMedia(body.dataUrl, kind);
  const path = `${auth.user.id}/${kind}.webp`;
  const { error: uploadError } = await auth.client.storage
    .from("profile-media")
    .upload(path, image, {
      cacheControl: "3600",
      contentType: "image/webp",
      upsert: true
    });
  if (uploadError) throw new ApiError(502, "Profile image could not be stored.");

  const updates = kind === "avatar"
    ? { avatar_path: path }
    : { banner_path: path };
  const { error: profileError } = await auth.client
    .from("profiles")
    .update(updates)
    .eq("user_id", auth.user.id);
  if (profileError) {
    throw new ApiError(502, "Profile image could not be attached to your account.");
  }
  sendJson(response, 200, {
    user: await accountUser(auth.user, auth.client),
    message: kind === "avatar" ? "Profile picture uploaded." : "Profile banner uploaded."
  });
}

async function updatePreferences(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  const scoreStep = accountScoreStep(body.scoreStep);
  const auth = await authenticateRequest(request, response);
  await enforceAuthRateLimit(request, "update-preferences", {
    limit: 20,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { error } = await auth.client
    .from("profiles")
    .update({ score_step: scoreStep })
    .eq("user_id", auth.user.id);
  if (error) throw new ApiError(502, "Scoring preference could not be updated.");
  sendJson(response, 200, {
    user: await accountUser(auth.user, auth.client),
    message: "Scoring preference updated."
  });
}

async function updateFavorites(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request, 40_000));
  const favorites = accountFavorites(body.favorites);
  const auth = await authenticateRequest(request, response);
  await enforceAuthRateLimit(request, "update-favorites", {
    limit: 30,
    windowSeconds: 15 * 60,
    subject: auth.user.id
  });
  const { error } = await auth.client
    .from("profiles")
    .update({ favorites })
    .eq("user_id", auth.user.id);
  if (error) throw new ApiError(502, "Favorites could not be updated.");
  sendJson(response, 200, {
    user: await accountUser(auth.user, auth.client),
    message: "Favorites updated."
  });
}

async function logout(request: ApiRequest, response: ServerResponse) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  try {
    const auth = await authenticateRequest(request, response);
    const client = createPublicClient();
    const refreshToken = readCookie(request, REFRESH_COOKIE);
    if (refreshToken) {
      await client.auth.setSession({
        access_token: auth.accessToken,
        refresh_token: refreshToken
      });
      await client.auth.signOut({ scope: "local" });
    }
  } catch {
    // Cookie cleanup is still required for an expired or revoked session.
  }
  clearSessionCookies(response);
  sendJson(response, 200, { message: "Signed out." });
}

async function deleteAccount(
  request: ApiRequest,
  response: ServerResponse
) {
  requireMethod(request, "POST");
  requireSameOrigin(request);
  const body = accountRecord(await readJson(request));
  accountDeletionConfirmation(body.confirmation);
  const auth = await authenticateRequest(request, response);
  await enforceAuthRateLimit(request, "delete-account", {
    limit: 3,
    windowSeconds: 24 * 60 * 60,
    subject: auth.user.id
  });
  const admin = createAdminClient();
  const { error: mediaError } = await auth.client.storage
    .from("profile-media")
    .remove([
      `${auth.user.id}/avatar.webp`,
      `${auth.user.id}/banner.webp`
    ]);
  if (mediaError) {
    throw new ApiError(502, "Your profile media could not be deleted.");
  }
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) {
    console.error("Account deletion failed.", {
      message: error.message
    });
    throw new ApiError(502, "Your account could not be deleted.");
  }
  clearSessionCookies(response);
  sendJson(response, 200, {
    message: "Your account and cloud library were deleted."
  });
}

async function google(request: ApiRequest, response: ServerResponse) {
  requireMethod(request, "GET");
  await enforceAuthRateLimit(request, "google", {
    limit: 20,
    windowSeconds: 15 * 60
  });
  let verifier = "";
  const client = createPublicClient({
    flowType: "pkce",
    storage: {
      getItem: () => null,
      setItem: (key, value) => {
        if (key.includes("code-verifier")) verifier = value;
      },
      removeItem: () => undefined
    }
  });
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl(request)}/api/auth/callback`,
      skipBrowserRedirect: true
    }
  });
  if (error || !data.url || !verifier) {
    throw new ApiError(503, "Google sign-in is unavailable.");
  }
  setPkceCookie(response, verifier);
  response.statusCode = 302;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Location", data.url);
  response.end();
}

async function callback(request: ApiRequest, response: ServerResponse) {
  requireMethod(request, "GET");
  const code = new URL(request.url ?? "", appUrl(request)).searchParams.get(
    "code"
  );
  const verifier = readCookie(request, PKCE_COOKIE);
  if (!code || !verifier) {
    throw new ApiError(400, "Google sign-in could not be completed.");
  }
  const client = createPublicClient({
    flowType: "pkce",
    storage: {
      getItem: (key) => (key.includes("code-verifier") ? verifier : null),
      setItem: () => undefined,
      removeItem: () => undefined
    }
  });
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  clearPkceCookie(response);
  if (error || !data.session) {
    response.statusCode = 302;
    response.setHeader("Location", `${appUrl(request)}/account?auth_error=google`);
    response.end();
    return;
  }
  setSessionCookies(response, data.session);
  response.statusCode = 302;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Location", `${appUrl(request)}/profile`);
  response.end();
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse
) {
  try {
    const action = routeParameter(request, "action");
    if (
      action?.startsWith("passkey") &&
      process.env.VITE_PASSKEY_AUTH_ENABLED !== "true"
    ) {
      throw new ApiError(503, "Passkey authentication is not configured.");
    }
    switch (action) {
      case "login":
        return await login(request, response);
      case "signup":
        return await signup(request, response);
      case "verify-email":
        return await verifyEmail(request, response);
      case "resend-verification":
        return await resendVerification(request, response);
      case "forgot-password":
        return await forgotPassword(request, response);
      case "reset-password":
        return await resetPassword(request, response);
      case "session":
        return await session(request, response);
      case "passkey-auth-start":
        return await startPasskeyAuthentication(request, response);
      case "passkey-auth-verify":
        return await verifyPasskeyAuthentication(request, response);
      case "passkey-register-start":
        return await startPasskeyRegistration(request, response);
      case "passkey-register-verify":
        return await verifyPasskeyRegistration(request, response);
      case "passkeys":
        return await listPasskeys(request, response);
      case "passkey-delete":
        return await deletePasskey(request, response);
      case "sessions-others":
        return await revokeOtherSessions(request, response);
      case "username":
        return await updateUsername(request, response);
      case "avatar":
        return await updateAvatar(request, response);
      case "banner":
        return await updateBanner(request, response);
      case "profile-media":
        return await uploadProfileMedia(request, response);
      case "preferences":
        return await updatePreferences(request, response);
      case "favorites":
        return await updateFavorites(request, response);
      case "logout":
        return await logout(request, response);
      case "delete-account":
        return await deleteAccount(request, response);
      case "google":
        return await google(request, response);
      case "callback":
        return await callback(request, response);
      default:
        throw new ApiError(404, "Not found.");
    }
  } catch (error) {
    sendError(response, error);
  }
}
