Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseHeaders = {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    };

    // Parse request body
    const requestData = await req.json();
    const { action, userId, updates, status, userIds, operation, adminNotes, requestId } = requestData;

    // Verify the user is an admin
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${userId}`, {
      headers: supabaseHeaders
    });
    
    const userData = await userResponse.json();
    if (!userData || userData.length === 0 || userData[0].role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    let result = {};

    switch (action) {
      case 'update_user':
        // Update user profile information
        if (!userId || !updates) {
          throw new Error('User ID and updates are required for update_user action');
        }

        // Remove sensitive fields that shouldn't be updated via this endpoint
        const { password, ...safeUpdates } = updates;
        
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            ...supabaseHeaders,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(safeUpdates)
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Failed to update user: ${errorText}`);
        }

        const updatedUser = await updateResponse.json();
        result = { success: true, user: updatedUser[0] };
        break;

      case 'delete_user':
        // Delete user account
        if (!userId) {
          throw new Error('User ID is required for delete_user action');
        }

        // First, delete the user from auth.users (this will cascade to profiles)
        const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: supabaseHeaders
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          throw new Error(`Failed to delete user: ${errorText}`);
        }

        result = { success: true, message: 'User deleted successfully' };
        break;

      case 'update_status':
        // Update user status
        if (!userId || !status) {
          throw new Error('User ID and status are required for update_status action');
        }

        // Validate status
        if (!['active', 'inactive', 'suspended'].includes(status)) {
          throw new Error('Invalid status. Must be active, inactive, or suspended');
        }

        try {
          const statusResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              ...supabaseHeaders,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ status })
          });

          if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            // If status column doesn't exist, provide helpful error
            if (errorText.includes('status') && (errorText.includes('does not exist') || errorText.includes('not found'))) {
              throw new Error('Status column not found in database. Please run the database migration to add the status column to the profiles table.');
            }
            throw new Error(`Failed to update user status: ${errorText}`);
          }

          const updatedUser = await statusResponse.json();
          result = { success: true, user: updatedUser[0] };
        } catch (statusError) {
          if (statusError.message.includes('Status column not found')) {
            throw statusError;
          }
          throw new Error(`Database error: ${statusError.message}`);
        }
        break;

      case 'bulk_update':
        // Perform bulk operations on multiple users
        if (!userIds || !operation) {
          throw new Error('User IDs and operation are required for bulk_update action');
        }

        const { type, data } = operation;
        let bulkUpdateData = {};

        switch (type) {
          case 'update_status':
            bulkUpdateData = { status: data.status };
            break;
          case 'update_role':
            bulkUpdateData = { role: data.role };
            break;
          case 'delete':
            // Handle bulk delete
            const deletePromises = userIds.map(id => 
              fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
                method: 'DELETE',
                headers: supabaseHeaders
              })
            );
            
            await Promise.all(deletePromises);
            result = { success: true, message: 'Users deleted successfully', count: userIds.length };
            break;
          default:
            throw new Error('Unknown bulk operation type');
        }

        // For non-delete operations, perform bulk update
        if (type !== 'delete') {
          const bulkResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(',')})`, {
            method: 'PATCH',
            headers: {
              ...supabaseHeaders,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(bulkUpdateData)
          });

          if (!bulkResponse.ok) {
            const errorText = await bulkResponse.text();
            throw new Error(`Failed to perform bulk update: ${errorText}`);
          }

          const updatedUsers = await bulkResponse.json();
          result = { success: true, users: updatedUsers, count: userIds.length };
        }
        break;

      case 'create_user':
        // Create new user account
        if (!updates) {
          throw new Error('User data is required for create_user action');
        }

        const { email, password, full_name, role, avatar_url } = updates;

        // Create user in auth.users
        const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name,
              role
            }
          })
        });

        if (!createUserResponse.ok) {
          const errorText = await createUserResponse.text();
          throw new Error(`Failed to create user: ${errorText}`);
        }

        const newUser = await createUserResponse.json();

        // Create profile record
        const profileData = {
          id: newUser.id,
          email,
          full_name,
          role: role || 'student',
          avatar_url,
          status: 'active'
        };

        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            ...supabaseHeaders,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(profileData)
        });

        if (!profileResponse.ok) {
          const errorText = await profileResponse.text();
          // If profile creation fails, try to delete the auth user
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUser.id}`, {
            method: 'DELETE',
            headers: supabaseHeaders
          });
          throw new Error(`Failed to create user profile: ${errorText}`);
        }

        const profile = await profileResponse.json();
        result = { success: true, user: profile[0] };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin user management error:', error);
    
    const errorResponse = {
      error: {
        code: 'ADMIN_USER_MANAGEMENT_ERROR',
        message: error.message || 'An unexpected error occurred'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});