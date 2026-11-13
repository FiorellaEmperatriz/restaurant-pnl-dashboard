# Case study copy for the FinProBalance portfolio page

Paste-ready text for the Webflow project card and project page. English, recruiter and client friendly.
Replace the two `[...]` placeholders once you have the live demo link and the GitHub URL.

---

## Project card (portfolio grid)

**Title:** Weekly P&L Dashboard for Multi-Site Restaurants

**One-liner:** A live dashboard that shows an owner which site is slipping on labour or food cost, and why, before the month-end report does.

**Tags:** Google Sheets · Apps Script · Financial analysis · Hospitality

**Button:** View case study

---

## Project page

### Hero

**Heading:** Seeing margin problems while they are still small

**Subheading:** A weekly performance dashboard for a multi-site restaurant group, built end to end: data model, calculations, charts, alerts and a submission form for site managers.

**Buttons:** `Open live demo` → [DEMO LINK] · `View code on GitHub` → [GITHUB LINK]

*Small print under the buttons:* Demo uses fictional data for an invented company.

---

### The problem

Multi-site hospitality owners often see how each site performed weeks after the fact, from spreadsheets that every manager formats differently. By the time a labour or food-cost problem shows up, it has already cost several weeks of margin.

### What I built

- **One consistent weekly P&L per site**, rolled up to group level, so sales, gross margin, labour % and EBITDA mean the same thing everywhere
- **A dashboard** with week-on-week KPIs, trend charts against targets, and a site ranking
- **A "what needs attention" panel** driven by three transparent rules, so a manager can see exactly why something was flagged
- **A submission form** where each manager enters only their own site's week, with validation built in

### What the data revealed

In the demo data, one site's labour cost climbed from about 31% to 38% of sales over eleven weeks while its sales softened, cutting EBITDA margin from around 16% to under 7%. Another site had a five-week food-cost spike that halved its margin before recovering. A monthly report would have averaged both away; the weekly view makes them obvious.

### Decisions I made, and why

- **Calculated metrics, never typed-in ones.** The sheet holds raw inputs only, so margins can never disagree with each other
- **Simple rules over fancy models.** A site manager has to trust a flag before acting on it, and an explainable rule earns that trust
- **Honest limitations.** Sign-in is demo-grade and the data lives in Google Sheets. The README spells out what I would change for a real deployment

### Impact (what this enables)

A weekly Monday conversation that starts from the numbers instead of from "how did last week feel?", and an earlier trigger to act on labour rostering and supplier pricing.

### Built with

Google Apps Script · Google Sheets · Chart.js · JavaScript · Python

### Images to use

| File | Where |
|---|---|
| `screenshots/overview.png` | Hero image |
| `screenshots/ember-street.png` | Under "What the data revealed" (labour drift) |
| `screenshots/tidewater.png` | Same section (cost spike) |
| `screenshots/mobile.png` | Next to the submission-form bullet |

---

## For your CV (one line)

> **Weekly P&L Dashboard for Multi-Site Restaurants** (Google Sheets, Apps Script, Chart.js): designed and built an end-to-end reporting tool with KPIs, rule-based alerts and a manager submission form; surfaces labour and food-cost drift weekly. Portfolio and code: [LINK]
