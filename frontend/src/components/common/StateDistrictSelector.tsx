import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, MapPin } from 'lucide-react';
import { getAllIndianStates, getDistrictsByState } from '../../data/indiaLocations';

interface StateDistrictSelectorProps {
  selectedState: string;
  selectedDistrict: string;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  stateLabel?: string;
  districtLabel?: string;
  disabled?: boolean;
}

export const StateDistrictSelector: React.FC<StateDistrictSelectorProps> = ({
  selectedState,
  selectedDistrict,
  onStateChange,
  onDistrictChange,
  stateLabel = 'State / Union Territory',
  districtLabel = 'District',
  disabled = false
}) => {
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const allStates = useMemo(() => getAllIndianStates(), []);
  const availableDistricts = useMemo(() => getDistrictsByState(selectedState), [selectedState]);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return allStates;
    return allStates.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [allStates, stateSearch]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return availableDistricts;
    return availableDistricts.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()));
  }, [availableDistricts, districtSearch]);

  const handleSelectState = (state: string) => {
    onStateChange(state);
    setIsStateOpen(false);
    setStateSearch('');
    // Automatically reset district to first valid district of this state
    const newDistricts = getDistrictsByState(state);
    onDistrictChange(newDistricts[0] || 'Central District');
  };

  const handleSelectDistrict = (dist: string) => {
    onDistrictChange(dist);
    setIsDistrictOpen(false);
    setDistrictSearch('');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      {/* Searchable State Dropdown */}
      <div className="relative">
        <label className="block text-slate-400 mb-1 font-medium">{stateLabel}</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsStateOpen(!isStateOpen);
            setIsDistrictOpen(false);
          }}
          className="w-full bg-obsidian-900 border border-slate-700 hover:border-farm-500/50 rounded-xl px-3 py-2 text-left text-white flex items-center justify-between transition-all"
        >
          <span className="truncate">{selectedState || 'Select State'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isStateOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsStateOpen(false)} />
            <div className="absolute left-0 top-full mt-1.5 w-full bg-obsidian-900 border border-farm-500/30 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Indian State..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-farm-500"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredStates.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSelectState(s)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      s.toLowerCase() === selectedState.toLowerCase()
                        ? 'bg-farm-500/20 text-farm-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{s}</span>
                  </button>
                ))}
                {filteredStates.length === 0 && (
                  <div className="text-slate-500 text-center py-2 text-xs">No state found</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Searchable District Dropdown (Filtered by State) */}
      <div className="relative">
        <label className="block text-slate-400 mb-1 font-medium">{districtLabel}</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsDistrictOpen(!isDistrictOpen);
            setIsStateOpen(false);
          }}
          className="w-full bg-obsidian-900 border border-slate-700 hover:border-farm-500/50 rounded-xl px-3 py-2 text-left text-white flex items-center justify-between transition-all"
        >
          <span className="truncate">{selectedDistrict || 'Select District'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isDistrictOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDistrictOpen(false)} />
            <div className="absolute left-0 top-full mt-1.5 w-full bg-obsidian-900 border border-farm-500/30 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder={`Search in ${selectedState}...`}
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-farm-500"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredDistricts.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDistrict(d)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      d.toLowerCase() === selectedDistrict.toLowerCase()
                        ? 'bg-farm-500/20 text-farm-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{d}</span>
                  </button>
                ))}
                {filteredDistricts.length === 0 && (
                  <div className="text-slate-500 text-center py-2 text-xs">No district found</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
