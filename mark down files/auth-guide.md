# Authentication Complete Guide

A comprehensive guide from fundamentals to production patterns. Written for developers who want to understand **what** each auth method is, **how** it works, **when** to use it, and **what can go wrong**.

---

## Table of Contents

1. [Foundations](#1-foundations)
2. [JWT (JSON Web Token)](#2-jwt-json-web-token)
3. [OAuth 2.0](#3-oauth-20)
4. [OpenID Connect (OIDC)](#4-openid-connect-oidc)
5. [SAML 2.0](#5-saml-20)
6. [Cookies & Sessions](#6-cookies--sessions)
7. [Passkeys & WebAuthn (FIDO2)](#7-passkeys--webauthn-fido2)
8. [Other Methods](#8-other-methods)
9. [Identity Providers (Social Login)](#9-identity-providers-social-login)
10. [Vendor Solutions](#10-vendor-solutions)
11. [Cheatsheets](#11-cheatsheets)
12. [Quick Reference Table](#12-quick-reference-table)

---

# 1. Foundations

## Authentication vs Authorization

**Authentication** = Who are you? (Identity verification)
**Authorization** = What can you do? (Permission check)

| | Authentication | Authorization |
|---|---|---|
| Answers | "Who are you?" | "What can you access?" |
| Happens | First | After authentication |
| Example | Log in with email + password | Check if user can access `/admin` |
| Analogy | Showing your passport at airport | Boarding pass tells which gate you can enter |

> You can be **authenticated** but not **authorized** (logged in but can't access admin panel).

## The Three Auth Factors

Every authentication method uses one or more of these:

| Factor | Examples |
|--------|----------|
| **Something you KNOW** | Password, PIN, security answer |
| **Something you HAVE** | Phone (SMS code), hardware key (YubiKey), authenticator app |
| **Something you ARE** | Fingerprint, Face ID, iris scan, voice |

**Multi-Factor Authentication (MFA)** uses 2+ factors. This blocks ~99.9% of automated attacks.

Common MFA combos:
- Password (know) + TOTP code from phone (have)
- Password (know) + SMS code (have)
- Face ID (are) + phone proximity (have)

## Common Attack Vectors

| Attack | What it is | Mitigation |
|--------|------------|------------|
| **Phishing** | Fake login page steals credentials | MFA, WebAuthn (phishing-resistant) |
| **Credential Stuffing** | Reused passwords from data breaches | MFA, passwordless |
| **Session Hijacking** | Steal session cookie/token | Short TTL, HttpOnly cookies, secure flag |
| **CSRF** | Cross-site request forgery | CSRF tokens, SameSite cookies |
| **Token Leakage** | Token leaked in logs/URLs | Never put tokens in URL, use PKCE |
| **Replay Attack** | Capture and re-send a valid request | Nonce, timestamps, short TTL |

---

# 2. JWT (JSON Web Token)

## What It Is

JWT is a **token format** — a compact, URL-safe way to represent claims between two parties. It is not a protocol on its own. OAuth, OIDC, and many custom auth systems use JWT as the token format.

## Anatomy

A JWT looks like: `xxxxx.yyyyy.zzzzz`

Three dot-separated Base64URL-encoded parts:

```
[Header].[Payload].[Signature]
```

### Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-1"
}
```

- `alg`: signing algorithm (HS256, RS256, ES256, etc.)
- `typ`: usually "JWT"
- `kid`: key ID (tells verifier which key to use)

### Payload (Claims)

```json
{
  "sub": "user_123",
  "iss": "https://auth.example.com",
  "aud": "my-api",
  "exp": 1700000000,
  "iat": 1699996400,
  "scope": "read write"
}
```

Standard claims:
| Claim | Full Name | What it means |
|-------|-----------|---------------|
| `sub` | Subject | User identifier |
| `iss` | Issuer | Who created the token |
| `aud` | Audience | Who the token is for |
| `exp` | Expiration | Unix timestamp — **always validate** |
| `nbf` | Not Before | Token not valid before this time |
| `iat` | Issued At | When token was created |
| `jti` | JWT ID | Unique identifier (prevent replay) |

### Signature

Produced by:
```
signature = algorithm(base64url(header) + "." + base64url(payload), secret/privateKey)
```

## Signing Algorithms

| Algorithm | Type | Key | Use Case |
|-----------|------|-----|----------|
| **HS256** | Symmetric | Shared secret | Internal services (one server) |
| **RS256** | Asymmetric | Private key sign, public key verify | Distributed systems (many verifiers) |
| **ES256** | Asymmetric | ECDSA (smaller keys) | Mobile, IoT |

> **Never use `alg: "none"`** in production — attackers can forge tokens.

## How JWT Auth Works

```
Client                    Server
  |                         |
  |-- POST /login -------->|  Verify credentials
  |                         |  Create JWT {sub, exp, ...}
  |<-- JWT token ----------|  Sign with private key
  |                         |
  |-- GET /resource -------|  Include JWT in Authorization header
  |   Authorization: Bearer <jwt>
  |                         |  Verify signature, check exp
  |<-- 200 OK -------------|  
```

## Stateless Nature

- Server does **not** store the session — the token is self-contained
- Pros: no DB lookup per request, easy to scale horizontally
- Cons: **can't revoke** a token before it expires (need a blocklist/revocation list)

## Security Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `alg: none` | Attacker forges token | Reject `none` algorithm |
| HS256 with leaked secret | Forge any token | Use RS256, rotate keys |
| Not validating `exp` | Token lives forever | Always check `exp` |
| Not validating `aud` | Token used on wrong API | Validate `aud` matches your API |
| Token in URL | Logged, leaked | Send in Authorization header |
| Long expiry | Revocation impossible | Short TTL + refresh tokens |

## Code: Verify a JWT (Node.js with jsonwebtoken)

```js
const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: 'my-api',
      issuer: 'https://auth.example.com',
    });
    return decoded; // { sub, exp, scope, ... }
  } catch (err) {
    // Token expired, invalid signature, wrong audience
    throw new Error('Invalid token');
  }
}
```

## When to Use JWT

- Stateless API auth (microservices)
- Carrying claims between services
- Short-lived access tokens in OAuth/OIDC

## When NOT to Use JWT

- When you need instant revocation (use server-side sessions instead)
- For large payloads (token size grows, sent on every request)
- Storing sensitive data in payload (payload is only base64 encoded, not encrypted — unless using JWE)

---

# 3. OAuth 2.0

## What It Is

OAuth 2.0 is an **authorization framework** — it lets a third-party app access a user's resources **without seeing their password**. Think "Login with Google" or "Allow this app to post to your Twitter timeline."

> OAuth 2.0 is **not** an authentication protocol. It was designed for **delegated authorization**.

## The Four Roles

```
+--------+                               +---------------+
|        |--(A) Authorization Request----|               |
|        |                               |  Resource     |
|        |<-(B) Authorization Grant------|   Owner       |
|        |                               |  (User)       |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(C) Authorization Grant------|               |
| Client |                               | Authorization |
| (App)  |<-(D) Access Token ------------|   Server      |
|        |                               |               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(E) Access Token ------------|               |
|        |                               |  Resource     |
|        |<-(F) Protected Resource ------|   Server      |
|        |                               |  (API)        |
+--------+                               +---------------+
```

| Role | Description |
|------|-------------|
| **Resource Owner** | The user who owns the data |
| **Client** | The app requesting access |
| **Authorization Server** | Issues tokens after verifying user consent |
| **Resource Server** | The API that serves the protected data |

## Grant Types (Flows)

| Grant | Use Case | Best For | Still Valid in 2.1? |
|-------|----------|----------|---------------------|
| **Authorization Code** | Web apps with backend | Server-side apps | Yes (with PKCE mandatory) |
| **Authorization Code + PKCE** | Mobile & SPAs | All public clients | Yes (the default) |
| **Client Credentials** | Machine-to-machine | Backend services, cron jobs | Yes |
| **Device Code** | Smart TVs, CLI tools | Input-constrained devices | Yes |
| **Implicit** (deprecated) | SPAs (old way) | — | **No** — removed in 2.1 |
| **Resource Owner Password** (deprecated) | Trusted first-party apps | — | **No** — removed in 2.1 |

### Authorization Code + PKCE (The Flow You'll Use 90% of the Time)

PKCE (Proof Key for Code Exchange) — pronounced "pixie" — prevents the authorization code from being intercepted.

```
Client (SPA)            Auth Server             Resource Server
    |                       |                        |
    |-- 1. code_verifier ---|                        |
    |    code_challenge = SHA256(verifier)            |
    |                       |                        |
    |-- 2. Auth Request --->|                        |
    |   + code_challenge    |                        |
    |                       |                        |
    |<-- 3. Auth Code ------|                        |
    |   (user logins & consents)                     |
    |                       |                        |
    |-- 4. Auth Code + -----|                        |
    |   code_verifier ----->|                        |
    |                       |  verify code_verifier  |
    |<-- 5. Access Token ---|                        |
    |       + Refresh Token |                        |
    |                       |                        |
    |-- 6. GET /api/data ---|----------------------->|
    |   Bearer <access_token>                        |
    |                       |                        |
    |<----------------------|---- 200 OK ------------|
```

Step 1 in code:

```js
// Generate code verifier (crypto random string)
const code_verifier = base64url(crypto.randomBytes(32));

// code challenge = SHA256 hash of verifier
const code_challenge = base64url(
  crypto.createHash('sha256').update(code_verifier).digest()
);

// Step 2: Redirect user to auth server
const authUrl = `https://auth.example.com/authorize?
  response_type=code
  &client_id=my-app
  &redirect_uri=https://my-app.com/callback
  &code_challenge=${code_challenge}
  &code_challenge_method=S256
  &scope=openid%20email%20profile`;

// Step 4: Exchange code for token (on callback)
const response = await fetch('https://auth.example.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorization_code,
    client_id: 'my-app',
    code_verifier: code_verifier,
    redirect_uri: 'https://my-app.com/callback',
  }),
});
const { access_token, refresh_token } = await response.json();
```

### Client Credentials (Machine-to-Machine)

Simple — no user involved:

```
Backend Service A                    Auth Server
    |                                     |
    |-- POST /token -------------------->|
    |   grant_type=client_credentials     |
    |   client_id=service-a               |
    |   client_secret=...                 |
    |                                     |
    |<-- { access_token } ----------------|
    |                                     |
    |-- GET /api/data ------------------->|  (on behalf of Service A)
    |   Bearer <access_token>             |
```

### Device Code (TV / CLI)

1. App shows a code and URL (e.g., `https://example.com/device`)
2. User opens the URL on their phone/laptop
3. User enters the code
4. App polls for access token

## Access Tokens vs Refresh Tokens

| | Access Token | Refresh Token |
|---|---|---|
| Purpose | Access resources | Get new access tokens |
| Lifetime | Short (15 min - 1 hour) | Long (days to months) |
| Sent on every request | Yes | No |
| Revocable | No (stateless) | Yes (server-side check) |
| Stored | Client memory / secure storage | Secure storage (httpOnly cookie) |

## Scopes

Scopes define **what** the token allows:

```
scope: "read:profile read:email write:posts"
```

The resource server checks scopes before returning data. This is how you see "Allow this app to see your email but not post" on consent screens.

## OAuth 2.1 (Key Changes)

| Change | Old (2.0) | New (2.1) |
|--------|-----------|-----------|
| PKCE | Optional for web apps | **Mandatory** for all public clients |
| Implicit Grant | Allowed | **Removed** |
| Password Grant | Allowed | **Removed** |
| Refresh Token Rotation | Optional | **Recommended** |
| Redirect URI | Partial matching | **Exact match** only |

## Security Pitfalls

| Pitfall | Fix |
|---------|-----|
| Intercepting auth code | PKCE (code verifier only known by client) |
| CSRF on redirect URI | `state` parameter with nonce |
| Token leakage in redirect | Use PKCE + never put token in URL |
| Refresh token stolen | Refresh token rotation (one-time use) |
| Open redirectors | Validate redirect_uri, no wildcards |

## When to Use OAuth 2.0

- Third-party app needs to access user data (delegation)
- Multiple APIs share the same authorization server
- You need granular permission control (scopes)

## When NOT to Use OAuth 2.0

- Simple first-party login (use cookies + sessions or OIDC directly)
- Internal service communication (API keys or client credentials is simpler)

> **Remember**: OAuth 2.0 alone doesn't tell you **who** the user is — only what they authorized. For identity, you need OIDC.

---

# 4. OpenID Connect (OIDC)

## What It Is

OIDC is a **thin identity layer** on top of OAuth 2.0. It adds authentication so you know **who** the user is, not just what they authorized.

> OAuth 2.0 → "This app can read my email"
> OIDC → "This app knows I am user@example.com" **and** "can read my email"

## Key Addition: The ID Token

Instead of just an access token, OIDC returns an **ID Token** — a JWT that contains user identity claims.

```json
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",
  "aud": "my-app-client-id",
  "exp": 1700000000,
  "iat": 1699996400,
  "auth_time": 1699996400,
  "nonce": "n-0S6_WzA2Mj",
  "at_hash": "MTIzNDU2Nzg5MDEyMzQ1Ng",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://example.com/photo.jpg"
}
```

## Standard OIDC Claims

| Claim | Description |
|-------|-------------|
| `sub` | Unique identifier (never changes) |
| `name` | Full name |
| `email` | Email address |
| `email_verified` | Whether email was verified |
| `phone_number` | Phone number |
| `picture` | Profile picture URL |
| `locale` | Language/locale |
| `updated_at` | When profile was last updated |

## The Discovery Endpoint

OIDC provides a `.well-known` URL that tells clients everything they need:

```
GET https://auth.example.com/.well-known/openid-configuration
```

Returns:

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "userinfo_endpoint": "https://auth.example.com/userinfo",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "scopes_supported": ["openid", "email", "profile"],
  "response_types_supported": ["code", "id_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

## OIDC Flow (Authorization Code + PKCE)

This is how "Login with Google" works:

```
Step 1: User clicks "Login with Google"
Step 2: App redirects to Google's authorize endpoint
         ?response_type=code
         &client_id=MY_CLIENT_ID
         &redirect_uri=https://myapp.com/callback
         &scope=openid%20email%20profile
         &code_challenge=...
         &state=anti-csrf-token
Step 3: User logs into Google, consents to sharing email/profile
Step 4: Google redirects back to myapp.com/callback?code=xxx&state=...
Step 5: App sends code + code_verifier to Google's token endpoint
Step 6: Google returns:
         {
           "access_token": "ya29...",
           "id_token": "eyJ...",  // <-- THIS IS NEW (OIDC)
           "refresh_token": "1//..."
         }
Step 7: App verifies id_token signature, decodes to get user info
         {
           "sub": "12345",
           "email": "user@gmail.com",
           "name": "John Doe"
         }
Step 8: App creates its own session for the user
```

## ID Token Validation (Critical!)

```js
// Step 7 in detail — validate the ID token
const { verify } = require('jsonwebtoken');

// 1. Fetch JWKS from Google's discovery endpoint
const jwks = await fetch('https://www.googleapis.com/oauth2/v3/certs');
const keys = await jwks.json();

// 2. Verify the ID token
const decoded = jwt.verify(idToken, getPublicKey(keys, idToken), {
  algorithms: ['RS256'],
  issuer: 'https://accounts.google.com',   // must match
  audience: MY_CLIENT_ID,                   // must match YOUR client ID
});

// 3. Check nonce if you sent one
if (decoded.nonce !== expectedNonce) throw new Error('Nonce mismatch');

// 4. Now you can trust the user's identity
const user = {
  id: decoded.sub,
  email: decoded.email,
  name: decoded.name,
};
```

## UserInfo Endpoint

Instead of parsing the ID token, you can call the UserInfo endpoint with the access token:

```
GET https://auth.example.com/userinfo
Authorization: Bearer <access_token>
```

Returns the same claims as the ID token. Use this when you don't trust the ID token (e.g., opaque tokens).

## OIDC vs OAuth 2.0 Quick Comparison

| | OAuth 2.0 | OIDC |
|---|---|---|
| Purpose | Authorization delegation | Authentication + Identity |
| Token | Access token | ID token (JWT) + Access token |
| User info | No | Yes (via ID token or UserInfo endpoint) |
| Scope | Any scopes | **`openid`** is mandatory |
| Enterprise SSO | No | Yes (OIDC is the modern SSO) |
| Mobile/SPA | Yes | Yes (with PKCE) |

## When to Use OIDC

- User login ("Sign in with Google, Apple, GitHub")
- Building your own identity provider
- Modern single sign-on (SSO) for web & mobile

## When NOT to Use OIDC

- You only need API authorization (use OAuth 2.0 alone)
- Legacy enterprise with SAML-only IdP (use SAML)
- Simple first-party app with one backend (cookies + sessions might be simpler)

---

# 5. SAML 2.0

## What It Is

SAML (Security Assertion Markup Language) is an XML-based protocol for exchanging authentication and authorization data between an **Identity Provider (IdP)** and a **Service Provider (SP)**.

> SAML is the old guard of enterprise SSO. It's still everywhere in healthcare, finance, government, and large enterprises.

## The Three Roles

```
User (Principal)
    |
    v
+--------+      SAML Assertion (XML)      +--------+
|   IdP  | ------------------------------> |   SP   |
| (Okta, |                                 | (App)  |
|  Azure | <------------------------------ |        |
|   AD)  |      AuthnRequest (XML)         |        |
+--------+                                  +--------+
```

| Role | What it does |
|------|-------------|
| **Principal** | The user trying to access the app |
| **Identity Provider (IdP)** | Authenticates the user, issues SAML assertions |
| **Service Provider (SP)** | The app that trusts the IdP's assertions |

## Flow: SP-Initiated SSO

```
User                   SP (App)              IdP (Okta)
 |                       |                       |
 |-- GET /dashboard ---->|                       |
 |                       |                       |
 |<-- Redirect to IdP ---|                       |
 |   (SAML AuthnRequest) |                       |
 |                       |                       |
 |--- POST to IdP ------>|                       |
 |   (login form)        |                       |
 |                       |                       |
 |<-- SAML Response -----|                       |
 |   (XML Assertion)     |                       |
 |                       |                       |
 |--- POST Assertion --->|                       |
 |   to SP /acs endpoint |                       |
 |                       |                       |
 |                       |-- Validate signature -|
 |                       |-- Extract claims -----|
 |                       |                       |
 |<-- Session cookie ----|                       |
 |   (logged in)         |                       |
```

## SAML Assertion (XML)

```xml
<saml:Assertion
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="a1b2c3d4"
  IssueInstant="2026-07-17T10:00:00Z"
  Version="2.0"
>
  <saml:Issuer>https://idp.example.com</saml:Issuer>

  <!-- Digital signature (required) -->
  <ds:Signature>...</ds:Signature>

  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
      user@company.com
    </saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData
        NotOnOrAfter="2026-07-17T10:10:00Z"
        Recipient="https://sp.example.com/acs" />
    </saml:SubjectConfirmation>
  </saml:Subject>

  <saml:Conditions
    NotBefore="2026-07-17T10:00:00Z"
    NotOnOrAfter="2026-07-17T10:10:00Z"
  >
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.com</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>

  <saml:AuthnStatement AuthnInstant="2026-07-17T10:00:00Z">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>
        urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
      </saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>

  <saml:AttributeStatement>
    <saml:Attribute Name="email">
      <saml:AttributeValue>user@company.com</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="firstName">
      <saml:AttributeValue>John</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="lastName">
      <saml:AttributeValue>Doe</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="role">
      <saml:AttributeValue>admin</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

## OIDC vs SAML

| Dimension | OIDC | SAML 2.0 |
|-----------|------|-----------|
| Format | JSON (JWT) | XML |
| Token size | ~1 KB | ~5 KB |
| Verification speed | ~2 ms | ~22 ms |
| Mobile support | Excellent | Poor |
| API integration | First-class (bearer tokens) | Not designed for APIs |
| Discovery | `.well-known/openid-configuration` | Metadata XML (fixed URL) |
| Where it's used | Modern apps, mobile, SPAs | Enterprise, gov, healthcare |
| Complexity | Moderate | High |

## Security Pitfalls

| Pitfall | Fix |
|---------|-----|
| XML signature wrapping | Use secure XML parser, validate entire assertion |
| Assertion replay | Validate `NotOnOrAfter`, use `OneTimeUse` condition |
| Weak signing | Use RSA-SHA256 minimum, reject SHA1 |
| Open redirect in ACS | Validate `Recipient` in SubjectConfirmationData |
| User ID collision | Use `NameID` consistently, handle format changes |

## When to Use SAML

- Enterprise SSO (connecting to Okta, Azure AD, OneLogin)
- Government / healthcare compliance requirements
- Existing SAML infrastructure you can't replace

## When NOT to Use SAML

- Greenfield projects (use OIDC)
- Mobile or native apps
- APIs / machine-to-machine communication
- When performance matters under high load

---

# 6. Cookies & Sessions

## What It Is

The classic web auth model: server creates a **session**, gives the client a **session ID** in a cookie. The client sends the cookie on every request.

```
Client                          Server
  |                               |
  |-- POST /login -------------->|
  |   { email, password }        |
  |                               |  Verify credentials
  |                               |  Create session in DB/Redis
  |<-- Set-Cookie: session=abc --|  { sessionId, userId, exp }
  |                               |
  |-- GET /dashboard ----------->|
  |   Cookie: session=abc        |
  |                               |  Lookup session in DB/Redis
  |<-- 200 OK -------------------|
```

## Why Sessions Still Matter

- **Revocable** — delete the session, user is logged out instantly
- **Server-controlled** — you control the session lifetime
- **No token size limits** — store any data in session
- **Works without JS** — traditional server-rendered apps

## Cookie Flags (Security Essentials)

| Flag | Effect | Always Set? |
|------|--------|-------------|
| `HttpOnly` | JS can't read the cookie (prevents XSS theft) | **Yes** |
| `Secure` | Only sent over HTTPS | **Yes** |
| `SameSite=Lax` | Not sent on cross-site POST (prevents CSRF) | **Yes** |
| `SameSite=Strict` | Not sent on any cross-site request | For sensitive actions |
| `SameSite=None` | Sent on all cross-site (needs `Secure`) | Only when needed |
| `Domain` | Controls which domains receive the cookie | Restrict to your domain |
| `Path` | Controls which paths receive the cookie | Default `/` |
| `Max-Age` / `Expires` | Cookie lifetime | **Yes** (30m - 7d) |

```http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
```

## Session vs JWT Comparison

| | Server Sessions | JWT |
|---|---|---|
| Revocation | Instant (delete session) | Requires blocklist |
| Storage | Server-side (DB/Redis) | Client-side (token payload) |
| Scaling | Shared session store needed | Stateless — easy to scale |
| Payload size | Unlimited | Limited (sent on every request) |
| XSS risk | Cookie with HttpOnly is safer | Token in localStorage is vulnerable |
| CSRF risk | Needs CSRF token (SameSite helps) | No CSRF (not cookie-based) |
| Mobile friendly | Requires cookie sharing | Easy (header-based) |

## When to Use Sessions

- Traditional server-rendered web apps
- When you need instant revocation
- Applications that control both frontend and backend

## When to Use JWT (Token-based) Instead

- APIs consumed by mobile apps or SPAs
- Microservices (no shared session store needed)
- Third-party API access

## Session Security Best Practices

1. Rotate session ID on login (prevent session fixation)
2. Use Redis (not in-memory) for production — survives restarts
3. Set reasonable expiry (30 min inactivity, 7d absolute max)
4. Regenerate session ID on privilege escalation
5. Store only user ID + metadata in session (not sensitive data)
6. Use `HttpOnly` + `Secure` + `SameSite=Lax` always

---

# 7. Passkeys & WebAuthn (FIDO2)

## What It Is

Passkeys are **passwordless** authentication using public-key cryptography. Instead of a shared secret (password), the user's device creates a key pair:

- **Private key** — stays on the device (never leaves)
- **Public key** — registered with the server

Authentication is a signature challenge — the server sends a random challenge, the device signs it with the private key, and the server verifies with the public key.

> **No shared secret = no credential theft.** Phishing doesn't work because the private key is bound to the origin (yourdomain.com).

## The Core Protocol: WebAuthn

WebAuthn is part of FIDO2 and is supported by:
- Chrome, Firefox, Safari, Edge
- Windows Hello, macOS Touch ID/Face ID, Android biometrics
- YubiKey (hardware security key)
- iCloud Keychain, Google Password Manager, 1Password

## Registration (Creating a Passkey)

```
Browser                    WebAuthn API           Server
  |                            |                     |
  |-- "Sign up" -------------->|                     |
  |                            |                     |
  |                            |-- POST /register -->|
  |                            |<-- challenge -------|  
  |                            |   { challenge,
  |                            |     rpId: "example.com",
  |                            |     userId: "user123",
  |                            |     userName: "user@..." }
  |                            |                     |
  |-- navigator.credentials -->|                     |
  |   .create({ publicKey })   |                     |
  |                            |  OS/Browser prompts  |
  |                            |  user: Face ID/Touch |
  |                            |  ID / YubiKey       |
  |<-- PublicKeyCredential ---|                     |
  |   { id, rawId,             |                     |
  |     response: {            |                     |
  |       clientDataJSON,      |                     |
  |       attestationObject } }                     |
  |                            |                     |
  |-- POST /register -------->|                     |
  |   { credential.id,        |                     |
  |     publicKey,             |                     |
  |     clientDataJSON }       |                     |
  |                            |  Store public key   |
  |                            |  associated with    |
  |                            |  user               |
```

Client-side registration code:

```js
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: new Uint8Array([/* from server */]),
    rp: { id: 'example.com', name: 'Example' },
    user: {
      id: new Uint8Array([/* user id */]),
      name: 'user@example.com',
      displayName: 'John Doe',
    },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
    authenticatorSelection: {
      residentKey: 'required',  // discoverable credential
      userVerification: 'required', // biometric or PIN
    },
  },
});
```

## Authentication (Login with Passkey)

```
Browser                    WebAuthn API           Server
  |                            |                     |
  |-- "Login" --------------->|                     |
  |                            |                     |
  |                            |-- POST /auth ---->  |
  |                            |   (user ID or none) |
  |                            |<-- challenge -------|
  |                            |   { challenge,
  |                            |     rpId: "example.com",
  |                            |     allowCredentials?: [...] }
  |                            |                     |
  |-- navigator.credentials -->|                     |
  |   .get({ publicKey })      |                     |
  |                            |  OS/Browser prompts  |
  |                            |  Face ID / Touch ID |
  |<-- PublicKeyCredential ---|                     |
  |   { id, rawId,             |                     |
  |     response: {            |                     |
  |       clientDataJSON,      |                     |
  |       authenticatorData,   |                     |
  |       signature } }        |                     |
  |                            |                     |
  |-- POST /auth ------------>|                     |
  |   { credential.id,        |                     |
  |     signature,             |                     |
  |     authenticatorData,     |                     |
  |     clientDataJSON }       |                     |
  |                            |  Verify signature   |
  |                            |  against stored     |
  |                            |  public key          |
  |<-- Logged in! -------------|                     |
```

Client-side login code:

```js
const credential = await navigator.credentials.get({
  publicKey: {
    challenge: new Uint8Array([/* from server */]),
    rpId: 'example.com',
    userVerification: 'required',
    // allowCredentials: [...]  // optional — restrict to specific keys
  },
});

// Send credential to server for verification
const response = await fetch('/auth', {
  method: 'POST',
  body: JSON.stringify({
    id: credential.id,
    signature: credential.response.signature,
    authenticatorData: credential.response.authenticatorData,
    clientDataJSON: credential.response.clientDataJSON,
  }),
});
```

## Passkeys vs Passwords

| | Passwords | Passkeys |
|---|---|---|
| Secrets | User knows password | Private key on device only |
| Phishing resistant | No | **Yes** (bound to origin) |
| Strength | Varies (weak to strong) | Always strong (crypto-grade) |
| MFA built-in | No | Yes (biometric + crypto) |
| User experience | Remember/type/forget | Face ID / Touch ID |
| Cross-device | Works anywhere | Sync via iCloud/GPM/1Password |
| Cost | Free | FIDO server implementation |

## Passkeys Cross-Device (The Magic)

User has a passkey on their **phone** and wants to log in on a **laptop**:

1. Laptop shows a QR code
2. User scans QR code with phone
3. Phone authenticates (Face ID)
4. Phone signs the challenge with its private key
5. Phone sends signature over Bluetooth
6. Laptop sends signature to server → logged in

All without the password or private key ever leaving the phone.

## Security Properties

| Property | How Passkeys Achieve It |
|----------|------------------------|
| Phishing resistant | Private key bound to origin — fake site has different origin |
| No credential reuse | Each site gets a unique key pair |
| No server breach risk | Server stores only public keys (useless to attackers) |
| Built-in MFA | You need the device (have) + biometric (are) |
| Replay resistant | Challenge-response prevents replay |

## When to Use Passkeys

- User-facing consumer apps
- Reducing password-related support tickets ("forgot password")
- High-security applications (finance, healthcare)
- Any greenfield project

## When NOT to Use Passkeys

- Internal enterprise with legacy systems (use SAML/OIDC)
- Applications requiring shared device access (kiosks)
- Users who need to log in from random public computers
- Until passkey manager sync is universal (still rolling out)

## FIDO2 Stack Summary

```
FIDO2
├── WebAuthn (W3C standard) — browser API
│   ├── navigator.credentials.create()  — registration
│   └── navigator.credentials.get()     — authentication
│
└── CTAP (Client to Authenticator Protocol)
    ├── CTAP1 — U2F (older, hardware keys only)
    └── CTAP2 — full FIDO2 (platform + cross-platform)
```

---

# 8. Other Methods

## LDAP (Lightweight Directory Access Protocol)

**What it is:** Protocol for accessing and maintaining distributed directory information services over an IP network. Think "phone book for enterprise."

**How it works:**
```
Client -- LDAP bind (username + password) --> LDAP Server
       <-- LDAP entry (attributes, groups) --
```

- Used to look up users, groups, and permissions in directories
- Common in enterprise with Active Directory, OpenLDAP, FreeIPA
- Not a web protocol — apps connect over TCP (port 389/636)

**When to use:**
- Enterprise internal tools connected to Active Directory
- VPN auth, email server auth, file server auth

**When NOT to use:**
- Web/mobile apps (use OIDC)
- External-facing apps exposed to the internet

## Kerberos

**What it is:** Ticket-based authentication protocol using symmetric-key cryptography. Developed by MIT, default on Windows domains.

**How it works:**
```
User                    KDC (Key Distribution Center)
 |                            |
 |-- AS-REQ (user auth) ---->|
 |<-- TGT (ticket granting) --|
 |                            |
 |-- TGS-REQ (TGT + service) |
 |<-- Service Ticket --------|
 |                            |
 |-- Service Ticket -------->|  (to the actual service)
 |<-- Access granted ---------|
```

**When to use:**
- Windows domain authentication
- Internal enterprise networks
- When you need mutual authentication (client verifies server too)

**When NOT to use:**
- Web apps (use OIDC)
- Any internet-facing application

## mTLS (Mutual TLS)

**What it is:** Both sides of the connection present certificates. Not just the server proving its identity to the client, but the **client also proves its identity to the server**.

**How it works:**
```
Client                          Server
  |                               |
  |-- ClientHello --------------->|
  |<-- ServerHello + Cert --------|
  |                               |
  |-- Client Certificate -------->|  ← NEW (normal TLS doesn't do this)
  |-- CertificateVerify() ------->|   (signs previous messages with
  |                               |    client private key)
  |<-- Server Finished -----------|
```

**When to use:**
- Service-to-service communication (microservices)
- IoT device authentication
- High-security API gateways

**When NOT to use:**
- Browser-based apps (certificate management is painful)
- Mobile apps (certificate distribution is hard)

## API Keys

**What it is:** A static, long-lived string sent in headers to identify the caller.

```
GET /api/data
X-API-Key: sk_live_abc123def456
```

**Pros:** Simple, no OAuth complexity
**Cons:** Low security (static, no rotation, no scoping)

**When to use:**
- Simple internal services
- Developer API access (stripe-like keys)
- Read-only public API metering

**When NOT to use:**
- Any auth that involves user identity
- Any scenario where key could be leaked (public clients)

**Best practice:**
- Use `sk_live_` prefix + server-side validation
- Allow key rotation
- Rate limit per key
- Never expose in client-side code

## RADIUS (Remote Authentication Dial-In User Service)

**What it is:** A networking protocol for AAA (Authentication, Authorization, Accounting). Used for WiFi, VPN, and network device access.

**How it works:**
```
Client               NAS (WiFi AP/VPN)         RADIUS Server
  |                         |                         |
  |-- Connect request ----->|                         |
  |                         |-- Access-Request ------>|
  |                         |<-- Access-Accept -------|
  |<-- Connected -----------|                         |
```

**When to use:**
- WiFi enterprise (WPA2-Enterprise)
- VPN authentication (Cisco, OpenVPN)
- Network device admin access

**Common trap:** RADIUS sends passwords with only obfuscation, not encryption. Always tunnel inside a VPN/TLS.

---

# 9. Identity Providers (Social Login)

## Overview

These are services that authenticate users on behalf of your app. All use OAuth 2.0 + OIDC under the hood.

| Provider | Protocol | Notable Features |
|----------|----------|-----------------|
| **Apple** | OIDC | Privacy-focused (hide-my-email, no fingerprinting), **mandatory** on iOS if you have social login |
| **Google** | OIDC | Highest adoption, good docs, free |
| **Facebook** | OAuth 2.0 (extended) | Large user base, Graph API for additional data |
| **GitHub** | OAuth 2.0 | Developer-focused, no OIDC (uses access token + user API) |
| **Microsoft Entra ID** | OIDC + SAML | Enterprise (formerly Azure AD) |
| **Twitter/X** | OAuth 2.0 | Write access for posting tweets |
| **LinkedIn** | OAuth 2.0 | Professional profiles, B2B |

## Key Differences

### Apple (Sign in with Apple)

- **Privacy relay** — Apple generates a random relay email (`abc123@privaterelay.appleid.com`) that forwards to the user's real email
- **No tracking** — no user fingerprinting or analytics
- **JWT format** — ID token signed with Apple's private key
- **Mandatory** — App Store requires it if you have any social login
- **User identifier** — `sub` is unique per developer (not shared with other apps)

### Google

- **Open** — easiest to integrate, most developer tools
- **Profile data** — name, email, picture, locale
- **Hosted domain** — G Suite/Workspace accounts show `hd` (hosted domain) claim

### GitHub

- **No OIDC** — doesn't issue ID tokens
- **Access token** — you call the GitHub API to get user info
- **Scopes** — `repo`, `user`, `read:org`, etc.

## Shared Implementation Pattern

```js
// Step 1: Create OAuth client configuration
const oauthConfig = {
  apple: {
    clientId: 'com.example.app',
    redirectUri: 'https://example.com/auth/apple/callback',
    scope: 'openid email name',
  },
  google: {
    clientId: '123456.apps.googleusercontent.com',
    redirectUri: 'https://example.com/auth/google/callback',
    scope: 'openid email profile',
  },
};

// Step 2: Redirect user to provider's authorize URL
function startSocialLogin(provider) {
  const config = oauthConfig[provider];
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: generateStateNonce(), // CSRF protection
    code_challenge: generateCodeChallenge(), // PKCE
  });
  // Redirect user to provider
  window.location.href = `https://${provider}.com/oauth2/authorize?${params}`;
}

// Step 3: Handle callback
async function handleCallback(provider, code, state) {
  // Verify state matches what you sent
  if (state !== expectedState) throw new Error('CSRF detected');

  // Exchange code for tokens
  const tokenResponse = await fetch('https://api.example.com/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ provider, code, code_verifier }),
  });

  // Server verifies ID token, creates user session
  const { sessionId } = await tokenResponse.json();
  document.cookie = `session=${sessionId}; HttpOnly; Secure; SameSite=Lax`;
}
```

---

# 10. Vendor Solutions

## When to Use a Vendor vs Build Your Own

| Scenario | Recommendation |
|----------|---------------|
| Simple login for one app | Build (OIDC + sessions) |
| Multi-tenant B2B with enterprise SSO | Vendor |
| Need SAML + OIDC + social login | Vendor |
| 100k+ users | Vendor |
| Early-stage MVP | Build first, migrate later |

## Auth Vendors Comparison

| Product | Best For | Self-Host? | Pricing |
|---------|----------|------------|---------|
| **Auth0** | Most teams | Cloud only | MAU-based, expensive at scale |
| **Okta** | Enterprise IT | Cloud + on-prem | Per-user, enterprise pricing |
| **Firebase Auth** | Mobile apps in GCP | No | Free up to 10k MAU |
| **Clerk** | Modern web apps | No | Developer-friendly, MAU-based |
| **Supabase Auth** | Supabase projects | Yes (open source) | Free tier, then usage-based |
| **Keycloak** | Teams that want self-hosted | **Yes** (Java) | Free (open source) |
| **WorkOS** | B2B SaaS needing SSO | Cloud only | Enterprise features, transparent |
| **SuperTokens** | Developer-first, open-core | Yes + cloud | Free self-host, MAU cloud |
| **Logto** | Modern OIDC | Yes (open source) | Free self-host |

## Quick Config Snippet (Auth0 example)

```js
import { createAuth0Client } from '@auth0/auth0-spa-js';

const auth0 = await createAuth0Client({
  domain: 'my-app.us.auth0.com',
  clientId: 'abc123',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: 'https://api.example.com',
    scope: 'openid profile email',
  },
});

// Login
await auth0.loginWithPopup();

// Get user
const user = await auth0.getUser();
// { sub, email, name, picture }

// Get token for API
const token = await auth0.getTokenSilently();
```

---

# 11. Cheatsheets

## OAuth 2.0 Authorization Code + PKCE Flow

```
User                    SPA/App                    Auth Server
 |                        |                            |
 |--- Clicks Login ------>|                            |
 |                        |                            |
 |---- Redirect to ------>|                            |
 |    /authorize          |                            |
 |    ?response_type=code |                            |
 |    &client_id=app      |                            |
 |    &redirect_uri=cb    |                            |
 |    &code_challenge=X   |                            |
 |    &state=Y            |                            |
 |                        |                            |
 |--- Logs in & Consents->|                            |
 |                        |                            |
 |<--- Redirect to -------|                            |
 |    callback?code=Z     |                            |
 |    &state=Y            |                            |
 |                        |                            |
 |                        |--- POST /token ---------->|
 |                        |   code=Z                  |
 |                        |   code_verifier=V         |
 |                        |   client_id=app           |
 |                        |                            |
 |                        |<-- { access_token, --------|
 |                        |      id_token,            |
 |                        |      refresh_token }       |
 |                        |                            |
 |--- Logged in --------->|                            |
```

## JWT Lifetime Decision Tree

```
How long should token live?
│
├── Access Token
│   ├── Public client (SPA/mobile) → 15 min
│   ├── Confidential client (server) → 1 hour
│   └── Machine-to-machine → 1 hour
│
├── Refresh Token
│   ├── Consumer app → 30 days (rotate on use)
│   ├── Enterprise app → 7 days
│   └── High security → 1 day
│
└── ID Token (OIDC)
    └── 1 hour (never refresh — re-authenticate)
```

## OAuth Grant Type Selector

```
Do you need user identity?
│
├── YES → OpenID Connect (adds id_token to Authorization Code flow)
│
└── NO → OAuth 2.0
    │
    ├── Is the client a public client (SPA / mobile)?
    │   └── YES → Authorization Code + PKCE
    │
    ├── Is it machine-to-machine?
    │   └── YES → Client Credentials
    │
    ├── Is it a device with no browser (TV, CLI)?
    │   └── YES → Device Code
    │
    └── Is it a first-party mobile app → still use PKCE
```

## Session Cookie Configuration

```http
Set-Cookie: session=<value>;
  HttpOnly;          # JS can't read it
  Secure;            # HTTPS only
  SameSite=Lax;      # Not sent on cross-site POST (CSRF protection)
  Path=/;            # Sent to all paths
  Max-Age=86400;     # Auto-expire in 24 hours
```

## WebAuthn Parameter Quick Reference

| Parameter | Registration | Authentication | Description |
|-----------|-------------|---------------|-------------|
| `challenge` | Required | Required | Random bytes from server |
| `rp.id` | Required | — | Your domain (e.g., `example.com`) |
| `rp.name` | Required | — | Human-readable name |
| `user.id` | Required | — | User identifier (bytes) |
| `user.name` | Required | — | User identifier (string) |
| `user.displayName` | Required | — | Human-readable name |
| `pubKeyCredParams` | Required | — | `[{type: "public-key", alg: -7}]` |
| `authenticatorSelection.residentKey` | Recommended | — | `"required"` for passkeys |
| `authenticatorSelection.userVerification` | Recommended | Required | `"required"` for biometric |
| `rk` | — | Required | `"required"` |
| `allowCredentials` | — | Optional | Restrict to specific credentials |

---

# 12. Quick Reference Table

| # | Name | Category | Format | Stateless? | Revocable? | Phishing Resistant? | Primary Use Case |
|---|------|----------|--------|:----------:|:-----------:|:-------------------:|-----------------|
| 1 | **JWT** | Token format | JSON (signed) | Yes | No | No | Stateless API auth |
| 2 | **OAuth 2.0** | Authorization framework | Any token | Depends | Depends | No | API delegation |
| 3 | **OpenID Connect** | Auth protocol | JWT (ID token) | Yes | Tokens: no | No | User login / SSO |
| 4 | **SAML 2.0** | Auth protocol | XML | No | Yes | No | Enterprise SSO |
| 5 | **Session Cookies** | Auth method | Cookie + server storage | No | Yes | Partially (SameSite) | Traditional web apps |
| 6 | **WebAuthn (Passkeys)** | Auth protocol | Public-key crypto | Yes | Yes (delete key) | **Yes** | Passwordless login |
| 7 | **LDAP** | Directory protocol | Binary | No | Yes | No | Enterprise directory |
| 8 | **Kerberos** | Auth protocol | Binary tickets | No | Yes (TGT expiry) | No | Windows domain auth |
| 9 | **mTLS** | Transport auth | X.509 certs | No | Yes (revoke cert) | Yes | Service-to-service |
| 10 | **API Keys** | Token format | Static string | Yes | Yes | No | Simple API access |
| 11 | **RADIUS** | Network auth | Binary | No | Yes | No | WiFi/VPN |
| 12 | **Biometric** | Auth factor | Biometric data | N/A | N/A | Yes | Device unlock |
| 13 | **TOTP/OTP** | Auth factor | Time-based code | N/A (server stored) | Yes | No | MFA |
| 14 | **Magic Link** | Auth method | Signed URL | Yes | Yes (one-time) | No | Passwordless email login |
| 15 | **Apple** | Social IdP | OIDC (JWT) | Yes | No | No | Sign in with Apple |
| 16 | **Google** | Social IdP | OIDC (JWT) | Yes | No | No | Sign in with Google |
| 17 | **Auth0** | Auth vendor | Multi-protocol | Yes | Yes (manageable) | Optional | Managed auth |
| 18 | **Keycloak** | Auth vendor | Multi-protocol | Yes | Yes | Optional | Self-hosted IAM |

---

## Learning Roadmap

If you're new to auth, learn in this order:

```
Week 1: JWT → Sessions → MFA/TOTP
   (understand token format + basic session management)

Week 2: OAuth 2.0 → PKCE
   (understand authorization delegation)

Week 3: OpenID Connect
   (understand identity on top of OAuth)

Week 4: Passkeys / WebAuthn
   (understand passwordless future)

Week 5: SAML 2.0
   (understand enterprise SSO — read, don't implement)

Week 6: OAuth 2.1 + Vendor solutions
   (understand latest standards + when to buy vs build)
```

---

> **Final Rule of Thumb**: For a modern app in 2026, start with **OIDC (Authorization Code + PKCE)** for user login, issue **JWT access tokens** for your API, use **WebAuthn/passkeys** as a passwordless option, and add **SAML** only if enterprise customers demand it.
