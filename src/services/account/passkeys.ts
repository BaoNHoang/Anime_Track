export interface PasskeyChallenge {
  challengeId: string;
  options: Record<string, unknown>;
}

function base64UrlBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = window.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} is invalid.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string) {
  if (typeof value !== "string" || !value) throw new Error(`${field} is invalid.`);
  return value;
}

function descriptors(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((entry) => {
    const descriptor = record(entry, "Passkey descriptor");
    return {
      ...descriptor,
      id: base64UrlBytes(string(descriptor.id, "Passkey descriptor")),
      type: "public-key" as const
    };
  }) as PublicKeyCredentialDescriptor[];
}

export function registrationOptions(value: unknown) {
  const options = record(value, "Passkey options");
  const user = record(options.user, "Passkey user");
  return {
    ...options,
    challenge: base64UrlBytes(string(options.challenge, "Passkey challenge")),
    user: {
      ...user,
      id: base64UrlBytes(string(user.id, "Passkey user"))
    },
    excludeCredentials: descriptors(options.excludeCredentials)
  } as unknown as PublicKeyCredentialCreationOptions;
}

export function authenticationOptions(value: unknown) {
  const options = record(value, "Passkey options");
  return {
    ...options,
    challenge: base64UrlBytes(string(options.challenge, "Passkey challenge")),
    allowCredentials: descriptors(options.allowCredentials)
  } as PublicKeyCredentialRequestOptions;
}

export function serializeRegistrationCredential(credential: PublicKeyCredential) {
  const native = credential as PublicKeyCredential & { toJSON?: () => unknown };
  if (typeof native.toJSON === "function") return native.toJSON();
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: credential.id,
    type: "public-key",
    response: {
      attestationObject: bytesToBase64Url(response.attestationObject),
      clientDataJSON: bytesToBase64Url(response.clientDataJSON)
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined
  };
}

export function serializeAuthenticationCredential(credential: PublicKeyCredential) {
  const native = credential as PublicKeyCredential & { toJSON?: () => unknown };
  if (typeof native.toJSON === "function") return native.toJSON();
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: credential.id,
    type: "public-key",
    response: {
      authenticatorData: bytesToBase64Url(response.authenticatorData),
      clientDataJSON: bytesToBase64Url(response.clientDataJSON),
      signature: bytesToBase64Url(response.signature),
      userHandle: response.userHandle
        ? bytesToBase64Url(response.userHandle)
        : undefined
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined
  };
}

export async function createPasskeyCredential(options: unknown) {
  if (!window.isSecureContext || !window.PublicKeyCredential) {
    throw new Error("Passkeys require a supported browser and a secure connection.");
  }
  const credential = await navigator.credentials.create({
    publicKey: registrationOptions(options)
  });
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Passkey registration was cancelled.");
  }
  return serializeRegistrationCredential(credential);
}

export async function getPasskeyCredential(options: unknown) {
  if (!window.isSecureContext || !window.PublicKeyCredential) {
    throw new Error("Passkeys require a supported browser and a secure connection.");
  }
  const credential = await navigator.credentials.get({
    publicKey: authenticationOptions(options)
  });
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Passkey sign-in was cancelled.");
  }
  return serializeAuthenticationCredential(credential);
}
