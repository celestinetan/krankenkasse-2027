# Krankenkasse 2027 Schweiz

A free, independent page that compares the official 2027 basic health insurance (Grundversicherung) premiums in all 26 Swiss cantons, and shows what a year would cost for your answers: keep your plan, change your deductible, change model, or switch insurer.

**Open it:** https://celestinetan.github.io/krankenkasse-2027/

> **Information tool, not advice.** The figures come from the Federal Office of Public Health, but the page can contain mistakes and can't know your full situation. Check the final premium on [priminfo.admin.ch](https://www.priminfo.admin.ch/de/praemien) or with your insurer before you change anything. Please read the [Disclaimer & Terms of Use](#disclaimer--terms-of-use).

## What it does

1. **Finds your plan** from your insurer, deductible and what you pay each month, allowing for the CO2 levy refund on 2026 bills.
2. **Asks about your doctor bills** in plain terms, such as "I always hit the CHF 700 cap".
3. **Asks how you like to see doctors**, so models that wouldn't suit you are flagged and never suggested.
4. **Shows what the numbers suggest:** the cheapest deductible on your plan, other models at your insurer, and other insurers, with the possible saving and the deadline.
5. **Compares every plan in your canton**, side by side, with a chart of which deductible pays off.
6. **Lists perks** (gym, massage, glasses and more) from the supplementary insurance of 13 insurers.
7. **Helps you switch**, with a checklist and a cancellation letter in German, plus an English translation.

Everything you type stays in your own browser. Nothing is sent to the author or anyone else.

## Deadline

Changing insurer, or lowering your deductible, must reach your current insurer by **30 November 2026** for 1 January 2027.

## Sources

- **Premiums 2027 and 2026:** Federal Office of Public Health (BAG/FOPH), dataset "Krankenversicherungsprämien" on [opendata.swiss](https://opendata.swiss/en/dataset/health-insurance-premiums), published 29 September 2026.
- **Where models are offered:** FOPH files "Einzugsgebiete" and "Eingeschränkte Tätigkeitsgebiete" (same dataset). A few HMO models are limited to listed municipalities; the page checks them against your postcode.
- **Premium regions and admitted insurers:** [priminfo.admin.ch](https://www.priminfo.admin.ch/de/downloads/aktuell), valid from 1 January 2027.
- **Perks:** each insurer's own product pages and benefit summaries, checked 27 October 2026 and linked beside every entry on the page.

## Known limits

- Ages 19 to 25 and 26+. Children are not included.
- English, with German insurance terms. French and Italian are planned.
- Yearly cost uses the legal adult rules (deductible, 10% co-pay capped at CHF 700). The CHF 15/day hospital contribution is left out.
- Model rules are simplified to three questions. Every insurer's model has its own detailed terms.
- Some perk figures come from 2025 documents and may have changed.

## How the data is updated

The premium data is not typed in by hand. A GitHub Action (`.github/workflows/update-data.yml`) runs `scripts/build_data.py` on GitHub's servers: it downloads the official files from the FOPH and priminfo.admin.ch, splits them into one file per canton in `data/`, and commits the result. `data/meta.json` records when it last ran. To refresh, open the **Actions** tab, choose **Update premium data** and click **Run workflow**.

## Disclaimer & Terms of Use

This page is shared free of charge, for general information only, and is provided "as is" without warranty of any kind. It comes with no promise that it is accurate, complete, up to date, or fit for any particular purpose.

- **Not advice.** Nothing here is insurance, financial, legal or medical advice. The suggestions follow fixed rules applied to official prices and don't know your full situation. You make your own decisions.
- **Check before you act.** Confirm premiums, deadlines and terms on priminfo.admin.ch or with the insurer. The insurer's own documents always take precedence.
- **Use at your own risk.** To the fullest extent the law allows, the author accepts no liability for any loss, cost or other direct or indirect damage arising from using or relying on this page.
- **Indemnity.** By using this page, you agree to hold the author harmless from, and not to bring any claim against the author for, any loss or claim arising from your use of it, including claims by third parties.
- **Independent.** Not affiliated with, endorsed by, or paid by the Federal Office of Public Health or any insurer named on the page. No commissions are earned and no insurance is arranged. All trademarks belong to their owners.
- **Things change.** Premiums, products and rules change every year. The dates above show when the data was last checked.
- **Sharing.** You may share this page freely, but keep this section with it and don't present a changed version as the author's.

**By using this page, you accept these terms.**

## Report a mistake

hello@celestinetan.com

## Licence

Code: [MIT](LICENSE) © 2026 Celestine Tan. Premium data: Federal Office of Public Health, used under the [opendata.swiss terms of use](https://opendata.swiss/en/terms-of-use) with attribution.
