# Telemetry and Feedback Triage Guide

This guide outlines the workflow for monitoring and responding to error logs and user feedback collected during the friend beta.

## Overview

The telemetry and feedback system consists of:
- **Error Logs**: Automatic tracking of client and server errors with user/session correlation
- **User Feedback**: Bug reports, feature requests, and general feedback submitted by users

## Database Tables

### error_logs
Stores client and server errors with privacy-respecting metadata:
- `user_id`: Associated user (null for guests)
- `session_id`: Anonymous session identifier (cleared on tab close)
- `error_message`, `error_stack`: Error details
- `error_type`: 'client_error', 'server_error', or 'edge_function_error'
- `component_name`: React component or function where error occurred
- `url`: Page where error happened
- `metadata`: Browser info, viewport, etc.

### feedback
Stores user-submitted feedback:
- `user_id`: Associated user (null for guests)
- `feedback_type`: 'bug', 'idea', or 'other'
- `title`, `description`: Feedback details
- `status`: 'new', 'in_review', 'planned', 'in_progress', 'completed', 'wont_fix'
- `priority`: 'low', 'medium', 'high', 'critical'
- `url`: Page where feedback was submitted
- `metadata`: Browser context

## Accessing Telemetry Data

### Via Supabase Dashboard

1. **Recent Errors View**:
   ```sql
   SELECT * FROM admin.recent_errors
   ORDER BY created_at DESC
   LIMIT 50;
   ```

2. **Feedback Summary View**:
   ```sql
   SELECT * FROM admin.feedback_summary
   ORDER BY 
     CASE priority
       WHEN 'critical' THEN 1
       WHEN 'high' THEN 2
       WHEN 'medium' THEN 3
       WHEN 'low' THEN 4
     END,
     created_at DESC;
   ```

3. **Error Trends**:
   ```sql
   SELECT 
     error_type,
     component_name,
     COUNT(*) as occurrences,
     MAX(created_at) as last_seen
   FROM error_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY error_type, component_name
   ORDER BY occurrences DESC;
   ```

4. **User-Specific Issues**:
   ```sql
   SELECT 
     e.error_message,
     e.component_name,
     e.created_at,
     p.username
   FROM error_logs e
   LEFT JOIN profiles p ON e.user_id = p.id
   WHERE e.user_id = 'user-uuid-here'
   ORDER BY e.created_at DESC;
   ```

### Via SQL Editor (Recommended Saved Queries)

Create these saved queries in Supabase Dashboard → SQL Editor:

**1. Daily Error Summary**
```sql
SELECT 
  DATE(created_at) as date,
  error_type,
  COUNT(*) as count,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as authenticated_users
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), error_type
ORDER BY date DESC, count DESC;
```

**2. New Feedback This Week**
```sql
SELECT 
  feedback_type,
  title,
  description,
  status,
  priority,
  created_at,
  (SELECT username FROM profiles WHERE id = feedback.user_id) as username
FROM feedback
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY 
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  created_at DESC;
```

**3. Critical Issues**
```sql
SELECT 
  'error' as source,
  error_message as title,
  component_name as detail,
  created_at,
  COUNT(*) OVER (PARTITION BY error_message) as frequency
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'feedback' as source,
  title,
  feedback_type as detail,
  created_at,
  1 as frequency
FROM feedback
WHERE priority = 'critical' AND status IN ('new', 'in_review')
ORDER BY created_at DESC;
```

## Triage Workflow

### Daily Review (5-10 minutes)
**Cadence**: Every weekday morning

1. **Check New Feedback** (Priority 1)
   - Run "New Feedback This Week" query
   - Review any 'new' status items
   - For each item:
     - Assign priority (low/medium/high/critical)
     - Update status to 'in_review'
     - Add to backlog if actionable
     - Mark 'wont_fix' if out of scope with brief reason in notes

2. **Review Error Trends** (Priority 2)
   - Run "Daily Error Summary" query
   - Look for spikes or new error types
   - If > 10 occurrences of same error:
     - Investigate root cause
     - Create GitHub issue if needed
     - Fix or add to sprint backlog

3. **Critical Issues** (Priority 3)
   - Run "Critical Issues" query
   - Address any critical-priority feedback immediately
   - Investigate high-frequency errors (> 50 in 24h)

### Weekly Deep Dive (30-60 minutes)
**Cadence**: Every Friday afternoon

1. **Error Pattern Analysis**
   - Group errors by component
   - Identify systemic issues
   - Plan fixes for recurring problems

2. **Feedback Roadmap Review**
   - Review all 'in_review' and 'planned' feedback
   - Prioritize for upcoming sprint
   - Close completed items
   - Update users if possible (future enhancement)

3. **Metrics Reporting**
   - Total errors this week vs last week
   - Total feedback submissions
   - Top 5 most reported issues
   - Resolution rate

## Updating Feedback Status

```sql
-- Mark feedback as in progress
UPDATE feedback
SET status = 'in_progress', updated_at = NOW()
WHERE id = 'feedback-uuid';

-- Mark feedback as completed
UPDATE feedback
SET status = 'completed', updated_at = NOW()
WHERE id = 'feedback-uuid';

-- Update priority
UPDATE feedback
SET priority = 'high', updated_at = NOW()
WHERE id = 'feedback-uuid';
```

## Privacy Considerations

- Error logs in development mode are console-only (not stored)
- Only minimal browser metadata is collected (user agent, viewport)
- User IDs are referenced, not personal info duplicated
- Session IDs are ephemeral (cleared on tab close)
- No PII (personally identifiable information) is logged beyond user ID reference
- Users are informed via privacy notice on feedback form

## Alerting (Future Enhancement)

Consider setting up alerts for:
- More than 100 errors in 1 hour (system issue)
- More than 5 critical priority feedback items
- New error types not seen before
- Errors affecting > 10% of active users

## Integration with Issue Tracking

For critical bugs:
1. Create GitHub issue from error log details
2. Link issue number in internal notes
3. When fixed, update feedback status if related

For feature requests:
1. Add to product backlog
2. Update feedback status to 'planned'
3. Consider user voting system (future enhancement)

## Monthly Cleanup

- Archive error_logs older than 90 days
- Keep feedback indefinitely for product insights
- Review and close stale 'in_review' items

```sql
-- Archive old error logs (recommended: run monthly)
DELETE FROM error_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Quick Reference: Status Workflow

```
Feedback Status Flow:
new → in_review → planned → in_progress → completed
                          ↘ wont_fix

Priority Levels:
- critical: Blocking user workflows, immediate attention
- high: Significant impact, prioritize in current sprint
- medium: Important but not urgent, backlog
- low: Nice to have, consider for future
```

## Contact

For questions about the telemetry system or triage process, see the project maintainers.
