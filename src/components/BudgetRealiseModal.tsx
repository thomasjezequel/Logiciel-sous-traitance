import React, { useState, useEffect } from "react";
import { Project, Budget, Realise, Client, Subcontractor } from "../types";
import { X, Save, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

interface BudgetRealiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  budget: Budget;
  realise: Realise;
  clients: Client[];
  subcontractors: Subcontractor[];
  onSaveBudget: (id: string, data: Partial<Budget>) => Promise<void>;
  onSaveRealise: (id: string, data: Partial<Realise>) => Promise<void>;
  userRole?: string;
}

export default function BudgetRealiseModal({
  isOpen,
  onClose,
  project,
  budget,
  realise,
  clients,
  subcontractors,
  onSaveBudget,
  onSaveRealise
, userRole }: BudgetRealiseModalProps) {
  const [bData, setBData] = useState<Partial<Budget>>({});
  const [rData, setRData] = useState<Partial<Realise>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budget && realise) {
      const clientObj = clients.find(c => c.id === project.clientId);
      const subObj = subcontractors.find(s => s.id === project.sousTraitantId);
      
      const defaultClientFG = clientObj && clientObj.fraisGenerauxPct !== undefined ? clientObj.fraisGenerauxPct : 10;
      const defaultSubFG = subObj && subObj.fraisGenerauxPct !== undefined ? subObj.fraisGenerauxPct : 10;

      setBData({
        ...budget,
        fraisGenerauxPct: budget.fraisGenerauxPct !== undefined && budget.id ? budget.fraisGenerauxPct : defaultClientFG
      });
      setRData({
        ...realise,
        fraisGenerauxPct: realise.fraisGenerauxPct !== undefined && realise.id ? realise.fraisGenerauxPct : defaultSubFG
      });
    }
    setError(null);
  }, [budget, realise, isOpen, clients, subcontractors, project]);

  if (!isOpen) return null;

  const handleBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = Number(value) || 0;
    
    const clientObj = clients.find(c => c.id === project.clientId);
    const clientHourlyRate = clientObj ? (clientObj.coutHoraireMO || 0) : 0;

    setBData(prev => {
      const updated = { ...prev, [name]: numValue };
      if (name === "budgetAciers" || name === "budgetPeinture" || name === "budgetDivers") {
        updated.budgetFourniture = (updated.budgetAciers || 0) + (updated.budgetPeinture || 0) + (updated.budgetDivers || 0);
      }
      if (name === "budgetTransport" || name === "budgetProtection") {
        updated.budgetSousTraitance = (updated.budgetTransport || 0) + (updated.budgetProtection || 0);
      }
      
      if (clientHourlyRate > 0) {
        if (name === "budgetHeuresMO") {
          updated.budgetMainOeuvre = Math.round(numValue * clientHourlyRate * 100) / 100;
        } else if (name === "budgetMainOeuvre") {
          updated.budgetHeuresMO = Math.round((numValue / clientHourlyRate) * 100) / 100;
        }
      }
      return updated;
    });
  };

  const handleRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = Number(value) || 0;
    setRData(prev => {
      const updated = { ...prev, [name]: numValue };
      if (name === "achatsAciersRealise" || name === "achatsPeintureRealise" || name === "achatsDiversRealise") {
        updated.achatsFournitureRealise = (updated.achatsAciersRealise || 0) + (updated.achatsPeintureRealise || 0) + (updated.achatsDiversRealise || 0);
      }
      if (name === "achatsTransportRealise" || name === "achatsProtectionRealise") {
        updated.achatsSousTraitanceRealise = (updated.achatsTransportRealise || 0) + (updated.achatsProtectionRealise || 0);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        onSaveBudget(budget.id, bData),
        onSaveRealise(realise.id, rData)
      ]);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du traitement financier.");
    } finally {
      setLoading(false);
    }
  };

  // Math totals helper
  const totalBudget = (bData.budgetFourniture || 0) + (bData.budgetMainOeuvre || 0) + (bData.budgetSousTraitance || 0);
  const overheadBMultiplier = 1 + (bData.fraisGenerauxPct || 0) / 100;
  const grandTotalBudget = totalBudget * overheadBMultiplier;

  const totalRealise = (rData.achatsFournitureRealise || 0) + (rData.achatsMainOeuvreRealise || 0) + (rData.achatsSousTraitanceRealise || 0);
  const overheadRMultiplier = 1 + (rData.fraisGenerauxPct || 0) / 100;
  const grandTotalRealise = totalRealise * overheadRMultiplier;

  const costDifference = grandTotalRealise - grandTotalBudget;
  const isOverBudget = costDifference > 0;

  // Rendements en heures / tonnes
  const bPoidsTonne = (bData.poidsVendu || 0) / 1000;
  const rendementBudget = bPoidsTonne > 0 ? (bData.budgetHeuresMO || 0) / bPoidsTonne : 0;

  const rPoidsTonne = (rData.poidsFabrique || 0) / 1000;
  const rendementRealise = rPoidsTonne > 0 ? (rData.achatsHeuresMO || 0) / rPoidsTonne : 0;

  // € / kg à l'achat matière
  const ratioMatiereB = (bData.poidsVendu || 0) > 0 ? (bData.budgetFourniture || 0) / (bData.poidsVendu || 1) : 0;
  const ratioAciersB = (bData.poidsVendu || 0) > 0 ? (bData.budgetAciers || 0) / (bData.poidsVendu || 1) : 0;

  const ratioMatiereR = (rData.poidsFabrique || 0) > 0 ? (rData.achatsFournitureRealise || 0) / (rData.poidsFabrique || 1) : 0;
  const ratioAciersR = (rData.poidsFabrique || 0) > 0 ? (rData.achatsAciersRealise || 0) / (rData.poidsFabrique || 1) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">📊 Pilotage Financier & Rentabilité</h2>
            <p className="text-xs text-gray-400 mt-1 font-mono">Affaire : {project.nomAffaire} Zone : {project.nomZone}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
 
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Ligne Planifiée: Budgets (Base 5) */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block border-b border-teal-100 pb-1 font-mono">
                1. Budget Prévisionnel (Vendu)
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Poids Vendu (kg)</label>
                  <input
                    type="number"
                    name="poidsVendu"
                    value={bData.poidsVendu || ""}
                    onChange={handleBChange}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Frais Généraux (%)</label>
                  <input
                    type="number"
                    name="fraisGenerauxPct"
                    value={bData.fraisGenerauxPct || ""}
                    onChange={handleBChange}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Fournitures Decomposed container */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider block">🛍️ Décomposition Achat Matière / Fourniture</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block">Aciers (€)</label>
                    <input
                      type="number"
                      name="budgetAciers"
                      value={bData.budgetAciers || ""}
                      onChange={handleBChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block">Peinture (€)</label>
                    <input
                      type="number"
                      name="budgetPeinture"
                      value={bData.budgetPeinture || ""}
                      onChange={handleBChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block">Divers (€)</label>
                    <input
                      type="number"
                      name="budgetDivers"
                      value={bData.budgetDivers || ""}
                      onChange={handleBChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-700">
                  <span className="font-semibold text-slate-500">Matière Total :</span>
                  <span className="font-bold font-mono text-slate-800">{(bData.budgetFourniture || 0).toLocaleString()} €</span>
                </div>
              </div>

              {/* Yield indicators for Budgets */}
              <div className="bg-cyan-50/55 p-3 rounded-lg border border-cyan-100/70 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Budget Matière (€/kg)</span>
                  <strong className="text-slate-800 text-sm font-mono">{ratioMatiereB.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €/kg</strong>
                  <span className="text-[9px] text-slate-400 block mt-0.5">(Aciers seul: {ratioAciersB.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €/kg)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Rendement Vendu (H/T)</span>
                  <strong className="text-slate-800 text-sm font-mono">{rendementBudget.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} H/T</strong>
                  <span className="text-[9px] text-slate-400 block mt-0.5">(Basé sur poids & heures)</span>
                </div>
              </div>

              {/* INTERNAL LABOUR SECTION */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">⚒️ Main d'Œuvre Interne</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500">Nombre d'heures</label>
                    <input
                      type="number"
                      name="budgetHeuresMO"
                      value={bData.budgetHeuresMO || ""}
                      onChange={handleBChange}
                      placeholder="ex: 120"
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Budget MO (€)</label>
                    <input
                      type="number"
                      name="budgetMainOeuvre"
                      value={bData.budgetMainOeuvre || ""}
                      onChange={handleBChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              {/* SUBCONTRACTING BREAKDOWNS (Transport, Protection) */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">🚛 Sous-Traitance (Atelier/Externe)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Transport (€)</label>
                    <input
                      type="number"
                      name="budgetTransport"
                      value={bData.budgetTransport || ""}
                      onChange={handleBChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Protection (€)</label>
                    <input
                      type="number"
                      name="budgetProtection"
                      value={bData.budgetProtection || ""}
                      onChange={handleBChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Budget Sous-Traitance :</span>
                  <span className="font-bold text-slate-800">{(bData.budgetSousTraitance || 0).toLocaleString()} €</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                <span className="font-bold text-slate-600">Total prévisionnel + FG :</span>
                <span className="font-extrabold text-teal-800 text-base">{grandTotalBudget.toLocaleString("fr-FR")} €</span>
              </div>
            </div>
 
            {/* Ligne Actuelle: Réalisé (Base 6) */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-red-700 uppercase tracking-widest block border-b border-red-100 pb-1 font-mono">
                2. Achats Réalisés (Dépenses)
              </span>
 
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Poids Fabriqué (kg)</label>
                  <input
                    type="number"
                    name="poidsFabrique"
                    value={rData.poidsFabrique || ""}
                    onChange={handleRChange}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Frais Généraux (%)</label>
                  <input
                    type="number"
                    name="fraisGenerauxPct"
                    value={rData.fraisGenerauxPct || ""}
                    onChange={handleRChange}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Poids consommés et Taux de chute */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">⚖️ Poids Consommés & Taux de Chute</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Poids utilisé (kg)</label>
                    <input
                      type="number"
                      name="poidsUtilise"
                      value={rData.poidsUtilise || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Poids sous-traité (kg)</label>
                    <input
                      type="number"
                      name="poidsSousTraite"
                      value={rData.poidsSousTraite || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold text-slate-500">Total consommé :</span>
                    <span className="font-bold font-mono text-slate-900">
                      {((rData.poidsUtilise || 0) + (rData.poidsSousTraite || 0)).toLocaleString()} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-semibold text-slate-500">Poids fabriqué (réf.) :</span>
                    <span className="font-medium font-mono text-slate-600">
                      {(rData.poidsFabrique || 0).toLocaleString()} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-rose-50/50 p-1.5 rounded text-rose-950 font-bold mt-1">
                    <span>Taux de chute (chute) :</span>
                    <span className="font-mono">
                      {(() => {
                        const totalCons = (rData.poidsUtilise || 0) + (rData.poidsSousTraite || 0);
                        const poidsFabrique = rData.poidsFabrique || 0;
                        const scrapRate = poidsFabrique > 0 ? ((totalCons / poidsFabrique) - 1) * 100 : 0;
                        return `${scrapRate > 0 ? "+" : ""}${scrapRate.toFixed(2)} %`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Achats Decomposed container */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-pink-800 uppercase tracking-wider block">🛍️ Décomposition Achats Fourniture Réels</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block">Aciers (€)</label>
                    <input
                      type="number"
                      name="achatsAciersRealise"
                      value={rData.achatsAciersRealise || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block">Peinture (€)</label>
                    <input
                      type="number"
                      name="achatsPeintureRealise"
                      value={rData.achatsPeintureRealise || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block">Divers (€)</label>
                    <input
                      type="number"
                      name="achatsDiversRealise"
                      value={rData.achatsDiversRealise || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-700">
                  <span className="font-semibold text-slate-500">Matière Réel :</span>
                  <span className="font-bold font-mono text-slate-800">{(rData.achatsFournitureRealise || 0).toLocaleString()} €</span>
                </div>
              </div>

              {/* Yield indicators for Actuals */}
              <div className="bg-pink-50/55 p-3 rounded-lg border border-pink-100/70 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Achat Matière (€/kg)</span>
                  <strong className="text-slate-800 text-sm font-mono">{ratioMatiereR.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €/kg</strong>
                  <span className="text-[9px] text-slate-400 block mt-0.5">(Aciers seul: {ratioAciersR.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €/kg)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Rendement Réel (H/T)</span>
                  <strong className="text-slate-800 text-sm font-mono">{rendementRealise.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} H/T</strong>
                  <span className="text-[9px] text-slate-400 block mt-0.5">(Basé sur poids & heures)</span>
                </div>
              </div>

              {/* INTERNAL LABOUR SECTION REAL */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">⚒️ Main d'Œuvre Interne Réelle</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500">Nombre d'heures réelles</label>
                    <input
                      type="number"
                      name="achatsHeuresMO"
                      value={rData.achatsHeuresMO || ""}
                      onChange={handleRChange}
                      placeholder="ex: 110"
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Achats MO (€)</label>
                    <input
                      type="number"
                      name="achatsMainOeuvreRealise"
                      value={rData.achatsMainOeuvreRealise || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              {/* SUBCONTRACTING BREAKDOWNS REAL (Transport, Protection) */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">🚛 Sous-Traitance Réelle</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Transport (€)</label>
                    <input
                      type="number"
                      name="achatsTransportRealise"
                      value={rData.achatsTransportRealise || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Protection (€)</label>
                    <input
                      type="number"
                      name="achatsProtectionRealise"
                      value={rData.achatsProtectionRealise || ""}
                      onChange={handleRChange}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">Achats Sous-Traitance :</span>
                  <span className="font-bold text-slate-800">{(rData.achatsSousTraitanceRealise || 0).toLocaleString()} €</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                <span className="font-bold text-slate-600">Total cumulé réel + FG :</span>
                <span className="font-extrabold text-red-800 text-base">{grandTotalRealise.toLocaleString("fr-FR")} €</span>
              </div>
            </div>
 
          </div>
 
          {/* Business comparison insights */}
          <div className={`p-4 rounded-lg flex items-center justify-between border ${isOverBudget ? "bg-red-50 border-red-100 text-red-900" : "bg-emerald-50 border-emerald-100 text-emerald-950"}`}>
            <div className="flex items-center gap-2.5">
              <DollarSign className={`w-5 h-5 ${isOverBudget ? "text-red-600" : "text-emerald-700"}`} />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">Solde financier d'Affaire</span>
                <span className="text-[11px] text-gray-500">
                  {isOverBudget ? "⚠️ Surcoût par rapport au budget initial de vente" : "✅ Dépenses maîtrisées sous les prévisions de vente"}
                </span>
              </div>
            </div>
            <span className="text-lg font-extrabold">
              {isOverBudget ? "+" : ""}{costDifference.toLocaleString("fr-FR")} €
            </span>
          </div>
 
          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 text-sm text-gray-600 rounded-lg hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
  type="button"
  disabled={isSaving || userRole === "Lecteur"}
  title={userRole === "Lecteur" ? "Accès en lecture seule — modification non autorisée" : ""}
  className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition ${
    userRole === "Lecteur"
      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
      : "bg-teal-600 hover:bg-teal-700 text-white"
  }`}
            >
              <Save className="w-4 h-4" />
              {userRole === "Lecteur" ? "🔒 Lecture seule" : loading ? "Enregistrement..." : "Enregistrer les budgets & réalisés"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
