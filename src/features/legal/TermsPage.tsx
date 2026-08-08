import { Scale } from "lucide-react";

export function TermsPage() {
  return (
    <div className="page-stack legal-page">
      <header className="page-heading legal-page__heading">
        <span className="legal-page__mark" aria-hidden="true">
          <Scale size={22} />
        </span>
        <div>
          <h1>Terms of Use</h1>
          <p>Last updated: August 8, 2026</p>
        </div>
      </header>
      <div className="legal-copy">
        <section>
          <h2>Using Banime</h2>
          <p>
            You may use Banime for personal anime discovery and tracking. You
            are responsible for activity associated with your account and for
            keeping your sign-in credentials private.
          </p>
        </section>
        <section>
          <h2>Acceptable use</h2>
          <p>
            Do not misuse the service, interfere with its operation, attempt to
            access another person&apos;s account or data, evade security controls,
            or use automated traffic that harms availability for others.
          </p>
        </section>
        <section>
          <h2>Catalog content and external services</h2>
          <p>
            Anime titles, artwork, trailers, and related rights belong to their
            respective owners. Catalog information and external links may be
            incomplete, delayed, or unavailable. Third-party services have
            their own terms and policies.
          </p>
        </section>
        <section>
          <h2>Availability and changes</h2>
          <p>
            Banime is provided as available without a guarantee of uninterrupted
            operation. Features may change to maintain security, reliability,
            legal compliance, or compatibility with data providers.
          </p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent to
            {" "}<a href="mailto:bao12162003@gmail.com">bao12162003@gmail.com</a>.
          </p>
        </section>
        <p className="legal-copy__notice">
          These terms are a project-level starting point, not legal advice.
          Obtain qualified legal review before relying on them for production.
        </p>
      </div>
    </div>
  );
}
