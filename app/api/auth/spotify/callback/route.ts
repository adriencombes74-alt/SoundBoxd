import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log("TEST: JSON Simple + Force Dynamic");
  
  return NextResponse.json({ 
    message: 'It works with force-dynamic!', 
    timestamp: new Date().toISOString() 
  });
}
