-- Telemetry and Feedback System Tables
-- Creates tables for client error logging and user feedback collection

-- Create error_logs table for tracking client and server errors
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_type TEXT, -- 'client_error', 'server_error', 'edge_function_error'
    component_name TEXT,
    url TEXT,
    user_agent TEXT,
    metadata JSONB, -- Additional context like browser, viewport, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for error_logs
CREATE INDEX IF NOT EXISTS error_logs_user_id_idx ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_error_type_idx ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS error_logs_session_id_idx ON error_logs(session_id);

-- Enable RLS for error_logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for error_logs
-- Allow users to insert their own error logs
CREATE POLICY "Users can create error logs"
    ON error_logs
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
    );

-- Only admins can view error logs (we'll need is_admin check)
-- For now, allow service role only
CREATE POLICY "Service role can view all error logs"
    ON error_logs
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create feedback table for user bug reports and feature requests
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'idea', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT, -- Page where feedback was submitted
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'planned', 'in_progress', 'completed', 'wont_fix')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB, -- Browser info, screenshots, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for feedback
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_type_idx ON feedback(feedback_type);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback(status);

-- Enable RLS for feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedback
-- Allow users to create feedback
CREATE POLICY "Users can create feedback"
    ON feedback
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
    );

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
    ON feedback
    FOR SELECT
    USING (user_id = auth.uid());

-- Service role can view all feedback
CREATE POLICY "Service role can view all feedback"
    ON feedback
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Service role can update feedback (for status changes)
CREATE POLICY "Service role can update feedback"
    ON feedback
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create a view for admin dashboard to see recent errors
CREATE OR REPLACE VIEW admin.recent_errors AS
SELECT 
    e.id,
    e.user_id,
    p.username,
    p.full_name,
    e.session_id,
    e.error_message,
    e.error_type,
    e.component_name,
    e.url,
    e.created_at,
    e.metadata
FROM error_logs e
LEFT JOIN profiles p ON e.user_id = p.id
ORDER BY e.created_at DESC
LIMIT 100;

-- Create a view for admin dashboard to see feedback summary
CREATE OR REPLACE VIEW admin.feedback_summary AS
SELECT 
    f.id,
    f.user_id,
    p.username,
    p.full_name,
    f.feedback_type,
    f.title,
    f.status,
    f.priority,
    f.created_at,
    f.url
FROM feedback f
LEFT JOIN profiles p ON f.user_id = p.id
ORDER BY 
    CASE f.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    f.created_at DESC;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to auto-update updated_at on feedback
DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
