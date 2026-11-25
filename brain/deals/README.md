# Deals

One folder per buyer or opportunity, named `<person-company>` in lowercase with hyphens (for example `sarah-acme`).

```
deals/sarah-acme/
├── deal.md
├── prep/
│   └── 2026-11-20-1400/      plan.md, deck.html, buyer-doc.md, agreement.md (what that call needed)
├── reviews/
│   └── 2026-11-17-1430/      review.md and the drafted next step (follow-up.md, ...). Never edited
└── drafts/
    └── 2026-11-24-follow-up.md   moves deal-check drafted for a deal that went quiet
```

## deal.md

The fields at the top let the automations and the factory read a deal without parsing the whole file. Then the current state, which gets a new version whenever something changes. Then the timeline, newest first, which only ever gets new lines.

```markdown
---
person: Sarah Chen
company: Acme
stage: call-2              # a step name from gtm/sales-process.md, or won / lost
pull: unknown              # extreme | yes | no | unknown (from AI Rob)
case_study: v1             # which version of gtm/case-study.md they fit
channel: referral
owner: rob                 # who is selling this deal
next_step: 2026-11-20 call 2
last_contact: 2026-11-17
---

# Sarah Chen, Acme

## Now (2026-11-17)

Where the deal stands, what has to happen next, and the latest review: reviews/2026-11-17-1430/

---

## Timeline

- **2026-11-18** | Prep — Call 2, plan and materials in prep/2026-11-20-1400/
- **2026-11-17** | Call 1 (Fathom) — Has to replace the vendor before the March audit. Agreed to a second call with her CFO.
- **2026-11-12** | Email — Intro from their auditor. Replied: "timing is actually good, we're mid-switch."
```
