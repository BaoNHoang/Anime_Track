import { ExternalLink, ShieldCheck } from "../../components/OwnedIcons";

const PRIVACY_EMAIL = "bao12162003@gmail.com";

export function PrivacyPage() {
  return (
    <div className="page-stack legal-page">
      <header className="page-heading legal-page__heading">
        <span className="legal-page__mark" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h1>Privacy Policy</h1>
          <p>Last updated: September 6, 2026</p>
        </div>
      </header>

      <div className="legal-copy">
        <p>
          This Privacy Policy explains how Banime handles information when you
          use the Banime website, install its web app, or create an account.
          Banime is an anime discovery and personal tracking service.
        </p>

        <section>
          <h2>Information we handle</h2>
          <p>Depending on how you use Banime, this can include:</p>
          <ul>
            <li>
              Account information: email address, username, account identifier,
              verification status, and sign-in provider.
            </li>
            <li>
              Library information: anime entries, watch status, episode
              progress, scores, notes, episode watch dates, per-show release
              notification preferences, and the dates you add or update entries.
            </li>
            <li>
              Notification information: scheduled-release alerts, their
              episode numbers and release times, related upcoming-season
              alerts, the related season IDs already discovered, and the last
              time your account checked for new releases.
            </li>
            <li>
              Device storage: your locally stored library, theme choice, watch
              provider preference, and cached catalog results.
            </li>
            <li>
              Technical information processed by our hosting and security
              providers, such as IP address, browser/request metadata, and
              rate-limit events.
            </li>
          </ul>
          <p>
            Banime does not ask for payment card information, precise location,
            contacts, microphone, camera, or health information.
          </p>
        </section>

        <section>
          <h2>How information is used</h2>
          <p>We use information to:</p>
          <ul>
            <li>create, secure, and recover accounts;</li>
            <li>store and synchronize your private anime library;</li>
            <li>calculate personal recommendations and annual viewing stats in
              your browser;</li>
            <li>provide anime discovery, news, and external watch-search links;</li>
            <li>prevent abuse, authenticate requests, apply rate limits, and
              investigate service errors; and</li>
            <li>maintain and improve the reliability and security of Banime.</li>
          </ul>
          <p>
            Banime does not sell personal information or use it for targeted
            advertising. We do not intentionally send your library, notes, or
            account credentials to anime catalog providers.
          </p>
        </section>

        <section>
          <h2>Local storage, cookies, and cache</h2>
          <p>
            Banime is local-first. Your library is stored in your browser so it
            can remain available on your device. If you sign in, Banime can also
            synchronize that library and release-notification inbox to your
            account. You can clear local data through your browser settings;
            doing so does not delete cloud copies associated with a signed-in
            account.
          </p>
          <p>
            When account features are enabled, Banime uses essential,
            HttpOnly session cookies to keep you signed in and protect account
            requests. If you register a passkey, Supabase stores its public
            credential and device label; Banime never receives your fingerprint,
            face scan, device PIN, or private key. Banime also caches public
            catalog content to reduce repeated requests. Banime does not
            currently use advertising or analytics cookies.
          </p>
          <dl className="cookie-list">
            <div>
              <dt><code>banime_access</code></dt>
              <dd>
                Authenticates account requests. It expires with the short-lived
                access session, typically in about one hour.
              </dd>
            </div>
            <div>
              <dt><code>banime_refresh</code></dt>
              <dd>
                Renews a signed-in session without asking you to log in again.
                It expires after 30 days or is removed when you sign out or
                delete your account.
              </dd>
            </div>
            <div>
              <dt><code>banime_pkce</code></dt>
              <dd>
                Protects the Google sign-in redirect. It expires after 10
                minutes and is removed when the sign-in callback finishes.
              </dd>
            </div>
          </dl>
          <p>
            These cookies are limited to Banime, use <code>SameSite=Lax</code>,
            cannot be read by browser JavaScript, and use <code>Secure</code> on
            the production HTTPS site. They are strictly necessary for the
            account service you request. Banime does not show a cookie-consent
            banner because it does not currently set optional analytics,
            advertising, or social-tracking cookies. If optional cookies are
            introduced, Banime will request consent where required before
            setting them.
          </p>
          <p>
            Browser local storage and the offline application cache are not
            cookies. They hold your local library, preferences, and public
            catalog files, your last account display profile, cached notifications,
            custom-list membership, and pending account-specific library edits.
            Pending edits remain on this device until synchronized or site data
            is cleared. You can remove them through your browser&apos;s site-data
            controls.
          </p>
        </section>

        <section>
          <h2>Service providers and external links</h2>
          <p>
            We use service providers to operate Banime. They may process
            information under their own policies:
          </p>
          <ul>
            <li>
              Vercel hosts the website and server functions.
            </li>
            <li>
              Supabase provides authentication and the database used for cloud
              sync.
            </li>
            <li>
              The email delivery provider configured through Supabase sends
              account verification and password-recovery emails.
            </li>
            <li>
              Google processes sign-in information only when you choose Google
              sign-in.
            </li>
            <li>
              Upstash may process rate-limit keys when distributed rate limiting
              is enabled.
            </li>
            <li>
              Tenrai provides public anime catalog, schedule, and news data.
            </li>
          </ul>
          <p>
            Banime may link to external watch-search or availability services.
            Those sites are independent and their privacy practices apply after
            you leave Banime.
          </p>
        </section>

        <section>
          <h2>Sharing and disclosure</h2>
          <p>
            We do not rent, sell, or publicly disclose your personal library.
            We may disclose information when reasonably necessary to operate the
            service, comply with applicable law or valid legal process, protect
            the rights and safety of users or the public, or prevent fraud and
            abuse.
          </p>
          <p>
            If you choose Share recap, Banime creates a public link containing
            the displayed annual totals, monthly episode counts, favorite genre
            and studio aggregates, and your username. The link does not include
            library entries, notes, episode-level history, account identifiers,
            or authentication data. Anyone with the link can view and forward
            those aggregate values.
          </p>
        </section>

        <section>
          <h2>Retention and your choices</h2>
          <p>
            We keep account and synchronized library data while your account is
            active or as needed for the purposes described here. You can change
            account details in Banime, export your library from Settings, sign
            out the current browser, revoke other device sessions, remove
            passkeys, or delete your account from the Profile page. Self-service
            deletion removes the Supabase authentication user, profile, and
            synchronized library, then clears Banime&apos;s session cookies and
            local library on that browser. You can also ask us to access,
            correct, or delete personal data. We may need to verify that a
            request comes from the account holder before acting on it, and some
            information may be retained where applicable law requires it.
          </p>
          <p>
            To make a privacy request, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> from the
            email associated with your Banime account. Do not send passwords,
            verification codes, access tokens, or full library exports by email.
          </p>
        </section>

        <section>
          <h2>Children's privacy</h2>
          <p>
            Banime is not directed to children under 13, and we do not knowingly
            collect personal information from children under 13. If you believe
            a child has provided personal information, contact us so we can
            investigate and delete it where appropriate.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>
            We use reasonable technical measures designed to protect account and
            cloud-library information, including encrypted HTTPS connections,
            server-managed authentication, restricted session cookies, request
            validation, rate limiting, phishing-resistant passkeys, session
            revocation controls, and database access controls. No online service
            can guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>Changes and contact</h2>
          <p>
            We may update this policy when Banime or applicable requirements
            change. The current version and its effective date will appear on
            this page. Questions about this policy can be sent to <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          </p>
          <a
            className="text-link"
            href="https://github.com/BaoNHoang/Anime_Track"
            target="_blank"
            rel="noreferrer"
          >
            View the public project repository <ExternalLink size={14} />
          </a>
        </section>

        <p className="legal-copy__notice">
          This policy describes Banime&apos;s current practices. It is not legal
          advice; obtain counsel before relying on it for a specific jurisdiction
          or regulated audience.
        </p>
      </div>
    </div>
  );
}
