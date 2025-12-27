import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json({ 
    message: 'Callback is reachable!', 
    url: request.url,
    timestamp: new Date().toISOString() 
  });
}
