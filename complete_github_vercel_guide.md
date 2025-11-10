# 🚀 GitHub + Vercel Deployment - Step-by-Step Guide

## Step 1: Create GitHub Repository

1. **Go to GitHub**: https://github.com
2. **Click "New repository"** (green button)
3. **Repository settings**:
   - **Repository name**: `edu-quiz-platform`
   - **Description**: `Educational Quiz Platform - AI-Powered Learning System with PWA`
   - **Public** (or Private if you prefer)
   - **DO NOT check "Add a README file"** (we have existing code)
4. **Click "Create repository"**

## Step 2: Upload Your Project to GitHub

### Method A: Using Git Commands (Recommended)

After creating the repository, you'll see a page with git commands. Here's what to run:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Add the remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/edu-quiz-platform.git

# Push your code to GitHub
git push -u origin main
```

### Method B: Using GitHub Desktop (Alternative)

1. **Download GitHub Desktop**: https://desktop.github.com/
2. **Clone your repository**: File → Clone Repository → URL
3. **Copy all files** from this workspace to your cloned repository folder
4. **Commit and push**: Commit the changes and push to GitHub

### Method C: Using GitHub Web Interface (Quick Upload)

1. **Go to your repository on GitHub**
2. **Click "uploading an existing file"**
3. **Drag and drop files** (this may take a while for large projects)
4. **Commit directly to main branch**

## Step 3: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/dashboard
2. **Click "New Project"**
3. **Import from GitHub**: Select your `edu-quiz-platform` repository
4. **Configure project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if repository has both frontend and backend)
   - **Build Command**: `npm run build:prod:no-check`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

## Step 4: Set Environment Variables (CRITICAL)

In your Vercel project dashboard:
1. **Go to Settings → Environment Variables**
2. **Add these 4 variables**:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://wfolyzksvsfvshxxcjhs.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | **Your Supabase anon key** | All |
| `VITE_GEMINI_AI_API_KEY` | **Your Gemini AI key** | All |
| `VITE_GOOGLE_AI_API_KEY` | **Your Google AI key** | All |

### How to get your Supabase Anon Key:
1. Go to: https://supabase.com/dashboard
2. Select project: **wfolyzksvsfvshxxcjhs**
3. Click **Settings** → **API**
4. Copy the **anon** / **public** key (starts with `eyJ...`)

**⚠️ IMPORTANT**: Use the **anon key**, NOT the service role key!

## Step 5: Deploy

1. **Click "Deploy"** in Vercel
2. **Wait 2-3 minutes** for build to complete
3. **Get your live URL!** (e.g., `https://edu-quiz-platform-abc123.vercel.app`)

---

## 🔧 Project Structure

Your repository will contain:
```
edu-quiz-platform/
├── frontend/                    # Main React application
│   ├── src/                    # Source code
│   ├── public/                 # Static assets
│   ├── package.json           # Dependencies
│   └── vercel.json            # Vercel configuration
├── supabase/                   # Backend functions
├── docs/                      # Documentation
├── scripts/                   # Deployment scripts
└── deployment-package/        # Production-ready package
```

---

## 📋 What You're Deploying

✅ **Complete Educational Platform**:
- Role-based dashboards (Student, Instructor, Admin)
- AI-powered essay grading with Gemini
- AI-generated quiz questions
- PWA capabilities (installable app)
- Password reset system with admin approval
- Real-time messaging and notifications
- Comprehensive user management
- Course and lesson management
- Assignment submission and grading
- Progress tracking and analytics

✅ **Production Features**:
- 530+ dependencies installed
- TypeScript for type safety
- Tailwind CSS for styling
- Supabase for backend services
- Vercel-optimized build configuration
- Service worker for offline functionality
- Security headers configured
- Performance optimizations

---

## 🧪 Testing Your Live URL

Once deployed, test these features:

### 🎓 Student Features
- [ ] Registration and login
- [ ] Course enrollment and browsing
- [ ] AI-generated quiz taking
- [ ] Assignment submission
- [ ] Progress tracking
- [ ] Grade viewing
- [ ] Discussion participation

### 👨‍💼 Instructor Features
- [ ] Course creation and management
- [ ] Lesson content creation
- [ ] Assignment creation
- [ ] AI-powered essay grading
- [ ] Student progress monitoring
- [ ] Gradebook management
- [ ] Announcements

### 👑 Admin Features
- [ ] User management (create, edit, delete)
- [ ] Role assignment (Student/Instructor/Admin)
- [ ] Password reset approvals
- [ ] System analytics and reports
- [ ] Bulk user operations
- [ ] Question management
- [ ] Course oversight

### 📱 PWA Features
- [ ] Install prompt appears
- [ ] App installs on mobile/desktop
- [ ] Works offline (basic functionality)
- [ ] Fast loading (< 3 seconds)
- [ ] App-like experience

### 🤖 AI Features
- [ ] Quiz generation from text
- [ ] Essay grading with detailed feedback
- [ ] Intelligent question difficulty
- [ ] Personalized learning recommendations

---

## 🚨 Troubleshooting

### Build Fails
- **Check environment variables** are all set correctly
- **Verify Supabase URL** is exactly: `https://wfolyzksvsfvshxxcjhs.supabase.co`
- **Ensure anon key** format starts with `eyJ`

### Database Connection Issues
- **Check Supabase project** is active
- **Verify RLS policies** are configured
- **Test simple query** first

### PWA Not Working
- **Must be on HTTPS** (Vercel provides this)
- **Check browser console** for errors
- **Try incognito mode**

### Authentication Issues
- **Verify all environment variables** are set
- **Check Supabase anon key** is correct
- **Ensure project is published** in Supabase

---

## 🎯 Success!

Once deployed, you'll have:
- **Live URL** for testing all features
- **PWA app** installable on any device
- **Full AI integration** for grading and quiz generation
- **Complete role-based access** control
- **Production-ready** performance and security

**🚀 Ready to deploy? Start with Step 1 (creating the GitHub repository)!**
