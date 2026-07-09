import { useState } from "react";
import { Project, Client, Subcontractor, Interlocuteur, Tache, TacheType } from "../types";
import {
  Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Mail,
  RotateCcw, ChevronDown, ChevronUp, Eye, EyeOff, Calendar, User, Filter
} from "lucide-react";

interface TasksViewProps {
  taches: Tache[];
  tachesType: TacheType[];
  projects: Project[];
  interlocuteurs: Interlocuteur[];
  clients: Client[];
  subcontractors: Subcontractor[];
  onSave: (data: any) => Promise<void>;
  onUpdate: (id: string, data: any) => Promise<void>;
  onRelancer: (id: string, note?: string) => Promise<void>;
  onDelete: (id: string) => void;
  isWritable: boolean;
}

export default function TasksView({
  taches,
  tachesType,
  projects,
  interlocuteurs,
  clients,
  subcontractors,
  onSave,
  onUpdate,
  onRelancer,
  onDelete,
  isWritable
}: TasksViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterInterlocuteur, setFilterInterlocuteur] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [expandedRelances, setExpandedRelances] = useState<Set<string>>(new Set());
  const [relanceNoteId, setRelanceNoteId] = useState<string | null>(null);
  const [relanceNote, setRelanceNote] = useState("");

  // Formulaire de création
  const [form, setForm] = useState({
    projetId: "",
    libelle: "",
    customLibelle: "",
    interlocuteurId: "",
    dateEcheance: ""
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (t: Tache) => t.statut !== "TERMINEE" && new Date(t.dateEcheance) < today;
  const isToday = (t: Tache) => {
    const d = new Date(t.dateEcheance);
    d.setHours(0, 0, 0, 0);
    return t.statut !== "TERMINEE" && d.getTime() === today.getTime();
  };

  // Interlocuteurs filtrés selon le projet sélectionné dans le formulaire
  const getInterlocuteursForProject = (projetId: string) => {
    const proj = projects.find(p => p.id === projetId);
    if (!proj) return interlocuteurs;
    return interlocuteurs.filter(i =>
      (i.type === "client" && i.entiteId === proj.clientId) ||
      (i.type === "subcontractor" && i.entiteId === proj.sousTraitantId)
    );
  };

  // Filtrage des tâches affichées
  const filteredTaches = taches.filter(t => {
    if (!showCompleted && t.statut === "TERMINEE") return false;
    if (filterInterlocuteur && t.interlocuteurId !== filterInterlocuteur) return false;
    if (filterProject && t.projetId !== filterProject) return false;
    return true;
  });

  // Tri : en retard en premier, puis par date d'échéance
  const sortedTaches = [...filteredTaches].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    if (a.statut === "TERMINEE" && b.statut !== "TERMINEE") return 1;
    if (a.statut !== "TERMINEE" && b.statut === "TERMINEE") return -1;
    return new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
  });

  const activeTachesCount = taches.filter(t => t.statut !== "TERMINEE").length;
  const urgentCount = taches.filter(t => isOverdue(t)).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const libelleFinal = form.libelle === "__custom__" ? form.customLibelle : form.libelle;
    if (!form.projetId || !libelleFinal || !form.interlocuteurId || !form.dateEcheance) {
      setFormError("Tous les champs sont obligatoires.");
      return;
    }
    try {
      setFormLoading(true);
      await onSave({
        projetId: form.projetId,
        libelle: libelleFinal,
        interlocuteurId: form.interlocuteurId,
        dateEcheance: form.dateEcheance
      });
      setForm({ projetId: "", libelle: "", customLibelle: "", interlocuteurId: "", dateEcheance: "" });
      setShowForm(false);
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.message || "Erreur lors de la création.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleRelancer = async (t: Tache) => {
    // 1. Enregistre la relance
    await onRelancer(t.id, relanceNoteId === t.id ? relanceNote : undefined);
    // 2. Ouvre la messagerie
    const interlocuteur = interlocuteurs.find(i => i.id === t.interlocuteurId);
    const projet = projects.find(p => p.id === t.projetId);
    const relanceNum = (t.relances?.length || 0) + 1;
    if (interlocuteur) {
      const subject = encodeURIComponent(`[RELANCE ${relanceNum}] ${t.libelle} — ${projet?.nomAffaire || ""} (${projet?.nomZone || ""})`);
      const body = encodeURIComponent(
        `Bonjour ${interlocuteur.prenom},\n\nNous vous relançons concernant la tâche suivante :\n\n` +
        `📋 Tâche : ${t.libelle}\n` +
        `🏗️ Affaire : ${projet?.nomAffaire || ""} — ${projet?.nomZone || ""}\n` +
        `📅 Échéance : ${new Date(t.dateEcheance).toLocaleDateString("fr-FR")}\n\n` +
        `${relanceNote ? `Note : ${relanceNote}\n\n` : ""}` +
        `Merci de nous tenir informés de l'avancement.\n\nCordialement`
      );
      window.location.href = `mailto:${interlocuteur.email}?subject=${subject}&body=${body}`;
    }
    setRelanceNoteId(null);
    setRelanceNote("");
  };

  const handleEnvoiMail = (t: Tache) => {
    const interlocuteur = interlocuteurs.find(i => i.id === t.interlocuteurId);
    const projet = projects.find(p => p.id === t.projetId);
    if (!interlocuteur) return;
    const subject = encodeURIComponent(`[Tâche] ${t.libelle} — ${projet?.nomAffaire || ""} (${projet?.nomZone || ""})`);
    const body = encodeURIComponent(
      `Bonjour ${interlocuteur.prenom},\n\nUne nouvelle tâche vous a été attribuée :\n\n` +
      `📋 Tâche : ${t.libelle}\n` +
      `🏗️ Affaire : ${projet?.nomAffaire || ""} — ${projet?.nomZone || ""}\n` +
      `📅 Échéance : ${new Date(t.dateEcheance).toLocaleDateString("fr-FR")}\n\n` +
      `Merci de prendre en charge cette demande dans les meilleurs délais.\n\nCordialement`
    );
    window.location.href = `mailto:${interlocuteur.email}?subject=${subject}&body=${body}`;
  };

  const toggleRelances = (id: string) => {
    setExpandedRelances(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">

      {/* ── KPIs rapides ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Tâches en cours</span>
          <span className="text-2xl font-black text-slate-900 block mt-1">{activeTachesCount}</span>
        </div>
        <div className={`p-4 rounded-xl border shadow-2xs ${urgentCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">En retard</span>
          <span className={`text-2xl font-black block mt-1 ${urgentCount > 0 ? "text-red-600" : "text-slate-900"}`}>
            {urgentCount}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Terminées</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1">
            {taches.filter(t => t.statut === "TERMINEE").length}
          </span>
        </div>
      </div>

      {/* ── Barre d'actions + filtres ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Filtrer par interlocuteur</span>
            <select value={filterInterlocuteur} onChange={e => setFilterInterlocuteur(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white min-w-[180px]">
              <option value="">Tous les interlocuteurs</option>
              {interlocuteurs.map(i => (
                <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">Filtrer par affaire</span>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white min-w-[200px]">
              <option value="">Toutes les affaires</option>
              {[...projects].sort((a,b) => a.nomAffaire.localeCompare(b.nomAffaire, "fr")).map(p => (
                <option key={p.id} value={p.id}>{p.nomAffaire} — {p.nomZone}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowCompleted(v => !v)}
            className={`text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 border transition ${showCompleted ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}>
            {showCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showCompleted ? "Masquer" : "Afficher"} les terminées
          </button>
        </div>
        {isWritable && (
          <button onClick={() => setShowForm(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition">
            <Plus className="w-4 h-4" />
            Créer une tâche
          </button>
        )}
      </div>

      {/* ── Formulaire de création ── */}
      {showForm && isWritable && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider font-mono">Nouvelle tâche</h3>
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-indigo-800 block mb-1">Affaire *</label>
              <select value={form.projetId}
                onChange={e => setForm(prev => ({ ...prev, projetId: e.target.value, interlocuteurId: "" }))}
                className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500 bg-white">
                <option value="">-- Sélectionner une affaire --</option>
                {[...projects].sort((a,b) => a.nomAffaire.localeCompare(b.nomAffaire, "fr")).map(p => (
                  <option key={p.id} value={p.id}>{p.nomAffaire} — {p.nomZone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-indigo-800 block mb-1">Tâche *</label>
              <select value={form.libelle}
                onChange={e => setForm(prev => ({ ...prev, libelle: e.target.value }))}
                className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500 bg-white">
                <option value="">-- Choisir une tâche --</option>
                {tachesType.map(tt => (
                  <option key={tt.id} value={tt.libelle}>{tt.libelle}</option>
                ))}
                <option value="__custom__">✏️ Saisie libre...</option>
              </select>
              {form.libelle === "__custom__" && (
                <input type="text" value={form.customLibelle}
                  onChange={e => setForm(prev => ({ ...prev, customLibelle: e.target.value }))}
                  placeholder="Décrivez la tâche..."
                  className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500 bg-white mt-2" />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-indigo-800 block mb-1">
                Interlocuteur désigné *
                {form.projetId && <span className="text-indigo-500 font-normal ml-1">(lié à l'affaire)</span>}
              </label>
              <select value={form.interlocuteurId}
                onChange={e => setForm(prev => ({ ...prev, interlocuteurId: e.target.value }))}
                className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500 bg-white">
                <option value="">-- Sélectionner --</option>
                {getInterlocuteursForProject(form.projetId).map(i => (
                  <option key={i.id} value={i.id}>{i.prenom} {i.nom} ({i.email})</option>
                ))}
              </select>
              {form.projetId && getInterlocuteursForProject(form.projetId).length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">⚠️ Aucun interlocuteur rattaché à cette affaire. Ajoutez-en dans l'Annuaire.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-indigo-800 block mb-1">Date d'échéance *</label>
              <input type="date" value={form.dateEcheance}
                onChange={e => setForm(prev => ({ ...prev, dateEcheance: e.target.value }))}
                className="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500 bg-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-4 py-2 border border-slate-300 text-sm text-gray-600 rounded-lg hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="button" onClick={handleSubmit} disabled={formLoading}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition">
              {formLoading ? "Création..." : "Créer la tâche"}
            </button>
          </div>
        </div>
      )}

      {/* ── Liste des tâches ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {sortedTaches.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            {taches.length === 0 ? "Aucune tâche créée pour le moment." : "Aucune tâche ne correspond aux filtres."}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Affaire / Zone</th>
                <th className="px-4 py-3">Tâche</th>
                <th className="px-4 py-3">Interlocuteur</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Relances</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTaches.map(t => {
                const projet = projects.find(p => p.id === t.projetId);
                const interlocuteur = interlocuteurs.find(i => i.id === t.interlocuteurId);
                const overdue = isOverdue(t);
                const todayTask = isToday(t);
                const relancesExpanded = expandedRelances.has(t.id);

                return (
                  <>
                    <tr key={t.id} className={`transition ${
                      t.statut === "TERMINEE" ? "bg-emerald-50/30 opacity-70" :
                      overdue ? "bg-red-50/60" :
                      todayTask ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                    }`}>
                      {/* Statut */}
                      <td className="px-4 py-3">
                        {isWritable ? (
                          <select value={t.statut}
                            onChange={e => onUpdate(t.id, { statut: e.target.value })}
                            className={`text-[10px] font-bold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none ${
                              t.statut === "TERMINEE" ? "bg-emerald-100 text-emerald-800" :
                              overdue ? "bg-red-100 text-red-800" :
                              t.statut === "EN_COURS" ? "bg-amber-100 text-amber-800" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                            <option value="A_FAIRE">À faire</option>
                            <option value="EN_COURS">En cours</option>
                            <option value="TERMINEE">Terminée ✅</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            t.statut === "TERMINEE" ? "bg-emerald-100 text-emerald-800" :
                            overdue ? "bg-red-100 text-red-800" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {t.statut === "TERMINEE" ? "Terminée ✅" : overdue ? "🔴 En retard" : t.statut === "EN_COURS" ? "En cours" : "À faire"}
                          </span>
                        )}
                      </td>

                      {/* Affaire */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block text-xs">{projet?.nomAffaire || "—"}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{projet?.nomZone || ""}</span>
                      </td>

                      {/* Tâche */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{t.libelle}</span>
                      </td>

                      {/* Interlocuteur */}
                      <td className="px-4 py-3">
                        {interlocuteur ? (
                          <div>
                            <span className="font-semibold text-slate-900 block text-xs">{interlocuteur.prenom} {interlocuteur.nom}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{interlocuteur.email}</span>
                          </div>
                        ) : <span className="text-slate-400 text-xs italic">Non défini</span>}
                      </td>

                      {/* Échéance */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${overdue ? "text-red-600" : todayTask ? "text-amber-600" : "text-slate-700"}`}>
                          {overdue && "🔴 "}{todayTask && "⚠️ "}
                          {new Date(t.dateEcheance).toLocaleDateString("fr-FR")}
                        </span>
                        {overdue && <span className="text-[10px] text-red-500 block">En retard</span>}
                        {todayTask && <span className="text-[10px] text-amber-600 block">Aujourd'hui</span>}
                      </td>

                      {/* Relances */}
                      <td className="px-4 py-3">
                        <button onClick={() => toggleRelances(t.id)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition">
                          <span className={`font-bold ${(t.relances?.length || 0) > 0 ? "text-indigo-600" : ""}`}>
                            {t.relances?.length || 0} relance{(t.relances?.length || 0) > 1 ? "s" : ""}
                          </span>
                          {relancesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {interlocuteur && t.statut !== "TERMINEE" && (
                            <button onClick={() => handleEnvoiMail(t)}
                              title="Envoyer la tâche par mail"
                              className="p-1.5 text-slate-400 hover:text-teal-600 rounded hover:bg-teal-50 transition">
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isWritable && interlocuteur && t.statut !== "TERMINEE" && (
                            <button onClick={() => { setRelanceNoteId(relanceNoteId === t.id ? null : t.id); setRelanceNote(""); }}
                              title="Enregistrer une relance + notifier par mail"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isWritable && (
                            <button onClick={() => onDelete(t.id)}
                              title="Supprimer la tâche"
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Ligne de relance */}
                    {relanceNoteId === t.id && (
                      <tr key={`relance-form-${t.id}`} className="bg-indigo-50/60">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <input type="text" value={relanceNote}
                              onChange={e => setRelanceNote(e.target.value)}
                              placeholder="Note optionnelle pour cette relance..."
                              className="flex-1 text-xs border border-indigo-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-indigo-500 bg-white" />
                            <button onClick={() => handleRelancer(t)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
                              <RotateCcw className="w-3.5 h-3.5" />
                              Relancer + envoyer mail
                            </button>
                            <button onClick={() => setRelanceNoteId(null)}
                              className="text-xs text-slate-400 hover:text-slate-700 px-2 py-2 rounded-lg transition">
                              Annuler
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Historique des relances */}
                    {relancesExpanded && (t.relances?.length || 0) > 0 && (
                      <tr key={`relances-${t.id}`} className="bg-slate-50/60">
                        <td colSpan={7} className="px-6 py-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-2">Historique des relances :</span>
                          <div className="space-y-1.5">
                            {[...t.relances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r, idx) => (
                              <div key={r.id} className="flex items-start gap-3 text-xs text-slate-600">
                                <span className="font-bold text-indigo-600 font-mono shrink-0">#{idx + 1}</span>
                                <span className="font-mono text-slate-500 shrink-0">
                                  {new Date(r.date).toLocaleDateString("fr-FR")} à {new Date(r.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {r.note && <span className="text-slate-700 italic">— {r.note}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
