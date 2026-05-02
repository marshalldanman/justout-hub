# ForensicBot Research Report -- Realbotville Library Vol. 3
# Forensic Fund Tracing: Methods, Algorithms, and Implementation
## Compiled for ForensicBot Deployment -- FPCS 2022 Tax Preparation

**Date:** 2026-02-20
**Classification:** Realbotville Library Reference + Active Build Document
**Author:** Research Agent (Opus 4.6) under Commander James
**Purpose:** Comprehensive reference for building ForensicBot's fund-tracing engine

---

# TABLE OF CONTENTS

1. [Forensic Accounting Fund Tracing Methods](#1-forensic-accounting-fund-tracing-methods)
2. [Payment Processor Chain Tracing](#2-payment-processor-chain-tracing)
3. [Credit Card Forensics for Sole Proprietors](#3-credit-card-forensics-for-sole-proprietors)
4. [Gambling Transaction Handling for Taxes](#4-gambling-transaction-handling-for-taxes)
5. [Cyber Crime / Theft Loss Tax Treatment](#5-cyber-crime--theft-loss-tax-treatment)
6. [Algorithm Design for Automated Fund Tracing](#6-algorithm-design-for-automated-fund-tracing)
7. [Open Source Tools and Libraries](#7-open-source-tools-and-libraries)
8. [Schedule C Specific Fund Tracing](#8-schedule-c-specific-fund-tracing)
9. [ForensicBot Implementation Blueprint](#9-forensicbot-implementation-blueprint)

---

# 1. FORENSIC ACCOUNTING FUND TRACING METHODS

## 1.1 The Three Accepted Methods

Professional forensic accountants and the IRS rely on three primary indirect methods to determine unreported income or trace funds. These are codified in the [IRS Internal Revenue Manual (IRM) Part 4.10.4](https://www.irs.gov/irm/part4/irm_04-010-004) and are the same methods used in criminal tax investigations ([IRM 9.5.9](https://www.irs.gov/irm/part9/irm_09-005-009)).

### 1.1.1 Direct Method (Specific Item)

The direct method traces specific transactions line-by-line. The examiner:
- Reconciles books and records to the tax return
- Identifies specific items of unreported income or overstated deductions
- Links particular deposits to particular income sources

**When used:** When the taxpayer has books/records (even messy ones) that can be reconciled. This is the IRS's preferred starting point.

**ForensicBot relevance:** This maps directly to ForensicBot's Skill 1 (Fund Chain Detection). Each chain IS a direct trace -- follow the dollar from origin to destination.

### 1.1.2 Indirect Method: Net Worth Method

The net worth method compares total net worth at the beginning and end of a period:

```
Net Worth (End of Year)
- Net Worth (Start of Year)
= Increase in Net Worth
+ Personal Living Expenses (non-deductible spending)
+ Non-deductible losses
= Total Income (should be)
- Reported Income
= UNREPORTED INCOME (if positive)
```

**When used:** When a taxpayer has significant assets that changed in value. Useful for detecting lifestyle spending that exceeds reported income.

**ForensicBot relevance:** Low direct relevance for James. He wasn't accumulating assets in 2022 -- he was surviving on credit cards. But the concept of "where did the money go?" informs the Cash Bridge analysis (Skill 5).

### 1.1.3 Indirect Method: Bank Deposit Method

This is the most relevant method for FPCS. The IRS's [bank deposit analysis](https://irstaxtrouble.com/the-irss-bank-deposit-analysis/) works as follows:

```
Total Deposits (all accounts, all year)
- Non-taxable deposits:
    - Transfers between own accounts
    - Loan proceeds
    - Gifts received
    - Return of capital / refunds
    - Redeposited checks (bounced/returned)
= Net Taxable Deposits
+ Cash expenditures NOT from bank accounts
= Total Receipts
- Known/Reported Income
= UNREPORTED INCOME (if positive)
```

**IRS implementation (from IRM 4.10.4.5.4):**

The IRS examiner:
1. Obtains bank records for ALL accounts (personal and business)
2. Totals all deposits
3. Identifies and subtracts non-taxable deposits (transfers, loans, etc.)
4. Adds cash expenditures paid outside the banking system
5. Compares to reported income

**CRITICAL for FPCS:** The IRS specifically looks for:
- Unusual deposits by size or source
- Frequency of deposits
- Cash deposits
- Deposits outside normal patterns
- Commingling of personal and business activities
- Transfers in, out, and between accounts (which may reveal unknown accounts)

**ForensicBot relevance:** This is ForensicBot's PRIMARY adversary model. ForensicBot must produce the SAME analysis an IRS examiner would, but on James's side. Every transfer must be identified and eliminated. Every deposit must be sourced. The bank deposit method IS what ForensicBot is building defensively.

### Reference: [HKA - Following the Money](https://www.hka.com/article/following-the-money-forensic-accounting-tracing-methods-amp-best-practices/) | [Citrin Cooperman - Cash Tracing](https://www.citrincooperman.com/In-Focus-Resource-Center/Unravel-Financial-Mysteries-An-Introduction-to-Cash-Tracing) | [Aprio - Funds Tracing](https://www.aprio.com/the-role-of-funds-tracing-in-forensic-accounting-ins-article-adv/)

## 1.2 Commingled Funds Tracing Methods

When business and personal funds share the same account (which is James's situation for every account), four methods exist for tracing which dollars are "business" vs "personal":

### 1.2.1 FIFO (First In, First Out)

Assumes withdrawals come from the earliest deposits. If James deposited $500 eBay income on Monday and $200 personal loan on Wednesday, then a $400 withdrawal on Friday is deemed to come from the eBay income (first in).

```python
def fifo_trace(deposits: list, withdrawal_amount: float) -> list:
    """Trace withdrawal to deposits using FIFO."""
    sources = []
    remaining = withdrawal_amount
    for deposit in sorted(deposits, key=lambda d: d['date']):
        if remaining <= 0:
            break
        available = deposit['amount'] - deposit.get('consumed', 0)
        take = min(remaining, available)
        sources.append({
            'deposit': deposit,
            'amount_consumed': take
        })
        deposit['consumed'] = deposit.get('consumed', 0) + take
        remaining -= take
    return sources
```

### 1.2.2 LIFO (Last In, First Out)

Assumes withdrawals come from the most recent deposits. Same scenario: the $400 withdrawal would be deemed to come first from the $200 personal loan (last in), then $200 from the eBay income.

### 1.2.3 LIBR (Lowest Intermediate Balance Rule)

The most conservative method. The IRS and DOJ are trained to use this when tracing illicit funds. LIBR assumes that the account owner preserves "clean" funds and spends "dirty" funds first. The traceable amount can never exceed the lowest balance between the deposit and the withdrawal.

```python
def libr_trace(account_history: list, target_deposit: dict) -> float:
    """
    Determine how much of target_deposit is still traceable
    using the Lowest Intermediate Balance Rule.

    The traceable amount cannot exceed the lowest balance
    between the deposit date and the current date.
    """
    deposit_date = target_deposit['date']
    deposit_amount = target_deposit['amount']

    # Find minimum balance between deposit date and now
    min_balance = float('inf')
    running_balance = 0

    for txn in sorted(account_history, key=lambda t: t['date']):
        if txn['direction'] == 'credit':
            running_balance += txn['amount']
        else:
            running_balance -= txn['amount']

        if txn['date'] >= deposit_date:
            min_balance = min(min_balance, running_balance)

    # Traceable amount is the lesser of deposit and lowest balance
    return min(deposit_amount, max(0, min_balance))
```

### 1.2.4 Pro Rata Distribution

Allocates withdrawals proportionally between sources. If an account has 60% business funds and 40% personal funds, each withdrawal is deemed 60% business and 40% personal.

```python
def pro_rata_trace(deposits: list, withdrawal_amount: float) -> list:
    """Allocate withdrawal proportionally across all deposit sources."""
    total_deposits = sum(d['amount'] for d in deposits)
    sources = []
    for deposit in deposits:
        proportion = deposit['amount'] / total_deposits
        sources.append({
            'deposit': deposit,
            'allocated': withdrawal_amount * proportion,
            'proportion': proportion
        })
    return sources
```

**ForensicBot strategy:** Use Pro Rata as the default for commingled accounts (most defensible for a sole proprietor), but calculate all four methods and flag significant discrepancies. Present the method most favorable to James while noting alternatives.

### Reference: [BPB CPA - Tracing Commingled Funds](https://www.bpbcpa.com/tracing-commingled-funds-by-joel-glick-cpa-cff-cfe-cgma/) | [Schneider Downs - Tracing Commingled Assets](https://schneiderdowns.com/our-thoughts-on/tracing-commingled-assets-separating-beans/) | [Grigoras Law - LIBR Mystery](https://grigoraslaw.com/tracing-commingled-funds-unraveling-the-libr-mystery)

## 1.3 Proof of Cash Reconciliation

The proof of cash is an auditing technique that validates all cash activity in an account:

```
Beginning Balance (per bank)
+ All Deposits in Period
- All Disbursements in Period
= Ending Balance (per bank)
  MUST EQUAL
Ending Balance (per books)
```

This is applied to EACH account EACH month. If it doesn't balance, there's a missing transaction.

**ForensicBot implementation:** Run proof of cash for all 20 financial accounts for all 12 months of 2022. Any imbalance flags missing transactions that need investigation.

### Reference: [AccountingTools - Proof of Cash](https://www.accountingtools.com/articles/what-is-a-proof-of-cash.html) | [Kroll - Proof of Cash in Due Diligence](https://www.kroll.com/en/publications/critical-role-proof-cash-reconciliation-financial-due-diligence)

---

# 2. PAYMENT PROCESSOR CHAIN TRACING

## 2.1 How Payment Processor Chains Work

Every payment processor sits between the customer and the seller, creating a multi-hop chain:

### 2.1.1 eBay Chain (2022 -- Managed Payments Era)

In 2022, eBay had fully transitioned to [managed payments](https://www.ebay.com/help/selling/getting-paid/payouts-work-managed-payments-sellers?id=4814). The chain:

```
Customer pays eBay (CC/PayPal/etc)
  -> eBay holds funds (processing, 2 days typical)
    -> eBay deducts fees (final value fee + payment processing)
      -> eBay initiates payout to seller's bank account
        -> Bank receives deposit (1-3 business days)
```

**Fee structure in 2022:**
- Final value fee: 12.55% for most categories (electronics)
- Payment processing: 0.30 per order
- Optional: promoted listing fees, store subscription

**Settlement timing:**
- Standard: funds available 2 days after buyer payment confirmation
- Payout to bank: 1-3 additional business days
- Weekly payout option: initiated on Tuesdays
- Express payout: 30 minutes, $2.00 flat fee

**Tax reporting:** eBay issues 1099-K for gross sales above threshold ($600 in 2022 for payment apps, but eBay may report under old $20K/200 transaction threshold for managed payments).

### 2.1.2 PayPal Chain

```
Money received (payment, transfer in)
  -> PayPal balance (immediate or hold)
    -> Option A: Transfer to bank (1-3 days standard, instant for 1.75%)
    -> Option B: Spend via PayPal purchase
    -> Option C: Transfer to another PayPal user
```

**Fees (2022):**
- Receiving personal payment (funded by bank): Free
- Receiving personal payment (funded by CC): 2.99% + $0.49
- Sending money with CC: 2.99%
- Instant transfer to bank: 1.75% (min $0.25, max $25) -- [raised in June 2022](https://techcrunch.com/2022/04/21/paypal-venmo-increase-instant-transfer-fees/)
- Standard transfer to bank: Free, 1-3 business days
- International: additional conversion fees

### 2.1.3 Venmo Chain

```
Money received (P2P payment)
  -> Venmo balance (immediate)
    -> Option A: Transfer to bank (1-3 days free, instant for 1.75%)
    -> Option B: Spend via Venmo card
    -> Option C: ATM withdrawal (with Venmo debit card)
```

**Fees (2022):**
- Sending money (funded by bank/debit): Free
- Sending money (funded by CC): 3%
- Instant transfer to bank: 1.75% (min $0.25, max $25) -- [raised in May 2022](https://venmo.com/resources/our-fees/)
- Standard transfer: Free, [1-3 business days](https://help.venmo.com/cs/articles/bank-transfer-timeline-vhel286)

### 2.1.4 Cash App / Square Chain

```
Money received (P2P or merchant payment)
  -> Cash App balance
    -> Option A: Cash out to bank (1-3 days free, instant for 1.5%)
    -> Option B: Spend via Cash Card
    -> Option C: ATM withdrawal (with Cash Card)
```

**Fees:**
- Cash out to bank (standard): Free, 1-3 business days
- Cash out (instant): 0.5%-1.75%
- Business payments received: [2.75% of transaction](https://squareup.com/us/en/payments/our-fees)
- Square in-person: 2.6% + $0.10

## 2.2 Self-Transfer Detection Patterns

This is the CORE problem for FPCS. James moved money between his own accounts constantly. ForensicBot must detect these self-transfers and tag them as non-taxable movements.

### 2.2.1 Detection Heuristics

```python
SELF_TRANSFER_PATTERNS = {
    'bank_to_bank': {
        'description': 'Transfer between own bank accounts',
        'signals': [
            'same_amount_both_sides',       # Exact match or within $0.50
            'opposing_directions',           # Debit in one, credit in other
            'temporal_proximity',            # Within 0-3 business days
            'payee_contains_account_name',   # "TRANSFER TO WELLS FARGO"
        ],
        'confidence_base': 0.90
    },
    'processor_to_bank': {
        'description': 'Cash-out from payment processor to bank',
        'signals': [
            'payee_is_processor',            # "PAYPAL TRANSFER", "VENMO CASHOUT"
            'amount_match_or_fee_adjusted',  # Amount minus processor fee
            'processor_debit_bank_credit',   # Direction pattern
            'settlement_window',             # 1-5 business day gap
        ],
        'confidence_base': 0.85
    },
    'cc_payment': {
        'description': 'Bank paying off credit card balance',
        'signals': [
            'payee_is_cc_company',           # "COSTCO VISA PAYMENT"
            'bank_debit_cc_credit',          # Direction pattern
            'amount_is_round_or_minimum',    # Often round payment amounts
            'timing_near_due_date',          # Monthly pattern
        ],
        'confidence_base': 0.95
    },
    'creative_funding': {
        'description': 'CC -> PayPal -> Venmo -> ATM chain (James special)',
        'signals': [
            'same_amount_cascade',           # $300 appearing 3-4 times
            'rapid_succession',              # All within 1-3 days
            'cc_to_processor_to_processor',  # Unusual flow direction
            'atm_withdrawal_terminus',       # Chain ends at ATM
        ],
        'confidence_base': 0.70  # Lower -- needs manual confirmation
    }
}
```

### 2.2.2 The Self-Invoice Pattern (James's CC-to-Cash Technique)

James discovered that by invoicing his own PayPal from Venmo, PayPal would charge the linked credit card as a "purchase" (not a cash advance). This avoided the 5%+ cash advance fee and higher APR.

**The chain:**
```
1. Venmo creates invoice to PayPal for $300
2. PayPal pays invoice using linked CC (coded as PURCHASE)
3. $300 lands in Venmo balance
4. Venmo -> ATM withdrawal $300
5. Cash used for business purchases
```

**Detection pattern for ForensicBot:**
- CC charge with PayPal as merchant, amount matches Venmo deposit
- Venmo deposit from PayPal, same amount, same day or +1
- Venmo withdrawal (ATM or transfer) within 1-3 days
- All same amount or within small tolerance

**Tax treatment:** The CC charge is NOT an expense. The Venmo deposit is NOT income. Only the final cash purchase is a taxable event (deductible if business, non-deductible if personal).

**Credit card classification note:** Different issuers treat P2P transactions differently. Per research: Discover and AmEx typically code Venmo/PayPal as purchases; Chase typically codes them as cash advances. This is why James used specific cards for this technique.

### Reference: [Venmo - Cash Advance Fees](https://help.venmo.com/cs/articles/cash-advance-fees-vhel286) | [Venmo - Credit Card Fees](https://help.venmo.com/cs/articles/credit-card-fees-on-venmo-payments-vhel257)

## 2.3 Fee Extraction and Reconstruction

When money flows through a processor, fees are silently extracted. ForensicBot must reconstruct the gross amount.

### 2.3.1 Fee Reconstruction Algorithm

```python
PROCESSOR_FEE_SCHEDULES = {
    'ebay_managed_payments': {
        'final_value_pct': 0.1255,   # 12.55% for electronics
        'per_order_fixed': 0.30,
        'promoted_listing_pct': None, # Variable
        'formula': lambda gross: gross * 0.1255 + 0.30
    },
    'paypal_goods_services': {
        'pct': 0.0349,
        'fixed': 0.49,
        'formula': lambda gross: gross * 0.0349 + 0.49
    },
    'square_in_person': {
        'pct': 0.026,
        'fixed': 0.10,
        'formula': lambda gross: gross * 0.026 + 0.10
    },
    'venmo_business': {
        'pct': 0.019,   # 1.9% + $0.10 for business profiles in 2022
        'fixed': 0.10,
        'formula': lambda gross: gross * 0.019 + 0.10
    }
}

def reconstruct_gross(net_amount: float, processor: str) -> dict:
    """
    Given a net deposit amount and processor, reconstruct the gross sale.

    Formula: net = gross - fee(gross)
    For percentage + fixed: net = gross * (1 - pct) - fixed
    Therefore: gross = (net + fixed) / (1 - pct)
    """
    schedule = PROCESSOR_FEE_SCHEDULES.get(processor)
    if not schedule:
        return {'gross': net_amount, 'fee': 0, 'confidence': 'low'}

    gross = (net_amount + schedule['fixed']) / (1 - schedule['pct'])
    fee = schedule['formula'](gross)

    return {
        'gross': round(gross, 2),
        'net': net_amount,
        'fee': round(fee, 2),
        'processor': processor,
        'confidence': 'high' if abs(gross - fee - net_amount) < 0.02 else 'medium'
    }
```

### 2.3.2 eBay Return/Refund Chains

When a buyer returns an item, the refund chain creates reverse transactions:

```
Original sale:
  Buyer pays $100 -> eBay holds -> eBay deducts $13.05 fee -> Seller gets $86.95

Return/Refund:
  Seller initiates refund $100 -> eBay deducts from seller's pending/available funds
  -> eBay credits back proportional fees (e.g., 80% refund = 80% fee credit)
  -> Buyer receives refund via original payment method (3-5 business days)
```

Per [eBay fee credits policy](https://www.ebay.com/help/selling/fees-credits-invoices/fee-credits?id=4128), fee credits are proportional to the refund amount, but only if the seller issues the refund without eBay stepping in.

**ForensicBot must:** Match refund credits to original sales, net them out, and adjust the fee calculations accordingly.

---

# 3. CREDIT CARD FORENSICS FOR SOLE PROPRIETORS

## 3.1 The Credit Card as a Financial Bridge

For a sole proprietor living on credit cards (as James was in 2022), the credit card serves multiple roles simultaneously:

1. **Expense vehicle** -- buying business supplies, inventory, tools
2. **Cash flow bridge** -- funding operations between income events
3. **Transfer mechanism** -- moving money between accounts via CC-funded transfers
4. **Interest-bearing loan** -- unpaid balances accrue interest (partially deductible)

### 3.1.1 Transaction Classification Matrix

| CC Transaction Type | Tax Treatment | Schedule C Line | ForensicBot Tag |
|---|---|---|---|
| Business purchase | Deductible when charged | Various (based on category) | `EXPENSE` |
| Personal purchase | Not deductible | N/A | `PERSONAL` |
| CC payment (from bank) | Transfer -- not income or expense | N/A | `TRANSFER` |
| CC-funded transfer to processor | Transfer -- not an expense | N/A | `TRANSFER` |
| Cash advance | Transfer -- not an expense | N/A | `TRANSFER` |
| Interest on business balance | Deductible when paid | Line 16b | `INTEREST_EXPENSE` |
| Interest on personal balance | Not deductible | N/A | `PERSONAL` |
| Annual fee (business card) | Deductible | Line 27a (Other expenses) | `EXPENSE` |
| Late fee | Deductible if business card | Line 27a | `EXPENSE` |
| CC reward/cashback | Reduces cost basis of purchase | N/A (usually) | `REWARD` |

### 3.1.2 The Timing Rule (Critical for Cash Basis)

Per [IRS rules and Dinesen Tax](https://www.dinesentax.com/when-are-purchases-made-with-a-credit-card-deductible/), credit card purchases are deductible when the charge occurs, NOT when the CC bill is paid. This is an exception to the general cash-basis rule.

**Example:**
- Dec 20, 2022: James charges $500 at Harbor Freight (tools)
- Jan 15, 2023: James pays the CC bill
- **Tax year for deduction: 2022** (when charged)

This means ForensicBot must use the CHARGE DATE for expense timing, not the payment date.

### 3.1.3 CC Payment Chain Analysis

When James pays his Costco Visa from Chase checking, QBO may show:

```
Chase Checking:  DEBIT  $500  "COSTCO VISA PAYMENT"  2022-05-15
Costco Visa:     CREDIT $500  "PAYMENT RECEIVED"     2022-05-15
```

ForensicBot must:
1. Detect that these are the same $500 (transfer pair)
2. Tag BOTH as `TRANSFER -- Do Not Count`
3. NOT count the Chase debit as an expense
4. NOT count the Costco credit as income
5. The ACTUAL expenses are the individual Costco Visa charges throughout the month

### 3.1.4 Mixed-Use Credit Card Allocation

For cards used for both business and personal purchases (all of James's cards), ForensicBot must:

1. Classify each charge as business or personal
2. Calculate the business-use percentage for the card
3. Allocate interest proportionally: `business_interest = total_interest * (business_charges / total_charges)`
4. Allocate annual fees proportionally (same formula)

```python
def allocate_cc_interest(card_transactions: list, total_interest: float) -> dict:
    """
    Allocate CC interest between business and personal
    based on proportion of charges.
    """
    business_charges = sum(
        t['amount'] for t in card_transactions
        if t['tax_category'] != 'Personal' and t['direction'] == 'debit'
    )
    total_charges = sum(
        t['amount'] for t in card_transactions
        if t['direction'] == 'debit'
    )

    if total_charges == 0:
        return {'business': 0, 'personal': total_interest}

    biz_pct = business_charges / total_charges
    return {
        'business': round(total_interest * biz_pct, 2),
        'personal': round(total_interest * (1 - biz_pct), 2),
        'business_pct': round(biz_pct * 100, 1)
    }
```

### Reference: [Ramp - CC Payments Tax Deductible](https://ramp.com/blog/are-credit-card-payments-tax-deductible-for-business) | [TurboTax - CC Interest](https://turbotax.intuit.com/tax-tips/small-business-taxes/is-interest-on-credit-cards-tax-deductible/L3TlLAaoI) | [FitSmallBusiness - When to Deduct CC Payments](https://fitsmallbusiness.com/tax-deduction-business-credit-card-payments/)

## 3.2 James's Credit Card Portfolio (2022)

ForensicBot must handle all of these:

| Card | Issuer | Primary Use | Self-Transfer Risk |
|---|---|---|---|
| Costco Visa | Citi | Business supplies, gas | Low |
| Blue Business Plus | AmEx | Business purchases | Low |
| BankAmericard | BofA | Personal/Mixed | Medium |
| Discover | Discover | Mixed, P2P funding | High (codes P2P as purchase) |
| Home Depot CC | Citibank | Tools, materials | Low |
| Target CC | TD Bank | Personal | Low |
| AmEx (other) | AmEx | Mixed | Medium |
| Citi (other) | Citi | Mixed | Medium |

---

# 4. GAMBLING TRANSACTION HANDLING FOR TAXES

## 4.1 IRS Rules on Gambling Income and Losses

Per [IRS Topic 419](https://www.irs.gov/taxtopics/tc419), the rules are strict and unforgiving:

### 4.1.1 Income Reporting

- ALL gambling winnings are taxable income -- even if not reported on W-2G
- Winnings are reported on Schedule 1, Line 8b (Other Income)
- Professional gamblers report on Schedule C (but James is NOT a professional gambler)

### 4.1.2 Loss Deductions

- Gambling losses are deductible ONLY on Schedule A (itemized deductions)
- Losses CANNOT exceed winnings (you can never show a net gambling loss for tax purposes)
- If you take the standard deduction, you get ZERO benefit from gambling losses
- Post-TCJA (2018-2025): gambling losses for recreational gamblers include wager amounts plus other expenses (travel, meals) incurred in connection with gambling

### 4.1.3 W-2G Thresholds

Per [IRS Instructions for W-2G](https://www.irs.gov/instructions/iw2g), a W-2G is issued for:

| Type | Threshold |
|---|---|
| Slot machines / bingo | $1,200+ |
| Keno | $1,500+ (reduced by wager) |
| Poker tournaments | $5,000+ (reduced by buy-in) |
| Other gambling | $600+ if 300x+ the wager |
| Sweepstakes/lotteries | $5,000+ |

**Withholding:** Regular gambling withholding is 24% of the payment.

### 4.1.4 Session-Based Tracking

The IRS allows netting wins and losses within a single gambling session. A "session" is continuous, uninterrupted play at a single venue.

### 4.1.5 Documentation Requirements

Per [IRS records requirements](https://apps.irs.gov/app/IPAR/resources/help/Records.html) and [The Tax Adviser](https://www.thetaxadviser.com/issues/2007/jun/establishingbasisforgamblinglosses/), you MUST maintain a contemporaneous diary or log containing:

- Date and type of gambling activity
- Name and address/location of establishment
- Names of other persons present
- Amount won or lost per session

**Supporting documentation includes:**
- Wagering tickets and payment slips
- Canceled checks / credit card statements from casino ATMs
- Win/loss statements from casinos (annual)
- W-2G forms received

**"Contemporaneous" means recorded at or near the time of gambling, NOT reconstructed later.**

## 4.2 Impact on Fund Tracing

Gambling transactions create massive noise in bank and CC records:

```
PROBLEM TRANSACTIONS:
  Casino ATM withdrawal $500          -> Is this an expense? (No, it's a gambling stake)
  Casino charge on CC $200            -> Cash advance or chip purchase?
  Casino deposit to bank $1,300       -> Is this income? (Only the NET win portion)
  Online gambling site transfer $100  -> Expense or stake?
  Casino comp credit $50              -> Income?
```

**ForensicBot handling:**

```python
GAMBLING_CLASSIFICATION = {
    'casino_withdrawal_atm': 'GAMBLING_STAKE',      # Not an expense
    'casino_cc_charge': 'GAMBLING_STAKE',            # Not an expense
    'casino_deposit_bank': 'GAMBLING_RETURN',        # Only net win is income
    'online_gambling_transfer': 'GAMBLING_STAKE',    # Not an expense
    'casino_comp': 'GAMBLING_INCOME',                # Taxable if > threshold
    'w2g_winnings': 'GAMBLING_INCOME',               # Always taxable
}

# ForensicBot must:
# 1. Isolate ALL gambling transactions into a separate pool
# 2. Calculate net gambling result (winnings - losses)
# 3. If net positive: report as Other Income on Schedule 1
# 4. If net negative: deductible ONLY on Schedule A, ONLY up to winnings
# 5. NEVER mix gambling transactions into Schedule C business income/expenses
```

### 4.2.1 The Schedule C vs Schedule A Problem

James is filing Schedule C for his FPCS business. Gambling income is NOT Schedule C income (unless he's a professional gambler, which he is not). Gambling losses go on Schedule A.

**This creates a tax trap:** If James's standard deduction exceeds his itemized deductions, gambling losses provide ZERO tax benefit, but gambling WINNINGS are still fully taxable.

**ForensicBot must clearly separate gambling flows from business flows.**

### Reference: [Silver Tax Group - Gambling Tax Changes](https://silvertaxgroup.com/how-to-deduct-gambling-taxes-in-2026/) | [JMCO - Gambling Loss Deduction Limits](https://www.jmco.com/articles/tax/gambling-loss-deduction-new-tax-law/) | [TaxSlayer - Schedule C vs W-2G](https://support.taxslayer.com/hc/en-us/articles/32550494584205-Should-pro-gamblers-file-a-Schedule-C-or-W-2G)

---

# 5. CYBER CRIME / THEFT LOSS TAX TREATMENT

## 5.1 Section 165 Framework

[IRC Section 165](https://www.law.cornell.edu/uscode/text/26/165) allows deduction of losses sustained during the tax year, including theft losses. However, the TCJA of 2017 severely restricted this for individuals.

### 5.1.1 Pre-TCJA (Before 2018)

- Personal theft losses were deductible on Schedule A
- Subject to: $100 per-event floor + 10% AGI floor
- No requirement for federally declared disaster

### 5.1.2 Post-TCJA (2018-2025) -- JAMES'S TAX YEAR

For tax years 2018-2025, **personal** casualty and theft losses are deductible ONLY if arising from a federally declared disaster. This effectively eliminated most personal theft loss deductions.

**HOWEVER, there are surviving exceptions:**

1. **Business theft losses (IRC 165(c)(1)):** Losses incurred in a trade or business remain fully deductible. If funds were stolen FROM the FPCS business operations, this deduction survives TCJA.

2. **Profit-motivated transaction losses (IRC 165(c)(2)):** Losses from transactions entered into for profit (but not connected to a trade or business) also survive. This covers investment fraud, but could potentially cover cyber theft if the stolen funds were in profit-seeking accounts.

3. **The "transaction entered into for profit" interpretation:** Per recent [IRS Chief Counsel Advice](https://www.taxpayeradvocate.irs.gov/news/nta-blog/irs-chief-counsel-advice-on-theft-loss-deductions-for-scam-victims/2025/04/), a taxpayer can establish profit motive even when a scammer misleads them into moving money under false pretenses of "protecting" it.

### 5.1.3 Requirements for Claiming Theft Loss

Per [CPA Journal analysis](https://www.cpajournal.com/2025/03/25/theft-loss-deductions-under-the-tax-cuts-and-jobs-act-of-2017/) and [Cherry Bekaert](https://www.cbh.com/insights/articles/irs-theft-loss-rules-for-5-common-scams/):

1. **Theft under state law:** The loss must result from conduct that qualifies as "theft" under the applicable state law (Oregon in James's case)
2. **No reasonable prospect of recovery:** The taxpayer must have exhausted reasonable efforts to recover the funds
3. **Profit motive OR business connection:** The loss must be connected to a trade/business or profit-seeking transaction
4. **Year of discovery rule:** Theft losses are deducted in the year the theft is discovered (may or may not be 2022)
5. **No insurance/reimbursement:** Must reduce by any insurance proceeds or other recovery

### 5.1.4 Oregon State Law on Theft/Cybercrime

Per [ORS 165.800](https://oregon.public.law/statutes/ors_165.800), Oregon defines identity theft as a Class C felony, covering obtaining, possessing, transferring, creating, or converting another person's personal identification with intent to deceive or defraud.

This provides the state-law "theft" element needed for IRC 165.

## 5.2 Documentation for Cyber Crime Losses

### 5.2.1 Required Documentation

| Document | Purpose | Status for James |
|---|---|---|
| FBI IC3 complaint | Official federal report | Filed (per James) |
| Local police report | State-law theft documentation | CHECK -- may need to file |
| Bank/CC fraud reports | Account-level documentation | CHECK each institution |
| Form 4684 | IRS form for casualties/thefts | TO BE PREPARED |
| Timeline of events | Narrative of what happened | NEEDS DOCUMENTATION |
| Evidence of loss amounts | Transaction records showing stolen funds | FROM QBO DATA |
| Evidence of no recovery prospect | FBI non-response, bank denial letters | COLLECT |

### 5.2.2 ForensicBot's Role in Theft Documentation

ForensicBot can help by:
1. Identifying transactions that match theft/fraud patterns (unauthorized charges, unauthorized transfers)
2. Isolating compromised account activity during the attack period
3. Calculating total losses attributable to cyber attacks
4. Generating a forensic timeline suitable for Form 4684 attachment

### 5.2.3 Form 4684 Calculation

```
Section B -- Business and Income-Producing Property:

Line 19: Cost or adjusted basis of property: [amount stolen]
Line 20: Insurance or other reimbursement: [any recovery]
Line 21: Gain from casualty or theft: [0 if no recovery]
Line 22-27: Loss calculation
Line 28: Total business theft loss -> Schedule C or Form 4797
```

**For FPCS business funds stolen:** Deductible on Schedule C as a business loss.
**For personal funds stolen via business accounts:** Potentially deductible under IRC 165(c)(2) if profit-motivated.
**For purely personal funds stolen:** NOT deductible under TCJA (2018-2025) unless federally declared disaster.

### Reference: [Kostelanetz - Theft Loss Under TCJA](https://kostelanetz.com/theft-loss-deductions-under-the-tcja/) | [Freeman Law - Theft Losses](https://freemanlaw.com/can-i-deduct-theft-losses/) | [IRS Revenue Ruling 2009-9](https://www.irs.gov/pub/irs-drop/rr-09-09.pdf)

## 5.3 How Compromised Accounts Affect Fund Tracing

When an account is compromised, ForensicBot must handle:

1. **Unauthorized transactions:** Flag and isolate. These are NOT expenses. They are theft.
2. **Provisional credits:** Bank gives temporary credit while investigating -- may be reversed.
3. **Chargebacks:** CC company reverses fraudulent charges -- creates credit transactions.
4. **Account closure/migration:** New account numbers mid-year create gaps in data.
5. **Frozen funds:** Money inaccessible but not lost -- cannot deduct until loss is certain.

```python
COMPROMISED_ACCOUNT_FLAGS = [
    'FRAUD',
    'UNAUTHORIZED',
    'DISPUTE',
    'CHARGEBACK',
    'PROVISIONAL CREDIT',
    'SECURITY HOLD',
    'ACCOUNT CLOSED',
    'IDENTITY THEFT',
]

def flag_compromised_transactions(transactions: list) -> list:
    """Flag transactions that may be related to account compromise."""
    flagged = []
    for txn in transactions:
        payee_upper = txn.get('payee', '').upper()
        category_upper = txn.get('category', '').upper()

        for flag in COMPROMISED_ACCOUNT_FLAGS:
            if flag in payee_upper or flag in category_upper:
                txn['forensic_flag'] = 'POSSIBLE_THEFT'
                txn['requires_manual_review'] = True
                flagged.append(txn)
                break

    return flagged
```

---

# 6. ALGORITHM DESIGN FOR AUTOMATED FUND TRACING

## 6.1 Graph-Based Architecture

The core data structure for ForensicBot is a **directed graph** where:
- **Nodes** = Financial accounts (Chase, Wells Fargo, PayPal, Venmo, CashApp, Square, each CC)
- **Edges** = Transactions (money moving between accounts)
- **Edge properties** = amount, date, direction, type, confidence, chain_id

### 6.1.1 Graph Data Model

```python
import networkx as nx
from datetime import datetime, timedelta

class ForensicGraph:
    """
    Directed graph representing all money flows across James's accounts.
    Each edge is a transaction. Each node is a financial account.
    """

    # Account classifications
    ACCOUNT_TYPES = {
        'bank': ['Chase Checking', 'Wells Fargo'],
        'payment_processor': ['PayPal', 'Venmo', 'CashApp', 'Square'],
        'credit_card': [
            'Costco Visa', 'Blue Business Plus', 'BankAmericard',
            'Discover', 'Home Depot CC', 'Target CC', 'AmEx', 'Citi'
        ],
        'external': ['eBay', 'Amazon', 'Vendors', 'Customers', 'ATM/Cash'],
        'ledger': ['Cash (Ledger)']
    }

    # Valid flow directions (source -> destination)
    VALID_FLOWS = {
        ('external', 'payment_processor'),     # Customer pays via PayPal
        ('external', 'bank'),                  # Direct deposit, eBay payout
        ('payment_processor', 'bank'),         # Cash out
        ('payment_processor', 'payment_processor'),  # Self-transfer
        ('bank', 'credit_card'),               # CC payment
        ('bank', 'external'),                  # Purchase, bill payment
        ('bank', 'bank'),                      # Inter-bank transfer
        ('credit_card', 'external'),           # CC purchase
        ('credit_card', 'payment_processor'),  # CC funds transfer
        ('bank', 'ledger'),                    # ATM -> cash purchase
    }

    def __init__(self):
        self.G = nx.MultiDiGraph()  # Multi-edge directed graph
        self._setup_accounts()

    def _setup_accounts(self):
        """Create nodes for all known accounts."""
        for acct_type, accounts in self.ACCOUNT_TYPES.items():
            for acct in accounts:
                self.G.add_node(acct, type=acct_type)

    def add_transaction(self, txn: dict):
        """
        Add a transaction as a directed edge.

        txn = {
            'txn_id': 'FPCS-0001',
            'date': '2022-01-15',
            'amount': 194.28,
            'source': 'eBay',           # Where money came from
            'destination': 'Chase Checking',  # Where money went
            'payee': 'eBay PAYOUT',
            'category': 'Sales',
            'direction': 'credit',      # From perspective of destination
            'chain_id': None,           # Assigned by chain detection
            'forensic_tag': None,       # Assigned by analysis
        }
        """
        self.G.add_edge(
            txn['source'],
            txn['destination'],
            key=txn['txn_id'],
            **txn
        )

    def find_chains(self, amount: float, tolerance_pct: float = 0.02,
                    date_window_days: int = 5) -> list:
        """
        Find all transaction chains involving a specific amount.

        A chain is a sequence of edges where:
        1. Amounts are within tolerance of each other (or fee-adjusted)
        2. Dates are within the window
        3. Destination of one edge is the source of the next
        """
        chains = []
        # Find all edges with matching amounts
        candidates = [
            (u, v, k, d) for u, v, k, d in self.G.edges(keys=True, data=True)
            if abs(d['amount'] - amount) / amount <= tolerance_pct
        ]

        # Build chains by following temporal + amount patterns
        for start_edge in candidates:
            chain = self._trace_forward(start_edge, tolerance_pct, date_window_days)
            if len(chain) > 1:
                chains.append(chain)

        return self._deduplicate_chains(chains)

    def _trace_forward(self, edge, tolerance_pct, window_days):
        """Trace a transaction forward through the graph."""
        chain = [edge]
        current_dest = edge[1]       # Destination node
        current_amount = edge[3]['amount']
        current_date = datetime.strptime(edge[3]['date'], '%Y-%m-%d')

        while True:
            # Find outgoing edges from current destination
            next_edges = [
                (u, v, k, d)
                for u, v, k, d in self.G.edges(current_dest, keys=True, data=True)
                if (
                    abs(d['amount'] - current_amount) / current_amount <= tolerance_pct
                    and 0 <= (datetime.strptime(d['date'], '%Y-%m-%d') - current_date).days <= window_days
                    and (u, v, k, d) not in chain
                )
            ]

            if not next_edges:
                break

            # Take the best match (closest amount, closest date)
            best = min(next_edges, key=lambda e: (
                abs(e[3]['amount'] - current_amount),
                abs((datetime.strptime(e[3]['date'], '%Y-%m-%d') - current_date).days)
            ))

            chain.append(best)
            current_dest = best[1]
            current_amount = best[3]['amount']
            current_date = datetime.strptime(best[3]['date'], '%Y-%m-%d')

        return chain
```

### Reference: [NetworkX DAG Documentation](https://networkx.org/documentation/stable/reference/algorithms/dag.html) | [Medium - Financial Network Analysis](https://leo-fajardo-vasquez14.medium.com/analisis-de-redes-en-transacciones-financieras-usando-python-networkx-55a58cdc3cb8) | [Medium - AML Network Analysis](https://medium.com/@jasonclwu/network-analysis-for-anti-money-laundering-with-python-ad981792a947)

## 6.2 Temporal Matching (Settlement Windows)

Different payment methods have different settlement times. ForensicBot must account for these when matching transactions:

```python
SETTLEMENT_WINDOWS = {
    # (source_type, dest_type): (min_days, max_days, typical_days)
    ('ebay', 'bank'):           (2, 7, 3),     # eBay managed payments
    ('paypal', 'bank'):         (1, 5, 2),     # Standard transfer
    ('paypal_instant', 'bank'): (0, 0, 0),     # Instant (same day)
    ('venmo', 'bank'):          (1, 5, 2),     # Standard transfer
    ('venmo_instant', 'bank'):  (0, 0, 0),     # Instant
    ('cashapp', 'bank'):        (1, 3, 2),     # Standard
    ('square', 'bank'):         (1, 2, 1),     # Next business day typical
    ('bank', 'bank'):           (0, 3, 1),     # ACH transfer
    ('bank', 'cc'):             (0, 3, 1),     # CC payment
    ('cc', 'processor'):        (0, 1, 0),     # CC charge is immediate
    ('atm', 'cash'):            (0, 0, 0),     # Immediate
}

def is_within_settlement_window(
    source_date: datetime,
    dest_date: datetime,
    source_type: str,
    dest_type: str
) -> tuple:
    """
    Check if two transactions fall within expected settlement window.
    Returns (is_match, confidence, explanation).
    """
    key = (source_type, dest_type)
    window = SETTLEMENT_WINDOWS.get(key)

    if not window:
        return (False, 0.0, f"No known settlement window for {key}")

    min_days, max_days, typical_days = window
    actual_days = (dest_date - source_date).days

    if actual_days < min_days or actual_days > max_days:
        return (False, 0.0, f"Outside window: {actual_days} days (expected {min_days}-{max_days})")

    # Confidence is highest when actual matches typical
    if actual_days == typical_days:
        confidence = 1.0
    elif actual_days <= typical_days:
        confidence = 0.9
    else:
        # Degrades as we approach max
        confidence = 0.9 - (0.3 * (actual_days - typical_days) / (max_days - typical_days))

    return (True, confidence, f"Within window: {actual_days} days (typical: {typical_days})")
```

## 6.3 Amount Tolerance Matching

Not all matching amounts are exact. Fees, rounding, partial transfers, and holds all create small discrepancies.

```python
class AmountMatcher:
    """
    Multi-strategy amount matching for transaction reconciliation.
    """

    STRATEGIES = [
        ('exact', 0.0),              # $500.00 == $500.00
        ('penny_tolerance', 0.01),   # $500.00 ~= $500.01
        ('rounding', 0.50),          # $499.72 ~= $500.00
        ('fee_adjusted', None),      # $467.50 is $500 minus 6.5% fee
        ('percentage', 0.02),        # Within 2% (general tolerance)
    ]

    def match(self, amount_a: float, amount_b: float,
              known_processor: str = None) -> dict:
        """
        Attempt to match two amounts using multiple strategies.
        Returns best match with confidence.
        """
        results = []

        # Strategy 1: Exact match
        if abs(amount_a - amount_b) < 0.005:
            results.append({
                'strategy': 'exact',
                'confidence': 1.0,
                'difference': 0.0,
                'explanation': 'Exact match'
            })

        # Strategy 2: Small tolerance (bank rounding, float errors)
        diff = abs(amount_a - amount_b)
        if diff <= 0.50:
            results.append({
                'strategy': 'rounding',
                'confidence': max(0.7, 1.0 - diff),
                'difference': diff,
                'explanation': f'Within ${diff:.2f} rounding tolerance'
            })

        # Strategy 3: Fee-adjusted match
        if known_processor:
            schedule = PROCESSOR_FEE_SCHEDULES.get(known_processor)
            if schedule:
                larger = max(amount_a, amount_b)
                smaller = min(amount_a, amount_b)
                expected_fee = schedule['formula'](larger)
                expected_net = larger - expected_fee

                if abs(expected_net - smaller) < 0.50:
                    results.append({
                        'strategy': 'fee_adjusted',
                        'confidence': 0.90,
                        'difference': abs(expected_net - smaller),
                        'fee': expected_fee,
                        'gross': larger,
                        'net': smaller,
                        'explanation': f'{known_processor} fee ${expected_fee:.2f} explains difference'
                    })

        # Strategy 4: Percentage tolerance
        if amount_a > 0 and amount_b > 0:
            pct_diff = abs(amount_a - amount_b) / max(amount_a, amount_b)
            if pct_diff <= 0.05:  # 5% tolerance
                results.append({
                    'strategy': 'percentage',
                    'confidence': max(0.5, 1.0 - pct_diff * 10),
                    'difference': diff,
                    'pct_difference': pct_diff,
                    'explanation': f'{pct_diff*100:.1f}% difference'
                })

        if not results:
            return {'strategy': 'no_match', 'confidence': 0.0}

        # Return highest confidence match
        return max(results, key=lambda r: r['confidence'])
```

## 6.4 Entity Resolution (Same Person Across Accounts)

For ForensicBot, entity resolution is simpler than general-purpose ER because we KNOW all accounts belong to James. The challenge is recognizing when a payee name refers to James's own account vs. an external party.

```python
# James's known account identifiers
JAMES_ACCOUNT_ALIASES = {
    'chase': [
        'CHASE', 'JP MORGAN', 'JPMORGAN', 'CHASE CHECKING',
        'ONLINE TRANSFER', 'ZELLE'  # Chase-based transfers
    ],
    'wells_fargo': [
        'WELLS FARGO', 'WF', 'WFHM', 'WELLS'
    ],
    'paypal': [
        'PAYPAL', 'PP*', 'PAYPAL TRANSFER', 'PAYPAL INST XFER',
        'PAYPAL CASH', 'PPCC'
    ],
    'venmo': [
        'VENMO', 'VENMO CASHOUT', 'VENMO PAYMENT'
    ],
    'cashapp': [
        'CASH APP', 'CASHAPP', 'SQUARE CASH', 'SQ *CASH',
        'SQUARE INC'
    ],
    'square': [
        'SQUARE', 'SQ *', 'SQUAREUP', 'GOSQ.COM'
    ],
    'costco_visa': [
        'COSTCO VISA', 'CITI COSTCO', 'CITICARDS',
        'COSTCO ANYWHERE'
    ],
    'amex': [
        'AMEX', 'AMERICAN EXPRESS', 'BLUE BUSINESS',
        'AMERIPRISE'
    ],
    'discover': [
        'DISCOVER', 'DFS SERVICES'
    ],
    'ebay': [
        'EBAY', 'E BAY', 'EBAY MANAGED', 'EBAY INC'
    ]
}

def identify_account(payee_string: str) -> tuple:
    """
    Attempt to identify which of James's accounts a payee string refers to.
    Returns (account_key, confidence, match_type).
    """
    payee_upper = payee_string.upper().strip()

    for account_key, aliases in JAMES_ACCOUNT_ALIASES.items():
        for alias in aliases:
            if alias in payee_upper:
                # Exact substring match
                return (account_key, 0.95, 'alias_match')

    # Fuzzy matching fallback
    from rapidfuzz import fuzz
    best_match = None
    best_score = 0

    for account_key, aliases in JAMES_ACCOUNT_ALIASES.items():
        for alias in aliases:
            score = fuzz.partial_ratio(payee_upper, alias)
            if score > best_score and score >= 80:
                best_score = score
                best_match = (account_key, score / 100, 'fuzzy_match')

    return best_match or (None, 0.0, 'no_match')
```

### Reference: [Neo4j - Entity Resolution](https://neo4j.com/blog/graph-database/what-is-entity-resolution/) | [Hawk AI - Entity Resolution in FinCrime](https://hawk.ai/news-press/entity-resolution-key-success-ai-anti-financial-crime) | [Lucinity - ER in Investigations](https://lucinity.com/blog/the-role-of-entity-resolution-in-fincrime-investigations-from-fuzzy-matches-to-precise-risk-signals)

## 6.5 Chain Scoring and Confidence Levels

Every chain ForensicBot identifies needs a confidence score to prioritize human review.

```python
class ChainScorer:
    """
    Score a detected transaction chain on confidence that it's a real chain
    (not coincidental similar amounts).
    """

    WEIGHTS = {
        'amount_match': 0.30,        # How closely amounts match
        'temporal_match': 0.25,      # How well dates align with settlement windows
        'account_flow': 0.20,        # Does the flow make logical sense?
        'payee_resolution': 0.15,    # Can we identify both sides?
        'pattern_match': 0.10,       # Does it match a known pattern?
    }

    CONFIDENCE_THRESHOLDS = {
        'auto_resolve': 0.95,    # Automatically tag as chain
        'high': 0.85,            # Very likely chain, low-priority review
        'medium': 0.70,          # Probable chain, needs review
        'low': 0.50,             # Possible chain, needs investigation
        'uncertain': 0.0,        # Not enough evidence
    }

    def score_chain(self, chain: list) -> dict:
        """
        Score a chain of linked transactions.
        Returns overall confidence and component scores.
        """
        scores = {}

        # Amount match score
        amounts = [edge[3]['amount'] for edge in chain]
        if len(set(amounts)) == 1:
            scores['amount_match'] = 1.0
        else:
            max_diff = max(amounts) - min(amounts)
            avg_amount = sum(amounts) / len(amounts)
            scores['amount_match'] = max(0, 1.0 - (max_diff / avg_amount))

        # Temporal match score
        dates = [datetime.strptime(edge[3]['date'], '%Y-%m-%d') for edge in chain]
        total_span = (max(dates) - min(dates)).days
        expected_span = len(chain) * 2  # ~2 days per hop
        if total_span <= expected_span:
            scores['temporal_match'] = 1.0
        else:
            scores['temporal_match'] = max(0, 1.0 - (total_span - expected_span) / 10)

        # Account flow score
        flow_valid = True
        for i in range(len(chain) - 1):
            src_type = self._get_account_type(chain[i][1])
            dst_type = self._get_account_type(chain[i+1][1])
            if (src_type, dst_type) not in ForensicGraph.VALID_FLOWS:
                flow_valid = False
                break
        scores['account_flow'] = 1.0 if flow_valid else 0.3

        # Payee resolution score
        resolved = sum(1 for e in chain if identify_account(e[3].get('payee', ''))[1] > 0.7)
        scores['payee_resolution'] = resolved / len(chain)

        # Pattern match score
        pattern = self._identify_pattern(chain)
        scores['pattern_match'] = pattern['confidence'] if pattern else 0.5

        # Weighted total
        total = sum(scores[k] * self.WEIGHTS[k] for k in self.WEIGHTS)

        # Determine confidence tier
        tier = 'uncertain'
        for tier_name, threshold in sorted(
            self.CONFIDENCE_THRESHOLDS.items(),
            key=lambda x: x[1], reverse=True
        ):
            if total >= threshold:
                tier = tier_name
                break

        return {
            'overall_confidence': round(total, 3),
            'tier': tier,
            'component_scores': scores,
            'chain_length': len(chain),
            'total_amount': amounts[0],  # Primary amount
            'requires_review': tier not in ('auto_resolve', 'high')
        }

    def _get_account_type(self, node_name):
        for acct_type, accounts in ForensicGraph.ACCOUNT_TYPES.items():
            if node_name in accounts:
                return acct_type
        return 'unknown'

    def _identify_pattern(self, chain):
        """Match chain against known patterns."""
        # Pattern definitions
        patterns = {
            'ebay_payout': {
                'flow': ['external', 'bank'],
                'confidence': 0.95
            },
            'processor_cashout': {
                'flow': ['payment_processor', 'bank'],
                'confidence': 0.90
            },
            'cc_payment': {
                'flow': ['bank', 'credit_card'],
                'confidence': 0.95
            },
            'cc_to_cash_bridge': {
                'flow': ['credit_card', 'payment_processor', 'payment_processor', 'bank'],
                'confidence': 0.80
            },
            'inter_bank': {
                'flow': ['bank', 'bank'],
                'confidence': 0.92
            }
        }

        chain_flow = [self._get_account_type(e[0]) for e in chain] + \
                     [self._get_account_type(chain[-1][1])]

        for name, pattern in patterns.items():
            if chain_flow == pattern['flow']:
                return {'name': name, 'confidence': pattern['confidence']}

        return None
```

## 6.6 How Fintech Companies Detect Internal Transfers

Based on research into AML (Anti-Money Laundering) practices at [PayPal](https://publicpolicy.paypal-corp.com/issues/anti-money-laundering-know-your-customer) and fintech fraud detection:

**Key detection signals:**
1. **Shared identifiers:** Same SSN, phone number, email across accounts
2. **Device fingerprinting:** Same device ID used on multiple accounts
3. **IP address correlation:** Same IP address accessing multiple accounts
4. **Behavioral timing:** Transfers that happen in rapid succession suggest automation or self-transfer
5. **Amount patterns:** Round numbers, repeated identical amounts
6. **Velocity checks:** Too many transfers in too short a time window
7. **Network analysis:** Graph algorithms that map hub-and-spoke patterns typical of self-transfer or [structuring/smurfing](https://www.aiprise.com/blog/smurfing-vs-structuring)

**ForensicBot's advantage:** We already KNOW all accounts belong to James. We don't need to "detect" self-transfers probabilistically -- we just need to recognize them in the transaction data. Our entity resolution is a lookup table, not a probabilistic model.

---

# 7. OPEN SOURCE TOOLS AND LIBRARIES

## 7.1 Core Python Stack for ForensicBot

### 7.1.1 Data Manipulation

| Library | Purpose | Install |
|---|---|---|
| **pandas** | DataFrame operations, CSV/Excel I/O | `pip install pandas` |
| **numpy** | Numerical operations, array math | `pip install numpy` |
| **openpyxl** | Excel reading/writing (xlsx) | `pip install openpyxl` |

### 7.1.2 Graph Analysis

| Library | Purpose | Install |
|---|---|---|
| **NetworkX** | Graph construction, path finding, centrality | `pip install networkx` |
| **igraph** | Faster graph algorithms for large graphs | `pip install python-igraph` |
| **pyvis** | Interactive graph visualization (HTML output) | `pip install pyvis` |

[NetworkX documentation](https://networkx.org/documentation/stable/reference/algorithms/index.html) provides algorithms for:
- DAG operations (topological sort, ancestors, descendants)
- Shortest paths and all-paths enumeration
- Connectivity analysis
- Cycle detection (important: money flow should be acyclic unless it's a loop)

### 7.1.3 String Matching / Entity Resolution

| Library | Purpose | Install |
|---|---|---|
| **RapidFuzz** | Fast fuzzy string matching (C++ backend) | `pip install rapidfuzz` |
| **Splink** | Probabilistic record linkage at scale | `pip install splink` |
| **python-Levenshtein** | Edit distance calculations | `pip install python-Levenshtein` |

[RapidFuzz](https://github.com/rapidfuzz/RapidFuzz) provides 5-100x speedup over fuzzywuzzy, using the same API. It implements Levenshtein distance, Jaro-Winkler, and other similarity metrics.

[Splink](https://moj-analytical-services.github.io/splink/index.html) implements the Fellegi-Sunter probabilistic record linkage model. It can link a million records on a laptop in about one minute. Supports DuckDB, Spark, and Athena backends.

### 7.1.4 Anomaly Detection

| Library | Purpose | Install |
|---|---|---|
| **benford_py** | Benford's Law testing | `pip install benford_py` |
| **benfordslaw** | Benford's Law analysis with statistical tests | `pip install benfordslaw` |
| **scikit-learn** | Clustering, outlier detection | `pip install scikit-learn` |

[Benford's Law analysis](https://github.com/milcent/benford_py) tests whether the first-digit distribution of transaction amounts follows the expected Benford distribution. Significant deviation suggests data manipulation or fraud. Useful as a global sanity check on the transaction data.

### 7.1.5 Visualization

| Library | Purpose | Install |
|---|---|---|
| **matplotlib** | Standard plotting | `pip install matplotlib` |
| **plotly** | Interactive charts (HTML) | `pip install plotly` |
| **pyvis** | Network graph visualization | `pip install pyvis` |

### 7.1.6 Reconciliation

| Library | Purpose | Install |
|---|---|---|
| **reconPy** | Automated 1:1 record matching | `pip install reconPy` |

[reconPy](https://pypi.org/project/reconPy/) provides a data reconciliation engine with one-to-one matching (each record matched only once).

### Reference: [DataCamp - Fuzzy Matching Tutorial](https://www.datacamp.com/tutorial/fuzzy-string-python) | [Mito - Reconciliation Guide](https://www.trymito.io/blog/how-to-automate-reconciliations-in-python-a-complete-guide) | [GitHub - Forensic Accounting Case Studies](https://github.com/mschermann/forensic_accounting)

## 7.2 Recommended ForensicBot Dependencies

```
# requirements.txt for ForensicBot

# Core
pandas>=2.0
numpy>=1.24
openpyxl>=3.1

# Graph
networkx>=3.1
pyvis>=0.3

# Matching
rapidfuzz>=3.0
# splink>=3.9  # Optional: for large-scale entity resolution

# Anomaly Detection
benford_py>=0.5
# scikit-learn>=1.3  # Optional: for ML-based anomaly detection

# Visualization
matplotlib>=3.7
plotly>=5.15

# Utility
python-dateutil>=2.8
pathlib  # stdlib, no install needed
```

---

# 8. SCHEDULE C SPECIFIC FUND TRACING

## 8.1 What the IRS Expects

### 8.1.1 IRC 6001: Adequate Records Requirement

Per [IRC Section 6001](https://www.law.cornell.edu/uscode/text/26/6001) and [Treas. Reg. 1.6001-1](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFR4423716657898cd/section-1.6001-1):

> Every person liable for any tax imposed by this title shall keep such records, render such statements, make such returns, and comply with such rules and regulations as the Secretary may from time to time prescribe.

Records must be sufficient to establish:
- Amount of gross income
- Deductions
- Credits
- Other matters required on the return

**For sole proprietors specifically:** The regulations require permanent books of account or records sufficient to establish income and deductions. The level of detail depends on the nature and extent of the business.

### 8.1.2 Substantiation Rules for Business Expenses

The IRS requires substantiation beyond just a bank or credit card statement. Per [The Tax Adviser](https://www.thetaxadviser.com/issues/2023/nov/substantiation-of-business-expenses-a-review-of-the-basics/):

**General substantiation (most expenses):**
- Amount
- Date
- Business purpose
- Business relationship (if entertainment/meals)

**Enhanced substantiation (IRC 274):**
These categories require heightened documentation:
- Travel expenses
- Entertainment/meals (pre-TCJA)
- Vehicle use (mileage log or actual expenses)
- Listed property (computers, phones used for business)
- Gifts

**What is NOT adequate:**
- Credit card statement alone (does not show business purpose)
- Bank statement alone (does not show what was purchased)
- Canceled check alone (does not show business purpose)

**What IS adequate:**
- Receipt + notation of business purpose
- Invoice + proof of payment
- Contemporaneous log (especially for vehicle use)
- Electronic records (if they capture all required elements)

### 8.1.3 The Cohan Rule (When Records Are Missing)

When exact records are missing, the [Cohan rule](https://www.journalofaccountancy.com/issues/1999/sep/knight.html) (from Cohan v. Commissioner, 1930) allows the IRS or Tax Court to estimate expenses IF there is sufficient evidence that the expense was incurred. However:

- The Cohan rule does NOT apply to IRC 274 expenses (travel, entertainment, gifts, listed property)
- The estimate must have a reasonable basis
- The taxpayer bears the burden of proof

**ForensicBot relevance:** For the 562 unmatched ledger entries (~$16K in cash deductions), the Cohan rule may allow us to claim expenses even without matching QBO records, provided we can show the expenditures were real and business-related.

## 8.2 Business vs Personal Separation

### 8.2.1 What the IRS Looks For in Commingled Accounts

Per [IRM 4.10.4](https://www.irs.gov/irm/part4/irm_04-010-004) and [Tax Defense Network](https://www.taxdefensenetwork.com/blog/the-dangers-of-mixing-business-and-personal-expenses/):

The IRS examiner will:
1. **Request ALL bank records** -- personal AND business
2. **Total ALL deposits** across all accounts
3. **Subtract documented non-taxable deposits** (transfers, loans, gifts, returns)
4. **Compare to reported income** -- any excess is presumed unreported income
5. **Review ALL expenditures** -- classify as business (deductible) or personal (not)
6. **Look for patterns** of disguised personal expenses claimed as business

**Red flags that trigger deeper investigation:**
- Large cash deposits with no documented source
- Deposits that exceed reported income
- Business expenses that look personal (dining, entertainment, travel)
- Round-number deposits (may indicate unreported cash income)
- Transfers between accounts that obscure the money trail

### 8.2.2 ForensicBot's Defense Strategy

ForensicBot should produce documentation that mirrors what an IRS examiner would create, but from James's perspective:

```
FORENSICBOT OUTPUT: Bank Deposit Analysis Summary
==================================================

Account: Chase Checking
Period: January 1 - December 31, 2022

Total Deposits:                         $XX,XXX.XX

Less: Non-Taxable Deposits
  Transfers from own accounts:          ($X,XXX.XX)
  PayPal cashouts:                      ($X,XXX.XX)
  Venmo cashouts:                       ($X,XXX.XX)
  CC refunds/credits:                   ($X,XXX.XX)
  Loan proceeds:                        ($X,XXX.XX)
  Personal gifts/support:               ($X,XXX.XX)
  Redeposited returns:                  ($X,XXX.XX)
                                        -----------
Net Taxable Deposits:                   $XX,XXX.XX

Reconciliation to Schedule C:
  eBay Sales (per 1099-K):              $XX,XXX.XX
  Service Income (per invoices):        $X,XXX.XX
  Other Business Income:                $X,XXX.XX
                                        -----------
Total Reported Income:                  $XX,XXX.XX

Variance:                               $X,XXX.XX
Explanation of variance:                [detailed notes]
```

This proactive reconciliation prevents the IRS from using the bank deposit method to assert unreported income.

## 8.3 Specific FPCS Data Considerations

### 8.3.1 The 20 Financial Accounts

ForensicBot must track all 20 accounts:

**Banks (2):** Chase Checking, Wells Fargo
**Payment Processors (4):** PayPal, Venmo, CashApp, Square
**Credit Cards (8+):** Costco Visa, Blue Business Plus, BankAmericard, Discover, Home Depot CC, Target CC, AmEx, Citi
**External (6+):** eBay, Amazon, Vendors, Customers, ATM/Cash, Ledger

### 8.3.2 The 1,185 QBO Rows

After double-entry deduplication (Phase 1), we have 1,185 clean single-entry transactions. ForensicBot will:

1. Load all 1,185 into the graph model
2. Run chain detection to link related transactions
3. Tag transfers vs income vs expenses
4. Cross-reference with 745 ledger entries (183 already matched, 562 unmatched)
5. Produce final deduplicated, chain-resolved tax numbers

### 8.3.3 The $20K Inventory Purchase

The State Surplus auction purchases represent COGS (Cost of Goods Sold) for the eBay business. These need special handling:

- **Schedule C, Part III** (Cost of Goods Sold)
- Beginning inventory + Purchases - Ending inventory = COGS
- Many of these purchases were CASH (from ATM withdrawals)
- ForensicBot's Cash Bridge analysis (Skill 5) connects ATM withdrawals to these purchases

### 8.3.4 Record Retention

Per [IRC 6001](https://accountinginsights.org/internal-revenue-code-6001-the-general-record-rule/), records must be kept for 3 years after the return is filed (the standard assessment period). For James's 2022 return filed in 2026, records should be kept until at least 2029.

However, the IRS can assess tax for 6 years if more than 25% of gross income is unreported (IRC 6501(e)), and there is no statute of limitations for fraud (IRC 6501(c)). Since this is a late filing (2026 for tax year 2022), keeping records indefinitely is recommended.

### Reference: [Accounting Insights - IRC 6001](https://accountinginsights.org/internal-revenue-code-6001-the-general-record-rule/) | [Brieflytaxing - Record Keeping](https://brieflytaxing.com/the-record-keeping-requirement-of-irc-%C2%A7-6001/) | [Tax Audit - Record Keeping Law](https://www.taxaudit.com/tax-audit-blog/2014/tax-record-keeping-its-the-law)

---

# 9. FORENSICBOT IMPLEMENTATION BLUEPRINT

## 9.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ForensicBot Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT LAYER                                                     │
│  ├── FPCS_2022_FINAL_MASTER.csv (1,185 QBO transactions)       │
│  ├── Ledger_2022.csv (745 cash-level entries)                   │
│  ├── FPCS_2022_MASTER_MATCHED.csv (183 cross-references)        │
│  └── Account classifications + James's notes                    │
│                                                                  │
│  PROCESSING LAYER                                                │
│  ├── Transaction Parser (normalize all data formats)             │
│  ├── Graph Builder (construct NetworkX directed graph)           │
│  ├── Chain Detector (find linked transaction sequences)          │
│  ├── Transfer Identifier (tag self-transfers)                    │
│  ├── Fee Extractor (reconstruct gross amounts from nets)         │
│  ├── Refund Matcher (pair debits with credit reversals)          │
│  ├── Cash Bridge Analyzer (connect ATM to ledger purchases)     │
│  ├── Duplicate Detector (find remaining duplicate entries)       │
│  ├── Gambling Isolator (separate gambling from business)         │
│  ├── Theft Flagger (identify compromised-account transactions)  │
│  └── Confidence Scorer (score every chain and match)             │
│                                                                  │
│  OUTPUT LAYER                                                    │
│  ├── Chain Map (all resolved chains with confidence scores)      │
│  ├── Transfer Pairs (all identified self-transfers)              │
│  ├── Tax Impact Summary (true income, true expenses, COGS)      │
│  ├── Bank Deposit Analysis (IRS-style reconciliation)            │
│  ├── Anomaly Report (unresolved transactions, orphans)           │
│  ├── Gambling Summary (net win/loss, W-2G reconciliation)        │
│  ├── Theft Loss Documentation (for Form 4684)                   │
│  └── Review Queue (transactions needing manual review)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 9.2 Data Structures

### 9.2.1 Core Transaction Object

```python
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

@dataclass
class Transaction:
    """Core transaction object used throughout ForensicBot."""
    txn_id: str                          # FPCS-XXXX
    date: date
    payee: str
    amount: float
    direction: str                       # 'debit' or 'credit'
    financial_account: str               # Chase, PayPal, etc.
    category_account: str                # Sales, Expenses, etc.
    tax_category: str                    # One of 28 categories
    deductible: bool

    # Matching metadata
    match_status: str = 'unmatched'      # 'matched', 'unmatched', 'partial'
    ledger_match_id: Optional[str] = None

    # ForensicBot analysis fields
    chain_id: Optional[str] = None       # Which chain this belongs to
    chain_position: Optional[int] = None # Position in chain (1, 2, 3...)
    forensic_tag: Optional[str] = None   # TRANSFER, EXPENSE, INCOME, etc.
    confidence: float = 0.0              # 0.0 to 1.0
    review_required: bool = False
    notes: str = ''

    # Computed fields
    source_account: Optional[str] = None # Where money came FROM
    dest_account: Optional[str] = None   # Where money went TO

@dataclass
class Chain:
    """A sequence of linked transactions representing one money flow."""
    chain_id: str
    chain_type: str          # 'ebay_payout', 'self_transfer', 'cc_payment', etc.
    transactions: list       # List of Transaction objects
    confidence: float
    tax_impact: dict         # {'income': X, 'expense': Y, 'transfer': Z}
    status: str              # 'resolved', 'review_needed', 'orphan'
    notes: str = ''

@dataclass
class ForensicResult:
    """Complete output of ForensicBot analysis."""
    chains: list                 # All detected chains
    transfers_eliminated: list   # Self-transfers tagged
    fees_extracted: list         # Processor fees identified
    refund_pairs: list           # Debit-credit refund matches
    cash_bridges: list           # ATM withdrawal -> ledger purchase links
    duplicates_found: list       # Remaining duplicates
    gambling_transactions: list  # Isolated gambling activity
    theft_flags: list            # Possible compromised transactions
    orphans: list                # Unresolved transactions
    review_queue: list           # Needs manual review

    # Summary
    true_gross_income: float = 0.0
    true_deductible_expenses: float = 0.0
    transfers_total: float = 0.0
    fees_total: float = 0.0
    gambling_net: float = 0.0
    theft_loss_total: float = 0.0
```

## 9.3 Processing Pipeline

```python
class ForensicBot:
    """
    Main ForensicBot engine.
    Processes FPCS 2022 transactions to produce clean tax numbers.
    """

    def __init__(self, master_csv: str, ledger_csv: str, matched_csv: str):
        self.master_path = master_csv
        self.ledger_path = ledger_csv
        self.matched_path = matched_csv

        self.graph = ForensicGraph()
        self.scorer = ChainScorer()
        self.matcher = AmountMatcher()
        self.result = ForensicResult(
            chains=[], transfers_eliminated=[], fees_extracted=[],
            refund_pairs=[], cash_bridges=[], duplicates_found=[],
            gambling_transactions=[], theft_flags=[], orphans=[],
            review_queue=[]
        )

    def run_full_trace(self) -> ForensicResult:
        """
        Mode 1: Full Trace -- complete forensic analysis.
        """
        # Step 1: Load and normalize data
        print("Step 1: Loading data...")
        transactions = self._load_transactions()
        ledger = self._load_ledger()
        matched = self._load_matched()

        # Step 2: Build graph
        print("Step 2: Building transaction graph...")
        self._build_graph(transactions)

        # Step 3: Detect transfer pairs (highest priority -- eliminates most noise)
        print("Step 3: Detecting transfer pairs...")
        self._detect_transfers(transactions)

        # Step 4: Detect chains
        print("Step 4: Detecting fund chains...")
        self._detect_chains(transactions)

        # Step 5: Extract fees
        print("Step 5: Extracting processor fees...")
        self._extract_fees(transactions)

        # Step 6: Match refunds
        print("Step 6: Matching refund pairs...")
        self._match_refunds(transactions)

        # Step 7: Build cash bridges
        print("Step 7: Building cash bridges...")
        self._build_cash_bridges(transactions, ledger)

        # Step 8: Isolate gambling
        print("Step 8: Isolating gambling transactions...")
        self._isolate_gambling(transactions)

        # Step 9: Flag theft/compromise
        print("Step 9: Flagging compromised account activity...")
        self._flag_theft(transactions)

        # Step 10: Run anomaly detection
        print("Step 10: Running anomaly detection...")
        self._detect_anomalies(transactions)

        # Step 11: Calculate tax impact
        print("Step 11: Calculating tax impact summary...")
        self._calculate_tax_impact()

        # Step 12: Generate bank deposit analysis
        print("Step 12: Generating bank deposit analysis...")
        self._generate_bank_deposit_analysis(transactions)

        return self.result

    def spot_check(self, txn_id: str) -> Chain:
        """
        Mode 2: Spot Check -- trace a single transaction.
        """
        transactions = self._load_transactions()
        target = next(t for t in transactions if t.txn_id == txn_id)

        # Find all related transactions
        chain = self.graph.find_chains(
            target.amount,
            tolerance_pct=0.02,
            date_window_days=5
        )

        # Score and return
        if chain:
            score = self.scorer.score_chain(chain[0])
            return Chain(
                chain_id=f'SC-{txn_id}',
                chain_type=score.get('pattern', 'unknown'),
                transactions=chain[0],
                confidence=score['overall_confidence'],
                tax_impact=self._calculate_chain_tax_impact(chain[0]),
                status='resolved' if score['tier'] in ('auto_resolve', 'high') else 'review_needed'
            )

        return Chain(
            chain_id=f'SC-{txn_id}',
            chain_type='orphan',
            transactions=[target],
            confidence=0.0,
            tax_impact={'income': 0, 'expense': 0, 'transfer': 0},
            status='orphan'
        )

    def anomaly_hunt(self) -> list:
        """
        Mode 3: Anomaly Hunt -- find suspicious patterns.
        """
        transactions = self._load_transactions()
        anomalies = []

        # Check 1: Large round numbers
        for txn in transactions:
            if txn.amount >= 100 and txn.amount % 100 == 0:
                anomalies.append({
                    'type': 'round_number',
                    'txn': txn,
                    'reason': f'Round ${txn.amount:.0f} -- likely transfer, not purchase'
                })

        # Check 2: Same-day debit+credit pairs
        by_date = {}
        for txn in transactions:
            by_date.setdefault(txn.date, []).append(txn)

        for dt, day_txns in by_date.items():
            debits = [t for t in day_txns if t.direction == 'debit']
            credits = [t for t in day_txns if t.direction == 'credit']
            for d in debits:
                for c in credits:
                    match = self.matcher.match(d.amount, c.amount)
                    if match['confidence'] > 0.8:
                        anomalies.append({
                            'type': 'same_day_pair',
                            'debit': d,
                            'credit': c,
                            'confidence': match['confidence'],
                            'reason': 'Same-day debit+credit with matching amount'
                        })

        # Check 3: Amounts appearing 3+ times
        amount_counts = {}
        for txn in transactions:
            key = round(txn.amount, 2)
            amount_counts.setdefault(key, []).append(txn)

        for amount, txns in amount_counts.items():
            if len(txns) >= 3:
                anomalies.append({
                    'type': 'repeated_amount',
                    'amount': amount,
                    'count': len(txns),
                    'transactions': txns,
                    'reason': f'${amount:.2f} appears {len(txns)} times -- possible overcounting'
                })

        # Check 4: Benford's Law analysis
        amounts = [t.amount for t in transactions if t.amount > 0]
        # (Run benford_py analysis here)

        return anomalies
```

## 9.4 Key Algorithm: Transfer Detection Decision Tree

```python
def classify_transaction(txn: Transaction, all_txns: list) -> str:
    """
    Master classification decision tree.
    Returns one of: INCOME, EXPENSE, TRANSFER, GAMBLING, THEFT, REVIEW
    """

    # LEVEL 1: Gambling check
    gambling_payees = ['CASINO', 'SPIRIT MOUNTAIN', 'CHINOOK WINDS',
                       'ILANI', 'GAMBLING', 'POKER', 'SLOT',
                       'DRAFTKINGS', 'FANDUEL', 'BOVADA']
    if any(g in txn.payee.upper() for g in gambling_payees):
        return 'GAMBLING'

    # LEVEL 2: Known transfer patterns
    payee_upper = txn.payee.upper()

    # CC payments
    if any(cc in payee_upper for cc in ['VISA PAYMENT', 'AMEX PAYMENT',
                                         'DISCOVER PAYMENT', 'CARD PAYMENT',
                                         'CITI PAYMENT', 'PAYMENT THANK YOU']):
        return 'TRANSFER'

    # Inter-account transfers
    if any(xfer in payee_upper for xfer in ['TRANSFER TO', 'TRANSFER FROM',
                                             'ONLINE TRANSFER', 'WIRE TRANSFER',
                                             'ACH TRANSFER', 'DIRECT TRANSFER']):
        return 'TRANSFER'

    # Payment processor cashouts
    if any(proc in payee_upper for proc in ['PAYPAL TRANSFER', 'PAYPAL INST',
                                             'VENMO CASHOUT', 'CASHAPP',
                                             'CASH APP CASH OUT']):
        return 'TRANSFER'

    # LEVEL 3: Amount matching (find a counterpart)
    for other in all_txns:
        if other.txn_id == txn.txn_id:
            continue
        if other.direction == txn.direction:
            continue  # Same direction = not a transfer pair

        match = AmountMatcher().match(txn.amount, other.amount)
        if match['confidence'] > 0.90:
            date_diff = abs((txn.date - other.date).days)
            if date_diff <= 5:
                # Check if accounts make sense as transfer pair
                src_acct = identify_account(txn.payee)
                dst_acct = identify_account(other.payee)
                if src_acct[0] and dst_acct[0]:
                    return 'TRANSFER'

    # LEVEL 4: Theft check
    theft_flags = flag_compromised_transactions([txn])
    if theft_flags:
        return 'THEFT'

    # LEVEL 5: Income vs Expense
    if txn.direction == 'credit':
        # Money coming IN
        if txn.financial_account in ['Chase Checking', 'Wells Fargo']:
            # Deposit to bank -- could be income or transfer
            src = identify_account(txn.payee)
            if src[0] in ['paypal', 'venmo', 'cashapp', 'square']:
                return 'TRANSFER'  # Processor cashout
            if src[0] == 'ebay':
                return 'INCOME'    # eBay payout
            return 'REVIEW'        # Unknown deposit source
        return 'REVIEW'

    else:
        # Money going OUT
        if txn.tax_category and txn.tax_category != 'Personal':
            return 'EXPENSE'
        if txn.deductible:
            return 'EXPENSE'
        return 'REVIEW'
```

## 9.5 Output Formats

### 9.5.1 Tax Impact Summary (Mode 4 Output)

```
FORENSICBOT TAX IMPACT SUMMARY -- FPCS 2022
=============================================
Generated: [date]
Data Source: FPCS_2022_FINAL_MASTER.csv (1,185 rows)
                + Ledger_2022.csv (745 rows, 183 matched)

GROSS INCOME ANALYSIS
---------------------
eBay Sales (1099-K reconciled):          $13,052.00
Service Income (invoiced):                $2,277.00
Other Income:                             $X,XXX.XX
                                         ----------
Total Gross Income:                      $XX,XXX.XX
  (Transfers eliminated:                 XX transactions, $XX,XXX.XX)
  (Double-counts eliminated:             XX transactions, $XX,XXX.XX)

EXPENSE ANALYSIS
----------------
QBO-Sourced Deductions:                  $32,268.53
Ledger Cash Deductions (matched):        $X,XXX.XX
Ledger Cash Deductions (unmatched):      $X,XXX.XX  [Cohan rule eligible]
Processor Fees (reconstructed):          $X,XXX.XX
CC Interest (business portion):          $X,XXX.XX
                                         ----------
Total Deductible Expenses:               $XX,XXX.XX

COST OF GOODS SOLD
------------------
Beginning Inventory:                     $X,XXX.XX
Purchases (State Surplus + other):       $X,XXX.XX
Ending Inventory:                        $X,XXX.XX
                                         ----------
COGS:                                    $XX,XXX.XX

SPECIAL ITEMS
-------------
Gambling Net Result:                     $X,XXX.XX  [Schedule 1 / Schedule A]
Theft Loss (if qualifying):              $X,XXX.XX  [Form 4684 / Schedule C]

SCHEDULE C BOTTOM LINE
----------------------
Gross Income:                            $XX,XXX.XX
Less COGS:                              ($XX,XXX.XX)
Gross Profit:                            $XX,XXX.XX
Less Expenses:                          ($XX,XXX.XX)
Net Profit (Loss):                       $XX,XXX.XX

CHAIN ANALYSIS STATISTICS
-------------------------
Total chains detected:                   XXX
Auto-resolved (>95% confidence):         XXX
High confidence (85-95%):                XXX
Medium confidence (70-85%):              XXX  [review recommended]
Low confidence (<70%):                   XXX  [manual review required]
Orphan transactions:                     XXX  [no chain found]
```

## 9.6 Critical Implementation Notes

### 9.6.1 Order of Operations Matters

The pipeline must run in this specific order:

1. **Transfer detection FIRST** -- eliminates the most noise (removes phantom income/expense)
2. **Chain detection SECOND** -- links multi-hop transfers
3. **Fee extraction THIRD** -- requires chains to be identified
4. **Refund matching FOURTH** -- clean data needed for accurate pairing
5. **Cash bridges FIFTH** -- depends on knowing which ATM withdrawals are transfers vs spending
6. **Gambling/theft SIXTH** -- separate from business pipeline
7. **Tax impact LAST** -- depends on all previous steps being complete

### 9.6.2 Human-in-the-Loop Requirements

ForensicBot should NEVER automatically resolve transactions below 70% confidence. These go to the review queue for James's eyes. The review queue should present:

- The transaction(s) in question
- ForensicBot's best guess and confidence score
- Alternative interpretations
- The tax impact of each interpretation
- A clear accept/reject/reclassify interface

### 9.6.3 Audit Trail

Every ForensicBot decision must be logged:

```python
@dataclass
class AuditEntry:
    timestamp: str
    txn_id: str
    action: str              # 'tagged_as_transfer', 'linked_to_chain', etc.
    old_value: Optional[str]
    new_value: str
    confidence: float
    reasoning: str           # Why this decision was made
    auto_or_manual: str      # 'auto' or 'manual_override'
```

This audit trail IS the documentation for the IRS. If audited, ForensicBot's reasoning log explains every classification decision.

### 9.6.4 The $300 Test Case (Acceptance Criteria)

ForensicBot is NOT ready for production until it can correctly handle the CC-to-Cash Bridge test case from the spec:

```
INPUT: CC charge $300 + PayPal outflow $300 + Venmo inflow $300 + ATM $300 + Cash purchase $285

EXPECTED OUTPUT:
  - 4 transactions tagged TRANSFER (tax impact: $0)
  - 1 transaction tagged EXPENSE ($285, FPCS Inventory, COGS)
  - $15 flagged as unaccounted remainder
  - Chain confidence > 80%

MUST NOT produce:
  - $300 as income (the Venmo inflow)
  - $300 as expense (the CC charge or PayPal outflow)
  - Any double-counting
```

---

# APPENDIX A: QUICK REFERENCE TABLES

## A.1 Payment Processor Settlement Windows

| From | To | Min Days | Max Days | Typical |
|---|---|---|---|---|
| eBay | Bank | 2 | 7 | 3 |
| PayPal (standard) | Bank | 1 | 5 | 2 |
| PayPal (instant) | Bank | 0 | 0 | 0 |
| Venmo (standard) | Bank | 1 | 5 | 2 |
| Venmo (instant) | Bank | 0 | 0 | 0 |
| CashApp (standard) | Bank | 1 | 3 | 2 |
| Square | Bank | 1 | 2 | 1 |
| Bank-to-Bank (ACH) | Bank | 0 | 3 | 1 |
| CC Payment | CC | 0 | 3 | 1 |
| ATM | Cash | 0 | 0 | 0 |

## A.2 Processor Fee Rates (2022)

| Processor | Type | Rate | Fixed Fee |
|---|---|---|---|
| eBay | Final value (electronics) | 12.55% | $0.30/order |
| PayPal | Goods & services | 3.49% | $0.49 |
| PayPal | Friends & family (CC) | 2.99% | -- |
| Venmo | Send with CC | 3.00% | -- |
| Venmo | Business payments | 1.90% | $0.10 |
| Square | In-person | 2.60% | $0.10 |
| Square | Online | 2.90% | $0.30 |
| CashApp | Business payments | 2.75% | -- |
| PayPal | Instant transfer | 1.75% | $0.25 min |
| Venmo | Instant transfer | 1.75% | $0.25 min |

## A.3 W-2G Reporting Thresholds

| Gambling Type | Threshold | Withholding |
|---|---|---|
| Slots / Bingo | $1,200+ | 24% if > $5,000 |
| Keno | $1,500+ (minus wager) | 24% if > $5,000 |
| Poker tournaments | $5,000+ (minus buy-in) | 24% |
| Other gambling | $600+ if 300x wager | 24% if > $5,000 |
| Sweepstakes | $5,000+ | 24% |

## A.4 Schedule C Line Mapping

| Tax Category | Schedule C Line | Description |
|---|---|---|
| Advertising | Line 8 | Marketing, web hosting |
| Car/Vehicle | Line 9 | Business mileage or actual expenses |
| Commissions/Fees | Line 10 | eBay fees, PayPal fees, Square fees |
| Insurance | Line 15 | Business insurance |
| Interest (business CC) | Line 16b | CC interest on business balances |
| Office Expense | Line 18 | Supplies, postage |
| Rent/Lease | Line 20a/b | Equipment rental |
| Repairs | Line 21 | Computer repair, maintenance |
| Supplies | Line 22 | Business supplies |
| Utilities | Line 25 | Phone, internet (business %) |
| Other Expenses | Line 27a | Everything else |
| COGS | Part III | Inventory purchases |

---

# APPENDIX B: SOURCES AND REFERENCES

## IRS Official Sources
- [IRM 4.10.4 - Examination of Income](https://www.irs.gov/irm/part4/irm_04-010-004)
- [IRM 9.5.9 - Methods of Proof](https://www.irs.gov/irm/part9/irm_09-005-009)
- [IRC 6001 - Record Requirements](https://www.law.cornell.edu/uscode/text/26/6001)
- [Treas. Reg. 1.6001-1](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFR4423716657898cd/section-1.6001-1)
- [Topic 419 - Gambling Income](https://www.irs.gov/taxtopics/tc419)
- [W-2G Instructions](https://www.irs.gov/instructions/iw2g)
- [Schedule C](https://www.irs.gov/pub/irs-pdf/f1040sc.pdf)
- [IRS Revenue Ruling 2009-9 (Theft Losses)](https://www.irs.gov/pub/irs-drop/rr-09-09.pdf)

## Forensic Accounting References
- [HKA - Forensic Tracing Methods](https://www.hka.com/article/following-the-money-forensic-accounting-tracing-methods-amp-best-practices/)
- [BPB CPA - Commingled Funds](https://www.bpbcpa.com/tracing-commingled-funds-by-joel-glick-cpa-cff-cfe-cgma/)
- [Schneider Downs - Tracing Commingled Assets](https://schneiderdowns.com/our-thoughts-on/tracing-commingled-assets-separating-beans/)
- [Aprio - Funds Tracing](https://www.aprio.com/the-role-of-funds-tracing-in-forensic-accounting-ins-article-adv/)
- [Citrin Cooperman - Cash Tracing](https://www.citrincooperman.com/In-Focus-Resource-Center/Unravel-Financial-Mysteries-An-Introduction-to-Cash-Tracing)

## Tax Law References
- [CPA Journal - Theft Loss Under TCJA](https://www.cpajournal.com/2025/03/25/theft-loss-deductions-under-the-tax-cuts-and-jobs-act-of-2017/)
- [Taxpayer Advocate - Theft Loss Scam Victims](https://www.taxpayeradvocate.irs.gov/news/nta-blog/irs-chief-counsel-advice-on-theft-loss-deductions-for-scam-victims/2025/04/)
- [Kostelanetz - Theft Loss Under TCJA](https://kostelanetz.com/theft-loss-deductions-under-the-tcja/)
- [The Tax Adviser - Substantiation](https://www.thetaxadviser.com/issues/2023/nov/substantiation-of-business-expenses-a-review-of-the-basics/)
- [JMCO - Gambling Loss Limits](https://www.jmco.com/articles/tax/gambling-loss-deduction-new-tax-law/)
- [FitSmallBusiness - CC Deduction Timing](https://fitsmallbusiness.com/tax-deduction-business-credit-card-payments/)
- [Dinesen Tax - CC Deductibility](https://www.dinesentax.com/when-are-purchases-made-with-a-credit-card-deductible/)
- [ORS 165.800 - Oregon Identity Theft](https://oregon.public.law/statutes/ors_165.800)

## Technology References
- [NetworkX Documentation](https://networkx.org/documentation/stable/reference/algorithms/index.html)
- [RapidFuzz](https://github.com/rapidfuzz/RapidFuzz)
- [Splink - Probabilistic Record Linkage](https://moj-analytical-services.github.io/splink/index.html)
- [benford_py](https://github.com/milcent/benford_py)
- [reconPy](https://pypi.org/project/reconPy/)
- [Midday - Automatic Reconciliation Engine](https://midday.ai/updates/automatic-reconciliation-engine/)

## Payment Processor Documentation
- [eBay Managed Payments](https://www.ebay.com/help/selling/getting-paid/payouts-work-managed-payments-sellers?id=4814)
- [eBay Fee Credits](https://www.ebay.com/help/selling/fees-credits-invoices/fee-credits?id=4128)
- [Venmo Fees](https://venmo.com/resources/our-fees/)
- [Venmo Transfer Timeline](https://help.venmo.com/cs/articles/bank-transfer-timeline-vhel286)
- [Square Fees](https://squareup.com/us/en/payments/our-fees)
- [Venmo Cash Advance Fees](https://help.venmo.com/cs/articles/cash-advance-fees-vhel286)

## AML / Fraud Detection
- [Neo4j - Entity Resolution](https://neo4j.com/blog/graph-database/what-is-entity-resolution/)
- [Hawk AI - Entity Resolution FinCrime](https://hawk.ai/news-press/entity-resolution-key-success-ai-anti-financial-crime)
- [AIPrise - Smurfing vs Structuring](https://www.aiprise.com/blog/smurfing-vs-structuring)
- [PayPal AML Policy](https://publicpolicy.paypal-corp.com/issues/anti-money-laundering-know-your-customer)

---

*End of ForensicBot Research Report*
*Realbotville Library Vol. 3*
*Total sections: 9 + 2 appendices*
*Compiled: 2026-02-20 by Opus 4.6 Research Agent*
