
import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Download, Trash2, Loader2, Globe, Calendar, Info, CheckCircle, ExternalLink, History, Clock, Tag } from 'lucide-react';
import { City, FreeEvent, SearchResult, SortOption } from './types';
import { geolocateCity, findFreeEvents } from './services/geminiService';

const App: React.FC = () => {
  const [cityInput, setCityInput] = useState('');
  const [cities, setCities] = useState<City[]>(() => {
    const saved = localStorage.getItem('escout_cities');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCityIds, setSelectedCityIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('escout_selected_ids');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NAME);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('escout_cities', JSON.stringify(cities));
  }, [cities]);

  useEffect(() => {
    localStorage.setItem('escout_selected_ids', JSON.stringify(Array.from(selectedCityIds)));
  }, [selectedCityIds]);

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;

    setIsLocating(true);
    setErrorMessage(null);
    try {
      const cityData = await geolocateCity(cityInput);
      const exists = cities.find(c => c.name.toLowerCase() === cityData.name.toLowerCase() && c.countryCode === cityData.countryCode);
      if (exists) {
        setErrorMessage(`"${cityData.name}" is already in your list.`);
        return;
      }
      setCities(prev => [...prev, cityData]);
      setCityInput('');
    } catch (error) {
      setErrorMessage("City lookup failed. Please try a more specific name.");
    } finally {
      setIsLocating(false);
    }
  };

  const toggleCitySelection = (id: string) => {
    setSelectedCityIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeCity = (id: string) => {
    setCities(prev => prev.filter(c => c.id !== id));
    setSelectedCityIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => {
      if (sortOption === SortOption.NAME) {
        return a.name.localeCompare(b.name);
      } else {
        return a.country.localeCompare(b.country);
      }
    });
  }, [cities, sortOption]);

  const handleSearchEvents = async () => {
    if (selectedCityIds.size === 0) return;

    setIsSearching(true);
    setResults([]);
    setErrorMessage(null);

    const selectedCities = cities.filter(c => selectedCityIds.has(c.id));
    const allResults: SearchResult[] = [];

    try {
      for (const city of selectedCities) {
        const events = await findFreeEvents(city);
        allResults.push({
          city: `${city.name}, ${city.country}`,
          events
        });
      }
      setResults(allResults);
    } catch (error) {
      setErrorMessage("Search failed. Our agents encountered an error.");
    } finally {
      setIsSearching(false);
    }
  };

  const downloadJson = () => {
    // Ensuring the export only contains the event objects as requested
    const exportData = results.flatMap(r => r.events);
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'free_events_discovery.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                EventScout AI
              </h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                Global Free Event Discovery
              </p>
            </div>
          </div>

          <form onSubmit={handleAddCity} className="w-full md:w-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Add city (e.g. Tallinn)"
                className="w-full md:w-64 bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500"
                disabled={isLocating}
              />
            </div>
            <button
              type="submit"
              disabled={isLocating || !cityInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-full text-sm font-medium transition-all shadow-lg"
            >
              {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-slate-200">
                <History className="w-4 h-4 text-indigo-400" />
                <h2 className="font-semibold">My Cities</h2>
              </div>
              <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setSortOption(SortOption.NAME)}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${sortOption === SortOption.NAME ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  ABC
                </button>
                <button
                  onClick={() => setSortOption(SortOption.COUNTRY)}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${sortOption === SortOption.COUNTRY ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  ISO
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {cities.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  <MapPin className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No cities yet.</p>
                </div>
              ) : (
                sortedCities.map((city) => (
                  <div
                    key={city.id}
                    className={`group relative border transition-all rounded-xl p-4 cursor-pointer ${
                      selectedCityIds.has(city.id)
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                    onClick={() => toggleCitySelection(city.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="pr-8 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="font-bold text-slate-100 truncate max-w-[140px] tracking-tight">{city.name}</h3>
                           <span className="text-[9px] bg-slate-800 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono uppercase">
                             {city.countryCode}
                           </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2 truncate font-medium">{city.country}</p>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCity(city.id);
                        }}
                        className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {selectedCityIds.has(city.id) && (
                        <CheckCircle className="w-4 h-4 text-indigo-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedCityIds.size > 0 && (
              <button
                onClick={handleSearchEvents}
                disabled={isSearching}
                className="w-full mt-5 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding Events...
                  </>
                ) : (
                  `Search Next 30 Days (${selectedCityIds.size})`
                )}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
              <Info className="w-5 h-5 shrink-0" />
              {errorMessage}
            </div>
          )}

          {results.length > 0 && !isSearching ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between bg-indigo-900/20 border border-indigo-500/20 p-6 rounded-2xl shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Search Results</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Found {results.reduce((acc, r) => acc + r.events.length, 0)} free events.
                  </p>
                </div>
                <button
                  onClick={downloadJson}
                  className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </button>
              </div>

              {results.map((res, idx) => (
                <div key={idx} className="space-y-5">
                  <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4 py-1.5">
                    <h3 className="text-xl font-bold text-white tracking-tight">{res.city}</h3>
                  </div>
                  <div className="grid gap-5">
                    {res.events.length > 0 ? (
                      res.events.map((event, eIdx) => (
                        <div key={eIdx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group relative overflow-hidden shadow-lg">
                          <div className="absolute top-0 right-0 p-5">
                             <a 
                               href={event.sourceUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-slate-500 hover:text-indigo-400 transition-colors p-2 hover:bg-slate-800 rounded-lg"
                             >
                               <ExternalLink className="w-4 h-4" />
                             </a>
                          </div>
                          
                          <div className="flex flex-col gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  {event.category}
                                </span>
                              </div>
                              <h4 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors mb-3 pr-10">
                                {event.name}
                              </h4>
                              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                {event.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-3 mt-auto">
                                <div className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl flex items-center gap-2.5 text-[11px] font-bold border border-slate-700">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDateTime(event.start_time)}
                                </div>
                                <div className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl flex items-center gap-2.5 text-[11px] font-bold border border-slate-700">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {event.location_address}
                                </div>
                                <div className="bg-indigo-900/40 text-indigo-300 px-4 py-2 rounded-xl flex items-center gap-2.5 text-[11px] font-bold border border-indigo-500/20 ml-auto">
                                  {event.location_lat.toFixed(4)}, {event.location_lng.toFixed(4)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-sm italic py-12 border border-dashed border-slate-800 rounded-2xl text-center bg-slate-900/20">
                        No free events found for this city.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="relative mb-10">
                <div className="w-28 h-28 border-[6px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Globe className="w-12 h-12 text-indigo-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Analyzing the Web...</h3>
              <p className="mt-4 text-slate-400 max-w-sm mx-auto leading-relaxed">
                Using deep reasoning to identify real events, extract precise ISO dates, and calculate coordinates for each location.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center opacity-80">
              <Calendar className="w-20 h-20 text-slate-700/50 mb-10" />
              <h3 className="text-2xl font-bold text-slate-300">Ready for Discovery</h3>
              <p className="mt-4 text-slate-500 max-w-xs mx-auto leading-relaxed">
                Select your cities and our AI agents will build a detailed itinerary of free events for you.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 mt-20 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold">
        Detailed JSON Output Enabled • Gemini 3 Pro Reasoning
      </footer>
    </div>
  );
};

export default App;
