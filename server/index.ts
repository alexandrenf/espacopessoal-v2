// index.ts
import { Server } from '@hocuspocus/server';
import type { onConnectPayload, onDisconnectPayload, onListenPayload, onRequestPayload, onLoadDocumentPayload, onStoreDocumentPayload, onDestroyPayload } from '@hocuspocus/server';

// Load environment variables
const PORT = process.env.PORT || 6001;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVER_NAME = process.env.SERVER_NAME || 'EspacoPessoal Docs Server';
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS || '100');
const TIMEOUT = parseInt(process.env.TIMEOUT || '30000');

// CORS Configuration - Support multiple origins
const getAllowedOrigins = () => {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (corsOrigin) {
    // If CORS_ORIGIN is set, use it (can be comma-separated list)
    return corsOrigin.split(',').map(origin => origin.trim());
  }
  
  // Default allowed origins based on environment
  const defaultOrigins = [
    'https://docs.espacopessoal.com',
    'https://espacopessoal-v2.vercel.app',
    'https://www.espacopessoal.com',
  ];
  
  if (NODE_ENV === 'development') {
    defaultOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }
  
  return defaultOrigins;
};

const allowedOrigins = getAllowedOrigins();

// Helper function to check if origin is allowed
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return false;
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
};

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
  
  // Enhanced CORS configuration
  async onRequest(data: onRequestPayload) {
    const { request, response } = data;
    const origin = request.headers.origin as string;
    
    // Set CORS headers
    if (isOriginAllowed(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.writeHead(200);
      response.end();
      return;
    }
    
    // Continue with other handlers
    return Promise.resolve();
  },

  // Enhanced connection handling with origin validation
  async onConnect(data: onConnectPayload) {
    const { request, socketId } = data;
    const origin = request.headers.origin as string;
    
    // Validate origin for WebSocket connections
    if (!isOriginAllowed(origin)) {
      console.warn(`[${new Date().toISOString()}] Connection rejected from unauthorized origin: ${origin}`);
      throw new Error('Unauthorized origin');
    }
    
    console.log(`[${new Date().toISOString()}] WebSocket connection accepted from ${origin} (${socketId})`);
  },
  
  async onDisconnect(data: onDisconnectPayload) {
    console.log(`[${new Date().toISOString()}] WebSocket connection disconnected: ${data.socketId}`);
  },
  
  async onListen(data: onListenPayload) {
    console.log(`[${new Date().toISOString()}] ${SERVER_NAME} listening on ${HOST}:${PORT}`);
    console.log(`[${new Date().toISOString()}] Environment: ${NODE_ENV}`);
    console.log(`[${new Date().toISOString()}] Max connections: ${MAX_CONNECTIONS}`);
    console.log(`[${new Date().toISOString()}] Allowed origins: ${allowedOrigins.join(', ')}`);
  },
  
  async onDestroy(data: onDestroyPayload) {
    console.log(`[${new Date().toISOString()}] ${SERVER_NAME} destroyed`);
  },
  
  async onLoadDocument(data: onLoadDocumentPayload) {
    console.log(`[${new Date().toISOString()}] Loading document: ${data.documentName}`);
    // Return the document from your database or create a new one
    return null; // Let Hocuspocus create a new document
  },
  
  async onStoreDocument(data: onStoreDocumentPayload) {
    console.log(`[${new Date().toISOString()}] Storing document: ${data.documentName}`);
    // Store the document in your database
  },
  
  // You can add more event handlers here for custom logic,
  // e.g., authentication, authorization, document state changes.
});

server.listen();