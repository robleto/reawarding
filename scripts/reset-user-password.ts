import 'dotenv/config';
/*
  Usage:
    npm run reset:user <email> <newPassword>
*/
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: npm run reset:user <email> <newPassword>');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  console.log(`Looking up user ${email}...`);
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 100,
  });

  if (listError) {
    console.error('Error listing users:', listError.message);
    process.exit(1);
  }

  const user = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  console.log(`Found user ${user.id}. Updating password...`);
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error('Failed to update password:', updateError.message);
    process.exit(1);
  }

  console.log('Password reset successfully.');
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
