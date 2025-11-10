// Enhanced Password Reset Request Handler
// Handles user password reset requests with email-based status tracking

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../../_shared/cors.ts';

interface PasswordResetRequest {
  email: string;
  reason?: string;
  requestDetails?: {
    ipAddress?: string;
    userAgent?: string;
    additionalInfo?: any;
  };
}

interface SupabaseUser {
  id: string;
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get and validate user authentication (optional for password reset requests)
    const authHeader = req.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        
        if (!authError && user) {
          currentUserId = user.id;
        }
      } catch (error) {
        // Continue without authentication - allow password reset requests
        console.log('No valid auth token, continuing without authentication');
      }
    }

    // Parse request body
    const { email, reason, requestDetails }: PasswordResetRequest = await req.json();

    // Validate required fields
    if (!email) {
      throw new Error('Email is required');
    }

    // Check if email belongs to a valid user
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      // Don't reveal whether email exists or not for security
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'If your email is registered, a password reset request has been submitted. You will receive email updates about your request status.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if there's already a pending request for this user
    const { data: existingRequest } = await supabaseClient
      .from('password_reset_requests')
      .select('id, status, created_at, email_notification_type, last_email_status')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingRequest) {
      const timeSinceRequest = new Date().getTime() - new Date(existingRequest.created_at).getTime();
      const hoursSinceRequest = timeSinceRequest / (1000 * 60 * 60);
      
      if (hoursSinceRequest < 1) {
        throw new Error('A password reset request is already pending. Please wait before submitting another request.');
      }
    }

    // Create password reset request
    const { data: resetRequest, error: createError } = await supabaseClient
      .from('password_reset_requests')
      .insert({
        user_email: email,
        user_id: profile.id,
        reason: reason || null,
        request_details: requestDetails || {},
        status: 'pending',
        email_notification_type: 'request_submitted',
        last_email_status: 'pending',
        ip_address: requestDetails?.ipAddress || null,
        user_agent: requestDetails?.userAgent || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create password reset request: ${createError.message}`);
    }

    // Log the action
    await supabaseClient.rpc('log_password_reset_action', {
      p_request_id: resetRequest.id,
      p_user_id: profile.id,
      p_action_type: 'request_created',
      p_action_description: `Password reset request created for ${email}`,
      p_admin_id: null,
      p_metadata: {
        reason: reason || null,
        request_details: requestDetails || {},
        email_provided: currentUserId === profile.id,
        authenticated_request: currentUserId !== null,
        email_tracking_enabled: true
      },
      p_ip_address: requestDetails?.ipAddress || null,
      p_user_agent: requestDetails?.userAgent || null
    });

    // Send confirmation email
    const emailResult = await sendEmailNotification(
      supabaseClient,
      resetRequest.id,
      'request_submitted',
      {
        userName: profile.full_name || email.split('@')[0],
        userEmail: email,
        requestDate: new Date(resetRequest.created_at).toLocaleDateString(),
        appName: 'EduQuiz Platform'
      }
    );

    // Get email status for response
    const emailStatus = emailResult.success ? 'sent' : 'failed';

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset request submitted successfully. You will receive email updates about your request status.',
      data: {
        request_id: resetRequest.id,
        status: 'pending',
        email_tracking: true,
        email_status: emailStatus,
        estimated_processing_time: '24 hours',
        email_updates: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    
    const errorResponse = {
      error: {
        code: 'PASSWORD_RESET_REQUEST_ERROR',
        message: error.message || 'Failed to process password reset request'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Email notification function
async function sendEmailNotification(
  supabaseClient: any,
  requestId: string,
  emailType: 'request_submitted' | 'request_approved' | 'request_rejected' | 'temp_password_ready',
  variables: any = {}
) {
  try {
    // Get request details
    const { data: request } = await supabaseClient
      .from('password_reset_requests')
      .select(`
        *,
        profiles!user_id(full_name, email),
        admin_profiles!admin_id(full_name, email)
      `)
      .eq('id', requestId)
      .single();

    if (!request) {
      throw new Error('Request not found');
    }

    // Prepare email data
    const emailData = getEmailTemplate(emailType, {
      ...variables,
      userName: variables.userName || request.profiles?.full_name || request.user_email.split('@')[0],
      requestDate: variables.requestDate || new Date(request.created_at).toLocaleDateString(),
      appName: 'EduQuiz Platform',
      status: request.status,
      tempPassword: request.temp_password,
      expiryDate: request.temp_password_expires_at ? 
        new Date(request.temp_password_expires_at).toLocaleDateString() : 'N/A',
      adminNotes: request.admin_notes || 'No additional notes provided'
    });

    // Send email via your email service
    const emailResult = await sendEmailViaService({
      to: request.user_email,
      subject: emailData.subject,
      html: emailData.content
    });

    // Log email attempt
    await supabaseClient
      .from('password_reset_email_log')
      .insert({
        request_id: requestId,
        email_address: request.user_email,
        email_type: emailType,
        subject: emailData.subject,
        content: emailData.content,
        sent_at: new Date().toISOString(),
        delivery_status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error || null
      });

    // Update request with email tracking
    await supabaseClient
      .from('password_reset_requests')
      .update({
        email_sent_at: new Date().toISOString(),
        email_notification_type: emailType,
        last_email_status: emailResult.success ? 'sent' : 'failed',
        email_retry_count: request.email_retry_count || 0
      })
      .eq('id', requestId);

    return {
      success: emailResult.success,
      error: emailResult.error
    };

  } catch (error) {
    console.error('Email notification failed:', error);
    
    // Log failed email attempt
    try {
      await supabaseClient
        .from('password_reset_email_log')
        .insert({
          request_id: requestId,
          email_address: 'unknown',
          email_type: emailType,
          subject: 'Email sending failed',
          content: error.message,
          delivery_status: 'failed',
          error_message: error.message
        });
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// Email template function
function getEmailTemplate(
  type: 'request_submitted' | 'request_approved' | 'request_rejected' | 'temp_password_ready',
  variables: any
) {
  const templates = {
    request_submitted: {
      subject: `Password Reset Request Received - ${variables.appName}`,
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">Password Reset Request</h2>
          <p>Dear ${variables.userName},</p>
          <p>We have received your password reset request on <strong>${variables.requestDate}</strong>.</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Request Status:</strong> <span style="color: #059669;">Pending Review</span></p>
            <p><strong>Next Steps:</strong> An administrator will review your request and you'll receive another email with updates.</p>
          </div>
          <p>Thank you for using ${variables.appName}.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="font-size: 12px; color: #6B7280;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    },
    request_approved: {
      subject: `Password Reset Request Approved - ${variables.appName}`,
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #059669; padding-bottom: 10px;">Password Reset Request Approved</h2>
          <p>Dear ${variables.userName},</p>
          <p>Good news! Your password reset request has been approved by an administrator.</p>
          <div style="background-color: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #059669;">
            <h3 style="margin-top: 0; color: #059669;">Your Temporary Password</h3>
            <div style="background-color: #FFFFFF; padding: 15px; border-radius: 6px; border: 1px dashed #059669; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; color: #059669;">
              ${variables.tempPassword}
            </div>
            <p style="margin-bottom: 0;"><strong>Expires:</strong> ${variables.expiryDate}</p>
          </div>
          <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400E;">Important Instructions:</h4>
            <ol style="color: #92400E;">
              <li>Use the temporary password above to log in to your account</li>
              <li>You will be required to change your password immediately</li>
              <li>Choose a strong password that you haven't used before</li>
              <li>Do not share your temporary password with anyone</li>
            </ol>
          </div>
          <p>Thank you for using ${variables.appName}.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="font-size: 12px; color: #6B7280;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    },
    request_rejected: {
      subject: `Password Reset Request Status Update - ${variables.appName}`,
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">Password Reset Request Update</h2>
          <p>Dear ${variables.userName},</p>
          <p>Your password reset request has been reviewed by an administrator.</p>
          <div style="background-color: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #DC2626;">
            <h3 style="margin-top: 0; color: #DC2626;">Request Status: Rejected</h3>
            <p><strong>Admin Notes:</strong></p>
            <p style="background-color: #FFFFFF; padding: 10px; border-radius: 4px; font-style: italic;">${variables.adminNotes}</p>
          </div>
          <p>If you believe this decision was in error or you need further assistance, please contact our support team directly.</p>
          <p>Thank you for using ${variables.appName}.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="font-size: 12px; color: #6B7280;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    },
    temp_password_ready: {
      subject: `Your Temporary Password is Ready - ${variables.appName}`,
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">Temporary Password Ready</h2>
          <p>Dear ${variables.userName},</p>
          <p>Your temporary password is now ready for use.</p>
          <div style="background-color: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4F46E5;">
            <h3 style="margin-top: 0; color: #4F46E5;">Temporary Password</h3>
            <div style="background-color: #FFFFFF; padding: 15px; border-radius: 6px; border: 1px dashed #4F46E5; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; color: #4F46E5;">
              ${variables.tempPassword}
            </div>
            <p style="margin-bottom: 0;"><strong>Expires:</strong> ${variables.expiryDate}</p>
          </div>
          <p>Log in with this temporary password and you'll be prompted to change it immediately.</p>
          <p>Thank you for using ${variables.appName}.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="font-size: 12px; color: #6B7280;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    }
  };

  return templates[type];
}

// Email service integration function
async function sendEmailViaService(emailData: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    // Replace this with your actual email service integration
    // Example: Resend, SendGrid, AWS SES, etc.
    
    const emailServiceResponse = await fetch('YOUR_EMAIL_SERVICE_ENDPOINT', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('EMAIL_SERVICE_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      })
    });

    if (emailServiceResponse.ok) {
      return { success: true };
    } else {
      const errorText = await emailServiceResponse.text();
      return { success: false, error: `Email service error: ${errorText}` };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}