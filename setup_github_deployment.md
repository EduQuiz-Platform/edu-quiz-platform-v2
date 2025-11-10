# Quick GitHub + Vercel Deployment Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com and create a new repository named "edu-quiz-platform"
2. Do NOT initialize with README (we have existing code)

## Step 2: Upload Your Project

```bash
# In your local terminal, navigate to the project
cd /path/to/your/edu-quiz-platform

# Initialize git and add files
git init
git add .
git commit -m "Initial commit: Educational Quiz Platform"

# Connect to GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/edu-quiz-platform.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if repository has both frontend and backend)
   - **Build Command**: `npm run build:prod:no-check`
   - **Output Directory**: `dist`
5. Add Environment Variables (see below)

## Step 4: Environment Variables in Vercel

In your Vercel project dashboard, go to Settings > Environment Variables and add:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://wfolyzksvsfvshxxcjhs.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | All |
| `VITE_GEMINI_AI_API_KEY` | Your Gemini AI key | All |
| `VITE_GOOGLE_AI_API_KEY` | Your Google AI key | All |

**Note**: You need to get your Supabase anon key from your Supabase project dashboard (Settings > API > anon public key).

## Step 5: Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete (2-3 minutes)
3. Get your live URL!

## Your Live URL Will Look Like:
`https://edu-quiz-platform-abc123.vercel.app`

---

## 🚀 Automated Deployment Script

I've created an automated script that you can run locally:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

This will:
1. Validate environment
2. Install dependencies
3. Build project
4. Deploy to Vercel
5. Run health checks
6. Provide your live URL

## 📋 What You Can Test

Once deployed, test these features:

### 🎓 **Student Features**
- [ ] User registration and login
- [ ] Course enrollment
- [ ] Quiz taking with AI-generated questions
- [ ] Real-time progress tracking
- [ ] Grade viewing and history

### 👨‍💼 **Instructor Features**  
- [ ] Course creation and management
- [ ] Assignment creation
- [ ] AI-powered essay grading
- [ ] Student progress monitoring
- [ ] Gradebook management

### 👑 **Admin Features**
- [ ] User management (create, edit, delete users)
- [ ] Role assignment (Student, Instructor, Admin)
- [ ] Password reset approvals
- [ ] System analytics and reports
- [ ] Course and lesson oversight

### 📱 **PWA Features**
- [ ] Install as app on mobile/desktop
- [ ] Offline functionality
- [ ] Fast loading
- [ ] Push notifications

### 🤖 **AI Features**
- [ ] Quiz generation from text
- [ ] Essay grading with feedback
- [ ] Personalized learning paths
- [ ] Intelligent question difficulty

## 🆘 Troubleshooting

### Build Fails
- Check that all environment variables are set
- Ensure Supabase URL is correct
- Verify your Supabase anon key is valid

### Database Connection Issues
- Check Supabase project is active
- Verify RLS policies are configured
- Ensure service role key has proper permissions

### PWA Not Working
- Test on HTTPS (required for PWA)
- Check browser console for service worker errors
- Verify manifest.json is loading

---

**🎉 Ready to deploy? Follow the steps above and you'll have a live URL in minutes!**
