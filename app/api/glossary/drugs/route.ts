import { NextRequest, NextResponse } from 'next/server';

// Free public source: NIH RxNav API (no key required)
// Docs: https://rxnav.nlm.nih.gov/RxNormAPIs.html

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

  try {
    // 1) Find RXCUI by name
    const rxcuiRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(q)}&srclist=RXNORM`, {
      next: { revalidate: 3600 }, // cache for an hour
    });
    const rxcuiJson = await rxcuiRes.json();
    const id = rxcuiJson?.idGroup?.rxnormId?.[0];

    if (!id) {
      return NextResponse.json({ query: q, results: [] }, { status: 200 });
    }

    // 2) Get properties for the RXCUI
    const propsRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui/${id}/properties.json`, { next: { revalidate: 3600 } });
    const props = await propsRes.json();

    // 3) Get related concepts (ingredients, brand, dose form) for some context
    const relatedRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui/${id}/related.json?tty=IN+BN+DF+SCD+SBD`, { next: { revalidate: 3600 } });
    const related = await relatedRes.json();

    return NextResponse.json({ query: q, rxcui: id, properties: props?.properties, related: related?.relatedGroup }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Lookup failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
