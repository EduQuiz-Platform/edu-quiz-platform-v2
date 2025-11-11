# PWA Icon Generation Script
# This script generates all required PWA icons using ImageMagick (if available)
# or creates placeholder files that can be replaced with actual icons

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "ImageMagick found - generating icons..."
    
    # Generate base icon (512x512)
    convert -size 512x512 xc:"#2563eb" -fill white -gravity center -pointsize 200 -annotate +0+0 "EQ" /workspace/frontend/public/icons/icon-512x512.png
    
    # Generate all required sizes
    for size in 72 96 128 144 152 192 384; do
        convert /workspace/frontend/public/icons/icon-512x512.png -resize ${size}x${size} /workspace/frontend/public/icons/icon-${size}x${size}.png
    done
    
    echo "PWA icons generated successfully!"
else
    echo "ImageMagick not found - creating placeholder files..."
    touch /workspace/frontend/public/icons/icon-{72,96,128,144,152,192,384,512}x{72,96,128,144,152,192,384,512}.png
    echo "Placeholder icon files created. Replace with actual icons for production."
fi

# Create screenshot placeholders
for screenshot in desktop-home mobile-dashboard; do
    touch "/workspace/frontend/public/screenshots/${screenshot}.png"
done

# Create shortcut icons
for shortcut in dashboard quiz messages; do
    touch "/workspace/frontend/public/icons/shortcut-${shortcut}.png"
done

echo "PWA assets setup complete!"