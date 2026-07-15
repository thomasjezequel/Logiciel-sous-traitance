import React, { useState, useMemo, useRef } from "react";
import { Project, Billing, Tache, Client, Subcontractor, Interlocuteur } from "../types";
import { ChevronLeft, ChevronRight, Calendar, Printer, X, Download } from "lucide-react";
import flowfabLogo from "../assets/images/flowfab_logo_1780546723025.png";

interface CalendarEvent {
  date: string; // YYYY-MM-DD
  label: string;
  type: "appro" | "tracage" | "protection" | "livraison" | "tache" | "facturation";
  projectName?: string;
  color: string;
  bgColor: string;
  overdue?: boolean;
  tacheId?: string;        // ID de la tâche pour retrouver description + interlocuteur
  interlocuteurId?: string; // ID de l'interlocuteur assigné
}

interface CalendarViewProps {
  projects: Project[];
  billings: Billing[];
  taches: Tache[];
  clients: Client[];
  subcontractors: Subcontractor[];
  interlocuteurs: Interlocuteur[];
}

const TYPE_CONFIG = {
  appro:       { label: "Appro matière",        color: "text-blue-800",   bgColor: "bg-blue-100",   border: "border-blue-300" },
  tracage:     { label: "Traçage / Lancement",   color: "text-purple-800", bgColor: "bg-purple-100", border: "border-purple-300" },
  protection:  { label: "Livraison Protection",  color: "text-orange-800", bgColor: "bg-orange-100", border: "border-orange-300" },
  livraison:   { label: "Livraison Chantier",    color: "text-teal-800",   bgColor: "bg-teal-100",   border: "border-teal-300" },
  tache:       { label: "Tâche",                 color: "text-indigo-800", bgColor: "bg-indigo-100", border: "border-indigo-300" },
  facturation: { label: "Facturation",           color: "text-amber-800",  bgColor: "bg-amber-100",  border: "border-amber-300" },
};

export default function CalendarView({ projects, billings, taches, clients, subcontractors, interlocuteurs }: CalendarViewProps) {
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

  // Génère et imprime le document
  const handlePrint = async () => {
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

    // Grouper par date
    const byDate: Record<string, CalendarEvent[]> = {};
    filteredEvts.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    const dateGen = `${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

    // Couleurs par type
    const getBg = (type: string) => ({ appro:"#dbeafe", tracage:"#f3e8ff", protection:"#ffedd5", livraison:"#ccfbf1", tache:"#e0e7ff", facturation:"#fef3c7" }[type] || "#f1f5f9");
    const getFg = (type: string) => ({ appro:"#1d4ed8", tracage:"#7e22ce", protection:"#c2410c", livraison:"#0f766e", tache:"#4338ca", facturation:"#b45309" }[type] || "#334155");
    const getTypeLabel = (type: string) => ({ appro:"Appro", tracage:"Traçage", protection:"Protection", livraison:"Livraison", tache:"Tâche", facturation:"Facturation" }[type] || type);

    // Logo FlowFab — converti en base64 via canvas pour l'impression
    const logoSvg = await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(`<img src="${canvas.toDataURL("image/png")}" style="width:40px;height:40px;object-fit:contain;" />`);
      };
      img.onerror = () => resolve(`<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="8" fill="#0d9488"/><text x="18" y="26" font-family="Arial" font-weight="bold" font-size="22" fill="white" text-anchor="middle">F</text></svg>`);
      img.src = flowfabLogo;
    });

    // En-tête commun aux deux pages
    const header = (title: string) => `
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0d9488;padding-bottom:10px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${logoSvg}
          <div>
            <div style="font-size:15px;font-weight:bold;color:#0f172a;">FlowFab</div>
            <div style="font-size:9px;color:#64748b;font-family:monospace;">Gestion Sous-Traitance</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:bold;color:#0f172a;">${title}</div>
          <div style="font-size:9px;color:#64748b;">${range.label}</div>
          <div style="font-size:8px;color:#94a3b8;margin-top:2px;">Édité le ${dateGen}</div>
        </div>
      </div>`;

    // Légende
    const legendeHtml = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        ${printAppro ? `<span style="font-size:9px;font-weight:bold;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:10px;">🔵 Appro matière</span>` : ""}
        ${printTracage ? `<span style="font-size:9px;font-weight:bold;background:#f3e8ff;color:#7e22ce;padding:2px 8px;border-radius:10px;">🟣 Traçage</span>` : ""}
        ${printProtection ? `<span style="font-size:9px;font-weight:bold;background:#ffedd5;color:#c2410c;padding:2px 8px;border-radius:10px;">🟠 Protection</span>` : ""}
        ${printLivraison ? `<span style="font-size:9px;font-weight:bold;background:#ccfbf1;color:#0f766e;padding:2px 8px;border-radius:10px;">🟢 Livraison</span>` : ""}
        ${printTaches ? `<span style="font-size:9px;font-weight:bold;background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:10px;">🔷 Tâches</span>` : ""}
        ${printFacturation ? `<span style="font-size:9px;font-weight:bold;background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:10px;">🟡 Facturation</span>` : ""}
      </div>`;

    // ── PAGE 1 : Calendrier grille ──────────────────────────────────────────
    let calHtml = "";
    if (printPeriod === "month") {
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const startDow2 = (firstDay.getDay() + 6) % 7;
      const daysInMonth2 = lastDay.getDate();
      const JOURS2 = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

      calHtml += `<table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:6%"/>
          ${JOURS2.map(() => `<col style="width:13.4%"/>`).join("")}
        </colgroup>
        <thead>
          <tr>
            <th style="background:#f1f5f9;font-size:8px;color:#94a3b8;padding:4px;text-align:center;font-family:monospace;">S.</th>
            ${JOURS2.map(j => `<th style="background:#f1f5f9;font-size:8px;font-weight:bold;color:#475569;padding:4px;text-align:center;">${j}</th>`).join("")}
          </tr>
        </thead>
        <tbody>`;

      let day2 = 1;
      let rowIdx = 0;
      while (day2 <= daysInMonth2) {
        const wn = getWeekNumber(currentYear, currentMonth, day2);
        calHtml += `<tr>
          <td style="background:#f8fafc;font-size:8px;color:#94a3b8;text-align:center;font-weight:bold;font-family:monospace;padding:3px;border:1px solid #f1f5f9;vertical-align:top;">S${wn}</td>`;
        const startCol = rowIdx === 0 ? startDow2 : 0;
        for (let e = 0; e < startCol; e++) {
          calHtml += `<td style="border:1px solid #f1f5f9;background:#fafafa;height:60px;"></td>`;
        }
        for (let col = startCol; col < 7 && day2 <= daysInMonth2; col++, day2++) {
          const ds = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day2).padStart(2,"0")}`;
          const evts = filteredEvts.filter(e => e.date === ds);
          const isToday2 = ds === today.toISOString().slice(0,10);
          calHtml += `<td style="border:1px solid #e2e8f0;height:60px;padding:3px;vertical-align:top;${isToday2 ? "background:#f0fdfa;" : ""}">
            <div style="font-size:9px;font-weight:bold;color:${isToday2 ? "#0f766e" : "#334155"};margin-bottom:2px;">${day2}</div>
            ${evts.slice(0,4).map(ev => `<div style="font-size:7px;font-weight:bold;background:${getBg(ev.type)};color:${getFg(ev.type)};padding:1px 3px;border-radius:3px;margin-bottom:1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${ev.label}</div>`).join("")}
            ${evts.length > 4 ? `<div style="font-size:7px;color:#94a3b8;">+${evts.length-4}</div>` : ""}
          </td>`;
        }
        // Cases vides fin de ligne
        if (day2 > daysInMonth2 && rowIdx > 0) {
          const filled = (daysInMonth2 - (rowIdx === 0 ? 0 : 0)) % 7 || 7;
          const remaining = (7 - filled) % 7;
          for (let e = 0; e < remaining; e++) {
            calHtml += `<td style="border:1px solid #f1f5f9;background:#fafafa;height:60px;"></td>`;
          }
        }
        calHtml += `</tr>`;
        rowIdx++;
      }
      calHtml += `</tbody></table>`;
    }

    // ── PAGE 2 : Liste détaillée ──────────────────────────────────────────
    let listHtml = "";
    if (Object.keys(byDate).length === 0) {
      listHtml = `<p style="color:#94a3b8;font-style:italic;font-size:10px;">Aucun événement sur cette période.</p>`;
    } else {
      Object.keys(byDate).sort().forEach(date => {
        const d = new Date(date + "T12:00:00");
        const wn = getWeekNumber(d.getFullYear(), d.getMonth(), d.getDate());
        const dateLabel = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        listHtml += `
          <div style="margin-bottom:12px;page-break-inside:avoid;">
            <div style="font-size:10px;font-weight:bold;color:#0f172a;background:#f8fafc;border-left:3px solid #0d9488;padding:4px 8px;margin-bottom:6px;font-family:monospace;">
              ${dateLabel} &nbsp;—&nbsp; S${wn}
            </div>`;
        byDate[date].forEach(ev => {
          // Trouver le projet lié pour récupérer client et sous-traitant
          const projLie = projects.find(p => `${p.nomAffaire} — ${p.nomZone}` === ev.projectName);
          const clientNom = clients.find(c => c.id === projLie?.clientId)?.nom || "";
          const subNom = subcontractors.find(s => s.id === projLie?.sousTraitantId)?.nom || "";

          // Pour les tâches : récupérer description et interlocuteur via les IDs stockés dans l'événement
          let descriptionTache = "";
          let interlocuteurNom = "";
          if (ev.type === "tache") {
            const tache = ev.tacheId ? taches.find(t => t.id === ev.tacheId) : undefined;
            if (tache) {
              descriptionTache = (tache as any).description || "";
            }
            if (ev.interlocuteurId) {
              const inter = interlocuteurs.find(i => i.id === ev.interlocuteurId);
              interlocuteurNom = inter ? `${inter.prenom} ${inter.nom}` : "";
            }
          }

          listHtml += `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:5px 8px;background:${getBg(ev.type)}30;border-radius:5px;margin-bottom:4px;">
              <span style="font-size:8px;font-weight:bold;background:${getBg(ev.type)};color:${getFg(ev.type)};padding:2px 7px;border-radius:10px;white-space:nowrap;margin-top:1px;">${getTypeLabel(ev.type)}</span>
              <div style="flex:1;">
                <div style="font-size:10px;font-weight:bold;color:#0f172a;">${ev.label}</div>
                ${ev.projectName ? `<div style="font-size:9px;color:#475569;margin-top:1px;">📁 ${ev.projectName}</div>` : ""}
                <div style="display:flex;gap:16px;margin-top:2px;">
                  ${clientNom ? `<div style="font-size:8px;color:#64748b;">👤 Client : <strong>${clientNom}</strong></div>` : ""}
                  ${subNom ? `<div style="font-size:8px;color:#64748b;">🏭 Sous-traitant : <strong>${subNom}</strong></div>` : ""}
                </div>
                ${interlocuteurNom ? `<div style="font-size:8px;color:#4338ca;margin-top:2px;">👤 Assigné à : <strong>${interlocuteurNom}</strong></div>` : ""}
                ${descriptionTache ? `<div style="font-size:8px;color:#64748b;margin-top:2px;font-style:italic;">ℹ️ ${descriptionTache}</div>` : ""}
              </div>
            </div>`;
        });
        listHtml += `</div>`;
      });
    }

    // ── Construction HTML final ─────────────────────────────────────────────
    // Mois : grille + liste sur la même page
    // Semaine / Personnalisé : liste uniquement sur une seule page

    let contenuHtml = "";
    if (printPeriod === "month") {
      contenuHtml = `
        <div>
          ${header("📅 Calendrier — Détail du mois")}
          ${legendeHtml}
          ${calHtml}
          <div style="margin-top:20px;border-top:2px solid #e2e8f0;padding-top:16px;">
            <div style="font-size:12px;font-weight:bold;color:#0f172a;margin-bottom:10px;font-family:monospace;">
              📋 Détail chronologique
            </div>
            ${listHtml}
          </div>
        </div>`;
    } else {
      const titreList = printPeriod === "week" ? "📋 Détail — Semaine en cours" : "📋 Détail chronologique";
      contenuHtml = `
        <div>
          ${header(titreList)}
          ${legendeHtml}
          ${listHtml}
        </div>`;
    }

    const html = `
      <html><head><meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 0; }
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style></head><body>
      ${contenuHtml}
      </body></html>`;

    // Injection DOM + impression
    const tempContainer = document.createElement("div");
    tempContainer.id = "print-temp-calendar";
    tempContainer.innerHTML = html;
    document.body.appendChild(tempContainer);

    const style = document.createElement("style");
    style.id = "print-temporary-style-calendar";
    style.innerHTML = `
      @page { size: A4 portrait; margin: 15mm; }
      @media print {
        body > * { display: none !important; }
        body > #print-temp-calendar { display: block !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
          type: "tache",
          projectName: proj ? `${proj.nomAffaire} — ${proj.nomZone}` : "",
          overdue: t.dateEcheance < todayStr,
          tacheId: t.id,
          interlocuteurId: t.interlocuteurId,
          ...TYPE_CONFIG.tache,
          label: t.libelle, // après le spread pour ne pas être écrasé par TYPE_CONFIG.tache
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
