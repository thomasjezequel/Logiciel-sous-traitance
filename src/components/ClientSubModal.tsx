import React, { useState, useEffect } from "react";
import { Client, Subcontractor } from "../types";
import { X, Save, AlertTriangle, Factory } from "lucide-react";

interface ClientSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "client" | "subcontractor";
  item?: Client | Subcontractor; // Defined if editing
  onSave: (type: "client" | "subcontractor", data: Partial<Client | Subcontractor>) => Promise<void>;
}

export default function ClientSubModal({ isOpen, onClose, type, item, onSave }: ClientSubModalProps) {
  const [formData, setFormData] = useState({
    nom: "",
    adresse: "",
    coutHoraireMO: 40,
    fraisGenerauxPct: 10,
    estExterieur: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      const itemAny = item as any;
      setFormData({
        nom: item.nom || "",
        adresse: item.adresse || "",
        coutHoraireMO: item.coutHoraireMO || 0,
        fraisGenerauxPct: item.fraisGenerauxPct !== undefined ? item.fraisGenerauxPct : 10,
        estExterieur: !!itemAny.estExterieur
      });
    } else {
      setFormData({
        nom: "",
        adresse: "",
        coutHoraireMO: type === "client" ? 45 : 38, // defaults
        fraisGenerauxPct: 10,
        estExterieur: false
      });
    }
    setError(null);
  }, [item, type, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setError(null);
    setFormData(prev => ({
      ...prev,
      [name]: name === "coutHoraireMO" || name === "fraisGenerauxPct" ? Number(value) || 0 : value
    }));
  };

  const handleExterieurToggle = (checked: boolean) => {
    setError(null);
    setFormData(prev => ({
      ...prev,
      estExterieur: checked,
      // Un sous-traitant extérieur a un accord fixé à la commande : pas de taux horaire ni de FG à gérer
      coutHoraireMO: checked ? 0 : prev.coutHoraireMO,
      fraisGenerauxPct: checked ? 0 : prev.fraisGenerauxPct
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      setError("Le nom de l'entité est requis.");
      return;
    }
    try {
      setLoading(true);
      await onSave(type, formData);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Échec d'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const titleText = item
    ? `📝 Modifier ${type === "client" ? "le Client" : "le Sous-traitant"}`
    : `➕ Ajouter ${type === "client" ? "un Client" : "un Sous-traitant"}`;

  const isExternalSubcontractor = type === "subcontractor" && formData.estExterieur;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{titleText}</h2>
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

          {/* Name Field */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              Nom officiel de la Société *
            </label>
            <input
              type="text"
              name="nom"
              placeholder={type === "client" ? "ex: Eiffage Ouest" : "ex: Métallerie de l'Est"}
              value={formData.nom}
              onChange={handleChange}
              required
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
            />
          </div>

          {/* Sous-traitant extérieur (hors groupe) toggle - uniquement pour les sous-traitants */}
          {type === "subcontractor" && (
            <div className="flex items-start gap-2.5 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
              <input
                type="checkbox"
                id="estExterieur"
                checked={formData.estExterieur}
                onChange={(e) => handleExterieurToggle(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="estExterieur" className="text-xs cursor-pointer select-none">
                <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                  <Factory className="w-3.5 h-3.5" />
                  Sous-traitant extérieur (hors groupe)
                </span>
                <span className="text-indigo-700/80 block mt-0.5 leading-snug">
                  Le prix est fixé à la commande : pas de taux horaire ni de frais généraux à gérer pour ce sous-traitant.
                </span>
              </label>
            </div>
          )}

          {/* Hourly Labour Cost Field - masqué pour un sous-traitant extérieur */}
          {!isExternalSubcontractor && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Coût horaire standard de la main d'œuvre ({type === "client" ? "Vendu" : "Achat"}) (€/h)
              </label>
              <input
                type="number"
                name="coutHoraireMO"
                min="0"
                value={formData.coutHoraireMO}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              />
            </div>
          )}

          {/* Frais généraux (%) Field - masqué pour un sous-traitant extérieur */}
          {!isExternalSubcontractor && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Paramètre de frais généraux (%)
              </label>
              <input
                type="number"
                name="fraisGenerauxPct"
                min="0"
                max="100"
                value={formData.fraisGenerauxPct}
                onChange={handleChange}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
              />
            </div>
          )}

          {isExternalSubcontractor && (
            <p className="text-[11px] text-gray-400 italic px-1">
              ℹ️ Le suivi Budget vs Réalisé reste disponible normalement pour ce sous-traitant — seuls le taux horaire et les frais généraux ne sont pas appliqués.
            </p>
          )}

          {/* Full Physical/Billing Address Field */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Adresse physique / Bureau</label>
            <textarea
              name="adresse"
              rows={3}
              placeholder="Rue, Code Postal, Ville"
              value={formData.adresse}
              onChange={handleChange}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white"
            />
          </div>

          {/* Form Actions */}
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
              {loading ? "Enregistrement..." : "Confirmer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
