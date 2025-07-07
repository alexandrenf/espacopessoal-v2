// index.js
import { Server } from '@hocuspocus/server';

// Load environment variables
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVER_NAME = process.env.SERVER_NAME || 'Google Docs Clone Server';
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS || '100');
const TIMEOUT = parseInt(process.env.TIMEOUT || '30000');

const server = new Server({
  port: Number(PORT),
  timeout: TIMEOUT,
  name: SERVER_NAME,
  
  // Add extensions here for persistence (e.g., database)
  // extensions: [
  //   new Database({
  //     // ... database options
  //   }),
  // ],
  
  // CORS configuration for Vercel deployment
  async onRequest(data) {
    const { request, response } = data;
    
    // Set CORS headers
    response.setHeader('Access-Control-Allow-Origin', 'https://docs.espacopessoal.com');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.writeHead(200);
      response.end();
      return;
    }
    
    // Continue with other handlers
    return Promise.resolve();
  },

  async onConnect(data) {
    console.log(`[${new Date().toISOString()}] Hocuspocus connection received from ${data.socketId}`);
  },
  
  async onDisconnect(data) {
    console.log(`[${new Date().toISOString()}] Hocuspocus connection disconnected: ${data.socketId}`);
  },
  
  async onListen(data) {
    console.log(`[${new Date().toISOString()}] ${SERVER_NAME} listening on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Environment: ${NODE_ENV}`);
    console.log(`[${new Date().toISOString()}] Max connections: ${MAX_CONNECTIONS}`);
  },
  
  async onDestroy(data) {
    console.log(`[${new Date().toISOString()}] ${SERVER_NAME} destroyed`);
  },
  
  async onLoadDocument(data) {
    console.log(`[${new Date().toISOString()}] Loading document: ${data.documentName}`);
    // Return the document from your database or create a new one
    return null; // Let Hocuspocus create a new document
  },
  
  async onStoreDocument(data) {
    console.log(`[${new Date().toISOString()}] Storing document: ${data.documentName}`);
    // Store the document in your database
  },
  
  // You can add more event handlers here for custom logic,
  // e.g., authentication, authorization, document state changes.
});

server.listen();