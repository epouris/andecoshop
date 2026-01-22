#!/bin/bash

# Setup script to organize files for deployment

echo "Setting up project structure..."

# Create public directory if it doesn't exist
mkdir -p public

# Move frontend files to public directory
echo "Moving frontend files to public directory..."

# Move HTML files
mv *.html public/ 2>/dev/null || true

# Move JS directory
if [ -d "js" ]; then
    mv js public/ 2>/dev/null || true
fi

# Move styles directory
if [ -d "styles" ]; then
    mv styles public/ 2>/dev/null || true
fi

# Move other assets
mv logo.png public/ 2>/dev/null || true
mv *.png public/ 2>/dev/null || true
mv *.jpg public/ 2>/dev/null || true
mv *.jpeg public/ 2>/dev/null || true
mv *.svg public/ 2>/dev/null || true

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Create .env file with your database URL"
echo "3. Run: node init-db.js"
echo "4. Start server: npm start"
