#!/bin/bash

# Google Docs Clone Deployment Script

echo "🚀 Starting deployment process..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    exit 1
fi

# Create environment files if they don't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server .env file..."
    cp server/config.example.env server/.env
    echo "✅ Please edit server/.env with your production values"
fi

if [ ! -f "client/.env.local" ]; then
    echo "📝 Creating client .env.local file..."
    cp client/config.example.env client/.env.local
    echo "✅ Please edit client/.env.local with your production values"
fi

# Install dependencies
echo "📦 Installing server dependencies..."
cd server
bun install

echo "📦 Installing client dependencies..."
cd ../client
bun install

# Build the client
echo "🔨 Building client application..."
bun run build

# Create logs directory for server
mkdir -p ../server/logs

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit server/.env with your production values"
echo "2. Edit client/.env.local with your production values"
echo "3. Start the server: cd server && bun start"
echo "4. Start the client: cd client && bun run start"
echo ""
echo "🌐 Your collaborative editor will be available at:"
echo "   - Server: http://localhost:3000"
echo "   - Client: http://localhost:3001" 