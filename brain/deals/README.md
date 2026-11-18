# Deals

One folder per buyer or opportunity, named `<person-company>` in lowercase with hyphens (for example `sarah-acme`).

```
deals/sarah-acme/
├── deal.md
└── reviews/
    └── 2026-11-17-1430/      one AI Rob deal review, never edited
```

## deal.md

The fields at the top let the automations and the factory read a deal without parsing the whole file. Then the current state, which gets a new version whenever something changes. Then the timeline, newest first, which only ever gets new lines.

```markdown
---
person: Sarah Chen
company: Acme
stage: call-2              # step names from gtm/sales-process.md
pull: unknown              # extreme | yes | no | unknown (from AI Rob)
case_study: v1             # which version of gtm/case-study.md they fit
channel: linkedin
owner: rob                 # who is selling this deal
next_step: 2026-11-20 call 2
---

# Sarah Chen, Acme

## Now (2026-11-17)

Where the deal stands, what has to happen next, and the latest review: reviews/2026-11-17-1430/

---

## Timeline

- **2026-11-17** | Call 1 (Fathom) — Has to replace the vendor before the March audit. Agreed to a second call with her CFO.
- **2026-11-12** | LinkedIn — Replied to the outreach: "timing is actually good, we're mid-switch."
```
