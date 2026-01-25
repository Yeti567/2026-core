#!/bin/bash
# Start server and run tests

echo "🚀 Starting server and running comprehensive tests..."
echo ""

# Start server in background
echo "Starting Next.js dev server..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
for i in {1..60}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

# Run tests
echo ""
echo "Running comprehensive tests..."
npx tsx scripts/comprehensive-test.ts

# Keep server running
echo ""
echo "Server is running. Press Ctrl+C to stop."
wait $SERVER_PID
