import React, { useState } from "react";
import { User, Client, UserRole } from "../types";
import { api } from "../lib/api";
import { KeyRound, Shield, AlertCircle, CheckCircle2, UserCheck, Eye, Building } from "lucide-react";

interface ProfileViewProps {
  user: User;
  clients: Client[];
}

export default function ProfileView({ user, clients }: ProfileViewProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [theme, setTheme] = useState(() => {
    // Priorité au thème sauvegardé dans le profil utilisateur
    return (user as any).theme || localStorage.getItem("theme") || "light";
  });

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Sauvegarder la préférence sur le serveur (liée au compte utilisateur)
    try {
      await api.updateUser(user.id, { theme: nextTheme } as any);
    } catch {
      // Silencieux — le localStorage reste le fallback
    }
  };

  const isUserAdmin = user.role === UserRole.ADMIN;
  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.EDITEUR;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Veuillez saisir votre mot de passe actuel.");
      return;
    }

    if (newPassword.length < 4) {
      setError("Le nouveau mot de passe doit comporter au moins 4 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.changePassword(currentPassword, newPassword);
      if (res.success) {
        setSuccess(res.message || "Votre mot de passe a bien été mis à jour.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError("Impossible de mettre à jour le mot de passe.");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  // Determine which clients this user has the right to see
  const allowedClientNames = isUserAdmin 
    ? "Tous les clients de l'entreprise (Accès Global)"
    : clients
        .filter(c => user.allowedClientIds?.includes(c.id))
        .map(c => c.nom);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-4xl mx-auto">
      
      {/* Profile summary & permissions rights card */}
      <div className="md:col-span-6 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="w-12 h-12 bg-teal-500 text-slate-950 font-black flex items-center justify-center rounded-xl text-lg font-mono">
              {user.nom.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{user.nom}</h3>
              <p className="text-xs text-gray-400 font-mono italic mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider font-mono">Rôle professionnel :</span>
              <span className="text-slate-700 font-semibold text-sm">
                {user.poste || <span className="text-gray-400 italic">Non renseigné par l'Administrateur</span>}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider font-mono">Type d'Accès :</span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                  isUserAdmin ? "bg-red-100 text-red-800" :
                  canEdit ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-800"
                }`}>
                  {user.role}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({canEdit ? "Lecture et écriture" : "Lecture seule"})
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-xs font-bold text-slate-block text-slate-400 uppercase tracking-wider font-mono mb-1.5 block">
                🏢 Administration - Clients autorisés à la visualisation :
              </span>
              
              {isUserAdmin ? (
                <div className="p-3 bg-red-50/50 text-red-850 border border-red-100 rounded-lg text-xs leading-relaxed flex items-start gap-2">
                  <Shield className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Privilège Administrateur FlowFab :</strong>
                    Vous avez un droit d'écriture et de lecture sur tous les clients.
                  </div>
                </div>
              ) : Array.isArray(allowedClientNames) && allowedClientNames.length > 0 ? (
                <div className="p-3 bg-sky-50 text-sky-900 border border-sky-100 rounded-lg text-xs space-y-1">
                  <span className="font-bold block text-sky-850 mb-1">Sociétés clientes autorisées :</span>
                  <div className="flex flex-wrap gap-1">
                    {allowedClientNames.map((name, idx) => (
                      <span key={idx} className="bg-white border border-sky-200 text-sky-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200/50 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Aucun Client Assigné :</strong>
                    Vous n'avez actuellement pas de client assigné par l'administrateur. Veuillez contacter votre responsable pour ajuster vos droits.
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle option */}
            <div className="pt-4 border-t border-slate-150 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider font-mono">Affichage de l'Application :</span>
                <span className="text-slate-600 text-[10px] font-semibold">Mode sombre ou clair</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-305 shadow-2xs cursor-pointer select-none"
              >
                {theme === "dark" ? "☀️ Mode Clair" : "🌙 Mode Sombre"}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-150">
              <span className="text-[10px] text-gray-400 font-mono">INSCRIPTION ENREGISTRÉE LE : {new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Password change form */}
      <div className="md:col-span-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
            <KeyRound className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-mono">Changer de mot de passe</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-teal-50 border border-teal-200 text-teal-850 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Mot de passe actuel :</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Nouveau mot de passe :</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 4 caractères..."
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1 font-sans">Confirmer le nouveau mot de passe :</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Saisissez à nouveau"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-slate-900 border border-transparent hover:bg-teal-600 hover:text-slate-950 font-bold text-xs uppercase tracking-wider text-white rounded-lg transition shrink-0 shadow-xs"
            >
              {loading ? "Mise à jour en cours..." : "Enregistrer mon nouveau mot de passe"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
