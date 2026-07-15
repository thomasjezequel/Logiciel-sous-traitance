import React, { useState, useMemo, useRef } from "react";
import { Project, Billing, Tache, Client, Subcontractor } from "../types";
import { ChevronLeft, ChevronRight, Calendar, Printer, X, Download } from "lucide-react";

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

  // ── Modal impression ──────────────────────────────────────────────────────
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPeriod, setPrintPeriod] = useState<"month" | "week" | "custom">("month");
  const [printDateDebut, setPrintDateDebut] = useState("");
  const [printDateFin, setPrintDateFin] = useState("");
  const [printAppro, setPrintAppro] = useState(true);
  const [printTracage, setPrintTracage] = useState(true);
  const [printProtection, setPrintProtection] = useState(true);
  const [printLivraison, setPrintLivraison] = useState(true);
  const [printTaches, setPrintTaches] = useState(true);
  const [printFacturation, setPrintFacturation] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Calcul des dates de la période d'impression
  const getPrintRange = () => {
    if (printPeriod === "month") {
      const first = new Date(currentYear, currentMonth, 1);
      const last = new Date(currentYear, currentMonth + 1, 0);
      return {
        debut: first.toISOString().slice(0, 10),
        fin: last.toISOString().slice(0, 10),
        label: new Date(currentYear, currentMonth, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      };
    }
    if (printPeriod === "week") {
      const d = new Date();
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return {
        debut: mon.toISOString().slice(0, 10),
        fin: sun.toISOString().slice(0, 10),
        label: `Semaine du ${mon.toLocaleDateString("fr-FR")} au ${sun.toLocaleDateString("fr-FR")}`
      };
    }
    return {
      debut: printDateDebut,
      fin: printDateFin,
      label: `Du ${new Date(printDateDebut).toLocaleDateString("fr-FR")} au ${new Date(printDateFin).toLocaleDateString("fr-FR")}`
    };
  };

  // Génère et imprime le PDF
  const handlePrint = () => {
    const range = getPrintRange();
    if (!range.debut || !range.fin) return;

    const filteredEvts = allEvents.filter(e => {
      if (e.date < range.debut || e.date > range.fin) return false;
      if (e.type === "appro" && !printAppro) return false;
      if (e.type === "tracage" && !printTracage) return false;
      if (e.type === "protection" && !printProtection) return false;
      if (e.type === "livraison" && !printLivraison) return false;
      if (e.type === "tache" && !printTaches) return false;
      if (e.type === "facturation" && !printFacturation) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Calcul nombre de jours
    const nbJours = Math.ceil((new Date(range.fin).getTime() - new Date(range.debut).getTime()) / 86400000) + 1;
    const isMonthView = printPeriod === "month" || nbJours > 14;

    // Grouper par date pour la vue liste
    const byDate: Record<string, CalendarEvent[]> = {};
    filteredEvts.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    // Construire le HTML du document
    let html = `
      <html><head><meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
        h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .subtitle { color: #64748b; font-size: 10px; margin-bottom: 20px; }
        .legend { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

        /* Vue liste */
        .date-block { margin-bottom: 14px; }
        .date-header { font-size: 11px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; }
        .event-row { display: flex; align-items: flex-start; gap: 8px; padding: 4px 6px; border-radius: 4px; margin-bottom: 3px; }
        .event-label { font-weight: bold; font-size: 10px; }
        .event-project { font-size: 9px; color: #64748b; }
        .event-type { font-size: 8px; font-weight: bold; padding: 1px 5px; border-radius: 10px; white-space: nowrap; }

        /* Vue grille */
        .cal-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
        .cal-header { background: #f1f5f9; text-align: center; padding: 4px; font-size: 9px; font-weight: bold; color: #64748b; }
        .cal-week { background: #f8fafc; text-align: center; padding: 4px 2px; font-size: 9px; color: #94a3b8; font-weight: bold; }
        .cal-day { border: 1px solid #e2e8f0; min-height: 70px; padding: 3px; vertical-align: top; }
        .cal-day-empty { border: 1px solid #f1f5f9; min-height: 70px; background: #fafafa; }
        .cal-day-num { font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 2px; }
        .cal-event { font-size: 8px; font-weight: bold; padding: 1px 3px; border-radius: 3px; margin-bottom: 1px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

        /* Pages */
        .page-landscape { padding: 15mm; }
        .page-portrait { padding: 15mm; page-break-before: always; }
        @page { margin: 0; }
        @media print {
          .page-landscape { width: 267mm; min-height: 190mm; }
          .page-portrait { width: 180mm; }
        }
      </style></head><body>
      <div class="page-landscape">
      <h1>📅 Calendrier FlowFab — ${range.label}</h1>
      <div class="subtitle">Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
      <div class="legend">
        ${printAppro ? '<div class="legend-item"><span class="dot" style="background:#3b82f6"></span>Appro matière</div>' : ""}
        ${printTracage ? '<div class="legend-item"><span class="dot" style="background:#a855f7"></span>Traçage / Lancement</div>' : ""}
        ${printProtection ? '<div class="legend-item"><span class="dot" style="background:#f97316"></span>Livraison Protection</div>' : ""}
        ${printLivraison ? '<div class="legend-item"><span class="dot" style="background:#14b8a6"></span>Livraison Chantier</div>' : ""}
        ${printTaches ? '<div class="legend-item"><span class="dot" style="background:#6366f1"></span>Tâches</div>' : ""}
        ${printFacturation ? '<div class="legend-item"><span class="dot" style="background:#f59e0b"></span>Facturation</div>' : ""}
      </div>`;

    if (isMonthView && printPeriod === "month") {
      // Vue grille mensuelle
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const startDow2 = (firstDay.getDay() + 6) % 7;
      const daysInMonth2 = lastDay.getDate();
      const JOURS2 = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

      html += `<div class="cal-grid">
        <div class="cal-header">S.</div>
        ${JOURS2.map(j => `<div class="cal-header">${j}</div>`).join("")}`;

      let day2 = 1;
      let rowIdx = 0;
      while (day2 <= daysInMonth2) {
        const wn = getWeekNumber(currentYear, currentMonth, day2);
        html += `<div class="cal-week">S${wn}</div>`;
        const startCol = rowIdx === 0 ? startDow2 : 0;
        for (let e = 0; e < startCol; e++) html += `<div class="cal-day-empty"></div>`;
        for (let col = startCol; col < 7 && day2 <= daysInMonth2; col++, day2++) {
          const ds = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day2).padStart(2,"0")}`;
          const evts = filteredEvts.filter(e => e.date === ds);
          html += `<div class="cal-day">
            <div class="cal-day-num">${day2}</div>
            ${evts.map(ev => {
              const bg = ev.type === "appro" ? "#dbeafe" : ev.type === "tracage" ? "#f3e8ff" : ev.type === "protection" ? "#ffedd5" : ev.type === "livraison" ? "#ccfbf1" : ev.type === "tache" ? "#e0e7ff" : "#fef3c7";
              const col2 = ev.type === "appro" ? "#1d4ed8" : ev.type === "tracage" ? "#7e22ce" : ev.type === "protection" ? "#c2410c" : ev.type === "livraison" ? "#0f766e" : ev.type === "tache" ? "#4338ca" : "#b45309";
              return `<div class="cal-event" style="background:${bg};color:${col2}">${ev.label}</div>`;
            }).join("")}
          </div>`;
        }
        // Fin de ligne
        if (day2 > daysInMonth2) {
          const used = (rowIdx === 0 ? (7 - startDow2) : 7) - (daysInMonth2 - (rowIdx === 0 ? 0 : startDow2 + rowIdx * 7 - startDow2));
          for (let e = 0; e < 7 - (daysInMonth2 % 7 === 0 ? 7 : daysInMonth2 % 7) - (rowIdx === 0 ? startDow2 : 0); e++) {
            if (e >= 0 && rowIdx > 0) html += `<div class="cal-day-empty"></div>`;
          }
        }
        rowIdx++;
      }
      html += `</div>`;
    } else {
      // Vue liste chronologique
      if (Object.keys(byDate).length === 0) {
        html += `<p style="color:#94a3b8;font-style:italic">Aucun événement sur cette période.</p>`;
      } else {
        Object.keys(byDate).sort().forEach(date => {
          const d = new Date(date + "T12:00:00");
          const wn = getWeekNumber(d.getFullYear(), d.getMonth(), d.getDate());
          html += `<div class="date-block">
            <div class="date-header">
              ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — S${wn}
            </div>`;
          byDate[date].forEach(ev => {
            const bg = ev.type === "appro" ? "#dbeafe" : ev.type === "tracage" ? "#f3e8ff" : ev.type === "protection" ? "#ffedd5" : ev.type === "livraison" ? "#ccfbf1" : ev.type === "tache" ? "#e0e7ff" : "#fef3c7";
            const col2 = ev.type === "appro" ? "#1d4ed8" : ev.type === "tracage" ? "#7e22ce" : ev.type === "protection" ? "#c2410c" : ev.type === "livraison" ? "#0f766e" : ev.type === "tache" ? "#4338ca" : "#b45309";
            const typeLabel = ev.type === "appro" ? "Appro" : ev.type === "tracage" ? "Traçage" : ev.type === "protection" ? "Protection" : ev.type === "livraison" ? "Livraison" : ev.type === "tache" ? "Tâche" : "Facturation";
            html += `<div class="event-row" style="background:${bg}20">
              <span class="event-type" style="background:${bg};color:${col2}">${typeLabel}</span>
              <div>
                <div class="event-label">${ev.label}</div>
                ${ev.projectName ? `<div class="event-project">${ev.projectName}</div>` : ""}
              </div>
            </div>`;
          });
          html += `</div>`;
        });
      }
    }

    // Liste chronologique sous la grille (toujours affichée)
    html += `</div>`; // ferme page-landscape

    // Page 2 — Liste chronologique détaillée (A4 portrait)
    html += `<div class="page-portrait">
      <h2 style="font-size:14px;font-weight:bold;color:#1e293b;margin-bottom:4px;">
        📋 Détail chronologique — ${range.label}
      </h2>
      <p style="font-size:9px;color:#94a3b8;margin-bottom:16px;">Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>`;

    if (Object.keys(byDate).length === 0) {
      html += `<p style="color:#94a3b8;font-style:italic;font-size:10px;">Aucun événement sur cette période.</p>`;
    } else {
      Object.keys(byDate).sort().forEach(date => {
        const d = new Date(date + "T12:00:00");
        const wn = getWeekNumber(d.getFullYear(), d.getMonth(), d.getDate());
        html += `<div class="date-block">
          <div class="date-header">
            ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — S${wn}
          </div>`;
        byDate[date].forEach(ev => {
          const bg = ev.type === "appro" ? "#dbeafe" : ev.type === "tracage" ? "#f3e8ff" : ev.type === "protection" ? "#ffedd5" : ev.type === "livraison" ? "#ccfbf1" : ev.type === "tache" ? "#e0e7ff" : "#fef3c7";
          const col2 = ev.type === "appro" ? "#1d4ed8" : ev.type === "tracage" ? "#7e22ce" : ev.type === "protection" ? "#c2410c" : ev.type === "livraison" ? "#0f766e" : ev.type === "tache" ? "#4338ca" : "#b45309";
          const typeLabel = ev.type === "appro" ? "Appro" : ev.type === "tracage" ? "Traçage" : ev.type === "protection" ? "Protection" : ev.type === "livraison" ? "Livraison" : ev.type === "tache" ? "Tâche" : "Facturation";
          html += `<div class="event-row" style="background:${bg}20">
            <span class="event-type" style="background:${bg};color:${col2}">${typeLabel}</span>
            <div>
              <div class="event-label">${ev.label}</div>
              ${ev.projectName ? `<div class="event-project">${ev.projectName}</div>` : ""}
            </div>
          </div>`;
        });
        html += `</div>`;
      });
    }

    html += `</div></div></body></html>`;

    // Injection dans le DOM courant + impression directe (même méthode que les autres fiches)
    const tempContainer = document.createElement("div");
    tempContainer.id = "print-temp-calendar";
    tempContainer.innerHTML = html;
    document.body.appendChild(tempContainer);

    const style = document.createElement("style");
    style.id = "print-temporary-style-calendar";
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        body > #print-temp-calendar { display: block !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .page-landscape {
          size: A4 landscape;
        }
        .page-portrait {
          page-break-before: always;
        }
        @page { margin: 15mm; }
      }
    `;
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      tempContainer.remove();
      style.remove();
    }, 1000);

    setShowPrintModal(false);
  };

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

  // Calcul du numéro de semaine ISO
  const getWeekNumber = (year: number, month: number, day: number): number => {
    const d = new Date(year, month, day);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  };

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
            <button onClick={() => setShowPrintModal(true)}
              className="text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition">
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>
          </div>

      {/* ── Modal d'impression ── */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-600" />
                Imprimer le calendrier
              </h2>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">

              {/* Étape 1 — Période */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">Étape 1 — Période</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "month", label: "Mois en cours", sub: new Date(currentYear, currentMonth, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) },
                    { val: "week", label: "Semaine en cours", sub: `S${getWeekNumber(today.getFullYear(), today.getMonth(), today.getDate())}` },
                    { val: "custom", label: "Dates personnalisées", sub: "Choisir les dates" }
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setPrintPeriod(opt.val as any)}
                      className={`p-3 rounded-lg border text-left transition ${printPeriod === opt.val ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <span className={`text-xs font-bold block ${printPeriod === opt.val ? "text-teal-800" : "text-slate-700"}`}>{opt.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">{opt.sub}</span>
                    </button>
                  ))}
                </div>
                {printPeriod === "custom" && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Date début</label>
                      <input type="date" value={printDateDebut} onChange={e => setPrintDateDebut(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-teal-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Date fin</label>
                      <input type="date" value={printDateFin} onChange={e => setPrintDateFin(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-teal-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Étape 2 — Catégories */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">Étape 2 — Catégories à inclure</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "🔵 Appro", state: printAppro, set: setPrintAppro },
                    { label: "🟣 Traçage", state: printTracage, set: setPrintTracage },
                    { label: "🟠 Protection", state: printProtection, set: setPrintProtection },
                    { label: "🟢 Livraison", state: printLivraison, set: setPrintLivraison },
                    { label: "🔷 Tâches", state: printTaches, set: setPrintTaches },
                    { label: "🟡 Facturation", state: printFacturation, set: setPrintFacturation },
                  ].map((f, i) => (
                    <button key={i} onClick={() => f.set(v => !v)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${f.state ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-400 border-slate-200"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bouton générer */}
              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setShowPrintModal(false)}
                  className="text-sm text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button onClick={handlePrint}
                  disabled={printPeriod === "custom" && (!printDateDebut || !printDateFin)}
                  className="text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <Download className="w-4 h-4" />
                  Générer et imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
            {/* En-têtes : colonne S. + 7 jours */}
            <div className="grid grid-cols-8 mb-1">
              <div className="text-center text-[10px] font-bold text-slate-300 uppercase py-1 font-mono">S.</div>
              {JOURS.map(j => (
                <div key={j} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{j}</div>
              ))}
            </div>

            {/* Lignes semaine par semaine */}
            {(() => {
              const rows: React.ReactNode[] = [];
              let day = 1;
              let rowIndex = 0;

              while (day <= daysInMonth) {
                const cells: React.ReactNode[] = [];
                const weekNum = getWeekNumber(currentYear, currentMonth, day);

                // Numéro de semaine
                cells.push(
                  <div key="week" className="h-20 flex items-start justify-center pt-1">
                    <span className="text-[10px] font-bold text-slate-300 font-mono">S{weekNum}</span>
                  </div>
                );

                // Cases vides au début de la première ligne
                if (rowIndex === 0 && startDow > 0) {
                  for (let e = 0; e < startDow; e++) {
                    cells.push(<div key={`empty-${e}`} className="h-20 rounded-lg bg-slate-50/30" />);
                  }
                }

                // Jours de cette semaine
                const startCol = rowIndex === 0 ? startDow : 0;
                for (let col = startCol; col < 7 && day <= daysInMonth; col++, day++) {
                  const dateStr = getDateStr(day);
                  const events = getEventsForDay(day);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDay;
                  const hasOverdue = events.some(e => e.overdue);
                  const d = day;

                  cells.push(
                    <div key={d}
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
                        {d}
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
                }

                // Cases vides à la fin de la dernière ligne
                if (day > daysInMonth) {
                  const filledCols = rowIndex === 0 ? (7 - startDow) : (day - 1 - (rowIndex === 0 ? 0 : startDow) - (rowIndex - 1) * 7) % 7;
                  const totalDaysThisRow = cells.length - 1; // -1 pour la colonne semaine
                  for (let e = totalDaysThisRow; e < 7; e++) {
                    cells.push(<div key={`end-${e}`} className="h-20 rounded-lg bg-slate-50/30" />);
                  }
                }

                rows.push(
                  <div key={`row-${rowIndex}`} className="grid grid-cols-8 gap-0.5 mb-0.5">
                    {cells}
                  </div>
                );
                rowIndex++;
              }

              return rows;
            })()}
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
