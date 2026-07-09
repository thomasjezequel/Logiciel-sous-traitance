var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_vite = require("vite");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var app = (0, import_express.default)();
app.set("trust proxy", 1);
var PORT = 3e3;
var DB_FILE = import_path.default.join(process.cwd(), "db.json");
var SESSION_DURATION_HOURS = Number(process.env.SESSION_DURATION_HOURS) > 0 ? Number(process.env.SESSION_DURATION_HOURS) : 24;
var JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn("\u26A0\uFE0F  ATTENTION S\xC9CURIT\xC9 : la variable d'environnement JWT_SECRET n'est pas d\xE9finie. Un secret temporaire al\xE9atoire est utilis\xE9 pour cette session serveur. Configurez JWT_SECRET dans les variables d'environnement Railway pour la production.");
  return import_crypto.default.randomBytes(32).toString("hex");
})();
var ADMIN_SEED_PASSWORD = process.env.ADMIN_SEED_PASSWORD || (() => {
  console.warn("\u26A0\uFE0F  ATTENTION S\xC9CURIT\xC9 : ADMIN_SEED_PASSWORD n'est pas d\xE9fini. Un mot de passe temporaire al\xE9atoire a \xE9t\xE9 g\xE9n\xE9r\xE9 pour l'amor\xE7age initial \u2014 configurez cette variable d'environnement et changez le mot de passe admin via l'application au plus vite.");
  return "Temp_" + import_crypto.default.randomBytes(6).toString("hex");
})();
app.use((0, import_helmet.default)({ contentSecurityPolicy: false }));
var allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://logiciel-sous-traitance-production.up.railway.app",
  "https://flowbase-29.web.app",
  "http://localhost:5173"
].filter(Boolean);
app.use((0, import_cors.default)({
  origin: allowedOrigins,
  credentials: true
}));
app.use(import_express.default.json());
var DEFAULT_DB = {
  users: [
    {
      id: "admin-1",
      email: "thomas.jezequel@emg.bzh",
      nom: "Thomas J\xE9z\xE9quel",
      role: "Administrateur" /* ADMIN */,
      status: "Approuv\xE9" /* APPROVED */,
      poste: "Conducteur principal",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: ADMIN_SEED_PASSWORD
      // Variable d'environnement (jamais en clair dans le code)
    },
    {
      id: "user-demande",
      email: "collab@emg.bzh",
      nom: "Jean Dessinateur",
      role: "Lecteur" /* LECTEUR */,
      status: "En attente" /* PENDING */,
      poste: "Dessinateur projeteur",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: "Demo_" + import_crypto.default.randomBytes(4).toString("hex")
      // Compte de démo en attente, mot de passe non communiqué
    }
  ],
  typesOuvrage: ["Passerelle", "B\xE2timent industriel", "Charpente de bureaux", "Serrurerie", "Pyl\xF4ne", "Ouvrage d'art"],
  clients: [
    {
      id: "c-1",
      nom: "Eiffage M\xE9tal",
      adresse: "12 Rue de l'Acier, 75013 Paris",
      coutHoraireMO: 45
    },
    {
      id: "c-2",
      nom: "Vinci Construction",
      adresse: "45 Avenue de la R\xE9publique, 35000 Rennes",
      coutHoraireMO: 52
    },
    {
      id: "c-3",
      nom: "Bouygues B\xE2timent Grand Ouest",
      adresse: "18 Rue de l'Aviation, 44000 Nantes",
      coutHoraireMO: 48
    }
  ],
  subcontractors: [
    {
      id: "s-1",
      nom: "Atelier M\xE9canique de l'Ouest (AMO)",
      adresse: "Z.I. Saint-Gr\xE9goire, 35760 Rennes",
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
      nom: "Soudure & Chaudronnerie du Tr\xE9gor (SCT)",
      adresse: "Parc d'Activit\xE9s de P\xE9gase, 22300 Lannion",
      coutHoraireMO: 40
    }
  ],
  projects: [
    {
      id: "p-1",
      nomAffaire: "Passerelle Pi\xE9tonne - S1 Lorient",
      nomZone: "Lorient Centre",
      numCommande: "CMD-2026-001",
      dateCommande: "2026-04-10",
      clientId: "c-1",
      poidsTotal: 12500,
      poidsPRS: 8e3,
      quantiteMl: 35,
      poidsPDC: 4500,
      protection: "Galvanisation \xE0 chaud + Thermolaquage RAL 7016",
      dessinateur: "Marc Lucas",
      conducteurTravaux: "Thomas J\xE9z\xE9quel",
      delaiLivraisonProtection: "2026-07-15",
      delaiLivraisonChantier: "2026-08-01",
      sousTraitantId: "s-1"
    },
    {
      id: "p-2",
      nomAffaire: "Charpente M\xE9tallique EMG Bureau",
      nomZone: "B\xE2timent A",
      numCommande: "CMD-2026-002",
      dateCommande: "2026-05-02",
      clientId: "c-2",
      poidsTotal: 45e3,
      poidsPRS: 3e4,
      quantiteMl: 120,
      poidsPDC: 15e3,
      protection: "Primaire Peinture Intumescente R60",
      dessinateur: "Arnaud Le Gall",
      conducteurTravaux: "Thomas J\xE9z\xE9quel",
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
      budgetFourniture: 25e3,
      budgetMainOeuvre: 14e3,
      budgetSousTraitance: 18e3,
      fraisGenerauxPct: 12,
      budgetAciers: 18e3,
      budgetPeinture: 4e3,
      budgetDivers: 3e3,
      budgetTransport: 8e3,
      budgetProtection: 1e4,
      budgetHeuresMO: 350
    },
    {
      id: "b-2",
      projetId: "p-2",
      poidsVendu: 45e3,
      budgetFourniture: 9e4,
      budgetMainOeuvre: 48e3,
      budgetSousTraitance: 65e3,
      fraisGenerauxPct: 10,
      budgetAciers: 7e4,
      budgetPeinture: 12e3,
      budgetDivers: 8e3,
      budgetTransport: 25e3,
      budgetProtection: 4e4,
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
      achatsSousTraitanceRealise: 18e3,
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
      poidsFabrique: 42e3,
      achatsFournitureRealise: 82e3,
      achatsMainOeuvreRealise: 38e3,
      achatsSousTraitanceRealise: 6e4,
      fraisGenerauxPct: 10,
      achatsAciersRealise: 64e3,
      achatsPeintureRealise: 11e3,
      achatsDiversRealise: 7e3,
      achatsTransportRealise: 22e3,
      achatsProtectionRealise: 38e3,
      achatsHeuresMO: 950
    }
  ],
  billings: [
    {
      id: "bil-1",
      projetId: "p-1",
      typePrestation: "Soudage et Usinage PRS",
      quantiteFacturee: 8e3,
      uniteFacturee: "kg" /* KG */,
      prixUnitaire: 1.25,
      etatFacturation: "Pay\xE9e" /* PAYEE */,
      dateFacturation: "2026-05-15",
      dateEcheance: "2026-06-15"
    },
    {
      id: "bil-2",
      projetId: "p-1",
      typePrestation: "Traitement Zinc",
      quantiteFacturee: 35,
      uniteFacturee: "ml" /* ML */,
      prixUnitaire: 85,
      etatFacturation: "Envoy\xE9e" /* ENVOYEE */,
      dateFacturation: "2026-05-28",
      dateEcheance: "2026-06-28"
    }
  ],
  auditLog: []
};
var db = { ...DEFAULT_DB };
function loadDatabase() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const content = import_fs.default.readFileSync(DB_FILE, "utf-8");
      const loaded = JSON.parse(content);
      db = {
        users: loaded.users || DEFAULT_DB.users,
        clients: loaded.clients || DEFAULT_DB.clients,
        subcontractors: loaded.subcontractors || DEFAULT_DB.subcontractors,
        projects: loaded.projects || DEFAULT_DB.projects,
        budgets: loaded.budgets || DEFAULT_DB.budgets,
        realises: loaded.realises || DEFAULT_DB.realises,
        billings: loaded.billings || DEFAULT_DB.billings,
        typesOuvrage: loaded.typesOuvrage || DEFAULT_DB.typesOuvrage,
        auditLog: loaded.auditLog || []
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
function saveDatabase() {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}
var firebaseConfigPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
var firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : import_fs.default.existsSync(firebaseConfigPath) ? JSON.parse(import_fs.default.readFileSync(firebaseConfigPath, "utf-8")) : null;
var firebaseApp = null;
var firestoreDb = null;
if (firebaseConfig) {
  try {
    firebaseApp = (0, import_app.initializeApp)(firebaseConfig);
    (0, import_firestore.setLogLevel)("error");
    firestoreDb = (0, import_firestore.initializeFirestore)(firebaseApp, {
      experimentalForceLongPolling: true
    }, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("[Firebase] Successfully initialized with Database ID:", firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.error("[Firebase] Error during initialization:", err);
  }
} else {
  console.log("[Firebase] No firebase-applet-config.json config found. Running in local/in-memory mode.");
}
async function syncToFirestore(col, id, data) {
  if (!firestoreDb) return;
  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, col, id), cleanData);
    console.log(`[Firebase] Document synced successfully to Firestore: ${col}/${id}`);
  } catch (err) {
    console.error(`[Firebase] Error syncing ${col}/${id}:`, JSON.stringify(err));
  }
}
async function deleteFromFirestore(col, id) {
  if (!firestoreDb) return;
  try {
    await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(firestoreDb, col, id));
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
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "users", u.id), u);
    }
    for (const c of DEFAULT_DB.clients) {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "clients", c.id), c);
    }
    for (const s of DEFAULT_DB.subcontractors) {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "subcontractors", s.id), s);
    }
    for (const p of DEFAULT_DB.projects) {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "projects", p.id), p);
    }
    for (const b of DEFAULT_DB.budgets) {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "budgets", b.id), b);
    }
    for (const r of DEFAULT_DB.realises) {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "realises", r.id), r);
    }
    for (const bil of DEFAULT_DB.billings) {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "billings", bil.id), bil);
    }
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "metadata", "global"), { typesOuvrage: DEFAULT_DB.typesOuvrage });
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
    const usersSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "users"));
    const users = [];
    usersSnap.forEach((d) => users.push(d.data()));
    const clientsSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "clients"));
    const clients = [];
    clientsSnap.forEach((d) => clients.push(d.data()));
    const subcontractorsSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "subcontractors"));
    const subcontractors = [];
    subcontractorsSnap.forEach((d) => subcontractors.push(d.data()));
    const projectsSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "projects"));
    const projects = [];
    projectsSnap.forEach((d) => projects.push(d.data()));
    const budgetsSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "budgets"));
    const budgets = [];
    budgetsSnap.forEach((d) => budgets.push(d.data()));
    const realisesSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "realises"));
    const realises = [];
    realisesSnap.forEach((d) => realises.push(d.data()));
    const billingsSnap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(firestoreDb, "billings"));
    const billings = [];
    billingsSnap.forEach((d) => billings.push(d.data()));
    const typeDoc = await (0, import_firestore.getDoc)((0, import_firestore.doc)(firestoreDb, "metadata", "global"));
    let typesOuvrage = DEFAULT_DB.typesOuvrage;
    if (typeDoc.exists() && typeDoc.data()?.typesOuvrage) {
      typesOuvrage = typeDoc.data()?.typesOuvrage;
    }
    const auditDoc = await (0, import_firestore.getDoc)((0, import_firestore.doc)(firestoreDb, "metadata", "auditLog"));
    let auditLog = [];
    if (auditDoc.exists() && Array.isArray(auditDoc.data()?.entries)) {
      auditLog = auditDoc.data()?.entries;
    }
    if (users.length === 0 && clients.length === 0 && projects.length === 0) {
      await seedFirestoreFromDefault();
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
      typesOuvrage,
      auditLog
    };
    console.log("[Firebase] Successfully loaded database state from Firestore!");
    saveDatabase();
  } catch (err) {
    console.error("[Firebase] Error loading database from Firestore. Falling back to local file...", err);
    loadDatabase();
  }
}
loadDatabase();
function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}
function generateToken(userId) {
  const payload = { userId, expires: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1e3 };
  const payloadStr = base64url(JSON.stringify(payload));
  const signature = base64url(import_crypto.default.createHmac("sha256", JWT_SECRET).update(payloadStr).digest());
  return `${payloadStr}.${signature}`;
}
function parseToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadStr, signature] = parts;
    const expectedSignature = base64url(import_crypto.default.createHmac("sha256", JWT_SECRET).update(payloadStr).digest());
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !import_crypto.default.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(base64urlDecode(payloadStr).toString("utf-8"));
    if (!payload || !payload.userId || !payload.expires) return null;
    return payload;
  } catch {
    return null;
  }
}
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(418).json({ error: "Authentification requise" });
    return;
  }
  const token = authHeader.substring(7);
  const parsed = parseToken(token);
  if (!parsed) {
    res.status(401).json({ error: "Session expir\xE9e ou invalide" });
    return;
  }
  if (parsed.expires < Date.now()) {
    res.status(401).json({ error: "Votre session a expir\xE9, veuillez vous reconnecter." });
    return;
  }
  const user = db.users.find((u) => u.id === parsed.userId);
  if (!user) {
    res.status(401).json({ error: "Utilisateur introuvable" });
    return;
  }
  if (user.status !== "Approuv\xE9" /* APPROVED */) {
    res.status(403).json({ error: "Votre compte est en attente d'approbation d'un administrateur" });
    return;
  }
  req.user = user;
  next();
}
function requireWritePermission(req, res, next) {
  const user = req.user;
  if (user.role === "Lecteur" /* LECTEUR */) {
    res.status(403).json({ error: "Droits insuffisants (Lecture seule uniquement)" });
    return;
  }
  next();
}
function requireUnrestrictedWrite(req, res, next) {
  const user = req.user;
  if (hasAnyRestriction(user)) {
    res.status(403).json({ error: "Votre compte est restreint \xE0 certains clients : cette action n'est pas autoris\xE9e." });
    return;
  }
  next();
}
function requireAdmin(req, res, next) {
  const user = req.user;
  if (user.role !== "Administrateur" /* ADMIN */) {
    res.status(403).json({ error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs" });
    return;
  }
  next();
}
function hasAnyRestriction(user) {
  if (user.role === "Administrateur" /* ADMIN */) return false;
  const hasProjectLimit = Array.isArray(user.allowedProjectIds) && user.allowedProjectIds.length > 0;
  const hasClientLimit = Array.isArray(user.allowedClientIds) && user.allowedClientIds.length > 0;
  return hasProjectLimit || hasClientLimit;
}
function userCanAccessProject(user, project) {
  if (!project) return false;
  if (user.role === "Administrateur" /* ADMIN */) return true;
  if (!hasAnyRestriction(user)) return true;
  const hasProjectLimit = Array.isArray(user.allowedProjectIds) && user.allowedProjectIds.length > 0;
  const hasClientLimit = Array.isArray(user.allowedClientIds) && user.allowedClientIds.length > 0;
  const isProjectAllowed = hasProjectLimit && user.allowedProjectIds.includes(project.id);
  const isClientAllowed = hasClientLimit && user.allowedClientIds.includes(project.clientId);
  return isProjectAllowed || isClientAllowed;
}
function userCanAccessClient(user, clientId) {
  if (!clientId) return false;
  if (user.role === "Administrateur" /* ADMIN */) return true;
  const hasClientLimit = Array.isArray(user.allowedClientIds) && user.allowedClientIds.length > 0;
  if (!hasClientLimit) return true;
  return user.allowedClientIds.includes(clientId);
}
function getAccessibleProjects(user) {
  if (!hasAnyRestriction(user)) return db.projects;
  return db.projects.filter((p) => userCanAccessProject(user, p));
}
var loginAttempts = /* @__PURE__ */ new Map();
var MAX_LOGIN_ATTEMPTS = 8;
var LOGIN_WINDOW_MS = 10 * 60 * 1e3;
function checkAndRegisterLoginAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_LOGIN_ATTEMPTS;
}
function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}
var MAX_AUDIT_ENTRIES = 1e3;
function logAudit(actor, action, details) {
  try {
    const entry = {
      id: "log_" + Math.random().toString(36).substring(2, 9),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      actorEmail: actor.email,
      actorNom: actor.nom,
      action,
      details
    };
    db.auditLog.push(entry);
    if (db.auditLog.length > MAX_AUDIT_ENTRIES) {
      db.auditLog = db.auditLog.slice(db.auditLog.length - MAX_AUDIT_ENTRIES);
    }
    saveDatabase();
    if (firestoreDb) {
      (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreDb, "metadata", "auditLog"), { entries: db.auditLog }).catch((err) => {
        console.error("[Firebase] Erreur de synchronisation du journal d'audit :", err);
      });
    }
  } catch (err) {
    console.error("Erreur lors de l'\xE9criture du journal d'audit :", err);
  }
}
app.post("/api/auth/register", async (req, res) => {
  const { email, nom, password, requestedRole } = req.body;
  if (!email || !nom || !password) {
    res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires" });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: "Le mot de passe doit comporter au moins 8 caract\xE8res." });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    res.status(400).json({ error: "Cette adresse email est d\xE9j\xE0 enregistr\xE9e" });
    return;
  }
  try {
    const isAdmin = normalizedEmail === "thomas.jezequel@emg.bzh";
    const hashedPassword = await import_bcryptjs.default.hash(password, 10);
    const newUser = {
      id: "u_" + Math.random().toString(36).substring(2, 9),
      email: normalizedEmail,
      nom: nom.trim(),
      role: isAdmin ? "Administrateur" /* ADMIN */ : requestedRole || "Lecteur" /* LECTEUR */,
      status: isAdmin ? "Approuv\xE9" /* APPROVED */ : "En attente" /* PENDING */,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: hashedPassword
    };
    db.users.push(newUser);
    saveDatabase();
    syncToFirestore("users", newUser.id, newUser);
    res.json({
      message: isAdmin ? "Compte administrateur cr\xE9\xE9 et approuv\xE9 automatiquement !" : "Inscription r\xE9ussie ! Votre compte est en attente d'approbation de Thomas J\xE9z\xE9quel.",
      user: {
        id: newUser.id,
        email: newUser.email,
        nom: newUser.nom,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (err) {
    console.error("Erreur lors de l'inscription :", err);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (!checkAndRegisterLoginAttempt(clientIp)) {
    res.status(429).json({ error: "Trop de tentatives de connexion. Veuillez r\xE9essayer dans quelques minutes." });
    return;
  }
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Veuillez entrer une adresse email et un mot de passe" });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    res.status(400).json({ error: "Identifiant ou mot de passe incorrect" });
    return;
  }
  try {
    const isHashed = user.passwordHash.startsWith("$2");
    const passwordMatches = isHashed ? await import_bcryptjs.default.compare(password, user.passwordHash) : password === user.passwordHash;
    if (!passwordMatches) {
      res.status(400).json({ error: "Identifiant ou mot de passe incorrect" });
      return;
    }
    if (!isHashed) {
      user.passwordHash = await import_bcryptjs.default.hash(password, 10);
      saveDatabase();
      syncToFirestore("users", user.id, user);
    }
  } catch (err) {
    console.error("Erreur de v\xE9rification du mot de passe :", err);
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
    return;
  }
  if (user.status === "En attente" /* PENDING */) {
    res.status(403).json({ error: "Votre compte de membre (" + user.role + ") est en attente d'approbation par thomas.jezequel@emg.bzh." });
    return;
  }
  if (user.status === "Suspendu" /* SUSPENDED */) {
    res.status(403).json({ error: "Votre compte a \xE9t\xE9 suspendu par un administrateur." });
    return;
  }
  const token = generateToken(user.id);
  resetLoginAttempts(clientIp);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      status: user.status,
      poste: user.poste,
      allowedClientIds: user.allowedClientIds || [],
      allowedProjectIds: user.allowedProjectIds || [],
      createdAt: user.createdAt
    }
  });
});
app.get("/api/auth/me", authenticate, (req, res) => {
  const user = req.user;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      status: user.status,
      poste: user.poste,
      allowedClientIds: user.allowedClientIds || [],
      allowedProjectIds: user.allowedProjectIds || [],
      createdAt: user.createdAt
    }
  });
});
app.get("/api/users", authenticate, requireAdmin, (req, res) => {
  const list = db.users.map(({ passwordHash, ...user }) => user);
  res.json(list);
});
app.put("/api/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, role, allowedProjectIds, poste, allowedClientIds, nom } = req.body;
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "Utilisateur non trouv\xE9" });
    return;
  }
  const currentAdmin = req.user;
  if (user.email === currentAdmin.email && (status !== void 0 || role !== void 0)) {
    res.status(400).json({ error: "Vous ne pouvez pas modifier le statut ou le r\xF4le de votre propre compte administrateur" });
    return;
  }
  const previousStatus = user.status;
  const previousRole = user.role;
  if (status !== void 0) user.status = status;
  if (role !== void 0) user.role = role;
  if (allowedProjectIds !== void 0) user.allowedProjectIds = allowedProjectIds;
  if (allowedClientIds !== void 0) user.allowedClientIds = allowedClientIds;
  if (poste !== void 0) user.poste = poste;
  if (nom !== void 0) user.nom = nom;
  if (status !== void 0 && status !== previousStatus) {
    logAudit(currentAdmin, "Changement de statut utilisateur", `${user.email} : ${previousStatus} \u2192 ${status}`);
  }
  if (role !== void 0 && role !== previousRole) {
    logAudit(currentAdmin, "Changement de r\xF4le utilisateur", `${user.email} : ${previousRole} \u2192 ${role}`);
  }
  if (allowedClientIds !== void 0 || allowedProjectIds !== void 0) {
    logAudit(currentAdmin, "Modification des habilitations", `${user.email} : clients=[${(allowedClientIds || []).join(", ")}] projets=[${(allowedProjectIds || []).join(", ")}]`);
  }
  saveDatabase();
  syncToFirestore("users", user.id, user);
  res.json(user);
});
app.delete("/api/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Utilisateur non trouv\xE9" });
    return;
  }
  const user = db.users[index];
  const currentAdmin = req.user;
  if (user.email === currentAdmin.email) {
    res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    return;
  }
  db.users.splice(index, 1);
  saveDatabase();
  deleteFromFirestore("users", id);
  logAudit(currentAdmin, "Suppression d'utilisateur", `${user.email} (${user.nom})`);
  res.json({ success: true, message: "Utilisateur supprim\xE9" });
});
app.get("/api/clients", authenticate, (req, res) => {
  const user = req.user;
  const hasClientLimit = Array.isArray(user.allowedClientIds) && user.allowedClientIds.length > 0;
  if (user.role === "Administrateur" /* ADMIN */ || !hasClientLimit) {
    res.json(db.clients);
    return;
  }
  res.json(db.clients.filter((c) => user.allowedClientIds.includes(c.id)));
});
app.post("/api/clients", authenticate, requireWritePermission, (req, res) => {
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct } = req.body;
  if (!nom) {
    res.status(400).json({ error: "Le nom du client est requis" });
    return;
  }
  const newClient = {
    id: "c_" + Math.random().toString(36).substring(2, 9),
    nom,
    adresse: adresse || "",
    coutHoraireMO: Number(coutHoraireMO) || 0,
    fraisGenerauxPct: fraisGenerauxPct !== void 0 ? Number(fraisGenerauxPct) : 10,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.clients.push(newClient);
  saveDatabase();
  syncToFirestore("clients", newClient.id, newClient);
  res.json(newClient);
});
app.put("/api/clients/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!userCanAccessClient(user, id)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 modifier ce client." });
    return;
  }
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct } = req.body;
  const client = db.clients.find((c) => c.id === id);
  if (!client) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }
  if (nom !== void 0) client.nom = nom;
  if (adresse !== void 0) client.adresse = adresse;
  if (coutHoraireMO !== void 0) client.coutHoraireMO = Number(coutHoraireMO);
  if (fraisGenerauxPct !== void 0) client.fraisGenerauxPct = Number(fraisGenerauxPct);
  saveDatabase();
  syncToFirestore("clients", client.id, client);
  res.json(client);
});
app.delete("/api/clients/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!userCanAccessClient(user, id)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 supprimer ce client." });
    return;
  }
  const index = db.clients.findIndex((c) => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }
  const clientName = db.clients[index].nom;
  const clientProjects = db.projects.filter((p) => p.clientId === id);
  const projectIds = clientProjects.map((p) => p.id);
  const budgetsToDelete = db.budgets.filter((b) => projectIds.includes(b.projetId));
  const realisesToDelete = db.realises.filter((r) => projectIds.includes(r.projetId));
  const billingsToDelete = db.billings.filter((b) => projectIds.includes(b.projetId) || b.projetIds?.some((pid) => projectIds.includes(pid)));
  db.projects = db.projects.filter((p) => p.clientId !== id);
  db.budgets = db.budgets.filter((b) => !projectIds.includes(b.projetId));
  db.realises = db.realises.filter((r) => !projectIds.includes(r.projetId));
  db.billings = db.billings.filter((b) => !projectIds.includes(b.projetId) && !b.projetIds?.some((pid) => projectIds.includes(pid)));
  db.clients.splice(index, 1);
  saveDatabase();
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
  logAudit(user, "Suppression de client", `${clientName} (et ${projectIds.length} affaires associ\xE9es)`);
  res.json({ success: true, message: `Client et ${projectIds.length} projets associ\xE9s ont \xE9t\xE9 supprim\xE9s.` });
});
app.get("/api/subcontractors", authenticate, (req, res) => {
  res.json(db.subcontractors);
});
app.post("/api/subcontractors", authenticate, requireWritePermission, requireUnrestrictedWrite, (req, res) => {
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct, estExterieur } = req.body;
  if (!nom) {
    res.status(400).json({ error: "Le nom du sous-traitant est requis" });
    return;
  }
  const newSub = {
    id: "s_" + Math.random().toString(36).substring(2, 9),
    nom,
    adresse: adresse || "",
    coutHoraireMO: Number(coutHoraireMO) || 0,
    fraisGenerauxPct: fraisGenerauxPct !== void 0 ? Number(fraisGenerauxPct) : 10,
    estExterieur: !!estExterieur,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.subcontractors.push(newSub);
  saveDatabase();
  syncToFirestore("subcontractors", newSub.id, newSub);
  res.json(newSub);
});
app.put("/api/subcontractors/:id", authenticate, requireWritePermission, requireUnrestrictedWrite, (req, res) => {
  const { id } = req.params;
  const { nom, adresse, coutHoraireMO, fraisGenerauxPct, estExterieur } = req.body;
  const sub = db.subcontractors.find((s) => s.id === id);
  if (!sub) {
    res.status(404).json({ error: "Sous-traitant introuvable" });
    return;
  }
  if (nom !== void 0) sub.nom = nom;
  if (adresse !== void 0) sub.adresse = adresse;
  if (coutHoraireMO !== void 0) sub.coutHoraireMO = Number(coutHoraireMO);
  if (fraisGenerauxPct !== void 0) sub.fraisGenerauxPct = Number(fraisGenerauxPct);
  if (estExterieur !== void 0) sub.estExterieur = !!estExterieur;
  saveDatabase();
  syncToFirestore("subcontractors", sub.id, sub);
  res.json(sub);
});
app.delete("/api/subcontractors/:id", authenticate, requireWritePermission, requireUnrestrictedWrite, (req, res) => {
  const { id } = req.params;
  const subDeleteUser = req.user;
  const index = db.subcontractors.findIndex((s) => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Sous-traitant introuvable" });
    return;
  }
  const subName = db.subcontractors[index].nom;
  const subProjects = db.projects.filter((p) => p.sousTraitantId === id);
  const projectIds = subProjects.map((p) => p.id);
  const budgetsToDelete = db.budgets.filter((b) => projectIds.includes(b.projetId));
  const realisesToDelete = db.realises.filter((r) => projectIds.includes(r.projetId));
  const billingsToDelete = db.billings.filter((b) => projectIds.includes(b.projetId) || b.projetIds?.some((pid) => projectIds.includes(pid)));
  db.projects = db.projects.filter((p) => p.sousTraitantId !== id);
  db.budgets = db.budgets.filter((b) => !projectIds.includes(b.projetId));
  db.realises = db.realises.filter((r) => !projectIds.includes(r.projetId));
  db.billings = db.billings.filter((b) => !projectIds.includes(b.projetId) && !b.projetIds?.some((pid) => projectIds.includes(pid)));
  db.subcontractors.splice(index, 1);
  saveDatabase();
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
  logAudit(subDeleteUser, "Suppression de sous-traitant", `${subName} (et ${projectIds.length} affaires associ\xE9es)`);
  res.json({ success: true, message: `Sous-traitant et ${projectIds.length} projets associ\xE9s ont \xE9t\xE9 supprim\xE9s.` });
});
app.get("/api/projects", authenticate, (req, res) => {
  const user = req.user;
  res.json(getAccessibleProjects(user));
});
app.post("/api/projects", authenticate, requireWritePermission, (req, res) => {
  const data = req.body;
  if (!data.nomAffaire || !data.nomZone || !data.clientId || !data.sousTraitantId) {
    res.status(400).json({ error: "Veuillez renseigner le nom d'affaire, la zone, le client et le sous-traitant." });
    return;
  }
  const user = req.user;
  if (!userCanAccessClient(user, data.clientId)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 cr\xE9er une affaire pour ce client." });
    return;
  }
  const pPRS = data.poidsPRS ? Number(data.poidsPRS) : void 0;
  const pPDC = data.poidsPDC ? Number(data.poidsPDC) : void 0;
  let computedPoidsTotal = 0;
  if (pPRS !== void 0 || pPDC !== void 0) {
    computedPoidsTotal = (pPDC || 0) + (pPRS || 0);
  } else {
    computedPoidsTotal = Number(data.poidsTotal) || 0;
  }
  const newProject = {
    id: "p_" + Math.random().toString(36).substring(2, 9),
    nomAffaire: data.nomAffaire,
    nomZone: data.nomZone,
    numCommande: data.numCommande || "",
    numCommandeSousTraitant: data.numCommandeSousTraitant || "",
    dateCommande: data.dateCommande || (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    clientId: data.clientId,
    poidsTotal: computedPoidsTotal,
    poidsPRS: pPRS,
    quantiteMl: data.quantiteMl ? Number(data.quantiteMl) : void 0,
    poidsPDC: pPDC,
    protection: data.protection || "",
    dessinateur: data.dessinateur || "",
    conducteurTravaux: data.conducteurTravaux || "",
    // Default empty / no longer pre-filled
    delaiLivraisonProtection: data.delaiLivraisonProtection || void 0,
    delaiLivraisonChantier: data.delaiLivraisonChantier || "",
    sousTraitantId: data.sousTraitantId,
    status: data.status || "En cours" /* EN_COURS */,
    typeOuvrage: data.typeOuvrage || "",
    remarquesPrestation: data.remarquesPrestation || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    checklistClient: data.checklistClient || {},
    checklistSubcontractor: data.checklistSubcontractor || {}
  };
  db.projects.push(newProject);
  const newBudget = {
    id: "b_" + Math.random().toString(36).substring(2, 9),
    projetId: newProject.id,
    poidsVendu: newProject.poidsTotal,
    budgetFourniture: 0,
    budgetMainOeuvre: 0,
    budgetSousTraitance: 0,
    fraisGenerauxPct: 10
  };
  const newRealise = {
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
  const user = req.user;
  const project = db.projects.find((p) => p.id === id);
  if (!project) {
    res.status(404).json({ error: "Projet introuvable" });
    return;
  }
  if (!userCanAccessProject(user, project)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 modifier cette affaire." });
    return;
  }
  if (data.clientId !== void 0 && !userCanAccessClient(user, data.clientId)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 attribuer cette affaire \xE0 ce client." });
    return;
  }
  if (data.nomAffaire !== void 0) project.nomAffaire = data.nomAffaire;
  if (data.nomZone !== void 0) project.nomZone = data.nomZone;
  if (data.numCommande !== void 0) project.numCommande = data.numCommande;
  if (data.numCommandeSousTraitant !== void 0) project.numCommandeSousTraitant = data.numCommandeSousTraitant;
  if (data.dateCommande !== void 0) project.dateCommande = data.dateCommande;
  if (data.clientId !== void 0) project.clientId = data.clientId;
  if (data.poidsPRS !== void 0) project.poidsPRS = data.poidsPRS === "" ? void 0 : Number(data.poidsPRS);
  if (data.poidsPDC !== void 0) project.poidsPDC = data.poidsPDC === "" ? void 0 : Number(data.poidsPDC);
  if (data.quantiteMl !== void 0) project.quantiteMl = data.quantiteMl === "" ? void 0 : Number(data.quantiteMl);
  if (project.poidsPRS !== void 0 || project.poidsPDC !== void 0) {
    project.poidsTotal = (project.poidsPDC || 0) + (project.poidsPRS || 0);
  } else if (data.poidsTotal !== void 0) {
    project.poidsTotal = Number(data.poidsTotal) || 0;
  }
  if (data.protection !== void 0) project.protection = data.protection;
  if (data.dessinateur !== void 0) project.dessinateur = data.dessinateur;
  if (data.conducteurTravaux !== void 0) project.conducteurTravaux = data.conducteurTravaux;
  if (data.delaiLivraisonProtection !== void 0) project.delaiLivraisonProtection = data.delaiLivraisonProtection || void 0;
  if (data.delaiLivraisonChantier !== void 0) project.delaiLivraisonChantier = data.delaiLivraisonChantier;
  if (data.sousTraitantId !== void 0) project.sousTraitantId = data.sousTraitantId;
  if (data.status !== void 0) project.status = data.status;
  if (data.typeOuvrage !== void 0) project.typeOuvrage = data.typeOuvrage;
  if (data.remarquesPrestation !== void 0) project.remarquesPrestation = data.remarquesPrestation;
  if (data.checklistClient !== void 0) project.checklistClient = data.checklistClient;
  if (data.checklistSubcontractor !== void 0) project.checklistSubcontractor = data.checklistSubcontractor;
  const budget = db.budgets.find((b) => b.projetId === project.id);
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
  const user = req.user;
  const projectToDelete = db.projects.find((p) => p.id === id);
  if (!projectToDelete) {
    res.status(404).json({ error: "Projet introuvable" });
    return;
  }
  if (!userCanAccessProject(user, projectToDelete)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 supprimer cette affaire." });
    return;
  }
  const index = db.projects.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Projet introuvable" });
    return;
  }
  const budgetsToDelete = db.budgets.filter((b) => b.projetId === id);
  const realisesToDelete = db.realises.filter((r) => r.projetId === id);
  const billingsToDelete = db.billings.filter((b) => b.projetId === id);
  db.projects.splice(index, 1);
  db.budgets = db.budgets.filter((b) => b.projetId !== id);
  db.realises = db.realises.filter((r) => r.projetId !== id);
  db.billings = db.billings.filter((b) => b.projetId !== id);
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
  logAudit(user, "Suppression d'affaire", `${projectToDelete.nomAffaire} - ${projectToDelete.nomZone}`);
  res.json({ success: true });
});
app.get("/api/budgets", authenticate, (req, res) => {
  const user = req.user;
  if (!hasAnyRestriction(user)) {
    res.json(db.budgets);
    return;
  }
  const accessibleIds = new Set(getAccessibleProjects(user).map((p) => p.id));
  res.json(db.budgets.filter((b) => accessibleIds.has(b.projetId)));
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
  const budget = db.budgets.find((b) => b.id === id);
  if (!budget) {
    res.status(404).json({ error: "Budget introuvable" });
    return;
  }
  const userBudget = req.user;
  const budgetProject = db.projects.find((p) => p.id === budget.projetId);
  if (!userCanAccessProject(userBudget, budgetProject)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 modifier le budget de cette affaire." });
    return;
  }
  if (poidsVendu !== void 0) budget.poidsVendu = Number(poidsVendu) || 0;
  if (budgetFourniture !== void 0) budget.budgetFourniture = Number(budgetFourniture) || 0;
  if (budgetMainOeuvre !== void 0) budget.budgetMainOeuvre = Number(budgetMainOeuvre) || 0;
  if (budgetSousTraitance !== void 0) budget.budgetSousTraitance = Number(budgetSousTraitance) || 0;
  if (fraisGenerauxPct !== void 0) budget.fraisGenerauxPct = Number(fraisGenerauxPct) || 0;
  if (budgetAciers !== void 0) budget.budgetAciers = Number(budgetAciers) || 0;
  if (budgetPeinture !== void 0) budget.budgetPeinture = Number(budgetPeinture) || 0;
  if (budgetDivers !== void 0) budget.budgetDivers = Number(budgetDivers) || 0;
  if (budgetTransport !== void 0) budget.budgetTransport = Number(budgetTransport) || 0;
  if (budgetProtection !== void 0) budget.budgetProtection = Number(budgetProtection) || 0;
  if (budgetHeuresMO !== void 0) budget.budgetHeuresMO = Number(budgetHeuresMO) || 0;
  saveDatabase();
  syncToFirestore("budgets", budget.id, budget);
  res.json(budget);
});
app.get("/api/realises", authenticate, (req, res) => {
  const user = req.user;
  if (!hasAnyRestriction(user)) {
    res.json(db.realises);
    return;
  }
  const accessibleIds = new Set(getAccessibleProjects(user).map((p) => p.id));
  res.json(db.realises.filter((r) => accessibleIds.has(r.projetId)));
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
    achatsHeuresMO,
    poidsUtilise,
    poidsSousTraite
  } = req.body;
  const realise = db.realises.find((r) => r.id === id);
  if (!realise) {
    res.status(404).json({ error: "R\xE9alis\xE9 introuvable" });
    return;
  }
  const userRealise = req.user;
  const realiseProject = db.projects.find((p) => p.id === realise.projetId);
  if (!userCanAccessProject(userRealise, realiseProject)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 modifier le r\xE9alis\xE9 de cette affaire." });
    return;
  }
  if (poidsFabrique !== void 0) realise.poidsFabrique = Number(poidsFabrique) || 0;
  if (achatsFournitureRealise !== void 0) realise.achatsFournitureRealise = Number(achatsFournitureRealise) || 0;
  if (achatsMainOeuvreRealise !== void 0) realise.achatsMainOeuvreRealise = Number(achatsMainOeuvreRealise) || 0;
  if (achatsSousTraitanceRealise !== void 0) realise.achatsSousTraitanceRealise = Number(achatsSousTraitanceRealise) || 0;
  if (fraisGenerauxPct !== void 0) realise.fraisGenerauxPct = Number(fraisGenerauxPct) || 0;
  if (achatsAciersRealise !== void 0) realise.achatsAciersRealise = Number(achatsAciersRealise) || 0;
  if (achatsPeintureRealise !== void 0) realise.achatsPeintureRealise = Number(achatsPeintureRealise) || 0;
  if (achatsDiversRealise !== void 0) realise.achatsDiversRealise = Number(achatsDiversRealise) || 0;
  if (achatsTransportRealise !== void 0) realise.achatsTransportRealise = Number(achatsTransportRealise) || 0;
  if (achatsProtectionRealise !== void 0) realise.achatsProtectionRealise = Number(achatsProtectionRealise) || 0;
  if (achatsHeuresMO !== void 0) realise.achatsHeuresMO = Number(achatsHeuresMO) || 0;
  if (poidsUtilise !== void 0) realise.poidsUtilise = Number(poidsUtilise) || 0;
  if (poidsSousTraite !== void 0) realise.poidsSousTraite = Number(poidsSousTraite) || 0;
  saveDatabase();
  syncToFirestore("realises", realise.id, realise);
  res.json(realise);
});
app.get("/api/billings", authenticate, (req, res) => {
  const user = req.user;
  if (!hasAnyRestriction(user)) {
    res.json(db.billings);
    return;
  }
  const accessibleIds = new Set(getAccessibleProjects(user).map((p) => p.id));
  res.json(db.billings.filter((b) => accessibleIds.has(b.projetId) || b.projetIds?.some((id) => accessibleIds.has(id))));
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
    res.status(400).json({ error: "Veuillez sp\xE9cifier le projet et le type de prestation" });
    return;
  }
  const userBilling = req.user;
  const allLinkedIds = [projetId, ...Array.isArray(projetIds) ? projetIds : []];
  const hasAccessToAll = allLinkedIds.every((pid) => userCanAccessProject(userBilling, db.projects.find((p) => p.id === pid)));
  if (!hasAccessToAll) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 facturer une ou plusieurs des affaires s\xE9lectionn\xE9es." });
    return;
  }
  const newBilling = {
    id: "bil_" + Math.random().toString(36).substring(2, 9),
    projetId,
    projetIds: Array.isArray(projetIds) ? projetIds : [],
    typePrestation,
    quantiteFacturee: Number(quantiteFacturee) || 0,
    uniteFacturee: uniteFacturee || "kg" /* KG */,
    prixUnitaire: Number(prixUnitaire) || 0,
    etatFacturation: etatFacturation || "Brouillon" /* BROUILLON */,
    dateFacturation: dateFacturation || (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    dateEcheance: dateEcheance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().substring(0, 10),
    factureRecue: !!factureRecue,
    commentaire: req.body.commentaire || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.billings.push(newBilling);
  const updatedProjects = [];
  if (newBilling.etatFacturation === "Pay\xE9e" /* PAYEE */) {
    const idsToMark = [newBilling.projetId, ...newBilling.projetIds || []];
    db.projects.forEach((p) => {
      if (idsToMark.includes(p.id)) {
        p.status = "Termin\xE9e" /* TERMINEE */;
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
  const userBillingPut = req.user;
  const billing = db.billings.find((b) => b.id === id);
  if (!billing) {
    res.status(404).json({ error: "Facturation introuvable" });
    return;
  }
  const currentLinkedIds = [billing.projetId, ...billing.projetIds || []];
  const hasAccessToCurrent = currentLinkedIds.every((pid) => userCanAccessProject(userBillingPut, db.projects.find((p) => p.id === pid)));
  if (!hasAccessToCurrent) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 modifier cette facturation." });
    return;
  }
  if (data.projetId !== void 0 || data.projetIds !== void 0) {
    const nextLinkedIds = [
      data.projetId !== void 0 ? data.projetId : billing.projetId,
      ...(data.projetIds !== void 0 ? data.projetIds : billing.projetIds) || []
    ];
    const hasAccessToNext = nextLinkedIds.every((pid) => userCanAccessProject(userBillingPut, db.projects.find((p) => p.id === pid)));
    if (!hasAccessToNext) {
      res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 lier cette facturation \xE0 l'une des affaires s\xE9lectionn\xE9es." });
      return;
    }
  }
  if (data.projetId !== void 0) billing.projetId = data.projetId;
  if (data.projetIds !== void 0) billing.projetIds = Array.isArray(data.projetIds) ? data.projetIds : [];
  if (data.typePrestation !== void 0) billing.typePrestation = data.typePrestation;
  if (data.quantiteFacturee !== void 0) billing.quantiteFacturee = Number(data.quantiteFacturee);
  if (data.uniteFacturee !== void 0) billing.uniteFacturee = data.uniteFacturee;
  if (data.prixUnitaire !== void 0) billing.prixUnitaire = Number(data.prixUnitaire);
  if (data.etatFacturation !== void 0) billing.etatFacturation = data.etatFacturation;
  if (data.dateFacturation !== void 0) billing.dateFacturation = data.dateFacturation;
  if (data.dateEcheance !== void 0) billing.dateEcheance = data.dateEcheance;
  if (data.factureRecue !== void 0) billing.factureRecue = !!data.factureRecue;
  if (data.commentaire !== void 0) billing.commentaire = data.commentaire;
  const updatedProjects = [];
  if (billing.etatFacturation === "Pay\xE9e" /* PAYEE */) {
    const idsToMark = [billing.projetId, ...billing.projetIds || []];
    db.projects.forEach((p) => {
      if (idsToMark.includes(p.id)) {
        p.status = "Termin\xE9e" /* TERMINEE */;
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
  const userBillingDelete = req.user;
  const billingToDelete = db.billings.find((b) => b.id === id);
  if (!billingToDelete) {
    res.status(404).json({ error: "Facturation introuvable" });
    return;
  }
  const linkedIds = [billingToDelete.projetId, ...billingToDelete.projetIds || []];
  const hasAccess = linkedIds.every((pid) => userCanAccessProject(userBillingDelete, db.projects.find((p) => p.id === pid)));
  if (!hasAccess) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 supprimer cette facturation." });
    return;
  }
  const index = db.billings.findIndex((b) => b.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Facturation introuvable" });
    return;
  }
  db.billings.splice(index, 1);
  saveDatabase();
  deleteFromFirestore("billings", id);
  res.json({ success: true });
});
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
    db.typesOuvrage = ["Passerelle", "B\xE2timent industriel", "Charpente de bureaux", "Serrurerie", "Pyl\xF4ne", "Ouvrage d'art"];
  }
  if (db.typesOuvrage.some((t) => t.toLowerCase() === cleanName.toLowerCase())) {
    res.status(400).json({ error: "Ce type d'ouvrage existe d\xE9j\xE0." });
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
    res.status(400).json({ error: "Le nom \xE0 supprimer est requis." });
    return;
  }
  if (!db.typesOuvrage) {
    db.typesOuvrage = [];
  }
  const index = db.typesOuvrage.findIndex((t) => t.toLowerCase() === name.toLowerCase());
  if (index === -1) {
    res.status(404).json({ error: "Type d'ouvrage non trouv\xE9." });
    return;
  }
  db.typesOuvrage.splice(index, 1);
  saveDatabase();
  syncToFirestore("metadata", "global", { typesOuvrage: db.typesOuvrage });
  res.json({ success: true, list: db.typesOuvrage });
});
app.put("/api/auth/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "L'ancien et le nouveau mot de passe sont requis." });
    return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ error: "Le nouveau mot de passe doit comporter au moins 8 caract\xE8res." });
    return;
  }
  const currentUser = req.user;
  const foundUser = db.users.find((u) => u.id === currentUser.id);
  if (!foundUser) {
    res.status(404).json({ error: "Utilisateur non trouv\xE9" });
    return;
  }
  try {
    const isHashed = foundUser.passwordHash.startsWith("$2");
    const currentMatches = isHashed ? await import_bcryptjs.default.compare(currentPassword, foundUser.passwordHash) : currentPassword === foundUser.passwordHash;
    if (!currentMatches) {
      res.status(400).json({ error: "L'ancien mot de passe est incorrect." });
      return;
    }
    foundUser.passwordHash = await import_bcryptjs.default.hash(newPassword, 10);
    saveDatabase();
    syncToFirestore("users", foundUser.id, foundUser);
    logAudit(foundUser, "Changement de mot de passe", `${foundUser.email} a modifi\xE9 son mot de passe`);
    res.json({ success: true, message: "Votre mot de passe a \xE9t\xE9 modifi\xE9 avec succ\xE8s !" });
  } catch (err) {
    console.error("Erreur lors du changement de mot de passe :", err);
    res.status(500).json({ error: "Erreur serveur lors du changement de mot de passe." });
  }
});
app.get("/api/interlocuteurs", authenticate, (req, res) => {
  res.json(db.interlocuteurs || []);
});
app.post("/api/interlocuteurs", authenticate, requireWritePermission, (req, res) => {
  const { nom, prenom, email, type, entiteId, entites } = req.body;
  if (!nom || !prenom || !email) {
    res.status(400).json({ error: "Nom, pr\xE9nom et email sont requis." });
    return;
  }
  const newItem = {
    id: "int_" + Math.random().toString(36).substring(2, 9),
    nom,
    prenom,
    email,
    type: type || (entites?.[0]?.type ?? "client"),
    entiteId: entiteId || entites?.[0]?.entiteId || "",
    entites: Array.isArray(entites) ? entites : type && entiteId ? [{ type, entiteId }] : [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!db.interlocuteurs) db.interlocuteurs = [];
  db.interlocuteurs.push(newItem);
  saveDatabase();
  syncToFirestore("interlocuteurs", newItem.id, newItem);
  res.json(newItem);
});
app.put("/api/interlocuteurs/:id", authenticate, requireWritePermission, (req, res) => {
  const { id } = req.params;
  const list = db.interlocuteurs || [];
  const item = list.find((i) => i.id === id);
  if (!item) {
    res.status(404).json({ error: "Interlocuteur introuvable" });
    return;
  }
  const { nom, prenom, email, type, entiteId, entites } = req.body;
  if (nom !== void 0) item.nom = nom;
  if (prenom !== void 0) item.prenom = prenom;
  if (email !== void 0) item.email = email;
  if (type !== void 0) item.type = type;
  if (entiteId !== void 0) item.entiteId = entiteId;
  if (entites !== void 0) item.entites = entites;
  saveDatabase();
  syncToFirestore("interlocuteurs", item.id, item);
  res.json(item);
});
app.delete("/api/interlocuteurs/:id", authenticate, requireWritePermission, (req, res) => {
  const list = db.interlocuteurs || [];
  const index = list.findIndex((i) => i.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Interlocuteur introuvable" });
    return;
  }
  const actor = req.user;
  const deleted = list[index];
  list.splice(index, 1);
  db.interlocuteurs = list;
  saveDatabase();
  deleteFromFirestore("interlocuteurs", req.params.id);
  logAudit(actor, "Suppression d'interlocuteur", `${deleted.prenom} ${deleted.nom} (${deleted.email})`);
  res.json({ success: true });
});
app.get("/api/taches-type", authenticate, (req, res) => {
  res.json(db.tachesType || []);
});
app.post("/api/taches-type", authenticate, requireAdmin, (req, res) => {
  const { libelle } = req.body;
  if (!libelle?.trim()) {
    res.status(400).json({ error: "Le libell\xE9 est requis." });
    return;
  }
  if (!db.tachesType) db.tachesType = [];
  if (db.tachesType.some((t) => t.libelle.toLowerCase() === libelle.trim().toLowerCase())) {
    res.status(400).json({ error: "Ce libell\xE9 existe d\xE9j\xE0." });
    return;
  }
  const newItem = {
    id: "tt_" + Math.random().toString(36).substring(2, 9),
    libelle: libelle.trim(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.tachesType.push(newItem);
  saveDatabase();
  syncToFirestore("metadata", "tachesType", { list: db.tachesType });
  res.json(newItem);
});
app.delete("/api/taches-type/:id", authenticate, requireAdmin, (req, res) => {
  const list = db.tachesType || [];
  const index = list.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "T\xE2che-type introuvable" });
    return;
  }
  list.splice(index, 1);
  db.tachesType = list;
  saveDatabase();
  syncToFirestore("metadata", "tachesType", { list });
  res.json({ success: true });
});
app.get("/api/taches", authenticate, (req, res) => {
  const user = req.user;
  const all = db.taches || [];
  if (!hasAnyRestriction(user)) {
    res.json(all);
    return;
  }
  const accessibleIds = new Set(getAccessibleProjects(user).map((p) => p.id));
  res.json(all.filter((t) => accessibleIds.has(t.projetId)));
});
app.post("/api/taches", authenticate, requireWritePermission, (req, res) => {
  const { projetId, libelle, interlocuteurId, dateEcheance } = req.body;
  if (!projetId || !libelle || !interlocuteurId || !dateEcheance) {
    res.status(400).json({ error: "Tous les champs obligatoires doivent \xEAtre renseign\xE9s." });
    return;
  }
  const user = req.user;
  const project = db.projects.find((p) => p.id === projetId);
  if (!userCanAccessProject(user, project)) {
    res.status(403).json({ error: "Vous n'\xEAtes pas habilit\xE9 \xE0 cr\xE9er une t\xE2che pour cette affaire." });
    return;
  }
  if (!db.taches) db.taches = [];
  const newTache = {
    id: "tch_" + Math.random().toString(36).substring(2, 9),
    projetId,
    libelle,
    interlocuteurId,
    dateEcheance,
    statut: "A_FAIRE",
    relances: [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.taches.push(newTache);
  saveDatabase();
  syncToFirestore("taches", newTache.id, newTache);
  res.json(newTache);
});
app.put("/api/taches/:id", authenticate, requireWritePermission, (req, res) => {
  const list = db.taches || [];
  const tache = list.find((t) => t.id === req.params.id);
  if (!tache) {
    res.status(404).json({ error: "T\xE2che introuvable" });
    return;
  }
  const user = req.user;
  const project = db.projects.find((p) => p.id === tache.projetId);
  if (!userCanAccessProject(user, project)) {
    res.status(403).json({ error: "Acc\xE8s non autoris\xE9." });
    return;
  }
  const { libelle, interlocuteurId, dateEcheance, statut } = req.body;
  if (libelle !== void 0) tache.libelle = libelle;
  if (interlocuteurId !== void 0) tache.interlocuteurId = interlocuteurId;
  if (dateEcheance !== void 0) tache.dateEcheance = dateEcheance;
  if (statut !== void 0) {
    tache.statut = statut;
    if (statut === "TERMINEE" && !tache.completedAt) tache.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (statut !== "TERMINEE") tache.completedAt = void 0;
  }
  saveDatabase();
  syncToFirestore("taches", tache.id, tache);
  res.json(tache);
});
app.post("/api/taches/:id/relance", authenticate, requireWritePermission, (req, res) => {
  const list = db.taches || [];
  const tache = list.find((t) => t.id === req.params.id);
  if (!tache) {
    res.status(404).json({ error: "T\xE2che introuvable" });
    return;
  }
  const relance = {
    id: "rel_" + Math.random().toString(36).substring(2, 9),
    date: (/* @__PURE__ */ new Date()).toISOString(),
    note: req.body.note || ""
  };
  if (!tache.relances) tache.relances = [];
  tache.relances.push(relance);
  saveDatabase();
  syncToFirestore("taches", tache.id, tache);
  res.json(tache);
});
app.delete("/api/taches/:id", authenticate, requireWritePermission, (req, res) => {
  const list = db.taches || [];
  const index = list.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "T\xE2che introuvable" });
    return;
  }
  const actor = req.user;
  const deleted = list[index];
  list.splice(index, 1);
  db.taches = list;
  saveDatabase();
  deleteFromFirestore("taches", req.params.id);
  logAudit(actor, "Suppression de t\xE2che", `${deleted.libelle} (affaire: ${deleted.projetId})`);
  res.json({ success: true });
});
app.get("/api/audit-log", authenticate, requireAdmin, (req, res) => {
  const sorted = [...db.auditLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(sorted);
});
async function startListening() {
  await loadDatabaseFromFirestore();
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FlowFab Server] initialized. Running on port ${PORT}`);
  });
}
startListening().catch((err) => {
  console.error("Erreur au red\xE9marrage serveur:", err);
});
//# sourceMappingURL=server.cjs.map
