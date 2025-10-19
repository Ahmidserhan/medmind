import { NextRequest, NextResponse } from 'next/server';

// Free public source: Clinical Tables Search Service (CTSS) from NLM
// Docs: https://clinicaltables.nlm.nih.gov/apidoc/
// We'll use the 'drugs' and 'conditions' tables as general terms fallback.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const table = (searchParams.get('table') || 'conditions').trim(); // 'conditions' | 'drugs' | others supported by CTSS
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/${encodeURIComponent(table)}/v3/search?terms=${encodeURIComponent(q)}&df=primary_name,synonyms`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const json = await res.json();
    // CTSS format: [numFound, [fields...], [ rows... ]]
    const fields = (json?.[1] as unknown[]) || [];
    const rows = (json?.[3] as unknown[]) || [];
    const fieldNames = fields.filter((f): f is string => typeof f === 'string');
    const results = rows
      .filter((r): r is unknown[] => Array.isArray(r))
      .map((r) => {
        const obj: Record<string, unknown> = {};
        fieldNames.forEach((f, i) => { obj[f] = (r as unknown[])[i]; });
        return obj;
      });
    return NextResponse.json({ query: q, table, results }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Lookup failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
