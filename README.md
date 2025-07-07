# EspacoPessoal Docs

A real-time collaborative document editor built with Next.js and Hocuspocus, featuring seamless multi-user editing with operational transformation.

## 🚀 Architecture

- **Frontend**: Next.js 15 + React 19 + TailwindCSS
- **Backend**: Hocuspocus WebSocket server for real-time collaboration
- **Persistence**: Y.js with IndexedDB for offline storage
- **Styling**: TailwindCSS with Tailwind Typography

## 🌐 Production Deployment

### Server
- **URL**: `socket.espacopessoal.com:6001`
- **Protocol**: WebSocket (WSS for production)
- **Framework**: Hocuspocus server with Bun runtime

### Client
- **URL**: `docs.espacopessoal.com`
- **Platform**: Vercel
- **Framework**: Next.js with Server-Side Rendering

## 🛠️ Quick Setup

### For Production Deployment
```bash
# Run the production setup script
./deploy-production.sh

# Follow the instructions in VERCEL_DEPLOYMENT.md
```

### For Local Development
```bash
# Run the general setup script
./deploy.sh

# Start server (Terminal 1)
cd server && bun start

# Start client (Terminal 2)  
cd client && bun run dev
```

## 📁 Project Structure

```
espacopessoal-v2/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   └── app/           # Next.js app router
│   ├── vercel.json        # Vercel deployment config
│   └── config.example.env # Environment template
├── server/                # Hocuspocus WebSocket server
│   ├── index.ts          # Server entry point
│   ├── Dockerfile        # Docker configuration
│   └── config.example.env # Environment template
├── docker-compose.yml     # Multi-container setup
├── deploy-production.sh   # Production deployment script
└── VERCEL_DEPLOYMENT.md   # Detailed deployment guide
```

## 🔧 Environment Configuration

### Server (`server/.env`)
```env
PORT=6001
HOST=0.0.0.0
NODE_ENV=production
SERVER_NAME=EspacoPessoal Docs Server
CORS_ORIGIN=https://docs.espacopessoal.com
```

### Client (`client/.env.local`)
```env
NEXT_PUBLIC_WS_URL=wss://socket.espacopessoal.com:6001
NEXT_PUBLIC_APP_NAME=EspacoPessoal Docs
NEXT_PUBLIC_DOCUMENT_NAME=shared-document
```

## 🚀 Features

- **Real-time Collaboration**: Multiple users can edit simultaneously
- **Operational Transformation**: Conflict-free document synchronization
- **Offline Support**: Local persistence with IndexedDB
- **Rich Text Editing**: Powered by TipTap editor
- **Modern UI**: Clean, responsive design with TailwindCSS
- **WebSocket Connection**: Real-time bidirectional communication
- **User Awareness**: See other users' cursors and selections

## 🛡️ Security Features

- **CORS Protection**: Restricts access to authorized domains
- **SSL/TLS Support**: Secure WebSocket connections (WSS)
- **Environment Isolation**: Separate configurations for dev/prod
- **Input Sanitization**: Safe handling of user content

## 📚 Documentation

- **[Deployment Guide](VERCEL_DEPLOYMENT.md)**: Complete production deployment instructions
- **[General Setup](DEPLOYMENT.md)**: Development and Docker setup
- **[Hocuspocus Docs](https://tiptap.dev/hocuspocus)**: Real-time collaboration framework
- **[Next.js Docs](https://nextjs.org/docs)**: Frontend framework documentation

## 🐛 Troubleshooting

### WebSocket Connection Issues
1. Check if server is running on correct port
2. Verify SSL certificate for WSS connections
3. Ensure CORS headers are properly configured
4. Test connectivity with curl or websocat

### Common Commands
```bash
# Check server status
curl -f http://socket.espacopessoal.com:6001

# View server logs
tail -f server/logs/hocuspocus.log

# Test WebSocket connection
websocat wss://socket.espacopessoal.com:6001
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `./deploy.sh`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For deployment issues or questions:
1. Check the deployment guides
2. Review server logs for errors
3. Test WebSocket connectivity
4. Create an issue with detailed error information

---

**Live Application**: [https://docs.espacopessoal.com](https://docs.espacopessoal.com) 