# EspacoPessoal Docs - Vercel Deployment Guide

This guide covers deploying the collaborative editor with:
- **Server**: `socket.espacopessoal.com:6001`
- **Client**: `docs.espacopessoal.com` (Vercel)

## 🚀 Quick Deployment

### 1. Server Deployment (`socket.espacopessoal.com:6001`)

#### Configure Server Environment
```bash
# Copy and edit server configuration
cp server/config.example.env server/.env
```

Edit `server/.env`:
```env
PORT=6001
HOST=0.0.0.0
NODE_ENV=production
SERVER_NAME=EspacoPessoal Docs Server
MAX_CONNECTIONS=100
TIMEOUT=30000
CORS_ORIGIN=https://docs.espacopessoal.com
```

#### Deploy Server
```bash
# Install dependencies
cd server
bun install

# Start server
bun start
```

The server will be accessible at `socket.espacopessoal.com:6001`

### 2. Client Deployment (Vercel)

#### Configure Client Environment
```bash
# Copy and edit client configuration
cp client/config.example.env client/.env.local
```

Edit `client/.env.local`:
```env
NEXT_PUBLIC_NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://docs.espacopessoal.com
NEXT_PUBLIC_WS_URL=wss://socket.espacopessoal.com:6001
NEXT_PUBLIC_WS_HOST=socket.espacopessoal.com
NEXT_PUBLIC_WS_PORT=6001
NEXT_PUBLIC_APP_NAME=EspacoPessoal Docs
NEXT_PUBLIC_DOCUMENT_NAME=shared-document
NEXT_PUBLIC_ENABLE_COLLABORATION=true
NEXT_PUBLIC_ENABLE_PERSISTENCE=true
```

#### Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from client directory
cd client
vercel --prod
```

**Option B: Using Git Integration**
1. Connect your repository to Vercel
2. Set the root directory to `client`
3. Environment variables will be automatically loaded from `vercel.json`

#### Custom Domain Setup
In your Vercel dashboard:
1. Go to Project Settings → Domains
2. Add custom domain: `docs.espacopessoal.com`
3. Follow DNS configuration instructions

## 🔧 DNS Configuration

### For Server (`socket.espacopessoal.com`)
Add an A record pointing to your server's IP:
```
A socket.espacopessoal.com → YOUR_SERVER_IP
```

### For Client (`docs.espacopessoal.com`)
Vercel will provide instructions for:
- CNAME record for `docs.espacopessoal.com`
- SSL certificate will be automatically provisioned

## 🛡️ SSL/TLS Configuration

### Server SSL (Required for WSS)
Since the client uses `wss://` (secure WebSocket), your server needs SSL:

**Option A: Using Nginx Reverse Proxy**
```nginx
server {
    listen 443 ssl;
    server_name socket.espacopessoal.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    location / {
        proxy_pass http://localhost:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option B: Using Cloudflare**
1. Add `socket.espacopessoal.com` to Cloudflare
2. Enable "Flexible SSL" 
3. The server can run on HTTP, Cloudflare handles SSL termination

## 🐳 Docker Deployment (Alternative)

Update `docker-compose.yml` for production:
```yaml
version: '3.8'

services:
  server:
    build: ./server
    ports:
      - "6001:6001"
    environment:
      - PORT=6001
      - NODE_ENV=production
      - SERVER_NAME=EspacoPessoal Docs Server
      - CORS_ORIGIN=https://docs.espacopessoal.com
    restart: unless-stopped
```

## 🔍 Testing the Deployment

### Test Server
```bash
# Check server health
curl -f http://socket.espacopessoal.com:6001

# Test WebSocket (using websocat)
websocat wss://socket.espacopessoal.com:6001
```

### Test Client
1. Visit `https://docs.espacopessoal.com`
2. Check browser console for connection status
3. Test collaborative editing in multiple tabs

## 📊 Monitoring

### Server Monitoring
```bash
# View server logs
tail -f server/logs/hocuspocus.log

# Check server processes
ps aux | grep bun
```

### Client Monitoring
- Use Vercel Analytics dashboard
- Monitor Web Vitals in Vercel
- Check browser console for WebSocket connection status

## 🐛 Troubleshooting

### WebSocket Connection Issues
1. **Mixed Content Error**: Ensure server uses HTTPS/WSS
2. **CORS Errors**: Check server CORS configuration
3. **Connection Timeout**: Verify server is accessible on port 6001

### Common Commands
```bash
# Check port usage
lsof -i :6001

# Test DNS resolution
nslookup socket.espacopessoal.com
nslookup docs.espacopessoal.com

# Check SSL certificate
openssl s_client -connect socket.espacopessoal.com:443
```

## 📋 Pre-Deployment Checklist

### Server
- [ ] Server configured with correct port (6001)
- [ ] CORS headers set for Vercel domain
- [ ] SSL certificate installed
- [ ] DNS A record configured
- [ ] Firewall allows port 6001

### Client
- [ ] Environment variables configured
- [ ] WebSocket URL uses `wss://`
- [ ] Vercel project configured
- [ ] Custom domain added to Vercel
- [ ] DNS configured for custom domain

## 🚀 Go Live Commands

### Server
```bash
cd server
cp config.example.env .env
# Edit .env with production values
bun install
bun start
```

### Client
```bash
cd client
cp config.example.env .env.local
# Edit .env.local with production values
vercel --prod
```

Your collaborative editor will be live at:
- **Client**: https://docs.espacopessoal.com
- **Server**: wss://socket.espacopessoal.com:6001

## 🔐 Security Notes

- Server uses CORS to restrict access to your domain
- Vercel provides automatic HTTPS/SSL
- Consider adding rate limiting for production use
- Monitor server logs for unusual activity

## 📞 Support

For deployment issues:
1. Check server logs for errors
2. Verify DNS resolution
3. Test WebSocket connection directly
4. Check Vercel function logs 