import React, { useState, useEffect } from "react";
import { Project, Client, Subcontractor, ProjectStatus } from "../types";
import { X, Save, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

export const CHECKLIST_FIELDS = [
  { id: "commandeInitiale", label: "Commande initiale" },
  { id: "bureauEtude", label: "Bureau d’étude" },
  { id: "miseEnBarre", label: "Mise en barre" },
  { id: "commandeAcier", label: "Commande acier" },
  { id: "fabricationDiverse", label: "Fabrication diverse" },
  { id: "fabricationDébit", label: "Fabrication débit seul" },
  { id: "fabricationPDC", label: "Fabrication PDC" },
  { id: "fabricationPRS", label: "Fabrication PRS" },
  { id: "fournitureBoulonnerie", label: "Fourniture boulonnerie" },
  { id: "fournitureEtiquettes", label: "Fourniture des étiquettes" },
  { id: "poseEtiquettes", label: "Pose des étiquettes" },
  { id: "protectionGereePar", label: "Protection gérée par" },
  { id: "livraisonSiteProtection", label: "Livraison site de protection" },
  { id: "paiementFactures", label: "Paiement de la facture" },
  { id: "enlevementSiteProtection", label: "Enlèvement site de protection" },
  { id: "livraisonChantier", label: "Livraison sur chantier" },
  { id: "livraisonAtelier", label: "Livraison à l'atelier" },
  { id: "pose", label: "Pose" }
];

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project; // If passed, we are in edit mode
  clients: Client[];
  subcontractors: Subcontractor[];
  onSave: (data: Partial<Project>) => Promise<void>;
}

export default function ProjectModal({ isOpen, onClose, project, clients, subcontractors, onSave }: ProjectModalProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    nomAffaire: "",
    nomZone: "",
    numCommande: "",
    dateCommande: new Date().toISOString().substring(0, 10),
    clientId: "",
    poidsTotal: 0,
    poidsPRS: undefined,
    quantiteMl: undefined,
    poidsPDC: undefined,
    protection: "Galvanisation",
    dessinateur: "",
    conducteurTravaux: "", // Empty by default now
    delaiLivraisonProtection: "",
    delaiLivraisonChantier: "",
    sousTraitantId: "",
    status: ProjectStatus.EN_COURS,
    typeOuvrage: "",
    remarquesPrestation: ""
  });

  const [typesOuvrage, setTypesOuvrage] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dynamic types
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const list = await api.getTypesOuvrage();
        setTypesOuvrage(list);
      } catch (err) {
        console.error("Échec de chargement des types d'ouvrages :", err);
      }
    };
    fetchTypes();
  }, [isOpen]);

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        // Ensure string formats in inputs
        dateCommande: project.dateCommande || "",
        delaiLivraisonProtection: project.delaiLivraisonProtection || "",
        delaiLivraisonChantier: project.delaiLivraisonChantier || "",
        status: project.status || ProjectStatus.EN_COURS,
        typeOuvrage: project.typeOuvrage || "",
        remarquesPrestation: project.remarquesPrestation || "",
        checklistClient: project.checklistClient || {},
        checklistSubcontractor: project.checklistSubcontractor || {}
      });
    } else {
      // Clear for addition
      setFormData({
        nomAffaire: "",
        nomZone: "",
        numCommande: "",
        dateCommande: new Date().toISOString().substring(0, 10),
        clientId: clients.length > 0 ? clients[0].id : "",
        poidsTotal: 0,
        poidsPRS: undefined,
        quantiteMl: undefined,
        poidsPDC: undefined,
        protection: "Galvanisation",
        dessinateur: "",
        conducteurTravaux: "", // Empty for creation as requested
        delaiLivraisonProtection: "",
        delaiLivraisonChantier: "",
        sousTraitantId: subcontractors.length > 0 ? subcontractors[0].id : "",
        status: ProjectStatus.EN_COURS,
        typeOuvrage: "",
        remarquesPrestation: "",
        checklistClient: {},
        checklistSubcontractor: {}
      });
    }
    setError(null);
  }, [project, isOpen, clients, subcontractors]);

  // Automatic computation of total weights
  useEffect(() => {
    const pPRS = formData.poidsPRS;
    const pPDC = formData.poidsPDC;
    if (pPRS !== undefined || pPDC !== undefined) {
      const sum = (Number(pPDC) || 0) + (Number(pPRS) || 0);
      setFormData(prev => ({
        ...prev,
        poidsTotal: sum
      }));
    }
  }, [formData.poidsPRS, formData.poidsPDC]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setError(null);

    if (["poidsTotal", "poidsPRS", "poidsPDC", "quantiteMl"].includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: value === "" ? undefined : Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleChecklistChange = (column: "client" | "subcontractor", itemId: string, checked: boolean) => {
    setFormData(prev => {
      const field = column === "client" ? "checklistClient" : "checklistSubcontractor";
      const current = prev[field] || {};
      return {
        ...prev,
        [field]: {
          ...current,
          [itemId]: checked
        }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomAffaire || !formData.nomZone) {
      setError("Le nom de l'affaire et le nom de la zone sont obligatoires.");
      return;
    }
    if (!formData.clientId) {
      setError("Veuillez lier ce projet à un client.");
      return;
    }
    if (!formData.sousTraitantId) {
      setError("Veuillez sélectionner un sous-traitant de fabrication.");
      return;
    }
    if (!formData.delaiLivraisonChantier) {
      setError("Veuillez spécifier le délai de livraison au chantier.");
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Échec de l'enregistrement du projet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {project ? "📝 Modifier l'Affaire-Zone" : "🏗️ Créer un Nouveau Projet de Fabrication"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Informations Générales */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">1. Renseignements Affaire</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Nom de l'affaire *</label>
                <input
                  type="text"
                  name="nomAffaire"
                  placeholder="ex: Passerelle de Lorient"
                  value={formData.nomAffaire || ""}
                  onChange={handleChange}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Zone / Sectorisation *</label>
                <input
                  type="text"
                  name="nomZone"
                  placeholder="ex: Zone A - Travée Est"
                  value={formData.nomZone || ""}
                  onChange={handleChange}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">N° Commande</label>
                <input
                  type="text"
                  name="numCommande"
                  placeholder="ex: CMD-2026-670"
                  value={formData.numCommande || ""}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Date Commande</label>
                <input
                  type="date"
                  name="dateCommande"
                  value={formData.dateCommande || ""}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-emerald-700 block mb-1 font-semibold">État de l'Affaire *</label>
                <select
                  name="status"
                  value={formData.status || ProjectStatus.EN_COURS}
                  onChange={handleChange}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white font-semibold"
                >
                  <option value={ProjectStatus.EN_COURS}>🟢 En cours</option>
                  <option value={ProjectStatus.TERMINEE}>🔴 Terminée</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-teal-700 block mb-1 font-semibold">Type d'ouvrage</label>
                <select
                  name="typeOuvrage"
                  value={formData.typeOuvrage || ""}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                >
                  <option value="">-- Non spécifié --</option>
                  {typesOuvrage.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Attribution Parties Prenantes */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">2. Clients & Sous-traitants</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Client Maître d'Œuvre *</label>
                <select
                  name="clientId"
                  value={formData.clientId || ""}
                  onChange={handleChange}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                >
                  <option value="">-- Choisir un client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Sous-traitant désigné *</label>
                <select
                  name="sousTraitantId"
                  value={formData.sousTraitantId || ""}
                  onChange={handleChange}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                >
                  <option value="">-- Choisir un sous-traitant --</option>
                  {subcontractors.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Caractéristiques Techniques */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">3. Données Techniques & Métrages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Poids Total (kg)</label>
                <input
                  type="number"
                  name="poidsTotal"
                  placeholder="Calculé ou saisi"
                  value={formData.poidsTotal || ""}
                  onChange={handleChange}
                  min="0"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-slate-50 font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Poids PRS (kg)</label>
                <input
                  type="number"
                  name="poidsPRS"
                  placeholder="Optionnel"
                  value={formData.poidsPRS !== undefined ? formData.poidsPRS : ""}
                  onChange={handleChange}
                  min="0"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Poids PDC (kg)</label>
                <input
                  type="number"
                  name="poidsPDC"
                  placeholder="Optionnel"
                  value={formData.poidsPDC !== undefined ? formData.poidsPDC : ""}
                  onChange={handleChange}
                  min="0"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Quantité (ml de PRS)</label>
                <input
                  type="number"
                  name="quantiteMl"
                  placeholder="Optionnel"
                  value={formData.quantiteMl !== undefined ? formData.quantiteMl : ""}
                  onChange={handleChange}
                  min="0"
                  className={`w-full text-sm border rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white ${formData.poidsPRS && !formData.quantiteMl ? "border-amber-300 bg-amber-50/20" : "border-slate-300"}`}
                />
                {formData.poidsPRS && !formData.quantiteMl && (
                  <span className="text-[10px] text-amber-600 block mt-1 font-medium">⚠️ Idéalement, saisir ml si PRS</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div className="sm:col-span-1">
                <label className="text-xs font-medium text-gray-500 block mb-1">Protection requise</label>
                <input
                  type="text"
                  name="protection"
                  placeholder="ex: Galvanisation à chaud / RAL 9010"
                  value={formData.protection || ""}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Dessinateur</label>
                <input
                  type="text"
                  name="dessinateur"
                  placeholder="ex: Jean Dessin"
                  value={formData.dessinateur || ""}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Conducteur Travaux</label>
                <input
                  type="text"
                  name="conducteurTravaux"
                  value={formData.conducteurTravaux || ""}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Logistique et Échéances */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">4. Logistique & Délais de Livraison</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Livraison Site Protection (si besoin)</label>
                <input
                  type="date"
                  name="delaiLivraisonProtection"
                  value={formData.delaiLivraisonProtection || ""}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Livraison sur Chantier *</label>
                <input
                  type="date"
                  name="delaiLivraisonChantier"
                  value={formData.delaiLivraisonChantier || ""}
                  onChange={handleChange}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Jalons & Responsabilités (Fiche de Prestation) */}
          <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1">5. Jalons & Responsabilités (Modèle Fiche de Prestation)</h3>
            <p className="text-[10px] text-gray-500 mb-3">
              Cochez les jalons correspondants au Client et/ou au Sous-traitant. Les lignes laissées vides (aucun coché) ne s'afficheront pas sur la fiche de prestation imprimable.
            </p>

            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0">
                    <th className="px-4 py-2 font-semibold bg-slate-150">Jalon / Question</th>
                    <th className="px-4 py-2 text-center w-24 bg-slate-150">Client</th>
                    <th className="px-4 py-2 text-center w-24 bg-slate-150">Sous-traitant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CHECKLIST_FIELDS.map(item => {
                    const isClientChecked = !!formData.checklistClient?.[item.id];
                    const isSubChecked = !!formData.checklistSubcontractor?.[item.id];
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-1.5 font-medium text-slate-800">{item.label}</td>
                        <td className="px-4 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={isClientChecked}
                            onChange={(e) => handleChecklistChange("client", item.id, e.target.checked)}
                            className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                          />
                        </td>
                        <td className="px-4 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSubChecked}
                            onChange={(e) => handleChecklistChange("subcontractor", item.id, e.target.checked)}
                            className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Section 6: Remarques pour la fiche de prestation */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">6. Remarques ou informations supplémentaires</h3>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Remarques additionnelles (inscrites après les prestations mais avant les jalons de livraison sur la fiche imprimable)
              </label>
              <textarea
                name="remarquesPrestation"
                rows={3}
                placeholder="Renseigner ici les consignes, remarques ou informations complémentaires..."
                value={formData.remarquesPrestation || ""}
                onChange={(e) => {
                  setError(null);
                  setFormData(prev => ({ ...prev, remarquesPrestation: e.target.value }));
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              />
            </div>
          </div>
          
          {/* Action Footer Button */}
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
              {loading ? "Enregistrement..." : project ? "Enregistrer les modifications" : "Créer le projet de fabrication"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
