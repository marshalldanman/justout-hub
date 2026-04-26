# Cloudflare Pages + Access — click-perfect setup

**Read top to bottom. Don't skip. Each step is 30s–2min. Total time: ~25 minutes.**

You will not have to think. Every value, dropdown choice, and button label is here.

---

## Before you start — quick checklist

You'll need open in browser tabs:

- [ ] **Cloudflare**: https://dash.cloudflare.com/sign-up (sign up if you don't have an account — use your main email)
- [ ] **GoDaddy**: already logged in (you said you are)
- [ ] **GitHub**: logged in to `marshalldanman`

You'll need 3 email addresses ready to paste (the people allowed to view the hub). You already know them — they're the same accounts you whitelisted in Firebase. **Have them in a notepad.**

---

## PHASE 1 — Move `justout.today` DNS to Cloudflare

This sounds scary; it's not. Cloudflare imports your existing DNS so nothing breaks during the move.

### Step 1 — Add the domain to Cloudflare
1. Go to https://dash.cloudflare.com/ (sign in).
2. On the home dashboard click the big **+ Add a domain** button (or **Add site**).
3. Type: `justout.today`
4. Click **Continue**.
5. On the plan page choose **Free** (it's the bottom option). Click **Continue**.
6. Cloudflare scans GoDaddy and shows a list of existing DNS records. **Don't change anything.** Just click **Continue**. Cloudflare imports them all.

### Step 2 — Get your two new nameservers
1. Cloudflare shows you 2 nameserver hostnames. They look like:
   - `aaron.ns.cloudflare.com`
   - `cassie.ns.cloudflare.com`
2. **Leave this tab open.** You're about to paste these into GoDaddy.

### Step 3 — Switch nameservers at GoDaddy
1. Go to GoDaddy → **My Products** → find `justout.today` → click **DNS** (or **Manage DNS**).
2. Scroll down to **Nameservers** section. Click **Change**.
3. Choose **I'll use my own nameservers**.
4. Delete whatever's there. Paste in the two from Cloudflare. Click **Save**.
5. GoDaddy shows a confirmation modal — click **Continue** / **Yes**.

### Step 4 — Tell Cloudflare you've done it
1. Back in the Cloudflare tab from Step 2, scroll down and click **Done, check nameservers**.
2. Cloudflare will show **"Pending Nameserver Update"**. This typically resolves in 5–30 minutes (sometimes faster). Cloudflare will email you when it's active.
3. **You can proceed to Phase 2 right now** — no need to wait for nameservers.

---

## PHASE 2 — Connect Cloudflare Pages to the GitHub repo

### Step 5 — Create the Pages project
1. In Cloudflare dashboard left sidebar, click **Workers & Pages**.
2. Click **Create** (top right) → **Pages** tab → **Connect to Git**.
3. Click **Connect GitHub**. Authorize the GitHub OAuth popup. Grant access to `marshalldanman/justout-hub` (or "all repositories" — your call).
4. Back in Cloudflare, the repo `marshalldanman/justout-hub` should now appear. Click it. Click **Begin setup**.

### Step 6 — Build settings (paste these exactly)
Fill the form like this — values matter:

| Field | Value |
|-------|-------|
| **Project name** | `justout-hub` |
| **Production branch** | `master` |
| **Framework preset** | `None` (leave at default) |
| **Build command** | *(leave empty)* |
| **Build output directory** | *(leave empty — defaults to `/`)* |
| **Root directory** | *(leave empty)* |

Click **Save and Deploy**.

### Step 7 — Wait for the first deploy
1. Cloudflare shows a log streaming. Wait ~1 minute. You should see **"Success: Your site was deployed"**.
2. Cloudflare gives you a URL like `https://justout-hub.pages.dev`. **Open it in a new tab.** You should see the hub. *(If not, tell Claude — something needs adjusting.)*

---

## PHASE 3 — Point `hub.justout.today` to Cloudflare Pages

### Step 8 — Add custom domain
1. Still in the `justout-hub` Pages project, click the **Custom domains** tab.
2. Click **Set up a custom domain**.
3. Enter: `hub.justout.today`
4. Click **Continue** → **Activate domain**.
5. Cloudflare may say "this domain is already configured" — that's the leftover GitHub Pages CNAME. Cloudflare will offer to update it. Choose **Update DNS**.

(Background — what happened: Cloudflare replaced the CNAME from GitHub Pages to point at Cloudflare Pages. You don't have to touch DNS records manually.)

### Step 9 — Verify the site is live on Cloudflare
1. **Wait ~2 minutes** for DNS to propagate.
2. Open https://hub.justout.today in a fresh incognito tab.
3. You should see the hub (Firebase auth screen). If you see "site not found" or a blank page, wait another 2 min and refresh.

**If it works:** ✅ Cloudflare Pages is now serving the hub. Go to Phase 4.

**If it doesn't work after 10 min:** the nameserver update from Phase 1 hasn't completed yet. Check Cloudflare's home page for the domain status. Wait until it says **Active**.

---

## PHASE 4 — Add Cloudflare Access (the actual security)

This is the step that turns the UI gate into real protection. Direct file URLs will require login.

### Step 10 — Open Zero Trust
1. Cloudflare dashboard → left sidebar → **Zero Trust** (a new product page opens; first time, it asks you to "set up your team").
2. **Team name:** type `justout` (lowercase). Click **Next**.
3. Plan: choose **Free**. (Up to 50 users — more than enough.) Click **Proceed to payment** is annoying — Free still asks for a card to verify, but isn't charged. If you don't want to enter a card, you can use the **One-time PIN** identity provider with no card on file. Easier path: just enter the card; you can remove it later. **You will not be billed.**
4. Click **Subscribe** to land in the Zero Trust dashboard.

### Step 11 — Add Google as the identity provider (so Access uses Google login)
1. Zero Trust dashboard → **Settings** (bottom of left sidebar) → **Authentication**.
2. Under **Login methods**, click **+ Add new**.
3. Choose **Google**.
4. Cloudflare gives you a redirect URI. **Copy it.**
5. In a NEW tab: https://console.cloud.google.com/ → create OAuth credentials (this is annoying; if you want to skip, use the easier "One-time PIN" method below).

**EASIER PATH (skip Google OAuth setup):**
1. Back in **Settings → Authentication**, you'll see **One-time PIN** is already enabled by default. **Use it.**
2. With OTP, your authorized users get a 6-digit code via email each login. No OAuth setup needed. Slightly more friction per login but zero setup.

**If you want Google login (one-time setup, then seamless):** tell Claude and I'll write a separate sub-walkthrough.

### Step 12 — Create the Access application
1. Zero Trust dashboard → left sidebar → **Access** → **Applications**.
2. Click **Add an application** → choose **Self-hosted**.
3. Fill in:

| Field | Value |
|-------|-------|
| **Application name** | `JustOut Hub` |
| **Session duration** | `1 month` (or whatever you prefer) |
| **Application domain** | Subdomain: `hub` Domain: `justout.today` Path: *(leave empty)* |

4. Click **Next**.

### Step 13 — Create the access policy
1. **Policy name:** `Allowed users`
2. **Action:** `Allow`
3. **Session duration:** `Same as application session timeout`
4. Under **Configure rules** → **Include**:
   - Selector: **Emails**
   - Value: paste the 3 email addresses (one per line, or use the chip input — Cloudflare accepts comma-separated)
5. Click **Next**.

### Step 14 — Application appearance / settings (skip)
1. Click **Next** through the appearance screen (defaults are fine).
2. Click **Add application**.

### Step 15 — Test Access
1. Open a fresh incognito window. Go to https://hub.justout.today.
2. You should now see a Cloudflare Access login screen (NOT the Firebase one — that's behind it).
3. Enter your email. Get a 6-digit code from email. Enter it.
4. You should land on the hub (which still has Firebase auth in front of the channels — that's fine, defense in depth).

**Try the file URL test:** in the same incognito window, before logging out, try `https://hub.justout.today/living-journal/fragments/frag-2026-04-25-001.json` — should show the JSON. Now log out (close incognito, reopen). Same URL. Should now show the Cloudflare Access login screen, not the JSON. **That's the proof.**

---

## PHASE 5 — Tell Claude to flip the repo private

Once Phase 4 works:

1. Come back to this Claude session and say: **"Cloudflare is up. Flip the repo private."**
2. I'll do it via the GitHub API — one call, no clicks for you.
3. Verify the repo is now private at https://github.com/marshalldanman/justout-hub (should show a 🔒 lock icon next to the name and "Private" badge).

---

## PHASE 6 — Verify everything still works

After repo is private:

- [ ] https://hub.justout.today loads (after Cloudflare Access login).
- [ ] https://hub.justout.today/living-journal/ loads (after both gates).
- [ ] Direct file URL like `.../fragments/frag-2026-04-25-001.json` requires login.
- [ ] **GitHub Pages will go down** at the legacy URL `https://marshalldanman.github.io/justout-hub/` — that's expected. Cloudflare Pages is the new host.
- [ ] Other subdomains (`dashboard.justout.today`, `helpdesk.justout.today`) still work — they were imported in Step 1 and unchanged.

---

## Phase 7 — Nice to have (later)

These are not part of the privacy work but you'll want them eventually:

- **`journal.justout.today`** as a vanity URL → in Cloudflare DNS, add a CNAME `journal` → `hub.justout.today`. Then in Pages, add it as a custom domain too. Or use Cloudflare Page Rules for a 301.
- **Other channels** (Tax HQ, Bot HQ, etc.) — those are at `dashboard.justout.today` which is a different repo / Pages site. If they live on GitHub Pages from a public repo too, repeat this whole flow for that repo. Tell Claude when you're ready.

---

## If anything goes wrong

Come back to this Claude session and paste:
- Which step failed
- The exact error message or screenshot description

I'll diagnose. Most issues are: (a) DNS hasn't propagated yet — wait 10 min, (b) Wrong dropdown picked in Pages settings — easy to fix, (c) Forgot to add an email in the Access policy — add it.

---

*You're good. Go.*
