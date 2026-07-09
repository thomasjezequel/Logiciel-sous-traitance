import React, { useState, useEffect } from "react";
import { Interlocuteur, Client, Subcontractor } from "../types";
import { X, Save, AlertTriangle } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  interlocuteur?: Interlocuteur;
  clients: Client[];
  subcontractors: Subcontractor[];
  onSave: (data: any) => Promise<void>;
}

export default function ContactModal({ isOpen, onClose, interlocuteur, clients, subcontractors, onSave }: ContactModalProps) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [rattachements, setRattachements] = useState<{ type: string; entiteId: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interlocuteur) {
      setNom(interlocuteur.nom);
      setPrenom(interlocuteur.prenom);
      setEmail(interlocuteur.email);
      const inter = interlocuteur as any;
      if (Array.isArray(inter.entites) && inter.entites.length > 0) {
        setRattachements(inter.entites);
      } else if (inter.entiteId) {
        setRattachements([{ type: inter.type || "client", entiteId: inter.entiteId }]);
      } else {
        setRattachements([]);
      }
    } else {
      setNom(""); setPrenom(""); setEmail(""); setRattachements([]);
    }
    setError(null);
  }, [interlocuteur, isOpen]);

  if (!isOpen) return null;

  const toggleRattachement = (type: string, entiteId: string) => {
    setRattachements(prev => {
      const exists = prev.some(r => r.type === type && r.entiteId === entiteId);
      if (exists) return prev.filter(r => !(r.type === type && r.entiteId === entiteId));
      return [...prev, { type, entiteId }];
    });
  };

  const isChecked = (type: string, entiteId: string) =>
    rattachements.some(r => r.type === type && r.entiteId === entiteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      setError("Nom, prénom et email sont obligatoires."); return;
    }
    if (rattachements.length === 0) {
      setError("Veuillez sélectionner au moins un client ou sous-traitant."); return;
    }
    try {
      setLoading(true);
      await onSave({
        nom: nom.trim(), prenom: prenom.trim(), email: email.trim(),
        type: rattachements[0].type,
        entiteId: rattachements[0].entiteId,
        entites: rattachements
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {interlocuteur ? "✏️ Modifier l'interlocuteur" : "➕ Ajouter un interlocuteur"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Prénom *</label>
              <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} required placeholder="Jean"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nom *</label>
              <input type="text" value={nom} onChange={e => setNom(e.target.value)} required placeholder="Dupont"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jean.dupont@exemple.fr"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">
              Clients rattachés <span className="text-gray-400 font-normal">(cochez tous les clients concernés)</span>
            </label>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-36 overflow-y-auto">
              {clients.length === 0 ? <p className="text-xs text-slate-400 italic p-3">Aucun client disponible.</p>
                : clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-teal-50/40 cursor-pointer">
                    <input type="checkbox" checked={isChecked("client", c.id)} onChange={() => toggleRattachement("client", c.id)}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500" />
                    <span className="text-sm text-slate-700 font-medium">{c.nom}</span>
                    <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full font-bold ml-auto">Client</span>
                  </label>
                ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">
              Sous-traitants rattachés <span className="text-gray-400 font-normal">(cochez tous les sous-traitants concernés)</span>
            </label>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-36 overflow-y-auto">
              {subcontractors.length === 0 ? <p className="text-xs text-slate-400 italic p-3">Aucun sous-traitant disponible.</p>
                : subcontractors.map(s => (
                  <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50/40 cursor-pointer">
                    <input type="checkbox" checked={isChecked("subcontractor", s.id)} onChange={() => toggleRattachement("subcontractor", s.id)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                    <span className="text-sm text-slate-700 font-medium">{s.nom}</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full font-bold ml-auto">Sous-traitant</span>
                  </label>
                ))}
            </div>
          </div>
          {rattachements.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1.5">
                {rattachements.length} rattachement{rattachements.length > 1 ? "s" : ""} sélectionné{rattachements.length > 1 ? "s" : ""} :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {rattachements.map((r, idx) => {
                  const entiteNom = r.type === "client"
                    ? clients.find(c => c.id === r.entiteId)?.nom
                    : subcontractors.find(s => s.id === r.entiteId)?.nom;
                  return (
                    <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.type === "client" ? "bg-teal-100 text-teal-800" : "bg-indigo-100 text-indigo-800"}`}>
                      {entiteNom}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
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