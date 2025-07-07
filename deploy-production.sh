#!/bin/bash

# EspacoPessoal Docs - Production Deployment Script
# Server: socket.espacopessoal.com:6001
# Client: docs.espacopessoal.com (Vercel)

echo "🚀 EspacoPessoal Docs - Production Deployment"
echo "============================================="

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    exit 1
fi

# Function to create server environment
setup_server() {
    echo ""
    echo "🔧 Setting up server configuration..."
    
    # Create server .env if it doesn't exist
    if [ ! -f "server/.env" ]; then
        cp server/config.example.env server/.env
        echo "✅ Created server/.env from template"
        
        # Update with production values
        sed -i.bak 's/PORT=3000/PORT=6001/' server/.env
        sed -i.bak 's/HOST=127.0.0.1/HOST=0.0.0.0/' server/.env
        sed -i.bak 's/SERVER_NAME=Google Docs Clone Server/SERVER_NAME=EspacoPessoal Docs Server/' server/.env
        sed -i.bak 's/CORS_ORIGIN=\*/CORS_ORIGIN=https:\/\/docs.espacopessoal.com/' server/.env
        rm server/.env.bak 2>/dev/null || true
        
        echo "✅ Updated server/.env with production values"
    else
        echo "ℹ️  server/.env already exists"
    fi
    
    # Install server dependencies
    echo "📦 Installing server dependencies..."
    cd server
    bun install
    cd ..
    
    # Create logs directory
    mkdir -p server/logs
    
    echo "✅ Server setup complete"
}

# Function to setup client environment
setup_client() {
    echo ""
    echo "🔧 Setting up client configuration..."
    
    # Create client .env.local if it doesn't exist
    if [ ! -f "client/.env.local" ]; then
        cp client/config.example.env client/.env.local
        echo "✅ Created client/.env.local from template"
        
        # Update with production values
        sed -i.bak 's|NEXT_PUBLIC_WS_URL=ws://your-domain.com:3000|NEXT_PUBLIC_WS_URL=wss://socket.espacopessoal.com:6001|' client/.env.local
        sed -i.bak 's/NEXT_PUBLIC_WS_HOST=your-domain.com/NEXT_PUBLIC_WS_HOST=socket.espacopessoal.com/' client/.env.local
        sed -i.bak 's/NEXT_PUBLIC_WS_PORT=3000/NEXT_PUBLIC_WS_PORT=6001/' client/.env.local
        sed -i.bak 's/NEXT_PUBLIC_APP_NAME=Google Docs Clone/NEXT_PUBLIC_APP_NAME=EspacoPessoal Docs/' client/.env.local
        sed -i.bak 's/NEXT_PUBLIC_DOCUMENT_NAME=example-document/NEXT_PUBLIC_DOCUMENT_NAME=shared-document/' client/.env.local
        rm client/.env.local.bak 2>/dev/null || true
        
        echo "✅ Updated client/.env.local with production values"
    else
        echo "ℹ️  client/.env.local already exists"
    fi
    
    # Install client dependencies
    echo "📦 Installing client dependencies..."
    cd client
    bun install
    cd ..
    
    echo "✅ Client setup complete"
}

# Function to show deployment instructions
show_instructions() {
    echo ""
    echo "📋 Deployment Instructions"
    echo "=========================="
    echo ""
    echo "🖥️  SERVER DEPLOYMENT (socket.espacopessoal.com:6001)"
    echo "1. Copy the 'server' folder to your server"
    echo "2. Make sure port 6001 is open in your firewall"
    echo "3. Set up SSL certificate for socket.espacopessoal.com"
    echo "4. Start the server:"
    echo "   cd server && bun start"
    echo ""
    echo "🌐 CLIENT DEPLOYMENT (docs.espacopessoal.com)"
    echo "1. Install Vercel CLI: npm i -g vercel"
    echo "2. Deploy to Vercel:"
    echo "   cd client && vercel --prod"
    echo "3. Configure custom domain in Vercel dashboard"
    echo "4. Add 'docs.espacopessoal.com' to your project"
    echo ""
    echo "🔧 DNS CONFIGURATION"
    echo "Add these DNS records:"
    echo "A     socket.espacopessoal.com → YOUR_SERVER_IP"
    echo "CNAME docs.espacopessoal.com   → [Vercel will provide]"
    echo ""
    echo "🛡️  SSL CERTIFICATES"
    echo "Server needs SSL for WSS connections. Options:"
    echo "- Use Cloudflare (recommended for easy setup)"
    echo "- Use Let's Encrypt with Nginx reverse proxy"
    echo "- Use your hosting provider's SSL"
    echo ""
    echo "✅ Ready to deploy!"
}

# Main execution
echo "Starting deployment setup..."

# Setup server
setup_server

# Setup client  
setup_client

# Show instructions
show_instructions

echo ""
echo "🎉 Deployment setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and edit server/.env if needed"
echo "2. Review and edit client/.env.local if needed"  
echo "3. Follow the deployment instructions above"
echo ""
echo "For detailed instructions, see VERCEL_DEPLOYMENT.md" 