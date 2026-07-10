import { useState, useEffect } from "react";
import { Project, ProjectStatus, Budget, Realise, Billing, BillingStatus, Subcontractor, Client, Tache, Interlocuteur } from "../types";
import { 
  Hammer, 
  Scale, 
  Calendar,
  Users,
  CheckCircle2, 
  Hourglass, 
  Wallet, 
  Building,
  RotateCcw,
  Printer,
  FileText,
  BarChart3,
  Receipt,
  Pencil,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  ListTodo,
  Mail
} from "lucide-react";
import DashboardPrintModal from "./DashboardPrintModal";

interface DashboardViewProps {
  projects: Project[];
  budgets: Budget[];
  realises: Realise[];
  billings: Billing[];
  subcontractors: Subcontractor[];
  clients: Client[];
  taches: Tache[];
  interlocuteurs: Interlocuteur[];
  // Callbacks pour l'impression (double-clic)
  onOpenPrestation: (project: Project) => void;
  onOpenBudgetRealise: (project: Project) => void;
  onOpenBillingPrint: (billing: Billing) => void;
 // Callbacks pour l'édition (simple clic)
  onEditProject: (project: Project) => void;
  onEditBudgetRealise: (project: Project) => void;
  onEditBilling: (billing: Billing) => void;
  // Rôle de l'utilisateur connecté (pour griser les options selon les droits)
  userRole: string;
  // Callback relance tâche
  onRelancerTache: (id: string, note?: string) => Promise<void>;
  isWritable: boolean;
}

// Type du menu contextuel : "print" (double-clic) ou "edit" (simple clic)
interface ContextMenuState {
  x: number;
  y: number;
  type: "print" | "edit";
  project: Project;
  billing?: Billing;
}

export default function DashboardView({
  projects,
  budgets,
  realises,
  billings,
  subcontractors,
  clients,
  taches,
  interlocuteurs,
  onRelancerTache,
  isWritable,
  onOpenPrestation,
  onOpenBudgetRealise,
  onOpenBillingPrint,
  onEditProject,
  onEditBudgetRealise,
  onEditBilling,
  userRole
}: DashboardViewProps) {
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>("");
  const [dateFin, setDateFin] = useState<string>("");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [filterTacheInterlocuteur, setFilterTacheInterlocuteur] = useState("");
  const [relanceNoteId, setRelanceNoteId] = useState<string | null>(null);
  const [relanceNote, setRelanceNote] = useState("");

  // Fermeture automatique du menu contextuel si on clique ailleurs
  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  // Clic simple → menu Édition
  const handleCardClick = (e: React.MouseEvent, project: Project | undefined, billing?: Billing) => {
    if (!project) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: "edit", project, billing });
  };

  // Double-clic → menu Impression
  const handleCardDoubleClick = (e: React.MouseEvent, project: Project | undefined, billing?: Billing) => {
    if (!project) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: "print", project, billing });
  };

  const handleQuickPeriod = (type: "J" | "S" | "M" | "T" | "Se" | "A" | "X") => {
    if (type === "X") { setDateDebut(""); setDateFin(""); return; }
    const now = new Date();
    const year = now.getFullYear();
    const format = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    let start = "", end = "";
    if (type === "J") { start = end = format(now); }
    else if (type === "S") {
      const d = now.getDay();
      const dist = d === 0 ? -6 : 1 - d;
      const mon = new Date(now); mon.setDate(now.getDate() + dist);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      start = format(mon); end = format(sun);
    } else if (type === "M") {
      start = format(new Date(year, now.getMonth(), 1));
      end = format(new Date(year, now.getMonth() + 1, 0));
    } else if (type === "T") {
      const qm = Math.floor(now.getMonth() / 3) * 3;
      start = format(new Date(year, qm, 1));
      end = format(new Date(year, qm + 3, 0));
    } else if (type === "Se") {
      const sm = now.getMonth() < 6 ? 0 : 6;
      start = format(new Date(year, sm, 1));
      end = format(new Date(year, sm + 6, 0));
    } else if (type === "A") {
      start = format(new Date(year, 0, 1));
      end = format(new Date(year, 11, 31));
    }
    setDateDebut(start); setDateFin(end);
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filteredProjects = projects.filter(p => {
    if (selectedClient && p.clientId !== selectedClient) return false;
    if (selectedSub && p.sousTraitantId !== selectedSub) return false;
    const pDate = p.dateCommande || p.delaiLivraisonChantier || "";
    if (dateDebut && pDate < dateDebut) return false;
    if (dateFin && pDate > dateFin) return false;
    return true;
  });

  const filteredRealises = realises.filter(r => filteredProjects.some(p => p.id === r.projetId));
  const filteredBillings = billings.filter(b =>
    filteredProjects.some(p => p.id === b.projetId || b.projetIds?.some(pid => filteredProjects.some(fp => fp.id === pid)))
  );

  // ── Métriques ─────────────────────────────────────────────────────────────
  const totalWeightKg = filteredProjects.reduce((acc, p) => acc + (p.poidsTotal || 0), 0);
  const totalPoidsPRS = filteredProjects.reduce((acc, p) => acc + (p.poidsPRS || 0), 0);
  const totalPoidsPDC = filteredProjects.reduce((acc, p) => acc + (p.poidsPDC || 0), 0);
  const totalFabricatedKg = filteredRealises.reduce((acc, r) => acc + (r.poidsFabrique || 0), 0);
  const totalMlOrdered = filteredProjects.reduce((acc, p) => acc + (p.quantiteMl || 0), 0);
  const totalMlFabricated = filteredProjects.reduce((acc, p) => {
    const r = filteredRealises.find(real => real.projetId === p.id);
    if (!r || !p.quantiteMl) return acc;
    const ratio = p.poidsTotal > 0 ? (r.poidsFabrique || 0) / p.poidsTotal : 0;
    return acc + p.quantiteMl * Math.min(1, ratio);
  }, 0);
  const fabricationWeightProgression = totalWeightKg > 0 ? (totalFabricatedKg / totalWeightKg) * 100 : 0;

  const totalBilledPaid = filteredBillings.filter(b => b.etatFacturation === BillingStatus.PAYEE).reduce((acc, b) => acc + b.quantiteFacturee * b.prixUnitaire, 0);
  const totalBilledSent = filteredBillings.filter(b => b.etatFacturation === BillingStatus.ENVOYEE).reduce((acc, b) => acc + b.quantiteFacturee * b.prixUnitaire, 0);
  const totalBilledDraft = filteredBillings.filter(b => b.etatFacturation === BillingStatus.BROUILLON).reduce((acc, b) => acc + b.quantiteFacturee * b.prixUnitaire, 0);
  const totalInvoicedValue = filteredBillings.reduce((acc, b) => acc + b.quantiteFacturee * b.prixUnitaire, 0);

  const subAllocation = subcontractors
    .filter(s => !selectedSub || s.id === selectedSub)
    .map(s => {
      const sp = filteredProjects.filter(p => p.sousTraitantId === s.id);
      const sw = sp.reduce((acc, p) => acc + (p.poidsTotal || 0), 0);
      const sb = filteredBillings.filter(b => {
        const p = filteredProjects.find(proj => proj.id === b.projetId);
        return p && p.sousTraitantId === s.id;
      }).reduce((acc, b) => acc + b.quantiteFacturee * b.prixUnitaire, 0);
      return { subId: s.id, name: s.nom, projectsCount: sp.length, allocatedWeight: sw, currentInvoiced: sb };
    })
    .sort((a, b) => b.allocatedWeight - a.allocatedWeight);

  // Position du menu contextuel (évite les débordements d'écran)
  const menuStyle = contextMenu ? {
    top: Math.min(contextMenu.y, (window.innerHeight || 800) - 190),
    left: Math.min(contextMenu.x, (window.innerWidth || 1200) - 260)
  } : {};

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Barre de filtres */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Filtre Client</span>
            <div className="relative">
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-8 py-2 font-semibold text-slate-700 focus:outline-teal-500 appearance-none cursor-pointer min-w-[180px]">
                <option value="">Tous les clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <Users className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Filtre Partenaire</span>
            <div className="relative">
              <select value={selectedSub} onChange={e => setSelectedSub(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-8 py-2 font-semibold text-slate-700 focus:outline-teal-500 appearance-none cursor-pointer min-w-[180px]">
                <option value="">Tous les sous-traitants</option>
                {subcontractors.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
              <Users className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Date de Début</span>
            <div className="relative">
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-3 py-2 font-mono text-slate-700 focus:outline-teal-500 cursor-pointer" />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Date de Fin</span>
            <div className="relative">
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-3 py-2 font-mono text-slate-700 focus:outline-teal-500 cursor-pointer" />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Période Rapide</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 h-[38px] shadow-3xs">
              {[
                { label: "J", title: "Aujourd'hui", val: "J" },
                { label: "S", title: "Cette semaine", val: "S" },
                { label: "M", title: "Ce mois", val: "M" },
                { label: "T", title: "Ce trimestre", val: "T" },
                { label: "Se", title: "Ce semestre", val: "Se" },
                { label: "A", title: "Cette année", val: "A" },
                { label: "X", title: "Effacer la période", val: "X" }
              ].map(btn => (
                <button key={btn.val} type="button" onClick={() => handleQuickPeriod(btn.val as any)} title={btn.title}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md shadow-3xs hover:scale-105 active:scale-95 transition-all cursor-pointer border ${btn.val === "X"
                    ? "bg-white hover:bg-red-50 text-red-600 border-slate-200 hover:text-red-800 hover:border-red-300"
                    : "bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-700 border-slate-200 hover:border-teal-300"}`}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => setIsPrintModalOpen(true)} type="button"
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-850 font-bold px-3 py-2 border border-slate-250 rounded-lg transition-colors flex items-center gap-1.5 shadow-3xs cursor-pointer">
            <Printer className="w-3.5 h-3.5 text-teal-600" />
            Imprimer la synthèse
          </button>
          {(selectedSub || selectedClient || dateDebut || dateFin) && (
            <button onClick={() => { setSelectedSub(""); setSelectedClient(""); setDateDebut(""); setDateFin(""); }}
              className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── Bloc Tâches urgentes (en haut du tableau de bord) ── */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tachesActives = taches.filter(t => {
          if (t.statut === "TERMINEE") return false;
          if (filterTacheInterlocuteur && t.interlocuteurId !== filterTacheInterlocuteur) return false;
          return true;
        });

        const tachesEnRetard = tachesActives.filter(t => new Date(t.dateEcheance) < today);
        const tachesAujourdhui = tachesActives.filter(t => {
          const d = new Date(t.dateEcheance); d.setHours(0,0,0,0);
          return d.getTime() === today.getTime();
        });
        const tachesAVenir = tachesActives.filter(t => new Date(t.dateEcheance) > today);

        if (tachesActives.length === 0 && !filterTacheInterlocuteur) return null;

        const handleMailTache = (t: Tache) => {
          const inter = interlocuteurs.find(i => i.id === t.interlocuteurId);
          const proj = projects.find(p => p.id === t.projetId);
          if (!inter) return;
          const subject = encodeURIComponent(`[Tâche] ${t.libelle} — ${proj?.nomAffaire || ""} (${proj?.nomZone || ""})`);
          const body = encodeURIComponent(
            `Bonjour ${inter.prenom},\n\nNous vous contactons concernant la tâche suivante :\n\n` +
            `📋 Tâche : ${t.libelle}\n` +
            `🏗️ Affaire : ${proj?.nomAffaire || ""} — ${proj?.nomZone || ""}\n` +
            `📅 Échéance : ${new Date(t.dateEcheance).toLocaleDateString("fr-FR")}\n\n` +
            `Merci de prendre en charge cette demande.\n\nCordialement`
          );
          window.location.href = `mailto:${inter.email}?subject=${subject}&body=${body}`;
        };

        const TacheRow = ({ t, urgent }: { t: Tache; urgent?: boolean }) => {
          const inter = interlocuteurs.find(i => i.id === t.interlocuteurId);
          const proj = projects.find(p => p.id === t.projetId);
          return (
            <>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs ${urgent ? "bg-red-50 border border-red-200" : "bg-amber-50/50 border border-amber-100"}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${urgent ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-900 block truncate">{t.libelle}</span>
                <span className="text-slate-500 font-mono truncate block">{proj?.nomAffaire || "—"} · {proj?.nomZone || ""}</span>
              </div>
              {inter && (
                <span className="text-slate-600 shrink-0 font-semibold hidden md:block">{inter.prenom} {inter.nom}</span>
              )}
              <span className={`font-bold shrink-0 ${urgent ? "text-red-600" : "text-amber-700"}`}>
                {new Date(t.dateEcheance).toLocaleDateString("fr-FR")}
              </span>
              {inter && (
                <button onClick={() => handleMailTache(t)} title="Contacter par mail"
                  className={`p-1.5 rounded transition shrink-0 ${urgent ? "text-red-400 hover:text-red-700 hover:bg-red-100" : "text-amber-400 hover:text-amber-700 hover:bg-amber-100"}`}>
                  <Mail className="w-3.5 h-3.5" />
                </button>
              )}
              {inter && isWritable && (
                <button
                  onClick={(e) => { e.stopPropagation(); setRelanceNoteId(relanceNoteId === t.id ? null : t.id); setRelanceNote(""); }}
                  title="Relancer l'interlocuteur"
                  className={`p-1.5 rounded transition shrink-0 ${urgent ? "text-red-400 hover:text-red-700 hover:bg-red-100" : "text-amber-400 hover:text-amber-700 hover:bg-amber-100"}`}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {relanceNoteId === t.id && (
              <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={relanceNote}
                  onChange={e => setRelanceNote(e.target.value)}
                  placeholder="Note optionnelle..."
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-indigo-500 bg-white"
                />
                <button
                  onClick={async () => {
                    await onRelancerTache(t.id, relanceNote || undefined);
                    const inter2 = interlocuteurs.find(i => i.id === t.interlocuteurId);
                    const proj2 = projects.find(p => p.id === t.projetId);
                    if (inter2) {
                      const relanceNum = (t.relances?.length || 0) + 1;
                      const subject = encodeURIComponent(`[RELANCE ${relanceNum}] ${t.libelle} — ${proj2?.nomAffaire || ""}`);
                      const body = encodeURIComponent(
                        `Bonjour ${inter2.prenom},\n\nNous vous relançons concernant : ${t.libelle}\n\n` +
                        `Affaire : ${proj2?.nomAffaire || ""} — ${proj2?.nomZone || ""}\n` +
                        `Échéance : ${new Date(t.dateEcheance).toLocaleDateString("fr-FR")}\n\n` +
                        `${relanceNote ? `Note : ${relanceNote}\n\n` : ""}Merci de nous tenir informés.\n\nCordialement`
                      );
                      window.location.href = `mailto:${inter2.email}?subject=${subject}&body=${body}`;
                    }
                    setRelanceNoteId(null);
                    setRelanceNote("");
                  }}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  Relancer + mail
                </button>
                <button onClick={() => setRelanceNoteId(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded transition">
                  ✕
                </button>
              </div>
            )}
            </>
          );
        };

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* En-tête avec filtre interlocuteur */}
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ListTodo className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tâches en cours
                    {tachesEnRetard.length > 0 && (
                      <span className="ml-2 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                        {tachesEnRetard.length} en retard
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {tachesActives.length} tâche{tachesActives.length > 1 ? "s" : ""} active{tachesActives.length > 1 ? "s" : ""}
                    {tachesAujourdhui.length > 0 && ` · ${tachesAujourdhui.length} aujourd'hui`}
                    {tachesAVenir.length > 0 && ` · ${tachesAVenir.length} à venir`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select value={filterTacheInterlocuteur} onChange={e => setFilterTacheInterlocuteur(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-indigo-500 bg-white">
                  <option value="">Tous les interlocuteurs</option>
                  {interlocuteurs.map(i => (
                    <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* En retard */}
              {tachesEnRetard.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 uppercase tracking-wider font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    En retard — action urgente requise
                  </div>
                  {tachesEnRetard.sort((a,b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime()).map(t => (
                    <TacheRow key={t.id} t={t} urgent />
                  ))}
                </div>
              )}

              {/* Aujourd'hui */}
              {tachesAujourdhui.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    Échéance aujourd'hui
                  </div>
                  {tachesAujourdhui.map(t => (
                    <TacheRow key={t.id} t={t} />
                  ))}
                </div>
              )}

              {/* À venir */}
              {tachesAVenir.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <ListTodo className="w-3.5 h-3.5" />
                    À venir
                  </div>
                  {tachesAVenir.sort((a,b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime()).slice(0,5).map(t => (
                    <TacheRow key={t.id} t={t} />
                  ))}
                  {tachesAVenir.length > 5 && (
                    <p className="text-[10px] text-slate-400 italic text-center pt-1">
                      + {tachesAVenir.length - 5} tâche{tachesAVenir.length - 5 > 1 ? "s" : ""} supplémentaire{tachesAVenir.length - 5 > 1 ? "s" : ""} — voir l'onglet Tâches
                    </p>
                  )}
                </div>
              )}

              {tachesActives.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">Aucune tâche active{filterTacheInterlocuteur ? " pour cet interlocuteur" : ""}.</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">Tonnage Total</span>
            <span className="text-3xl font-black text-slate-900 block">
              {(totalWeightKg / 1000).toFixed(1)} <span className="text-sm font-semibold text-gray-400">tonnes</span>
            </span>
            <div className="space-y-0.5 mt-2">
              <p className="text-[10px] text-gray-500">
                Dont PRS: <span className="font-semibold">{(totalPoidsPRS/1000).toFixed(1)}t</span> • PDC: <span className="font-semibold">{(totalPoidsPDC/1000).toFixed(1)}t</span>
              </p>
              {totalMlOrdered > 0 && (
                <p className="text-[11px] text-teal-700 font-bold block bg-teal-50/50 px-2 py-0.5 rounded-full inline-block mt-1">
                  📐 PRS Fabriqué : <span className="font-extrabold text-teal-900">{Math.round(totalMlFabricated)} ml</span> / {Math.round(totalMlOrdered)} ml
                </p>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-3">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">Tonnage Fabriqué</span>
              <span className="text-3xl font-black text-slate-900 block">
                {(totalFabricatedKg / 1000).toFixed(1)} <span className="text-sm font-semibold text-gray-400">tonnes</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Hammer className="w-6 h-6" />
            </div>
          </div>
          <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
            <div className="flex justify-between text-[11px] text-gray-500">
              <span className="font-semibold">Avancement Global de Fabrication :</span>
              <span className="font-black text-indigo-700">{fabricationWeightProgression.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(fabricationWeightProgression, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Légende d'usage */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-teal-100 border border-teal-300 inline-block" />
          <Pencil className="w-3 h-3 text-teal-600" />
          Clic simple = Éditer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" />
          <Printer className="w-3 h-3 text-slate-500" />
          Double-clic = Imprimer
        </span>
      </div>

      {/* 3 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne 1 : Affaires en cours ── */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest block font-mono">Suivi des Ateliers</span>
            <h3 className="text-sm font-bold text-slate-900">Affaires en Cours de Fab. <span className="text-xs font-normal text-slate-400 block">(Non facturées)</span></h3>
            <p className="text-xs text-slate-400 mt-1">Clic = éditer • Double-clic = imprimer</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {(() => {
              const billedPaidIds = new Set(
                filteredBillings.filter(b => b.etatFacturation === BillingStatus.PAYEE).flatMap(b => [b.projetId, ...(b.projetIds || [])])
              );
              const list = filteredProjects
                .filter(p => p.status === ProjectStatus.EN_COURS && !billedPaidIds.has(p.id))
                .sort((a, b) => a.nomAffaire.localeCompare(b.nomAffaire, "fr"));

              if (list.length === 0) return <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-lg">Aucune affaire en cours de fabrication.</p>;

              return list.map(proj => {
                const client = clients.find(c => c.id === proj.clientId);
                const sub = subcontractors.find(s => s.id === proj.sousTraitantId);
                return (
                  <div key={proj.id}
                    onClick={(e) => handleCardClick(e, proj)}
                    onDoubleClick={(e) => handleCardDoubleClick(e, proj)}
                    title="Clic = Éditer • Double-clic = Imprimer"
                    className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-lg text-xs space-y-1 hover:bg-indigo-50/80 hover:border-indigo-300 transition cursor-pointer select-none group">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-slate-900 uppercase leading-tight">{proj.nomAffaire} - {proj.nomZone}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Pencil className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition" />
                        <span className="font-mono bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">En cours</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-slate-500">
                      <div><span className="font-bold text-slate-700">Client:</span> {client?.nom || "Inconnu"}</div>
                      <div><span className="font-bold text-slate-700">Sous-traitant:</span> {sub?.nom || "Inconnu"}</div>
                      <div className="col-span-2 text-slate-400 flex justify-between mt-1 pt-1 border-t border-slate-100/60 italic">
                        <span>Poids: <strong className="text-slate-700 font-mono">{proj.poidsTotal.toLocaleString("fr-FR")} kg</strong></span>
                        <span>Livraison: <strong className="text-slate-650">{proj.delaiLivraisonChantier ? new Date(proj.delaiLivraisonChantier).toLocaleDateString("fr-FR") : "-"}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* ── Colonne 2 : Terminées non facturées ── */}
        <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-widest block font-mono">Fin de Production</span>
            <h3 className="text-sm font-bold text-slate-900">Terminé de Fabriquer <span className="text-xs font-normal text-slate-400 block">(Non facturées)</span></h3>
            <p className="text-xs text-slate-400 mt-1">Clic = éditer • Double-clic = imprimer</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {(() => {
              const invoicedIds = new Set(
                filteredBillings.filter(b => b.etatFacturation === BillingStatus.ENVOYEE || b.etatFacturation === BillingStatus.PAYEE).flatMap(b => [b.projetId, ...(b.projetIds || [])])
              );
              const list = filteredProjects
                .filter(p => p.status === ProjectStatus.TERMINEE && !invoicedIds.has(p.id))
                .sort((a, b) => a.nomAffaire.localeCompare(b.nomAffaire, "fr"));

              if (list.length === 0) return <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-lg">Aucune affaire terminée non facturée.</p>;

              return list.map(proj => {
                const client = clients.find(c => c.id === proj.clientId);
                const sub = subcontractors.find(s => s.id === proj.sousTraitantId);
                return (
                  <div key={proj.id}
                    onClick={(e) => handleCardClick(e, proj)}
                    onDoubleClick={(e) => handleCardDoubleClick(e, proj)}
                    title="Clic = Éditer • Double-clic = Imprimer"
                    className="p-3 bg-rose-50/40 border border-rose-100 rounded-lg text-xs space-y-1 hover:bg-rose-50/80 hover:border-rose-300 transition cursor-pointer select-none group">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-rose-950 uppercase leading-tight">{proj.nomAffaire} - {proj.nomZone}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Pencil className="w-3 h-3 text-rose-400 opacity-0 group-hover:opacity-100 transition" />
                        <span className="font-mono bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">Fini</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-slate-500">
                      <div><span className="font-bold text-slate-700">Client:</span> {client?.nom || "Inconnu"}</div>
                      <div><span className="font-bold text-slate-700">Sous-traitant:</span> {sub?.nom || "Inconnu"}</div>
                      <div className="col-span-2 text-slate-400 flex justify-between mt-1 pt-1 border-t border-slate-100/60 italic">
                        <span>Poids: <strong className="text-slate-700 font-mono">{proj.poidsTotal.toLocaleString("fr-FR")} kg</strong></span>
                        <span>Délai: <strong>{proj.delaiLivraisonChantier ? new Date(proj.delaiLivraisonChantier).toLocaleDateString("fr-FR") : "-"}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* ── Colonne 3 : Affaires facturées ── */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest block font-mono">Relances de Trésorerie</span>
            <h3 className="text-sm font-bold text-slate-900">Affaires Facturées <span className="text-xs font-normal text-slate-400 block">(Non payées)</span></h3>
            <p className="text-xs text-slate-400 mt-1">Clic = éditer • Double-clic = imprimer</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {(() => {
              const list = filteredBillings
                .filter(b => b.etatFacturation === BillingStatus.ENVOYEE || b.etatFacturation === BillingStatus.BROUILLON)
                .sort((a, b) => {
                  const pA = filteredProjects.find(p => p.id === a.projetId);
                  const pB = filteredProjects.find(p => p.id === b.projetId);
                  return (pA?.nomAffaire || "").localeCompare(pB?.nomAffaire || "", "fr");
                });

              if (list.length === 0) return <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-lg">Aucun encours de facture non payée.</p>;

              return list.map(bill => {
                const primaryProj = filteredProjects.find(p => p.id === bill.projetId);
                const client = clients.find(c => c.id === primaryProj?.clientId);
                const otherZones = (bill.projetIds || []).map(pid => filteredProjects.find(p => p.id === pid)?.nomZone).filter(Boolean).join(", ");
                const allZones = [primaryProj?.nomZone, otherZones].filter(Boolean).join(", ");
                return (
                  <div key={bill.id}
                    onClick={(e) => handleCardClick(e, primaryProj, bill)}
                    onDoubleClick={(e) => handleCardDoubleClick(e, primaryProj, bill)}
                    title="Clic = Éditer • Double-clic = Imprimer"
                    className="p-3 bg-amber-50/20 border border-amber-200 rounded-lg text-xs space-y-1 hover:bg-amber-50/60 hover:border-amber-300 transition cursor-pointer select-none group">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-slate-950 uppercase leading-tight">{primaryProj?.nomAffaire || "Affaire"} ({allZones})</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Pencil className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold ${bill.etatFacturation === BillingStatus.ENVOYEE ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                          {bill.etatFacturation === BillingStatus.ENVOYEE ? "Envoyée" : "Brouillon"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-slate-500">
                      <div><span className="font-bold text-slate-700">Client:</span> {client?.nom || "Inconnu"}</div>
                      <div><span className="font-bold text-slate-700">Facture reçue ?</span> {bill.factureRecue ? "Oui ✅" : "Non ❌"}</div>
                      <div className="col-span-2 flex justify-between mt-1 pt-1 border-t border-slate-100/60 font-mono">
                        <span className="text-[10px]">Échéance: <strong className="text-slate-600">{bill.dateEcheance ? new Date(bill.dateEcheance).toLocaleDateString("fr-FR") : "-"}</strong></span>
                        <span className="font-extrabold text-slate-900 text-xs">{(bill.quantiteFacturee * bill.prixUnitaire).toLocaleString("fr-FR")} €</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>

      {/* Trésorerie + Répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block font-mono">Liquidités & Trésorerie</span>
            <h3 className="text-base font-bold text-slate-900">Facturations Établies</h3>
            <p className="text-xs text-gray-400 mt-1">Cumul partiel de la base de facturées</p>
          </div>
          <div className="pt-2 divide-y divide-slate-100 space-y-3">
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>
                <div><span className="text-xs font-semibold block text-slate-800">Factures Payées</span><span className="text-[10px] text-gray-400">Encaissées sur compte</span></div>
              </div>
              <span className="text-sm font-bold text-slate-900">{totalBilledPaid.toLocaleString("fr-FR")} €</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center"><Hourglass className="w-4 h-4" /></div>
                <div><span className="text-xs font-semibold block text-slate-800">Factures Envoyées</span><span className="text-[10px] text-gray-400">Échéances en cours</span></div>
              </div>
              <span className="text-sm font-bold text-slate-900">{totalBilledSent.toLocaleString("fr-FR")} €</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                <div><span className="text-xs font-semibold block text-slate-800">Brouillons / Ébauches</span><span className="text-[10px] text-gray-400">Factures non soumises</span></div>
              </div>
              <span className="text-sm font-bold text-slate-900">{totalBilledDraft.toLocaleString("fr-FR")} €</span>
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs font-bold">
            <span>Total Factures Établies :</span>
            <span className="text-teal-700">{totalInvoicedValue.toLocaleString("fr-FR")} €</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block font-mono">Répartition Industrielle</span>
            <h3 className="text-base font-bold text-slate-900">Capacité et Tonnage par Partenaire Sous-Traitant</h3>
            <p className="text-xs text-gray-400 mt-1">Équilibrage des charges de fabrication</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {subAllocation.map(sa => {
              const fraction = totalWeightKg > 0 ? (sa.allocatedWeight / totalWeightKg) * 100 : 0;
              return (
                <div key={sa.subId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <Building className="w-3.5 h-3.5 text-teal-600" />{sa.name}
                    </h4>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-[10px] text-gray-400 block">Affaires :</span><span className="font-bold text-slate-800">{sa.projectsCount}</span></div>
                      <div><span className="text-[10px] text-gray-400 block">Tonnage :</span><span className="font-black text-slate-900">{(sa.allocatedWeight / 1000).toFixed(1)} t</span></div>
                    </div>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                      <span>Part d'enveloppe tonnage :</span><span className="font-semibold">{fraction.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: `${fraction}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal impression synthèse */}
      {isPrintModalOpen && (
        <DashboardPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          projects={projects}
          budgets={budgets}
          realises={realises}
          billings={billings}
          subcontractors={subcontractors}
          clients={clients}
          selectedClientId={selectedClient}
          selectedSubId={selectedSub}
          dateDebut={dateDebut}
          dateFin={dateFin}
        />
      )}

      {/* ── Menu contextuel ── */}
      {contextMenu && (
        <div
          className={`fixed z-[60] border rounded-xl shadow-2xl py-1.5 min-w-[255px] text-xs ${
            contextMenu.type === "edit"
              ? "bg-teal-600 border-teal-500"
              : "bg-white border-slate-200"
          }`}
          style={menuStyle}
          onClick={e => e.stopPropagation()}
        >
          {/* En-tête du menu */}
          <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b mb-1 truncate ${
            contextMenu.type === "edit"
              ? "text-teal-100 border-teal-500"
              : "text-slate-400 border-slate-100"
          }`}>
            {contextMenu.type === "edit" ? "✏️ Éditer" : "🖨️ Imprimer"} — {contextMenu.project.nomAffaire} ({contextMenu.project.nomZone})
          </div>

{contextMenu.type === "edit" ? (
            /* ── Options d'ÉDITION ── */
            <>
              {/* Bandeau avertissement Lecteur */}
              {userRole === "Lecteur" && (
                <div className="mx-2 mb-1 px-2.5 py-1.5 bg-teal-700/60 rounded-lg text-[10px] text-teal-100 font-semibold flex items-center gap-1.5">
                  🔒 Mode lecture seule — édition non autorisée
                </div>
              )}

              <button
                onClick={() => { if (userRole !== "Lecteur") { onEditProject(contextMenu.project); setContextMenu(null); } }}
                disabled={userRole === "Lecteur"}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 font-semibold transition rounded-md mx-0.5 ${
                  userRole === "Lecteur"
                    ? "text-teal-300/50 cursor-not-allowed opacity-50"
                    : "hover:bg-teal-700 text-white cursor-pointer"
                }`}
                title={userRole === "Lecteur" ? "Accès en lecture seule" : ""}
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-200 shrink-0" />
                Modifier l'affaire
              </button>

              <button
                onClick={() => { if (userRole !== "Lecteur") { onEditBudgetRealise(contextMenu.project); setContextMenu(null); } }}
                disabled={userRole === "Lecteur"}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 font-semibold transition rounded-md mx-0.5 ${
                  userRole === "Lecteur"
                    ? "text-teal-300/50 cursor-not-allowed opacity-50"
                    : "hover:bg-teal-700 text-white cursor-pointer"
                }`}
                title={userRole === "Lecteur" ? "Accès en lecture seule" : ""}
              >
                <BarChart3 className="w-4 h-4 text-teal-200 shrink-0" />
                Modifier Budget / Réalisé
              </button>

              {contextMenu.billing ? (
                <button
                  onClick={() => { if (userRole !== "Lecteur") { onEditBilling(contextMenu.billing!); setContextMenu(null); } }}
                  disabled={userRole === "Lecteur"}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 font-semibold transition rounded-md mx-0.5 ${
                    userRole === "Lecteur"
                      ? "text-teal-300/50 cursor-not-allowed opacity-50"
                      : "hover:bg-teal-700 text-white cursor-pointer"
                  }`}
                  title={userRole === "Lecteur" ? "Accès en lecture seule" : ""}
                >
                  <Receipt className="w-4 h-4 text-teal-200 shrink-0" />
                  Modifier l'accord de facturation
                </button>
              ) : (
                <div className="w-full text-left px-3 py-2 flex items-center gap-2.5 font-semibold text-teal-300/50 cursor-not-allowed"
                  title="Disponible uniquement pour les affaires déjà facturées">
                  <Receipt className="w-4 h-4 text-teal-300/40 shrink-0" />
                  Modifier l'accord de facturation
                </div>
              )}
            </>
          ) : (
            /* ── Options d'IMPRESSION ── */
            <>
              <button
                onClick={() => { onOpenPrestation(contextMenu.project); setContextMenu(null); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-semibold text-slate-700 transition"
              >
                <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                Fiche de Prestation
              </button>

              <button
                onClick={() => { onOpenBudgetRealise(contextMenu.project); setContextMenu(null); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-semibold text-slate-700 transition"
              >
                <BarChart3 className="w-4 h-4 text-amber-600 shrink-0" />
                Fiche Décision (Budget/Réel)
              </button>

              {contextMenu.billing ? (
                <button
                  onClick={() => { onOpenBillingPrint(contextMenu.billing!); setContextMenu(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-semibold text-slate-700 transition"
                >
                  <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
                  Accord de Facturation
                </button>
              ) : (
                <div className="w-full text-left px-3 py-2 flex items-center gap-2.5 font-semibold text-slate-350 cursor-not-allowed"
                  title="Disponible uniquement pour les affaires déjà facturées">
                  <Receipt className="w-4 h-4 text-slate-300 shrink-0" />
                  Accord de Facturation
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
