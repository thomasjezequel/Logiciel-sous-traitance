import { useState, useMemo } from "react";
import { Project, Billing, Tache, Client, Subcontractor } from "../types";
import { ChevronLeft, ChevronRight, Calendar, Filter } from "lucide-react";

interface CalendarEvent {
  date: string; // YYYY-MM-DD
  label: string;
  type: "appro" | "tracage" | "protection" | "livraison" | "tache" | "facturation";
  projectName?: string;
  color: string;
  bgColor: string;
  overdue?: boolean;
}

interface CalendarViewProps {
  projects: Project[];
  billings: Billing[];
  taches: Tache[];
  clients: Client[];
  subcontractors: Subcontractor[];
}

const TYPE_CONFIG = {
  appro:       { label: "Appro matière",        color: "text-blue-800",   bgColor: "bg-blue-100",   border: "border-blue-300" },
  tracage:     { label: "Traçage / Lancement",   color: "text-purple-800", bgColor: "bg-purple-100", border: "border-purple-300" },
  protection:  { label: "Livraison Protection",  color: "text-orange-800", bgColor: "bg-orange-100", border: "border-orange-300" },
  livraison:   { label: "Livraison Chantier",    color: "text-teal-800",   bgColor: "bg-teal-100",   border: "border-teal-300" },
  tache:       { label: "Tâche",                 color: "text-indigo-800", bgColor: "bg-indigo-100", border: "border-indigo-300" },
  facturation: { label: "Facturation",           color: "text-amber-800",  bgColor: "bg-amber-100",  border: "border-amber-300" },
};

export default function CalendarView({ projects, billings, taches, clients, subcontractors }: CalendarViewProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Filtres actifs
  const [showAppro, setShowAppro] = useState(true);
  const [showTracage, setShowTracage] = useState(true);
  const [showProtection, setShowProtection] = useState(true);
  const [showLivraison, setShowLivraison] = useState(true);
  const [showTaches, setShowTaches] = useState(true);
  const [showFacturation, setShowFacturation] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [filterSub, setFilterSub] = useState("");

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  // Projets filtrés
  const filteredProjects = projects.filter(p => {
    if (filterClient && p.clientId !== filterClient) return false;
    if (filterSub && p.sousTraitantId !== filterSub) return false;
    return true;
  });
  const filteredProjectIds = new Set(filteredProjects.map(p => p.id));

  // Construction de tous les événements
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const todayStr = today.toISOString().slice(0, 10);

    filteredProjects.forEach(p => {
      const name = `${p.nomAffaire} — ${p.nomZone}`;
      if (showAppro && p.dateAppro) {
        events.push({ date: p.dateAppro, label: "Appro", type: "appro", projectName: name, ...TYPE_CONFIG.appro });
      }
      if (showTracage && p.dateTracage) {
        events.push({ date: p.dateTracage, label: "Traçage", type: "tracage", projectName: name, ...TYPE_CONFIG.tracage });
      }
      if (showProtection && p.delaiLivraisonProtection) {
        events.push({ date: p.delaiLivraisonProtection, label: "Livr. Protection", type: "protection", projectName: name, ...TYPE_CONFIG.protection });
      }
      if (showLivraison && p.delaiLivraisonChantier) {
        events.push({ date: p.delaiLivraisonChantier, label: "Livr. Chantier", type: "livraison", projectName: name, ...TYPE_CONFIG.livraison });
      }
    });

    if (showTaches) {
      taches.filter(t => t.statut !== "TERMINEE" && filteredProjectIds.has(t.projetId)).forEach(t => {
        const proj = projects.find(p => p.id === t.projetId);
        events.push({
          date: t.dateEcheance,
          label: t.libelle,
          type: "tache",
          projectName: proj ? `${proj.nomAffaire} — ${proj.nomZone}` : "",
          overdue: t.dateEcheance < todayStr,
          ...TYPE_CONFIG.tache,
          bgColor: t.dateEcheance < todayStr ? "bg-red-100" : "bg-indigo-100",
          color: t.dateEcheance < todayStr ? "text-red-800" : "text-indigo-800"
        });
      });
    }

    if (showFacturation) {
      billings.filter(b => b.etatFacturation !== "Payée" && (filterClient === "" || filteredProjectIds.has(b.projetId))).forEach(b => {
        if (b.dateEcheance) {
          const proj = projects.find(p => p.id === b.projetId);
          events.push({
            date: b.dateEcheance,
            label: `Facture ${(b.quantiteFacturee * b.prixUnitaire).toLocaleString("fr-FR")} €`,
            type: "facturation",
            projectName: proj ? `${proj.nomAffaire} — ${proj.nomZone}` : "",
            ...TYPE_CONFIG.facturation
          });
        }
      });
    }

    return events;
  }, [filteredProjects, taches, billings, showAppro, showTracage, showProtection, showLivraison, showTaches, showFacturation, filterClient, filterSub]);

  // Jours du mois
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = lastDay.getDate();

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const getDateStr = (day: number) =>
    `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const getEventsForDay = (day: number) => {
    const dateStr = getDateStr(day);
    return allEvents.filter(e => e.date === dateStr);
  };

  const selectedEvents = selectedDay ? allEvents.filter(e => e.date === selectedDay) : [];

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Prochains événements (pour le résumé)
  const upcomingEvents = allEvents
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  return (
    <div className="space-y-5">

      {/* Filtres */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Toggles catégories */}
            {[
              { key: "appro",       label: "🔵 Appro",       state: showAppro,       set: setShowAppro },
              { key: "tracage",     label: "🟣 Traçage",     state: showTracage,     set: setShowTracage },
              { key: "protection",  label: "🟠 Protection",  state: showProtection,  set: setShowProtection },
              { key: "livraison",   label: "🟢 Livraison",   state: showLivraison,   set: setShowLivraison },
              { key: "tache",       label: "🔷 Tâches",      state: showTaches,      set: setShowTaches },
              { key: "facturation", label: "🟡 Facturation", state: showFacturation, set: setShowFacturation },
            ].map(f => (
              <button key={f.key} onClick={() => f.set(v => !v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${f.state ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-teal-500 bg-white">
              <option value="">Tous les clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={filterSub} onChange={e => setFilterSub(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-teal-500 bg-white">
              <option value="">Tous les sous-traitants</option>
              {subcontractors.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Calendrier principal */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">

          {/* Navigation */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <h2 className="text-sm font-bold text-slate-900 capitalize min-w-[160px] text-center">{monthName}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <button onClick={goToday} className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition">
              Aujourd'hui
            </button>
          </div>

          {/* Grille */}
          <div className="p-3">
            {/* En-têtes jours */}
            <div className="grid grid-cols-7 mb-1">
              {JOURS.map(j => (
                <div key={j} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{j}</div>
              ))}
            </div>

            {/* Cellules */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Cases vides avant le 1er */}
              {Array.from({ length: startDow }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 rounded-lg bg-slate-50/30" />
              ))}

              {/* Jours du mois */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = getDateStr(day);
                const events = getEventsForDay(day);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;
                const hasOverdue = events.some(e => e.overdue);

                return (
                  <div key={day}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`h-20 rounded-lg p-1 cursor-pointer transition border ${
                      isSelected ? "border-teal-400 bg-teal-50/60" :
                      isToday ? "border-teal-300 bg-teal-50/30" :
                      hasOverdue ? "border-red-200 bg-red-50/20" :
                      "border-transparent hover:border-slate-200 hover:bg-slate-50/60"
                    }`}>
                    <div className={`text-[11px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? "bg-teal-600 text-white" : "text-slate-700"
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {events.slice(0, 3).map((ev, idx) => (
                        <div key={idx} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${ev.bgColor} ${ev.color}`}>
                          {ev.label}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-[9px] text-slate-400 font-mono px-1">+{events.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Détail du jour sélectionné */}
          {selectedDay && selectedEvents.length > 0 && (
            <div className="border-t border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-3">
                📅 {new Date(selectedDay + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <div className="space-y-2">
                {selectedEvents.map((ev, idx) => (
                  <div key={idx} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${ev.bgColor} border ${TYPE_CONFIG[ev.type].border}`}>
                    <div className="flex-1">
                      <span className={`text-xs font-bold block ${ev.color}`}>{ev.label}</span>
                      {ev.projectName && <span className="text-[10px] text-slate-500 block">{ev.projectName}</span>}
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${ev.bgColor} ${ev.color} shrink-0`}>
                      {TYPE_CONFIG[ev.type].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panneau latéral — Prochains événements */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Prochains événements
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 text-center">Aucun événement à venir.</p>
            ) : upcomingEvents.map((ev, idx) => (
              <div key={idx}
                onClick={() => {
                  const d = new Date(ev.date + "T12:00:00");
                  setCurrentMonth(d.getMonth());
                  setCurrentYear(d.getFullYear());
                  setSelectedDay(ev.date);
                }}
                className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    ev.type === "appro" ? "bg-blue-500" :
                    ev.type === "tracage" ? "bg-purple-500" :
                    ev.type === "protection" ? "bg-orange-500" :
                    ev.type === "livraison" ? "bg-teal-500" :
                    ev.type === "tache" ? (ev.overdue ? "bg-red-500" : "bg-indigo-500") :
                    "bg-amber-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-800 block truncate">{ev.label}</span>
                    {ev.projectName && <span className="text-[10px] text-slate-400 block truncate">{ev.projectName}</span>}
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(ev.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
