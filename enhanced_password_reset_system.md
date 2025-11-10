# Enhanced Password Reset System Requirements

## Current Issues to Fix

1. **Remove Authentication Requirements** ✅ (Already implemented)
2. **Email-based Status Tracking** ❌ (Needs implementation)
3. **Show Temporary Password During Login** ❌ (Needs implementation)

## Required Changes

### 1. Email Notification System

#### A. Database Schema Updates
```sql
-- Add email tracking to password_reset_requests
ALTER TABLE password_reset_requests 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_notification_type TEXT CHECK (email_notification_type IN ('request_submitted', 'request_approved', 'request_rejected', 'temp_password_ready')),
ADD COLUMN IF NOT EXISTS last_email_status TEXT CHECK (last_email_status IN ('pending', 'sent', 'delivered', 'failed'));

-- Add email tracking table
CREATE TABLE IF NOT EXISTS password_reset_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES password_reset_requests(id),
  email_address TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_email_log_request_id ON password_reset_email_log(request_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_email_log_email ON password_reset_email_log(email_address);
```

#### B. Email Template Functions
```typescript
// Enhanced email template system
interface EmailTemplate {
  type: 'request_submitted' | 'request_approved' | 'request_rejected' | 'temp_password_ready';
  subject: string;
  content: string;
  variables: string[];
}

const emailTemplates: EmailTemplate[] = [
  {
    type: 'request_submitted',
    subject: 'Password Reset Request Received - {{appName}}',
    content: `
      <h2>Password Reset Request</h2>
      <p>Dear {{userName}},</p>
      <p>We have received your password reset request on {{requestDate}}.</p>
      <p><strong>Status:</strong> {{status}}</p>
      <p>An administrator will review your request and you'll receive another email with updates.</p>
      <p>Thank you for using {{appName}}.</p>
    `,
    variables: ['userName', 'requestDate', 'status', 'appName']
  },
  {
    type: 'request_approved',
    subject: 'Password Reset Request Approved - {{appName}}',
    content: `
      <h2>Password Reset Request Approved</h2>
      <p>Dear {{userName}},</p>
      <p>Good news! Your password reset request has been approved by an administrator.</p>
      <p><strong>Temporary Password:</strong> {{tempPassword}}</p>
      <p><strong>Expires:</strong> {{expiryDate}}</p>
      <p><strong>Instructions:</strong></p>
      <ol>
        <li>Use the temporary password above to log in to your account</li>
        <li>You will be required to change your password immediately</li>
        <li>Choose a strong password that you haven't used before</li>
        <li>Do not share your temporary password with anyone</li>
      </ol>
      <p>Thank you for using {{appName}}.</p>
    `,
    variables: ['userName', 'tempPassword', 'expiryDate', 'appName']
  },
  {
    type: 'request_rejected',
    subject: 'Password Reset Request Status Update - {{appName}}',
    content: `
      <h2>Password Reset Request Update</h2>
      <p>Dear {{userName}},</p>
      <p>Your password reset request has been reviewed by an administrator.</p>
      <p><strong>Status:</strong> Rejected</p>
      <p><strong>Admin Notes:</strong> {{adminNotes}}</p>
      <p>If you believe this was in error, please contact support directly.</p>
      <p>Thank you for using {{appName}}.</p>
    `,
    variables: ['userName', 'adminNotes', 'appName']
  }
];
```

### 2. Enhanced Password Reset Request Function

#### A. Email Notification Integration
```typescript
// Updated password-reset-request function
async function sendEmailNotification(
  supabaseClient: any,
  requestId: string,
  emailType: 'request_submitted' | 'request_approved' | 'request_rejected' | 'temp_password_ready',
  additionalData: any = {}
) {
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

  if (!request) return;

  // Prepare email data
  const emailData = {
    to: request.user_email,
    template: emailTemplates.find(t => t.type === emailType),
    variables: {
      userName: request.profiles?.full_name || request.user_email.split('@')[0],
      requestDate: new Date(request.created_at).toLocaleDateString(),
      status: request.status,
      tempPassword: request.temp_password,
      expiryDate: request.temp_password_expires_at ? 
        new Date(request.temp_password_expires_at).toLocaleDateString() : 'N/A',
      adminNotes: request.admin_notes || 'No additional notes',
      appName: 'EduQuiz Platform'
    }
  };

  // Send email (integrate with your email service)
  try {
    const emailResult = await sendEmailViaService(emailData);
    
    // Log email attempt
    await supabaseClient
      .from('password_reset_email_log')
      .insert({
        request_id: requestId,
        email_address: request.user_email,
        email_type: emailType,
        subject: emailData.template.subject,
        content: emailData.template.content,
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
        last_email_status: emailResult.success ? 'sent' : 'failed'
      })
      .eq('id', requestId);

  } catch (error) {
    console.error('Email sending failed:', error);
  }
}
```

#### B. Updated Request Creation Flow
```typescript
// In password-reset-request function, after creating request
const resetRequest = // ... existing request creation code

// Send confirmation email immediately
await sendEmailNotification(
  supabaseClient, 
  resetRequest.id, 
  'request_submitted'
);

// Return response with email tracking
return new Response(JSON.stringify({
  success: true,
  message: 'Password reset request submitted successfully. You will receive email updates about your request status.',
  data: {
    request_id: resetRequest.id,
    status: 'pending',
    email_updates: true,
    estimated_processing_time: '24 hours'
  }
}));
```

### 3. Enhanced Admin Approval Process

#### A. Email Integration in Admin Function
```typescript
// Updated approvePasswordResetRequest function
async function approvePasswordResetRequest(
  supabaseClient: any, 
  requestData: AdminPasswordResetRequest,
  adminId: string
) {
  // ... existing approval logic ...
  
  // Send approval email with temporary password
  await sendEmailNotification(
    supabaseClient,
    requestData.requestId,
    'request_approved',
    {
      temporaryPassword: tempPassword,
      expiryDate: tempPasswordExpiry
    }
  );

  return new Response(JSON.stringify({
    success: true,
    message: 'Password reset request approved successfully. User will receive temporary password via email.',
    data: {
      temporary_password: tempPassword,
      expires_at: tempPasswordExpiry,
      email_sent: true
    }
  }));
}
```

### 4. Login Flow Enhancement

#### A. Check for Approved Reset Requests
```typescript
// Enhanced login function to show temporary password
async function handlePasswordResetLogin(
  supabaseClient: any,
  email: string,
  passwordAttempt: string
) {
  // Check if user has approved reset request with temp password
  const { data: resetRequest } = await supabaseClient
    .from('password_reset_requests')
    .select(`
      *,
      profiles!user_id(full_name, email)
    `)
    .eq('user_email', email)
    .eq('status', 'approved')
    .eq('temp_password', passwordAttempt)
    .gt('temp_password_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (resetRequest) {
    // Mark temp password as used
    await supabaseClient
      .from('password_reset_requests')
      .update({
        temp_password_used: true,
        temp_password_used_at: new Date().toISOString()
      })
      .eq('id', resetRequest.id);

    // Create password reset session
    const sessionToken = generateSessionToken();
    await supabaseClient
      .from('password_reset_sessions')
      .insert({
        user_id: resetRequest.user_id,
        session_token: sessionToken,
        request_id: resetRequest.id,
        session_status: 'active',
        password_change_required: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString()
      });

    return {
      success: true,
      requiresPasswordChange: true,
      sessionToken: sessionToken,
      tempPasswordUsed: true,
      message: 'Temporary password accepted. Please change your password.'
    };
  }

  // Continue with normal login...
  return { success: false, message: 'Invalid credentials' };
}
```

#### B. Frontend Login Enhancement
```typescript
// Updated LoginPage component
const handlePasswordResetLogin = async (email: string, password: string) => {
  try {
    const result = await supabase.functions.invoke('password-reset-session/validate-login', {
      body: { email, password }
    });

    if (result.data?.success) {
      if (result.data.tempPasswordUsed) {
        // Show temporary password login success
        setLoginMessage({
          type: 'success',
          text: `Welcome back! Your temporary password was accepted. Please change your password to continue.`,
          showPasswordChange: true,
          sessionToken: result.data.sessionToken
        });
      } else {
        // Normal login success
        navigateToDashboard();
      }
    } else {
      setError('Invalid email or password');
    }
  } catch (error) {
    setError('Login failed. Please try again.');
  }
};
```

## Implementation Priority

1. **Phase 1:** Database schema updates (email tracking tables)
2. **Phase 2:** Email notification system integration
3. **Phase 3:** Enhanced admin approval with email
4. **Phase 4:** Login flow enhancements
5. **Phase 5:** Frontend UI updates

## Email Service Integration

Replace the `sendEmailViaService` function with your preferred email service:

- **Supabase Edge Functions + Resend**
- **SendGrid API**
- **AWS SES**
- **Mailgun**
- **Postmark**

## Testing Strategy

1. **Email Delivery Testing:** Verify all email types are sent correctly
2. **Status Tracking:** Confirm email status is updated in database
3. **Login Flow:** Test temporary password login and password change
4. **Admin Workflow:** Test complete admin approval → email → user login flow
5. **Error Handling:** Test failed email delivery scenarios

## Security Considerations

1. **Email Content:** Never include sensitive data in email subjects
2. **Temporary Passwords:** Implement proper expiration and single-use policies
3. **Rate Limiting:** Prevent abuse of password reset requests
4. **Audit Logging:** Track all email sends and login attempts
5. **Session Management:** Secure session token generation and validation

---

*This enhanced password reset system provides comprehensive email-based status tracking and seamless user experience while maintaining security standards.*