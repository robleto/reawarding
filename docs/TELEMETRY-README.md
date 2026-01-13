# Telemetry & Feedback System

This document provides a quick overview of the telemetry and feedback system implemented for the ReAwarding friend beta.

## Quick Links

- **User Feedback Form**: `/feedback`
- **Admin Telemetry Dashboard**: `/admin/telemetry`
- **Triage Guide**: [docs/telemetry-triage-guide.md](./telemetry-triage-guide.md)

## What Was Implemented

### Database Tables

1. **error_logs** - Tracks client and server errors
   - Fields: user_id, session_id, error_message, error_stack, error_type, component_name, url, metadata
   - RLS enabled with policies for user insert and service role select
   - Includes admin view: `admin.recent_errors`

2. **feedback** - Stores user-submitted feedback
   - Fields: user_id, feedback_type (bug/idea/other), title, description, status, priority, url
   - RLS enabled with policies for user CRUD and service role access
   - Includes admin view: `admin.feedback_summary`

### Client-Side Components

1. **Error Logger** (`src/utils/errorLogger.ts`)
   - `logError()` - Main error logging function
   - `logClientError()` - Log client-side errors
   - `logServerError()` - Log server/API errors
   - `setupGlobalErrorHandlers()` - Set up window error handlers
   - Privacy-respecting: only logs in production, minimal metadata

2. **Error Boundary** (`src/components/error/ErrorBoundary.tsx`)
   - React error boundary component
   - Catches and logs React component errors
   - Shows user-friendly error UI
   - Integrated into root layout (`src/app/providers.tsx`)

3. **Feedback Form** (`src/components/feedback/FeedbackForm.tsx`)
   - Three feedback types: bug, idea, other
   - Privacy notice included
   - Metadata collection (browser, viewport, URL)
   - Success/error state handling

### Pages

1. **Feedback Page** (`src/app/feedback/page.tsx`)
   - User-facing feedback submission form
   - Accessible from help page
   - Explains feedback process

2. **Admin Telemetry Dashboard** (`src/app/admin/telemetry/page.tsx`)
   - View recent errors and feedback
   - Tabs for errors vs feedback
   - Admin-only access (requires `is_admin` flag)

### Edge Function

**log-error** (`supabase/functions/log-error/index.ts`)
- Server-side error logging endpoint
- CORS-enabled
- Accepts authenticated and unauthenticated requests
- Stores errors in `error_logs` table

### Documentation

1. **Triage Guide** (`docs/telemetry-triage-guide.md`)
   - Daily and weekly review workflows
   - SQL queries for analysis
   - Privacy considerations
   - Status update workflows

2. **Ops Guide Update** (`docs/ops-cron-and-edge-functions.md`)
   - Added quick links to telemetry docs
   - References dashboard locations

## How to Use

### For Users

1. **Report bugs or suggest features**: Visit `/feedback`
2. **Errors are logged automatically** when they occur (production only)

### For Admins

1. **View telemetry**: Visit `/admin/telemetry`
2. **Run detailed queries**: Use SQL editor in Supabase dashboard
3. **Triage workflow**: Follow `docs/telemetry-triage-guide.md`

### Deployment Checklist

Before this goes live in production:

- [ ] Run migration `20260113000000_create_telemetry_tables.sql` on production database
- [ ] Deploy `log-error` Edge Function: `supabase functions deploy log-error`
- [ ] Create saved queries in Supabase SQL Editor (see triage guide)
- [ ] Test error logging in production
- [ ] Verify RLS policies work correctly
- [ ] Update admin users with `is_admin = true` flag

## Privacy & Security

- **Development Mode**: Errors logged to console only, not database
- **Session IDs**: Ephemeral, cleared on tab close (stored in sessionStorage)
- **User Correlation**: Only user UUID stored, no PII duplicated
- **Metadata**: Minimal browser info (user agent, viewport, URL)
- **RLS Policies**: Users can only insert their own errors; only admins/service role can view
- **Privacy Notice**: Displayed on feedback form

## Architecture Decisions

1. **Why not Sentry/LogRocket?** - Lightweight solution, no third-party dependencies, full data ownership
2. **Why sessionStorage for session ID?** - Privacy-first: cleared on tab close, doesn't persist
3. **Why development mode console-only?** - Reduces noise during development
4. **Why RLS for error logs?** - Security: users can't read others' errors, only service role/admins can
5. **Why separate tables?** - Clear separation of concerns: errors vs intentional feedback

## Future Enhancements

- Email notifications for critical feedback
- Error trend charts/visualizations
- User voting on feature requests
- Automatic GitHub issue creation
- Real-time error alerts (webhook to Slack/Discord)
- Error deduplication
- Source maps for better stack traces
