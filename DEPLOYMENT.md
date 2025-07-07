# Google Docs Clone - Deployment Guide

This guide will help you deploy the collaborative editor application to a test or production server.

## 🏗️ Architecture

The application consists of two main components:

- **Server** (`/server`): Hocuspocus WebSocket server for real-time collaboration
- **Client** (`/client`): Next.js frontend application

## 🚀 Quick Deploy

### 1. Using the Deployment Script

Make the deployment script executable and run it:

```bash
chmod +x deploy.sh
./deploy.sh
```

### 2. Configure Environment Variables

#### Server Configuration (`server/.env`)

```env
# Required
PORT=3000
NODE_ENV=production
SERVER_NAME=Google Docs Clone Server

# Optional
MAX_CONNECTIONS=100
TIMEOUT=30000
LOG_LEVEL=info
```

#### Client Configuration (`client/.env.local`)

```env
# Required
NEXT_PUBLIC_WS_URL=ws://your-domain.com:3000
NEXT_PUBLIC_APP_NAME=Google Docs Clone

# Optional
NEXT_PUBLIC_DOCUMENT_NAME=example-document
NEXT_PUBLIC_ENABLE_COLLABORATION=true
```

### 3. Start the Applications

```bash
# Start the server
cd server && bun start

# Start the client (in a new terminal)
cd client && bun run start
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build server
docker build -t google-docs-server ./server

# Build client
docker build -t google-docs-client ./client

# Run server
docker run -d -p 3000:3000 --name server google-docs-server

# Run client
docker run -d -p 3001:3000 --name client google-docs-client
```

## 🌐 Production Deployment

### Environment Variables for Production

Update these variables for your production environment:

#### Server (`server/.env`)
```env
PORT=3000
NODE_ENV=production
SERVER_NAME=Your App Name
MAX_CONNECTIONS=500
TIMEOUT=30000
```

#### Client (`client/.env.local`)
```env
NEXT_PUBLIC_NODE_ENV=production
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
NEXT_PUBLIC_APP_NAME=Your App Name
NEXT_PUBLIC_DOCUMENT_NAME=shared-document
```

### SSL/TLS Configuration

For production, you'll need to configure SSL certificates:

1. **Option A: Use a reverse proxy (Nginx)**
2. **Option B: Use a service like Cloudflare**
3. **Option C: Configure SSL in the application**

### Performance Optimization

#### Server Optimization

```env
# Increase for high traffic
MAX_CONNECTIONS=1000
TIMEOUT=60000

# Add database for persistence
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Client Optimization

```env
# Enable compression
NEXT_PUBLIC_ENABLE_COMPRESSION=true

# Set appropriate cache headers
NEXT_PUBLIC_CACHE_CONTROL=public, max-age=31536000
```

## 📊 Monitoring

### Health Checks

Both server and client include health check endpoints:

- **Server**: `http://localhost:3000/`
- **Client**: `http://localhost:3001/`

### Logging

Server logs are stored in `server/logs/` directory:

```bash
# View real-time logs
tail -f server/logs/hocuspocus.log

# Check server status
curl -f http://localhost:3000
```

## 🔒 Security Considerations

### Environment Variables

Never commit `.env` files to version control:

```bash
# Add to .gitignore
echo "*.env" >> .gitignore
echo ".env.local" >> .gitignore
```

### Firewall Configuration

```bash
# Allow necessary ports
ufw allow 3000/tcp  # Server
ufw allow 3001/tcp  # Client (if not using reverse proxy)
```

### Rate Limiting

Consider implementing rate limiting for production:

```javascript
// Add to server configuration
const server = new Server({
  // ... other config
  extensions: [
    new Throttle({
      throttle: 100, // max 100 requests per minute
    }),
  ],
});
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if server is running on correct port
   - Verify firewall settings
   - Ensure WebSocket URL is correct

2. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   ```

3. **Environment Variables Not Loading**
   - Check file names (.env vs .env.local)
   - Verify NEXT_PUBLIC_ prefix for client variables
   - Restart applications after changes

### Debug Mode

Enable debug logging:

```env
# Server
LOG_LEVEL=debug

# Client
NEXT_PUBLIC_NODE_ENV=development
```

## 📚 Additional Resources

- [Hocuspocus Documentation](https://tiptap.dev/hocuspocus)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🆘 Support

If you encounter issues:

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Test with curl commands to verify connectivity

For additional help, check the troubleshooting section or create an issue in the repository. 