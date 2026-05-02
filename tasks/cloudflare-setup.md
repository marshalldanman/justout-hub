# Cloudflare Setup — justout.today
# Last updated: 2026-05-02

## Domain Status
- **Domain:** justout.today
- **Registrar:** GoDaddy (justout.today), Porkbun (other domains)
- **DNS:** Cloudflare (active)
- **Nameservers:** trace.ns.cloudflare.com, ulla.ns.cloudflare.com
- **Hosting:** GitHub Pages (hub.justout.today)

## DNS Records (required in Cloudflare)
| Type  | Name           | Content                        | Proxy |
|-------|----------------|--------------------------------|-------|
| CNAME | hub            | marshalldanman.github.io       | Yes   |
| CNAME | @              | marshalldanman.github.io       | Yes   |
| CNAME | dashboard      | (external dashboard host)      | Yes   |
| CNAME | helpdesk       | (external helpdesk host)       | Yes   |

## WAF Rules Active
1. **Block China + High-Risk Countries** (Rule 1)
   - Countries: AQ, BO, KH, CM, CF, CN, CO, CG, CD, DO, SV, HT, IN, ID,
     IR, KP, LI, MX, NE, NG, RU, SG, ZA, SZ, TH, TR, VE, VN, XX
   - Action: Block
   - Matches: 0 (newly created)

## Recommended Settings (do these in Cloudflare dashboard)
1. **SSL/TLS** → Full (strict) — encrypts origin-to-edge
2. **Always Use HTTPS** → On (SSL/TLS > Edge Certificates)
3. **Auto Minify** → JS + CSS + HTML (Speed > Optimization)
4. **Brotli** → On (Speed > Optimization)
5. **Browser Cache TTL** → 4 hours (Caching > Configuration)
6. **Security Level** → Medium (Security > Settings)
7. **Bot Fight Mode** → On (Security > Bots) — free tier
8. **Email Address Obfuscation** → On (Scrape Shield)
9. **Hotlink Protection** → On (Scrape Shield)
10. **DNSSEC** → Enable AFTER nameservers propagate (DNS > Settings)

## Page Rules (3 free on free plan)
1. `*justout.today/*.mp4` → Cache Level: Bypass (don't cache large media)
2. `hub.justout.today/api/*` → Cache Level: Bypass (if API endpoints added)
3. `*.justout.today/*` → Always Use HTTPS
