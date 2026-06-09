import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
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
  BillingUnit,
  BillingStatus,
  ProjectStatus
} from "./src/types.js";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Middleware to parse JSON
app.use(cors({
  origin: "https://flowbase-29.web.app",
  credentials: true
}));
app.use(express.json());

// Type-safe DB schema
interface DatabaseSchema {
  users: Array<User & { passwordHash: string }>;
  clients: Client[];
  subcontractors: Subcontractor[];
  projects: Project[];
  budgets: Budget[];
  realises: Realise[];
  billings: Billing[];
  typesOuvrage: string[];
}

// Default Seed Data
const DEFAULT_DB: DatabaseSchema = {
  users: [
    {
      id: "admin-1",
      email: "thomas.jezequel@emg.bzh",
      nom: "Thomas Jézéquel",
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      poste: "Conducteur principal",
      createdAt: new Date().toISOString(),
      passwordHash: "emg2026" // Simple text comparison for secure prototype
    },
    {
      id: "user-demande",
      email: "collab@emg.bzh",
      nom: "Jean Dessinateur",
      role: UserRole.LECTEUR,
      status: UserStatus.PENDING,
      poste: "Dessinateur projeteur",
      createdAt: new Date().toISOString(),
      passwordHash: "collab"
    }
  ],
  typesOuvrage: ["Passerelle", "Bâtiment industriel", "Charpente de bureaux", "Serrurerie", "Pylône", "Ouvrage d'art"],
  clients: [
    {
      id: "c-1",
      nom: "Eiffage Métal",
      adresse: "12 Rue de l'Acier, 75013 Paris",
      coutHoraireMO: 45
    },
    {
      id: "c-2",
      nom: "Vinci Construction",
      adresse: "45 Avenue de la République, 35000 Rennes",
      coutHoraireMO: 52
    },
    {
      id: "c-3",
      nom: "Bouygues Bâtiment Grand Ouest",
      adresse: "18 Rue de l'Aviation, 44000 Nantes",
      coutHoraireMO: 48
    }
  ],
  subcontractors: [
    {
      id: "s-1",
      nom: "Atelier Mécanique de l'Ouest (AMO)",
      adresse: "Z.I. Saint-Grégoire, 35760 Rennes",
      coutHoraireMO: 38
    },
    {
      id: "s-2",
      nom: "Serrurerie Bretonne",
      adresse: "Zone Artisanale de Keranna, 56000 Vannes",
      coutHoraireMO: 35
    },
    {
      id: "s-3",
      nom: "Soudure & Chaudronnerie du Trégor (SCT)",
      adresse: "Parc d'Activités de Pégase, 22300 Lannion",
      coutHoraireMO: 40
    }
  ],
  projects: [
    {
      id: "p-1",
      nomAffaire: "Passerelle Piétonne - S1 Lorient",
      nomZone: "Lorient Centre",
      numCommande: "CMD-2026-001",
      dateCommande: "2026-04-10",
      clientId: "c-1",
      poidsTotal: 12500,
      poidsPRS: 8000,
      quantiteMl: 35,
      poidsPDC: 4500,
      protection: "Galvanisation à chaud + Thermolaquage RAL 7016",
      dessinateur: "Marc Lucas",
      conducteurTravaux: "Thomas Jézéquel",
      delaiLivraisonProtection: "2026-07-15",
      delaiLivraisonChantier: "2026-08-01",
      sousTraitantId: "s-1"
    },
    {
      id: "p-2",
      nomAffaire: "Charpente Métallique EMG Bureau",
      nomZone: "Bâtiment A",
      numCommande: "CMD-2026-002",
      dateCommande: "2026-05-02",
      clientId: "c-2",
      poidsTotal: 45000,
      poidsPRS: 30000,
      quantiteMl: 120,
      poidsPDC: 15000,
      protection: "Primaire Peinture Intumescente R60",
      dessinateur: "Arnaud Le Gall",
      conducteurTravaux: "Thomas Jézéquel",
      delaiLivraisonProtection: "2026-08-20",
      delaiLivraisonChantier: "2026-09-10",
      sousTraitantId: "s-2"
    }
  ],
  budgets: [
    {
      id: "b-1",
      projetId: "p-1",
      poidsVendu: 12500,
      budgetFourniture: 25000,
      budgetMainOeuvre: 14000,
      budgetSousTraitance: 18000,
      fraisGenerauxPct: 12,
      budgetAciers: 18000,
      budgetPeinture: 4000,
      budgetDivers: 3000,
      budgetTransport: 8000,
      budgetProtection: 10000,
      budgetHeuresMO: 350
    },
    {
      id: "b-2",
      projetId: "p-2",
      poidsVendu: 45000,
      budgetFourniture: 90000,
      budgetMainOeuvre: 48000,
      budgetSousTraitance: 65000,
      fraisGenerauxPct: 10,
      budgetAciers: 70000,
      budgetPeinture: 12000,
      budgetDivers: 8000,
      budgetTransport: 25000,
      budgetProtection: 40000,
      budgetHeuresMO: 1200
    }
  ],
  realises: [
    {
      id: "r-1",
      projetId: "p-1",
      poidsFabrique: 12450,
      achatsFournitureRealise: 24200,
      achatsMainOeuvreRealise: 13800,
      achatsSousTraitanceRealise: 18000,
      fraisGenerauxPct: 12,
      achatsAciersRealise: 17500,
      achatsPeintureRealise: 3800,
      achatsDiversRealise: 2900,
      achatsTransportRealise: 7800,
      achatsProtectionRealise: 10200,
      achatsHeuresMO: 340
    },
    {
      id: "r-2",
      projetId: "p-2",
      poidsFabrique: 42000,
      achatsFournitureRealise: 82000,
      achatsMainOeuvreRealise: 38000,
      achatsSousTraitanceRealise: 60000,
      fraisGenerauxPct: 10,
      achatsAciersRealise: 64000,
      achatsPeintureRealise: 11000,
      achatsDiversRealise: 7000,
      achatsTransportRealise: 22000,
      achatsProtectionRealise: 38000,
      achatsHeuresMO: 950
    }
  ],
  billings: [
    {
      id: "bil-1",
      projetId: "p-1",
      typePrestation: "Soudage et Usinage PRS",
      quantiteFacturee: 8000,
      uniteFacturee: BillingUnit.KG,
      prixUnitaire: 1.25,
      etatFacturation: BillingStatus.PAYEE,
      dateFacturation: "2026-05-15",
      dateEcheance: "2026-06-15"
    },
    {
      id: "bil-2",
      projetId: "p-1",
      typePrestation: "Traitement Zinc",
      quantiteFacturee: 35,
      uniteFacturee: BillingUnit.ML,
      prixUnitaire: 85.00,
      etatFacturation: BillingStatus.ENVOYEE,
      dateFacturation: "2026-05-28",
      dateEcheance: "2026-06-28"
    }
  ]
};

// Database state
let db: DatabaseSchema = { ...DEFAULT_DB };

// Read DB from file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const loaded = JSON.parse(content);
      // Ensure all top-level keys exist (migrations safety)
      db = {
        users: loaded.users || DEFAULT_DB.users,
        clients: loaded.clients || DEFAULT_DB.clients,
        subcontractors: loaded.subcontractors || DEFAULT_DB.subcontractors,
        projects: loaded.projects || DEFAULT_DB.projects,
        budgets: loaded.budgets || DEFAULT_DB.budgets,
        realises: loaded.realises || DEFAULT_DB.realises,
        billings: loaded.billings || DEFAULT_DB.billings,
        typesOuvrage: loaded.typesOuvrage || DEFAULT_DB.typesOuvrage,
      };
      console.log("Database successfully loaded from", DB_FILE);
    } else {
      saveDatabase();
      console.log("Database initialized and written to", DB_FILE);
    }
  } catch (err) {
    console.error("Error loading database file. Using in-memory fallback:", err);
  }
}

// Write DB to file
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

// --- Firebase Initialisation & Setup ---
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, setLogLevel } from "firebase/firestore";

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = process.env.FIREBASE_CONFIG
  ? JSON.parse(process.env.FIREBASE_CONFIG)
  : fs.existsSync(firebaseConfigPath)
    ? JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"))
    : null;

let firebaseApp: any = null;
let firestoreDb: any = null;

if (firebaseConfig) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    setLogLevel("error");
    firestoreDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("[Firebase] Successfully initialized with Database ID:", firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.error("[Firebase] Error during initialization:", err);
  }
} else {
  console.log("[Firebase] No firebase-applet-config.json config found. Running in local/in-memory mode.");
}

async function syncToFirestore(col: string, id: string, data: any) {
  if (!firestoreDb) return;
  try {
    // Nettoyer les valeurs undefined non supportées par Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(firestoreDb, col, id), cleanData);
    console.log(`[Firebase] Document synced successfully to Firestore: ${col}/${id}`);
  } catch (err) {
    console.error(`[Firebase] Error syncing ${col}/${id}:`, JSON.stringify(err));
  }
}

async function deleteFromFirestore(col: string, id: string) {
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, col, id));
    console.log(`[Firebase] Document deleted successfully from Firestore: ${col}/${id}`);
  } catch (err) {
    console.error(`[Firebase] Error deleting ${col}/${id}:`, err);
  }
}

async function seedFirestoreFromDefault() {
  if (!firestoreDb) return;
  console.log("[Firebase] Seeding Firestore with default database structures...");
  try {
    for (const u of DEFAULT_DB.users) {
      await setDoc(doc(firestoreDb, "users", u.id), u);
    }
    for (const c of DEFAULT_DB.clients) {
      await setDoc(doc(firestoreDb, "clients", c.id), c);
    }
    for (const s of DEFAULT_DB.subcontractors) {
      await setDoc(doc(firestoreDb, "subcontractors", s.id), s);
    }
    for (const p of DEFAULT_DB.projects) {
      await setDoc(doc(firestoreDb, "projects", p.id), p);
    }
    for (const b of DEFAULT_DB.budgets) {
      await setDoc(doc(firestoreDb, "budgets", b.id), b);
    }
    for (const r of DEFAULT_DB.realises) {
      await setDoc(doc(firestoreDb, "realises", r.id), r);
    }
    for (const bil of DEFAULT_DB.billings) {
      await setDoc(doc(firestoreDb, "billings", bil.id), bil);
    }
    await setDoc(doc(firestoreDb, "metadata", "global"), { typesOuvrage: DEFAULT_DB.typesOuvrage });
    console.log("[Firebase] Default data seeded successfully to Firestore!");
  } catch (err) {
    console.error("[Firebase] Error seeding default data to Firestore:", err);
  }
}

async function loadDatabaseFromFirestore() {
  if (!firestoreDb) {
    loadDatabase();
    return;
  }
  console.log("[Firebase] Refreshing database with state from Google Cloud Firestore...");
  try {
    const usersSnap = await getDocs(collection(firestoreDb, "users"));
    const users: any[] = [];
    usersSnap.forEach((d) => users.push(d.data()));

    const clientsSnap = await getDocs(collection(firestoreDb, "clients"));
    const clients: any[] = [];
    clientsSnap.forEach((d) => clients.push(d.data()));

    const subcontractorsSnap = await getDocs(collection(firestoreDb, "subcontractors"));
    const subcontractors: any[] = [];
    subcontractorsSnap.forEach((d) => subcontractors.push(d.data()));

    const projectsSnap = await getDocs(collection(firestoreDb, "projects"));
    const projects: any[] = [];
    projectsSnap.forEach((d) => projects.push(d.data()));

    const budgetsSnap = await getDocs(collection(firestoreDb, "budgets"));
    const budgets: any[] = [];
    budgetsSnap.forEach((d) => budgets.push(d.data()));

    const realisesSnap = await getDocs(collection(firestoreDb, "realises"));
    const realises: any[] = [];
    realisesSnap.forEach((d) => realises.push(d.data()));

    const billingsSnap = await getDocs(collection(firestoreDb, "billings"));
    const billings: any[] = [];
    billingsSnap.forEach((d) => billings.push(d.data()));

    const typeDoc = await getDoc(doc(firestoreDb, "metadata", "global"));
    let typesOuvrage = DEFAULT_DB.typesOuvrage;
    if (typeDoc.exists() && typeDoc.data()?.typesOuvrage) {
      typesOuvrage = typeDoc.data()?.typesOuvrage;
    }

    // Seed if empty
    if (users.length === 0 && clients.length === 0 && projects.length === 0) {
      await seedFirestoreFromDefault();
      // Reload recursively
      await loadDatabaseFromFirestore();
      return;
    }

    db = {
      users,
      clients,
      subcontractors,
      projects,
      budgets,
      realises,
      billings,
      typesOuvrage
    };
    console.log("[Firebase] Successfully loaded database state from Firestore!");
    // Keep local backup up-to-date
    saveDatabase();
  } catch (err) {
    console.error("[Firebase] Error loading database from Firestore. Falling back to local file...", err);
    loadDatabase();
  }
}

loadDatabase();


// --- Auth Utilities ---
// Custom simple JWT token signature for our FlowFab application (Base64 encoding containing user ID and Timestamp)
function generateToken(userId: string): string {
  const payload = JSON.stringify({ userId, expires: Date.now() + 24 * 60 * 60 * 1000 });
  return Buffer.from(payload).toString("base64");
}

function parseToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (payload && payload.userId) {
      return payload;
    }
  } catch {
    // Return null if decoding invalid base64 fails
  }
  return null;
}

// Authentication Middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(418).json({ error: "Authentification requise" });
    return;
  }
  const token = authHeader.substring(7);
  const parsed = parseToken(token);
  if (!parsed) {
    res.status(401).json({ error: "Session expirée ou invalide" });
    return;
  }
  const user = db.users.find((u) => u.id === parsed.userId);
  if (!user) {
    res.status(401).json({ error: "Utilisateur introuvable" });
    return;
  }
  if (user.status !== UserStatus.APPROVED) {
    res.status(403).json({ error: "Votre compte est en attente d'approbation d'un administrateur" });
    return;
  }
  // Attach user object to request
  (req as any).user = user;
  next();
}

// Require role editor or admin
function requireWritePermission(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as User;
  if (user.role === UserRole.LECTEUR) {
    res.status(403).json({ error: "Droits insuffisants (Lecture seule uniquement)" });
    return;
  }
  next();
}

// Require Admin only
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Accès réservé aux administrateurs" });
    return;
  }
  next();
}

// --- API Endpoints ---

// Auth endpoints
app.post("/api/auth/register", (req, res) => {
  const { email, nom, password, requestedRole } = req.body;
  if (!email || !nom || !password) {
    res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires" });
    return;
  }

  // Normalise email
  const normalizedEmail = email.trim().toLowerCase();
  
  if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    res.status(400).json({ error: "Cette adresse email est déjà enregistrée" });
    return;
  }

  // Default approvals logic
  // Automatically approve thomas.jezequel@emg.bzh as ADMIN
  const isAdmin = normalizedEmail === "thomas.jezequel@emg.bzh";
  const newUser: User & { passwordHash: string } = {
    id: "u_" + Math.random().toString(36).substring(2, 9),
    email: normalizedEmail,
    nom: nom.trim(),
    role: isAdmin ? UserRole.ADMIN : (requestedRole || UserRole.LECTEUR),
    status: isAdmin ? UserStatus.APPROVED : UserStatus.PENDING,
    createdAt: new Date().toISOString(),
    passwordHash: password
  };

  db.users.push(newUser);
  saveDatabase();
  syncToFirestore("users", newUser.id, newUser);

  res.json({
    message: isAdmin 
      ? "Compte administrateur créé et approuvé automatiquement !"
      : "Inscription réussie ! Votre compte est en attente d'approbation de Thomas Jézéquel.",
    user: {
      id: newUser.id,
      email: newUser.email,
      nom: newUser.nom,
      role: newUser.role,
      status: newUser.status
    }
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Veuillez entrer une adresse email et un mot de passe" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user || user.passwordHash !== password) {
    res.status(400).json({ error: "Identifiant ou mot de passe incorrect" });
    return;
  }

  if (user.status === UserStatus.PENDING) {
    res.status(403).json({ error: "Votre compte de membre (" + user.role + ") est en attente d'approbation par thomas.jezequel@emg.bzh." });
    return;
  }

  if (user.status === UserStatus.SUSPENDED) {
    res.status(403).json({ error: "Votre compte a été suspendu par un administrateur." });
    return;
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      status: user.status
    }
  });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  const user = (req as any).user;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      status: user.status
    }
  });
});

// --- User administration (Admin Only) ---
app.get("/api/users", authenticate, requireAdmin, (req, res) => {
  // Map users without passwordHash
  const list = db.users.map(({ passwordHash, ...user }) => user);
  res.json(list);
});

app.put("/api/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, role, allowedProjectIds, poste, allowedClientIds, nom } = req.body;
  
  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }

  // Prevent self suspension or role change
  const currentAdmin = (req as any).user as User;
  if (user.email === currentAdmin.email && (status !== undefined || role !== undefined)) {
    res.status(400).json({ error: "Vous ne pouvez pas modifier le statut ou le rôle de votre propre compte administrateur" });
    return;
  }

  if (status !== undefined) user.status = status;
  if (role !== undefined) user.role = role;
  if (allowedProjectIds !== undefined) user.allowedProjectIds = allowedProjectIds;
  if (allowedClientIds !== undefined) user.allowedClientIds = allowedClientIds;
  if (poste !== undefined) user.poste = poste;
  if (nom !== undefined) user.nom = nom;

  saveDatabase();
  syncToFirestore("users", user.id, user);
  res.json(user);
});

app.delete("/api/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = db.users.findIndex(u => u.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const user = db.users[index];
  const currentAdmin = (req as any).user as User;
  if (user.email === currentAdmin.email) {
    res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    return;
  }

  db.users.splice(index, 1);
  saveDatabase();
  deleteFromFirestore("users", id);
  res.json({ success: true, message: "Utilisateur supprimé" });
});


// --- CLIENTS API (CRUD) ---
app.get("/api/clients", authenticate, (req, res) => {
  res.json(db.clients);
});

app.post("/api/clients", authenticate, requireWritePermission, (req, res) => {
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct } = req.body;
  if (!nom) {
    res.status(400).json({ error: "Le nom du client est requis" });
    return;
  }
  const newClient: Client = {
    id: "c_" + Math.random().toString(36).substring(2, 9),
    nom,
    adresse: adresse || "",
    coutHoraireMO: Number(coutHoraireMO) || 0,
    fraisGenerauxPct: fraisGenerauxPct !== undefined ? Number(fraisGenerauxPct) : 10,
    createdAt: new Date().toISOString()
  };
  db.clients.push(newClient);
  saveDatabase();
  syncToFirestore("clients", newClient.id, newClient);
  res.json(newClient);
});

app.put("/api/clients/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct } = req.body;
  const client = db.clients.find(c => c.id === id);
  if (!client) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }
  if (nom !== undefined) client.nom = nom;
  if (adresse !== undefined) client.adresse = adresse;
  if (coutHoraireMO !== undefined) client.coutHoraireMO = Number(coutHoraireMO);
  if (fraisGenerauxPct !== undefined) client.fraisGenerauxPct = Number(fraisGenerauxPct);

  saveDatabase();
  syncToFirestore("clients", client.id, client);
  res.json(client);
});

app.delete("/api/clients/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const index = db.clients.findIndex(c => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }

  // Cascade delete logic: Find all projects for this client
  const clientProjects = db.projects.filter(p => p.clientId === id);
  const projectIds = clientProjects.map(p => p.id);

  // Remove matching projects, budgets, realises, and billings
  const budgetsToDelete = db.budgets.filter(b => projectIds.includes(b.projetId));
  const realisesToDelete = db.realises.filter(r => projectIds.includes(r.projetId));
  const billingsToDelete = db.billings.filter(b => projectIds.includes(b.projetId) || b.projetIds?.some(pid => projectIds.includes(pid)));

  db.projects = db.projects.filter(p => p.clientId !== id);
  db.budgets = db.budgets.filter(b => !projectIds.includes(b.projetId));
  db.realises = db.realises.filter(r => !projectIds.includes(r.projetId));
  db.billings = db.billings.filter(b => !projectIds.includes(b.projetId) && !b.projetIds?.some(pid => projectIds.includes(pid)));

  db.clients.splice(index, 1);
  saveDatabase();

  // Firestore sync deletes
  deleteFromFirestore("clients", id);
  for (const pid of projectIds) {
    deleteFromFirestore("projects", pid);
  }
  for (const b of budgetsToDelete) {
    deleteFromFirestore("budgets", b.id);
  }
  for (const r of realisesToDelete) {
    deleteFromFirestore("realises", r.id);
  }
  for (const b of billingsToDelete) {
    deleteFromFirestore("billings", b.id);
  }

  res.json({ success: true, message: `Client et ${projectIds.length} projets associés ont été supprimés.` });
});


// --- SUBCONTRACTORS API (CRUD) ---
app.get("/api/subcontractors", authenticate, (req, res) => {
  res.json(db.subcontractors);
});

app.post("/api/subcontractors", authenticate, requireWritePermission, (req, res) => {
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct } = req.body;
  if (!nom) {
    res.status(400).json({ error: "Le nom du sous-traitant est requis" });
    return;
  }
  const newSub: Subcontractor = {
    id: "s_" + Math.random().toString(36).substring(2, 9),
    nom,
    adresse: adresse || "",
    coutHoraireMO: Number(coutHoraireMO) || 0,
    fraisGenerauxPct: fraisGenerauxPct !== undefined ? Number(fraisGenerauxPct) : 10,
    createdAt: new Date().toISOString()
  };
  db.subcontractors.push(newSub);
  saveDatabase();
  syncToFirestore("subcontractors", newSub.id, newSub);
  res.json(newSub);
});

app.put("/api/subcontractors/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct } = req.body;
  const sub = db.subcontractors.find(s => s.id === id);
  if (!sub) {
    res.status(404).json({ error: "Sous-traitant introuvable" });
    return;
  }
  if (nom !== undefined) sub.nom = nom;
  if (adresse !== undefined) sub.adresse = adresse;
  if (coutHoraireMO !== undefined) sub.coutHoraireMO = Number(coutHoraireMO);
  if (fraisGenerauxPct !== undefined) sub.fraisGenerauxPct = Number(fraisGenerauxPct);

  saveDatabase();
  syncToFirestore("subcontractors", sub.id, sub);
  res.json(sub);
});

app.delete("/api/subcontractors/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const index = db.subcontractors.findIndex(s => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Sous-traitant introuvable" });
    return;
  }

  // Cascade delete logic: Find all projects for this subcontractor
  const subProjects = db.projects.filter(p => p.sousTraitantId === id);
  const projectIds = subProjects.map(p => p.id);

  // Remove matching projects, budgets, realises, and billings
  const budgetsToDelete = db.budgets.filter(b => projectIds.includes(b.projetId));
  const realisesToDelete = db.realises.filter(r => projectIds.includes(r.projetId));
  const billingsToDelete = db.billings.filter(b => projectIds.includes(b.projetId) || b.projetIds?.some(pid => projectIds.includes(pid)));

  db.projects = db.projects.filter(p => p.sousTraitantId !== id);
  db.budgets = db.budgets.filter(b => !projectIds.includes(b.projetId));
  db.realises = db.realises.filter(r => !projectIds.includes(r.projetId));
  db.billings = db.billings.filter(b => !projectIds.includes(b.projetId) && !b.projetIds?.some(pid => projectIds.includes(pid)));

  db.subcontractors.splice(index, 1);
  saveDatabase();

  // Firestore sync deletes
  deleteFromFirestore("subcontractors", id);
  for (const pid of projectIds) {
    deleteFromFirestore("projects", pid);
  }
  for (const b of budgetsToDelete) {
    deleteFromFirestore("budgets", b.id);
  }
  for (const r of realisesToDelete) {
    deleteFromFirestore("realises", r.id);
  }
  for (const b of billingsToDelete) {
    deleteFromFirestore("billings", b.id);
  }

  res.json({ success: true, message: `Sous-traitant et ${projectIds.length} projets associés ont été supprimés.` });
});


// --- PROJECTS API (CRUD) ---
app.get("/api/projects", authenticate, (req, res) => {
  res.json(db.projects);
});

app.post("/api/projects", authenticate, requireWritePermission, (req, res) => {
  const data = req.body;
  if (!data.nomAffaire || !data.nomZone || !data.clientId || !data.sousTraitantId) {
    res.status(400).json({ error: "Veuillez renseigner le nom d'affaire, la zone, le client et le sous-traitant." });
    return;
  }

  const pPRS = data.poidsPRS ? Number(data.poidsPRS) : undefined;
  const pPDC = data.poidsPDC ? Number(data.poidsPDC) : undefined;
  
  // Le poids total est égal à la somme du poids PDC et poids PRS if either or both are specified. Otherwise, use entered poidsTotal or 0
  let computedPoidsTotal = 0;
  if (pPRS !== undefined || pPDC !== undefined) {
    computedPoidsTotal = (pPDC || 0) + (pPRS || 0);
  } else {
    computedPoidsTotal = Number(data.poidsTotal) || 0;
  }

  const newProject: Project = {
    id: "p_" + Math.random().toString(36).substring(2, 9),
    nomAffaire: data.nomAffaire,
    nomZone: data.nomZone,
    numCommande: data.numCommande || "",
    dateCommande: data.dateCommande || new Date().toISOString().substring(0, 10),
    clientId: data.clientId,
    poidsTotal: computedPoidsTotal,
    poidsPRS: pPRS,
    quantiteMl: data.quantiteMl ? Number(data.quantiteMl) : undefined,
    poidsPDC: pPDC,
    protection: data.protection || "",
    dessinateur: data.dessinateur || "",
    conducteurTravaux: data.conducteurTravaux || "", // Default empty / no longer pre-filled
    delaiLivraisonProtection: data.delaiLivraisonProtection || undefined,
    delaiLivraisonChantier: data.delaiLivraisonChantier || "",
    sousTraitantId: data.sousTraitantId,
    status: data.status || ProjectStatus.EN_COURS,
    typeOuvrage: data.typeOuvrage || "",
    remarquesPrestation: data.remarquesPrestation || "",
    createdAt: new Date().toISOString(),
    checklistClient: data.checklistClient || {},
    checklistSubcontractor: data.checklistSubcontractor || {}
  };

  db.projects.push(newProject);

  // Automatically create empty budgets and realizes records to align database constraints elegantly
  const newBudget: Budget = {
    id: "b_" + Math.random().toString(36).substring(2, 9),
    projetId: newProject.id,
    poidsVendu: newProject.poidsTotal,
    budgetFourniture: 0,
    budgetMainOeuvre: 0,
    budgetSousTraitance: 0,
    fraisGenerauxPct: 10
  };
  const newRealise: Realise = {
    id: "r_" + Math.random().toString(36).substring(2, 9),
    projetId: newProject.id,
    poidsFabrique: 0,
    achatsFournitureRealise: 0,
    achatsMainOeuvreRealise: 0,
    achatsSousTraitanceRealise: 0,
    fraisGenerauxPct: 10
  };

  db.budgets.push(newBudget);
  db.realises.push(newRealise);

  saveDatabase();
  syncToFirestore("projects", newProject.id, newProject);
  syncToFirestore("budgets", newBudget.id, newBudget);
  syncToFirestore("realises", newRealise.id, newRealise);
  res.json(newProject);
});

app.put("/api/projects/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const project = db.projects.find(p => p.id === id);
  if (!project) {
    res.status(404).json({ error: "Projet introuvable" });
    return;
  }

  // Update all fields selectively
  if (data.nomAffaire !== undefined) project.nomAffaire = data.nomAffaire;
  if (data.nomZone !== undefined) project.nomZone = data.nomZone;
  if (data.numCommande !== undefined) project.numCommande = data.numCommande;
  if (data.dateCommande !== undefined) project.dateCommande = data.dateCommande;
  if (data.clientId !== undefined) project.clientId = data.clientId;
  
  if (data.poidsPRS !== undefined) project.poidsPRS = data.poidsPRS === "" ? undefined : Number(data.poidsPRS);
  if (data.poidsPDC !== undefined) project.poidsPDC = data.poidsPDC === "" ? undefined : Number(data.poidsPDC);
  if (data.quantiteMl !== undefined) project.quantiteMl = data.quantiteMl === "" ? undefined : Number(data.quantiteMl);

  // Auto recompute poids total
  if (project.poidsPRS !== undefined || project.poidsPDC !== undefined) {
    project.poidsTotal = (project.poidsPDC || 0) + (project.poidsPRS || 0);
  } else if (data.poidsTotal !== undefined) {
    project.poidsTotal = Number(data.poidsTotal) || 0;
  }

  if (data.protection !== undefined) project.protection = data.protection;
  if (data.dessinateur !== undefined) project.dessinateur = data.dessinateur;
  if (data.conducteurTravaux !== undefined) project.conducteurTravaux = data.conducteurTravaux;
  if (data.delaiLivraisonProtection !== undefined) project.delaiLivraisonProtection = data.delaiLivraisonProtection || undefined;
  if (data.delaiLivraisonChantier !== undefined) project.delaiLivraisonChantier = data.delaiLivraisonChantier;
  if (data.sousTraitantId !== undefined) project.sousTraitantId = data.sousTraitantId;
  if (data.status !== undefined) project.status = data.status;
  if (data.typeOuvrage !== undefined) project.typeOuvrage = data.typeOuvrage;
  if (data.remarquesPrestation !== undefined) project.remarquesPrestation = data.remarquesPrestation;
  if (data.checklistClient !== undefined) project.checklistClient = data.checklistClient;
  if (data.checklistSubcontractor !== undefined) project.checklistSubcontractor = data.checklistSubcontractor;

  // Sync Poids Total to Budget sold weight if budget exists and was identical
  const budget = db.budgets.find(b => b.projetId === project.id);
  if (budget) {
    budget.poidsVendu = project.poidsTotal;
  }

  saveDatabase();
  syncToFirestore("projects", project.id, project);
  if (budget) {
    syncToFirestore("budgets", budget.id, budget);
  }
  res.json(project);
});

app.delete("/api/projects/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const index = db.projects.findIndex(p => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Projet introuvable" });
    return;
  }

  // Clean cascading relations
  const budgetsToDelete = db.budgets.filter(b => b.projetId === id);
  const realisesToDelete = db.realises.filter(r => r.projetId === id);
  const billingsToDelete = db.billings.filter(b => b.projetId === id);

  db.projects.splice(index, 1);
  db.budgets = db.budgets.filter(b => b.projetId !== id);
  db.realises = db.realises.filter(r => r.projetId !== id);
  db.billings = db.billings.filter(b => b.projetId !== id);

  saveDatabase();

  deleteFromFirestore("projects", id);
  for (const b of budgetsToDelete) {
    deleteFromFirestore("budgets", b.id);
  }
  for (const r of realisesToDelete) {
    deleteFromFirestore("realises", r.id);
  }
  for (const b of billingsToDelete) {
    deleteFromFirestore("billings", b.id);
  }

  res.json({ success: true });
});


// --- BUDGETS API (CRUD) ---
app.get("/api/budgets", authenticate, (req, res) => {
  res.json(db.budgets);
});

app.put("/api/budgets/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const { 
    poidsVendu, 
    budgetFourniture, 
    budgetMainOeuvre, 
    budgetSousTraitance, 
    fraisGenerauxPct,
    budgetAciers,
    budgetPeinture,
    budgetDivers,
    budgetTransport,
    budgetProtection,
    budgetHeuresMO
  } = req.body;
  const budget = db.budgets.find(b => b.id === id);
  if (!budget) {
    res.status(404).json({ error: "Budget introuvable" });
    return;
  }

  if (poidsVendu !== undefined) budget.poidsVendu = Number(poidsVendu) || 0;
  if (budgetFourniture !== undefined) budget.budgetFourniture = Number(budgetFourniture) || 0;
  if (budgetMainOeuvre !== undefined) budget.budgetMainOeuvre = Number(budgetMainOeuvre) || 0;
  if (budgetSousTraitance !== undefined) budget.budgetSousTraitance = Number(budgetSousTraitance) || 0;
  if (fraisGenerauxPct !== undefined) budget.fraisGenerauxPct = Number(fraisGenerauxPct) || 0;
  
  if (budgetAciers !== undefined) budget.budgetAciers = Number(budgetAciers) || 0;
  if (budgetPeinture !== undefined) budget.budgetPeinture = Number(budgetPeinture) || 0;
  if (budgetDivers !== undefined) budget.budgetDivers = Number(budgetDivers) || 0;
  if (budgetTransport !== undefined) budget.budgetTransport = Number(budgetTransport) || 0;
  if (budgetProtection !== undefined) budget.budgetProtection = Number(budgetProtection) || 0;
  if (budgetHeuresMO !== undefined) budget.budgetHeuresMO = Number(budgetHeuresMO) || 0;

  saveDatabase();
  syncToFirestore("budgets", budget.id, budget);
  res.json(budget);
});


// --- REALISED (REALIŞÉ) API (CRUD) ---
app.get("/api/realises", authenticate, (req, res) => {
  res.json(db.realises);
});

app.put("/api/realises/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const { 
    poidsFabrique, 
    achatsFournitureRealise, 
    achatsMainOeuvreRealise, 
    achatsSousTraitanceRealise, 
    fraisGenerauxPct,
    achatsAciersRealise,
    achatsPeintureRealise,
    achatsDiversRealise,
    achatsTransportRealise,
    achatsProtectionRealise,
    achatsHeuresMO
  } = req.body;
  const realise = db.realises.find(r => r.id === id);
  if (!realise) {
    res.status(404).json({ error: "Réalisé introuvable" });
    return;
  }

  if (poidsFabrique !== undefined) realise.poidsFabrique = Number(poidsFabrique) || 0;
  if (achatsFournitureRealise !== undefined) realise.achatsFournitureRealise = Number(achatsFournitureRealise) || 0;
  if (achatsMainOeuvreRealise !== undefined) realise.achatsMainOeuvreRealise = Number(achatsMainOeuvreRealise) || 0;
  if (achatsSousTraitanceRealise !== undefined) realise.achatsSousTraitanceRealise = Number(achatsSousTraitanceRealise) || 0;
  if (fraisGenerauxPct !== undefined) realise.fraisGenerauxPct = Number(fraisGenerauxPct) || 0;
  
  if (achatsAciersRealise !== undefined) realise.achatsAciersRealise = Number(achatsAciersRealise) || 0;
  if (achatsPeintureRealise !== undefined) realise.achatsPeintureRealise = Number(achatsPeintureRealise) || 0;
  if (achatsDiversRealise !== undefined) realise.achatsDiversRealise = Number(achatsDiversRealise) || 0;
  if (achatsTransportRealise !== undefined) realise.achatsTransportRealise = Number(achatsTransportRealise) || 0;
  if (achatsProtectionRealise !== undefined) realise.achatsProtectionRealise = Number(achatsProtectionRealise) || 0;
  if (achatsHeuresMO !== undefined) realise.achatsHeuresMO = Number(achatsHeuresMO) || 0;

  saveDatabase();
  syncToFirestore("realises", realise.id, realise);
  res.json(realise);
});


// --- BILLINGS API (CRUD) ---
app.get("/api/billings", authenticate, (req, res) => {
  res.json(db.billings);
});

app.post("/api/billings", authenticate, requireWritePermission, (req, res) => {
  const { 
    projetId, 
    projetIds,
    typePrestation, 
    quantiteFacturee, 
    uniteFacturee, 
    prixUnitaire, 
    etatFacturation, 
    dateFacturation, 
    dateEcheance,
    factureRecue
  } = req.body;

  if (!projetId || !typePrestation) {
    res.status(400).json({ error: "Veuillez spécifier le projet et le type de prestation" });
    return;
  }

  const newBilling: Billing = {
    id: "bil_" + Math.random().toString(36).substring(2, 9),
    projetId,
    projetIds: Array.isArray(projetIds) ? projetIds : [],
    typePrestation,
    quantiteFacturee: Number(quantiteFacturee) || 0,
    uniteFacturee: uniteFacturee || BillingUnit.KG,
    prixUnitaire: Number(prixUnitaire) || 0,
    etatFacturation: etatFacturation || BillingStatus.BROUILLON,
    dateFacturation: dateFacturation || new Date().toISOString().substring(0, 10),
    dateEcheance: dateEcheance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    factureRecue: !!factureRecue,
    commentaire: req.body.commentaire || "",
    createdAt: new Date().toISOString()
  };

  db.billings.push(newBilling);

  // If billing is marked as PAYEE, automatically mark associated projects as Terminée
  const updatedProjects: Project[] = [];
  if (newBilling.etatFacturation === BillingStatus.PAYEE) {
    const idsToMark = [newBilling.projetId, ...(newBilling.projetIds || [])];
    db.projects.forEach(p => {
      if (idsToMark.includes(p.id)) {
        p.status = ProjectStatus.TERMINEE;
        updatedProjects.push(p);
      }
    });
  }

  saveDatabase();
  syncToFirestore("billings", newBilling.id, newBilling);
  for (const p of updatedProjects) {
    syncToFirestore("projects", p.id, p);
  }
  res.json(newBilling);
});

app.put("/api/billings/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const billing = db.billings.find(b => b.id === id);
  if (!billing) {
    res.status(404).json({ error: "Facturation introuvable" });
    return;
  }

  if (data.projetId !== undefined) billing.projetId = data.projetId;
  if (data.projetIds !== undefined) billing.projetIds = Array.isArray(data.projetIds) ? data.projetIds : [];
  if (data.typePrestation !== undefined) billing.typePrestation = data.typePrestation;
  if (data.quantiteFacturee !== undefined) billing.quantiteFacturee = Number(data.quantiteFacturee);
  if (data.uniteFacturee !== undefined) billing.uniteFacturee = data.uniteFacturee;
  if (data.prixUnitaire !== undefined) billing.prixUnitaire = Number(data.prixUnitaire);
  if (data.etatFacturation !== undefined) billing.etatFacturation = data.etatFacturation;
  if (data.dateFacturation !== undefined) billing.dateFacturation = data.dateFacturation;
  if (data.dateEcheance !== undefined) billing.dateEcheance = data.dateEcheance;
  if (data.factureRecue !== undefined) billing.factureRecue = !!data.factureRecue;
  if (data.commentaire !== undefined) billing.commentaire = data.commentaire;

  // If billing is marked as PAYEE, automatically mark associated projects as Terminée
  const updatedProjects: Project[] = [];
  if (billing.etatFacturation === BillingStatus.PAYEE) {
    const idsToMark = [billing.projetId, ...(billing.projetIds || [])];
    db.projects.forEach(p => {
      if (idsToMark.includes(p.id)) {
        p.status = ProjectStatus.TERMINEE;
        updatedProjects.push(p);
      }
    });
  }

  saveDatabase();
  syncToFirestore("billings", billing.id, billing);
  for (const p of updatedProjects) {
    syncToFirestore("projects", p.id, p);
  }
  res.json(billing);
});

app.delete("/api/billings/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const index = db.billings.findIndex(b => b.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Facturation introuvable" });
    return;
  }
  db.billings.splice(index, 1);
  saveDatabase();
  deleteFromFirestore("billings", id);
  res.json({ success: true });
});


// --- TYPES D'OUVRAGE API (Admin Managed) ---
app.get("/api/types-ouvrage", authenticate, (req, res) => {
  res.json(db.typesOuvrage || []);
});

app.post("/api/types-ouvrage", authenticate, requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "Le nom du type d'ouvrage est requis." });
    return;
  }
  const cleanName = name.trim();
  if (!db.typesOuvrage) {
    db.typesOuvrage = ["Passerelle", "Bâtiment industriel", "Charpente de bureaux", "Serrurerie", "Pylône", "Ouvrage d'art"];
  }
  if (db.typesOuvrage.some(t => t.toLowerCase() === cleanName.toLowerCase())) {
    res.status(400).json({ error: "Ce type d'ouvrage existe déjà." });
    return;
  }
  db.typesOuvrage.push(cleanName);
  saveDatabase();
  syncToFirestore("metadata", "global", { typesOuvrage: db.typesOuvrage });
  res.json({ success: true, list: db.typesOuvrage });
});

app.delete("/api/types-ouvrage/:name", authenticate, requireAdmin, (req, res) => {
  const { name } = req.params;
  if (!name) {
    res.status(400).json({ error: "Le nom à supprimer est requis." });
    return;
  }
  if (!db.typesOuvrage) {
    db.typesOuvrage = [];
  }
  const index = db.typesOuvrage.findIndex(t => t.toLowerCase() === name.toLowerCase());
  if (index === -1) {
    res.status(404).json({ error: "Type d'ouvrage non trouvé." });
    return;
  }
  db.typesOuvrage.splice(index, 1);
  saveDatabase();
  syncToFirestore("metadata", "global", { typesOuvrage: db.typesOuvrage });
  res.json({ success: true, list: db.typesOuvrage });
});

// --- CHANGE PASSWORD API ---
app.put("/api/auth/change-password", authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "L'ancien et le nouveau mot de passe sont requis." });
    return;
  }
  const currentUser = (req as any).user;
  const foundUser = db.users.find(u => u.id === currentUser.id);
  if (!foundUser) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }
  if (foundUser.passwordHash !== currentPassword) {
    res.status(400).json({ error: "L'ancien mot de passe est incorrect." });
    return;
  }
  foundUser.passwordHash = newPassword;
  saveDatabase();
  syncToFirestore("users", foundUser.id, foundUser);
  res.json({ success: true, message: "Votre mot de passe a été modifié avec succès !" });
});


async function startListening() {
  // Pre-load or seed Database from Google Cloud Firestore
  await loadDatabaseFromFirestore();

  // Handle assets or static builds in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // SPA fallback for all remaining endpoints
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FlowFab Server] initialized. Running on port ${PORT}`);
  });
}

startListening().catch((err) => {
  console.error("Erreur au redémarrage serveur:", err);
});
