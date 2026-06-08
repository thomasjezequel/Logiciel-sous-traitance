import { useRef } from "react";
import { Client, Subcontractor, Project, User } from "../types";
import { Printer, ArrowLeft, Download, Shield, Landmark } from "lucide-react";

interface PrestationPrintProps {
  project: Project;
  client: Client | undefined;
  subcontractor: Subcontractor | undefined;
  onClose: () => void;
  user?: User;
}

export default function PrestationPrint({ project, client, subcontractor, onClose, user }: PrestationPrintProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="bg-white text-gray-900 min-h-screen p-4 md:p-8 print:p-0 print:bg-white print:text-black">
      {/* Action Controls - Hidden in print */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-100 print:hidden font-sans">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au logiciel
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimer la fiche
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div ref={printAreaRef} className="max-w-4xl mx-auto border border-gray-300 print:border-none p-6 md:p-10 rounded-lg shadow-sm print:shadow-none bg-white">
        
        {/* Header Block */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <div className="text-2xl font-black text-teal-600 tracking-wider">FLOW<span className="text-slate-800">FAB</span></div>
            <p className="text-xs text-gray-500 font-mono mt-1">Éditeur : {user ? user.nom : "Thomas Jézéquel"}</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">FICHE DE PRESTATION</h1>
            <p className="text-sm bg-slate-100 print:bg-gray-100 px-3 py-1 font-mono inline-block rounded mt-1 text-slate-800">
              Cde N° : <span className="font-bold">{project.numCommande || "N/A"}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">Date : {project.dateCommande ? project.dateCommande.split("-").reverse().join("/") : "N/A"}</p>
          </div>
        </div>

        {/* Client & Subcontractor Addresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Subcontractor Panel */}
          <div className="bg-slate-50 print:bg-gray-50 p-5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest block mb-2 font-mono">SOUS-TRAITANT</span>
            <h3 className="text-base font-bold text-slate-950">{subcontractor?.nom || "Non défini"}</h3>
            <p className="text-sm text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
              {subcontractor?.adresse || "Adresse non fournie"}
            </p>
          </div>

          {/* Client Panel */}
          <div className="bg-slate-50 print:bg-gray-50 p-5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 font-mono">CLIENT PROPRIÉTAIRE</span>
            <h3 className="text-base font-bold text-slate-950">{client?.nom || "Non défini"}</h3>
            <p className="text-sm text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
              {client?.adresse || "Adresse non fournie"}
            </p>
          </div>
        </div>

        {/* Project Metadata Details */}
        <div className="mb-8">
          <h2 className="text-sm font-bold bg-slate-800 text-white px-3 py-1.5 rounded uppercase tracking-wider mb-4 font-mono">
            Détail de l'Affaire et Périmètre
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="text-xs text-gray-500 block">Nom de l'Affaire :</span>
              <span className="font-semibold text-slate-950">{project.nomAffaire}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Zone d'exécution :</span>
              <span className="font-semibold text-slate-950">{project.nomZone}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Type de Protection :</span>
              <span className="font-semibold text-slate-950 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-teal-600 print:hidden" />
                {project.protection || "Standard"}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Dessinateur Référent :</span>
              <span className="font-semibold text-slate-950">{project.dessinateur || "N/A"}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Conducteur de Travaux :</span>
              <span className="font-semibold text-slate-950">{project.conducteurTravaux || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Quantitative Specs */}
        <div className="mb-8">
          <h2 className="text-sm font-bold bg-slate-800 text-white px-3 py-1.5 rounded uppercase tracking-wider mb-4 font-mono">
            Spécifications Quantitatives (Poids et ml)
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 print:bg-gray-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Composant</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 text-right">Valeur / Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-950">Poids Total de l'Affaire</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-950">{project.poidsTotal.toLocaleString()} kg</td>
                </tr>
                {project.poidsPRS && (
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">Poids PRS (Profilés Reconstitués Soudés)</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-semibold">{project.poidsPRS.toLocaleString()} kg</td>
                  </tr>
                )}
                {project.poidsPDC && (
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">Poids PDC (Plaques de cisaillement / goussets)</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-semibold">{project.poidsPDC.toLocaleString()} kg</td>
                  </tr>
                )}
                {project.quantiteMl && (
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">Quantité en ml (le cas échéant)</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-semibold">{project.quantiteMl} ml</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Jalons & Responsabilités Checklist (Client vs Sous-Traitant) */}
        {(() => {
          const checklistItems = [
            { id: "commandeInitiale", label: "Commande initiale" },
            { id: "bureauEtude", label: "Bureau d’étude" },
            { id: "miseEnBarre", label: "Mise en barre" },
            { id: "commandeAcier", label: "Commande acier" },
            { id: "fabricationDiverse", label: "Fabrication diverse" },
            { id: "fabricationPDC", label: "Fabrication PDC" },
            { id: "fabricationPRS", label: "Fabrication PRS" },
            { id: "fournitureBoulonnerie", label: "Fourniture boulonnerie" },
            { id: "fournitureEtiquettes", label: "Fourniture des étiquettes" },
            { id: "poseEtiquettes", label: "Pose des étiquettes" },
            { id: "protectionGereePar", label: "Protection gérée par" },
            { id: "livraisonSiteProtection", label: "Livraison site de protection" },
            { id: "paiementFactures", label: "Paiement de la facture" },
            { id: "enlevementSiteProtection", label: "Enlèvement site de protection" },
            { id: "livraisonChantier", label: "Livraison sur chantier" },
            { id: "pose", label: "Pose" }
          ];

          const activeItems = checklistItems.filter(item => {
            const isClientChecked = !!project.checklistClient?.[item.id];
            const isSubChecked = !!project.checklistSubcontractor?.[item.id];
            return isClientChecked || isSubChecked;
          });

          if (activeItems.length === 0) return null;

          return (
            <div className="mb-8">
              <h2 className="text-sm font-bold bg-slate-800 text-white px-3 py-1.5 rounded uppercase tracking-wider mb-4 font-mono">
                Suivi des Jalons et Responsabilités (Fiche de Prestation)
              </h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 animate-none">
                    <tr className="bg-slate-100 print:bg-gray-100">
                      <th className="px-4 py-2 font-semibold text-slate-700">Désignation du Jalon</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-center w-36">{client?.nom || "Client"}</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-center w-36">{subcontractor?.nom || "Sous-traitant"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeItems.map(item => {
                      const isClientChecked = !!project.checklistClient?.[item.id];
                      const isSubChecked = !!project.checklistSubcontractor?.[item.id];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-medium text-slate-800">{item.label}</td>
                          <td className="px-4 py-2 text-center text-xs">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${isClientChecked ? "bg-teal-50 text-teal-700 border border-teal-200" : "text-gray-300"}`}>
                              {isClientChecked ? "☑ Oui" : "☐ Non"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-xs">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${isSubChecked ? "bg-teal-50 text-teal-700 border border-teal-200" : "text-gray-300"}`}>
                              {isSubChecked ? "☑ Oui" : "☐ Non"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Remarques / Observations supplémentaires avant jalons de livraison */}
        {project.remarquesPrestation && (
          <div className="mb-8 p-5 bg-amber-50/40 border border-amber-200 rounded-lg">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-widest block mb-2 font-mono">
              Remarques et Informations Complémentaires
            </h3>
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {project.remarquesPrestation}
            </p>
          </div>
        )}

        {/* Delivery Deadlines */}
        <div className="mb-10 bg-teal-50/50 print:bg-gray-50 p-5 rounded-lg border border-teal-100 print:border-red-300">
          <h2 className="text-sm font-bold text-teal-950 uppercase tracking-wide mb-3 font-mono">
            Délais de Livraison et Jalons Critères
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white print:bg-white p-3 rounded border border-teal-100 flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-widest block font-mono">Délai de Livraison Site de Protection</span>
              <span className="text-base font-bold text-teal-800 mt-1">
                {project.delaiLivraisonProtection 
                  ? new Date(project.delaiLivraisonProtection).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                  : "Non requis"
                }
              </span>
            </div>
            
            <div className="bg-white print:bg-white p-3 rounded border border-red-100 flex flex-col">
              <span className="text-xs text-red-500 uppercase tracking-widest block font-mono">Délai de Livraison sur Chantier</span>
              <span className="text-base font-bold text-red-700 mt-1">
                {project.delaiLivraisonChantier 
                  ? new Date(project.delaiLivraisonChantier).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                  : "Non renseigné"
                }
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
