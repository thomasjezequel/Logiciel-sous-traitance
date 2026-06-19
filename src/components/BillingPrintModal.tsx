import React, { useRef } from "react";
import { Project, Budget, Realise, Billing, Subcontractor, Client, User } from "../types";
import { X, Printer, FileText } from "lucide-react";
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

  // Billing amount
  const billingHT = billing.quantiteFacturee * billing.prixUnitaire;

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
          margin: 14mm 16mm 14mm 16mm;
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:shadow-none print:border-none print:rounded-none print:max-h-full print:w-full">
        
        {/* Buttons drawer (Hidden on print) */}
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold">Accord de Facturation</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimer le document
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
              <h1 className="text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">ACCORD DE FACTURATION</h1>
              <p className="text-xs text-gray-500 mt-1">Document transmis pour traitement comptable</p>
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

                <span className="text-gray-400 font-medium col-span-1">Date Facturation :</span>
                <span className="font-semibold text-slate-800 col-span-2">{billing.dateFacturation ? new Date(billing.dateFacturation).toLocaleDateString("fr-FR") : "Non renseignée"}</span>

                <span className="text-gray-400 font-medium col-span-1">Échéance :</span>
                <span className="font-semibold text-slate-800 col-span-2">{billing.dateEcheance ? new Date(billing.dateEcheance).toLocaleDateString("fr-FR") : "Non renseignée"}</span>

                <span className="text-gray-700 font-bold col-span-1 border-t border-amber-250/20 pt-2 mt-1">TOTAL FACTURÉ :</span>
                <span className="font-black text-rose-700 text-sm col-span-2 border-t border-amber-250/20 pt-1.5 mt-1 font-mono">
                  {billingHT.toLocaleString("fr-FR")} € H.T.
                </span>
              </div>
            </div>

          </div>

          {/* Section: Commentaire manuel uniquement (pas de texte généré automatiquement) */}
          {billing.commentaire && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono mb-2">Commentaire</h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed italic">
                  "{billing.commentaire}"
                </p>
              </div>
            </div>
          )}

          {/* Signature Box (Visa du responsable sous-traitance) */}
          <div className="flex justify-end pt-10 text-[11px]">
            <div className="text-right flex flex-col items-end">
              <p className="font-bold text-gray-400 uppercase tracking-wider mb-8 font-mono">Visa du responsable sous-traitance</p>
              <div className="border-b border-gray-300 w-48 h-8"></div>
              <p className="text-gray-500 mt-1">{user?.nom || "Thomas Jézéquel"}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
