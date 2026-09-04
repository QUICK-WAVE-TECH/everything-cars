"use client";

import { useState } from "react";
import { PageHero } from "@/shared/components/page-hero";
import { RevealOnce } from "@/shared/motion/reveal-once";
import { Icon } from "@/features/auth/components/icon";
import type { IconName } from "@/features/auth/components/icon";

const FIELD_CLASS =
  "w-full rounded-lg border border-(--brc-border) bg-white px-4 py-3.5 text-[14px] text-(--brc-text) outline-none transition-[border-color,box-shadow] duration-200 [font-family:var(--brc-font-ui)] placeholder:text-(--brc-text-muted) focus:border-(--brc-primary) focus:shadow-[0_0_0_3px_rgba(0,0,139,0.14)] aria-[invalid=true]:border-(--brc-danger) aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgba(239,18,18,0.14)] motion-reduce:transition-none";

type FieldKey = "name" | "email" | "phone" | "message";

function ContactField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  textarea,
  type = "text",
  autoComplete,
  inputMode,
  spellCheck,
}: {
  id: FieldKey;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  textarea?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email";
  spellCheck?: boolean;
}) {
  const errorId = `${id}-error`;
  const shared = {
    id,
    name: id,
    value,
    placeholder,
    autoComplete,
    spellCheck,
    "aria-invalid": !!error,
    "aria-describedby": error ? errorId : undefined,
    className: FIELD_CLASS,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  } as const;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[14px] font-semibold text-(--brc-text) [font-family:var(--brc-font-ui)]"
      >
        {label}
      </label>
      {textarea ? (
        <textarea rows={5} {...shared} className={`${FIELD_CLASS} resize-none`} />
      ) : (
        <input type={type} inputMode={inputMode} {...shared} />
      )}
      {error && (
        <span
          id={errorId}
          className="text-[12.5px] font-semibold text-(--brc-danger) [font-family:var(--brc-font-ui)]"
        >
          {error}
        </span>
      )}
    </div>
  );
}

export default function ContactPage() {
  const [fields, setFields] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [sent, setSent] = useState(false);

  const set = (k: FieldKey) => (v: string) => {
    setFields((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  function validate() {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!fields.name.trim()) next.name = "Please enter your name.";
    if (!fields.email.trim()) next.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
      next.email = "That email address doesn't look right.";
    if (!fields.message.trim()) next.message = "Please tell us how we can help.";
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    const first = (["name", "email", "phone", "message"] as FieldKey[]).find((k) => next[k]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    // TODO: wire to API
    setFields({ name: "", email: "", phone: "", message: "" });
    setSent(true);
  }

  return (
    <>
      <PageHero
        img="/contact-hero.jpg"
        title="Contact Us"
        sub="Have questions or need help? Reach out and our team will get back to you as soon as possible."
      />

      <section
        className="relative overflow-hidden bg-white"
        style={{ padding: "var(--brc-section-y, 104px) var(--brc-space-10, 104px)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 42% at 12% 8%, rgba(0,0,139,0.07), transparent 62%), radial-gradient(44% 38% at 92% 88%, rgba(195,101,35,0.07), transparent 66%)",
          }}
        />

        <RevealOnce className="relative mx-auto grid max-w-[1232px] grid-cols-1 items-start gap-10 lg:gap-20 lg:[grid-template-columns:0.92fr_1.08fr]">
          {/* Left — copy + details + oversized mark */}
          <div className="relative flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <h2
                className="m-0 text-[clamp(32px,3.8vw,52px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-(--brc-text) [font-family:var(--brc-font-display)]"
                style={{ textWrap: "balance" }}
              >
                Still Have Questions?
                <br />
                Contact Us!
              </h2>
              <p
                className="m-0 max-w-[46ch] text-[16.5px] leading-[1.65] text-(--brc-text-muted) [font-family:var(--brc-font-ui)]"
                style={{ textWrap: "pretty" }}
              >
                We&apos;re here to help. Fill out the form, and a member of our support team will get
                back to you shortly.
              </p>
            </div>

            <ul className="flex list-none flex-col gap-4 p-0">
              {(
                [
                  ["phone", "+234 8123456789", "tel:+2348123456789"],
                  ["mail", "support@buyandrentcars.com", "mailto:support@buyandrentcars.com"],
                ] as [IconName, string, string][]
              ).map(([ic, txt, href]) => (
                <li key={txt} className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md"
                    style={{ background: "var(--brc-accent)" }}
                  >
                    <Icon name={ic} size={14} stroke="#fff" />
                  </span>
                  <a
                    href={href}
                    className="rounded text-[16px] text-(--brc-accent) underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brc-accent) [font-family:var(--brc-font-ui)]"
                  >
                    {txt}
                  </a>
                </li>
              ))}
            </ul>

            <div
              aria-hidden="true"
              className="select-none [font-family:var(--brc-font-display)]"
              style={{
                fontWeight: 800,
                fontSize: "clamp(96px, 35vw, 220px)",
                lineHeight: 0.8,
                color: "var(--brc-primary-tint)",
                marginTop: 8,
              }}
            >
              ?
            </div>
          </div>

          {/* Right — form card */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-w-0 flex-col gap-5 rounded-2xl border border-(--brc-border) bg-(--brc-bg-subtle) p-[clamp(20px,5vw,28px)] shadow-(--brc-shadow-md)"
          >
            <ContactField
              id="name"
              label="Full Name"
              placeholder="Your name…"
              value={fields.name}
              onChange={set("name")}
              error={errors.name}
              autoComplete="name"
            />
            <ContactField
              id="email"
              label="Email Address"
              placeholder="you@example.com"
              value={fields.email}
              onChange={set("email")}
              error={errors.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
            />
            <ContactField
              id="phone"
              label="Phone Number"
              placeholder="Your phone number…"
              value={fields.phone}
              onChange={set("phone")}
              error={errors.phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <ContactField
              id="message"
              label="Message"
              placeholder="How can we help?…"
              value={fields.message}
              onChange={set("message")}
              error={errors.message}
              textarea
            />

            <button
              type="submit"
              className="brc-button-motion brc-contact-submit inline-flex h-[50px] w-fit max-w-full cursor-pointer items-center justify-center self-start whitespace-nowrap rounded-lg border-none px-[clamp(24px,7vw,38px)] text-[clamp(14px,3.6vw,16px)] font-semibold leading-none text-white [font-family:var(--brc-font-ui)]"
              style={{ background: "var(--brc-accent)" }}
            >
              Send Message
            </button>

            <p aria-live="polite" className="m-0 min-h-[1.25rem] text-[13px] font-semibold text-(--brc-success) [font-family:var(--brc-font-ui)]">
              {sent ? "Thanks — we've got your message and will be in touch shortly." : ""}
            </p>
          </form>
        </RevealOnce>
      </section>
    </>
  );
}
