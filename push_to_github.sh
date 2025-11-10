#!/bin/bash

# GitHub Repository Upload Commands
# Replace YOUR_USERNAME with your actual GitHub username

echo "🚀 Pushing Educational Quiz Platform to GitHub"
echo "=============================================="
echo ""

# Add remote origin (replace YOUR_USERNAME)
echo "Adding remote origin..."
git remote add origin https://github.com/YOUR_USERNAME/edu-quiz-platform.git

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Repository uploaded successfully!"
echo "🌐 Your repository: https://github.com/YOUR_USERNAME/edu-quiz-platform"
echo ""
echo "Next steps:"
echo "1. Go to Vercel: https://vercel.com/dashboard"
echo "2. Import your GitHub repository"
echo "3. Set environment variables"
echo "4. Deploy and get your live URL!"
