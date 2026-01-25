import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/company/settings/logo
 * Upload company logo
 * For now, generates a placeholder SVG logo
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company and role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only admins can upload logo
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For now, generate a placeholder SVG logo
    // In production, you would upload to Supabase Storage and return the URL
    const placeholderSvg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#mountainGradient)"/>
        <!-- Mountains -->
        <polygon points="0,200 60,120 120,200" fill="#1e40af" opacity="0.6"/>
        <polygon points="80,200 140,100 200,200" fill="#065f46" opacity="0.6"/>
        <!-- MRC Text -->
        <text x="100" y="160" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">MRC</text>
      </svg>
    `.trim();

    // Convert SVG to data URL (URL encode for proper display)
    const encodedSvg = encodeURIComponent(placeholderSvg);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    // Update settings with logo URL
    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .eq('company_id', profile.company_id)
      .single();

    if (existing) {
      await supabase
        .from('company_settings')
        .update({ logo_url: svgDataUrl })
        .eq('company_id', profile.company_id);
    } else {
      await supabase
        .from('company_settings')
        .insert({
          company_id: profile.company_id,
          logo_url: svgDataUrl,
        });
    }

    return NextResponse.json({ 
      success: true, 
      logo_url: svgDataUrl,
      message: 'Logo placeholder generated successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/admin/company/settings/logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
