# Manual Database Migration Guide

## Overview
Since direct DDL operations cannot be performed through the Supabase REST API, this guide provides step-by-step instructions for manually applying the database migration to add the missing user status column and admin policies.

## 🚀 Quick Migration Steps

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://wfolyzksvsfvshxxcjhs.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Apply the Migration Script
1. Copy the entire contents of `database_migration_script.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the migration

### Step 3: Verify the Migration
After running the script, you should see:
- ✅ Status column added to profiles table
- ✅ Admin RLS policies created
- ✅ Activity logging triggers activated
- ✅ Users updated to have 'active' status

## 📋 What the Migration Does

### 1. Adds Status Column
```sql
ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active' 
  CHECK (status IN ('active', 'inactive', 'suspended'));
```

### 2. Creates Admin Policies
Allows admin users to:
- ✅ View all user profiles
- ✅ Update any user profile (including status)
- ✅ Delete user accounts
- ✅ Create new user profiles

### 3. Sets Up Activity Logging
All admin user management actions are automatically logged with:
- Admin user ID who performed the action
- Action type (INSERT, UPDATE, DELETE)
- Target user ID
- Before/after data for updates
- Timestamp of action

### 4. Performance Optimization
- Creates index on status column for fast filtering
- Sets up automatic timestamp updates

## 🔍 Verification Commands

After running the migration, you can verify with these queries:

```sql
-- Check if status column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY column_name;

-- Check current users and their status
SELECT id, email, full_name, role, status 
FROM profiles 
ORDER BY created_at DESC;

-- Check if admin policies exist
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
```

## 🛠️ Troubleshooting

### Issue: "permission denied for table profiles"
**Solution:** Make sure you're running the query as a user with admin privileges.

### Issue: "column 'status' already exists"
**Solution:** The migration script uses `IF NOT EXISTS` so this is normal. The migration will skip existing objects.

### Issue: "relation 'admin_activity_logs' does not exist"
**Solution:** Make sure all previous migrations have been applied, including the admin activity logs table.

## 📱 Testing the Migration

After successful migration:

1. **Test User Status Updates:**
   - Go to Admin Dashboard → Users tab
   - Try changing a user's status from active to suspended
   - Verify the change is saved and displayed

2. **Test User Deletion:**
   - Try deleting a test user account
   - Verify it's removed from the database

3. **Test Admin Access:**
   - Log in as a non-admin user
   - Verify they cannot access user management features

4. **Check Activity Logs:**
   - Look in `admin_activity_logs` table
   - Verify your actions are being logged

## 🔄 Rollback (If Needed)

If you need to rollback the migration, run:

```sql
-- Remove the status column
ALTER TABLE profiles DROP COLUMN IF EXISTS status;

-- Remove the index
DROP INDEX IF EXISTS idx_profiles_status;

-- Remove policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Remove triggers
DROP TRIGGER IF EXISTS log_admin_profile_insert ON profiles;
DROP TRIGGER IF EXISTS log_admin_profile_update ON profiles;
DROP TRIGGER IF EXISTS log_admin_profile_delete ON profiles;
```

## ✅ Expected Results

After successful migration, your admin dashboard will be able to:

- **Edit Users:** Change name, email, role, status
- **Delete Users:** Permanently remove user accounts  
- **Change Status:** Set users to active/inactive/suspended
- **Bulk Operations:** Manage multiple users at once
- **Audit Trail:** See all admin actions in activity logs

## 📞 Support

If you encounter issues during migration:

1. **Check the SQL Editor console** for specific error messages
2. **Verify your user role** - you need admin privileges
3. **Ensure all previous migrations** have been applied
4. **Check the migration script output** for success messages

Once the migration is complete, the user management system will be fully functional! 🎉