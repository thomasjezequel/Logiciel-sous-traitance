import React, { useState, useEffect } from "react";
import { Interlocuteur, Client, Subcontractor } from "../types";
import { X, Save, AlertTriangle } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  interlocuteur?: Interlocuteur;
  clients: Client[];
  subcontractors: Subcontractor[];
  onSave: (data: Partial<Interlocuteur>) => Promise<void>;
}

export default function ContactModal({
  isOpen,
  onClose,
  interlocuteur,
  clients,
  subcontractors,
  onSave
}: ContactModalProps) {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    type: "client" as "client" | "subcontractor",
    entiteId: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interlocuteur) {
      setFormData({
        nom: interlocuteur.nom,
        prenom: interlocuteur.prenom,
        email: interlocuteur.email,
        type: interlocuteur.type,
        entiteId: interlocuteur.entiteId
      });
    } else {
      setFormData({ nom: "", prenom: "", email: "", type: "client", entiteId: clients[0]?.id || "" });
    }
    setError(null);
  }, [interlocuteur, isOpen, clients]);

  if (!isOpen) return null;

  const entitesList = formData.type === "client" ? clients : subcontractors;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setError(null);
    if (name === "type") {
      const newList = value === "client" ? clients : subcontractors;
      setFormData(prev => ({ ...prev, type: value as any, entiteId: newList[0]?.id || "" }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim() || !formData.prenom.trim() || !formData.email.trim()) {
      setError("Nom, prénom et email sont obligatoires.");
      return;
    }
    if (!formData.entiteId) {
      setError("Veuillez sélectionner une entité de rattachement.");
      return;
    }
    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {interlocuteur ? "✏️ Modifier l'interlocuteur" : "➕ Ajouter un interlocuteur"}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Prénom *</label>
              <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} required
                placeholder="Jean" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nom *</label>
              <input type="text" name="nom" value={formData.nom} onChange={handleChange} required
                placeholder="Dupont" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required
              placeholder="jean.dupont@exemple.fr" className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Rattachement *</label>
            <select name="type" value={formData.type} onChange={handleChange}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white">
              <option value="client">Client</option>
              <option value="subcontractor">Sous-traitant</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              {formData.type === "client" ? "Client concerné *" : "Sous-traitant concerné *"}
            </label>
            <select name="entiteId" value={formData.entiteId} onChange={handleChange}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white">
              <option value="">-- Sélectionner --</option>
              {entitesList.map(e => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Seuls les interlocuteurs rattachés à l'affaire pourront être désignés lors de la création d'une tâche.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-4 py-2 border border-slate-300 text-sm text-gray-600 rounded-lg hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 shadow-xs flex items-center gap-2 transition">
              <Save className="w-4 h-4" />
              {loading ? "Enregistrement..." : interlocuteur ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
