# Cloudflare Setup — justout.today
# Last updated: 2026-05-02

## Domain Status
- **Domain:** justout.today
- **Registrar:** GoDaddy (justout.today), Porkbun (friendlypcsupport.com)
- **DNS:** Cloudflare (active for justout.today)
- **Nameservers:** trace.ns.cloudflare.com, ulla.ns.cloudflare.com
- **Hosting:** GitHub Pages (hub.justout.today) — monorepo serves all channels

## Architecture (post-monorepo merge 2026-05-02)
All content now served from a single repo: `marshalldanman/justout-hub`
Old repos `fpcs-dashboard`, `fpcs-helpdesk`, `fpcs-bots` merged with full history.

| Old URL | New URL | Status |
|---------|---------|--------|
| dashboard.justout.today | hub.justout.today/dashboard/ | Needs redirect |
| helpdesk.justout.today | hub.justout.today/helpdesk/ | Needs redirect |
| dashboard.justout.today/bots.html | hub.justout.today/dashboard/bots.html | Needs redirect |
| dashboard.justout.today/sentrylion.html | hub.justout.today/dashboard/sentrylion.html | Needs redirect |
| dashboard.justout.today/token-master.html | hub.justout.today/dashboard/token-master.html | Needs redirect |

## DNS Records (required in Cloudflare)
| Type  | Name           | Content                        | Proxy |
|-------|----------------|--------------------------------|-------|
| CNAME | hub            | marshalldanman.github.io       | Yes   |
| CNAME | @              | marshalldanman.github.io       | Yes   |

### Records to REMOVE (no longer needed — these served old separate repos)
| Type  | Name           | Reason |
|-------|----------------|--------|
| CNAME | dashboard      | Content merged into hub.justout.today/dashboard/ |
| CNAME | helpdesk       | Content merged into hub.justout.today/helpdesk/ |

### Redirect Rules (Cloudflare Rules > Redirect Rules)
Set these up to preserve old bookmark/link URLs:

1. `dashboard.justout.today/*` → `https://hub.justout.today/dashboard/$1` (301 permanent)
2. `helpdesk.justout.today/*` → `https://hub.justout.today/helpdesk/$1` (301 permanent)

## Firebase Auth — Authorized Domains
The dashboard auth system (dashboard/js/auth.js) uses Firebase Google OAuth.
After the monorepo merge, ensure these domains are authorized in Firebase console:
- Firebase Console → Authentication → Settings → Authorized domains
- Add: `hub.justout.today` (if not already present)
- Keep: `fpcs-dashboard-63b25.firebaseapp.com`
- Optional keep: `dashboard.justout.today` (during transition)

## justout.today Apex — BROKEN (as of 2026-05-02)
- Returns 503 with TLS error
- Resolving to AWS Global Accelerator IPs (GoDaddy forwarding)
- Fix: either point GoDaddy nameservers to Cloudflare, or remove GoDaddy forwarding
  and add A records for GitHub Pages: 185.199.108.153, 185.199.109.153,
  185.199.110.153, 185.199.111.153

## friendlypcsupport.com (Porkbun)
- Currently serving GoDaddy Website Builder site
- Plan: build upgraded FPCS business site, host on separate GitHub Pages repo
- eBay seller ID: friendlysales22

## WAF Rules Active
1. **Block China + High-Risk Countries** (Rule 1)
   - Countries: AQ, BO, KH, CM, CF, CN, CO, CG, CD, DO, SV, HT, IN, ID,
     IR, KP, LI, MX, NE, NG, RU, SG, ZA, SZ, TH, TR, VE, VN, XX
   - Action: Block

## Recommended Settings (Cloudflare dashboard)
1. **SSL/TLS** → Full (strict)
2. **Always Use HTTPS** → On
3. **Auto Minify** → JS + CSS + HTML
4. **Brotli** → On
5. **Browser Cache TTL** → 4 hours
6. **Security Level** → Medium
7. **Bot Fight Mode** → On
8. **Email Address Obfuscation** → On
9. **Hotlink Protection** → On
10. **DNSSEC** → Enable AFTER nameservers propagate

## Page Rules (3 free on free plan)
1. `*justout.today/*.mp4` → Cache Level: Bypass
2. `hub.justout.today/api/*` → Cache Level: Bypass
3. `*.justout.today/*` → Always Use HTTPS
