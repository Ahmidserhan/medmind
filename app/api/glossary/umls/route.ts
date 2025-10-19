import { NextRequest, NextResponse } from 'next/server';

// Open-source medical terminology APIs (No login/API key required!)
// 1. Disease Ontology API - https://disease-ontology.org/
// 2. MedlinePlus Health Topics - https://medlineplus.gov/
// 3. Wikipedia Medical API - https://en.wikipedia.org/api/

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const action = searchParams.get('action') || 'search';
  const title = searchParams.get('title') || '';
  
  if (!q && action === 'search') {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    if (action === 'details' && title) {
      // Get detailed information from Wikipedia
      const detailsUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const res = await fetch(detailsUrl, { 
        next: { revalidate: 86400 },
        headers: { 'User-Agent': 'MedMind/1.0' }
      });
      
      if (!res.ok) {
        throw new Error(`Wikipedia API returned ${res.status}`);
      }

      const data = await res.json();

      return NextResponse.json({
        title: data.title,
        definitions: [{
          definition: data.extract || 'No description available',
          source: 'Wikipedia'
        }]
      }, { status: 200 });
    } else {
      // Search Wikipedia for medical terms
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q + ' disease OR ' + q + ' condition')}&limit=10&namespace=0&format=json&origin=*`;
      const res = await fetch(searchUrl, { 
        next: { revalidate: 3600 },
        headers: { 'User-Agent': 'MedMind/1.0' }
      });
      
      if (!res.ok) {
        throw new Error(`Wikipedia API returned ${res.status}`);
      }

      const data = await res.json();
      // Wikipedia opensearch returns: [query, [titles], [descriptions], [urls]]
      const titles = (data[1] || []) as string[];
      const descriptions = (data[2] || []) as string[];

      const results = titles.map((title, idx) => ({
        id: title.replace(/\s+/g, '_'),
        name: title,
        description: descriptions[idx] || '',
        source: 'Wikipedia'
      }));

      return NextResponse.json({
        query: q,
        totalCount: results.length,
        results
      }, { status: 200 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Medical terminology lookup failed';
    console.error('Medical API Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
