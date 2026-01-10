#!/bin/bash
# CORS Debugging Script for Safety Companion V3
# This script tests CORS from different origins and shows exactly what's happening

echo "🔍 Testing CORS Configuration for Safety Companion V3"
echo "===================================================="
echo ""

# Backend URL
BACKEND="https://safety-compv3.onrender.com"

# Test origins
ORIGINS=(
  "https://safety-compv3.vercel.app"
  "http://localhost:3000"
  "https://safety-compv3-git-main-heybatlle1.vercel.app"
)

echo "Backend: $BACKEND"
echo ""

for origin in "${ORIGINS[@]}"; do
  echo "---------------------------------------------------"
  echo "Testing origin: $origin"
  echo "---------------------------------------------------"

  echo "1. Simple GET request (no CORS needed):"
  curl -s "$BACKEND/health" | head -1
  echo ""

  echo "2. OPTIONS preflight for POST /api/v1/jha/analyze:"
  curl -X OPTIONS \
    -H "Origin: $origin" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type" \
    -i "$BACKEND/api/v1/jha/analyze" 2>&1 | grep -E "(HTTP/|access-control|allow:)"
  echo ""

  echo "3. Actual POST request with Origin header:"
  curl -X POST \
    -H "Origin: $origin" \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}' \
    -i "$BACKEND/api/v1/jha/analyze" 2>&1 | grep -E "(HTTP/|access-control)" | head -5
  echo ""
  echo ""
done

echo "===================================================="
echo "✅ CORS Test Complete"
echo ""
echo "🔧 Next Steps if CORS is still failing:"
echo "1. Check Render Environment Variables"
echo "2. Clear browser cache (Cmd+Shift+R)"
echo "3. Try Incognito/Private window"
echo "4. Check browser DevTools → Network tab for actual error"
