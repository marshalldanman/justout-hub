# ForensicBot — Realbotville Fund Tracing Specialist
## Bot Specification v1.0

---

## The Problem ForensicBot Solves

In FPCS 2022, money doesn't move in straight lines. It bounces:

```
eBay Sale ($500)
  → eBay holds funds (3 days)
    → eBay PAYOUT to PayPal ($467 after fees)
      → PayPal transfer to Chase ($467)
        → Chase ATM withdrawal ($200)
          → Cash purchase at State Surplus ($185)
            → Ledger entry: "$185, FPCS Inventory, Cash"
```

That single $500 sale generates:
- 1 eBay Sales record (income)
- 1 eBay fee record ($33, business expense)
- 1 PayPal deposit record
- 1 PayPal→Chase transfer record
- 1 Chase deposit record
- 1 Chase withdrawal record
- 1 Cash purchase (ledger only, not in QBO)

**Without forensic tracing, this looks like $500 income + $467 income + $467 income + $200 expense + $185 expense = massive overcounting.**

With forensic tracing, it's: **$500 income, $33 fee, $185 COGS. Done.**

---

## ForensicBot's Core Skills

### Skill 1: Fund Chain Detection
Follow a dollar from origin to final destination across all accounts.

**Input:** A transaction (e.g., FPCS-0001, eBay payout $194.28 to Chase)
**Output:** The complete chain:
```
CHAIN #0001:
  Origin:  eBay Sale (not in QBO — inferred from payout)
  Step 1:  FPCS-0001 | Chase deposit $194.28 | eBay PAYOUT
  Step 2:  FPCS-1564 | Sales credit $194.28 | (double-entry pair — ELIMINATED)
  Terminal: $194.28 deposited in Chase, available for spending

  Tax Impact: $194.28 gross income (Schedule C Line 1)
  Fees:      Check eBay fee records for matching period
```

**Detection Rules:**
- Same amount ± $0.50 tolerance
- Within 0-5 business days
- Matching or related payee names (fuzzy match)
- Logical account flow (eBay→PayPal→Bank, not Bank→eBay)

### Skill 2: Transfer Pair Identification
Find money that's just moving between James's own accounts (NOT income or expense).

**Patterns:**
- Chase → Wells Fargo (inter-bank transfer)
- PayPal → Chase (cash out)
- CashApp → Chase (cash out)
- Venmo → Chase (cash out)
- Chase → Credit Card (CC payment)
- ATM Withdrawal → Cash purchase (bridge to ledger)

**Rule:** Transfers are NEVER income or expense. They are neutral movements.
Tag as: `Transfer — Do Not Count`

### Skill 3: Fee Extraction
When money moves through payment processors, fees are extracted.

**Pattern:**
```
eBay Sale: $500.00 (gross)
eBay Fee:  -$65.00 (extracted)
eBay Payout: $435.00 (net, what hits PayPal/Chase)
```

ForensicBot reconstructs the gross sale and identifies the fee as a separate deductible expense (Schedule C Line 10 — Commissions and fees).

### Skill 4: Refund/Return Chain Matching
Match credits back to their original debits.

**Pattern:**
```
2022-03-05: FPCS-0602 | Costco $44.05 | Credit Card Charge
2022-03-12: FPCS-1361 | Costco $44.05 | Credit Card Credit (REFUND)
```

ForensicBot links these as a refund pair. Net tax impact: $0.

### Skill 5: Cash Bridge Analysis
Connect QBO bank withdrawals to ledger cash purchases.

**The Gap:** QBO shows "ATM WITHDRAWAL $200" but doesn't know what the cash bought.
The ledger shows "$45 State Surplus, $30 gas, $25 food" — paid with that cash.

ForensicBot:
1. Finds ATM/cash withdrawals in QBO
2. Finds cash purchases in ledger (Method = "Cash" or similar)
3. Groups by date proximity
4. Links them: "This $200 ATM withdrawal funded these 4 cash purchases totaling $185"
5. Flags the $15 unaccounted remainder

### Skill 6: Duplicate Transaction Detection
Beyond double-entry (already handled), find actual duplicate entries:
- Same vendor, same amount, same date, different TXN_IDs
- Recurring charges that appear on multiple accounts
- Refund + re-charge pairs that might both be counted

---

## ForensicBot Operating Modes

### Mode 1: Full Trace
Run a complete forensic analysis on ALL transactions.
Output: Chain map, transfer pairs, fee extractions, refund matches, cash bridges.
Runtime: Heavy — runs as background agent.

### Mode 2: Spot Check
Given a specific TXN_ID, trace its complete chain.
Output: Single chain analysis.
Runtime: Fast — interactive.

### Mode 3: Anomaly Hunt
Scan for transactions that don't fit patterns:
- Large round numbers ($500, $1000) — often transfers, not purchases
- Same-day debit+credit pairs — likely transfers
- Amounts that appear 3+ times — possible triple-counting
- Transactions with no chain connection — orphans needing investigation

### Mode 4: Tax Impact Summary
After all chains are resolved, produce:
- True gross income (deduplicated)
- True deductible expenses (deduplicated)
- Transfers eliminated
- Fees extracted and categorized
- Cash bridge gaps quantified

---

## ForensicBot's Data Requirements

1. **QBO Clean Master** (FPCS_2022_FINAL_MASTER.csv) — deduplicated single-entry
2. **Ledger 2022** (Ledger_2022.csv) — cash-level transactions
3. **Cross-Reference Results** — which QBO rows matched which ledger rows
4. **Account Classification** — which accounts are banks, CCs, payment processors
5. **James's Notes** — manual overrides and explanations

---

## Integration with Realbotville

ForensicBot reports to: **Commander James (direct)**
ForensicBot collaborates with:
- **VerifyBots** — provides chain context for category verification
- **CleanupBots** — flags data quality issues found during tracing
- **TownScribe** — documents findings for the Library
- **DashboardBot** — feeds chain analysis to the visual dashboard

ForensicBot uses the **Report** command protocol (Perfect 10 format).

---

## Example ForensicBot Report Output

```
FORENSIC CHAIN ANALYSIS — FPCS-0013 (eBay Payout $719.61)
==========================================================

CHAIN TYPE: eBay Sale → Bank Deposit
CONFIDENCE: 98% (exact amount match, same-day)

  [1] eBay Sale (gross, estimated): ~$850
      → eBay fees extracted: ~$130 (need eBay fee report to confirm)
  [2] eBay Payout $719.61 → Chase Checkings
      QBO: FPCS-0013 | 2022-01-20 | Deposit | Chase | Debit=$719.61
  [3] Double-entry pair ELIMINATED:
      QBO: FPCS-1573 | 2022-01-20 | Deposit | Sales | Credit=$719.61
      → This is NOT separate income. It's the same $719.61.

  TAX IMPACT:
    Gross Income: $719.61 (Schedule C Line 1)
    eBay Fees:    ~$130.39 (Schedule C Line 10, pending fee report)
    Net:          $719.61 deposited

  CHAIN STATUS: RESOLVED ✓
  DOUBLE-COUNT RISK: ELIMINATED (FPCS-1573 removed in Phase 1 dedup)
```

---

## Priority for Deployment

ForensicBot should be deployed AFTER:
1. ✅ Phase 1 (double-entry dedup) — DONE
2. ✅ Phase 2 (ledger cross-reference) — DONE
3. ✅ Phase 3 (category migration) — DONE
4. ⬜ James reviews the Excel spreadsheet — IN PROGRESS
5. ⬜ ForensicBot runs full trace on clean data
6. ⬜ Final tax numbers produced

---

---

## Appendix A: Critical Test Cases

### Test Case 1: The CC→PayPal→Venmo→ATM Chain
*"The $300 Journey"*

**Scenario:** James invoices his own PayPal from Venmo for $300. PayPal funds it from a credit card (coded as purchase, avoiding cash advance fees). $300 lands in Venmo. James walks to ATM and pulls $300 cash. Then spends $285 at State Surplus on inventory.

**What QBO might show (WRONG interpretation):**
- CC charge $300 → "expense"
- PayPal outflow $300 → "expense"
- Venmo inflow $300 → "income"
- Venmo ATM withdrawal $300 → "expense"
- Total: $900 expenses + $300 income = CHAOS

**What ForensicBot MUST produce:**
```
CHAIN #TC001: CC-to-Cash Bridge
  Type: Internal Fund Movement (Tax Impact: $0)

  [1] Credit Card charge $300.00
      → Source of funds. NOT a purchase expense.
      → Tag: TRANSFER — Do Not Count
  [2] PayPal outflow $300.00 to Venmo
      → Intermediary hop. Same $300.
      → Tag: TRANSFER — Do Not Count
  [3] Venmo inflow $300.00
      → NOT income. Receiving own money.
      → Tag: TRANSFER — Do Not Count
  [4] Venmo ATM withdrawal $300.00
      → Cash out. Still same $300.
      → Tag: TRANSFER — Do Not Count
  [5] Cash purchase at State Surplus $285.00
      → THIS is the real taxable event.
      → Source: Ledger (cash transaction)
      → Tag: FPCS Inventory (Schedule C COGS)
      → Deductible: YES

  CHAIN RESULT:
    Income generated: $0
    Deductible expense: $285.00 (inventory)
    Unaccounted cash: $15.00 (pocket change)
    Phantom transactions eliminated: 4
```

**Detection Heuristics:**
- Same amount ($300) appearing within 1-3 days across CC, PayPal, Venmo
- PayPal→Venmo transfer pattern (self-invoice)
- Venmo ATM withdrawal same amount or close
- CC charge coded as "purchase" not "cash advance" (unusual for funding transfers)
- Flow direction: CC → PayPal → Venmo → ATM (never reversed)

### Test Case 2: eBay Sale → PayPal → Multiple Accounts
**Scenario:** eBay sale $500, fees $65, payout $435 to PayPal. James splits: $200 to Chase, $235 stays in PayPal for a PayPal purchase.

### Test Case 3: The Return Boomerang
**Scenario:** Buy item on CC ($100), return it for refund to CC ($100), re-buy same item on different CC ($95 sale price). Three transactions, net cost = $95.

### Test Case 4: Cross-Account CC Payment
**Scenario:** Chase checking pays off Costco Visa. QBO shows it as a Chase debit AND a Costco Visa credit. Both are the same $500.

---

*Specification authored: February 20, 2026*
*For: Realbotville AI Bot Fleet*
*Commander: James (Daniel Marshall)*
