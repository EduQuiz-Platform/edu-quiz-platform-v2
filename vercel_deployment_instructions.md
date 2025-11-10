# Vercel Deployment Instructions - ZIP Upload

## Method 1: Direct ZIP Upload (Recommended)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "New Project"**
3. **Look for "Deploy from ZIP" option** or try dragging the ZIP file onto the page
4. **Upload**: `edu-quiz-platform-vercel-deploy.zip`

## Method 2: GitHub Alternative (If ZIP doesn't work)

1. **Create GitHub repo**: https://github.com/new
   - Repository name: `edu-quiz-platform`
   - **Don't** initialize with README
2. **Extract ZIP contents** and upload to GitHub
3. **Import in Vercel**: https://vercel.com/dashboard → "New Project" → Import from GitHub

## Method 3: Vercel CLI (Alternative)

If you have Vercel CLI installed:

```bash
# Extract and navigate to frontend directory
cd edu-quiz-platform/frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Environment Variables Setup

**In Vercel Dashboard > Settings > Environment Variables:**

```
VITE_SUPABASE_URL=https://wfolyzksvsfvshxxcjhs.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
VITE_GEMINI_AI_API_KEY=YOUR_GEMINI_AI_KEY_HERE
VITE_GOOGLE_AI_API_KEY=YOUR_GOOGLE_AI_KEY_HERE
```

**Get Supabase Anon Key:**
1. https://supabase.com/dashboard
2. Select project: wfolyzksvsfvshxxcjhs
3. Settings > API
4. Copy the **anon** / **public** key (not service_role)

## Build Configuration

**These should auto-detect, but verify:**
- Framework: Vite
- Build Command: `npm run build:prod:no-check`
- Output Directory: `dist`
- Install Command: `npm install`

## Success!

After deployment, you'll get a URL like:
`https://edu-quiz-platform-abc123.vercel.app`

Test all features immediately!

## Troubleshooting

**Build Fails:**
- Check environment variables are set correctly
- Ensure Supabase URL is exactly: `https://wfolyzksvsfvshxxcjhs.supabase.co`
- Verify anon key format starts with `eyJ`

**Database Connection Issues:**
- Check Supabase project is active
- Verify RLS policies exist
- Test with simple query first

**PWA Not Working:**
- Must be on HTTPS (Vercel provides this)
- Check browser console for errors
- Try incognito mode
