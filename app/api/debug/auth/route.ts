import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const jwtSecret = process.env.JWT_SECRET;
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasJwtSecret: !!jwtSecret,
      supabaseUrlPrefix: supabaseUrl?.substring(0, 20) + '...',
      supabaseKeyPrefix: supabaseKey?.substring(0, 20) + '...'
    });
    
    // Test Supabase connection
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Test a simple query
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      console.log('Supabase test result:', { data, error });
      
      return NextResponse.json({
        success: true,
        env: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          hasJwtSecret: !!jwtSecret
        },
        supabaseTest: {
          connected: !error,
          error: error?.message,
          data
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        env: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          hasJwtSecret: !!jwtSecret
        }
      });
    }
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    });
  }
}
