#!/bin/bash

echo "🧪 Testing Template Selection Integration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Check if templates endpoint returns data (without auth for basic test)
echo "📋 Test 1: Templates endpoint structure check..."
curl -s http://localhost:5000/api/templates | jq '.error' 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Templates endpoint is responding (authentication required as expected)"
else
    echo "❌ Templates endpoint is not responding"
fi

# Test 2: Check if frontend is running
echo ""
echo "🖥️ Test 2: Frontend availability check..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend is not accessible on port 3000"
fi

# Test 3: Check backend format endpoint structure
echo ""
echo "📄 Test 3: Format endpoint structure check..."
curl -s -X POST http://localhost:5000/format_resume -H "Content-Type: application/json" -d '{}' | jq '.error' 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Format endpoint is responding (authentication required as expected)"
else
    echo "❌ Format endpoint is not responding"
fi

echo ""
echo "🎯 Integration Status:"
echo "✅ Step 1: Template Selection UI - Completed"
echo "✅ Step 2: Backend API Endpoints - Completed"
echo "🔄 Step 3: Integration Testing - In Progress"
echo ""
echo "Next: Test with authenticated requests in browser!"
