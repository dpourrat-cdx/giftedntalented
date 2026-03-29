# ADR: Data Processing Agreements

**Status:** Accepted (action items pending owner completion)
**Date:** 2026-03-29
**Deciders:** Repo owner + Claude
**Relates to:** Backlog Priority 4 — Privacy & Parent Safety (Cross-cutting: DPAs)
**Legal basis:** GDPR Art. 28, UK GDPR Art. 28, COPPA 16 CFR 312.8, LGPD Art. 37–40

---

## Context

Under GDPR Art. 28, when personal data is processed by a third party on behalf of the controller (the repo owner), a Data Processing Agreement (DPA) must be in place before data flows to that processor. The app uses three external processors that handle personal data.

---

## Processor Inventory

### 1. Supabase Inc. — PostgreSQL database

| Attribute | Detail |
|---|---|
| Service | Managed PostgreSQL hosting |
| Data processed | All personal data: explorer names, scores, attempts, events, admin PIN hash, FCM tokens |
| Project region | `us-west-2` (Oregon, USA) |
| DPA available | Yes — [supabase.com/legal/dpa](https://supabase.com/legal/dpa) |
| EU transfer mechanism | Standard Contractual Clauses (SCCs) — required because data may originate from EU/UK users and is stored in the US |
| Action required | **Review and accept the Supabase DPA through the Supabase dashboard** (Settings → Legal). Verify SCCs are included. Record the acceptance date below. |

**⚠️ Priority:** The Supabase DPA is the most critical — it covers all personal data in the app.

### 2. Render — Backend hosting

| Attribute | Detail |
|---|---|
| Service | Node.js backend hosting (Express server) |
| Data processed | Personal data in transit through the backend; Render access logs (IP addresses from standard HTTP logging) |
| DPA available | Yes — [render.com/privacy](https://render.com/privacy) (see Data Processing Addendum section) |
| EU transfer mechanism | Standard Contractual Clauses or adequacy decision — confirm in the Render DPA |
| Action required | **Review and accept the Render DPA through the Render dashboard** (Account → Legal). Record the acceptance date below. |

### 3. Google LLC — Firebase Cloud Messaging

| Attribute | Detail |
|---|---|
| Service | Optional push notifications (FCM) |
| Data processed | FCM device tokens stored in `notification_devices`; notification payloads sent to devices |
| DPA available | Yes — Google Cloud Data Processing Addendum, accepted via Google Cloud Console |
| EU transfer mechanism | SCCs included in Google's standard DPA |
| Action required | **Review and accept Google Cloud Data Processing Terms** in the Firebase / Google Cloud Console. Record the acceptance date below. |

### 4. GitHub Inc. — GitHub Pages (frontend hosting)

| Attribute | Detail |
|---|---|
| Service | Static file hosting for the frontend |
| Data processed | GitHub serves static HTML/CSS/JS files only. No personal data from users flows to GitHub at runtime. |
| DPA required | **No** — GitHub is not a data processor for this app. It serves files; it does not receive or process user personal data. GitHub's standard Terms of Service apply. |
| Action required | None |

---

## Action Items (owner)

Complete these before the privacy policy goes live:

- [ ] Accept Supabase DPA — record version and date: `Version: ___ | Accepted: ___`
- [ ] Verify Supabase DPA includes Standard Contractual Clauses for US–EU transfers
- [ ] Accept Render DPA — record version and date: `Version: ___ | Accepted: ___`
- [ ] Accept Google Cloud Data Processing Terms — record date: `Accepted: ___`
- [ ] Update `docs/decisions/data-processing-agreements.md` with the accepted versions and dates

---

## Disclosure requirement

All three processors (Supabase, Render, Google/Firebase) must be disclosed in the privacy policy (`privacy.html`, Section 6 — "Who we share it with" and Section 7 — "International data transfers"). See PR #2.

The privacy policy must also disclose:
- Data stored in `us-west-2` (Supabase, Render)
- International transfer mechanism: Standard Contractual Clauses with Supabase
- That data is not sold, shared with advertisers, or used for any purpose other than operating the app

---

## Consequences

- **Positive:** DPAs in place satisfy GDPR Art. 28 and equivalent requirements under UK GDPR, LGPD, and COPPA.
- **Positive:** SCCs with Supabase legitimise US–EU data transfers.
- **Negative:** DPA acceptance requires owner action through each provider's dashboard — cannot be completed by an engineering agent.
- **Negative:** DPA versions must be re-reviewed if the app changes processors or a processor updates its DPA terms.
