# 🚨 URGENT: Fix Production Authentication

## The Problem
Users can't login to reawarding.com because:
1. Site URL is `http://reawarding.com` (should be `https://`)
2. Email confirmations are required but emails never arrive (SMTP disabled)
3. Users are stuck in "confirm your email" loop

## IMMEDIATE FIX (Choose One)

### ⚡ Option A: Disable Email Confirmation (FASTEST - 2 minutes)

**Go to Supabase Dashboard:**
https://supabase.com/dashboard/project/cjrpnzwrldlxajkvznca/auth/providers

**Steps:**
1. **Fix Site URL** (CRITICAL):
   - Navigate to: Authentication → URL Configuration
   - Change Site URL from: `http://reawarding.com`
   - To: `https://reawarding.com` ✅

2. **Disable Email Confirmation**:
   - Navigate to: Authentication → Providers → Email
   - Find "Confirm email" toggle
   - **Turn OFF** email confirmation
   - Click Save

3. **Test Immediately**:
   - Go to https://reawarding.com
   - Try signing up with new email
   - Should work instantly without email confirmation

**Pros:**
- ✅ Works immediately
- ✅ No email setup needed
- ✅ Users can register and login right away

**Cons:**
- ⚠️ Users can signup with fake emails
- ⚠️ No email verification (can add later)

---

### 🔧 Option B: Enable SMTP (Better Security - 10 minutes)

**If you want email confirmations (recommended for production):**

1. **Fix Site URL** (same as Option A):
   - Change to `https://reawarding.com`

2. **Enable SMTP in Supabase**:
   - Navigate to: Project Settings → Auth → SMTP Settings
   - Enable custom SMTP
   - Configure Zoho SMTP:
     ```
     Host: smtppro.zoho.com
     Port: 465
     User: greg@robleto.com
     Password: [Your ZOHO_SMTP_PASSWORD from .env.local]
     Sender email: noreply@reawarding.com
     Sender name: Reawarding
     ```

3. **Verify Email Templates**:
   - Navigate to: Authentication → Email Templates
   - Check "Confirm signup" template
   - Ensure all links use `{{ .SiteURL }}` (will use HTTPS)

4. **Test Email Delivery**:
   - Use Supabase's "Send test email" feature
   - Check spam folders
   - Verify links work

**Pros:**
- ✅ Secure (verifies email addresses)
- ✅ Prevents spam signups
- ✅ Professional

**Cons:**
- ⏱️ Takes longer to setup
- 🔧 Requires SMTP credentials
- 📧 Emails might go to spam initially

---

## CRITICAL: Fix Site URL First!

**Before anything else, change Site URL:**

Current: `http://reawarding.com` ❌
Should be: `https://reawarding.com` ✅

**Why this matters:**
- Email confirmation links will be HTTPS
- OAuth redirects will work properly
- Cookies will be secure
- No mixed content warnings

---

## Redirect URLs - Already Correct! ✅

Your redirect URLs look good:
- ✅ `http://localhost:3000`
- ✅ `https://reawarding.com`
- ✅ `http://localhost:3000/auth/callback`
- ✅ `https://*.reawarding.com/auth/callback`
- ✅ `https://reawarding.com/auth/callback`
- ✅ `https://reawarding.com/*`
- ✅ `https://*.reawarding.com/*`

**Just keep these as-is.**

---

## SQL: Manually Confirm Stuck Users (Emergency)

If you have users stuck in "unconfirmed" state, run this in Supabase SQL Editor:

```sql
-- See unconfirmed users
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- MANUALLY CONFIRM ALL USERS (use with caution!)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Or confirm specific email:
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-email@example.com';
```

---

## Recommended Flow

1. **Right Now (1 minute)**:
   - Fix Site URL to `https://reawarding.com`
   - Disable email confirmation temporarily
   - Test login works

2. **Later Today**:
   - Setup SMTP properly
   - Re-enable email confirmation
   - Test email delivery

3. **Optional**:
   - Run SQL to confirm existing stuck users
   - Send announcement about fixed login

---

## Testing Checklist

After making changes:
- [ ] Site URL is HTTPS
- [ ] Can signup with new email
- [ ] Can login with password
- [ ] Session persists after refresh
- [ ] Works on mobile
- [ ] Guest rankings migrate after signup
- [ ] OAuth still works (Google, Facebook, GitHub)

---

## Why Emails Weren't Arriving

Your `supabase/config.toml` has SMTP commented out:

```toml
# Use a production-ready SMTP server (commented out for local development)
# [auth.email.smtp]
# enabled = true
# host = "smtppro.zoho.com"
# ...
```

**This config file is for LOCAL development only!**

For **production** (Supabase Cloud), you MUST configure SMTP in the dashboard:
- Project Settings → Auth → SMTP Settings

The `config.toml` file doesn't affect your production Supabase instance.

---

## Next Steps

1. Fix Site URL immediately
2. Choose Option A or B above
3. Test on mobile
4. Report back if still having issues

**Current blocking issue**: Site URL is HTTP, should be HTTPS.
**Second issue**: Email confirmation enabled but SMTP not configured in production.

Fix these two and login will work! 🎉
