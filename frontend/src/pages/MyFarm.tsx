import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Check, 
  Layers, 
  Droplets, 
  Calendar, 
  Sparkles,
  Navigation,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { Farm, Zone } from '../types';
import { dataService } from '../services/dataService';
import { AddFarmWizardModal } from '../components/farm/AddFarmWizardModal';
import { StateDistrictSelector } from '../components/common/StateDistrictSelector';

interface MyFarmProps {
  farms: Farm[];
  activeFarmId: string;
  onSelectFarm: (farmId: string) => void;
  onFarmAdded: (newFarm: Farm) => void;
  isAddModalOpenInitially?: boolean;
  onCloseModal?: () => void;
  onNavigateToDashboard?: () => void;
}

export const MyFarm: React.FC<MyFarmProps> = ({
  farms,
  activeFarmId,
  onSelectFarm,
  onFarmAdded,
  isAddModalOpenInitially = false,
  onCloseModal,
  onNavigateToDashboard
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(isAddModalOpenInitially);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [deletingFarm, setDeletingFarm] = useState<Farm | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editState, setEditState] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editArea, setEditArea] = useState('5.0');
  const [editSoilType, setEditSoilType] = useState('Sandy Clay Loam');
  const [editSoilPh, setEditSoilPh] = useState(6.5);
  const [editWater, setEditWater] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editMethod, setEditMethod] = useState<'Drip' | 'Sprinkler' | 'Flood'>('Drip');
  const [editSeason, setEditSeason] = useState<'Kharif' | 'Rabi' | 'Zaid' | 'Perennial'>('Kharif');

  const activeFarm = farms.find(f => f.id === activeFarmId) || farms[0];

  useEffect(() => {
    if (isAddModalOpenInitially) {
      setIsAddModalOpen(true);
    }
  }, [isAddModalOpenInitially]);

  const openEditModal = (farm: Farm) => {
    setEditingFarm(farm);
    setEditName(farm.name);
    setEditState(farm.state);
    setEditDistrict(farm.district);
    setEditVillage(farm.village_city);
    setEditArea(farm.area_acres.toString());
    setEditSoilType(farm.soil_type);
    setEditSoilPh(farm.soil_ph || 6.5);
    setEditWater(farm.water_availability);
    setEditMethod(farm.irrigation_method);
    setEditSeason(farm.season);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarm || !editName.trim()) return;

    setIsSubmittingEdit(true);
    const updated: Farm = {
      ...editingFarm,
      name: editName.trim(),
      state: editState,
      district: editDistrict,
      village_city: editVillage.trim() || 'Rural Area',
      area_acres: parseFloat(editArea) || 1.0,
      soil_type: editSoilType,
      soil_ph: editSoilPh,
      water_availability: editWater,
      irrigation_method: editMethod,
      season: editSeason
    };

    await dataService.updateFarm(updated);
    setIsSubmittingEdit(false);
    setEditingFarm(null);
    setActionNotice(`Farm "${updated.name}" updated successfully in Supabase.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!deletingFarm) return;

    setIsSubmittingDelete(true);
    const deletedName = deletingFarm.name;
    const deletedId = deletingFarm.id;

    await dataService.deleteFarm(deletedId);

    setIsSubmittingDelete(false);
    setDeletingFarm(null);
    setActionNotice(`Farm "${deletedName}" and associated records removed.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Add Farm CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white">Farm Management & Plot Mapping</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage multiple physical farm locations, soil profiles, water supplies, and precision irrigation zones.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-bold text-sm shadow-glow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Farm</span>
        </button>
      </div>

      {/* Action Toast Notice */}
      {actionNotice && (
        <div className="p-3 bg-farm-500/10 border border-farm-500/30 rounded-2xl text-xs font-semibold text-farm-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-farm-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Farm Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {farms.map((f) => {
          const isCurrent = f.id === activeFarmId;
          const farmZones = dataService.getZones(f.id);
          const isDemoFarm = f.id === '00000000-0000-0000-0000-000000000001' || f.name.toLowerCase().includes('demo');

          return (
            <div
              key={f.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'bg-obsidian-800 border-farm-400 shadow-glow-sm'
                  : 'bg-obsidian-850/80 border-farm-500/15 hover:border-farm-500/40'
              }`}
            >
              <div>
                {/* Header row with badges and action buttons */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-black text-lg text-white">{f.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-farm-500/20 text-farm-300 border border-farm-500/30">
                          ACTIVE SELECTION
                        </span>
                      )}
                      {isDemoFarm && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <span>🟡</span>
                          <span>DEMO FARM</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-farm-400 shrink-0" />
                      <span>{f.village_city}, {f.district}, {f.state}</span>
                    </p>
                  </div>

                  {/* Actions: Edit & Delete buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditModal(f)}
                      title="Edit Farm Details"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => setDeletingFarm(f)}
                      title="Delete Farm"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/20 transition-all text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Specs Pills */}
                <div className="grid grid-cols-3 gap-2 my-4 text-center">
                  <div className="p-2.5 rounded-xl bg-obsidian-900 border border-farm-500/10">
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Area</div>
                    <div className="font-display font-bold text-sm text-white mt-0.5">{f.area_acres} Acres</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-obsidian-900 border border-farm-500/10">
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Soil</div>
                    <div className="font-display font-bold text-xs text-white mt-0.5 truncate">{f.soil_type}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-obsidian-900 border border-farm-500/10">
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Method</div>
                    <div className="font-display font-bold text-xs text-farm-300 mt-0.5">{f.irrigation_method}</div>
                  </div>
                </div>

                {/* Crops Allocation (if available) */}
                {f.crops_allocation && f.crops_allocation.length > 0 && (
                  <div className="pt-3 border-t border-slate-700/40 my-3">
                    <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>🌾</span>
                        <span>Crop Allocation ({f.crops_allocation.length} crops)</span>
                      </span>
                      <span className="text-[11px] text-farm-300 font-mono">
                        {f.crops_allocation.reduce((s, c) => s + c.area_acres, 0).toFixed(1)} / {f.area_acres} ac
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {f.crops_allocation.map((ca, cIdx) => (
                        <span 
                          key={cIdx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-farm-500/10 text-farm-200 border border-farm-500/25 flex items-center gap-1.5"
                        >
                          <strong className="text-white">{ca.crop_name}</strong>
                          <span className="text-farm-400 font-mono">({ca.area_acres} ac &bull; {ca.percentage}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zones in this farm */}
                <div className="pt-3 border-t border-slate-700/40">
                  <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Configured Zones ({farmZones.length})</span>
                    <span className="text-[11px] text-farm-400 font-mono">
                      {farmZones.length > 3 ? 'Sequential Actuator (Logical Channels)' : 'Sequential Actuator'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {farmZones.map(z => (
                      <span 
                        key={z.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 flex items-center gap-1.5"
                      >
                        <span className="text-farm-400 font-bold">Z{z.zone_number}:</span>
                        <strong className="text-white">{z.crop_name}</strong>
                        <span className="text-[11px] text-slate-400">({z.area_acres} ac)</span>
                        {z.priority && (
                          <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            z.priority === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {z.priority}
                          </span>
                        )}
                      </span>
                    ))}
                    {farmZones.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No zones configured yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Switch button */}
              <div className="mt-5 pt-3 border-t border-slate-700/40 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Season: <strong className="text-slate-200">{f.season}</strong> • pH: <strong className="text-slate-200">{f.soil_ph}</strong>
                </span>

                {!isCurrent ? (
                  <button
                    onClick={() => onSelectFarm(f.id)}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-farm-500/15 hover:bg-farm-500 text-farm-300 hover:text-obsidian-950 border border-farm-500/30 transition-all"
                  >
                    Switch to This Farm
                  </button>
                ) : (
                  <span className="text-xs font-bold text-farm-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Current Active Farm</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Farm Geographic Location Overview Card */}
      {activeFarm && (
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-farm-500/10">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-farm-400" />
                <span>Geographic Location & Microclimate: {activeFarm.name}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {activeFarm.village_city}, {activeFarm.district}, {activeFarm.state} • Regional agro-climatic profile.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-farm-300 bg-farm-500/10 px-3 py-1 rounded-full border border-farm-500/20 self-start sm:self-auto">
              India Agritech Zone
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Soil pH & Texture</span>
              <strong className="text-white text-sm mt-1 block">pH {activeFarm.soil_ph} • {activeFarm.soil_type}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Water Availability</span>
              <strong className="text-sky-300 text-sm mt-1 block">{activeFarm.water_availability} Groundwater</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Crop Season</span>
              <strong className="text-farm-300 text-sm mt-1 block">{activeFarm.season}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Primary Delivery</span>
              <strong className="text-teal-300 text-sm mt-1 block">{activeFarm.irrigation_method} Method</strong>
            </div>
          </div>
        </div>
      )}

      {/* EDIT FARM MODAL */}
      {editingFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-obsidian-900 border border-farm-500/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-farm-400" />
                <h3 className="font-display font-bold text-lg text-white">Edit Farm Details</h3>
              </div>
              <button
                onClick={() => setEditingFarm(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Farm Name */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Farm Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                />
              </div>

              {/* State & District Searchable Selector */}
              <StateDistrictSelector
                selectedState={editState}
                selectedDistrict={editDistrict}
                onStateChange={setEditState}
                onDistrictChange={setEditDistrict}
              />

              {/* Village & Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Village / Town</label>
                  <input
                    type="text"
                    value={editVillage}
                    onChange={(e) => setEditVillage(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Total Area (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  />
                </div>
              </div>

              {/* Soil Type & pH Slider */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Soil Type</label>
                  <select
                    value={editSoilType}
                    onChange={(e) => setEditSoilType(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  >
                    <option value="Black Cotton (Regur)">Black Cotton (Regur)</option>
                    <option value="Red Sandy Loam">Red Sandy Loam</option>
                    <option value="Sandy Clay Loam">Sandy Clay Loam</option>
                    <option value="Alluvial Loam">Alluvial Loam</option>
                    <option value="Laterite / Clay">Laterite / Clay</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400 font-medium">Soil pH: {editSoilPh}</label>
                    <span className="text-[10px] text-farm-400">
                      {editSoilPh < 6.0 ? 'Acidic' : editSoilPh > 7.5 ? 'Alkaline' : 'Optimal Neutral'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4.5"
                    max="8.5"
                    step="0.1"
                    value={editSoilPh}
                    onChange={(e) => setEditSoilPh(parseFloat(e.target.value))}
                    className="w-full accent-farm-400 mt-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Water, Irrigation, Season */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Water Availability</label>
                  <select
                    value={editWater}
                    onChange={(e) => setEditWater(e.target.value as any)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  >
                    <option value="High">High (Perennial)</option>
                    <option value="Medium">Medium (Seasonal)</option>
                    <option value="Low">Low (Restricted)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Irrigation Method</label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value as any)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  >
                    <option value="Drip">Drip Irrigation</option>
                    <option value="Sprinkler">Sprinkler</option>
                    <option value="Flood">Flood Irrigation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Season</label>
                  <select
                    value={editSeason}
                    onChange={(e) => setEditSeason(e.target.value as any)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-farm-500"
                  >
                    <option value="Kharif">Kharif (Monsoon)</option>
                    <option value="Rabi">Rabi (Winter)</option>
                    <option value="Zaid">Zaid (Summer)</option>
                    <option value="Perennial">Perennial</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={() => setEditingFarm(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black shadow-glow-sm transition-all flex items-center gap-2"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-obsidian-900 border border-rose-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-white">Delete this farm?</h3>
                <span className="text-xs text-rose-300 font-medium">{deletingFarm.name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-obsidian-950 p-3.5 rounded-2xl border border-slate-800">
              All associated zones, crop cycles, irrigation history and farm-specific records may also be removed.
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={() => setDeletingFarm(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-glow-sm transition-all"
              >
                {isSubmittingDelete ? 'Deleting...' : 'Delete Farm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integrated Add Farm Wizard Modal */}
      <AddFarmWizardModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          onCloseModal?.();
        }}
        onFarmCreated={(newFarm) => {
          onFarmAdded(newFarm);
          onSelectFarm(newFarm.id);
          setIsAddModalOpen(false);
          onCloseModal?.();
          onNavigateToDashboard?.();
        }}
        onNavigateToDashboard={onNavigateToDashboard}
      />
    </div>
  );
};
