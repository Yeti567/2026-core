import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  await supabase.auth.signOut();
  
  // Get the origin from the request
  const origin = request.nextUrl.origin;
  
  return NextResponse.redirect(new URL('/login', origin), {
    status: 302,
  });
}
