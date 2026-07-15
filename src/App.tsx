import React, { useState, useEffect } from "react";
import { 
  User, 
  UserRole, 
  UserStatus, 
  Client, 
  Subcontractor, 
  Project, 
  Billing, 
  Budget, 
  Realise,
  ProjectStatus,
  BillingStatus,
  Interlocuteur,
  Tache,
  TacheType
} from "./types";
import { api } from "./lib/api";
import * as XLSX from "xlsx";
import { 
  Briefcase, 
  Users, 
  Database, 
  DollarSign, 
  Calculator, 
  UserCheck, 
  LogOut, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Printer, 
  FileSpreadsheet, 
  Layers, 
  Sliders, 
  ChevronRight, 
  SlidersHorizontal,
  Info,
  AlertTriangle,
  Eye,
  EyeOff,
  ListTodo,
  Mail,
  Phone
} from "lucide-react";

// Sub-components
import PrestationPrint from "./components/PrestationPrint";
import ProjectModal from "./components/ProjectModal";
import BillingModal from "./components/BillingModal";
import BudgetRealiseModal from "./components/BudgetRealiseModal";
import flowfabLogo from "./assets/images/flowfab_logo_1780546723025.png";
import ClientSubModal from "./components/ClientSubModal";
import AdminPanel from "./components/AdminPanel";
import DashboardView from "./components/DashboardView";
import ProfileView from "./components/ProfileView";
import BillingPrintModal from "./components/BillingPrintModal";
import BudgetRealisePrintModal from "./components/BudgetRealisePrintModal";
import TasksView from "./components/TasksView";
import ContactModal from "./components/ContactModal";
import CalendarView from "./components/CalendarView";

// Helper générique d'export Excel (SheetJS)
const exportToExcel = (data: Record<string, any>[], fileName: string, sheetName: string = "Feuille1") => {
  if (!data || data.length === 0) {
    alert("Aucune donnée à exporter pour les filtres actuellement appliqués.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginView, setIsLoginView] = useState(true); // Login vs Register tab

  // Détection d'un lien d'invitation dans l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get("token");
  const inviteEmail = urlParams.get("email");
  const isInvitePage = window.location.pathname === "/invite" && !!inviteToken && !!inviteEmail;

  // States pour la page d'invitation
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePassword2, setInvitePassword2] = useState("");
  const [inviteCheckLoading, setInviteCheckLoading] = useState(false);
  const [inviteCheckResult, setInviteCheckResult] = useState<any>(null);
  const [inviteSubmitLoading, setInviteSubmitLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  
  // Auth form states
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nomInput, setNomInput] = useState("");
  const [requestedRole, setRequestedRole] = useState(UserRole.LECTEUR);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // App core database state
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [realises, setRealises] = useState<Realise[]>([]);
  const [interlocuteurs, setInterlocuteurs] = useState<Interlocuteur[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [tachesType, setTachesType] = useState<TacheType[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Layout active tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "projects" | "budgets_realises" | "billings" | "directory" | "tasks" | "calendar" | "profil">("dashboard");

  // Modal interlocuteur
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedContactForEdit, setSelectedContactForEdit] = useState<Interlocuteur | undefined>(undefined);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterBillingStatus, setFilterBillingStatus] = useState<string>("");
  const [filterTypeOuvrage, setFilterTypeOuvrage] = useState("");
  const [typesOuvrage, setTypesOuvrage] = useState<string[]>([]);
  const [filterDateDebut, setFilterDateDebut] = useState("");
  const [filterDateFin, setFilterDateFin] = useState("");
  const [filterDateType, setFilterDateType] = useState<"facturation" | "echeance">("facturation");

  // Affichage ou masquage des affaires archivées (facturées) - masquées par défaut
  const [showArchived, setShowArchived] = useState(false);

  // Affichage ou masquage des factures déjà payées - masquées par défaut
  const [showPaidBillings, setShowPaidBillings] = useState(false);

  // Sort States
  const [projectsSort, setProjectsSort] = useState<{ field: string; order: "asc" | "desc" } | null>({ field: "nomAffaire", order: "asc" });
  const [bloc1Sort, setBloc1Sort] = useState<{ field: string; order: "asc" | "desc" } | null>({ field: "nomAffaire", order: "asc" });
  const [bloc2Sort, setBloc2Sort] = useState<{ field: string; order: "asc" | "desc" } | null>({ field: "nomAffaire", order: "asc" });
  const [billingsSort, setBillingsSort] = useState<{ field: string; order: "asc" | "desc" } | null>({ field: "nomAffaire", order: "asc" });

  const getSortIcon = (field: string, currentSort: { field: string; order: "asc" | "desc" } | null) => {
    if (!currentSort || currentSort.field !== field) {
      return <span className="text-slate-350 ml-1.5 select-none text-[10px] inline-block font-sans font-normal">⇅</span>;
    }
    return currentSort.order === "asc" ? (
      <span className="text-teal-600 font-bold ml-1 text-[11px] inline-block">▲</span>
    ) : (
      <span className="text-teal-600 font-bold ml-1 text-[11px] inline-block">▼</span>
    );
  };

  const handleSortToggle = (
    field: string,
    currentSort: { field: string; order: "asc" | "desc" } | null,
    setSort: React.Dispatch<React.SetStateAction<{ field: string; order: "asc" | "desc" } | null>>
  ) => {
    if (!currentSort || currentSort.field !== field) {
      setSort({ field, order: "asc" });
    } else if (currentSort.order === "asc") {
      setSort({ field, order: "desc" });
    } else {
      setSort(null);
    }
  };

  // Modal control states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | undefined>(undefined);

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [selectedBillingForEdit, setSelectedBillingForEdit] = useState<Billing | undefined>(undefined);

  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [financeProject, setFinanceProject] = useState<Project | null>(null);

  const [isClientSubModalOpen, setIsClientSubModalOpen] = useState(false);
  const [clientSubModalType, setClientSubModalType] = useState<"client" | "subcontractor">("client");
  const [selectedClientSubForEdit, setSelectedClientSubForEdit] = useState<any>(undefined);

  // Printable View state
  const [printableProject, setPrintableProject] = useState<Project | null>(null);
  const [isPrintBillingModalOpen, setIsPrintBillingModalOpen] = useState(false);
  const [selectedBillingForPrint, setSelectedBillingForPrint] = useState<Billing | null>(null);
  const [isPrintFinanceModalOpen, setIsPrintFinanceModalOpen] = useState(false);
  const [selectedProjectForFinancePrint, setSelectedProjectForFinancePrint] = useState<Project | null>(null);

  // Custom confirmation modal state to bypass iframe window.confirm restriction
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
  });

  const handleQuickPeriod = (type: "J" | "S" | "M" | "T" | "Se" | "A" | "X") => {
    if (type === "X") {
      setFilterDateDebut("");
      setFilterDateFin("");
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

    setFilterDateDebut(start);
    setFilterDateFin(end);
  };

  // Load user session on boot + vérifier token d'invitation
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = api.getToken();
        if (token) {
          const res = await api.getMe();
          setUser(res.user);
        }
      } catch (err) {
        api.setToken(null);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchSession();

    // Si on est sur la page d'invitation, vérifier le token
    if (isInvitePage && inviteToken && inviteEmail) {
      setInviteCheckLoading(true);
      api.request<any>(`/api/auth/check-invitation?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(inviteEmail)}`)
        .then(res => setInviteCheckResult(res))
        .catch(() => setInviteCheckResult({ valid: false, error: "Erreur de vérification." }))
        .finally(() => setInviteCheckLoading(false));
    }
  }, []);

  // Fetch all database records when user is approved
  const loadWorkspaceData = async () => {
    if (!user || user.status !== UserStatus.APPROVED) return;
    try {
      setDataLoading(true);
      const [p, c, s, b, bd, r, to, inter, tch, tt] = await Promise.all([
        api.getProjects(),
        api.getClients(),
        api.getSubcontractors(),
        api.getBillings(),
        api.getBudgets(),
        api.getRealises(),
        api.getTypesOuvrage(),
        (api as any).getInterlocuteurs(),
        (api as any).getTaches(),
        (api as any).getTachesType()
      ]);
      setProjects(p);
      setClients(c);
      setSubcontractors(s);
      setBillings(b);
      setBudgets(bd);
      setRealises(r);
      setTypesOuvrage(to);
      setInterlocuteurs(inter || []);
      setTaches(tch || []);
      setTachesType(tt || []);
    } catch (err: any) {
      console.error("Échec du chargement des bases :", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [user]);

  // Auth Submit handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await api.login(emailInput, passwordInput);
      api.setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setAuthError(err?.message || "Identifiant ou mot de passe incorrect.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await api.register(emailInput, nomInput, passwordInput, requestedRole);
      setAuthSuccess(res.message);
      setIsLoginView(true);
      // Clear password and inputs which are no longer needed
      setPasswordInput("");
    } catch (err: any) {
      setAuthError(err?.message || "Échec d'envoi de la demande de compte.");
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    // Reset inputs
    setEmailInput("");
    setPasswordInput("");
  };

  // Quick Account selector helper for evaluation
  const handleQuickFill = (email: string, pass: string) => {
    setEmailInput(email);
    setPasswordInput(pass);
    setAuthError(null);
  };

  // CRUD Event listeners passed to modals
  const handleSaveProject = async (data: Partial<Project>) => {
    if (selectedProjectForEdit) {
      // Edit mode
      await api.updateProject(selectedProjectForEdit.id, data);
    } else {
      // Add mode
      await api.createProject(data);
    }
    await loadWorkspaceData();
  };

  const handleDeleteProject = async (projId: string, nomAffaire: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Suppression définitive d'affaire",
      message: `Confirmez-vous la suppression de l'affaire "${nomAffaire}" ? Cette action nettoiera également tous les budgets, réalisés et factures associés de manière irréversible.`,
      onConfirm: async () => {
        try {
          await api.deleteProject(projId);
          await loadWorkspaceData();
        } catch (err: any) {
          console.error(err);
        }
      }
    });
  };

  const handleSaveBilling = async (data: Partial<Billing>) => {
    if (selectedBillingForEdit) {
      await api.updateBilling(selectedBillingForEdit.id, data);
    } else {
      await api.createBilling(data);
    }
    await loadWorkspaceData();
  };

  const handleDeleteBilling = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Supprimer ligne de facturation",
      message: "Êtes-vous sûr de vouloir supprimer définitivement cette ligne de facturation ?",
      onConfirm: async () => {
        try {
          await api.deleteBilling(id);
          await loadWorkspaceData();
        } catch (err: any) {
          console.error(err);
        }
      }
    });
  };

  const handleSaveFinance = async (budgetId: string, bUpdate: Partial<Budget>, realiseId: string, rUpdate: Partial<Realise>) => {
    await api.updateBudget(budgetId, bUpdate);
    await api.updateRealise(realiseId, rUpdate);
    await loadWorkspaceData();
  };

  // ── Handlers Interlocuteurs ──────────────────────────────────────────────
  const handleSaveContact = async (data: Partial<Interlocuteur>) => {
    if (selectedContactForEdit) {
      await (api as any).updateInterlocuteur(selectedContactForEdit.id, data);
    } else {
      await (api as any).createInterlocuteur(data);
    }
    await loadWorkspaceData();
  };

  const handleDeleteContact = async (id: string, nom: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Supprimer l'interlocuteur",
      message: `Confirmez-vous la suppression de "${nom}" ? Cet interlocuteur ne sera plus disponible dans les tâches.`,
      onConfirm: async () => {
        await (api as any).deleteInterlocuteur(id);
        await loadWorkspaceData();
      }
    });
  };

  // ── Handlers Tâches ──────────────────────────────────────────────────────
  const handleSaveTache = async (data: any) => {
    await (api as any).createTache(data);
    await loadWorkspaceData();
  };

  const handleUpdateTache = async (id: string, data: any) => {
    await (api as any).updateTache(id, data);
    await loadWorkspaceData();
  };

  const handleRelancerTache = async (id: string, note?: string) => {
    await (api as any).relancerTache(id, note);
    await loadWorkspaceData();
  };

  const handleDeleteTache = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Supprimer la tâche",
      message: "Confirmez-vous la suppression définitive de cette tâche et de son historique de relances ?",
      onConfirm: async () => {
        await (api as any).deleteTache(id);
        await loadWorkspaceData();
      }
    });
  };

  const handleSaveClientSub = async (type: "client" | "subcontractor", data: any) => {
    if (type === "client") {
      if (selectedClientSubForEdit) {
        await api.updateClient(selectedClientSubForEdit.id, data);
      } else {
        await api.createClient(data);
      }
    } else {
      if (selectedClientSubForEdit) {
        await api.updateSubcontractor(selectedClientSubForEdit.id, data);
      } else {
        await api.createSubcontractor(data);
      }
    }
    await loadWorkspaceData();
  };

  const handleDeleteClientSub = async (type: "client" | "subcontractor", id: string, name: string) => {
    const doubleCheckText = type === "client" 
      ? `ATTENTION : La suppression de la société cliente "${name}" entraînera également la suppression en CASCADE de tous ses projets, budgets, achats réalisés et facturations associés !\n\nConfirmez-vous cette action de suppression définitive ?`
      : `ATTENTION : La suppression du sous-traitant "${name}" entraînera également la suppression en CASCADE de tous ses projets de fabrication, budgets, achats réalisés et facturations associés !\n\nConfirmez-vous cette action de suppression définitive ?`;

    setConfirmModal({
      isOpen: true,
      title: type === "client" ? "Suppression de Client" : "Suppression de Sous-traitant",
      message: doubleCheckText,
      onConfirm: async () => {
        try {
          if (type === "client") {
            await api.deleteClient(id);
          } else {
            await api.deleteSubcontractor(id);
          }
          await loadWorkspaceData();
        } catch (err: any) {
          console.error(err);
        }
      }
    });
  };

  // Get only permitted arrays for non-admin users
  const permittedProjects = projects.filter(p => {
    if (!user || user.role === UserRole.ADMIN) return true;
    const hasProjectLimit = Array.isArray(user.allowedProjectIds) && user.allowedProjectIds.length > 0;
    const hasClientLimit = Array.isArray(user.allowedClientIds) && user.allowedClientIds.length > 0;
    if (hasProjectLimit || hasClientLimit) {
      const isProjectAllowed = hasProjectLimit && user.allowedProjectIds?.includes(p.id);
      const isClientAllowed = hasClientLimit && user.allowedClientIds?.includes(p.clientId);
      return !!(isProjectAllowed || isClientAllowed);
    }
    return true;
  });

  const permittedBillings = billings.filter(b => {
    if (!user || user.role === UserRole.ADMIN) return true;
    const proj = projects.find(p => p.id === b.projetId);
    if (!proj) return false;
    const hasProjectLimit = Array.isArray(user.allowedProjectIds) && user.allowedProjectIds.length > 0;
    const hasClientLimit = Array.isArray(user.allowedClientIds) && user.allowedClientIds.length > 0;
    if (hasProjectLimit || hasClientLimit) {
      const isProjectAllowed = hasProjectLimit && (user.allowedProjectIds?.includes(b.projetId) || b.projetIds?.some(id => user.allowedProjectIds?.includes(id)));
      const isClientAllowed = hasClientLimit && user.allowedClientIds?.includes(proj.clientId);
      return !!(isProjectAllowed || isClientAllowed);
    }
    return true;
  });

  // Liste des clients réellement visibles par l'utilisateur (Annuaire + menus déroulants de filtre)
  const permittedClients = clients.filter(c => {
    if (!user || user.role === UserRole.ADMIN) return true;
    const hasClientLimit = Array.isArray(user.allowedClientIds) && user.allowedClientIds.length > 0;
    if (hasClientLimit) {
      return user.allowedClientIds!.includes(c.id);
    }
    return true;
  });

  // Une affaire est considérée "Archivée" dès qu'elle possède au moins une ligne
  // de facturation au statut "Envoyée" ou "Payée" (= affaire facturée)
  const isProjectArchived = (projectId: string) => {
    return billings.some(b =>
      (b.projetId === projectId || b.projetIds?.includes(projectId)) &&
      (b.etatFacturation === BillingStatus.ENVOYEE || b.etatFacturation === BillingStatus.PAYEE)
    );
  };

  const archivedProjectsCount = permittedProjects.filter(p => isProjectArchived(p.id)).length;
  const paidBillingsCount = permittedBillings.filter(b => b.etatFacturation === BillingStatus.PAYEE).length;

  // Filtering calculations applied to Projets, Budgets, and Réalisés
  const filteredProjects = permittedProjects.filter(p => {
    const matchesKeyword = p.nomAffaire.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.nomZone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.numCommande.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.dessinateur && p.dessinateur.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.conducteurTravaux && p.conducteurTravaux.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesClient = filterClient === "" || p.clientId === filterClient;
    const matchesSub = filterSub === "" || p.sousTraitantId === filterSub;
    const matchesStatus = filterStatus === ""
      ? true
      : filterStatus === "ARCHIVED"
        ? isProjectArchived(p.id)
        : p.status === filterStatus;
    const matchesTypeOuvrage = filterTypeOuvrage === "" || p.typeOuvrage === filterTypeOuvrage;
    const matchesArchiveVisibility = filterStatus === "ARCHIVED" ? true : (showArchived ? true : !isProjectArchived(p.id));

    return matchesKeyword && matchesClient && matchesSub && matchesStatus && matchesTypeOuvrage && matchesArchiveVisibility;
  });

  // Filters billing uniquely
  const filteredBillings = permittedBillings.filter(b => {
    const proj = projects.find(p => p.id === b.projetId);
    if (!proj) return false;
    
    const matchesKeyword = proj.nomAffaire.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          proj.nomZone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.typePrestation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClient = filterClient === "" || proj.clientId === filterClient;
    const matchesSub = filterSub === "" || proj.sousTraitantId === filterSub;
    const matchesTypeOuvrage = filterTypeOuvrage === "" || proj.typeOuvrage === filterTypeOuvrage;
    const matchesBillingStatus = filterBillingStatus === "" || b.etatFacturation === filterBillingStatus;
    const matchesPaidVisibility = filterBillingStatus === BillingStatus.PAYEE
      ? true
      : (showPaidBillings ? true : b.etatFacturation !== BillingStatus.PAYEE);
    
    let matchesDateDebut = true;
    let matchesDateFin = true;
    const targetDateStr = filterDateType === "facturation" ? b.dateFacturation : b.dateEcheance;
    
    if (filterDateDebut) {
      matchesDateDebut = targetDateStr >= filterDateDebut;
    }
    if (filterDateFin) {
      matchesDateFin = targetDateStr <= filterDateFin;
    }
    
    return matchesKeyword && matchesClient && matchesSub && matchesTypeOuvrage && matchesBillingStatus && matchesPaidVisibility && matchesDateDebut && matchesDateFin;
  });

  // Sorting evaluators
  const getSortedProjects = () => {
    if (!projectsSort) return filteredProjects;
    const { field, order } = projectsSort;
    return [...filteredProjects].sort((a, b) => {
      let valA: any = a[field as keyof Project] ?? "";
      let valB: any = b[field as keyof Project] ?? "";

      if (field === "clientId") {
        valA = clients.find(c => c.id === a.clientId)?.nom || "";
        valB = clients.find(c => c.id === b.clientId)?.nom || "";
      } else if (field === "sousTraitantId") {
        valA = subcontractors.find(s => s.id === a.sousTraitantId)?.nom || "";
        valB = subcontractors.find(s => s.id === b.sousTraitantId)?.nom || "";
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return order === "asc" ? valA - valB : valB - valA;
      }
      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  };

  const getSortedBloc1 = () => {
    const listWithBudget = filteredProjects.map(p => {
      const bud = budgets.find(b => b.projetId === p.id) || {
        id: "",
        projetId: p.id,
        poidsVendu: p.poidsTotal,
        budgetFourniture: 0,
        budgetMainOeuvre: 0,
        budgetSousTraitance: 0,
        fraisGenerauxPct: 10
      };
      const subTotal = (bud.budgetFourniture || 0) + (bud.budgetMainOeuvre || 0) + (bud.budgetSousTraitance || 0);
      const multi = 1 + (bud.fraisGenerauxPct || 0) / 100;
      const finalVolume = subTotal * multi;
      return { project: p, budget: bud, finalVolume };
    });

    if (!bloc1Sort) return listWithBudget;
    const { field, order } = bloc1Sort;

    return [...listWithBudget].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (field === "nomAffaire") {
        valA = a.project.nomAffaire + " " + a.project.nomZone;
        valB = b.project.nomAffaire + " " + b.project.nomZone;
      } else if (field === "poidsVendu") {
        valA = a.budget.poidsVendu;
        valB = b.budget.poidsVendu;
      } else if (field === "budgetFourniture") {
        valA = a.budget.budgetFourniture || 0;
        valB = b.budget.budgetFourniture || 0;
      } else if (field === "budgetMainOeuvre") {
        valA = a.budget.budgetMainOeuvre || 0;
        valB = b.budget.budgetMainOeuvre || 0;
      } else if (field === "budgetSousTraitance") {
        valA = a.budget.budgetSousTraitance || 0;
        valB = b.budget.budgetSousTraitance || 0;
      } else if (field === "fraisGenerauxPct") {
        valA = a.budget.fraisGenerauxPct || 0;
        valB = b.budget.fraisGenerauxPct || 0;
      } else if (field === "finalVolume") {
        valA = a.finalVolume;
        valB = b.finalVolume;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return order === "asc" ? valA - valB : valB - valA;
      }
      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  };

  const getSortedBloc2 = () => {
    const listWithRealise = filteredProjects.map(p => {
      const real = realises.find(r => r.projetId === p.id) || {
        id: "",
        projetId: p.id,
        poidsFabrique: 0,
        achatsFournitureRealise: 0,
        achatsMainOeuvreRealise: 0,
        achatsSousTraitanceRealise: 0,
        fraisGenerauxPct: 10
      };
      const subTotal = (real.achatsFournitureRealise || 0) + (real.achatsMainOeuvreRealise || 0) + (real.achatsSousTraitanceRealise || 0);
      const multi = 1 + (real.fraisGenerauxPct || 0) / 100;
      const finalVolume = subTotal * multi;
      return { project: p, realise: real, finalVolume };
    });

    if (!bloc2Sort) return listWithRealise;
    const { field, order } = bloc2Sort;

    return [...listWithRealise].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (field === "nomAffaire") {
        valA = a.project.nomAffaire + " " + a.project.nomZone;
        valB = b.project.nomAffaire + " " + b.project.nomZone;
      } else if (field === "poidsFabrique") {
        valA = a.realise.poidsFabrique;
        valB = b.realise.poidsFabrique;
      } else if (field === "achatsFournitureRealise") {
        valA = a.realise.achatsFournitureRealise || 0;
        valB = b.realise.achatsFournitureRealise || 0;
      } else if (field === "achatsMainOeuvreRealise") {
        valA = a.realise.achatsMainOeuvreRealise || 0;
        valB = b.realise.achatsMainOeuvreRealise || 0;
      } else if (field === "achatsSousTraitanceRealise") {
        valA = a.realise.achatsSousTraitanceRealise || 0;
        valB = b.realise.achatsSousTraitanceRealise || 0;
      } else if (field === "fraisGenerauxPct") {
        valA = a.realise.fraisGenerauxPct || 0;
        valB = b.realise.fraisGenerauxPct || 0;
      } else if (field === "finalVolume") {
        valA = a.finalVolume;
        valB = b.finalVolume;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return order === "asc" ? valA - valB : valB - valA;
      }
      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  };

  const getSortedBillings = () => {
    if (!billingsSort) return filteredBillings;
    const { field, order } = billingsSort;

    return [...filteredBillings].sort((a, b) => {
      let valA: any = a[field as keyof Billing] ?? "";
      let valB: any = b[field as keyof Billing] ?? "";

      if (field === "nomAffaire") {
        const primA = projects.find(p => p.id === a.projetId);
        const primB = projects.find(p => p.id === b.projetId);
        valA = primA ? primA.nomAffaire + " " + primA.nomZone : "";
        valB = primB ? primB.nomAffaire + " " + primB.nomZone : "";
      } else if (field === "clientId") {
        const primA = projects.find(p => p.id === a.projetId);
        const primB = projects.find(p => p.id === b.projetId);
        valA = primA ? (clients.find(c => c.id === primA.clientId)?.nom || "") : "";
        valB = primB ? (clients.find(c => c.id === primB.clientId)?.nom || "") : "";
      } else if (field === "sousTraitantId") {
        const primA = projects.find(p => p.id === a.projetId);
        const primB = projects.find(p => p.id === b.projetId);
        valA = primA ? (subcontractors.find(s => s.id === primA.sousTraitantId)?.nom || "") : "";
        valB = primB ? (subcontractors.find(s => s.id === primB.sousTraitantId)?.nom || "") : "";
      } else if (field === "amountHT") {
        valA = (a.quantiteFacturee || 0) * (a.prixUnitaire || 0);
        valB = (b.quantiteFacturee || 0) * (b.prixUnitaire || 0);
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return order === "asc" ? valA - valB : valB - valA;
      }
      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  };

  // ─── Exports Excel ───

  const handleExportProjects = () => {
    const data = getSortedProjects().map(p => {
      const cl = clients.find(c => c.id === p.clientId);
      const sub = subcontractors.find(s => s.id === p.sousTraitantId);
      return {
        "État": isProjectArchived(p.id) ? "Archivée" : (p.status === ProjectStatus.TERMINEE ? "Terminée" : "En cours"),
        "Affaire": p.nomAffaire,
        "Zone": p.nomZone,
        "N° Commande": p.numCommande || "",
        "Client": cl?.nom || "",
        "Sous-traitant": sub?.nom || "",
        "Poids Global (kg)": p.poidsTotal,
        "Traitement / Protection": p.protection || "",
        "Délai Livraison Chantier": p.delaiLivraisonChantier ? new Date(p.delaiLivraisonChantier).toLocaleDateString("fr-FR") : ""
      };
    });
    exportToExcel(data, `FlowFab_Projets_${new Date().toISOString().slice(0, 10)}`, "Projets");
  };

  const handleExportBudgetsRealises = () => {
    const bloc1 = getSortedBloc1();
    const bloc2 = getSortedBloc2();

    const data = bloc1.map(item => {
      const { project: p, budget: bud, finalVolume: finalVolumeBudget } = item;
      const realiseEntry = bloc2.find(r => r.project.id === p.id);
      const real = realiseEntry ? realiseEntry.realise : {
        poidsFabrique: 0,
        achatsFournitureRealise: 0,
        achatsMainOeuvreRealise: 0,
        achatsSousTraitanceRealise: 0,
        fraisGenerauxPct: 10
      };
      const finalVolumeRealise = realiseEntry ? realiseEntry.finalVolume : 0;

      return {
        "Affaire": p.nomAffaire,
        "Zone": p.nomZone,
        "Poids Vendu (kg)": bud.poidsVendu,
        "Budget Fourniture (€)": bud.budgetFourniture || 0,
        "Budget Main d'Œuvre (€)": bud.budgetMainOeuvre || 0,
        "Budget Sous-Traitance (€)": bud.budgetSousTraitance || 0,
        "FG Budget (%)": bud.fraisGenerauxPct,
        "Volume Budget + FG (€)": finalVolumeBudget,
        "Poids Fabriqué (kg)": real.poidsFabrique,
        "Achats Fourniture Réel (€)": real.achatsFournitureRealise || 0,
        "Achats Main d'Œuvre Réel (€)": real.achatsMainOeuvreRealise || 0,
        "Achats Sous-Traitance Réel (€)": real.achatsSousTraitanceRealise || 0,
        "FG Réel (%)": real.fraisGenerauxPct,
        "Total Réel + FG (€)": finalVolumeRealise
      };
    });

    exportToExcel(data, `FlowFab_Budgets_Realises_${new Date().toISOString().slice(0, 10)}`, "Budgets-Realises");
  };

  const handleExportBillings = () => {
    const data = getSortedBillings().map(b => {
      const proj = projects.find(p => p.id === b.projetId);
      const cl = proj ? clients.find(c => c.id === proj.clientId) : null;
      const sub = proj ? subcontractors.find(s => s.id === proj.sousTraitantId) : null;
      const totalHT = (b.quantiteFacturee || 0) * (b.prixUnitaire || 0);

      return {
        "État": b.etatFacturation,
        "Affaire": proj?.nomAffaire || "",
        "Zone": proj?.nomZone || "",
        "Type de Prestation": b.typePrestation,
        "Client": cl?.nom || "",
        "Sous-traitant": sub?.nom || "",
        "Quantité": b.quantiteFacturee,
        "Unité": b.uniteFacturee,
        "Prix Unitaire (€)": b.prixUnitaire,
        "Montant H.T. (€)": totalHT,
        "Date Facture": b.dateFacturation ? new Date(b.dateFacturation).toLocaleDateString("fr-FR") : "",
        "Échéance": b.dateEcheance ? new Date(b.dateEcheance).toLocaleDateString("fr-FR") : ""
      };
    });

    exportToExcel(data, `FlowFab_Facturation_${new Date().toISOString().slice(0, 10)}`, "Facturation");
  };

  // Render authenticating screen
  // ── Page d'acceptation d'invitation ──────────────────────────────────────
  if (isInvitePage && !user) {
    const handleAcceptInvite = async () => {
      if (invitePassword !== invitePassword2) {
        setInviteError("Les mots de passe ne correspondent pas."); return;
      }
      if (invitePassword.length < 8) {
        setInviteError("Le mot de passe doit comporter au moins 8 caractères."); return;
      }
      try {
        setInviteSubmitLoading(true); setInviteError(null);
        const res = await api.request<any>("/api/auth/accept-invitation", {
          method: "POST",
          body: JSON.stringify({ token: inviteToken, email: inviteEmail, password: invitePassword })
        });
        api.setToken(res.token);
        setInviteSuccess(true);
        setTimeout(() => { window.location.href = "/"; }, 2000);
      } catch (err: any) {
        setInviteError(err?.message || "Erreur lors de la création du compte.");
      } finally {
        setInviteSubmitLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-teal-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <img src={flowfabLogo} alt="FlowFab" className="w-8 h-8 object-contain rounded bg-white p-0.5" />
              <span className="text-lg font-black tracking-widest">FLOW<span className="text-teal-200">FAB</span></span>
            </div>
            <h1 className="text-xl font-bold">Invitation à rejoindre FlowFab</h1>
            <p className="text-teal-100 text-sm mt-1">Créez votre mot de passe pour accéder à l'application</p>
          </div>
          <div className="p-8">
            {inviteCheckLoading && (
              <div className="text-center py-8 text-slate-400">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Vérification du lien...
              </div>
            )}
            {!inviteCheckLoading && inviteCheckResult?.valid === false && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🔒</div>
                <p className="text-red-600 font-bold">Lien invalide ou expiré</p>
                <p className="text-slate-400 text-sm mt-2">{inviteCheckResult.error}</p>
                <a href="/" className="mt-4 inline-block text-teal-600 hover:underline text-sm">Retour à la connexion</a>
              </div>
            )}
            {!inviteCheckLoading && inviteCheckResult?.valid && !inviteSuccess && (
              <div className="space-y-4">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-xs font-bold text-teal-800">Compte pour :</p>
                  <p className="text-sm font-bold text-slate-900">{inviteCheckResult.nom}</p>
                  <p className="text-xs text-slate-500 font-mono">{inviteCheckResult.email}</p>
                  <p className="text-[10px] text-teal-700 mt-1">Rôle : <strong>{inviteCheckResult.role}</strong></p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Choisissez votre mot de passe *</label>
                  <input type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-teal-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Confirmez votre mot de passe *</label>
                  <input type="password" value={invitePassword2} onChange={e => setInvitePassword2(e.target.value)}
                    placeholder="Retapez votre mot de passe"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-teal-500" />
                </div>
                {inviteError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{inviteError}</div>
                )}
                <button onClick={handleAcceptInvite} disabled={inviteSubmitLoading}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition text-sm">
                  {inviteSubmitLoading ? "Création du compte..." : "Créer mon compte et accéder à FlowFab"}
                </button>
              </div>
            )}
            {inviteSuccess && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-teal-700 font-bold text-lg">Compte créé avec succès !</p>
                <p className="text-slate-400 text-sm mt-2">Redirection en cours...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white p-4">
        <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-mono tracking-widest text-teal-400">CONNEXION AUX SERVEURS FLOWFAB...</p>
      </div>
    );
  }

  // Render Login structure if user not connected
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex grid grid-cols-1 lg:grid-cols-12 text-slate-200">
        
        {/* Left Marketing Banner Section */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 p-8 md:p-12 flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              {/* BRAND IMAGE LOGO */}
              <img 
                src={flowfabLogo} 
                alt="FlowFab Premium Logo" 
                className="w-10 h-10 object-contain rounded-lg shadow-md border border-slate-700/50 bg-white"
              />
              <span className="text-xl font-black text-white tracking-widest">FLOW<span className="text-teal-500">FAB</span></span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-8 tracking-tight leading-tight">
              Suivez vos affaires sous-traitées en fabrication avec simplicité.
            </h1>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              FlowFab centralise et relie vos bases de Projets, Sous-Traitants, Budgets, Réalisés et Facturations techniques pour une gestion rigoureuse et unifiée de l'atelier de fabrication.
            </p>
          </div>



          <p className="text-xs text-slate-500 mt-8 font-mono">FlowFab v3.1.4 • Pilotage de Fabrication</p>
        </div>

        {/* Right Form Input Section */}
        <div className="lg:col-span-7 flex flex-col justify-center p-6 md:p-12 max-w-xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-2xl overflow-hidden p-6 md:p-8 space-y-6">
            
            {/* Form Toggle Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => { setIsLoginView(true); setAuthError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold text-center transition ${isLoginView ? "text-teal-400 border-b-2 border-teal-500" : "text-slate-400 hover:text-slate-200"}`}
              >
                Se connecter
              </button>
              <button
                onClick={() => { setIsLoginView(false); setAuthError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold text-center transition ${!isLoginView ? "text-teal-400 border-b-2 border-teal-500" : "text-slate-400 hover:text-slate-200"}`}
              >
                Demander un compte
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded-lg">
                ❌ {authError}
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-teal-950/40 border border-teal-800 text-teal-200 text-xs rounded-lg">
                ✅ {authSuccess}
              </div>
            )}

            {isLoginView ? (
              // Login View
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 font-mono">ADRESSE MAIL</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    placeholder="jean.dupont@emg.bzh"
                    className="w-full text-sm bg-slate-950 border border-slate-800 focus:outline-teal-500 text-slate-100 px-3.5 py-2.5 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 font-mono">MOT DE PASSE</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full text-sm bg-slate-950 border border-slate-800 focus:outline-teal-500 text-slate-100 px-3.5 py-2.5 rounded-lg"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full text-sm font-bold bg-teal-500 hover:bg-teal-600 text-slate-950 py-3 rounded-lg mt-3 shadow-md transition"
                >
                  Valider et s'authentifier
                </button>
              </form>
            ) : (
              // Register View
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 font-mono">NOM DE COLLABORATEUR</label>
                  <input
                    type="text"
                    value={nomInput}
                    onChange={(e) => setNomInput(e.target.value)}
                    required
                    placeholder="Marc Lucas"
                    className="w-full text-sm bg-slate-950 border border-slate-800 focus:outline-teal-500 text-slate-100 px-3.5 py-2.5 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 font-mono">ADRESSE EMAIL PROFESSIONNELLE</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    placeholder="nom.prenom@emg.bzh"
                    className="w-full text-sm bg-slate-950 border border-slate-800 focus:outline-teal-500 text-slate-100 px-3.5 py-2.5 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 font-mono">MOT DE PASSE SOUHAITÉ</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    placeholder="Créer un mot de passe d'accès"
                    className="w-full text-sm bg-slate-950 border border-slate-800 focus:outline-teal-500 text-slate-100 px-3.5 py-2.5 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 font-mono">FONCTION / HABILITATION DEMANDÉE</label>
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                    className="w-full text-sm bg-slate-950 border border-slate-800 focus:outline-teal-500 text-slate-100 px-3.5 py-2.5 rounded-lg"
                  >
                    <option value={UserRole.LECTEUR}>Lecteur (Lecture Seule)</option>
                    <option value={UserRole.EDITEUR}>Éditeur (Modifications Possibles)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full text-sm font-bold bg-teal-500 hover:bg-teal-600 text-slate-950 py-3 rounded-lg mt-3 transition"
                >
                  Soumettre l'inscription à l'Administrateur
                </button>
              </form>
            )}

            <div className="text-[11px] text-slate-500 leading-relaxed text-center pt-2">
              Note : Pour toute première connexion, pensez à demander un compte.
            </div>

          </div>
        </div>

      </div>
    );
  }

  // Render Printable View uniquely
  if (printableProject) {
    const projClient = clients.find(c => c.id === printableProject.clientId);
    const projSub = subcontractors.find(s => s.id === printableProject.sousTraitantId);
    return (
      <PrestationPrint 
        project={printableProject}
        client={projClient}
        subcontractor={projSub}
        onClose={() => setPrintableProject(null)}
        user={user}
      />
    );
  }

  // Standard Main Workspace layout
  const isWritable = user.role !== UserRole.LECTEUR;
  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* 1. Header Toolbar */}
      <header className="bg-slate-900 text-white px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <img 
            src={flowfabLogo} 
            alt="FlowFab Logo" 
            className="w-8 h-8 rounded-md bg-white p-0.5 object-contain"
          />
          <div>
            <span className="text-lg font-black tracking-wider text-white">FLOW<span className="text-teal-400">FAB</span></span>
            <span className="hidden md:inline-block ml-3 px-2 py-0.5 bg-slate-800 text-[10px] uppercase font-mono tracking-widest text-slate-400 rounded">SUIVI PROJETS DE FABRICATION</span>
          </div>
        </div>

        {/* User Identity context widget */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-teal-400 flex items-center justify-center font-bold text-xs uppercase">
              {user.nom.substring(0,2)}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <span className="text-slate-100 font-bold block">{user.nom}</span>
              <span className="text-gray-400 text-[10px] block font-mono">{user.role} ({user.email})</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg transition"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 w-full max-w-[95vw] xl:max-w-[92vw] mx-auto p-3 md:p-5 space-y-5">
        
        {/* Workspace Title & Navigation Sheet Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-2">
          
          {/* Navigation link triggers */}
          <nav className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === "dashboard" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              📈 Indicateurs & Synthèse
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === "projects" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              🏗️ Projets
            </button>
            <button
              onClick={() => setActiveTab("budgets_realises")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === "budgets_realises" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              📊 Budgets/Réalisés
            </button>
            <button
              onClick={() => setActiveTab("billings")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === "billings" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              🧾 Facturation
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === "directory" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              👥 Annuaire
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === "tasks" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <ListTodo className="w-4 h-4" />
              Tâches
              {taches.filter(t => t.statut !== "TERMINEE").length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${taches.some(t => t.statut !== "TERMINEE" && new Date(t.dateEcheance) < new Date()) ? "bg-red-500 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                  {taches.filter(t => t.statut !== "TERMINEE").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${activeTab === "calendar" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              📅 Calendrier
            </button>
            <button
              onClick={() => setActiveTab("profil")}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === "profil" ? "bg-slate-900 text-white shadow-xs" : "text-gray-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              👤 Profil
            </button>
          </nav>

          {/* Special Admin Tab */}
          {isAdmin && (
            <button
              onClick={() => (setActiveTab as any)("admin_users")}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition ${activeTab === ("admin_users" as any) ? "bg-red-700 text-white" : "text-red-700 hover:bg-red-50"}`}
            >
              <UserCheck className="w-4 h-4" />
              🔑 Habilitations d'accès
            </button>
          )}

        </div>

        {/* Global Multi-Filter Tool - Not applicable to Admin panel or Profil */}
        {activeTab !== "dashboard" && activeTab !== "profil" && activeTab !== "tasks" && activeTab !== "calendar" && activeTab !== ("admin_users" as any) && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">⚡ Filtres généraux de recherche avancée :</span>
            <div className={`grid grid-cols-1 ${activeTab === "billings" || activeTab === "projects" ? "md:grid-cols-4" : "md:grid-cols-6"} gap-3`}>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher affaire, zone, PO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-500 text-slate-800 bg-white"
                />
              </div>

              <div>
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="w-full text-sm py-2 px-3 border border-slate-300 rounded-lg focus:outline-teal-500 text-slate-800 bg-white"
                >
                  <option value="">-- Tous les Clients --</option>
                  {permittedClients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterSub}
                  onChange={(e) => setFilterSub(e.target.value)}
                  className="w-full text-sm py-2 px-3 border border-slate-300 rounded-lg focus:outline-teal-500 text-slate-800 bg-white"
                >
                  <option value="">-- Tous les Sous-traitants --</option>
                  {subcontractors.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </div>

              {activeTab === "billings" ? (
                <div>
                  <select
                    value={filterBillingStatus}
                    onChange={(e) => setFilterBillingStatus(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-300 rounded-lg focus:outline-teal-500 text-slate-800 bg-white"
                  >
                    <option value="">-- État de la Facturation --</option>
                    <option value={BillingStatus.BROUILLON}>Brouillon</option>
                    <option value={BillingStatus.ENVOYEE}>Envoyée</option>
                    <option value={BillingStatus.PAYEE}>Payée</option>
                    <option value={BillingStatus.REJETEE}>Rejetée</option>
                  </select>
                </div>
              ) : activeTab === "projects" ? (
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-300 rounded-lg focus:outline-teal-500 text-slate-800 bg-white"
                  >
                    <option value="">-- État de la Fabrication --</option>
                    <option value={ProjectStatus.EN_COURS}>🟢 En cours</option>
                    <option value={ProjectStatus.TERMINEE}>🔴 Terminée</option>
                    <option value="ARCHIVED">⚪ Archivée (Facturée)</option>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <select
                      value={filterTypeOuvrage}
                      onChange={(e) => setFilterTypeOuvrage(e.target.value)}
                      className="w-full text-sm py-2 px-3 border border-slate-300 rounded-lg focus:outline-teal-500 text-slate-800 bg-white"
                    >
                      <option value="">-- Tous les Ouvrages --</option>
                      {typesOuvrage.map(to => (
                        <option key={to} value={to}>{to}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full text-sm py-2 px-3 border border-slate-300 rounded-lg focus:outline-teal-500 text-slate-800 bg-white"
                    >
                      <option value="">-- Tous les États --</option>
                      <option value={ProjectStatus.EN_COURS}>🟢 En cours</option>
                      <option value={ProjectStatus.TERMINEE}>🔴 Terminée</option>
                    </select>
                  </div>
                </>
              )}

              <div className={`flex items-center justify-end gap-3 ${activeTab === "billings" || activeTab === "projects" || activeTab === "budgets_realises" ? "md:col-span-4" : ""}`}>
                {(activeTab === "projects" || activeTab === "budgets_realises") && (
                  <button
                    type="button"
                    onClick={() => setShowArchived(prev => !prev)}
                    className={`text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition border ${
                      showArchived
                        ? "bg-slate-700 text-white border-slate-700 hover:bg-slate-800"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                    title="Les affaires facturées (Envoyées ou Payées) basculent automatiquement en Archivé et sont masquées par défaut"
                  >
                    {showArchived ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showArchived ? "Masquer" : "Afficher"} les archivées ({archivedProjectsCount})
                  </button>
                )}
                {activeTab === "billings" && (
                  <button
                    type="button"
                    onClick={() => setShowPaidBillings(prev => !prev)}
                    className={`text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition border ${
                      showPaidBillings
                        ? "bg-slate-700 text-white border-slate-700 hover:bg-slate-800"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                    title="Les factures au statut Payée sont masquées par défaut"
                  >
                    {showPaidBillings ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showPaidBillings ? "Masquer" : "Afficher"} les payées ({paidBillingsCount})
                  </button>
                )}
                <button
                  onClick={() => { 
                    setSearchQuery(""); 
                    setFilterClient(""); 
                    setFilterSub(""); 
                    setFilterStatus(""); 
                    setFilterTypeOuvrage(""); 
                    setFilterBillingStatus(""); 
                    setFilterDateDebut("");
                    setFilterDateFin("");
                    setFilterDateType("facturation");
                  }}
                  className="text-xs text-gray-400 hover:text-teal-600 hover:underline font-mono"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>

            {/* Billing period filter row */}
            {activeTab === "billings" && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider font-mono text-[9px]">📅 Période du :</span>
                  <input
                    type="date"
                    value={filterDateDebut}
                    onChange={(e) => setFilterDateDebut(e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 focus:outline-teal-500 text-slate-800 bg-white"
                  />
                  <span className="font-semibold text-slate-500 uppercase tracking-wider font-mono text-[9px]">au :</span>
                  <input
                    type="date"
                    value={filterDateFin}
                    onChange={(e) => setFilterDateFin(e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 focus:outline-teal-500 text-slate-800 bg-white"
                  />

                  {/* Boutons de raccourci de période */}
                  <div className="flex items-center gap-1.5 ml-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-3xs">
                    {[
                      { label: "J", title: "Aujourd'hui (Jour)", val: "J" },
                      { label: "S", title: "Cette semaine (Semaine)", val: "S" },
                      { label: "M", title: "Ce mois (Mois)", val: "M" },
                      { label: "T", title: "Ce trimestre (Trimestre)", val: "T" },
                      { label: "Se", title: "Ce semestre (Semestre)", val: "Se" },
                      { label: "A", title: "Cette année (Année)", val: "A" },
                      { label: "X", title: "Effacer le filtre de période", val: "X" }
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => handleQuickPeriod(btn.val as any)}
                        title={btn.title}
                        className={`px-2 py-1 bg-white rounded-md text-[10px] border border-slate-200 transition-all cursor-pointer shadow-3xs active:scale-95 font-extrabold ${
                          btn.val === "X"
                            ? "text-red-600 hover:bg-red-50 hover:text-red-800 hover:border-red-300"
                            : "text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider font-mono text-[9px]">🔍 Date de référence :</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-750">
                    <input
                      type="radio"
                      name="dateType"
                      value="facturation"
                      checked={filterDateType === "facturation"}
                      onChange={() => setFilterDateType("facturation")}
                      className="text-teal-650 focus:ring-teal-500 border-slate-300"
                    />
                    <span>Date Facturation</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-750">
                    <input
                      type="radio"
                      name="dateType"
                      value="echeance"
                      checked={filterDateType === "echeance"}
                      onChange={() => setFilterDateType("echeance")}
                      className="text-teal-650 focus:ring-teal-500 border-slate-300"
                    />
                    <span>Échéance</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layout rendering matching chosen sheet tab */}
        {dataLoading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-sm font-semibold">Synchronisation des bases...</span>
          </div>
        ) : (
          <div>
            {/* 1. Tableau de bord */}
            {activeTab === "dashboard" && (
              <DashboardView 
                projects={permittedProjects}
                budgets={budgets.filter(b => permittedProjects.some(p => p.id === b.projetId))}
                realises={realises.filter(r => permittedProjects.some(p => p.id === r.projetId))}
                billings={permittedBillings}
                subcontractors={subcontractors}
                clients={permittedClients}
                taches={taches}
                interlocuteurs={interlocuteurs}
                onRelancerTache={handleRelancerTache}
                isWritable={isWritable}
                onOpenPrestation={(p) => setPrintableProject(p)}
                onOpenBudgetRealise={(p) => {
                  setSelectedProjectForFinancePrint(p);
                  setIsPrintFinanceModalOpen(true);
                }}
                onOpenBillingPrint={(b) => {
                  setSelectedBillingForPrint(b);
                  setIsPrintBillingModalOpen(true);
                }}
                onEditProject={(p) => {
                  setSelectedProjectForEdit(p);
                  setIsProjectModalOpen(true);
                }}
                onEditBudgetRealise={(p) => {
                  setFinanceProject(p);
                  setIsFinanceModalOpen(true);
                }}
                onEditBilling={(b) => {
                  setSelectedBillingForEdit(b);
                  setIsBillingModalOpen(true);
                }}
              />
            )}

            {/* 2. Projets tab (Base 1) */}
            {activeTab === "projects" && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">📦 Catalogue d'Affaires Sous-Traitées</h3>
                    <p className="text-xs text-gray-400 mt-1">Listing complet des planifications techniques d'atelier</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportProjects}
                      className="bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition"
                      title="Exporter le tableau au format Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Excel
                    </button>
                    {isWritable && (
                      <button
                        onClick={() => { setSelectedProjectForEdit(undefined); setIsProjectModalOpen(true); }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Créer un projet
                      </button>
                    )}
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    Aucun projet de fabrication ne correspond aux filtres définis.
                  </div>
                ) : (
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Actions / Impression</th>
                          <th 
                            onClick={() => handleSortToggle("status", projectsSort, setProjectsSort)}
                            className="px-4 py-3 text-center w-12 cursor-pointer hover:bg-slate-100 select-none"
                          >
                            État {getSortIcon("status", projectsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("nomAffaire", projectsSort, setProjectsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                          >
                            Affaire / Zone {getSortIcon("nomAffaire", projectsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("numCommande", projectsSort, setProjectsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                          >
                            Cde N° {getSortIcon("numCommande", projectsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("clientId", projectsSort, setProjectsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                          >
                            Client {getSortIcon("clientId", projectsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("sousTraitantId", projectsSort, setProjectsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                          >
                            Sous-Traitant {getSortIcon("sousTraitantId", projectsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("poidsTotal", projectsSort, setProjectsSort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 select-none"
                          >
                            Poids Global (kg) {getSortIcon("poidsTotal", projectsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("traitementProtection", projectsSort, setProjectsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                          >
                            Traitement Protection {getSortIcon("traitementProtection", projectsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("delaiLivraisonChantier", projectsSort, setProjectsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                          >
                            Jalon Chantier {getSortIcon("delaiLivraisonChantier", projectsSort)}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {getSortedProjects().map(p => {
                          const cl = clients.find(c => c.id === p.clientId);
                          const sub = subcontractors.find(s => s.id === p.sousTraitantId);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3 text-left">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setPrintableProject(p)}
                                    className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                                    title="Générer Fiche de Prestation et imprimer"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  {isWritable ? (
                                    <>
                                      <button
                                        onClick={() => { setSelectedProjectForEdit(p); setIsProjectModalOpen(true); }}
                                        className="p-1 text-slate-500 hover:text-teal-600 rounded"
                                        title="Éditer caractéristiques"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProject(p.id, p.nomAffaire)}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                                        title="Supprimer projet"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">Lecture</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isProjectArchived(p.id) ? (
                                  <div className="flex justify-center" title="Archivée (Facturée)">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shadow-xs" title="Archivée (Facturée)" />
                                  </div>
                                ) : p.status === ProjectStatus.TERMINEE ? (
                                  <div className="flex justify-center">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block shadow-xs" title="Terminée" />
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs animate-pulse" title="En cours" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                <span className="text-slate-950 font-semibold block">{p.nomAffaire}</span>
                                <span className="text-xs text-gray-400 font-mono block">{p.nomZone}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">{p.numCommande || "Inconnu"}</td>
                              <td className="px-4 py-3 text-xs font-semibold">{cl?.nom || "Non renseigné"}</td>
                              <td className="px-4 py-3 text-xs font-semibold">{sub?.nom || "Non attribué"}</td>
                              <td className="px-4 py-3 text-right font-extrabold text-slate-950">
                                {p.poidsTotal.toLocaleString()} kg
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-700">{p.protection}</td>
                              <td className="px-4 py-3 text-xs text-red-700 font-bold">
                                {p.delaiLivraisonChantier ? new Date(p.delaiLivraisonChantier).toLocaleDateString("fr-FR") : "Non fixé"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. Budgets & Realises blended tab */}
            {activeTab === "budgets_realises" && (
              <div className="space-y-6">
                
                {/* Micro KPIs for whole filtered dashboard sheet */}
                {(() => {
                  let totalB_Sum = 0;
                  let totalR_Sum = 0;

                  filteredProjects.forEach(p => {
                    const bud = budgets.find(b => b.projetId === p.id) || {
                      budgetFourniture: 0,
                      budgetMainOeuvre: 0,
                      budgetSousTraitance: 0,
                      fraisGenerauxPct: 10
                    };
                    const bSub = (bud.budgetFourniture || 0) + (bud.budgetMainOeuvre || 0) + (bud.budgetSousTraitance || 0);
                    totalB_Sum += bSub * (1 + (bud.fraisGenerauxPct || 0) / 100);

                    const real = realises.find(r => r.projetId === p.id) || {
                      achatsFournitureRealise: 0,
                      achatsMainOeuvreRealise: 0,
                      achatsSousTraitanceRealise: 0,
                      fraisGenerauxPct: 10
                    };
                    const rSub = (real.achatsFournitureRealise || 0) + (real.achatsMainOeuvreRealise || 0) + (real.achatsSousTraitanceRealise || 0);
                    totalR_Sum += rSub * (1 + (real.fraisGenerauxPct || 0) / 100);
                  });

                  const varianceSum = totalB_Sum - totalR_Sum;
                  const isProfitableGlobal = varianceSum >= 0;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                          <DollarSign className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider font-mono">Volume Budget Prévisionnel</span>
                          <span className="text-lg font-black text-slate-900 block mt-0.5">{totalB_Sum.toLocaleString()} € H.T.</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <Calculator className="w-5 h-5 text-red-650" />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider font-mono">Coût de Fabrication Cumulé</span>
                          <span className="text-lg font-black text-slate-900 block mt-0.5">{totalR_Sum.toLocaleString()} € H.T.</span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border shadow-3xs flex items-center gap-4 ${isProfitableGlobal ? "bg-emerald-50 border-emerald-250 text-emerald-950" : "bg-rose-50 border-rose-250 text-rose-950"}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isProfitableGlobal ? "bg-emerald-100" : "bg-rose-100"}`}>
                          <Layers className={`w-5 h-5 ${isProfitableGlobal ? "text-emerald-750" : "text-rose-750"}`} />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider font-mono">Solde Écart de Rentabilité</span>
                          <span className="text-lg font-black block mt-0.5">
                            {isProfitableGlobal ? "+" : ""}{varianceSum.toLocaleString()} €
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Bloc 1 : Budget */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="p-1 px-1.5 text-xs font-mono font-bold bg-teal-100 text-teal-800 rounded">BLOC 1</span>
                        📊 Budgets Prévisionnels (Objectif Vente)
                      </h3>
                      <button
                        onClick={handleExportBudgetsRealises}
                        className="bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition shrink-0"
                        title="Exporter Budgets + Réalisés (tableau fusionné) au format Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Export Excel
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Gérez l'enveloppe prévisionnelle d'affaire sur la fourniture, la main d'œuvre et la sous-traitance.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-gray-500 font-bold uppercase tracking-tight text-[11px] select-none">
                          <th 
                            onClick={() => handleSortToggle("nomAffaire", bloc1Sort, setBloc1Sort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Affaire-Zone {getSortIcon("nomAffaire", bloc1Sort)}
                          </th>
                          <th className="px-4 py-3 text-center">Fiches / Actions</th>
                          <th 
                            onClick={() => handleSortToggle("poidsVendu", bloc1Sort, setBloc1Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Poids Vendu (kg) {getSortIcon("poidsVendu", bloc1Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("budgetFourniture", bloc1Sort, setBloc1Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Fourniture (€) {getSortIcon("budgetFourniture", bloc1Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("budgetMainOeuvre", bloc1Sort, setBloc1Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Main d'Œuvre (€) {getSortIcon("budgetMainOeuvre", bloc1Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("budgetSousTraitance", bloc1Sort, setBloc1Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Sous-Traitance (€) {getSortIcon("budgetSousTraitance", bloc1Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("fraisGenerauxPct", bloc1Sort, setBloc1Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Frais Généraux (FG) {getSortIcon("fraisGenerauxPct", bloc1Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("finalVolume", bloc1Sort, setBloc1Sort)}
                            className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-slate-100"
                          >
                            Volume Global (+ FG) {getSortIcon("finalVolume", bloc1Sort)}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {getSortedBloc1().map(item => {
                          const { project: p, budget: bud, finalVolume } = item;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/65 transition">
                              <td className="px-4 py-3 col-span-1">
                                <span className="font-semibold text-slate-950 block">{p.nomAffaire}</span>
                                <span className="text-[10px] text-gray-400 font-mono block">{p.nomZone}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedProjectForFinancePrint(p);
                                      setIsPrintFinanceModalOpen(true);
                                    }}
                                    className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-800 font-bold px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer select-none"
                                    title="Imprimer Fiche récapitative Budgets vs Réalisés"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Fiche Décision
                                  </button>
                                  {isWritable ? (
                                    <button
                                      onClick={() => {
                                        const real = realises.find(r => r.projetId === p.id) || {
                                          id: "",
                                          projetId: p.id,
                                          poidsFabrique: 0,
                                          achatsFournitureRealise: 0,
                                          achatsMainOeuvreRealise: 0,
                                          achatsSousTraitanceRealise: 0,
                                          fraisGenerauxPct: 10
                                        };
                                        setFinanceProject(p);
                                        setSelectedProjectForEdit(undefined);
                                        setBudgets(prev => prev.some(b => b.id === bud.id) ? prev : [...prev, bud]);
                                        setRealises(prev => prev.some(r => r.id === real.id) ? prev : [...prev, real]);
                                        setIsFinanceModalOpen(true);
                                      }}
                                      className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-755 font-semibold px-2 py-1 rounded transition whitespace-nowrap cursor-pointer"
                                    >
                                      Ajuster
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">Verrouillé</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{bud.poidsVendu.toLocaleString()} kg</td>
                              <td className="px-4 py-3 text-right">{(bud.budgetFourniture || 0).toLocaleString()} €</td>
                              <td className="px-4 py-3 text-right">{(bud.budgetMainOeuvre || 0).toLocaleString()} €</td>
                              <td className="px-4 py-3 text-right">{(bud.budgetSousTraitance || 0).toLocaleString()} €</td>
                              <td className="px-4 py-3 text-right text-xs text-gray-500">{bud.fraisGenerauxPct} %</td>
                              <td className="px-4 py-3 text-right font-bold text-teal-800 font-mono">{finalVolume.toLocaleString()} €</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bloc 2 : Realises */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="p-1 px-1.5 text-xs font-mono font-bold bg-amber-100 text-amber-800 rounded">BLOC 2</span>
                        🔨 Achats de Fabrication Réalisés (Réel)
                      </h3>
                      <button
                        onClick={handleExportBudgetsRealises}
                        className="bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition shrink-0"
                        title="Exporter Budgets + Réalisés (tableau fusionné) au format Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Export Excel
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Suivez les tonnages réellement fabriqués en atelier, ainsi que les dépenses réelles et frais de structure imputés.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-gray-500 font-bold uppercase tracking-tight text-[11px] select-none">
                          <th 
                            onClick={() => handleSortToggle("nomAffaire", bloc2Sort, setBloc2Sort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Affaire-Zone {getSortIcon("nomAffaire", bloc2Sort)}
                          </th>
                          <th className="px-4 py-3 text-center">Fiches / Actions</th>
                          <th 
                            onClick={() => handleSortToggle("poidsFabrique", bloc2Sort, setBloc2Sort)}
                            className="px-4 py-3 text-right font-semibold text-amber-900 cursor-pointer hover:bg-slate-100"
                          >
                            Poids Fabriqué (kg) {getSortIcon("poidsFabrique", bloc2Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("achatsFournitureRealise", bloc2Sort, setBloc2Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Achats Matières Réel (€) {getSortIcon("achatsFournitureRealise", bloc2Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("achatsMainOeuvreRealise", bloc2Sort, setBloc2Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Achats M.O. Réel (€) {getSortIcon("achatsMainOeuvreRealise", bloc2Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("achatsSousTraitanceRealise", bloc2Sort, setBloc2Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Achats S.T. Réel (€) {getSortIcon("achatsSousTraitanceRealise", bloc2Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("fraisGenerauxPct", bloc2Sort, setBloc2Sort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            FG (%) {getSortIcon("fraisGenerauxPct", bloc2Sort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("finalVolume", bloc2Sort, setBloc2Sort)}
                            className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-slate-100"
                          >
                            Total Dépenses Réelles {getSortIcon("finalVolume", bloc2Sort)}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {getSortedBloc2().map(item => {
                          const { project: p, realise: real, finalVolume } = item;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/65 transition">
                              <td className="px-4 py-3">
                                <span className="font-semibold text-slate-950 block">{p.nomAffaire}</span>
                                <span className="text-[10px] text-gray-400 font-mono block">{p.nomZone}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedProjectForFinancePrint(p);
                                      setIsPrintFinanceModalOpen(true);
                                    }}
                                    className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-800 font-bold px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer select-none"
                                    title="Imprimer Fiche récapitative Budgets vs Réalisés"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Fiche Décision
                                  </button>
                                  {isWritable ? (
                                    <button
                                      onClick={() => {
                                        const bud = budgets.find(b => b.projetId === p.id) || {
                                          id: "",
                                          projetId: p.id,
                                          poidsVendu: p.poidsTotal,
                                          budgetFourniture: 0,
                                          budgetMainOeuvre: 0,
                                          budgetSousTraitance: 0,
                                          fraisGenerauxPct: 10
                                        };
                                        setFinanceProject(p);
                                        setSelectedProjectForEdit(undefined);
                                        setBudgets(prev => prev.some(b => b.id === bud.id) ? prev : [...prev, bud]);
                                        setRealises(prev => prev.some(r => r.id === real.id) ? prev : [...prev, real]);
                                        setIsFinanceModalOpen(true);
                                      }}
                                      className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-755 font-semibold px-2 py-1 rounded transition whitespace-nowrap cursor-pointer"
                                    >
                                      Ajuster
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">Lecture</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{real.poidsFabrique.toLocaleString()} kg</td>
                              <td className="px-4 py-3 text-right">{(real.achatsFournitureRealise || 0).toLocaleString()} €</td>
                              <td className="px-4 py-3 text-right font-mono">{(real.achatsMainOeuvreRealise || 0).toLocaleString()} €</td>
                              <td className="px-4 py-3 text-right">{(real.achatsSousTraitanceRealise || 0).toLocaleString()} €</td>
                              <td className="px-4 py-3 text-right text-xs text-gray-500">{real.fraisGenerauxPct} %</td>
                              <td className="px-4 py-3 text-right font-bold text-red-800 font-mono">{finalVolume.toLocaleString()} €</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 5. Billings tab */}
            {activeTab === "billings" && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">🧾 Suivi de Facturation</h3>
                    <p className="text-xs text-gray-400 mt-1">Gérez l'état d'avancement de votre facturation et liez les prestations d'ateliers.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportBillings}
                      className="bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition"
                      title="Exporter le tableau au format Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Excel
                    </button>
                    {isWritable && (
                      <button
                        onClick={() => { setSelectedBillingForEdit(undefined); setIsBillingModalOpen(true); }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Saisir une facture
                      </button>
                    )}
                  </div>
                </div>

                {filteredBillings.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    Aucun enregistrement de prestation de facturation n'a été saisi ou trouvé.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-gray-500 font-bold uppercase tracking-tight text-[11px] select-none">
                          <th className="px-4 py-3 text-left">Actions</th>
                          <th 
                            onClick={() => handleSortToggle("etatFacturation", billingsSort, setBillingsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            État {getSortIcon("etatFacturation", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("nomAffaire", billingsSort, setBillingsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Affaire-Zone {getSortIcon("nomAffaire", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("typePrestation", billingsSort, setBillingsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Type Prestation {getSortIcon("typePrestation", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("clientId", billingsSort, setBillingsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Client {getSortIcon("clientId", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("sousTraitantId", billingsSort, setBillingsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Sous-Traitant {getSortIcon("sousTraitantId", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("quantiteFacturee", billingsSort, setBillingsSort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Quantité {getSortIcon("quantiteFacturee", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("prixUnitaire", billingsSort, setBillingsSort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100"
                          >
                            Prix Unitaire {getSortIcon("prixUnitaire", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("amountHT", billingsSort, setBillingsSort)}
                            className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 font-semibold"
                          >
                            Montant H.T. {getSortIcon("amountHT", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("dateFacturation", billingsSort, setBillingsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Date facture {getSortIcon("dateFacturation", billingsSort)}
                          </th>
                          <th 
                            onClick={() => handleSortToggle("dateEcheance", billingsSort, setBillingsSort)}
                            className="px-4 py-3 cursor-pointer hover:bg-slate-100"
                          >
                            Échéance {getSortIcon("dateEcheance", billingsSort)}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {getSortedBillings().map(b => {
                          const proj = projects.find(p => p.id === b.projetId);
                          const cl = proj ? clients.find(c => c.id === proj.clientId) : null;
                          const sub = proj ? subcontractors.find(s => s.id === proj.sousTraitantId) : null;
                          const totalHT = b.quantiteFacturee * b.prixUnitaire;

                          return (
                            <tr key={b.id} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3 text-left">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setSelectedBillingForPrint(b); setIsPrintBillingModalOpen(true); }}
                                    className="p-1 text-slate-500 hover:text-amber-600 rounded"
                                    title="Imprimer l'analyse globale"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  {isWritable ? (
                                    <>
                                      <button
                                        onClick={() => { setSelectedBillingForEdit(b); setIsBillingModalOpen(true); }}
                                        className="p-1 text-slate-500 hover:text-teal-600 rounded"
                                        title="Éditer facture"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBilling(b.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                                        title="Supprimer facture"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">Lecture</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  b.etatFacturation === "Payée" ? "bg-emerald-100 text-emerald-800" :
                                  b.etatFacturation === "Envoyée" ? "bg-amber-100 text-amber-800" :
                                  b.etatFacturation === "Brouillon" ? "bg-slate-100 text-slate-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {b.etatFacturation}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-950 block">{proj?.nomAffaire || "Non défini"}</span>
                                <span className="text-[10px] text-gray-400 font-mono block">{proj?.nomZone || ""}</span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{b.typePrestation}</td>
                              <td className="px-4 py-3 text-xs">{cl?.nom || "Inconnu"}</td>
                              <td className="px-4 py-3 text-xs">{sub?.nom || "Inconnu"}</td>
                              <td className="px-4 py-3 text-right text-xs">
                                {b.quantiteFacturee.toLocaleString()} <span className="text-gray-400 font-mono">{b.uniteFacturee}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-xs">{b.prixUnitaire.toLocaleString()} €</td>
                              <td className="px-4 py-3 text-right font-extrabold text-slate-900">{totalHT.toLocaleString()} €</td>
                              <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.dateFacturation).toLocaleDateString("fr-FR")}</td>
                              <td className="px-4 py-3 text-xs text-red-600 font-semibold">{new Date(b.dateEcheance).toLocaleDateString("fr-FR")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 6. Directory / Annuaire tab */}
            {activeTab === "directory" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Clients sub-block */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-teal-600" />
                        Clients
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Maîtres d'œuvre donneurs d'ordres</p>
                    </div>
                    {isWritable && (
                      <button
                        onClick={() => { setClientSubModalType("client"); setSelectedClientSubForEdit(undefined); setIsClientSubModalOpen(true); }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-1.5 px-3 rounded flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-150 max-h-[50vh] overflow-y-auto">
                    {permittedClients.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400">Aucun client répertorié.</div>
                    ) : (
                      permittedClients.map(c => (
                        <div key={c.id} className="p-4 flex justify-between items-start hover:bg-slate-50/50 transition">
                          <div>
                            <h4 className="font-bold text-slate-950 text-sm">{c.nom}</h4>
                            <p className="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed">{c.adresse || "Pas d'adresse enregistrée"}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-[10px] bg-teal-50 text-teal-900 font-bold px-2.5 py-0.5 rounded-full font-mono">
                                Coût horaire MO : {c.coutHoraireMO} € / h
                              </span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full font-mono">
                                Frais généraux : {c.fraisGenerauxPct !== undefined ? c.fraisGenerauxPct : 10} %
                              </span>
                            </div>
                          </div>
                          
                          {isWritable && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setClientSubModalType("client"); setSelectedClientSubForEdit(c); setIsClientSubModalOpen(true); }}
                                className="p-1.5 text-slate-400 hover:text-teal-600 rounded"
                                title="Modifier client"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClientSub("client", c.id, c.nom)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                                title="Supprimer client"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Subcontractor sub-block */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-indigo-600" />
                        Sous-Traitants
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Usines de fabrication métallurgique agréées</p>
                    </div>
                    {isWritable && (
                      <button
                        onClick={() => { setClientSubModalType("subcontractor"); setSelectedClientSubForEdit(undefined); setIsClientSubModalOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-150 max-h-[50vh] overflow-y-auto">
                    {subcontractors.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400">Aucun sous-traitant configuré.</div>
                    ) : (
                      subcontractors.map(s => (
                        <div key={s.id} className="p-4 flex justify-between items-start hover:bg-slate-50/50 transition">
                          <div>
                            <h4 className="font-bold text-slate-950 text-sm">{s.nom}</h4>
                            <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{s.adresse || "Pas d'adresse enregistrée"}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-[10px] bg-indigo-50 text-indigo-900 font-bold px-2.5 py-0.5 rounded-full font-mono">
                                Taux horaire : {s.coutHoraireMO} € / h
                              </span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full font-mono">
                                Frais généraux : {s.fraisGenerauxPct !== undefined ? s.fraisGenerauxPct : 10} %
                              </span>
                            </div>
                          </div>

                          {isWritable && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setClientSubModalType("subcontractor"); setSelectedClientSubForEdit(s); setIsClientSubModalOpen(true); }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                                title="Modifier sous-traitant"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClientSub("subcontractor", s.id, s.nom)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                                title="Supprimer sous-traitant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── Interlocuteurs ── */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden md:col-span-2">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-rose-600" />
                        Interlocuteurs
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Personnes physiques rattachées à un client ou sous-traitant — utilisées pour l'attribution des tâches</p>
                    </div>
                    {isWritable && (
                      <button
                        onClick={() => { setSelectedContactForEdit(undefined); setIsContactModalOpen(true); }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-1.5 px-3 rounded flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    {interlocuteurs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400">Aucun interlocuteur enregistré. Ajoutez les contacts de vos clients et sous-traitants.</div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                            <th className="px-4 py-2.5">Nom / Prénom</th>
                            <th className="px-4 py-2.5">Email</th>
                            <th className="px-4 py-2.5">Rattachement</th>
                            <th className="px-4 py-2.5">Entité</th>
                            {isWritable && <th className="px-4 py-2.5 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...interlocuteurs]
                            .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
                            .map(i => {
                              const entite = i.type === "client"
                                ? clients.find(c => c.id === i.entiteId)?.nom
                                : subcontractors.find(s => s.id === i.entiteId)?.nom;
                              return (
                                <tr key={i.id} className="hover:bg-slate-50/60 transition">
                                  <td className="px-4 py-2.5 font-semibold text-slate-900">{i.prenom} {i.nom}</td>
                                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">
                                    <a href={`mailto:${i.email}`} className="hover:text-teal-600 hover:underline flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {i.email}
                                    </a>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${i.type === "client" ? "bg-teal-50 text-teal-800" : "bg-indigo-50 text-indigo-800"}`}>
                                      {i.type === "client" ? "Client" : "Sous-traitant"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">
                                    <div className="flex flex-wrap gap-1">
                                      {(Array.isArray((i as any).entites) && (i as any).entites.length > 0
                                        ? (i as any).entites
                                        : [{ type: i.type, entiteId: i.entiteId }]
                                      ).map((r: any, idx: number) => {
                                        const nom = r.type === "client"
                                          ? clients.find(c => c.id === r.entiteId)?.nom
                                          : subcontractors.find(s => s.id === r.entiteId)?.nom;
                                        return (
                                          <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.type === "client" ? "bg-teal-50 text-teal-800" : "bg-indigo-50 text-indigo-800"}`}>
                                            {nom || "Inconnu"}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  {isWritable && (
                                    <td className="px-4 py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => { setSelectedContactForEdit(i); setIsContactModalOpen(true); }}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded" title="Modifier">
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteContact(i.id, `${i.prenom} ${i.nom}`)}
                                          className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Supprimer">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ── Onglet Tâches ── */}
            {activeTab === "tasks" && (
              <TasksView
                taches={taches}
                tachesType={tachesType}
                projects={permittedProjects}
                interlocuteurs={interlocuteurs}
                clients={clients}
                subcontractors={subcontractors}
                onSave={handleSaveTache}
                onUpdate={handleUpdateTache}
                onRelancer={handleRelancerTache}
                onDelete={handleDeleteTache}
                isWritable={isWritable}
              />
            )}

            {/* ── Onglet Calendrier ── */}
            {activeTab === "calendar" && (
              <CalendarView
                projects={permittedProjects}
                billings={permittedBillings}
                taches={taches}
                clients={permittedClients}
                subcontractors={subcontractors}
                interlocuteurs={interlocuteurs}
              />
            )}

            {/* Profil panel view */}
            {activeTab === "profil" && (
              <ProfileView user={user} clients={clients} />
            )}

            {/* Special 7. Admin approvals panel */}
            {(activeTab as any) === "admin_users" && isAdmin && (
              <AdminPanel currentUser={user} />
            )}

          </div>
        )}

      </main>

      {/* Database/Modals Synchronization nodes */}
      
      {/* 1. Projects Modal */}
      <ProjectModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={selectedProjectForEdit}
        clients={clients}
        subcontractors={subcontractors}
        onSave={handleSaveProject}
        userRole={user?.role}
      />

      {/* 2. Billings Modal */}
      <BillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        billing={selectedBillingForEdit}
        projects={projects}
        clients={clients}
        subcontractors={subcontractors}
        billings={billings}
        budgets={budgets}
        realises={realises}
        onSave={handleSaveBilling}
        userRole={user?.role}
      />

      {/* 3. Budget & Realised Modal */}
      {isFinanceModalOpen && financeProject && (
        <BudgetRealiseModal
          isOpen={isFinanceModalOpen}
          onClose={() => { setIsFinanceModalOpen(false); setFinanceProject(null); }}
          project={financeProject}
          budget={budgets.find(b => b.projetId === financeProject.id) || { id: "", projetId: financeProject.id, poidsVendu: financeProject.poidsTotal, budgetFourniture: 0, budgetMainOeuvre: 0, budgetSousTraitance: 0, fraisGenerauxPct: 10 }}
          realise={realises.find(r => r.projetId === financeProject.id) || { id: "", projetId: financeProject.id, poidsFabrique: 0, achatsFournitureRealise: 0, achatsMainOeuvreRealise: 0, achatsSousTraitanceRealise: 0, fraisGenerauxPct: 10 }}
          clients={clients}
          subcontractors={subcontractors}
          onSaveBudget={async (id, data) => {
            await api.updateBudget(id, data);
            await loadWorkspaceData();
          }}
          onSaveRealise={async (id, data) => {
            await api.updateRealise(id, data);
            await loadWorkspaceData();
          }}
          userRole={user?.role}
        />
      )}

      {/* 4. Client / Subcontractor Modal */}
      <ClientSubModal
        isOpen={isClientSubModalOpen}
        onClose={() => setIsClientSubModalOpen(false)}
        type={clientSubModalType}
        item={selectedClientSubForEdit}
        onSave={handleSaveClientSub}
      />

      {/* 5. Billing Analysis Print Modal */}
      {isPrintBillingModalOpen && selectedBillingForPrint && (
        <BillingPrintModal
          isOpen={isPrintBillingModalOpen}
          onClose={() => { setIsPrintBillingModalOpen(false); setSelectedBillingForPrint(null); }}
          billing={selectedBillingForPrint}
          projects={projects}
          clients={clients}
          subcontractors={subcontractors}
          budgets={budgets}
          realises={realises}
          user={user}
        />
      )}

      {/* 5b. Budget & Realised Side-by-Side Print Modal */}
      {isPrintFinanceModalOpen && selectedProjectForFinancePrint && (
        <BudgetRealisePrintModal
          isOpen={isPrintFinanceModalOpen}
          onClose={() => { setIsPrintFinanceModalOpen(false); setSelectedProjectForFinancePrint(null); }}
          project={selectedProjectForFinancePrint}
          budget={budgets.find(b => b.projetId === selectedProjectForFinancePrint.id) || { id: "", projetId: selectedProjectForFinancePrint.id, poidsVendu: selectedProjectForFinancePrint.poidsTotal, budgetFourniture: 0, budgetMainOeuvre: 0, budgetSousTraitance: 0, fraisGenerauxPct: 10 }}
          realise={realises.find(r => r.projetId === selectedProjectForFinancePrint.id) || { id: "", projetId: selectedProjectForFinancePrint.id, poidsFabrique: 0, achatsFournitureRealise: 0, achatsMainOeuvreRealise: 0, achatsSousTraitanceRealise: 0, fraisGenerauxPct: 10 }}
          client={clients.find(c => c.id === selectedProjectForFinancePrint.clientId)}
          subcontractor={subcontractors.find(s => s.id === selectedProjectForFinancePrint.sousTraitantId)}
          user={user}
        />
      )}

      {/* 6. Custom Confirmation Modal (bypasses iframe restrictions) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2.5 text-slate-800">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">{confirmModal.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-line font-medium">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white border border-slate-300 text-xs text-slate-700 rounded-lg hover:bg-slate-100 transition font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg transition font-semibold"
                onClick={async () => {
                  const onConfirm = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await onConfirm();
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ContactModal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        interlocuteur={selectedContactForEdit}
        clients={permittedClients}
        subcontractors={subcontractors}
        onSave={handleSaveContact}
      />

      {/* Footer copyright */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400 mt-12 print:hidden font-mono">
        © {new Date().getFullYear()} FlowFab v3.1.4 • Système sécurisé de pilotage de production.
      </footer>

    </div>
  );
}
