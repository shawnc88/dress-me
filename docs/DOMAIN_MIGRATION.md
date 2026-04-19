# Domain Migration to bewithme.live

Rebrand from `dressmeapp.me` / `bewithmeapp.me` → `bewithme.live`.
All code changes committed as `e5dcd12` on 2026-04-19. Server auto-deployed on Render, client deployed on Vercel. Domain registered with Hostinger.

**Remaining work is DNS + Resend signup + one Render env var. All manual steps below. Total time: ~20-40 minutes of hands-on + 15-60 min DNS propagation wait.**

---

## Step 1 — Add DNS records at Hostinger

Log into [hpanel.hostinger.com](https://hpanel.hostinger.com) → **Domains** → click `bewithme.live` → **DNS / Nameservers** → **DNS Zone**.

The domain is on Hostinger's default parking nameservers (`artemis.dns-parking.com`, `hermes.dns-parking.com`). **Do NOT change nameservers** — we want Hostinger to manage DNS so we can add Resend records alongside Vercel records.

### 1A. Vercel records (site hosting)

| Type  | Name | Value               | TTL  |
|-------|------|---------------------|------|
| A     | @    | 76.76.21.21         | 3600 |
| CNAME | www  | cname.vercel-dns.com | 3600 |

In Hostinger's DNS Zone editor:
- Delete any existing `A` record for `@` that points to the parking IP
- Delete any existing `CNAME` record for `www` that points to parking
- Add the two records above

### 1B. Resend records (email sending) — add these AFTER step 2 below

Resend will give you 3-4 records when you add the domain. Typically:

| Type  | Name              | Value                                    |
|-------|-------------------|------------------------------------------|
| MX    | send              | feedback-smtp.us-east-1.amazonses.com (priority 10) |
| TXT   | send              | `v=spf1 include:amazonses.com ~all`      |
| TXT   | resend._domainkey | (long DKIM value Resend provides)        |
| TXT   | _dmarc            | `v=DMARC1; p=none;` (optional)           |

**Exact values come from Resend dashboard** — paste those, not the examples above. Copy-paste directly from Resend's domain verification screen.

---

## Step 2 — Set up Resend

1. Go to [resend.com/signup](https://resend.com/signup)
2. Sign up with `stopresolutions1@gmail.com`
3. After signup: **Domains** → **Add Domain** → enter `bewithme.live`
4. Resend shows you the DNS records from step 1B above — copy each one
5. Go back to Hostinger DNS Zone and add those records
6. Back at Resend → click **Verify Domain**
   - If pending, wait 5-30 min for DNS propagation, then refresh
   - All records should go green
7. Once verified: **API Keys** → **Create API Key**
   - Name: `render-prod`
   - Permission: **Sending access**
   - Domain: `bewithme.live`
   - Copy the `re_...` value — you'll only see it once

---

## Step 3 — Update Render environment variables

Go to [dashboard.render.com](https://dashboard.render.com) → `be-with-me-api` → **Environment**.

### Update these:

| Key          | Old value                                 | New value                                 |
|--------------|-------------------------------------------|-------------------------------------------|
| `CLIENT_URL` | `https://bewithmeapp.me` (or `dressmeapp.me`) | `https://bewithme.live`                   |
| `VAPID_SUBJECT` | `mailto:admin@bewithmeapp.me`          | `mailto:admin@bewithme.live`              |
| `EMAIL_FROM`  | `Be With Me <noreply@bewithmeapp.me>`    | `Be With Me <noreply@bewithme.live>`      |

### Add this:

| Key              | Value                           |
|------------------|----------------------------------|
| `RESEND_API_KEY` | (paste the `re_...` from step 2) |

Click **Save changes**. Render auto-redeploys in ~2 min.

---

## Step 4 — Verify everything

### Check DNS propagation
- Open [dnschecker.org](https://dnschecker.org) → enter `bewithme.live` → check `A` record
- Should show `76.76.21.21` across multiple locations
- Typical propagation: 15 min to 2 hours

### Test the site
- Visit https://bewithme.live → should load the Be With Me homepage
- Vercel will auto-issue SSL (takes 1-5 min after DNS resolves)
- Check https://www.bewithme.live also works

### Test forgot-password end-to-end
1. https://bewithme.live/auth/login
2. Click **Forgot password?**
3. Enter an existing user email, submit
4. Check that inbox — should receive "Reset your Be With Me password" email within 30 seconds
5. Click reset link → should open `/auth/reset-password?token=...`
6. Set new password, submit
7. Log in with new password

### If email doesn't arrive:
- Check spam folder
- Render dashboard → `be-with-me-api` → Logs — look for `[email] Password reset sent to ...` (success) or `[email] Password reset send failed` (failure)
- Resend dashboard → Logs → see if Resend received the send request

---

## Step 5 — (Optional) Keep old domain alive as redirect

If `dressmeapp.me` still has active users who have it bookmarked, set up a 301 redirect:

**In Vercel dashboard** → `client` project → Settings → Domains → click `dressmeapp.me` → set redirect to `https://bewithme.live`

This means old bookmarks go to the new site instead of 404'ing.

---

## What's already done (committed as e5dcd12)

- ✅ Code updated: 11 files, 16 references changed to `bewithme.live`
  - Server: `env.ts`, `index.ts` (CORS), `pushNotifications.ts`, `email.ts`, `viral.ts`, `threads.ts`, `fanSubscriptions.ts`
  - Client: `next.config.js`, `capacitor.config.ts`, `ios/App/App/Info.plist`
  - Infra: `render.yaml`
- ✅ Pushed to GitHub (triggers Render server auto-deploy)
- ✅ Client deployed to Vercel (deployment `dpl_CyZTpu32zogDcV7FsVyWmAqiqiqD`)
- ✅ `bewithme.live` + `www.bewithme.live` domains added to Vercel client project

CORS allows both old (`dressmeapp.me`) and new (`bewithme.live`) domains during transition, so nothing breaks while DNS switches.

---

## iOS app note

`client/capacitor.config.ts` and `client/ios/App/App/Info.plist` were updated but these only take effect when you rebuild the iOS app. That's fine — wait for your next TestFlight build to pick these up.
