import { NextResponse } from 'next/server'
import httpProxy from 'http-proxy'
import { IncomingMessage } from 'http'
import { Duplex } from 'stream'

const proxy = httpProxy.createProxyServer({
  target: 'ws://127.0.0.1:3000',
  ws: true,
})

export async function GET() {
  return new Promise((resolve) => {
    const res = NextResponse.json({ message: 'WebSocket endpoint' })
    
    // Note: This approach may not work as expected in Next.js App Router
    // WebSocket upgrades typically need to be handled at the server level
    const serverRes = res as unknown as {
      socket: {
        server: {
          on: (event: string, callback: (req: IncomingMessage, socket: Duplex, head: Buffer) => void) => void
        }
      }
    }
    
    serverRes.socket.server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      proxy.ws(req, socket, head)
    })
    
    resolve(res)
  })
}
