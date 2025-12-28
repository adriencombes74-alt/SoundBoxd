import { NextResponse } from 'next/server';
// J'importe Supabase mais je ne l'utilise pas encore
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log("TEST STEP 1: Imports OK");
  
  return NextResponse.json({ 
    message: 'Step 1: Imports are working', 
    supabaseImported: typeof createClient === 'function'
  });
}
