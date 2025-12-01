# Production Authentication Setup Guide

## Issue
Authentication was failing on mobile devices and production environment due to:
1. Disabled auth callback route (`/auth/callback/route.ts`)
2. Missing/incorrect redirect URL configuration in Supabase
3. No auth error handling page

## ✅ Fixed Components

### 1. Auth Callback Route
**File**: `src/app/auth/callback/route.ts`
- Restored OAuth and email confirmation handling
- Added proper error handling and logging
- Redirects to intended destination after successful auth

### 2. Auth Error Page
**File**: `src/app/auth-code-error/page.tsx`
- User-friendly error display
- Common troubleshooting steps
- Error details for debugging

## 🚀 Required Supabase Configuration

### Step 1: Configure Site URL and Redirect URLs

Go to your Supabase project dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain:
   ```
   https://your-production-domain.com
   ```

3. Add **Redirect URLs** (one per line):
   ```
   https://your-production-domain.com/auth/callback
   https://your-production-domain.com/auth/reset-password
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/reset-password
   http://127.0.0.1:3000/auth/callback
   http://127.0.0.1:3000/auth/reset-password
   ```

### Step 2: Configure OAuth Providers

For each OAuth provider you're using (Google, GitHub, Facebook):

#### Google OAuth
1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Add **Authorized Redirect URIs** in Google Cloud Console:
   ```
   https://cjrpnzwrldlxajkvznca.supabase.co/auth/v1/callback
   https://your-production-domain.com/auth/callback
   ```

#### GitHub OAuth
1. Go to **Authentication** → **Providers** → **GitHub**
2. Enable GitHub provider
3. Add **Authorization callback URL** in GitHub OAuth App settings:
   ```
   https://cjrpnzwrldlxajkvznca.supabase.co/auth/v1/callback
   ```

#### Facebook OAuth
1. Go to **Authentication** → **Providers** → **Facebook**
2. Enable Facebook provider
3. Add **Valid OAuth Redirect URIs** in Facebook App settings:
   ```
   https://cjrpnzwrldlxajkvznca.supabase.co/auth/v1/callback
   ```

### Step 3: Email Settings

1. Go to **Authentication** → **Email Templates**
2. Ensure all templates use the correct production domain
3. Check that SMTP is configured (or using Supabase's default)

Current SMTP (from config.toml):
- Host: `smtppro.zoho.com`
- Sender: `noreply@reawarding.com`
- **Action Required**: Set `ZOHO_SMTP_PASSWORD` in Supabase Vault

## 🔧 Environment Variables

### Production Environment
Ensure these are set in your deployment platform (Vercel/Netlify/etc):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cjrpnzwrldlxajkvznca.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Deployment Platform Setup

#### If using Vercel:
1. Go to Project Settings → Environment Variables
2. Add all production environment variables
3. Redeploy after changes

#### If using Netlify:
1. Go to Site Settings → Environment Variables
2. Add all production environment variables
3. Redeploy after changes

## 🧪 Testing Authentication

### Local Testing
1. Start development server: `npm run dev`
2. Test each auth method:
   - Email/Password login
   - Google OAuth
   - GitHub OAuth
   - Facebook OAuth
   - Password reset flow
   - Email confirmation flow

### Production Testing
1. Deploy to production
2. Test from different devices:
   - Desktop browser
   - Mobile Safari (iOS)
   - Mobile Chrome (Android)
   - Different networks (WiFi, cellular)

### Test Checklist
- [ ] Email/password signup creates account
- [ ] Confirmation email arrives and link works
- [ ] Email/password login works
- [ ] OAuth providers redirect correctly
- [ ] Password reset email arrives and link works
- [ ] Session persists across page reloads
- [ ] Mobile login works (critical!)
- [ ] Error page displays for failed auth

## 📱 Mobile-Specific Considerations

### Common Mobile Issues
1. **Cookie settings**: Ensure third-party cookies are enabled
2. **Deep linking**: OAuth redirects must work on mobile browsers
3. **Session persistence**: LocalStorage/Cookies must be accessible

### Mobile Testing Tips
- Test in both WiFi and cellular networks
- Test with Safari (iOS) and Chrome (Android)
- Test private/incognito mode
- Clear browser data between tests

## 🔍 Debugging Auth Issues

### Check Supabase Logs
1. Go to Supabase Dashboard → Logs → Auth Logs
2. Look for failed authentication attempts
3. Check error messages and stack traces

### Browser Console
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Look for auth-related cookies

### Common Error Messages

#### "Invalid login credentials"
- User entered wrong password
- Email not confirmed (check inbox)
- Account doesn't exist (needs signup)

#### "Email not confirmed"
- User needs to click confirmation link in email
- Resend confirmation email via login modal

#### "OAuth error"
- Redirect URI not configured correctly
- OAuth app credentials invalid
- User denied permission

## 📝 Maintenance

### Regular Checks
- [ ] Monitor auth success/failure rates
- [ ] Check email delivery rates
- [ ] Review auth logs for suspicious activity
- [ ] Test OAuth providers monthly (credentials can expire)

### Updates Needed When
- Changing production domain
- Adding new OAuth providers
- Updating email templates
- Changing SMTP provider

## 🆘 Troubleshooting

### "Authentication failed" on mobile
1. Check redirect URLs include your production domain
2. Verify OAuth provider callback URLs
3. Test in different mobile browsers
4. Check Supabase auth logs for specific error

### Emails not arriving
1. Check SMTP settings in Supabase
2. Verify sender domain (may need SPF/DKIM)
3. Check spam folders
4. Test with Supabase's email testing tool

### Session expires too quickly
1. Check `jwt_expiry` in `supabase/config.toml`
2. Verify `enable_refresh_token_rotation` is true
3. Check cookie settings in browser

## 🔐 Security Checklist
- [ ] All OAuth apps use HTTPS callbacks
- [ ] Service role key stored securely (never in client code)
- [ ] Rate limiting enabled (check `config.toml`)
- [ ] Email confirmation required for signups
- [ ] Strong password requirements enforced
- [ ] SMTP uses secure connection (port 465/587)

---

**Last Updated**: November 30, 2025
**Status**: Auth callback restored, production configuration documented
