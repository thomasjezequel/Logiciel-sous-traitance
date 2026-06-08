import React, { useState, useEffect } from "react";
import { Billing, Project, Client, Subcontractor, BillingStatus, BillingUnit } from "../types";
import { X, Save, AlertTriangle, Link } from "lucide-react";

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  billing?: Billing;
  projects: Project[];
  clients: Client[];
  subcontractors: Subcontractor[];
  billings: Billing[];
  budgets: any[];
  realises: any[];
  onSave: (data: Partial<Billing>) => Promise<void>;
}

export default function BillingModal({ 
  isOpen, 
  onClose, 
  billing, 
  projects, 
  clients, 
  subcontractors, 
  billings,
  budgets,
  realises,
  onSave 
}: BillingModalProps) {
  const [formData, setFormData] = useState<Partial<Billing>>({
    projetId: "",
    projetIds: [],
    typePrestation: "",
    quantiteFacturee: 0,
    uniteFacturee: BillingUnit.KG,
    prixUnitaire: 0,
    etatFacturation: BillingStatus.BROUILLON,
    dateFacturation: new Date().toISOString().substring(0, 10),
    dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    factureRecue: false,
    commentaire: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // List of all project IDs that are already linked to OTHER billings
  const projectsWithOtherBillingsStr = new Set<string>();
  billings.forEach(b => {
    // If it's not the billing we are currently editing:
    if (!billing || b.id !== billing.id) {
      if (b.projetId) projectsWithOtherBillingsStr.add(b.projetId);
      if (b.projetIds && Array.isArray(b.projetIds)) {
        b.projetIds.forEach(id => projectsWithOtherBillingsStr.add(id));
      }
    }
  });

  // Projects that do not have any other billing yet
  const availableProjects = projects.filter(p => !projectsWithOtherBillingsStr.has(p.id));

  // Derive Client & Subcontractor from selected project
  const selectedProject = projects.find(p => p.id === formData.projetId);
  const derivedClient = selectedProject ? clients.find(c => c.id === selectedProject.clientId) : null;
  const derivedSub = selectedProject ? subcontractors.find(s => s.id === selectedProject.sousTraitantId) : null;

  // Find other eligible projects (must have same client & subcontractor & numCommande and no other billing)
  const eligibleForMultiSelection = selectedProject
    ? availableProjects.filter(p => 
        p.id !== selectedProject.id && 
        p.clientId === selectedProject.clientId && 
        p.sousTraitantId === selectedProject.sousTraitantId &&
        p.numCommande === selectedProject.numCommande
      )
    : [];

  useEffect(() => {
    if (billing) {
      setFormData({ 
        ...billing,
        projetIds: billing.projetIds || [],
        factureRecue: !!billing.factureRecue,
        commentaire: billing.commentaire || ""
      });
    } else {
      setFormData({
        projetId: "",
        projetIds: [],
        typePrestation: "",
        quantiteFacturee: 0,
        uniteFacturee: BillingUnit.KG,
        prixUnitaire: 0,
        etatFacturation: BillingStatus.BROUILLON,
        dateFacturation: new Date().toISOString().substring(0, 10),
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        factureRecue: false,
        commentaire: ""
      });
    }
    setError(null);
  }, [billing, isOpen, projects]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setError(null);

    // If project shifts, we can auto-fill some smart quantities/units if empty
    if (name === "projetId") {
      const proj = projects.find(p => p.id === value);
      setFormData(prev => ({
        ...prev,
        projetId: value,
        quantiteFacturee: proj ? proj.poidsTotal : 0,
        uniteFacturee: BillingUnit.KG
      }));
      return;
    }

    if (["quantiteFacturee", "prixUnitaire"].includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: Number(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projetId) {
      setError("Veuillez lier cette prestation à un projet.");
      return;
    }
    if (!formData.typePrestation?.trim()) {
      setError("Le type de prestation est requis.");
      return;
    }
    if (formData.quantiteFacturee! <= 0) {
      setError("Veuillez entrer une quantité facturée positive.");
      return;
    }
    if (formData.prixUnitaire! < 0) {
      setError("Le prix unitaire ne peut pas être négatif.");
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Échec d'enregistrement de la facturation.");
    } finally {
      setLoading(false);
    }
  };

  const calculatedTotal = (formData.quantiteFacturee || 0) * (formData.prixUnitaire || 0);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {billing ? "💰 Modifier l'Événement de Facturation" : "🧾 Enregistrer une Nouvelle Facture / Prestation"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Bindings - Key relational link */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Affaire de Référence *</label>
            <select
              name="projetId"
              value={formData.projetId || ""}
              onChange={handleChange}
              required
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
            >
              <option value="">-- Sélectionner l'Affaire-Zone --</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nomAffaire} ({p.nomZone})
                </option>
              ))}
            </select>
          </div>

          {/* Derived Connections (Client & Sous-traitant shown logically with indicators) */}
          {selectedProject && (
            <div className="bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-semibold block text-gray-500 uppercase tracking-widest text-[9px]">Client Propriétaire</span>
                <span className="font-bold text-gray-800 mt-0.5 block">{derivedClient?.nom || "Non lié"}</span>
              </div>
              <div>
                <span className="font-semibold block text-gray-500 uppercase tracking-widest text-[9px]">Fabricant Sous-Traitant</span>
                <span className="font-bold text-gray-800 mt-0.5 block">{derivedSub?.nom || "Non lié"}</span>
              </div>
            </div>
          )}

          {/* Multiple reference projects support */}
          {selectedProject && eligibleForMultiSelection.length > 0 && (
            <div className="bg-teal-50/40 border border-teal-200 rounded-lg p-3">
              <span className="text-[11px] font-bold text-teal-800 block mb-1.5 uppercase font-mono tracking-wide">
                🔗 Regrouper d'autres affaires de même client, sous-traitant ET N° de commande ({eligibleForMultiSelection.length}) :
              </span>
              <div className="space-y-1.5 bg-white p-2.5 rounded border border-teal-100 max-h-36 overflow-y-auto">
                {eligibleForMultiSelection.map(projItem => {
                  const isChecked = formData.projetIds?.includes(projItem.id);
                  return (
                    <label key={projItem.id} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium hover:bg-slate-50 cursor-pointer py-1 px-1.5 rounded transition">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => {
                            const currentIds = prev.projetIds || [];
                            const nextIds = checked
                              ? [...currentIds, projItem.id]
                              : currentIds.filter(id => id !== projItem.id);
                            return { ...prev, projetIds: nextIds };
                          });
                        }}
                        className="rounded text-teal-650 focus:ring-teal-500 border-slate-350 w-3.5 h-3.5"
                      />
                      <span>{projItem.nomAffaire} ({projItem.nomZone}) - {projItem.poidsTotal.toLocaleString()} kg</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-time Budget vs Realized Overview */}
          {(() => {
            const activeIds = [
              ...(formData.projetId ? [formData.projetId] : []),
              ...(formData.projetIds || [])
            ];

            if (activeIds.length === 0) return null;

            const selectedBudgets = budgets.filter(b => activeIds.includes(b.projetId));
            const selectedRealises = realises.filter(r => activeIds.includes(r.projetId));

            const totalB_Fourniture = selectedBudgets.reduce((sum, b) => sum + (b.budgetFourniture || 0), 0);
            const totalB_MO = selectedBudgets.reduce((sum, b) => sum + (b.budgetMainOeuvre || 0), 0);
            const totalB_Sub = selectedBudgets.reduce((sum, b) => sum + (b.budgetSousTraitance || 0), 0);
            const totalB_Heures = selectedBudgets.reduce((sum, b) => sum + (b.budgetHeuresMO || 0), 0);
            const totalB_Sum = totalB_Fourniture + totalB_MO + totalB_Sub;

            const totalR_Fourniture = selectedRealises.reduce((sum, r) => sum + (r.achatsFournitureRealise || 0), 0);
            const totalR_MO = selectedRealises.reduce((sum, r) => sum + (r.achatsMainOeuvreRealise || 0), 0);
            const totalR_Sub = selectedRealises.reduce((sum, r) => sum + (r.achatsSousTraitanceRealise || 0), 0);
            const totalR_Heures = selectedRealises.reduce((sum, r) => sum + (r.achatsHeuresMO || 0), 0);
            const totalR_Sum = totalR_Fourniture + totalR_MO + totalR_Sub;

            const costDifference = totalB_Sum - totalR_Sum;
            const isOverBudget = totalR_Sum > totalB_Sum;
            const percentageOfBudgetUsed = totalB_Sum > 0 ? (totalR_Sum / totalB_Sum) * 105 - 5 : 0; // scaled for bar
            const rawPercentage = totalB_Sum > 0 ? (totalR_Sum / totalB_Sum) * 100 : 0;

            return (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
                  📊 Visuel Inter-Affaires : Synthèse Budgets vs Réalisés
                </span>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2 rounded border border-slate-150">
                    <span className="text-gray-400 block font-medium">Budgets Total brut :</span>
                    <span className="text-sm font-bold text-teal-700">{totalB_Sum.toLocaleString()} €</span>
                    <span className="text-[10px] text-gray-500 block font-mono">({totalB_Heures} h M.O)</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-150">
                    <span className="text-gray-400 block font-medium">Réalisé cumulé brut :</span>
                    <span className={`text-sm font-bold ${isOverBudget ? "text-rose-600" : "text-amber-600"}`}>
                      {totalR_Sum.toLocaleString()} €
                    </span>
                    <span className="text-[10px] text-gray-500 block font-mono">({totalR_Heures} h M.O)</span>
                  </div>
                </div>

                {totalB_Sum > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-600">Consommation du budget : {rawPercentage.toFixed(1)}%</span>
                      <span className={isOverBudget ? "text-rose-600 font-bold" : "text-emerald-700"}>
                        {isOverBudget 
                          ? `Dépassement de ${(totalR_Sum - totalB_Sum).toLocaleString()} €` 
                          : `Marge restante : ${costDifference.toLocaleString()} €`
                        }
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverBudget ? "bg-rose-600" : rawPercentage > 90 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(rawPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Prestation description */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Type de Prestation / Libellé de Ligne *</label>
            <input
              type="text"
              name="typePrestation"
              placeholder="ex: Main d'œuvre soudage structure"
              value={formData.typePrestation || ""}
              onChange={handleChange}
              required
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
            />
          </div>

          {/* Quantities, Unit, and Price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Quantité *</label>
              <input
                type="number"
                name="quantiteFacturee"
                step="any"
                min="0.01"
                value={formData.quantiteFacturee || ""}
                onChange={handleChange}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Unité facturée *</label>
              <select
                name="uniteFacturee"
                value={formData.uniteFacturee || BillingUnit.KG}
                onChange={handleChange}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              >
                <option value={BillingUnit.KG}>kg</option>
                <option value={BillingUnit.ML}>ml</option>
                <option value={BillingUnit.HEURE}>heures</option>
                <option value={BillingUnit.FORFAIT}>forfait</option>
                <option value={BillingUnit.ENS}>Ens</option>
                <option value={BillingUnit.U}>U</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">P.U. (€) *</label>
              <input
                type="number"
                name="prixUnitaire"
                step="any"
                min="0"
                value={formData.prixUnitaire || ""}
                onChange={handleChange}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              />
            </div>
          </div>

          {/* State of billing and Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-medium text-gray-500 block mb-1">État Facturation *</label>
              <select
                name="etatFacturation"
                value={formData.etatFacturation || BillingStatus.BROUILLON}
                onChange={handleChange}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              >
                <option value={BillingStatus.BROUILLON}>Brouillon</option>
                <option value={BillingStatus.ENVOYEE}>Envoyée</option>
                <option value={BillingStatus.PAYEE}>Payée</option>
                <option value={BillingStatus.REJETEE}>Rejetée</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Date Facturation</label>
              <input
                type="date"
                name="dateFacturation"
                value={formData.dateFacturation || ""}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Échéance</label>
              <input
                type="date"
                name="dateEcheance"
                value={formData.dateEcheance || ""}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              />
            </div>
          </div>

          {/* Real Invoice Receipt Indicator (Bien reçu la facture) */}
          <div className="p-3 bg-amber-50/50 border border-amber-205 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="factureRecue"
                checked={!!formData.factureRecue}
                onChange={(e) => setFormData(prev => ({ ...prev, factureRecue: e.target.checked }))}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="factureRecue" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                🧾 Facture bien reçue (Analyse pour facturation)
              </label>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${formData.factureRecue ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {formData.factureRecue ? "Reçue" : "En attente"}
            </span>
          </div>

          {/* Section Commentaire pour le rapport */}
          <div className="mt-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Commentaire (apparaît sur le rapport financier d'affaire)
            </label>
            <textarea
              name="commentaire"
              value={formData.commentaire || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
              placeholder="Saisissez vos justifications de prix, de rendements, ou commentaires financiers pour ce rapport..."
              rows={3}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white leading-relaxed resize-none"
            />
          </div>

          {/* Total calculation banner */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-5 py-3.5 flex justify-between items-center text-teal-900 mt-2">
            <span className="text-xs font-bold uppercase tracking-wider">Montant total partiel de ligne :</span>
            <span className="text-xl font-extrabold text-teal-800">
              {calculatedTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
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
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 shadow-xs flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              {loading ? "Enregistrement..." : "Valider la facture"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
