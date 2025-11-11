# Exact Vercel Deployment Form Inputs

## When importing the project from GitHub

### **Step 1: Project Setup**
**Project Name**: `edu-quiz-platform-v2` (or any name you prefer)

### **Step 2: Framework Preset**
**Select**: `Vite` (or select "Other" if Vite is not visible)

### **Step 3: Root Directory**
**Input**: `/` (just a forward slash - the repository root)

### **Step 4: Build Command**
**Input**: Leave empty (Vercel will use the `buildCommand` from `vercel.json`)

### **Step 5: Output Directory**
**Input**: Leave empty (Vercel will use the `outputDirectory` from `vercel.json`)

### **Step 6: Development Command**
**Input**: Leave empty (Vercel will use the `devCommand` from `vercel.json`)

## Environment Variables Section
**Add these environment variables** (click "Add New" for each):

### **Environment 1: Production**
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://wfolyzksvsfvshxxcjhs.supabase.co`
- **Environment**: Production

### **Environment 2: Production**
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmb2x5emtzdnNmdnNoeHhjamhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDExMjUsImV4cCI6MjA3Nzc3NzEyNX0.tjkCBczOnejg7xnb8NLdd_6VtpD1h-ACbnhOERG5jfQ`
- **Environment**: Production

### **Environment 3: Production**
- **Key**: `VITE_GOOGLE_AI_API_KEY`
- **Value**: `AIzaSyCynQ6zvnvu9EKIqRqc-i-CSQjALl_ojLA`
- **Environment**: Production

### **Environment 4: Production**
- **Key**: `VITE_GEMINI_AI_API_KEY`
- **Value**: `AIzaSyDgH21lSt98iYFvnfARHx20IAebcql7tvc`
- **Environment**: Production

### **Environment 5: Production**
- **Key**: `VITE_APP_NAME`
- **Value**: `Educational Quiz Platform`
- **Environment**: Production

### **Environment 6: Production**
- **Key**: `VITE_APP_VERSION`
- **Value**: `1.0.0`
- **Environment**: Production

### **Environment 7: Preview**
**Repeat the same 6 variables above but set "Environment" to "Preview"**

### **Environment 8: Development**
**Repeat the same 6 variables above but set "Environment" to "Development"**

## Advanced Settings (if available)

### **Build Output Settings**
**Click "Advanced" or "More Settings"** and ensure:
- **Build Command**: Leave empty (will use `vercel.json`)
- **Install Command**: Leave empty (will use `vercel.json`)
- **Output Directory**: Leave empty (will use `vercel.json`)

### **Git Repository**
**Connected Repository**: `EduQuiz-Platform/edu-quiz-platform-v2`

### **Branch**
**Main Branch**: `main` (this should be selected by default)

### **Region** (if prompted)
**Select**: Closest region to your location (or leave default)

## Important Notes:
1. **Do NOT manually override** the build settings if you see auto-filled values from `vercel.json`
2. **Set all environment variables** for all three environments (Production, Preview, Development)
3. **Root directory MUST be `/`** (not `/frontend`)
4. **Vercel will auto-detect** most settings from the `vercel.json` file

## Final Step:
Click **"Deploy"** - Vercel will automatically build and deploy your project using the configuration from the repository.