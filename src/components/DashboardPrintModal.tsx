import React, { useRef } from "react";
import { Project, ProjectStatus, Budget, Realise, Billing, BillingStatus, Subcontractor, Client } from "../types";
import { X, Printer, Calendar, Users, Building, Scale, Hammer, FileText, CheckCircle2 } from "lucide-react";
import flowfabLogo from "../assets/images/flowfab_logo_1780546723025.png";

interface DashboardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  budgets: Budget[];
  realises: Realise[];
  billings: Billing[];
  subcontractors: Subcontractor[];
  clients: Client[];
  selectedClientId: string;
  selectedSubId: string;
  dateDebut: string;
  dateFin: string;
}

export default function DashboardPrintModal({
  isOpen,
  onClose,
  projects,
  budgets,
  realises,
  billings,
  subcontractors,
  clients,
  selectedClientId,
  selectedSubId,
  dateDebut,
  dateFin
}: DashboardPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // 1. Filtrage strict identique au tableau de bord
  const filteredProjects = projects.filter(p => {
    if (selectedClientId && p.clientId !== selectedClientId) return false;
    if (selectedSubId && p.sousTraitantId !== selectedSubId) return false;
    const pDate = p.dateCommande || p.delaiLivraisonChantier || "";
    if (dateDebut && pDate < dateDebut) return false;
    if (dateFin && pDate > dateFin) return false;
    return true;
  });

  const filteredRealises = realises.filter(r =>
    filteredProjects.some(p => p.id === r.projetId)
  );

  const filteredBillings = billings.filter(b =>
    filteredProjects.some(p => p.id === b.projetId || b.projetIds?.some(pid => filteredProjects.some(fp => fp.id === pid)))
  );

  // 2. Métriques
  const totalWeightKg = filteredProjects.reduce((acc, p) => acc + (p.poidsTotal || 0), 0);
  const totalFabricatedKg = filteredRealises.reduce((acc, r) => acc + (r.poidsFabrique || 0), 0);
  const fabricationWeightProgression = totalWeightKg > 0 ? (totalFabricatedKg / totalWeightKg) * 100 : 0;

  // Labels des filtres actifs
  const activeClientLabel = selectedClientId ? clients.find(c => c.id === selectedClientId)?.nom : "Tous les clients";
  const activeSubLabel = selectedSubId ? subcontractors.find(s => s.id === selectedSubId)?.nom : "Tous les sous-traitants";
  const activePeriodLabel = dateDebut || dateFin
    ? `Du ${dateDebut ? new Date(dateDebut).toLocaleDateString("fr-FR") : "Début"} au ${dateFin ? new Date(dateFin).toLocaleDateString("fr-FR") : "Fin"}`
    : "Toutes périodes";

  // Déclencheur d'impression
  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (printContent) {
      const tempContainer = document.createElement("div");
      tempContainer.id = "print-temp-container";
      tempContainer.className = "bg-white text-slate-900 p-8";
      tempContainer.innerHTML = printContent;
      document.body.appendChild(tempContainer);

      const style = document.createElement("style");
      style.id = "print-temporary-style";
      style.innerHTML = `
        @media print {
          body > * {
            display: none !important;
          }
          body > #print-temp-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            padding: 15px !important;
            margin: 0 !important;
          }
          .no-print, .print\\:hidden, button {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
          }
          th {
            background-color: #f1f5f9 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(style);

      window.print();

      setTimeout(() => {
        tempContainer.remove();
        style.remove();
      }, 1000);
    }
  };

  // Listes des 3 sections
  const billedPaidProjectIds = new Set(
    filteredBillings
      .filter(b => b.etatFacturation === BillingStatus.PAYEE)
      .flatMap(b => [b.projetId, ...(b.projetIds || [])])
  );

  const invoicedProjectIds = new Set(
    filteredBillings
      .filter(b => b.etatFacturation === BillingStatus.ENVOYEE || b.etatFacturation === BillingStatus.PAYEE)
      .flatMap(b => [b.projetId, ...(b.projetIds || [])])
  );

  const ongoingProjects = filteredProjects.filter(
    p => p.status === ProjectStatus.EN_COURS && !billedPaidProjectIds.has(p.id)
  );

  const finishedUninvoicedProjects = filteredProjects.filter(
    p => p.status === ProjectStatus.TERMINEE && !invoicedProjectIds.has(p.id)
  );

  const pendingBillingsList = filteredBillings.filter(
    b => b.etatFacturation === BillingStatus.ENVOYEE || b.etatFacturation === BillingStatus.BROUILLON
  );

  const totalPendingAmount = pendingBillingsList.reduce(
    (acc, b) => acc + (b.quantiteFacturee || 0) * (b.prixUnitaire || 0),
    0
  );

  // ─── Tri alphabétique (A→Z) des affaires sur les 3 sections ───
  const ongoingProjectsSorted = [...ongoingProjects].sort((a, b) =>
    a.nomAffaire.localeCompare(b.nomAffaire, "fr", { sensitivity: "base" })
  );

  const finishedUninvoicedProjectsSorted = [...finishedUninvoicedProjects].sort((a, b) =>
    a.nomAffaire.localeCompare(b.nomAffaire, "fr", { sensitivity: "base" })
  );

  const pendingBillingsListSorted = [...pendingBillingsList].sort((a, b) => {
    const projA = projects.find(p => p.id === a.projetId);
    const projB = projects.find(p => p.id === b.projetId);
    return (projA?.nomAffaire || "").localeCompare(projB?.nomAffaire || "", "fr", { sensitivity: "base" });
  });

  const ongoingTotal = ongoingProjects.reduce((acc, p) => acc + (p.poidsTotal || 0), 0);
  const finishedTotal = finishedUninvoicedProjects.reduce((acc, p) => acc + (p.poidsTotal || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none print:z-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:shadow-none print:border-none print:rounded-none print:max-h-full print:w-full">

        {/* Barre d'actions */}
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-slate-800">
            <Printer className="w-5 h-5 text-teal-600" />
            <span className="font-extrabold text-sm font-mono tracking-wide uppercase">FICHE SYNTHÈSE D'ACTIVITÉ - IMPRESSION</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              type="button"
              className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer la fiche
            </button>
            <button
              onClick={onClose}
              type="button"
              className="bg-white hover:bg-slate-150 text-slate-700 font-bold px-3 py-2 border border-slate-250 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              Fermer
            </button>
          </div>
        </div>

        {/* Zone imprimable */}
        <div ref={printAreaRef} className="p-8 overflow-y-auto flex-1 bg-white space-y-6">

          {/* Entête du Document */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div className="flex gap-4 items-center">
              <img
                src={flowfabLogo}
                alt="Logo FlowFab"
                className="object-contain"
                style={{ width: "113px", height: "113px" }}
              />
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Synthèse et Indicateurs d'Activité</h1>
                <p className="text-slate-500 text-xs font-medium font-sans">Reporting synthétique d'ateliers et de facturation</p>
              </div>
            </div>
            <div className="text-right text-xs space-y-1 font-mono text-slate-600">
              <p><b>Date d'édition :</b> {new Date().toLocaleDateString("fr-FR")}</p>
            </div>
          </div>

          {/* Cartouche des Filtres Actifs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 font-bold block uppercase font-mono mb-1">Filtre Client</span>
              <span className="font-extrabold text-slate-800">{activeClientLabel}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block uppercase font-mono mb-1">Filtre Partenaire</span>
              <span className="font-extrabold text-slate-800">{activeSubLabel}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block uppercase font-mono mb-1">Période d'Analyse</span>
              <span className="font-extrabold text-slate-800">{activePeriodLabel}</span>
            </div>
          </div>

          {/* Synthèse globale en Tonnage */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[9px] text-gray-400 font-bold block uppercase font-mono">Tonnage Initial Affaires</span>
              <span className="text-base font-black text-slate-900 mt-1">{(totalWeightKg / 1000).toFixed(1)} tonnes</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[9px] text-gray-400 font-bold block uppercase font-mono">Tonnage Réalisé en Atelier</span>
              <span className="text-base font-black text-indigo-900 mt-1">{(totalFabricatedKg / 1000).toFixed(1)} tonnes</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[9px] text-gray-400 font-bold block uppercase font-mono">Progression Globale de Coupe</span>
              <span className="text-base font-black text-teal-800 mt-1">{fabricationWeightProgression.toFixed(1)} %</span>
            </div>
          </div>

          {/* ─── Section 1 : Affaires en cours de fabrication (triées A→Z) ─── */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest block font-mono border-b border-indigo-100 pb-1">
              📦 1. Affaires & Zones en Cours de Fabrication ({ongoingProjectsSorted.length})
            </h3>
            {ongoingProjectsSorted.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Aucun chantier en cours de fabrication trouvé pour ces critères.</p>
            ) : (
              <>
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700">
                      <th className="px-2.5 py-1.5 border border-slate-200">Affaire / Zone</th>
                      <th className="px-2.5 py-1.5 border border-slate-200">Client</th>
                      <th className="px-2.5 py-1.5 border border-slate-200">Sous-traitant</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 text-right">Poids (kg)</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 text-right">Délai Livraison</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ongoingProjectsSorted.map(p => {
                      const client = clients.find(c => c.id === p.clientId);
                      const sub = subcontractors.find(s => s.id === p.sousTraitantId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-2.5 py-1.5 border border-slate-200 font-bold uppercase">{p.nomAffaire} - {p.nomZone}</td>
                          <td className="px-2.5 py-1.5 border border-slate-200">{client ? client.nom : "-"}</td>
                          <td className="px-2.5 py-1.5 border border-slate-200">{sub ? sub.nom : "-"}</td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-right font-mono">
                            <span className="font-bold block text-slate-900">{p.poidsTotal.toLocaleString("fr-FR")} kg</span>
                            {(p.poidsPDC !== undefined || p.poidsPRS !== undefined) && (
                              <span className="text-[9px] text-gray-500 font-normal block font-sans">
                                PDC: {p.poidsPDC?.toLocaleString("fr-FR") || 0} / PRS: {p.poidsPRS?.toLocaleString("fr-FR") || 0}
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-right font-mono">
                            {p.delaiLivraisonChantier ? new Date(p.delaiLivraisonChantier).toLocaleDateString("fr-FR") : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-between items-center px-2.5 py-2 bg-indigo-50 border border-indigo-200 rounded-b-md">
                  <span className="text-[10px] font-black uppercase text-indigo-800 font-mono">
                    Sous-total — Poids en cours de fabrication :
                  </span>
                  <span className="text-[11px] font-black font-mono text-indigo-900 bg-indigo-100 px-3 py-0.5 rounded">
                    {ongoingTotal.toLocaleString("fr-FR")} kg
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ─── Section 2 : Terminés non facturés (triées A→Z) ─── */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest block font-mono border-b border-rose-100 pb-1">
              🏆 2. Affaires "Terminé de Fabriquer" Non Facturées ({finishedUninvoicedProjectsSorted.length})
            </h3>
            {finishedUninvoicedProjectsSorted.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Aucune affaire terminée non facturée à reporter.</p>
            ) : (
              <>
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700">
                      <th className="px-2.5 py-1.5 border border-slate-200">Affaire / Zone</th>
                      <th className="px-2.5 py-1.5 border border-slate-200">Client</th>
                      <th className="px-2.5 py-1.5 border border-slate-200">Sous-traitant</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 text-right">Poids (kg)</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 text-right">Terminé Le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {finishedUninvoicedProjectsSorted.map(p => {
                      const client = clients.find(c => c.id === p.clientId);
                      const sub = subcontractors.find(s => s.id === p.sousTraitantId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-2.5 py-1.5 border border-slate-200 font-bold uppercase text-rose-900">{p.nomAffaire} - {p.nomZone}</td>
                          <td className="px-2.5 py-1.5 border border-slate-200">{client ? client.nom : "-"}</td>
                          <td className="px-2.5 py-1.5 border border-slate-200">{sub ? sub.nom : "-"}</td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-right font-mono">
                            <span className="font-bold block text-slate-800">{p.poidsTotal.toLocaleString("fr-FR")} kg</span>
                            {(p.poidsPDC !== undefined || p.poidsPRS !== undefined) && (
                              <span className="text-[9px] text-gray-500 font-normal block font-sans">
                                PDC: {p.poidsPDC?.toLocaleString("fr-FR") || 0} / PRS: {p.poidsPRS?.toLocaleString("fr-FR") || 0}
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-right font-mono">
                            {p.delaiLivraisonChantier ? new Date(p.delaiLivraisonChantier).toLocaleDateString("fr-FR") : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-between items-center px-2.5 py-2 bg-rose-50 border border-rose-200 rounded-b-md">
                  <span className="text-[10px] font-black uppercase text-rose-800 font-mono">
                    Sous-total — Poids fabriqués réalisés :
                  </span>
                  <span className="text-[11px] font-black font-mono text-rose-900 bg-rose-100 px-3 py-0.5 rounded">
                    {finishedTotal.toLocaleString("fr-FR")} kg
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ─── Section 3 : Encours de facturation (triées A→Z) ─── */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest block font-mono border-b border-amber-100 pb-1">
              💰 3. Créances & Encours de Facturation (Non payées) ({pendingBillingsListSorted.length}) — Total global : {totalPendingAmount.toLocaleString("fr-FR")} €
            </h3>
            {pendingBillingsListSorted.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Aucun encours de facturation détecté.</p>
            ) : (
              <>
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700">
                      <th className="px-2.5 py-1.5 border border-slate-200">Affaire / Zones d'application</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 font-mono">Type de Prestation</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 text-right">Etat</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 text-right">Date Échéance</th>
                      <th className="px-2.5 py-1.5 border border-slate-200 text-right">Montant H.T.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingBillingsListSorted.map(b => {
                      const primaryProj = projects.find(p => p.id === b.projetId);
                      const otherProjNames = (b.projetIds || [])
                        .map(pid => projects.find(p => p.id === pid))
                        .filter(Boolean)
                        .map(p => p!.nomZone);
                      const allZones = [primaryProj?.nomZone, ...otherProjNames].filter(Boolean).join(", ");
                      const amount = (b.quantiteFacturee || 0) * (b.prixUnitaire || 0);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-2.5 py-1.5 border border-slate-200 font-semibold uppercase">
                            {primaryProj?.nomAffaire || "Affaire"} ({allZones || `Id: ${b.projetId}`})
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 font-medium text-slate-500">{b.typePrestation}</td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-right">
                            <span className={`px-1 rounded-sm text-[9px] font-bold ${b.etatFacturation === BillingStatus.ENVOYEE ? "bg-amber-100 text-amber-800" : "bg-slate-150 text-slate-800"}`}>
                              {b.etatFacturation === BillingStatus.ENVOYEE ? "ENVOYÉE" : "BROUILLON"}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-right font-mono">
                            {b.dateEcheance ? new Date(b.dateEcheance).toLocaleDateString("fr-FR") : "-"}
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-right font-mono font-bold text-slate-900">
                            {amount.toLocaleString("fr-FR")} €
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex justify-between items-center px-2.5 py-2 bg-amber-50 border border-amber-200 rounded-b-md">
                  <span className="text-[10px] font-black uppercase text-amber-800 font-mono">
                    Total Global des Encours de Facturation :
                  </span>
                  <span className="text-[11px] font-black font-mono text-amber-900 bg-amber-100 px-3 py-0.5 rounded">
                    {totalPendingAmount.toLocaleString("fr-FR")} €
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Notice technique légale */}
          <div className="border-t border-slate-300 pt-3 text-[9px] text-gray-400 text-center font-mono">
            Document généré automatiquement à des fins de planification décisionnelle. Ne pas divulguer.
          </div>

        </div>
      </div>
    </div>
  );
}
