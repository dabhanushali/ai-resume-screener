'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Filter, Briefcase, MapPin, 
  Clock, ArrowRight, Loader2, Info, ChevronDown, ChevronUp
} from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  currentDesignation: string | null;
  currentCompany: string | null;
  totalExperience: number;
  skills: string[];
  education: Array<{ degree: string; institution: string; gradYear: string }>;
  screenings: Array<{ id: string; matchScore: number; recommendation: string; job: { title: string } }>;
  noticePeriod?: string;
  createdAt: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSkills, setFilterSkills] = useState('');
  const [filterMinExp, setFilterMinExp] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates(customQuery = '') {
    setLoading(true);
    try {
      let url = '/api/candidates';
      const params = new URLSearchParams();

      if (customQuery) {
        params.append('q', customQuery);
      } else {
        if (searchQuery) params.append('q', searchQuery);
        if (filterName) params.append('name', filterName);
        if (filterCompany) params.append('company', filterCompany);
        if (filterLocation) params.append('location', filterLocation);
        if (filterSkills) params.append('skills', filterSkills);
        if (filterMinExp) params.append('minExp', filterMinExp);
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setCandidates(data.candidates);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterName('');
    setFilterCompany('');
    setFilterLocation('');
    setFilterSkills('');
    setFilterMinExp('');
    fetchCandidates('');
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
    fetchCandidates(query);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header row */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Talent Pool
        </h1>
        <p className="text-slate-600 text-sm mt-0.5">
          Search candidates, review their profiles, and see previous screening history.
        </p>
      </div>

      {/* Advanced Boolean Search Help Panel */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 text-sm text-slate-700 leading-relaxed">
        <button
          type="button"
          onClick={() => setShowSearchHelp(!showSearchHelp)}
          className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <span className="flex items-center gap-3 font-bold text-slate-900">
            <Info className="w-5 h-5 shrink-0 text-blue-700" />
            Search examples
          </span>
          {showSearchHelp ? <ChevronUp className="w-4 h-4 text-blue-700" /> : <ChevronDown className="w-4 h-4 text-blue-700" />}
        </button>
        {showSearchHelp && (
          <div className="px-4 pb-4 pl-12">
            <p className="text-xs font-medium text-slate-600">Try these common searches to quickly find matching candidates.</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={() => handleQuickSearch('React AND Next.js')} className="px-2.5 py-1 bg-white border border-blue-100 hover:bg-blue-100 text-[11px] font-bold rounded-md cursor-pointer text-blue-700">React AND Next.js</button>
              <button onClick={() => handleQuickSearch('5+ years experience')} className="px-2.5 py-1 bg-white border border-blue-100 hover:bg-blue-100 text-[11px] font-bold rounded-md cursor-pointer text-blue-700">5+ years experience</button>
              <button onClick={() => handleQuickSearch('Immediate Joiner')} className="px-2.5 py-1 bg-white border border-blue-100 hover:bg-blue-100 text-[11px] font-bold rounded-md cursor-pointer text-blue-700">Immediate Joiner</button>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by skill, role, company, or location..."
              className="glass-input pl-11 block w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 border rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Refine Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-sm transition-all duration-200 cursor-pointer"
          >
            Search
          </button>
        </div>

        {/* Collapsible Refinement Panel */}
        {showFilters && (
          <div className="glass-panel p-6 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in relative z-10">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Candidate Name</label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g. John Doe"
                className="glass-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Employer / Company</label>
              <input
                type="text"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                placeholder="e.g. Google"
                className="glass-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location</label>
              <input
                type="text"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                placeholder="e.g. Remote"
                className="glass-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Skills (separated by comma)</label>
              <input
                type="text"
                value={filterSkills}
                onChange={(e) => setFilterSkills(e.target.value)}
                placeholder="e.g. React, Docker"
                className="glass-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Min Experience (Yrs)</label>
              <input
                type="number"
                value={filterMinExp}
                onChange={(e) => setFilterMinExp(e.target.value)}
                placeholder="e.g. 3"
                className="glass-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div className="sm:col-span-3 lg:col-span-5 flex justify-end gap-2 border-t border-slate-200 pt-4 mt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Apply Constraints
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Grid of Candidate Profiles */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Searching candidates...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {candidates.length > 0 ? (
            candidates.map((c) => (
              <div 
                key={c.id} 
                className="glass-panel p-6 border border-slate-200 flex flex-col justify-between hover-glow transition-all duration-200 group"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <Link href={`/candidates/${c.id}`}>
                        <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-200">
                          {c.name}
                        </h2>
                      </Link>
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        {c.currentDesignation || 'Designation Not Extracted'}
                        {c.currentCompany && ` at ${c.currentCompany}`}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700 rounded-md">
                      {c.totalExperience} Yrs Exp
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {c.location}
                    </span>
                    {c.noticePeriod && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Notice: {c.noticePeriod}
                      </span>
                    )}
                  </div>

                  {/* Skills tags preview */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {c.skills.slice(0, 5).map(skill => (
                      <span key={skill} className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-md">
                        {skill}
                      </span>
                    ))}
                    {c.skills.length > 5 && (
                      <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-extrabold rounded-md">
                        +{c.skills.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Applied History listings */}
                <div className="mt-6 border-t border-slate-200 pt-4 flex flex-col gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Screening history</span>
                  {c.screenings.length > 0 ? (
                    c.screenings.slice(0, 2).map((sc, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
                        <span className="text-slate-700 font-bold truncate max-w-[200px]">{sc.job.title}</span>
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                          sc.matchScore >= 75 ? 'bg-emerald-50 text-emerald-700' :
                          sc.matchScore >= 50 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {sc.matchScore}% match
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic mt-0.5">Unscreened database intake.</span>
                  )}
                  
                  <div className="flex justify-end mt-2">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors duration-200 cursor-pointer"
                    >
                      View Profile
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center text-slate-500 font-semibold glass-panel">
              No candidates match your search.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
