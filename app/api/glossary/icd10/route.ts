import { NextRequest, NextResponse } from 'next/server';

// WHO ICD-11 API - Official ICD API from World Health Organization
// Docs: https://icd.who.int/docs/icd-api/APIDoc-Version2/
// Fallback: Clinical Tables ICD-10-CM (no auth required)

const WHO_CLIENT_ID = process.env.WHO_ICD_CLIENT_ID;
const WHO_CLIENT_SECRET = process.env.WHO_ICD_CLIENT_SECRET;

let cachedToken: { token: string; expires: number } | null = null;

async function getWHOToken(): Promise<string | null> {
  if (!WHO_CLIENT_ID || !WHO_CLIENT_SECRET) {
    return null;
  }

  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

  try {
    const tokenUrl = 'https://icdaccessmanagement.who.int/connect/token';
    const params = new URLSearchParams({
      client_id: WHO_CLIENT_ID,
      client_secret: WHO_CLIENT_SECRET,
      scope: 'icdapi_access',
      grant_type: 'client_credentials'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      console.error('WHO token request failed:', response.status);
      return null;
    }

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expires: Date.now() + (data.expires_in - 60) * 1000 // Refresh 1 min before expiry
    };

    return cachedToken.token;
  } catch (error) {
    console.error('Error getting WHO token:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });

  // Try WHO ICD-11 API first if credentials are available
  const token = await getWHOToken();
  
  if (token) {
    try {
      // Search ICD-11 using WHO API
      const searchUrl = `https://id.who.int/icd/release/11/2024-01/mms/search?q=${encodeURIComponent(q)}&useFlexisearch=true&flatResults=true`;
      const res = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Accept-Language': 'en',
          'API-Version': 'v2'
        },
        next: { revalidate: 3600 }
      });

      if (res.ok) {
        const data = await res.json();
        
        // Helper function to decode HTML entities and clean text
        const cleanText = (text: string) => {
          if (!text) return text;
          return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<em class="found">/g, '')
            .replace(/<\/em>/g, '')
            .replace(/<em>/g, '')
            .trim();
        };
        
        const results = (data.destinationEntities || []).map((entity: { theCode?: string; code?: string; title?: string; name?: string }) => ({
          code: entity.theCode || entity.code || 'N/A',
          name: cleanText(entity.title || entity.name || 'Unknown'),
          source: 'WHO ICD-11'
        }));

        return NextResponse.json({
          query: q,
          totalCount: results.length,
          results,
          source: 'WHO ICD-11'
        }, { status: 200 });
      }
    } catch (error) {
      console.error('WHO ICD-11 API error, falling back to ICD-10:', error);
    }
  }

  // Fallback to Clinical Tables ICD-10-CM (no auth required)
  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=${encodeURIComponent(q)}&df=code,name&maxList=20`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!res.ok) {
      throw new Error(`ICD-10 API returned ${res.status}`);
    }

    const json = await res.json();
    
    // CTSS format: [totalCount, [fieldNames], null, [rows]]
    const totalCount = json?.[0] || 0;
    const fields = (json?.[1] as string[]) || [];
    const rows = (json?.[3] as unknown[][]) || [];
    
    const results = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return { ...obj, source: 'ICD-10-CM' };
    });

    return NextResponse.json({ 
      query: q, 
      totalCount,
      results,
      source: 'ICD-10-CM (Fallback)'
    }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'ICD lookup failed';
    console.error('ICD API Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
