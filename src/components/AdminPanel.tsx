import React, { useState, useEffect } from "react";
import { User, UserRole, UserStatus, Project, Client } from "../types";
import { api } from "../lib/api";
import { UserCheck, ShieldAlert, Trash2, Shield, Eye, Edit2, AlertCircle } from "lucide-react";

interface AdminPanelProps {
  currentUser: User;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [openSelectorUserId, setOpenSelectorUserId] = useState<string | null>(null);
  const [openClientSelectorUserId, setOpenClientSelectorUserId] = useState<string | null>(null);

  // States for Types d'ouvrage management
  const [typesOuvrage, setTypesOuvrage] = useState<string[]>([]);
  const [newOuvrage, setNewOuvrage] = useState("");
  const [ouvrageLoading, setOuvrageLoading] = useState(false);

  // Custom confirmation state for user deletion to safety-bypass iframes
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{
    isOpen: boolean;
    userId: string;
    userNom: string;
  }>({
    isOpen: false,
    userId: "",
    userNom: ""
  });

  const fetchTypesOuvrage = async () => {
    try {
      const list = await api.getTypesOuvrage();
      setTypesOuvrage(list);
    } catch {
      // safe fallback
    }
  };

  const fetchProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch {
      // safe fallback
    }
  };

  const fetchClients = async () => {
    try {
      const list = await api.getClients();
      setClients(list);
    } catch {
      // safe fallback
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const list = await api.getUsers();
      // Sort: Pendings first, then by registration
      setUsers(list.sort((a, b) => {
        if (a.status === UserStatus.PENDING && b.status !== UserStatus.PENDING) return -1;
        if (a.status !== UserStatus.PENDING && b.status === UserStatus.PENDING) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
    } catch (err: any) {
      setError(err?.message || "Échec de chargement de la liste des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
    fetchClients();
    fetchTypesOuvrage();
  }, []);

  const handleAddOuvrage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOuvrage.trim()) return;
    try {
      setError(null);
      setSuccess(null);
      setOuvrageLoading(true);
      const res = await api.createTypeOuvrage(newOuvrage.trim());
      if (res.success) {
        setTypesOuvrage(res.list);
        setNewOuvrage("");
        setSuccess(`Type d'ouvrage "${newOuvrage.trim()}" ajouté avec succès.`);
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'ajout du type d'ouvrage.");
    } finally {
      setOuvrageLoading(false);
    }
  };

  const handleDeleteOuvrage = async (name: string) => {
    try {
      setError(null);
      setSuccess(null);
      setOuvrageLoading(true);
      const res = await api.deleteTypeOuvrage(name);
      if (res.success) {
        setTypesOuvrage(res.list);
        setSuccess(`Type d'ouvrage "${name}" supprimé avec succès.`);
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la suppression.");
    } finally {
      setOuvrageLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    try {
      setError(null);
      setSuccess(null);
      await api.updateUser(userId, { status: newStatus });
      setSuccess("Le statut de l'utilisateur a été mis à jour avec succès.");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du changement de statut.");
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setError(null);
      setSuccess(null);
      await api.updateUser(userId, { role: newRole });
      setSuccess("Le rôle de l'utilisateur a été ajusté.");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du changement de rôle.");
    }
  };

  const handleDeleteUser = (userId: string, userNom: string) => {
    setConfirmDeleteUser({
      isOpen: true,
      userId,
      userNom
    });
  };

  const executeDeleteUser = async (userId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await api.deleteUser(userId);
      setSuccess("Utilisateur supprimé définitivement.");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la suppression.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
      {/* Panel description header */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Portail d'Administration des Habilitations
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Gérez la sécurité de FlowFab en approuvant les nouveaux comptes, en définissant leur rôle professionnel dans l'entreprise, et en délimitant les affaires et clients autorisés.
          </p>
        </div>
        <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
          Admin Actif
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-sm rounded-lg mb-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10 text-gray-400 text-sm">
          Chargement de l'annuaire de sécurité...
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucun collaborateur inscrit dans FlowFab.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-medium bg-slate-50/50">
                <th className="px-4 py-3">Collaborateur / Rôle Interne</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3">Niveau de Droits</th>
                <th className="px-4 py-3">Habilitations d'Accès</th>
                <th className="px-4 py-3">Statut Sécurité</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-800">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className={`${u.status === UserStatus.PENDING ? "bg-amber-50/30 font-medium" : ""} hover:bg-slate-50/70 transition-colors`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs font-mono">
                          {u.nom.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              defaultValue={u.nom}
                              title="Modifier le nom et prénom (Cliquez pour éditer)"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== u.nom) {
                                  try {
                                    await api.updateUser(u.id, { nom: val });
                                    setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, nom: val } : usr));
                                    setSuccess(`Le nom de ${u.nom} a été mis à jour : "${val}".`);
                                  } catch (err: any) {
                                    setError(err?.message || "Erreur de mise à jour du nom.");
                                  }
                                }
                              }}
                              className="text-slate-900 font-semibold bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent hover:border-slate-350 focus:border-teal-500 rounded px-1.5 py-0.5 max-w-[170px] transition outline-none"
                            />
                            {isSelf && <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-extrabold uppercase font-mono">Moi</span>}
                          </div>
                          {/* Poste / Rôle dans la société input widget */}
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono select-none">Rôle:</span>
                            <input
                              type="text"
                              defaultValue={u.poste || ""}
                              placeholder="ex: Conducteur de travaux"
                              onBlur={async (e) => {
                                const val = e.target.value;
                                if (val !== (u.poste || "")) {
                                  try {
                                    await api.updateUser(u.id, { poste: val });
                                    setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, poste: val } : usr));
                                    setSuccess(`Le rôle de ${u.nom} a été mis à jour : "${val}".`);
                                  } catch (err: any) {
                                    setError(err?.message || "Erreur de mise à jour.");
                                  }
                                }
                              }}
                              className="text-xs border border-transparent hover:border-slate-300 focus:border-teal-500 focus:bg-white rounded px-1.5 py-0.5 font-medium text-slate-600 bg-slate-50 max-w-[150px] transition"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs font-semibold px-2.5 py-1 bg-teal-100 text-teal-800 rounded">
                          {u.role}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-teal-500 font-semibold text-slate-800"
                        >
                          <option value={UserRole.LECTEUR}>Lecteur (Lecture Seule)</option>
                          <option value={UserRole.EDITEUR}>Éditeur (Lecture & Écriture)</option>
                          <option value={UserRole.ADMIN}>Administrateur</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                       {isSelf || u.role === UserRole.ADMIN ? (
                        <span className="text-[10px] text-teal-700 bg-teal-50 font-bold px-2 py-1 rounded border border-teal-100 font-mono block max-w-fit uppercase">Tous Droits (Admin / Visu Générale)</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-w-fit">
                          {/* Client Selector */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenClientSelectorUserId(openClientSelectorUserId === u.id ? null : u.id);
                              }}
                              className="text-[11px] bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-lg px-2.5 py-0.5 text-sky-900 font-semibold flex items-center gap-1 cursor-pointer select-none"
                            >
                              <span>🏢 {u.allowedClientIds?.length || 0} Clients</span>
                            </button>
                            
                            {openClientSelectorUserId === u.id && (
                              <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 z-50 max-h-60 overflow-y-auto">
                                <span className="text-xs font-bold text-sky-800 block border-b border-sky-100 pb-1.5 mb-2">
                                  Habiliter l'accès aux clients :
                                </span>
                                {clients.length === 0 ? (
                                  <p className="text-xs text-slate-400 text-center py-2">Aucun client créé.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {clients.map(c => {
                                      const isAttached = u.allowedClientIds?.includes(c.id);
                                      return (
                                        <label key={c.id} className="flex items-start gap-2 text-xs text-slate-700 font-medium hover:bg-sky-50 p-1 rounded cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={!!isAttached}
                                            onChange={async (e) => {
                                              const checked = e.target.checked;
                                              const current = u.allowedClientIds || [];
                                              const updated = checked
                                                ? [...current, c.id]
                                                : current.filter(id => id !== c.id);
                                              try {
                                                await api.updateUser(u.id, { allowedClientIds: updated });
                                                setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, allowedClientIds: updated } : usr));
                                              } catch (err: any) {
                                                setError(err?.message || "Erreur de configuration clients.");
                                              }
                                            }}
                                            className="rounded text-sky-600 focus:ring-sky-500 border-slate-350 w-3.5 h-3.5 mt-0.5 cursor-pointer"
                                          />
                                          <span className="leading-tight">{c.nom}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="mt-3 border-t border-slate-100 pt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setOpenClientSelectorUserId(null)}
                                    className="text-[10px] font-bold text-sky-600 hover:underline uppercase font-mono cursor-pointer"
                                  >
                                    Fermer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                          Complet
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            u.status === UserStatus.APPROVED ? "bg-emerald-100 text-emerald-800" :
                            u.status === UserStatus.PENDING ? "bg-amber-100 text-amber-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              u.status === UserStatus.APPROVED ? "bg-emerald-600" :
                              u.status === UserStatus.PENDING ? "bg-amber-600" :
                              "bg-red-600"
                            }`}></span>
                            {u.status}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-2.5">
                          {u.status === UserStatus.PENDING && (
                            <button
                              onClick={() => handleStatusChange(u.id, UserStatus.APPROVED)}
                              className="p-1 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5 shadow-2xs transition"
                              title="Autoriser l'accès de suite"
                            >
                              <UserCheck className="w-3 h-3" />
                              Approuver l'accès
                            </button>
                          )}
                          
                          {u.status === UserStatus.APPROVED && (
                            <button
                              onClick={() => handleStatusChange(u.id, UserStatus.SUSPENDED)}
                              className="p-1 text-[11px] text-red-600 hover:bg-red-50 rounded"
                              title="Suspendre l'habilitation"
                            >
                              Bloquer
                            </button>
                          )}

                          {u.status === UserStatus.SUSPENDED && (
                            <button
                              onClick={() => handleStatusChange(u.id, UserStatus.APPROVED)}
                              className="p-1 text-[11px] text-emerald-700 hover:bg-emerald-50 rounded font-bold"
                              title="Réhabiliter le compte"
                            >
                              Débloquer
                            </button>
                          )}

                          {u.status === UserStatus.SUSPENDED ? (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.nom)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                              title="Supprimer d'EMG FlowFab"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1 text-gray-200 cursor-not-allowed rounded"
                              title="Veuillez d'abord bloquer cet utilisateur pour pouvoir le supprimer"
                            >
                              <Trash2 className="w-4 h-4 opacity-30" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom User Deletion Confirmation dialog to prevent iframe block popup issues */}
      {confirmDeleteUser.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden text-left">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2.5 text-slate-800">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">Suppression définitive de compte</h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Confirmez-vous le retrait de <span className="text-slate-900 font-extrabold">"{confirmDeleteUser.userNom}"</span> ? Cette action détruira définitivement son profil d'accès de l'annuaire d'entreprise FlowFab de manière irréversible.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser({ isOpen: false, userId: "", userNom: "" })}
                className="px-4 py-2 bg-white border border-slate-300 text-xs text-slate-705 rounded-lg hover:bg-slate-100 transition font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition font-bold"
                onClick={async () => {
                  const uid = confirmDeleteUser.userId;
                  setConfirmDeleteUser({ isOpen: false, userId: "", userNom: "" });
                  await executeDeleteUser(uid);
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Gestion des types d'ouvrage */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          🔨 Gestion des Types d'Ouvrage d'Affaires
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Ajoutez ou retirez les catégories d'ouvrages disponibles lors de la création et du filtrage des affaires de FlowFab d'entreprise.
        </p>

        <form onSubmit={handleAddOuvrage} className="flex gap-2 mb-4 max-w-md">
          <input
            type="text"
            value={newOuvrage}
            onChange={(e) => setNewOuvrage(e.target.value)}
            placeholder="ex: Verrière, Garde-corps, etc."
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 flex-1 bg-white"
            disabled={ouvrageLoading}
          />
          <button
            type="submit"
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg px-4 py-2 transition"
            disabled={ouvrageLoading || !newOuvrage.trim()}
          >
            Ajouter
          </button>
        </form>

        {typesOuvrage.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Aucun type d'ouvrage disponible.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {typesOuvrage.map((ouvrageItem) => (
              <span
                key={ouvrageItem}
                className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 rounded-full font-medium"
              >
                <span>{ouvrageItem}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteOuvrage(ouvrageItem)}
                  className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs focus:outline-none"
                  title={`Supprimer "${ouvrageItem}"`}
                  disabled={ouvrageLoading}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
