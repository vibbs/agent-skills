# Overrides

Some projects can't wait for the usual phase. An override is a card keyed by domain or
region: if it applies, the items it lists are pulled forward into P2 and reviewed with
the current phase. Read this file at workflow step 4, after the interview, to decide
which overrides apply and what they pull.

The six cards match `overrides` in `assets/roadmap.json`. If the two ever disagree, the
JSON wins.

> Not legal advice. These cards say which engineering items to bring forward. Whether a
> law applies to a project, and what it requires, is a question for a qualified lawyer.

## How to apply them

- An override applies when the interview answer (or a stored answer) says so. Repo
  evidence can suggest one (an LLM SDK suggests AI features; a Stripe SDK suggests
  payments), and the agent should propose it as the default answer, but the user decides.
- Pulled items join the current phase's review: they can be red, amber or green like any
  P2 item. If the project is still in P1, pulled items are grey like the rest of P2,
  but they lead the "coming next" preview, so the user sees what this domain will ask
  for at launch.
- An item pulled by several overrides is reviewed once; list every override that pulled it.
- Each applied override gets a one-line reason in the report, for example "AI features:
  the app calls OpenAI from app/api/chat/route.ts."
- Show the card's `extra` line once, under the override list, when it adds an action
  the item list doesn't cover (for example, signing BAAs).

## The cards

### Health data
- **Law:** HIPAA (US).
- **Applies when:** the app stores or processes health information about identifiable
  people (diagnoses, symptoms, prescriptions, appointments, wearable data).
- **Pulls into P2:** Encryption at Rest, Audit Logs, IAM, PII Handling, Backups.
- **Why:** health data is regulated from the first real record, not from scale.
- **Also:** sign BAAs with vendors that touch the data, including your LLM provider.

### Payments
- **Law:** PCI DSS.
- **Applies when:** the app charges money, holds balances or credits, or sells inventory.
- **Pulls into P2:** Idempotency, Webhooks, Pessimistic Locking, Audit Logs.
- **Why:** double charges, lost webhooks and race conditions on balances cost real money
  on day one.
- **Also:** a P1 decision: never touch raw card data. Let a payment provider (Stripe,
  Razorpay or similar) hold it. Card numbers in your own forms or database are red.

### Kids as users
- **Law:** COPPA (US) · DPDP children's data (India).
- **Applies when:** children can use the app (under 13 for COPPA; under 18 under DPDP).
- **Pulls into P2:** PII Handling.
- **Why:** collecting a child's data has its own consent rules before anything goes in.
- **Also:** verifiable parental consent before a child's data goes in.

### AI features
- **Law:** none specific.
- **Applies when:** the app calls an LLM or other paid model API (OpenAI, Anthropic,
  Google, Mistral, Groq, Replicate, a gateway like OpenRouter, or the Vercel AI SDK).
- **Pulls into P2:** Rate Limiting, LLM Token Budgets, Prompt Injection, Timeouts,
  Serverless Limits, SSRF, Server-Sent Events.
- **Why:** one unprotected endpoint calling a paid model can run up a bill overnight, so
  rate limiting moves up from P3. Long model calls are what hit timeouts and serverless
  limits first; agents that fetch URLs are what make SSRF real.
- Timeouts, Serverless Limits, SSRF and Server-Sent Events are already P2 items; the
  override marks them as the AI-sensitive ones and makes a missing LLM timeout red.

### EU users
- **Law:** GDPR · European Accessibility Act (EAA).
- **Applies when:** people in the EU use the app, or the app is offered to them.
- **Pulls into P2:** GDPR & Privacy, Accessibility (WCAG 2.1 AA).
- **Why:** both apply from the first EU user, not from scale.
- **Facts to keep exact:**
  - The EAA has applied since 28 June 2025.
  - Its technical standard, EN 301 549, maps to **WCAG 2.1 level AA**. AA is the legal
    bar; AAA is not required.
  - Micro-enterprises (fewer than 10 staff and no more than EUR 2 million turnover or
    balance sheet) are exempt from the EAA's service requirements.
  - The EAA covers specific consumer services (e-commerce, banking, e-books, transport
    and communications among them). Say "may apply" rather than "applies" unless the
    user's service is clearly one of them.

### Indian users
- **Law:** Digital Personal Data Protection Act 2023 (DPDP).
- **Applies when:** the app processes personal data of people in India.
- **Pulls into P2:** PII Handling.
- **Why:** consent and breach-reporting duties shape what data you collect and how you
  log it, which is cheaper to get right before launch.
- **Facts to keep exact:** consent notices, breach reporting and children's-data rules
  apply from **13 May 2027**. Before that date, present it as "coming, design for it
  now", not as a current legal requirement.

## Wording in the report

- Never threaten fines or say "you are non-compliant". Say what the card pulls forward
  and why, in one line.
- Always include the "not legal advice" line once, under the override list, when any
  regulatory override applies (all except AI features).
