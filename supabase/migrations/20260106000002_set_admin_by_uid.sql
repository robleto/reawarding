-- Directly set admin access by UID
-- Run this if the email-based update didn't work

UPDATE profiles 
SET is_admin = TRUE 
WHERE id = '45d902c9-d56a-4589-8932-9e25b6eeec30';

-- Verify the update
SELECT id, email, is_admin 
FROM profiles 
WHERE id = '45d902c9-d56a-4589-8932-9e25b6eeec30';
