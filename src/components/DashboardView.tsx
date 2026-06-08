import { useState } from "react";
import { Project, ProjectStatus, Budget, Realise, Billing, BillingStatus, Subcontractor, Client } from "../types";
import { 
  Hammer, 
  Scale, 
  Calendar,
  Users,
  CheckCircle2, 
  Hourglass, 
  Wallet, 
  Building,
  Activity,
  RotateCcw
} from "lucide-react";

interface DashboardViewProps {
  projects: Project[];
  budgets: Budget[];
  realises: Realise[];
  billings: Billing[];
  subcontractors: Subcontractor[];
  clients: Client[];
}

export default function DashboardView({ projects, budgets, realises, billings, subcontractors, clients }: DashboardViewProps) {
  // Filtres Globaux
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>("");
  const [dateFin, setDateFin] = useState<string>("");

  const handleQuickPeriod = (type: "J" | "S" | "M" | "T" | "Se" | "A" | "X") => {
    if (type === "X") {
      setDateDebut("");
      setDateFin("");
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    let start = "";
    let end = "";

    const format = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    if (type === "J") {
      start = format(now);
      end = format(now);
    } else if (type === "S") {
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + distanceToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = format(monday);
      end = format(sunday);
    } else if (type === "M") {
      const firstDay = new Date(year, now.getMonth(), 1);
      const lastDay = new Date(year, now.getMonth() + 1, 0);
      start = format(firstDay);
      end = format(lastDay);
    } else if (type === "T") {
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const firstDay = new Date(year, quarterStartMonth, 1);
      const lastDay = new Date(year, quarterStartMonth + 3, 0);
      start = format(firstDay);
      end = format(lastDay);
    } else if (type === "Se") {
      const currentMonth = now.getMonth();
      const semesterStartMonth = currentMonth < 6 ? 0 : 6;
      const firstDay = new Date(year, semesterStartMonth, 1);
      const lastDay = new Date(year, semesterStartMonth + 6, 0);
      start = format(firstDay);
      end = format(lastDay);
    } else if (type === "A") {
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      start = format(firstDay);
      end = format(lastDay);
    }

    setDateDebut(start);
    setDateFin(end);
  };

  // Filtrage des données primaires
  const filteredProjects = projects.filter(p => {
    // Filtre Sous-traitant
    if (selectedSub && p.sousTraitantId !== selectedSub) {
      return false;
    }
    // Filtre Période (Date de commande)
    const pDate = p.dateCommande || p.delaiLivraisonChantier || "";
    if (dateDebut && pDate < dateDebut) {
      return false;
    }
    if (dateFin && pDate > dateFin) {
      return false;
    }
    return true;
  });

  const filteredBudgets = budgets.filter(b => 
    filteredProjects.some(p => p.id === b.projetId)
  );

  const filteredRealises = realises.filter(r => 
    filteredProjects.some(p => p.id === r.projetId)
  );

  const filteredBillings = billings.filter(b => 
    filteredProjects.some(p => p.id === b.projetId || b.projetIds?.some(pid => filteredProjects.some(fp => fp.id === pid)))
  );

  // --- Calculs Métriques ---
  const totalProjects = filteredProjects.length;
  const totalWeightKg = filteredProjects.reduce((acc, p) => acc + (p.poidsTotal || 0), 0);
  const totalPoidsPRS = filteredProjects.reduce((acc, p) => acc + (p.poidsPRS || 0), 0);
  const totalPoidsPDC = filteredProjects.reduce((acc, p) => acc + (p.poidsPDC || 0), 0);
  const totalFabricatedKg = filteredRealises.reduce((acc, r) => acc + (r.poidsFabrique || 0), 0);

  // Linéaire de PRS fabriqué (ml)
  const totalMlOrdered = filteredProjects.reduce((acc, p) => acc + (p.quantiteMl || 0), 0);
  const totalMlFabricated = filteredProjects.reduce((acc, p) => {
    const r = filteredRealises.find(real => real.projetId === p.id);
    if (!r || !p.quantiteMl) return acc;
    const ratio = p.poidsTotal > 0 ? (r.poidsFabrique || 0) / p.poidsTotal : 0;
    return acc + (p.quantiteMl * Math.min(1, ratio));
  }, 0);

  // Avancement Global
  const fabricationWeightProgression = totalWeightKg > 0 ? (totalFabricatedKg / totalWeightKg) * 100 : 0;

  // Facturations Établies
  const totalBilledPaid = filteredBillings
    .filter(b => b.etatFacturation === BillingStatus.PAYEE)
    .reduce((acc, b) => acc + (b.quantiteFacturee * b.prixUnitaire), 0);

  const totalBilledSent = filteredBillings
    .filter(b => b.etatFacturation === BillingStatus.ENVOYEE)
    .reduce((acc, b) => acc + (b.quantiteFacturee * b.prixUnitaire), 0);

  const totalBilledDraft = filteredBillings
    .filter(b => b.etatFacturation === BillingStatus.BROUILLON)
    .reduce((acc, b) => acc + (b.quantiteFacturee * b.prixUnitaire), 0);

  const totalInvoicedValue = filteredBillings.reduce((acc, b) => acc + (b.quantiteFacturee * b.prixUnitaire), 0);

  // Allocation par sous-traitant
  const subAllocation = subcontractors
    .filter(s => !selectedSub || s.id === selectedSub)
    .map(s => {
      const subProjects = filteredProjects.filter(p => p.sousTraitantId === s.id);
      const subWeight = subProjects.reduce((acc, p) => acc + (p.poidsTotal || 0), 0);
      const subBilling = filteredBillings
        .filter(b => {
          const p = filteredProjects.find(proj => proj.id === b.projetId);
          return p && p.sousTraitantId === s.id;
        })
        .reduce((acc, b) => acc + (b.quantiteFacturee * b.prixUnitaire), 0);

      return {
        subId: s.id,
        name: s.nom,
        projectsCount: subProjects.length,
        allocatedWeight: subWeight,
        currentInvoiced: subBilling
      };
    })
    .sort((a, b) => b.allocatedWeight - a.allocatedWeight);

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setSelectedSub("");
    setDateDebut("");
    setDateFin("");
  };

  return (
    <div className="space-y-6">
      
      {/* Barre de Filtres Globaux */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Sous-traitant */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Filtre Partenaire</span>
            <div className="relative">
              <select
                value={selectedSub}
                onChange={e => setSelectedSub(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-8 py-2 font-semibold text-slate-700 focus:outline-teal-500 appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="">Tous les sous-traitants</option>
                {subcontractors.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.nom}</option>
                ))}
              </select>
              <Users className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Date de début */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Date de Début</span>
            <div className="relative">
              <input
                type="date"
                value={dateDebut}
                onChange={e => setDateDebut(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-3 py-2 font-mono text-slate-700 focus:outline-teal-500 cursor-pointer"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Date de fin */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Date de Fin</span>
            <div className="relative">
              <input
                type="date"
                value={dateFin}
                onChange={e => setDateFin(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-3 py-2 font-mono text-slate-700 focus:outline-teal-500 cursor-pointer"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Raccourcis de période */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Période Rapide</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 h-[38px] shadow-3xs">
              {[
                { label: "J", title: "Aujourd'hui (Jour)", val: "J" },
                { label: "S", title: "Cette semaine (Semaine)", val: "S" },
                { label: "M", title: "Ce mois (Mois)", val: "M" },
                { label: "T", title: "Ce trimestre (Trimestre)", val: "T" },
                { label: "Se", title: "Ce semestre (Semestre)", val: "Se" },
                { label: "A", title: "Cette année (Année)", val: "A" },
                { label: "X", title: "Effacer la période", val: "X" }
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => handleQuickPeriod(btn.val as any)}
                  title={btn.title}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md shadow-3xs hover:scale-105 active:scale-95 transition-all cursor-pointer border ${
                    btn.val === "X"
                      ? "bg-white hover:bg-red-50 text-red-600 border-slate-200 hover:text-red-800 hover:border-red-300"
                      : "bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-700 border-slate-200 hover:border-teal-300"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bouton Réinitialiser */}
        {(selectedSub || dateDebut || dateFin) && (
          <button
            onClick={handleResetFilters}
            className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* KPI Cards (Uniquement Tonnage Total & Tonnage Fabriqué) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Écart 1: Tonnage Total */}
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

        {/* Écart 2: Tonnage Fabriqué */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-start mb-3">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">TONNAGE FABRIQUÉ</span>
              <span className="text-3xl font-black text-slate-900 block">
                {(totalFabricatedKg / 1000).toFixed(1)} <span className="text-sm font-semibold text-gray-400">tonnes</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Hammer className="w-6 h-6" />
            </div>
          </div>
          
          {/* Progress Bar & Avancement Global */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
            <div className="flex justify-between text-[11px] text-gray-500">
              <span className="font-semibold">Avancement Global de Fabrication :</span>
              <span className="font-black text-indigo-700">{fabricationWeightProgression.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(fabricationWeightProgression, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* Two columns: Suivi des ateliers & Relances de Trésorerie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Encart 1: Affaires en cours de fabrication (non facturées) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest block font-mono">SUIVI DES ATELIERS</span>
            <h3 className="text-base font-bold text-slate-900">Affaires & Zones en Cours de Fabrication <span className="text-sm font-normal text-slate-400">(Non facturées)</span></h3>
            <p className="text-xs text-slate-400">Liste des chantiers actuellement en cours de production</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {(() => {
              const billedPaidProjectIds = new Set(
                filteredBillings
                  .filter(b => b.etatFacturation === BillingStatus.PAYEE)
                  .flatMap(b => [b.projetId, ...(b.projetIds || [])])
              );
              
              const ongoingUnbilledProjects = filteredProjects.filter(
                p => p.status === ProjectStatus.EN_COURS && !billedPaidProjectIds.has(p.id)
              );

              if (ongoingUnbilledProjects.length === 0) {
                return <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-lg">Aucune affaire en cours de fabrication.</p>;
              }

              return ongoingUnbilledProjects.map(proj => {
                const client = clients.find(c => c.id === proj.clientId);
                const sub = subcontractors.find(s => s.id === proj.sousTraitantId);
                return (
                  <div key={proj.id} className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-lg text-xs space-y-1 hover:bg-indigo-50/70 transition">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-slate-900 uppercase">{proj.nomAffaire} - {proj.nomZone}</span>
                      <span className="font-mono bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">En fabrication</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-slate-500">
                      <div>
                        <span className="font-bold text-slate-700">Client:</span> {client ? client.nom : "Inconnu"}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Sous-traitant:</span> {sub ? sub.nom : "Inconnu"}
                      </div>
                      <div className="col-span-2 text-slate-400 flex justify-between">
                        <span>Poids: <strong className="text-slate-700">{proj.poidsTotal.toLocaleString("fr-FR")} kg</strong> {proj.poidsPRS ? `(PRS: ${proj.poidsPRS} kg)` : ""}</span>
                        <span>Livraison: <strong className="text-slate-700">{proj.delaiLivraisonChantier ? new Date(proj.delaiLivraisonChantier).toLocaleDateString("fr-FR") : "-"}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Encart 2: Affaires facturées mais non payées */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-widest block font-mono">RELANCES DE TRÉSORERIE</span>
            <h3 className="text-base font-bold text-slate-900">Affaires Facturées <span className="text-sm font-normal text-slate-400">(Non payées)</span></h3>
            <p className="text-xs text-slate-400">Encours de factures envoyées ou brouillons en attente de paiement</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {(() => {
              const billedButUnpaidBillingsList = filteredBillings.filter(
                b => b.etatFacturation === BillingStatus.ENVOYEE || b.etatFacturation === BillingStatus.BROUILLON
              );

              if (billedButUnpaidBillingsList.length === 0) {
                return <p className="text-xs text-slate-400 italic py-6 text-center bg-slate-50 rounded-lg">Aucun encours de facture non payée.</p>;
              }

              return billedButUnpaidBillingsList.map(bill => {
                const primaryProj = filteredProjects.find(p => p.id === bill.projetId);
                const client = clients.find(c => c.id === primaryProj?.clientId);
                
                const otherProjNames = (bill.projetIds || [])
                  .map(pid => filteredProjects.find(p => p.id === pid))
                  .filter(Boolean)
                  .map(p => p!.nomZone);
                
                const allZones = [primaryProj?.nomZone, ...otherProjNames].filter(Boolean).join(", ");
                
                return (
                  <div key={bill.id} className="p-3 bg-amber-50/35 border border-amber-200 rounded-lg text-xs space-y-1 hover:bg-amber-50/60 transition bg-amber-50/20">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-slate-950 uppercase">{primaryProj?.nomAffaire || "Affaire"} ({allZones})</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold ${bill.etatFacturation === BillingStatus.ENVOYEE ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                        {bill.etatFacturation === BillingStatus.ENVOYEE ? "Facture Envoyée" : "Brouillon"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-slate-500">
                      <div>
                        <span className="font-bold text-slate-700">Client:</span> {client ? client.nom : "Inconnu"}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Facture reçue ?</span> <span className="font-semibold text-slate-800">{bill.factureRecue ? "Oui, validée ✅" : "Non reçue ❌"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Échéance:</span> {bill.dateEcheance ? new Date(bill.dateEcheance).toLocaleDateString("fr-FR") : "Non spécifié"}
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900 text-sm">{(bill.quantiteFacturee * bill.prixUnitaire).toLocaleString("fr-FR")} €</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>

      {/* Row 3: Facturations Établies & Répartition Industrielle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Liquidités & Trésorerie (Facturations Établies) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block font-mono">LIQUIDITÉS & TRÉSORERIE</span>
            <h3 className="text-base font-bold text-slate-900">Facturations Établies</h3>
            <p className="text-xs text-gray-400 mt-1">Cumul partiel de la base de facturées</p>
          </div>

          <div className="pt-2 divide-y divide-slate-100 space-y-3">
            
            {/* Paid */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-slate-800">Factures Payées</span>
                  <span className="text-[10px] text-gray-400">Encaissées sur compte</span>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900">{totalBilledPaid.toLocaleString("fr-FR")} €</span>
            </div>

            {/* Sent */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Hourglass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-slate-800">Factures Envoyées</span>
                  <span className="text-[10px] text-gray-400">Échéances en cours</span>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900">{totalBilledSent.toLocaleString("fr-FR")} €</span>
            </div>

            {/* Draft */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-slate-800">Brouillons / Ébauches</span>
                  <span className="text-[10px] text-gray-400">Factures non soumises</span>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900">{totalBilledDraft.toLocaleString("fr-FR")} €</span>
            </div>

          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-850 flex justify-between items-center text-xs font-bold pt-3 mt-4">
            <span>Total Factures Établies :</span>
            <span className="text-teal-700">{totalInvoicedValue.toLocaleString("fr-FR")} €</span>
          </div>
        </div>

        {/* Column 2 & 3: Répartition Industrielle */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block font-mono">RÉPARTITION INDUSTRIELLE</span>
            <h3 className="text-base font-bold text-slate-900">Capacité et Tonnage par Partenaire Sous-Traitant</h3>
            <p className="text-xs text-gray-400 mt-1">Équilibrage des charges de fabrication pour éviter la saturation d'atelier</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {subAllocation.map(sa => {
              const fraction = totalWeightKg > 0 ? (sa.allocatedWeight / totalWeightKg) * 100 : 0;
              return (
                <div key={sa.subId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <Building className="w-3.5 h-3.5 text-teal-600" />
                      {sa.name}
                    </h4>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Affaires :</span>
                        <span className="font-bold text-slate-800">{sa.projectsCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Tonnage :</span>
                        <span className="font-black text-slate-900">{(sa.allocatedWeight / 1000).toFixed(1)} t</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                      <span>Part d'enveloppe tonnage :</span>
                      <span className="font-semibold">{fraction.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-600 rounded-full" 
                        style={{ width: `${fraction}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
