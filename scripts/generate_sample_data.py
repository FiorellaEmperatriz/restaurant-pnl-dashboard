"""
Generate synthetic weekly P&L data for a FICTIONAL restaurant group.

Fennel & Co. Group is made up. Every figure is randomly generated with a fixed
seed so the dataset is reproducible. Nothing here comes from a real business.

Three "stories" are planted in the data on purpose, so the dashboard has
something real to detect:
  1. Ember Street Pizza: labour cost creeps up from week 15 while sales soften.
  2. Tidewater Cafe: a supplier price spike pushes food COGS up for ~5 weeks.
  3. Fennel Bistro: steady performer with a pre-Christmas sales ramp.

Usage:
    python3 scripts/generate_sample_data.py
Outputs:
    data/pl_data.csv     weekly P&L rows (import into the "PL_Data" sheet tab)
    data/managers.csv    demo sign-in codes (import into the "Managers" tab)
"""
import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 42
WEEKS = 26
LAST_WEEK_ENDING = date(2026, 11, 8)  # a Sunday

SITES = {
    # baseline weekly sales (GBP), food share, avg spend per cover, weekly rent, weekly utilities
    "Fennel Bistro":     dict(base=38000, food_share=0.66, spend=24.0, rent=3000, util=650),
    "Ember Street Pizza": dict(base=31000, food_share=0.72, spend=17.5, rent=2300, util=560),
    "Tidewater Cafe":    dict(base=19500, food_share=0.78, spend=11.0, rent=1700, util=420),
}

HEADER = [
    "week_ending", "site", "food_sales", "drink_sales", "food_cogs", "drink_cogs",
    "labour", "rent", "utilities", "marketing", "other_costs", "covers",
    "submitted_by", "submitted_at",
]


def jitter(rng, value, pct):
    return value * (1 + rng.uniform(-pct, pct))


def build_rows():
    rng = random.Random(SEED)
    first_week = LAST_WEEK_ENDING - timedelta(weeks=WEEKS - 1)
    rows = []

    for w in range(WEEKS):
        week_ending = first_week + timedelta(weeks=w)
        # Gentle seasonality: slow summer, ramp from October into Christmas.
        season = 1.0
        if w >= 19:
            season += 0.012 * (w - 19)
        if w <= 3:
            season += 0.03  # late-spring terraces

        for site, cfg in SITES.items():
            sales = jitter(rng, cfg["base"] * season, 0.05)

            # Story 1: Ember Street softens after week 14.
            if site == "Ember Street Pizza" and w >= 14:
                sales *= 1 - min(0.012 * (w - 13), 0.10)

            food_sales = sales * cfg["food_share"]
            drink_sales = sales - food_sales

            food_cogs_pct = jitter(rng, 0.295, 0.04)
            drink_cogs_pct = jitter(rng, 0.235, 0.04)

            # Story 2: Tidewater food cost spike, weeks 17-21.
            if site == "Tidewater Cafe" and 17 <= w <= 21:
                food_cogs_pct += 0.055 + 0.01 * rng.random()

            labour_pct = jitter(rng, 0.305, 0.035)
            # Story 1 (cont.): Ember Street labour creeps up while sales fall.
            if site == "Ember Street Pizza" and w >= 14:
                labour_pct += min(0.008 * (w - 13), 0.075)

            labour = sales * labour_pct
            rent = cfg["rent"]
            utilities = jitter(rng, cfg["util"] * (1 + 0.02 * max(0, w - 16)), 0.05)
            marketing = sales * jitter(rng, 0.03, 0.25)
            # Insurance, repairs, card fees, cleaning, software, etc.
            other_costs = sales * jitter(rng, 0.145, 0.10)
            covers = int(round(sales / jitter(rng, cfg["spend"], 0.04)))

            rows.append([
                week_ending.isoformat(), site,
                round(food_sales, 2), round(drink_sales, 2),
                round(food_sales * food_cogs_pct, 2), round(drink_sales * drink_cogs_pct, 2),
                round(labour, 2), round(rent, 2), round(utilities, 2),
                round(marketing, 2), round(other_costs, 2), covers,
                "seed-data", "",
            ])
    return rows


def build_managers():
    # Demo-only sign-in codes. Real deployments should never store plain codes.
    return [
        ["email", "name", "site", "code"],
        ["alex@fennel-demo.example", "Alex (Bistro manager)", "Fennel Bistro", "BISTRO-2026"],
        ["sam@fennel-demo.example", "Sam (Pizza manager)", "Ember Street Pizza", "EMBER-2026"],
        ["jo@fennel-demo.example", "Jo (Cafe manager)", "Tidewater Cafe", "TIDE-2026"],
    ]


def main():
    out = Path(__file__).resolve().parent.parent / "data"
    out.mkdir(exist_ok=True)

    rows = build_rows()
    with open(out / "pl_data.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADER)
        writer.writerows(rows)

    with open(out / "managers.csv", "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(build_managers())

    print(f"Wrote {len(rows)} rows to {out / 'pl_data.csv'}")


if __name__ == "__main__":
    main()
