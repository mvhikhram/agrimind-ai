import React, { useState } from 'react';
import { 
  ScanLine, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  History, 
  FileText,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { Farm, Zone, DiseaseRecord } from '../types';
import { aiService, DiseaseAnalysisResult } from '../services/aiService';
import { dataService } from '../services/dataService';

interface DiseaseDetectionProps {
  farm: Farm;
  zones: Zone[];
}

const SAMPLE_LEAF_PRESETS = [
  {
    id: 'early_blight',
    crop: 'Tomato',
    label: 'Tomato Early Blight',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef231c9?w=600&auto=format&fit=crop&q=80',
    description: 'Target-board concentric brown rings with yellow halo'
  },
  {
    id: 'powdery_mildew',
    crop: 'Tomato / Groundnut',
    label: 'Powdery Mildew',
    url: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600&auto=format&fit=crop&q=80',
    description: 'White talcum-like mycelial powder on upper cuticle'
  },
  {
    id: 'healthy_leaf',
    crop: 'Tomato',
    label: 'Healthy Green Foliage',
    url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&auto=format&fit=crop&q=80',
    description: 'Optimal chlorophyll density, intact cell turgor'
  }
];

export const DiseaseDetection: React.FC<DiseaseDetectionProps> = ({ farm, zones }) => {
  const [selectedCrop, setSelectedCrop] = useState<string>('Tomato');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || '');
  const [previewUrl, setPreviewUrl] = useState<string>(SAMPLE_LEAF_PRESETS[0].url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DiseaseAnalysisResult | null>(null);

  const diseaseHistory = dataService.getDiseaseRecords(farm.id);

  const handleScanLeaf = async () => {
    setIsScanning(true);
    setAnalysisResult(null);

    const result = await aiService.analyzeLeafImage(previewUrl, selectedCrop);
    setAnalysisResult(result);
    setIsScanning(false);

    // Save record to database / data service with optional Supabase Storage upload
    await dataService.addDiseaseRecord({
      farm_id: farm.id,
      zone_id: selectedZoneId,
      crop_name: selectedCrop,
      image_url: previewUrl,
      possible_disease: result.possible_disease,
      confidence: result.confidence,
      severity: result.severity,
      symptoms: result.symptoms,
      recommended_actions: result.recommended_actions
    }, selectedFile || undefined);
  };

  const handleSelectPreset = (preset: typeof SAMPLE_LEAF_PRESETS[0]) => {
    setPreviewUrl(preset.url);
    setSelectedFile(null);
    setSelectedCrop(preset.crop.split(' / ')[0]);
    setAnalysisResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAnalysisResult(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-farm-400" />
            <span>AI-Assisted Disease Identification</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Computer vision leaf diagnostic service with pathology classification & organic treatment advisories.
          </p>
        </div>
        <div className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
          Demo Disease Engine (Hackathon Prototype)
        </div>
      </div>

      {/* Main Diagnostic Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Upload & Image Preview Canvas */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white mb-3">Foliage Sample Input</h3>

            {/* Target Selectors */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Monitored Crop</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Tomato">Tomato (Solanum lycopersicum)</option>
                  <option value="Groundnut">Groundnut (Arachis hypogaea)</option>
                  <option value="Wheat">Winter Wheat (Triticum aestivum)</option>
                  <option value="Cotton">Cotton (Gossypium hirsutum)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Zone</label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Canvas with Scan Beam */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-farm-500/30 bg-black/50 aspect-video flex items-center justify-center mb-4 group">
              <img
                src={previewUrl}
                alt="Leaf Preview"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Scanning Animation Laser Line */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-farm-400 to-transparent shadow-glow-lg animate-[bounce_1.5s_infinite]" />
              )}

              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-farm-300 border border-farm-500/30">
                {selectedCrop} Foliage Preview
              </div>
            </div>

            {/* Quick Presets for 1-Click Hackathon Demo */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">
                1-Click Preset Samples for Instant Presentation:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_LEAF_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`p-2 rounded-xl border text-left text-xs transition-all ${
                      previewUrl === p.url 
                        ? 'bg-farm-500/20 border-farm-400 text-farm-300 font-bold' 
                        : 'bg-obsidian-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="truncate">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-5 mt-5 border-t border-slate-800 flex items-center gap-3">
            <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-2.5 rounded-xl bg-obsidian-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs">
              <UploadCloud className="w-4 h-4" />
              <span>Upload Custom Leaf Image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleScanLeaf}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-xs shadow-glow-sm transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isScanning ? 'Analyzing Neural Vision...' : 'Run Disease Diagnosis'}</span>
            </button>
          </div>
        </div>

        {/* Right: Diagnosis Results Card */}
        <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-farm-500/10">
              <h3 className="font-display font-bold text-base text-white">AI Diagnostic Assessment</h3>
              {analysisResult && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
                    DEMO RESULT
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                    Heuristic Match
                  </span>
                </div>
              )}
            </div>

            {analysisResult ? (
              <div className="space-y-4 text-xs">
                {/* Condition & Severity */}
                <div className="p-4 rounded-2xl bg-obsidian-900 border border-farm-500/20 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Possible Disease:</span>
                    <h4 className="font-display font-black text-base text-white mt-0.5">
                      {analysisResult.possible_disease}
                    </h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                    analysisResult.severity === 'High' 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                      : analysisResult.severity === 'Medium'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-farm-500/20 text-farm-300 border-farm-500/40'
                  }`}>
                    Severity: {analysisResult.severity}
                  </span>
                </div>

                {/* Symptoms */}
                <div className="p-4 rounded-2xl bg-obsidian-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-semibold mb-1">Identified Foliar Symptoms:</span>
                  <p className="text-slate-200 leading-relaxed">{analysisResult.symptoms}</p>
                </div>

                {/* Recommended Actions */}
                <div className="p-4 rounded-2xl bg-farm-950/40 border border-farm-500/30">
                  <span className="text-[11px] text-farm-300 block font-semibold mb-1">Recommended Agronomic Actions:</span>
                  <p className="text-slate-200 leading-relaxed">{analysisResult.recommended_actions}</p>
                </div>

                {/* Mandatory Disclaimer */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{analysisResult.disclaimer}</p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ScanLine className="w-12 h-12 text-farm-500/40 mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-slate-300">Ready to Analyze Foliage</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Choose a leaf preset above or upload an image, then click "Run Disease Diagnosis".
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 italic text-right">
            Demo Disease Engine — illustrative crop diagnostic demonstration for hackathon evaluation.
          </div>
        </div>
      </div>

      {/* Disease Detection History Table */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-farm-400" />
              <span>Previous Disease Scans & Canopy Health Records</span>
            </h3>
            <p className="text-xs text-slate-400">Stored scans with severity classification and suggested remediation.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Supabase Storage</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-farm-500/15 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Crop</th>
                <th className="pb-3 font-semibold">Possible Disease</th>
                <th className="pb-3 font-semibold">Confidence</th>
                <th className="pb-3 font-semibold">Severity</th>
                <th className="pb-3 font-semibold">Recommended Remediation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {diseaseHistory.map((d) => (
                <tr key={d.id} className="hover:bg-farm-900/10">
                  <td className="py-3 text-slate-400 font-medium">{d.detected_at}</td>
                  <td className="py-3 font-bold text-white">{d.crop_name}</td>
                  <td className="py-3 font-semibold text-slate-200">{d.possible_disease}</td>
                  <td className="py-3 font-mono font-bold text-farm-400">{d.confidence}%</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.severity === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {d.severity}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300 max-w-xs truncate">{d.recommended_actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
