
import { NextRequest, NextResponse } from 'next/server'
import httpProxy from 'http-proxy'

const proxy = httpProxy.createProxyServer({
  target: 'ws://127.0.0.1:3000',
  ws: true,
})

export async function GET(req: NextRequest) {
  return new Promise((resolve, reject) => {
    const res = new NextResponse() as any
    res.socket.server.on('upgrade', (req: any, socket: any, head: any) => {
      proxy.ws(req, socket, head)
    })
    resolve(res)
  })
}
