import { 
  User, 
  Client, 
  Subcontractor, 
  Project, 
  Billing, 
  Budget, 
  Realise 
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

let tokenCache: string | null = typeof window !== "undefined" ? localStorage.getItem("flowfab_token") : null;

export const api = {
  setToken(token: string | null) {
    tokenCache = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("flowfab_token", token);
      } else {
        localStorage.removeItem("flowfab_token");
      }
    }
  },

  getToken() {
    return tokenCache;
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    // Auto-inject Token
    const token = this.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    // Auto-set Content-Type for JSON
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(API_BASE + endpoint, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMessage = `Une erreur est survenue (Statut ${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Fallback to general status message if JSON reading fails
      }
      
      // Auto-handle session expirations
      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
      
      throw new Error(errorMessage);
    }

    try {
      return await response.json() as T;
    } catch {
      return {} as T;
    }
  },

  // Auth Operations
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return api.request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  async register(email: string, nom: string, password: string, requestedRole: string): Promise<{ message: string; user: User }> {
    return api.request<{ message: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, nom, password, requestedRole })
    });
  },

  async getMe(): Promise<{ user: User }> {
    return api.request<{ user: User }>("/api/auth/me");
  },

  // Users Management (Admin)
  async getUsers(): Promise<User[]> {
    return api.request<User[]>("/api/users");
  },

  async updateUser(userId: string, data: { status?: string; role?: string; allowedProjectIds?: string[]; allowedClientIds?: string[]; poste?: string; nom?: string }): Promise<User> {
    return api.request<User>(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/api/users/${userId}`, {
      method: "DELETE"
    });
  },

  // Clients CRUD
  async getClients(): Promise<Client[]> {
    return api.request<Client[]>("/api/clients");
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    return api.request<Client>("/api/clients", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return api.request<Client>(`/api/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteClient(id: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/api/clients/${id}`, {
      method: "DELETE"
    });
  },

  // Subcontractors CRUD
  async getSubcontractors(): Promise<Subcontractor[]> {
    return api.request<Subcontractor[]>("/api/subcontractors");
  },

  async createSubcontractor(data: Partial<Subcontractor>): Promise<Subcontractor> {
    return api.request<Subcontractor>("/api/subcontractors", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateSubcontractor(id: string, data: Partial<Subcontractor>): Promise<Subcontractor> {
    return api.request<Subcontractor>(`/api/subcontractors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteSubcontractor(id: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/api/subcontractors/${id}`, {
      method: "DELETE"
    });
  },

  // Projects CRUD
  async getProjects(): Promise<Project[]> {
    return api.request<Project[]>("/api/projects");
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    return api.request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return api.request<Project>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/api/projects/${id}`, {
      method: "DELETE"
    });
  },

  // Budgets Edit
  async getBudgets(): Promise<Budget[]> {
    return api.request<Budget[]>("/api/budgets");
  },

  async updateBudget(id: string, data: Partial<Budget>): Promise<Budget> {
    return api.request<Budget>(`/api/budgets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  // Realised Edit
  async getRealises(): Promise<Realise[]> {
    return api.request<Realise[]>("/api/realises");
  },

  async updateRealise(id: string, data: Partial<Realise>): Promise<Realise> {
    return api.request<Realise>(`/api/realises/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  // Billings CRUD
  async getBillings(): Promise<Billing[]> {
    return api.request<Billing[]>("/api/billings");
  },

  async createBilling(data: Partial<Billing>): Promise<Billing> {
    return api.request<Billing>("/api/billings", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateBilling(id: string, data: Partial<Billing>): Promise<Billing> {
    return api.request<Billing>(`/api/billings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteBilling(id: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/api/billings/${id}`, {
      method: "DELETE"
    });
  },

  // Types d'ouvrage
  async getTypesOuvrage(): Promise<string[]> {
    return api.request<string[]>("/api/types-ouvrage");
  },

  async createTypeOuvrage(name: string): Promise<{ success: boolean; list: string[] }> {
    return api.request<{ success: boolean; list: string[] }>("/api/types-ouvrage", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },

  async deleteTypeOuvrage(name: string): Promise<{ success: boolean; list: string[] }> {
    return api.request<{ success: boolean; list: string[] }>(`/api/types-ouvrage/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return api.request<{ success: boolean; message: string }>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },
  
  // ─── Interlocuteurs ───
  getInterlocuteurs: () => fetchApi("/api/interlocuteurs"),
  createInterlocuteur: (data: any) => fetchApi("/api/interlocuteurs", { method: "POST", body: JSON.stringify(data) }),
  updateInterlocuteur: (id: string, data: any) => fetchApi(`/api/interlocuteurs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteInterlocuteur: (id: string) => fetchApi(`/api/interlocuteurs/${id}`, { method: "DELETE" }),

  // ─── Tâches-type ───
  getTachesType: () => fetchApi("/api/taches-type"),
  createTacheType: (libelle: string) => fetchApi("/api/taches-type", { method: "POST", body: JSON.stringify({ libelle }) }),
  deleteTacheType: (id: string) => fetchApi(`/api/taches-type/${id}`, { method: "DELETE" }),

  // ─── Tâches ───
  getTaches: () => fetchApi("/api/taches"),
  createTache: (data: any) => fetchApi("/api/taches", { method: "POST", body: JSON.stringify(data) }),
  updateTache: (id: string, data: any) => fetchApi(`/api/taches/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  relancerTache: (id: string, note?: string) => fetchApi(`/api/taches/${id}/relance`, { method: "POST", body: JSON.stringify({ note }) }),
  deleteTache: (id: string) => fetchApi(`/api/taches/${id}`, { method: "DELETE" }),
};
