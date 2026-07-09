export enum UserRole {
  LECTEUR = "Lecteur",
  EDITEUR = "Éditeur",
  ADMIN = "Administrateur"
}

export enum UserStatus {
  PENDING = "En attente",
  APPROVED = "Approuvé",
  SUSPENDED = "Suspendu"
}

export interface User {
  id: string;
  email: string;
  nom: string;
  role: UserRole;
  status: UserStatus;
  allowedProjectIds?: string[]; // Affaires réalisées / autorisées par l'administrateur
  allowedClientIds?: string[]; // Clients autorisés à être visualisés
  poste?: string; // Poste ou rôle dans la société (ex. Conducteur de travaux, Dessinateur, etc.)
  createdAt: string;
}

export interface Client {
  id: string;
  nom: string;
  adresse: string;
  coutHoraireMO: number; // €/heure
  fraisGenerauxPct?: number; // % frais généraux standard
  createdAt?: string;
}

export interface Subcontractor {
  id: string;
  nom: string;
  adresse: string;
  coutHoraireMO: number; // €/heure
  fraisGenerauxPct?: number; // % frais généraux standard
  createdAt?: string;
}

export enum ProjectStatus {
  EN_COURS = "En cours",
  TERMINEE = "Terminée"
}

export interface Project {
  id: string;
  nomAffaire: string;
  nomZone: string;
  numCommande: string;
  dateCommande: string; // YYYY-MM-DD
  clientId: string; // Foreing key to Client
  poidsTotal: number; // kg
  poidsPRS?: number; // kg (Optional)
  quantiteMl?: number; // Quantity in meters (Optional)
  poidsPDC?: number; // kg (Optional)
  protection: string; // e.g., Galvanisation / Peinture
  dessinateur: string;
  conducteurTravaux: string;
  delaiLivraisonProtection?: string; // YYYY-MM-DD
  delaiLivraisonChantier: string; // YYYY-MM-DD
  sousTraitantId: string; // Foreign key to Subcontractor
  status?: ProjectStatus; // Status of project
  typeOuvrage?: string; // Type d'ouvrage
  remarquesPrestation?: string; // Remarques ou informations supplémentaires pour la fiche de prestation
  createdAt?: string;
  checklistClient?: Record<string, boolean>;
  checklistSubcontractor?: Record<string, boolean>;
}

export enum BillingStatus {
  BROUILLON = "Brouillon",
  ENVOYEE = "Envoyée",
  PAYEE = "Payée",
  REJETEE = "Rejetée"
}

export enum BillingUnit {
  KG = "kg",
  ML = "ml",
  HEURE = "heures",
  FORFAIT = "forfait",
  ENS = "Ens",
  U = "U"
}

export interface Billing {
  id: string;
  projetId: string; // Linked project (supplies Nom de l'affaire, Zone, Client, Subcontractor)
  projetIds?: string[]; // Multiple associated zones/projects
  typePrestation: string; // Type of work
  quantiteFacturee: number;
  uniteFacturee: BillingUnit;
  prixUnitaire: number; // €
  etatFacturation: BillingStatus;
  dateFacturation: string; // YYYY-MM-DD
  dateEcheance: string; // YYYY-MM-DD
  factureRecue?: boolean; // Indique si la facture a été bien reçue
  createdAt?: string;
  commentaire?: string;
}

export interface Budget {
  id: string;
  projetId: string; // Foreign key to Project (supplies nomAffaire and nomZone)
  poidsVendu: number; // kg
  budgetFourniture: number; // €
  budgetMainOeuvre: number; // €
  budgetSousTraitance: number; // €
  fraisGenerauxPct: number; // % (e.g. 10 representing 10%)
  // Decomposed categories requested by user
  budgetAciers?: number;
  budgetPeinture?: number;
  budgetDivers?: number;
  budgetTransport?: number;
  budgetProtection?: number;
  budgetHeuresMO?: number; // hours of labour for H/T formula
}

export interface Realise {
  id: string;
  projetId: string; // Foreign key to Project (supplies nomAffaire and nomZone)
  poidsFabrique: number; // kg
  achatsFournitureRealise: number; // €
  achatsMainOeuvreRealise: number; // €
  achatsSousTraitanceRealise: number; // €
  fraisGenerauxPct: number; // % (e.g. 10 representing 10%)
  // Decomposed categories requested by user
  achatsAciersRealise?: number;
  achatsPeintureRealise?: number;
  achatsDiversRealise?: number;
  achatsTransportRealise?: number;
  achatsProtectionRealise?: number;
  achatsHeuresMO?: number; // hours of labour for H/T formula
}
// ─── INTERLOCUTEURS ───────────────────────────────────────────────────────────
// Personnes physiques rattachées à un client ou sous-traitant
export interface Interlocuteur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: "client" | "subcontractor"; // rattachement
  entiteId: string;                  // id du client ou sous-traitant
  createdAt: string;
}

// ─── TÂCHES-TYPE ──────────────────────────────────────────────────────────────
// Libellés prédéfinis pour la création rapide de tâches
export interface TacheType {
  id: string;
  libelle: string;
  createdAt: string;
}

// ─── TÂCHES ───────────────────────────────────────────────────────────────────
export type TacheStatut = "A_FAIRE" | "EN_COURS" | "TERMINEE";

export interface Relance {
  id: string;
  date: string;       // ISO string avec heure
  note?: string;      // note optionnelle lors de la relance
}

export interface Tache {
  id: string;
  projetId: string;                 // affaire liée (obligatoire)
  libelle: string;                  // tâche-type choisie ou texte libre
  interlocuteurId: string;          // personne désignée
  dateEcheance: string;             // date limite
  statut: TacheStatut;
  relances: Relance[];              // historique des relances
  createdAt: string;
  completedAt?: string;             // date de clôture si terminée
}