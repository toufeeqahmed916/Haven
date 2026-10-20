import { useEffect, useRef, useState, type FormEvent } from "react";

type Navigate = (path: string) => void;

const steps = [
  ["01", "Tell us what happened", "Use voice, text, or a photo. Urdu, Sindhi, and English are supported in the reporting experience.", "⌁", "Speak or type naturally", "No formal wording needed to begin."],
  ["02", "Review your report", "Haven can prepare a summary and suggest a category. You can correct the details before continuing.", "☷", "Your summary, in plain language", "You stay in control of what you submit."],
  ["03", "Get practical guidance", "See safety suggestions, relevant rights information, and a checklist of details or evidence you may want to keep.", "＋", "Safety first", "Guidance is general, not a substitute for legal advice."],
  ["04", "A person reviews the case", "AI urgency is only a suggestion. An authorized human reviewer makes the decision and determines the next action.", "✓", "AI suggests. Humans decide.", "Human review is part of the process."],
  ["05", "Follow status updates", "Where the service is connected, track your case status and see when new information is available.", "", "", ""],
];

const faqs = [
  ["Is Haven an emergency service?", "No. Haven helps people organise a report, understand options, and follow progress where supported. If you are in immediate danger, contact emergency services directly. In Pakistan, Police emergency number 15 is commonly used."],
  ["Does AI decide how urgent my case is?", "No. AI may suggest an urgency level and explain why. An authorized human reviewer must confirm or change it. A suggestion is never a final decision."],
  ["Can I report in Urdu or Sindhi?", "Yes. The reporting experience supports Urdu, Sindhi, and English. You can review and correct the written summary before submitting it."],
  ["Will someone definitely arrive after I submit?", "A submission does not guarantee dispatch or a specific arrival time. Response depends on case review, available services, and local procedures. Any ETA must come from the responsible dispatcher."],
  ["Is the legal information legal advice?", "No. It is general guidance and must include verified legal sources. For advice about your circumstances, speak with a qualified lawyer or legal aid provider."],
];

export function LandingPage({ navigate }: { navigate: Navigate }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.style.overflow = reportOpen ? "hidden" : "";
    if (reportOpen) closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setReportOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [reportOpen]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    sessionStorage.setItem("haven-report-draft", JSON.stringify({
      category: form.get("category"),
      details: form.get("details"),
      area: form.get("area"),
    }));
    setReportOpen(false);
    navigate("/signup");
  };

  const reportButton = (label = "Report a problem") => (
    <button className="landing-btn landing-btn-primary" type="button" onClick={() => setReportOpen(true)}>
      {label} <span aria-hidden="true">↗</span>
    </button>
  );

  return (
    <div className="landing-page">
      <header className="landing-hero-shell">
        <nav className="landing-nav landing-wrap" aria-label="Primary navigation">
          <a className="landing-brand" href="#top" aria-label="Haven home"><span className="landing-brand-mark">h</span>haven</a>
          <div className="landing-navlinks"><a href="#about">About Haven</a><a href="#how">How it works</a><a href="#guides">Safety guides</a><a href="#rights">Legal help</a><a href="#partners">For partners</a></div>
          <div className="landing-nav-actions">{reportButton()}</div>
        </nav>
        <div className="landing-hero landing-wrap" id="top">
          <div className="landing-eyebrow">A safer way to ask for help</div>
          <h1>Safety should never depend on knowing the <span className="landing-highlight">right words.</span></h1>
          <p>Tell us what happened in your own language. Haven helps you understand your options and gets your report in front of a real person.</p>
          <div className="landing-hero-actions">{reportButton()}<a className="landing-btn landing-btn-outline" href="#how">See how it works <span>↓</span></a></div>
        </div>
        <div className="landing-hero-image-wrap">
          <img className="landing-hero-image" src="https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1800&q=85" alt="A family standing together in warm natural light" />
          <div className="landing-float-note one"><span className="landing-note-icon">✓</span><span>Someone will review your report<small>Human support, not just automation</small></span></div>
          <div className="landing-float-note two"><span className="landing-note-icon">◉</span><span>Your language, your choice<small>Urdu · Sindhi · English</small></span></div>
        </div>
      </header>

      <section className="landing-partner-strip" id="partners"><div className="landing-wrap landing-partner-row"><span className="landing-partner-label">Built to work alongside</span>{["Rescue services", "Legal aid", "Community groups", "Local departments"].map((item) => <span className="landing-partner" key={item}><i className="landing-partner-symbol" />{item}</span>)}</div></section>

      <main>
        <section className="landing-section" id="about"><div className="landing-wrap landing-story-grid"><div className="landing-story-copy"><div className="landing-eyebrow">Why Haven exists</div><h2>Getting help shouldn't be another thing to figure out alone.</h2><p>People often stay silent because they are afraid, unsure who to contact, or don't know how to explain what happened. Haven gives them a clear first step, practical guidance, and a way to follow what happens next.</p><p>From personal safety concerns to everyday civic problems, your report should reach the right place without making you navigate a maze of procedures.</p>{reportButton("Start a report")}</div><div><img className="landing-story-photo" src="https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1200&q=85" alt="Community volunteers working together" /><div className="landing-story-stat"><strong>One clear step.</strong><span>Start with what you know. You can add details later.</span></div></div></div></section>

        <section className="landing-heart-feature" aria-label="Care and connection"><div className="landing-heart-photo"><img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1600&q=85" alt="A warm human gesture representing care, connection, and support" loading="lazy" /></div><div className="landing-heart-copy"><div className="landing-eyebrow">Care looks like showing up</div><h2>Every person deserves to feel <span className="landing-highlight">seen and safe.</span></h2><p>Sometimes support starts with a simple gesture: listening, believing someone, and helping them find a way forward.</p><a className="landing-heart-link" href="#how">See how Haven helps <span>↗</span></a></div></section>

        <section className="landing-section no-top"><div className="landing-wrap landing-impact"><div className="landing-impact-head"><div><div className="landing-eyebrow">Help that makes sense</div><h2>Support should be clear, at every step.</h2></div><p>Haven is designed around practical actions, careful review, and understandable updates. These are product principles, not claimed service statistics.</p></div><div className="landing-impact-grid"><article className="landing-impact-card"><div className="landing-impact-number">01</div><div><h3>Start in your own words</h3><p>Speak, type, or attach a photo. You don't need formal legal language to begin.</p></div></article><article className="landing-impact-card"><div className="landing-impact-number">02</div><div><h3>Understand what comes next</h3><p>Get a plain-language summary and suggested next steps you can review and edit.</p></div></article><article className="landing-impact-card photo-card"><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=85" alt="A support professional listening carefully" /><span className="landing-photo-caption">A real person reviews your report</span></article><article className="landing-impact-card"><div className="landing-impact-number">03</div><div><h3>Follow the progress</h3><p>See status updates as your case moves through review and response.</p></div></article></div></div></section>

        <section className="landing-section" id="how"><div className="landing-wrap landing-steps"><div className="landing-steps-left"><div className="landing-eyebrow">How it works</div><h2>From your voice to a clearer next step.</h2><p className="landing-section-intro">A short, guided process that keeps you informed without promising what the system cannot control.</p><div className="landing-top-space">{reportButton()}</div></div><div className="landing-steps-list">{steps.map(([number, title, copy, icon, previewTitle, previewCopy]) => <article className="landing-step" key={number}><div className="landing-step-num">{number}</div><div><h3>{title}</h3><p>{copy}</p>{icon && <div className="landing-step-preview"><span className="landing-preview-icon">{icon}</span><div><b>{previewTitle}</b><span>{previewCopy}</span></div></div>}</div></article>)}</div></div></section>

        <section className="landing-section no-top"><div className="landing-wrap landing-language-panel"><div><div className="landing-eyebrow">Speak in your language</div><h2>Help should sound familiar.</h2><p>Language should never be a barrier to explaining what happened. The experience supports English, Urdu, and Sindhi, with layouts that respect how each language is read.</p><p>Choose the language that feels easiest. You can review the wording before submitting.</p><button className="landing-btn landing-btn-dark" type="button" onClick={() => navigate("/signup")}>Choose your language</button></div><div className="landing-phone-row"><Phone language="English" title="How can we help?" copy="Tell us what happened. We'll help you find the next step." /><Phone language="Urdu" title="ہم کیسے مدد کریں؟" copy="اپنی زبان میں بتائیں کہ کیا ہوا۔" rtl /><Phone language="Sindhi" title="اوهان جي مدد ڪيئن ڪجي؟" copy="پنهنجي ٻوليءَ ۾ ٻڌايو ته ڇا ٿيو." rtl /></div></div></section>

        <section className="landing-section" id="rights"><div className="landing-wrap landing-justice"><div className="landing-justice-photo"><img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=85" alt="Documents being reviewed on a desk" /></div><div className="landing-justice-copy"><div className="landing-eyebrow accent">Know your rights</div><h2>Clear information. No legal jargon.</h2><p>Understand possible next steps in everyday language, with sources shown alongside the guidance. Legal information must be reviewed and kept up to date by qualified people.</p><div className="landing-law-sample"><small>Example guidance card</small><h3>What can I do if I feel unsafe?</h3><p>If there is immediate danger, move to a safer place if possible and contact the appropriate emergency service. Keep evidence only if doing so does not put you at risk.</p></div><div className="landing-disclaimer">General guidance based on Pakistani law. Not a substitute for a lawyer. Legal references must be verified before use.</div><button className="landing-btn landing-btn-primary landing-top-space" type="button" onClick={() => showToast("Verified legal guidance will be connected in a later step.")}>Explore safety guidance <span>↗</span></button></div></div></section>

        <section className="landing-human-section"><div className="landing-wrap landing-human-grid"><div><div className="landing-eyebrow accent">Designed with accountability</div><h2>AI can help organise a report. It cannot make the final call.</h2><p>Haven may summarize information and suggest urgency, but a suggestion is not a verdict. Human reviewers confirm urgency and decide what happens next.</p><div className="landing-decision-flow"><span className="landing-decision active">AI suggestion</span><span className="landing-arrow">→</span><span className="landing-decision">Human review</span><span className="landing-arrow">→</span><span className="landing-decision">Next action</span></div></div><img className="landing-human-photo" src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85" alt="A team discussing work together" /></div></section>

        <section className="landing-section" id="guides"><div className="landing-wrap"><div className="landing-guides-head"><div><div className="landing-eyebrow">Safety guides</div><h2>Small steps for difficult moments.</h2><p className="landing-section-intro">Practical starting points for common concerns. If you are in immediate danger, contact emergency services.</p></div><a className="landing-read-link" href="#faq">Common questions ↗</a></div><div className="landing-guide-grid"><Guide image="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80" alt="Woman outdoors in natural light" category="Personal safety" title="What to do if someone is following you" onOpen={() => showToast("The full safety-guide library is planned for a later step.")} /><Guide image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80" alt="Phone and laptop on a desk" category="Online safety" title="If someone is threatening to share private information" onOpen={() => showToast("The full safety-guide library is planned for a later step.")} /><Guide image="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80" alt="Workers repairing a road" category="Civic issues" title="How to report a local problem clearly" onOpen={() => showToast("The full safety-guide library is planned for a later step.")} /></div></div></section>

        <section className="landing-section no-top"><div className="landing-wrap landing-privacy-box"><div><div className="landing-eyebrow">Privacy by design</div><h2>Your story belongs to you.</h2><p>People should know what information they share, who can access it, and why it is needed.</p></div><div className="landing-promise-list"><Promise title="Choose your visibility">Public anonymity and identity protection are clearly explained at submission.</Promise><Promise title="Access with a reason">Sensitive identity details are limited to authorized roles.</Promise><Promise title="Understand the process">Haven explains how submitted information is used.</Promise><Promise title="Keep control where possible">Clear routes lead to privacy information and data requests.</Promise></div></div></section>

        <section className="landing-section" id="faq"><div className="landing-wrap landing-faq"><div className="landing-eyebrow centered">Questions, answered</div><h2>Good to know before you begin.</h2>{faqs.map(([question, answer], index) => <div className={`landing-faq-item ${openFaq === index ? "open" : ""}`} key={question}><button className="landing-faq-question" type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><span aria-hidden="true">{openFaq === index ? "−" : "+"}</span></button><div className="landing-faq-answer">{answer}</div></div>)}</div></section>

        <section className="landing-section no-top"><div className="landing-wrap landing-final-cta"><div><div className="landing-eyebrow">You can start here</div><h2>You do not have to figure out the next step alone.</h2><p>Start with what you know. You can review your report before submitting it.</p></div><div>{reportButton()}<p className="landing-emergency-note">In immediate danger? Call Police at 15.</p></div></div></section>
      </main>

      <footer className="landing-footer"><div className="landing-wrap"><div className="landing-footer-top"><div><a className="landing-brand" href="#top"><span className="landing-brand-mark">h</span>haven</a><p className="landing-footer-summary">A clearer first step toward safety, support, and resolution.</p><p>Haven supports and speeds up help. It does not replace police, courts, or emergency services.</p></div><FooterLinks title="Explore" links={[["About Haven", "#about"], ["How it works", "#how"], ["Safety guides", "#guides"], ["Legal help", "#rights"]]} /><FooterLinks title="For citizens" links={[["Make a report", "#how"], ["Sign in", "/login"], ["Create account", "/signup"], ["Privacy information", "#partners"]]} /><div><h4>Important numbers</h4><div className="landing-footer-links"><a href="tel:15">Police emergency: 15</a><a href="tel:1099">Human Rights helpline: 1099</a><p>Confirm numbers before real-world use.</p></div></div></div><div className="landing-footer-bottom"><span>© 2026 Haven university project.</span><span>English · اردو · سنڌي</span></div></div></footer>

      <div className="landing-emergency-fab"><a className="landing-btn landing-btn-coral" href="tel:15">Call 15 Police</a></div>
      <div className={`landing-toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>

      {reportOpen && <div className="landing-report-modal show" role="dialog" aria-modal="true" aria-labelledby="report-title" onMouseDown={(event) => event.target === event.currentTarget && setReportOpen(false)}><div className="landing-modal-card"><button ref={closeButtonRef} className="landing-modal-close" type="button" onClick={() => setReportOpen(false)} aria-label="Close dialog">×</button><div className="landing-eyebrow">Start a report</div><h2 id="report-title">What happened?</h2><p>Create a private draft first. You will sign in before anything is submitted.</p><form onSubmit={submitDraft}><label className="landing-field">What do you need help with?<select name="category" required defaultValue=""><option value="" disabled>Choose a category</option><option>Personal safety</option><option>Threats or blackmail</option><option>Domestic violence</option><option>Theft or fraud</option><option>Missing person</option><option>Civic issue</option><option>Something else</option></select></label><label className="landing-field">Tell us a little about it<textarea name="details" placeholder="Write in your own words. You can keep it brief." required minLength={10} /></label><label className="landing-field">Area or city (optional)<input name="area" placeholder="e.g. Gulshan, Karachi" /></label><button className="landing-btn landing-btn-dark full" type="submit">Save draft and continue <span>↗</span></button></form></div></div>}
    </div>
  );
}

function Phone({ title, copy, rtl = false, language }: { title: string; copy: string; rtl?: boolean; language: string }) {
  return <div className="landing-phone" lang={rtl ? (language === "Urdu" ? "ur" : "sd") : "en"} dir={rtl ? "rtl" : "ltr"}><div className="landing-phone-top" /><div className="landing-mini-brand">haven</div><h4>{title}</h4><p>{copy}</p><div className="landing-mini-row" /><div className="landing-mini-row" /><div className="landing-mini-action" /></div>;
}

function Guide({ image, alt, category, title, onOpen }: { image: string; alt: string; category: string; title: string; onOpen: () => void }) {
  return <article className="landing-guide"><img src={image} alt={alt} loading="lazy" /><div className="landing-guide-body"><span>{category}</span><h3>{title}</h3><button className="landing-read-link as-button" type="button" onClick={onOpen}>Read the guide ↗</button></div></article>;
}

function Promise({ title, children }: { title: string; children: string }) {
  return <div className="landing-promise"><b>{title}</b><span>{children}</span></div>;
}

function FooterLinks({ title, links }: { title: string; links: string[][] }) {
  return <div><h4>{title}</h4><div className="landing-footer-links">{links.map(([label, href]) => <a key={label} href={href}>{label}</a>)}</div></div>;
}
