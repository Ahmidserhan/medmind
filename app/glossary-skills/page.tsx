'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import Sidebar from '@/app/components/Sidebar';

interface DrugProps { name?: string; synonym?: string; tty?: string }
interface RelatedGroup { conceptGroup?: unknown[] }
interface DrugResult { properties?: DrugProps; related?: RelatedGroup; rxcui?: string }
interface TermResult { primary_name?: string; synonyms?: string[] }
interface ICD10Result { code?: string; name?: string; source?: string }
interface MedicalResult { id?: string; name?: string; description?: string; source?: string }
interface MedicalDefinition { definition?: string; source?: string }
interface ConditionDetail { 
  icd10?: ICD10Result[]; 
  medical?: MedicalResult[];
  selectedTitle?: string;
  definitions?: MedicalDefinition[];
}

type Tab = 'drugs' | 'terms' | 'conditions' | 'skills';

type Note = { id: string; type: 'drug'|'term'|'condition'; key: string; text: string; ts: number };

const NOTES_KEY = 'medmind_glossary_notes_v1';
const RECENT_KEY = 'medmind_glossary_recent_v1';

function loadNotes(): Note[] { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch { return []; } }
function saveNotes(notes: Note[]) { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }

export default function GlossarySkillsPage() {
  const [tab, setTab] = useState<Tab>('drugs');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [drugs, setDrugs] = useState<DrugResult | null>(null);
  const [terms, setTerms] = useState<TermResult[]>([]);
  const [conditions, setConditions] = useState<ConditionDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [termsTable, setTermsTable] = useState<'conditions'|'drugs'|'procedures'>('conditions');
  const [loadingDefinitions, setLoadingDefinitions] = useState(false);

  useEffect(() => { setNotes(loadNotes()); try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')); } catch {} }, []);

  const onSearch = async () => {
    const query = q.trim(); if (!query) return;
    setLoading(true);
    setDrugs(null);
    setTerms([]);
    setConditions(null);
    try {
      if (tab === 'drugs') {
        const res = await fetch(`/api/glossary/drugs?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setDrugs(json);
      } else if (tab === 'terms') {
        const res = await fetch(`/api/glossary/terms?q=${encodeURIComponent(query)}&table=${encodeURIComponent(termsTable)}`);
        const json = await res.json();
        setTerms(json.results || []);
      } else if (tab === 'conditions') {
        // Parallel fetch for ICD-10 and Medical terminology
        const [icd10Res, medicalRes] = await Promise.all([
          fetch(`/api/glossary/icd10?q=${encodeURIComponent(query)}`),
          fetch(`/api/glossary/umls?q=${encodeURIComponent(query)}`)
        ]);
        const [icd10Data, medicalData] = await Promise.all([icd10Res.json(), medicalRes.json()]);
        
        setConditions({
          icd10: icd10Data.results || [],
          medical: medicalData.results || [],
          definitions: []
        });
      }
      setRecent(prev => {
        const next = [query, ...prev.filter(x => x.toLowerCase() !== query.toLowerCase())].slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        return next;
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      Swal.fire({ icon: 'error', title: 'Lookup failed', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const loadDefinitions = async (title: string) => {
    setLoadingDefinitions(true);
    try {
      const res = await fetch(`/api/glossary/umls?action=details&title=${encodeURIComponent(title)}`);
      const data = await res.json();
      setConditions(prev => prev ? { ...prev, selectedTitle: title, definitions: data.definitions || [] } : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error loading definitions';
      Swal.fire({ icon: 'error', title: 'Failed to load details', text: msg });
    } finally {
      setLoadingDefinitions(false);
    }
  };

  const filteredNotes = useMemo(() => notes.sort((a,b)=>b.ts-a.ts), [notes]);

  const addNote = async (type: 'drug'|'term'|'condition', key: string, presetText='') => {
    const { value } = await Swal.fire<string>({ 
      title: 'Add Note', 
      input: 'textarea', 
      inputValue: presetText, 
      showCancelButton: true,
      confirmButtonColor: '#0F3D73'
    });
    if (!value) return;
    const n: Note = { id: crypto.randomUUID(), type, key, text: value, ts: Date.now() };
    const next = [n, ...notes]; setNotes(next); saveNotes(next);
    Swal.fire({ icon: 'success', title: 'Note saved', timer: 1500, showConfirmButton: false });
  };

  const delNote = async (id: string) => {
    const ok = await Swal.fire({ 
      icon: 'warning', 
      title: 'Delete note?', 
      showCancelButton: true, 
      confirmButtonText: 'Delete',
      confirmButtonColor: '#DC2626'
    });
    if (!ok.isConfirmed) return;
    const next = notes.filter(n => n.id !== id); setNotes(next); saveNotes(next);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] via-[#F3F4F6] to-[#E5E7EB] flex">
      <Sidebar />
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          
          <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0F3D73] via-[#0B2F59] to-[#082344] text-white shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Medical Glossary & Skills</h1>
              <p className="text-white/80 text-sm sm:text-base mb-6">Search medications, terminology, and manage your clinical notes</p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${tab==='drugs'?'bg-white text-[#0F3D73] shadow-lg scale-105':'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`} 
                  onClick={()=>{setTab('drugs'); setDrugs(null); setTerms([]); setConditions(null);}}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Medications
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${tab==='conditions'?'bg-white text-[#0F3D73] shadow-lg scale-105':'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`} 
                  onClick={()=>{setTab('conditions'); setDrugs(null); setTerms([]); setConditions(null);}}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Conditions
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${tab==='terms'?'bg-white text-[#0F3D73] shadow-lg scale-105':'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`} 
                  onClick={()=>{setTab('terms'); setDrugs(null); setTerms([]); setConditions(null);}}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Terminology
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${tab==='skills'?'bg-white text-[#0F3D73] shadow-lg scale-105':'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'}`} 
                  onClick={()=>setTab('skills')}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes
                </button>
              </div>
            </div>
          </div>

          {tab !== 'skills' && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input 
                    value={q} 
                    onChange={e=>setQ(e.target.value)} 
                    onKeyPress={handleKeyPress}
                    placeholder={tab === 'drugs' ? 'Search medication name...' : tab === 'conditions' ? 'Search condition or disease...' : 'Search medical term...'}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3D73] focus:border-transparent outline-none transition-all" 
                  />
                </div>
                {tab==='terms' && (
                  <select 
                    value={termsTable} 
                    onChange={e=>setTermsTable(e.target.value as ('conditions'|'drugs'|'procedures'))} 
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F3D73] focus:border-transparent outline-none bg-white">
                    <option value="conditions">Conditions</option>
                    <option value="drugs">Drugs</option>
                    <option value="procedures">Procedures</option>
                  </select>
                )}
                <button 
                  onClick={onSearch} 
                  disabled={loading}
                  className="px-6 py-3 bg-[#0F3D73] text-white rounded-lg hover:bg-[#0B2F59] transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </>
                  ) : 'Search'}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Access</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tab === 'conditions' ? 
                    ['Diabetes','Hypertension','Asthma','Pneumonia','Migraine','Anemia'].map((w)=> (
                      <button 
                        key={w} 
                        onClick={()=>{ setQ(w); }} 
                        className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] hover:from-[#D6E8F9] hover:to-[#C2DDF7] transition-all font-medium shadow-sm hover:shadow">
                        {w}
                      </button>
                    )) :
                    ['Ibuprofen','Amoxicillin','Aspirin','Metformin','Lisinopril','Atorvastatin'].map((w)=> (
                      <button 
                        key={w} 
                        onClick={()=>{ setQ(w); }} 
                        className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] text-[#0F3D73] hover:from-[#D6E8F9] hover:to-[#C2DDF7] transition-all font-medium shadow-sm hover:shadow">
                        {w}
                      </button>
                    ))
                  }
                </div>
                {recent.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Searches</span>
                      <div className="flex-1 border-t border-gray-200"></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((r)=>(
                        <button 
                          key={r} 
                          onClick={()=>{ setQ(r); }} 
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-[#0F3D73] hover:bg-gray-50 transition-all font-medium">
                          {r}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'drugs' && drugs && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="inline-block px-3 py-1 bg-[#0F3D73]/10 text-[#0F3D73] rounded-lg text-sm font-semibold mb-2">
                    RXCUI: {drugs.rxcui || 'N/A'}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Medication Details</h3>
                </div>
              </div>
              {drugs.properties && (
                <div className="space-y-3 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Name</div>
                      <div className="text-base font-semibold text-gray-900">{drugs.properties.name || 'N/A'}</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Synonym</div>
                      <div className="text-base font-semibold text-gray-900">{drugs.properties.synonym || 'N/A'}</div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">TTY</div>
                      <div className="text-base font-semibold text-gray-900">{drugs.properties.tty || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={()=>addNote('drug', drugs.rxcui || q)} 
                  className="px-4 py-2 rounded-lg bg-[#0F3D73] text-white hover:bg-[#0B2F59] transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Note
                </button>
                <button 
                  onClick={()=>navigator.clipboard.writeText(drugs.properties?.name || '')} 
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Name
                </button>
              </div>
            </div>
          )}

          {tab === 'conditions' && conditions && (
            <div className="space-y-6">
              {/* ICD-10 Section */}
              {conditions.icd10 && conditions.icd10.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">Disease Classification Codes</h3>
                      <p className="text-sm text-gray-600">International Classification of Diseases</p>
                    </div>
                    {conditions.icd10[0]?.source && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                        {conditions.icd10[0].source}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {conditions.icd10.map((icd, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold">
                                {icd.code}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">ICD-10-CM</span>
                            </div>
                            <p className="text-gray-900 font-medium">{icd.name}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={()=>addNote('condition', icd.code || '', `${icd.code}: ${icd.name}`)} 
                              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-medium shadow-sm flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Note
                            </button>
                            <button 
                              onClick={()=>navigator.clipboard.writeText(`${icd.code}: ${icd.name}`)} 
                              className="px-3 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-all text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Information Section */}
              {conditions.medical && conditions.medical.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Medical Information</h3>
                      <p className="text-sm text-gray-600">Comprehensive condition details from medical sources</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {conditions.medical.map((concept: MedicalResult, idx: number) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-all">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="mb-2">
                                <h4 className="text-lg font-bold text-gray-900 mb-1">{concept.name}</h4>
                                {concept.description && (
                                  <p className="text-sm text-gray-600">{concept.description}</p>
                                )}
                              </div>
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                {concept.source}
                              </span>
                            </div>
                            <button 
                              onClick={()=>loadDefinitions(concept.name || '')} 
                              disabled={loadingDefinitions}
                              className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 flex items-center gap-1">
                              {loadingDefinitions && conditions.selectedTitle === concept.name ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                              Details
                            </button>
                          </div>
                          
                          {conditions.selectedTitle === concept.name && conditions.definitions && conditions.definitions.length > 0 && (
                            <div className="mt-3 p-4 bg-white rounded-lg border border-purple-200">
                              <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Definitions</div>
                              <div className="space-y-3">
                                {conditions.definitions.map((def, defIdx) => (
                                  <div key={defIdx} className="text-sm text-gray-700 leading-relaxed">
                                    <p className="mb-1">{def.definition}</p>
                                    <span className="text-xs text-gray-500 italic">Source: {def.source}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={()=>addNote('condition', concept.name || '', `${concept.name}`)} 
                              className="px-3 py-2 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 transition-all text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Note
                            </button>
                            <button 
                              onClick={()=>navigator.clipboard.writeText(`${concept.name}${concept.description ? ': ' + concept.description : ''}`)} 
                              className="px-3 py-2 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 transition-all text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results message */}
              {(!conditions.icd10 || conditions.icd10.length === 0) && (!conditions.medical || conditions.medical.length === 0) && (
                <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
                  <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600">Try searching for a different condition or disease.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'terms' && terms.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 font-medium">Found {terms.length} result{terms.length !== 1 ? 's' : ''}</div>
              {terms.map((t, i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{t.primary_name}</h3>
                    <span className="px-2 py-1 bg-[#0F3D73]/10 text-[#0F3D73] rounded text-xs font-semibold">
                      {termsTable.toUpperCase()}
                    </span>
                  </div>
                  {t.synonyms?.length ? (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Synonyms</div>
                      <div className="flex flex-wrap gap-2">
                        {t.synonyms.map((syn, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-700">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={()=>addNote('term', t.primary_name || q)} 
                      className="px-4 py-2 rounded-lg bg-[#0F3D73] text-white hover:bg-[#0B2F59] transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Note
                    </button>
                    <button 
                      onClick={()=>navigator.clipboard.writeText(t.primary_name || '')} 
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-medium flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'skills' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-[#0F3D73]/10 rounded-lg">
                  <svg className="w-6 h-6 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Clinical Skills & Procedures</h3>
                  <p className="text-gray-600">Document your clinical procedures, skills practice, and learning notes for future reference.</p>
                </div>
              </div>
              <button 
                onClick={()=>addNote('term', 'skill:'+Date.now())} 
                className="px-6 py-3 bg-[#0F3D73] text-white rounded-lg hover:bg-[#0B2F59] transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Skill Note
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0F3D73]/10 rounded-lg">
                  <svg className="w-5 h-5 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">My Notes</h2>
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>
            <div className="space-y-3">
              {filteredNotes.map(n => (
                <div key={n.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${n.type === 'drug' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {n.type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{n.key}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{new Date(n.ts).toLocaleDateString()} {new Date(n.ts).toLocaleTimeString()}</span>
                    </div>
                    <button 
                      onClick={()=>delNote(n.id)} 
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.text}</div>
                </div>
              ))}
              {filteredNotes.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No notes yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start by searching and adding notes to your findings</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
