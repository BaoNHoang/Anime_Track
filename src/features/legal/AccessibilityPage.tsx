import { Accessibility } from "lucide-react";

export function AccessibilityPage() {
  return (
    <div className="page-stack legal-page">
      <header className="page-heading legal-page__heading">
        <span className="legal-page__mark" aria-hidden="true">
          <Accessibility size={22} />
        </span>
        <div>
          <h1>Accessibility</h1>
          <p>How Banime supports a usable experience for more people.</p>
        </div>
      </header>
      <div className="legal-copy">
        <section>
          <h2>Our approach</h2>
          <p>
            Banime aims to support keyboard navigation, visible focus states,
            readable contrast, semantic page structure, text alternatives, and
            reduced motion preferences across light and dark themes.
          </p>
        </section>
        <section>
          <h2>Using the site</h2>
          <p>
            Interactive controls can be reached with a keyboard. Browser zoom
            and text scaling are supported, and motion is reduced when your
            device requests it. Form errors are placed near the related action
            and announced to assistive technology where possible.
          </p>
        </section>
        <section>
          <h2>Report a barrier</h2>
          <p>
            If part of Banime is difficult to use, email
            {" "}<a href="mailto:bao12162003@gmail.com">bao12162003@gmail.com</a>
            {" "}with the page, device, browser, and assistive technology involved.
            Do not include passwords, verification codes, or session details.
          </p>
        </section>
      </div>
    </div>
  );
}
