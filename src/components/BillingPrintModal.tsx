import React, { useRef } from "react";
import { Project, Budget, Realise, Billing, Subcontractor, Client, User } from "../types";
import { X, Printer, CheckSquare, Award, Coins, Scale, FileText } from "lucide-react";
import flowfabLogo from "../assets/images/flowfab_logo_1780546723025.png";

interface BillingPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  billing: Billing;
  projects: Project[];
  clients: Client[];
  subcontractors: Subcontractor[];
  budgets: Budget[];
  realises: Realise[];
  user?: User;
}

export default function BillingPrintModal({
  isOpen,
  onClose,
  billing,
  projects,
  clients,
  subcontractors,
  budgets,
  realises,
  user
}: BillingPrintModalProps) {
  if (!isOpen) return null;

  // Find linked project
  const project = projects.find(p => p.id === billing.projetId);
  const associatedProjects = projects.filter(p => 
    p.id === billing.projetId || 
    (billing.projetIds && billing.projetIds.includes(p.id))
  );

  const mainProject = project || associatedProjects[0];
  if (!mainProject) return null;

  // Find client & subcontractor
  const client = clients.find(c => c.id === mainProject.clientId);
  const subcontractor = subcontractors.find(s => s.id === mainProject.sousTraitantId);

  // Budgets & Realises for associated projects
  const associatedBudgets = budgets.filter(b => associatedProjects.some(ap => ap.id === b.projetId));
  const associatedRealises = realises.filter(r => associatedProjects.some(ap => ap.id === r.projetId));

  // Financial aggregates
  const totalB_Fourniture = associatedBudgets.reduce((sum, b) => sum + (b.budgetFourniture || 0), 0);
  const totalB_MO = associatedBudgets.reduce((sum, b) => sum + (b.budgetMainOeuvre || 0), 0);
  const totalB_Sub = associatedBudgets.reduce((sum, b) => sum + (b.budgetSousTraitance || 0), 0);
  const totalB_Heures = associatedBudgets.reduce((sum, b) => sum + (b.budgetHeuresMO || 0), 0);
  const totalB_Poids = associatedBudgets.reduce((sum, b) => sum + (b.poidsVendu || 0), 0);
  
  // Overhead multipliers
  const avgB_Overhead = associatedBudgets.length > 0 
    ? associatedBudgets.reduce((sum, b) => sum + (b.fraisGenerauxPct || 0), 0) / associatedBudgets.length
    : 10;
  const totalB_Basic = totalB_Fourniture + totalB_MO + totalB_Sub;
  const totalB_WithFG = totalB_Basic * (1 + avgB_Overhead / 100);

  const totalR_Fourniture = associatedRealises.reduce((sum, r) => sum + (r.achatsFournitureRealise || 0), 0);
  const totalR_MO = associatedRealises.reduce((sum, r) => sum + (r.achatsMainOeuvreRealise || 0), 0);
  const totalR_Sub = associatedRealises.reduce((sum, r) => sum + (r.achatsSousTraitanceRealise || 0), 0);
  const totalR_Heures = associatedRealises.reduce((sum, r) => sum + (r.achatsHeuresMO || 0), 0);
  const totalR_Poids = associatedRealises.reduce((sum, r) => sum + (r.poidsFabrique || 0), 0);

  const avgR_Overhead = associatedRealises.length > 0
    ? associatedRealises.reduce((sum, r) => sum + (r.fraisGenerauxPct || 0), 0) / associatedRealises.length
    : 10;
  const totalR_Basic = totalR_Fourniture + totalR_MO + totalR_Sub;
  const totalR_WithFG = totalR_Basic * (1 + avgR_Overhead / 100);

  // Billing amount
  const billingHT = billing.quantiteFacturee * billing.prixUnitaire;

  // Margin analyses
  const rawCostDiff = totalR_WithFG - totalB_WithFG;
  const theoreticalSalesMargin = billingHT - totalB_WithFG;
  const realSalesMargin = billingHT - totalR_WithFG;
  const marginPct = billingHT > 0 ? (realSalesMargin / billingHT) * 100 : 0;

  // Productivity
  const bPoidsTonne = totalB_Poids / 1000;
  const rPoidsTonne = totalR_Poids / 1000;
  const rendementB = bPoidsTonne > 0 ? totalB_Heures / bPoidsTonne : 0;
  const rendementR = rPoidsTonne > 0 ? totalR_Heures / rPoidsTonne : 0;

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Standard printing action with dynamic DOM-swap to bypass iframe sandbox restrictions and keep original styling
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
          margin: 10mm 12mm 10mm 12mm;
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
            font-size: 9px !important;
          }
          .no-print, .print\\:hidden, button {
            display: none !important;
          }
          h1 { font-size: 13px !important; line-height: 1.2 !important; }
          h2 { font-size: 10px !important; }
          h3 { font-size: 9px !important; }
          p  { font-size: 9px !important; }
          table {
            width: 100% !important;
            font-size: 8px !important;
            border-collapse: collapse !important;
          }
          table th, table td {
            padding: 3px 5px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          table th:first-child, table td:first-child {
            width: 38% !important;
          }
          table th:not(:first-child), table td:not(:first-child) {
            width: 15.5% !important;
            text-align: right !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          .gap-8 { gap: 12px !important; }
          .gap-6 { gap: 10px !important; }
          .p-8, .p-12 { padding: 8px !important; }
          .p-4 { padding: 6px !important; }
          .my-8 { margin-top: 8px !important; margin-bottom: 8px !important; }
          .my-6 { margin-top: 6px !important; margin-bottom: 6px !important; }
          .pb-6 { padding-bottom: 6px !important; }
          .pt-8 { padding-top: 8px !important; }
          .space-y-4 > * + * { margin-top: 6px !important; }
          .space-y-3 > * + * { margin-top: 4px !important; }
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none print:z-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:shadow-none print:border-none print:rounded-none print:max-h-full print:w-full">
        
        {/* Buttons drawer (Hidden on print) */}
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold">Analyse globale & Décision de facturation</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer le rapport
            </button>
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              Fermer
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div ref={printAreaRef} className="p-8 md:p-12 overflow-y-auto flex-1 text-slate-800 bg-white print:p-0 print:overflow-visible">
          
          {/* Header Frame */}
          <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start gap-4">
            <div>
              <img src={flowfabLogo} alt="FlowFab" style={{width: "113px", height: "113px", objectFit: "contain"}} className="mb-2" />
              <h1 className="text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">RAPPORT FINANCIER D'AFFAIRE</h1>
              <p className="text-xs text-gray-500 mt-1">Analyse de rentabilité de fabrication & justification du prix de facturation</p>
            </div>
            <div className="text-right font-mono text-[10px] text-gray-400 space-y-1">
              <p>Date d'Émission : <span className="font-semibold text-slate-800">{new Date().toLocaleDateString("fr-FR")}</span></p>
              <p>Éditeur : <span className="font-semibold text-slate-800">{user?.nom || "Thomas Jézéquel"}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-6">
            
            {/* Box 1: Core Affaire details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5">Références de l'Affaire</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-gray-400 font-medium col-span-1">Affaire :</span>
                <span className="font-bold text-slate-900 col-span-2">{mainProject.nomAffaire}</span>

                <span className="text-gray-400 font-medium col-span-1">N° de commande :</span>
                <span className="font-semibold text-slate-800 col-span-2">{mainProject.numCommande || "Non spécifié"}</span>

                <span className="text-gray-400 font-medium col-span-1">Zone / Lot :</span>
                <span className="font-semibold text-slate-700 col-span-2">{associatedProjects.map(ap => ap.nomZone).join(", ")}</span>

                <span className="text-gray-400 font-medium col-span-1">Donneur d'Ordre :</span>
                <span className="font-bold text-indigo-700 col-span-2">{client?.nom || "Non spécifié"}</span>

                <span className="text-gray-400 font-medium col-span-1 border-t border-slate-100 pt-1.5 mt-1">Sous-traitant :</span>
                <span className="font-semibold text-slate-800 col-span-2 border-t border-slate-100 pt-1.5 mt-1">{subcontractor?.nom || "Non spécifié"}</span>
              </div>
            </div>

            {/* Box 2: Billing Decision Summary */}
            <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-100/60 print:bg-slate-50 print:border-slate-200">
              <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-widest border-b border-amber-200/50 pb-1.5 font-mono">Décision de Facturation</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-gray-400 font-medium col-span-1">Prestation :</span>
                <span className="font-bold text-slate-900 col-span-2">{billing.typePrestation}</span>

                <span className="text-gray-400 font-medium col-span-1">Facturé :</span>
                <span className="font-semibold text-slate-800 col-span-2">{billing.quantiteFacturee.toLocaleString()} {billing.uniteFacturee}</span>

                <span className="text-gray-400 font-medium col-span-1">Prix Unitaire :</span>
                <span className="font-bold text-slate-900 col-span-2">{billing.prixUnitaire.toLocaleString("fr-FR")} € / {billing.uniteFacturee}</span>

                <span className="text-gray-700 font-bold col-span-1 border-t border-amber-250/20 pt-2 mt-1">TOTAL FACTURÉ :</span>
                <span className="font-black text-rose-700 text-sm col-span-2 border-t border-amber-250/20 pt-1.5 mt-1 font-mono">
                  {billingHT.toLocaleString("fr-FR")} € H.T.
                </span>
              </div>
            </div>

          </div>

          {/* Section: Comparative Balance Sheet */}
          <div className="space-y-4 my-8">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b-2 border-slate-900 pb-1.5">🔬 Analyse de Fabrication Comparative (Budget vs Réel)</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/80">
                    <th className="px-3 py-2">Poste de Dépense</th>
                    <th className="px-3 py-2 text-right">Budget Prévisionnel</th>
                    <th className="px-3 py-2 text-right">Coûts Réalisés (Réel)</th>
                    <th className="px-3 py-2 text-right">Écart Absolu</th>
                    <th className="px-3 py-2 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {associatedProjects.map((ap) => {
                    const b = budgets.find(db_b => db_b.projetId === ap.id);
                    const r = realises.find(db_r => db_r.projetId === ap.id);

                    const b_Fourniture = b?.budgetFourniture || 0;
                    const b_MO = b?.budgetMainOeuvre || 0;
                    const b_Sub = b?.budgetSousTraitance || 0;
                    const b_Heures = b?.budgetHeuresMO || 0;
                    const b_Poids = b?.poidsVendu || 0;
                    const b_FG = b?.fraisGenerauxPct || 0;
                    const b_Basic = b_Fourniture + b_MO + b_Sub;
                    const b_WithFG = b_Basic * (1 + b_FG / 100);

                    const r_Fourniture = r?.achatsFournitureRealise || 0;
                    const r_MO = r?.achatsMainOeuvreRealise || 0;
                    const r_Sub = r?.achatsSousTraitanceRealise || 0;
                    const r_Heures = r?.achatsHeuresMO || 0;
                    const r_Poids = r?.poidsFabrique || 0;
                    const r_FG = r?.fraisGenerauxPct || 0;
                    const r_Basic = r_Fourniture + r_MO + r_Sub;
                    const r_WithFG = r_Basic * (1 + r_FG / 100);

                    const zoneDiff = r_WithFG - b_WithFG;

                    return (
                      <React.Fragment key={ap.id}>
                        {/* Subheader for current Zone */}
                        <tr className="bg-slate-50 border-y border-slate-300">
                          <td colSpan={5} className="px-3 py-2 font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                            📍 Zone : <span className="text-teal-700">{ap.nomZone}</span> (Renseignements Budgets & Réalisés)
                          </td>
                        </tr>
                        
                        {/* Fournitures */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-700 pl-6">↳ Fournitures d'Atelier (Aciers, Peinture, Divers)</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{b_Fourniture.toLocaleString("fr-FR")} €</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{r_Fourniture.toLocaleString("fr-FR")} €</td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${(r_Fourniture - b_Fourniture) > 0 ? "text-red-650" : "text-emerald-700"}`}>
                            {(r_Fourniture - b_Fourniture).toLocaleString("fr-FR")} €
                          </td>
                          <td className="px-3 py-2 text-right">
                            {(r_Fourniture - b_Fourniture) > 0 ? (
                              <span className="text-[9px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-bold">Surcoût</span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded font-bold">Optimisé</span>
                            )}
                          </td>
                        </tr>

                        {/* Main d'Oeuvre */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-700 pl-6">
                            ↳ MO Interne de Fabrication
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">
                            {b_MO.toLocaleString("fr-FR")} € <span className="text-[10px] text-gray-400">({b_Heures} h)</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">
                            {r_MO.toLocaleString("fr-FR")} € <span className="text-[10px] text-gray-400">({r_Heures} h)</span>
                          </td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${(r_MO - b_MO) > 0 ? "text-red-650" : "text-emerald-700"}`}>
                            {(r_MO - b_MO).toLocaleString("fr-FR")} € <span className="text-[9px] text-gray-400 font-normal">({r_Heures - b_Heures} h)</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {(r_MO - b_MO) > 0 ? (
                              <span className="text-[9px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-bold">Heures +</span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded font-bold">Heures OK</span>
                            )}
                          </td>
                        </tr>

                        {/* Sous-Traitance */}
                        <tr className="hover:bg-slate-50/55">
                          <td className="px-3 py-2 font-medium text-slate-700 pl-6">↳ Prestations de Sous-Traitance (Transport, Protection)</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{b_Sub.toLocaleString("fr-FR")} €</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{r_Sub.toLocaleString("fr-FR")} €</td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${(r_Sub - b_Sub) > 0 ? "text-red-650" : "text-emerald-700"}`}>
                            {(r_Sub - b_Sub).toLocaleString("fr-FR")} €
                          </td>
                          <td className="px-3 py-2 text-right">
                            {(r_Sub - b_Sub) > 0 ? (
                              <span className="text-[9px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-bold">Écart</span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded font-bold">Économie</span>
                            )}
                          </td>
                        </tr>

                        {/* Total with general expenses for the zone */}
                        <tr className="bg-slate-100/30 font-semibold border-b border-slate-200">
                          <td className="px-3 py-2 pl-6 text-slate-800 italic">Sous-Total avec Frais Généraux ({b_FG}% vs {r_FG}%)</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-800">{b_WithFG.toLocaleString("fr-FR")} €</td>
                          <td className="px-3 py-2 text-right font-mono text-teal-800">{r_WithFG.toLocaleString("fr-FR")} €</td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${zoneDiff > 0 ? "text-rose-650" : "text-emerald-800"}`}>
                            {zoneDiff.toLocaleString("fr-FR")} €
                          </td>
                          <td className="px-3 py-2 text-right text-[10px] font-bold">
                            {zoneDiff > 0 ? "⚠️ Dépassement" : "✅ OK"}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* CUMULATIVE HEADER */}
                  {associatedProjects.length > 1 && (
                    <tr className="bg-slate-900 text-white border-y border-slate-950 font-bold">
                      <td colSpan={5} className="px-3 py-2 text-xs uppercase tracking-widest font-mono">
                        ⚙️ CUMUL GLOBAL DE TOUTES LES ZONES FACTURÉES
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-400">
                    <td className="px-3 py-3">CUMUL COUTS FABRICATION BRUTS</td>
                    <td className="px-3 py-3 text-right font-mono">{totalB_Basic.toLocaleString("fr-FR")} €</td>
                    <td className="px-3 py-3 text-right font-mono">{totalR_Basic.toLocaleString("fr-FR")} €</td>
                    <td className={`px-3 py-3 text-right font-mono font-black ${(totalR_Basic - totalB_Basic) > 0 ? "text-red-750" : "text-emerald-800"}`}>
                      {(totalR_Basic - totalB_Basic).toLocaleString("fr-FR")} €
                    </td>
                    <td className="px-3 py-3 text-right"></td>
                  </tr>

                  <tr className="bg-teal-50 font-black text-slate-950 border-double border-t-4 border-b-2 border-slate-900">
                    <td className="px-3 py-3.5 uppercase text-xs tracking-wider">
                      TOTAL APPLICABLE AVEC FRAIS GÉNERAUX
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-sm text-slate-800">
                      {totalB_WithFG.toLocaleString("fr-FR")} €
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-sm text-teal-900">
                      {totalR_WithFG.toLocaleString("fr-FR")} €
                    </td>
                    <td className={`px-3 py-3.5 text-right font-mono text-sm font-black ${(totalR_WithFG - totalB_WithFG) > 0 ? "text-rose-700" : "text-emerald-950"}`}>
                      {(totalR_WithFG - totalB_WithFG).toLocaleString("fr-FR")} €
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs">
                      {(totalR_WithFG - totalB_WithFG) > 0 ? "⚠️ DÉPASSEMENT" : "✅ SOUS CONTRÔLE"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Rendements / Weights comparisons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 text-xs">
            <div className="p-4 rounded-xl border border-slate-200/80 space-y-2">
              <strong className="text-slate-900 block text-xs font-bold uppercase tracking-wider">⚖️ Tonnage et Rendement d'Atelier</strong>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <span className="text-gray-400">Poids Vendu :</span>
                <span className="font-semibold text-slate-800 text-right">{totalB_Poids.toLocaleString("fr-FR")} kg ({bPoidsTonne.toFixed(1)} T)</span>
                
                <span className="text-gray-400">Poids Fabriqué :</span>
                <span className="font-semibold text-slate-800 text-right">{totalR_Poids.toLocaleString("fr-FR")} kg ({rPoidsTonne.toFixed(1)} T)</span>

                <span className="text-gray-400 border-t border-slate-100 pt-1">Rendement Vendu (H/T) :</span>
                <span className="font-bold text-indigo-700 text-right border-t border-slate-100 pt-1 font-mono">{rendementB.toFixed(1)} H/T</span>

                <span className="text-gray-400">Rendement Réel (H/T) :</span>
                <span className="font-bold text-teal-700 text-right font-mono">{rendementR.toFixed(1)} H/T</span>
              </div>
            </div>

            {/* Profit analysis summary block */}
            <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100 space-y-2 print:bg-slate-50 print:border-slate-200">
              <strong className="text-emerald-800 block text-xs font-bold uppercase tracking-wider font-mono">📊 Rentabilité Nette de Facturation</strong>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <span className="text-gray-500">Marge brute Vs budget :</span>
                <span className="font-semibold text-slate-800 text-right font-mono">
                  {theoreticalSalesMargin.toLocaleString("fr-FR")} €
                </span>

                <span className="text-gray-500 border-t border-emerald-150/40 pt-1 mt-1">Marge nette réelle finale :</span>
                <span className={`font-extrabold text-right border-t border-emerald-150/40 pt-1 mt-1 font-mono text-sm ${realSalesMargin > 0 ? "text-emerald-800" : "text-rose-700"}`}>
                  {realSalesMargin.toLocaleString("fr-FR")} €
                </span>

                <span className="text-gray-500">Rentabilité nette (%) :</span>
                <span className={`font-black text-right font-mono ${marginPct > 0 ? "text-emerald-800" : "text-rose-700"}`}>
                  {marginPct.toFixed(1)} %
                </span>
                
                <span className="text-gray-500">Coefficient global de l'affaire :</span>
                <span className="font-bold text-slate-800 text-right font-mono">
                  {totalR_WithFG > 0 ? (billingHT / totalR_WithFG).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Executive Commentary and validation signatures */}
          <div className="mt-8 border-t-2 border-slate-900 pt-4 space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">🔍 Commentaires d'Analyse et Validation</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed italic">
                {realSalesMargin > 0 
                  ? `L'analyse globale de l'affaire "${mainProject.nomAffaire}" démontre un rendement de fabrication d'atelier satisfaisant de ${rendementR.toFixed(1)} H/T contre les ${rendementB.toFixed(1)} H/T budgétisés lors de la vente. Avec une marge financière nette de ${realSalesMargin.toLocaleString("fr-FR")} € (${marginPct.toFixed(1)}%), le coefficient d'affaire de ${(totalR_WithFG > 0 ? (billingHT / totalR_WithFG).toFixed(2) : "0.00")} conforte la tarification unitaire décidée de ${billing.prixUnitaire.toLocaleString("fr-FR")} € par ${billing.uniteFacturee}. Décision approuvée pour encaissement.`
                  : `ATTENTION : L'affaire "${mainProject.nomAffaire}" présente un solde de rentabilité nette négatif de ${realSalesMargin.toLocaleString("fr-FR")} € (${marginPct.toFixed(1)}%). Le rendement réel d'atelier de ${rendementR.toFixed(1)} H/T a dépassé le budget initial (${rendementB.toFixed(1)} H/T). La décision du prix de facturation de ${billing.prixUnitaire} € doit faire l'objet d'un audit interne de fabrication et de négociation sur les dépenses complémentaires.`
                }
              </p>
              {billing.commentaire && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">Commentaire de Facturation</h4>
                  <p className="text-xs text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed italic">
                    "{billing.commentaire}"
                  </p>
                </div>
              )}
            </div>

            {/* Signature Box (Only Visa du responsable sous-traitance) */}
            <div className="flex justify-end pt-8 text-[11px]">
              <div className="text-right flex flex-col items-end">
                <p className="font-bold text-gray-400 uppercase tracking-wider mb-8 font-mono">Visa du responsable sous-traitance</p>
                <div className="border-b border-gray-300 w-48 h-8"></div>
                <p className="text-gray-500 mt-1">{user?.nom || "Thomas Jézéquel"}</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
