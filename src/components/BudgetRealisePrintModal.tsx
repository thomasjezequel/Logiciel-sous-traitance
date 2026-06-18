import React, { useRef } from "react";
import { Project, Budget, Realise, Client, Subcontractor } from "../types";
import { X, Printer, FileText, CheckCircle2, AlertTriangle, Coins, TrendingUp, Scale } from "lucide-react";
import flowfabLogo from "../assets/images/flowfab_logo_1780546723025.png";

interface BudgetRealisePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  budget: Budget;
  realise: Realise;
  client: Client | undefined;
  subcontractor: Subcontractor | undefined;
  user?: any;
}

export default function BudgetRealisePrintModal({
  isOpen,
  onClose,
  project,
  budget,
  realise,
  client,
  subcontractor,
  user
}: BudgetRealisePrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (printContent) {
      const tempContainer = document.createElement("div");
      tempContainer.id = "print-temp-container";
      tempContainer.className = (printAreaRef.current?.className || "") + " bg-white text-slate-800 p-8";
      tempContainer.innerHTML = printContent;
      document.body.appendChild(tempContainer);

      const style = document.createElement("style");
      style.id = "print-temporary-style";
      style.innerHTML = `
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 12mm 15mm;
        }
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
            padding: 0 !important;
            margin: 0 !important;
            font-size: 11px !important;
          }
          .no-print, .print\\:hidden, button {
            display: none !important;
          }
          table {
            width: 100% !important;
            font-size: 10px !important;
          }
          h1 { font-size: 14px !important; }
          h2 { font-size: 11px !important; }
          h3 { font-size: 10px !important; }
          /* Ensure backgrounds print correctly */
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

  // Math totals and KPI helpers
  // BUDGET
  const bSubTotal = (budget.budgetFourniture || 0) + (budget.budgetMainOeuvre || 0) + (budget.budgetSousTraitance || 0);
  const bMulti = 1 + (budget.fraisGenerauxPct || 0) / 100;
  const bGrandTotal = bSubTotal * bMulti;
  
  const bPoidsTonnes = (budget.poidsVendu || project.poidsTotal) / 1000;
  const bRendement = bPoidsTonnes > 0 ? (budget.budgetHeuresMO || 0) / bPoidsTonnes : 0;
  const bRatioMatiere = (budget.poidsVendu || project.poidsTotal) > 0 ? (budget.budgetFourniture || 0) / (budget.poidsVendu || project.poidsTotal) : 0;

  // REEL
  const rSubTotal = (realise.achatsFournitureRealise || 0) + (realise.achatsMainOeuvreRealise || 0) + (realise.achatsSousTraitanceRealise || 0);
  const rMulti = 1 + (realise.fraisGenerauxPct || 0) / 100;
  const rGrandTotal = rSubTotal * rMulti;

  const rPoidsTonnes = (realise.poidsFabrique || project.poidsTotal) / 1000;
  const rRendement = rPoidsTonnes > 0 ? (realise.achatsHeuresMO || 0) / rPoidsTonnes : 0;
  const rRatioMatiere = (realise.poidsFabrique || project.poidsTotal) > 0 ? (realise.achatsFournitureRealise || 0) / (realise.poidsFabrique || project.poidsTotal) : 0;

  // VARIANCES (Realised minus Budget, so positive indicates excess spend)
  const varFourniture = (realise.achatsFournitureRealise || 0) - (budget.budgetFourniture || 0);
  const varMO = (realise.achatsMainOeuvreRealise || 0) - (budget.budgetMainOeuvre || 0);
  const varST = (realise.achatsSousTraitanceRealise || 0) - (budget.budgetSousTraitance || 0);
  const varFG = (rSubTotal * (realise.fraisGenerauxPct / 100)) - (bSubTotal * (budget.fraisGenerauxPct / 100));
  const varGrandTotal = rGrandTotal - bGrandTotal;

  const marginSaved = bGrandTotal - rGrandTotal;
  const marginPercentage = bGrandTotal > 0 ? (marginSaved / bGrandTotal) * 100 : 0;
  const isProfitable = marginSaved >= 0;

  // TAUX DE CHUTE REALISE (Poids consommé vs Poids fabriqué)
  const poidsUtiliseReel = (realise as any).poidsUtilise || 0;
  const poidsSousTraiteReel = (realise as any).poidsSousTraite || 0;
  const totalConsommeReel = poidsUtiliseReel + poidsSousTraiteReel;
  const poidsFabriqueReel = realise.poidsFabrique || 0;
  const tauxChuteReel = poidsFabriqueReel > 0 ? ((totalConsommeReel / poidsFabriqueReel) - 1) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden my-8 flex flex-col h-[90vh]">
        
        {/* Navigation / Actions Sticky Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-teal-600" />
            <div>
              <h2 className="text-base font-bold">Fiche d'aide à la Décision (Budgets vs Réels)</h2>
              <p className="text-[11px] text-gray-500">Générez un rapport financier comparatif prêt pour la décision stratégique d'affaire.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer select-none transition"
              id="print-budget-realise-btn"
            >
              <Printer className="w-4 h-4" />
              Imprimer la Fiche
            </button>
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition"
            >
              <X className="w-4 h-4" />
              Fermer
            </button>
          </div>
        </div>

        {/* Printable View Container */}
        <div className="overflow-y-auto flex-1 p-8 md:p-12 bg-white text-slate-800" ref={printAreaRef}>
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start gap-4">
            <div>
              <img src={flowfabLogo} alt="FlowFab" style={{width: "113px", height: "113px", objectFit: "contain"}} className="mb-1" />
              <h1 className="text-xl font-black text-slate-950 mt-0.5 uppercase tracking-tight">RAPPORT DE SYNTHÈSE COMPATIBILITÉ BUDGET-RÉEL</h1>
              <p className="text-[11px] text-gray-500 mt-0.5">Décision de facturation & réconciliation financière d'Affaire-Zone</p>
            </div>
            <div className="text-right font-mono text-[10px] text-gray-400 space-y-0.5">
              <p>Édité le : <span className="font-semibold text-slate-950">{new Date().toLocaleDateString("fr-FR")}</span></p>
              <p>Pilote : <span className="font-semibold text-slate-950">{user?.nom || "Thomas Jézéquel"}</span></p>
              <p className="text-[9px] text-gray-400">Rôle : {user?.role || "Administrateur"}</p>
            </div>
          </div>

          {/* Upper Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-200 pb-1 font-mono">📋 RÉFÉRENCES DE L'AFFAIRE</h3>
              <div className="grid grid-cols-3 gap-y-1.5 gap-x-2 text-xs">
                <span className="text-gray-400 font-medium font-mono">Affaire :</span>
                <span className="font-bold text-slate-950 col-span-2">{project.nomAffaire}</span>

                <span className="text-gray-400 font-medium font-mono">Zone / Lot :</span>
                <span className="font-semibold text-slate-800 col-span-2">{project.nomZone}</span>

                <span className="text-gray-400 font-medium font-mono">N° de commande :</span>
                <span className="font-bold text-amber-700 col-span-2">{project.numCommande || "Inconnu"}</span>

                <span className="text-gray-400 font-medium font-mono">Type d'ouvrage :</span>
                <span className="font-semibold text-slate-700 col-span-2">{project.typeOuvrage || "N/A"}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-[11px] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-200 pb-1 font-mono">👤 ACTEURS ET CHANTIER</h3>
              <div className="grid grid-cols-3 gap-y-1.5 gap-x-2 text-xs">
                <span className="text-gray-400 font-medium col-span-1">Client :</span>
                <span className="font-bold text-indigo-800 col-span-2">{client?.nom || "Non spécifié"}</span>

                <span className="text-gray-400 font-medium col-span-1">Sous-traitant :</span>
                <span className="font-semibold text-slate-800 col-span-2">{subcontractor?.nom || "Non spécifié"}</span>

                <span className="text-gray-400 font-medium col-span-1">Conducteur Trx :</span>
                <span className="font-semibold text-slate-800 col-span-2">{project.conducteurTravaux || "N/A"}</span>

                <span className="text-gray-400 font-medium col-span-1">Délai Chantier :</span>
                <span className="font-bold text-rose-700 col-span-2">
                  {project.delaiLivraisonChantier ? new Date(project.delaiLivraisonChantier).toLocaleDateString("fr-FR") : "Non programmé"}
                </span>
              </div>
            </div>
          </div>

          {/* Comparative analysis balance spreadsheet */}
          <div className="space-y-3 my-6">
            <h3 className="text-[11px] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-900 pb-1 font-mono">📊 TABLEAU DES COÛTS & ANALYSE FINANCIÈRE DE FABRICATION</h3>
            <div className="border border-slate-250 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs whitespace-nowrap table-fixed">
                <colgroup>
                  <col className="w-[40%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider font-mono">
                    <th className="px-3 py-2.5 whitespace-normal">Poste de Dépense</th>
                    <th className="px-3 py-2.5 text-right whitespace-normal">Budget Prévisionnel (Vendu)</th>
                    <th className="px-3 py-2.5 text-right whitespace-normal">Achats Fab. Réalisés (Réel)</th>
                    <th className="px-3 py-2.5 text-right whitespace-normal">Écart Variance / Réel-Bud.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Fourniture / Matière */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-950">📦 Fourniture Matière brute</div>
                      <div className="text-[10px] text-gray-500 font-mono space-x-1.5">
                        <span>Poids: Budget {budget.poidsVendu || project.poidsTotal} kg / Réel {realise.poidsFabrique} kg</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(budget.budgetFourniture || 0).toLocaleString()} €</span>
                      <div className="text-[9px] text-gray-400 font-mono">Ratio : {bRatioMatiere.toFixed(2)} €/kg</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(realise.achatsFournitureRealise || 0).toLocaleString()} €</span>
                      <div className="text-[9px] text-gray-400 font-mono">Ratio : {rRatioMatiere.toFixed(2)} €/kg</div>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${varFourniture > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {varFourniture > 0 ? "+" : ""}{varFourniture.toLocaleString()} €
                    </td>
                  </tr>

                  {/* Sub-itemization: Aciers, Peinture, Divers */}
                  <tr className="bg-slate-50/20 text-gray-500 text-[11px]">
                    <td className="px-7 py-1 ">└─ Aciers bruts</td>
                    <td className="px-3 py-1 text-right">{(budget.budgetAciers || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right">{(realise.achatsAciersRealise || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right font-mono">{((realise.achatsAciersRealise || 0) - (budget.budgetAciers || 0)).toLocaleString()} €</td>
                  </tr>
                  <tr className="bg-slate-50/20 text-gray-500 text-[11px]">
                    <td className="px-7 py-1">└─ Peinture atelier</td>
                    <td className="px-3 py-1 text-right">{(budget.budgetPeinture || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right">{(realise.achatsPeintureRealise || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right font-mono">{((realise.achatsPeintureRealise || 0) - (budget.budgetPeinture || 0)).toLocaleString()} €</td>
                  </tr>
                  <tr className="bg-slate-50/20 text-gray-500 text-[11px]">
                    <td className="px-7 py-1">└─ Divers / Quincaillerie</td>
                    <td className="px-3 py-1 text-right">{(budget.budgetDivers || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right">{(realise.achatsDiversRealise || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right font-mono">{((realise.achatsDiversRealise || 0) - (budget.budgetDivers || 0)).toLocaleString()} €</td>
                  </tr>

                  {/* Main Oeuvre */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-950">👷 Main d'Œuvre (Atelier)</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Heures : Budget {budget.budgetHeuresMO || 0} h / Réel {realise.achatsHeuresMO || 0} h
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(budget.budgetMainOeuvre || 0).toLocaleString()} €</span>
                      <div className="text-[9px] text-gray-400 font-mono">Rendement : {bRendement.toFixed(1)} h/T</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(realise.achatsMainOeuvreRealise || 0).toLocaleString()} €</span>
                      <div className="text-[9px] text-gray-400 font-mono">Rendement : {rRendement.toFixed(1)} h/T</div>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${varMO > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {varMO > 0 ? "+" : ""}{varMO.toLocaleString()} €
                    </td>
                  </tr>

                  {/* Sous-Traitance (Protection & Transport) */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-950">🚛 Sous-Traitances Logistique Ext.</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(budget.budgetSousTraitance || 0).toLocaleString()} €</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(realise.achatsSousTraitanceRealise || 0).toLocaleString()} €</span>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${varST > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {varST > 0 ? "+" : ""}{varST.toLocaleString()} €
                    </td>
                  </tr>
                  
                  {/* Sub-itemization for Sous-Traitance */}
                  <tr className="bg-slate-50/20 text-gray-500 text-[11px]">
                    <td className="px-7 py-1">└─ Galva. / Protection extérieure</td>
                    <td className="px-3 py-1 text-right">{(budget.budgetProtection || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right">{(realise.achatsProtectionRealise || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right font-mono">{((realise.achatsProtectionRealise || 0) - (budget.budgetProtection || 0)).toLocaleString()} €</td>
                  </tr>
                  <tr className="bg-slate-50/20 text-gray-500 text-[11px]">
                    <td className="px-7 py-1">└─ Transport logistique chantier</td>
                    <td className="px-3 py-1 text-right">{(budget.budgetTransport || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right">{(realise.achatsTransportRealise || 0).toLocaleString()} €</td>
                    <td className="px-3 py-1 text-right font-mono">{((realise.achatsTransportRealise || 0) - (budget.budgetTransport || 0)).toLocaleString()} €</td>
                  </tr>

                  {/* Frais Généraux */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-950">⚙️ Frais Généraux (FG) de structure</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Tx : Budget {budget.fraisGenerauxPct || 0} % / Réel {realise.fraisGenerauxPct || 0} %
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(bSubTotal * (budget.fraisGenerauxPct / 100)).toLocaleString()} €</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold">{(rSubTotal * (realise.fraisGenerauxPct / 100)).toLocaleString()} €</span>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${varFG > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {varFG > 0 ? "+" : ""}{varFG.toLocaleString()} €
                    </td>
                  </tr>

                  {/* Totaux généraux */}
                  <tr className="bg-slate-100 print-bg-slate font-extrabold text-sm border-t-2 border-slate-400">
                    <td className="px-3 py-3">🛡️ COÛT TOTAL CHARGÉ (+ FG)</td>
                    <td className="px-3 py-3 text-right text-teal-800">{bGrandTotal.toLocaleString()} € H.T.</td>
                    <td className="px-3 py-3 text-right text-slate-900">{rGrandTotal.toLocaleString()} € H.T.</td>
                    <td className={`px-3 py-3 text-right ${varGrandTotal > 0 ? "text-rose-700" : "text-emerald-800"}`}>
                      {varGrandTotal > 0 ? "+" : ""}{varGrandTotal.toLocaleString()} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Analyse du Taux de Chute - argument clé pour la prise de décision */}
          <div className="my-6">
            <h3 className="text-[11px] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-900 pb-1 font-mono mb-3">
              ♻️ ANALYSE DU TAUX DE CHUTE — CONSOMMATION MATIÈRE RÉELLE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Poids Utilisé</span>
                <span className="text-base font-extrabold text-slate-900 block mt-1">{poidsUtiliseReel.toLocaleString()} kg</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Poids Sous-Traité</span>
                <span className="text-base font-extrabold text-slate-900 block mt-1">{poidsSousTraiteReel.toLocaleString()} kg</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-mono">Poids Fabriqué (Réel Produit)</span>
                <span className="text-base font-extrabold text-slate-900 block mt-1">{poidsFabriqueReel.toLocaleString()} kg</span>
              </div>
            </div>
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${tauxChuteReel > 0 ? "bg-rose-50 border-rose-200 text-rose-950" : "bg-emerald-50 border-emerald-200 text-emerald-950"} print:bg-slate-50`}>
              <div className="flex items-center gap-2.5">
                <Scale className={`w-5 h-5 shrink-0 ${tauxChuteReel > 0 ? "text-rose-600" : "text-emerald-700"}`} />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">Taux de Chute Réalisé (Consommé vs Fabriqué)</span>
                  <span className="text-[11px] text-gray-600">
                    Total consommé : {totalConsommeReel.toLocaleString()} kg ({poidsUtiliseReel.toLocaleString()} kg utilisé + {poidsSousTraiteReel.toLocaleString()} kg sous-traité)
                  </span>
                </div>
              </div>
              <span className="text-2xl font-black shrink-0">
                {tauxChuteReel > 0 ? "+" : ""}{tauxChuteReel.toFixed(2)} %
              </span>
            </div>
          </div>

          {/* Quick Summary Cards Side By Side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            <div className="p-4 rounded-xl border border-dotted border-slate-300 bg-slate-50/50 print:bg-slate-50">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">Volume de l'affaire (Objectif)</span>
              <span className="text-lg font-extrabold text-teal-800 block mt-1">{bGrandTotal.toLocaleString()} € H.T.</span>
              <span className="text-[10px] text-slate-500 block mt-1">Marges contractuelles intégrées</span>
            </div>

            <div className="p-4 rounded-xl border border-dotted border-slate-300 bg-slate-50/50 print:bg-slate-50">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-mono">Dépense de Fabrication (Réel)</span>
              <span className="text-lg font-extrabold text-slate-900 block mt-1">{rGrandTotal.toLocaleString()} € H.T.</span>
              <span className="text-[10px] text-slate-500 block mt-1">Fournisseurs, MO & Frais inclus</span>
            </div>

            <div className={`p-4 rounded-xl border ${isProfitable ? "bg-emerald-50/60 border-emerald-200 text-emerald-950" : "bg-rose-50/60 border-rose-200 text-rose-950"} print:bg-slate-50`}>
              <span className="text-[10px] uppercase tracking-widest block font-mono">Solde Écart de Rentabilité</span>
              <span className="text-lg font-black block mt-1">
                {isProfitable ? "Économie / Marge de : " : "Surcoût de : "}
                {Math.abs(marginSaved).toLocaleString()} €
              </span>
              <span className="text-[10px] block mt-1 font-semibold">
                Soit un différentiel de : {marginSaved >= 0 ? "+" : ""}{marginPercentage.toFixed(1)}% par rapport au budget
              </span>
            </div>
          </div>

          {/* New handwritten free zone for note-taking and the final agreed amount slots */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
            <div className="md:col-span-2 border border-slate-300 rounded-xl p-4 min-h-[130px] bg-white">
              <span className="text-[10px] font-bold text-slate-500 block uppercase font-mono tracking-wider">📝 ZONE LIBRE - NOTES MANUSCRITES ET OBSERVATIONS :</span>
              <div className="mt-4 space-y-3.5 print:block">
                <div className="h-6 border-b border-dashed border-slate-300"></div>
                <div className="h-6 border-b border-dashed border-slate-300"></div>
                <div className="h-6 border-b border-dashed border-slate-300"></div>
              </div>
            </div>

            <div className="border-2 border-teal-600 rounded-xl p-4 bg-teal-50/20 flex flex-col justify-between min-h-[130px]">
              <div>
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider font-mono block pb-1 border-b border-teal-100">💶 MONTANT FINAL DÉCIDÉ :</span>
                <p className="text-[10px] text-teal-650 mt-1 leading-tight">Montant arrêté et approuvé pour facturation définitive.</p>
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-1 border-b-2 border-dashed border-teal-400 pb-1 w-full">
                <span className="text-[11px] text-teal-800 font-semibold uppercase font-mono tracking-wider">Montant :</span>
                <div className="flex-1 border-b border-dotted border-teal-300 mx-1.5 mb-1.5 min-w-[30px]" />
                <span className="text-[11px] font-bold text-teal-900 shrink-0 uppercase font-mono">€ H.T.</span>
              </div>
            </div>
          </div>

          {/* Validation Sign-off */}
          <div className="mt-10 pt-6 border-t border-slate-300 text-xs">
            <div className="max-w-xs ml-auto text-right">
              <p className="font-bold text-slate-950 font-mono uppercase tracking-wider">Visa du Responsable Sous-Traitance :</p>
              <div className="mt-6 border-b border-dashed border-slate-400 h-14 w-4/5 ml-auto"></div>
              <p className="text-[10px] text-gray-400 mt-1">Date et Signature :</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
