# EduQuiz Platform V2 - Vercel Deployment Guide

## Repository Information
- **GitHub Repository**: https://github.com/EduQuiz-Platform/edu-quiz-platform-v2
- **Branch**: main
- **Status**: ✅ Code pushed successfully

## Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import the GitHub repository: `EduQuiz-Platform/edu-quiz-platform-v2`
4. **Important**: When importing, set the root directory to the repository root (not frontend/)

### 2. Project Configuration
The repository contains a complete `vercel.json` file with the following configuration:
```json
{
  "framework": "vite",
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. Environment Variables
Set these environment variables in Vercel dashboard:

#### Required Environment Variables
```
VITE_SUPABASE_URL=https://wfolyzksvsfvshxxcjhs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmb2x5emtzdnNmdnNoeHhjamhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDExMjUsImV4cCI6MjA3Nzc3NzEyNX0.tjkCBczOnejg7xnb8NLdd_6VtpD1h-ACbnhOERG5jfQ
VITE_GOOGLE_AI_API_KEY=AIzaSyCynQ6zvnvu9EKIqRqc-i-CSQjALl_ojLA
VITE_GEMINI_AI_API_KEY=AIzaSyDgH21lSt98iYFvnfARHx20IAebcql7tvc
VITE_APP_NAME=Educational Quiz Platform
VITE_APP_VERSION=1.0.0
```

### 4. Build Configuration
Vercel will automatically detect the framework as "Vite" and use the configurations in `vercel.json`.

### 5. Deploy
Click "Deploy" - Vercel will:
1. Clone the repository
2. Install dependencies
3. Build the frontend using Vite
4. Deploy with proper SPA routing

### 6. Post-Deployment Verification
After deployment, verify:
- ✅ Main page loads correctly
- ✅ `/login` route works (no 404 errors)
- ✅ `/register` route works
- ✅ Environment variables are loaded
- ✅ Supabase authentication works

## Project Structure
```
/
├── frontend/                 # React + Vite application
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies
│   ├── vercel.json          # Deployment config
│   └── vite.config.ts       # Vite configuration
├── supabase/                # Database functions & migrations
│   ├── functions/           # Edge functions
│   └── migrations/          # Database schema
└── README.md               # Project documentation
```

## Key Features
- ✅ React 18 + TypeScript
- ✅ Vite build system
- ✅ TailwindCSS styling
- ✅ Supabase authentication
- ✅ AI-powered grading (Gemini & Google AI)
- ✅ Admin dashboard
- ✅ Student/Teacher roles
- ✅ Quiz management
- ✅ PWA support
- ✅ Mobile responsive

## Troubleshooting
If `/login` or other routes return 404:
1. Verify `vercel.json` has the correct rewrites
2. Check environment variables are set
3. Ensure the project is connected to the correct GitHub repository
4. Check Vercel deployment logs for build errors

## Next Steps
After successful deployment:
1. Test all authentication flows
2. Verify AI grading functionality
3. Test admin dashboard features
4. Check mobile responsiveness
5. Set up custom domain if needed