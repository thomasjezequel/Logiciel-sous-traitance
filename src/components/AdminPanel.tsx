import React, { useState, useEffect } from "react";
import { User, UserRole, UserStatus, Project, Client } from "../types";
import { api } from "../lib/api";
import { UserCheck, ShieldAlert, Trash2, Shield, Eye, Edit2, AlertCircle, ListTodo, Mail, Copy, Check, UserPlus, Link } from "lucide-react";

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

  // States for Tâches-type management
  const [tachesType, setTachesType] = useState<{ id: string; libelle: string }[]>([]);
  const [newTacheType, setNewTacheType] = useState("");
  const [tacheTypeLoading, setTacheTypeLoading] = useState(false);

  // ── Invitations ──────────────────────────────────────────────────────────
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNom, setInviteNom] = useState("");
  const [inviteRole, setInviteRole] = useState("Lecteur");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Historique ──────────────────────────────────────────────────────────
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditCategorie, setAuditCategorie] = useState("");
  const [auditActeur, setAuditActeur] = useState("");

  const fetchAuditLog = async () => {
    try {
      setAuditLoading(true);
      const params = new URLSearchParams();
      if (auditCategorie) params.set("categorie", auditCategorie);
      if (auditActeur) params.set("actorEmail", auditActeur);
      const list = await api.request<any[]>(`/api/audit-log?${params.toString()}`);
      setAuditLog(list);
    } catch { setAuditLog([]); }
    finally { setAuditLoading(false); }
  };

const handleExportAudit = async () => {
  try {
    const params = new URLSearchParams();
    if (auditCategorie) params.set("categorie", auditCategorie);
    if (auditActeur) params.set("actorEmail", auditActeur);

    const filename = `flowfab-historique-${new Date().toISOString().slice(0, 10)}.csv`;
    await api.downloadFile(`/api/audit-log/export?${params.toString()}`, filename);
  } catch (err) {
    setError("Erreur lors de l'export de l'historique.");
  }
};
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

  const fetchTachesType = async () => {
    try {
      const list = await (api as any).getTachesType();
      setTachesType(list);
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

  const fetchInvitations = async () => {
    try {
      const list = await api.request("/api/invitations");
      setInvitations(list);
    } catch { setInvitations([]); }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const list = await api.getUsers();
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
    fetchTachesType();
    fetchInvitations();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteNom.trim()) {
      setError("Email et nom sont obligatoires."); return;
    }
    try {
      setError(null); setSuccess(null);
      setInviteLoading(true);
      const res = await api.request<any>("/api/invitations", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), nom: inviteNom.trim(), role: inviteRole })
      });
      setInviteLink(res.invitationLink);
      setInviteEmail(""); setInviteNom(""); setInviteRole("Lecteur");
      setSuccess(`Invitation créée pour ${res.invitation.email} — valide 7 jours.`);
      fetchInvitations();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la création de l'invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      await api.request(`/api/invitations/${id}`, { method: "DELETE" });
      setSuccess("Invitation révoquée.");
      fetchInvitations();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la révocation.");
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddOuvrage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOuvrage.trim()) return;
    try {
      setError(null); setSuccess(null);
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
      setError(null); setSuccess(null);
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

  const handleAddTacheType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTacheType.trim()) return;
    try {
      setError(null); setSuccess(null);
      setTacheTypeLoading(true);
      const res = await (api as any).createTacheType(newTacheType.trim());
      setTachesType(prev => [...prev, res]);
      setNewTacheType("");
      setSuccess(`Tâche-type "${newTacheType.trim()}" ajoutée avec succès.`);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'ajout de la tâche-type.");
    } finally {
      setTacheTypeLoading(false);
    }
  };

  const handleDeleteTacheType = async (id: string, libelle: string) => {
    try {
      setError(null); setSuccess(null);
      setTacheTypeLoading(true);
      await (api as any).deleteTacheType(id);
      setTachesType(prev => prev.filter(t => t.id !== id));
      setSuccess(`Tâche-type "${libelle}" supprimée avec succès.`);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la suppression.");
    } finally {
      setTacheTypeLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    try {
      setError(null); setSuccess(null);
      await api.updateUser(userId, { status: newStatus });
      setSuccess("Le statut de l'utilisateur a été mis à jour avec succès.");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du changement de statut.");
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setError(null); setSuccess(null);
      await api.updateUser(userId, { role: newRole });
      setSuccess("Le rôle de l'utilisateur a été ajusté.");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du changement de rôle.");
    }
  };

  const handleDeleteUser = (userId: string, userNom: string) => {
    setConfirmDeleteUser({ isOpen: true, userId, userNom });
  };

  const executeDeleteUser = async (userId: string) => {
    try {
      setError(null); setSuccess(null);
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
        <div className="flex items-center justify-center py-12 text-gray-400 gap-3">
          <div className="w-6 h-6 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Chargement des comptes collaborateurs...</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3">Collaborateur / Rôle Interne</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3">Niveau de Droits</th>
                <th className="px-4 py-3 text-amber-700">Habilitations d'Accès</th>
                <th className="px-4 py-3">Statut Sécurité</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className={`hover:bg-slate-50/60 ${u.status === UserStatus.PENDING ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-extrabold text-slate-600 uppercase shrink-0">
                          {u.nom.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{u.nom}</span>
                          {isSelf ? (
                            <span className="text-[10px] text-gray-400 font-mono block">
                              RÔLE: {u.poste ? u.poste : "ex: Conducteur de travaux"}
                            </span>
                          ) : (
                            <input
                              type="text"
                              defaultValue={u.poste || ""}
                              placeholder="ex: Conducteur de travaux"
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val !== (u.poste || "")) {
                                  await api.updateUser(u.id, { poste: val });
                                  fetchUsers();
                                }
                              }}
                              className="text-[10px] text-gray-500 font-mono bg-transparent border-b border-dashed border-slate-300 focus:border-teal-400 focus:outline-none w-full mt-0.5 py-0.5"
                            />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">{u.email}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Inconnue"}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                          {u.role} (vous)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          disabled={u.status !== UserStatus.APPROVED}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-teal-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value={UserRole.LECTEUR}>Lecteur (Lecture seule)</option>
                          <option value={UserRole.EDITEUR}>Éditeur (Lecture & Écriture)</option>
                          <option value={UserRole.ADMIN}>Administrateur (Accès total)</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isSelf && u.status === UserStatus.APPROVED && u.role !== UserRole.ADMIN && (
                        <div className="flex items-center gap-2">
                          {/* Projets */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenSelectorUserId(openSelectorUserId === u.id ? null : u.id);
                                setOpenClientSelectorUserId(null);
                              }}
                              className="text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              {u.allowedProjectIds && u.allowedProjectIds.length > 0
                                ? `${u.allowedProjectIds.length} Proj.`
                                : "Tous projets"}
                            </button>
                            {openSelectorUserId === u.id && (
                              <div className="absolute left-0 top-7 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[220px] max-h-56 overflow-y-auto">
                                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-2">Projets autorisés :</span>
                                {projects.map((proj) => {
                                  const isChecked = u.allowedProjectIds?.includes(proj.id);
                                  return (
                                    <label key={proj.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
                                      <input
                                        type="checkbox"
                                        checked={!!isChecked}
                                        onChange={async (e) => {
                                          const next = e.target.checked
                                            ? [...(u.allowedProjectIds || []), proj.id]
                                            : (u.allowedProjectIds || []).filter(id => id !== proj.id);
                                          await api.updateUser(u.id, { allowedProjectIds: next });
                                          fetchUsers();
                                        }}
                                        className="w-3.5 h-3.5 text-teal-600 border-slate-300 rounded"
                                      />
                                      <span className="text-[11px] text-slate-700 leading-tight">{proj.nomAffaire} — {proj.nomZone}</span>
                                    </label>
                                  );
                                })}
                                <div className="mt-3 border-t border-slate-100 pt-2 flex justify-end">
                                  <button type="button" onClick={() => setOpenSelectorUserId(null)}
                                    className="text-[10px] font-bold text-sky-600 hover:underline uppercase font-mono cursor-pointer">
                                    Fermer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Clients */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenClientSelectorUserId(openClientSelectorUserId === u.id ? null : u.id);
                                setOpenSelectorUserId(null);
                              }}
                              className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              {u.allowedClientIds && u.allowedClientIds.length > 0
                                ? `${u.allowedClientIds.length} Clients`
                                : "Tous clients"}
                            </button>
                            {openClientSelectorUserId === u.id && (
                              <div className="absolute left-0 top-7 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[200px] max-h-56 overflow-y-auto">
                                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-2">Clients autorisés :</span>
                                {clients.map((c) => {
                                  const isChecked = u.allowedClientIds?.includes(c.id);
                                  return (
                                    <label key={c.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
                                      <input
                                        type="checkbox"
                                        checked={!!isChecked}
                                        onChange={async (e) => {
                                          const next = e.target.checked
                                            ? [...(u.allowedClientIds || []), c.id]
                                            : (u.allowedClientIds || []).filter(id => id !== c.id);
                                          await api.updateUser(u.id, { allowedClientIds: next });
                                          fetchUsers();
                                        }}
                                        className="w-3.5 h-3.5 text-teal-600 border-slate-300 rounded"
                                      />
                                      <span className="leading-tight text-[11px] text-slate-700">{c.nom}</span>
                                    </label>
                                  );
                                })}
                                <div className="mt-3 border-t border-slate-100 pt-2 flex justify-end">
                                  <button type="button" onClick={() => setOpenClientSelectorUserId(null)}
                                    className="text-[10px] font-bold text-sky-600 hover:underline uppercase font-mono cursor-pointer">
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
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
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
                            }`} />
                            {u.status}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-2.5">
                          {u.status === UserStatus.PENDING && (
                            <button onClick={() => handleStatusChange(u.id, UserStatus.APPROVED)}
                              className="p-1 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5 shadow-2xs transition"
                              title="Autoriser l'accès de suite">
                              <UserCheck className="w-3 h-3" />
                              Approuver l'accès
                            </button>
                          )}
                          {u.status === UserStatus.APPROVED && (
                            <button onClick={() => handleStatusChange(u.id, UserStatus.SUSPENDED)}
                              className="p-1 text-[11px] text-red-600 hover:bg-red-50 rounded"
                              title="Suspendre l'habilitation">
                              Bloquer
                            </button>
                          )}
                          {u.status === UserStatus.SUSPENDED && (
                            <button onClick={() => handleStatusChange(u.id, UserStatus.APPROVED)}
                              className="p-1 text-[11px] text-emerald-700 hover:bg-emerald-50 rounded font-bold"
                              title="Réhabiliter le compte">
                              Débloquer
                            </button>
                          )}
                          {u.status === UserStatus.SUSPENDED ? (
                            <button onClick={() => handleDeleteUser(u.id, u.nom)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                              title="Supprimer d'EMG FlowFab">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button disabled
                              className="p-1 text-gray-200 cursor-not-allowed rounded"
                              title="Veuillez d'abord bloquer cet utilisateur pour pouvoir le supprimer">
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

      {/* Custom User Deletion Confirmation dialog */}
      {confirmDeleteUser.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden text-left">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2.5 text-slate-800">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">Suppression définitive de compte</h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Confirmez-vous le retrait de <span className="text-slate-900 font-extrabold">"{confirmDeleteUser.userNom}"</span> ? Cette action détruira définitivement son profil d'accès de manière irréversible.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button"
                onClick={() => setConfirmDeleteUser({ isOpen: false, userId: "", userNom: "" })}
                className="px-4 py-2 bg-white border border-slate-300 text-xs text-slate-700 rounded-lg hover:bg-slate-100 transition font-bold">
                Annuler
              </button>
              <button type="button"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition font-bold"
                onClick={async () => {
                  const uid = confirmDeleteUser.userId;
                  setConfirmDeleteUser({ isOpen: false, userId: "", userNom: "" });
                  await executeDeleteUser(uid);
                }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section Invitations ── */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-teal-600" />
          Inviter un nouveau collaborateur
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Générez un lien d'invitation unique lié à l'adresse email du collaborateur. Seule cette adresse pourra créer un compte — le lien est inutilisable avec un autre email et expire après 7 jours.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 max-w-2xl">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Prénom et Nom *</label>
            <input type="text" value={inviteNom} onChange={e => setInviteNom(e.target.value)}
              placeholder="ex: Jean Dupont"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Adresse email *</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="ex: jean.dupont@emg.bzh"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Rôle attribué</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white">
              <option value="Lecteur">Lecteur (Lecture seule)</option>
              <option value="Éditeur">Éditeur (Lecture & Écriture)</option>
              <option value="Administrateur">Administrateur (Accès total)</option>
            </select>
          </div>
        </div>

        <button type="button" onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim() || !inviteNom.trim()}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg px-4 py-2 flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed">
          <Link className="w-3.5 h-3.5" />
          {inviteLoading ? "Génération..." : "Générer le lien d'invitation"}
        </button>

        {/* Lien généré */}
        {inviteLink && (
          <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-teal-800">Lien d'invitation généré — à envoyer manuellement</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-[10px] text-teal-900 bg-white border border-teal-200 rounded px-2 py-1.5 flex-1 break-all font-mono">
                {inviteLink}
              </code>
              <button onClick={() => handleCopyLink(inviteLink)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${copied ? "bg-emerald-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"}`}>
                {copied ? <><Check className="w-3.5 h-3.5" /> Copié !</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
              </button>
            </div>
            <p className="text-[10px] text-teal-700 mt-2 italic">
              ⚠️ Copiez ce lien et envoyez-le par email, Teams ou tout autre canal sécurisé. Il expire dans 7 jours et ne peut être utilisé qu'une seule fois avec l'adresse email spécifiée.
            </p>
          </div>
        )}

        {/* Liste des invitations en attente */}
        {invitations.length > 0 && (
          <div className="mt-5">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">
              Invitations en attente ({invitations.length})
            </h4>
            <div className="space-y-2 max-w-2xl">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">{inv.nom}</span>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">{inv.email}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2 ${inv.role === "Administrateur" ? "bg-red-100 text-red-700" : inv.role === "Éditeur" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                      {inv.role}
                    </span>
                    <span className="text-[9px] text-slate-400 ml-2">
                      expire le {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleCopyLink(`${window.location.origin}/invite?token=${encodeURIComponent(inv.token)}&email=${encodeURIComponent(inv.email)}`)}
                      title="Copier le lien"
                      className="p-1.5 text-slate-400 hover:text-teal-600 rounded transition">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRevokeInvitation(inv.id)}
                      title="Révoquer l'invitation"
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Section Types d'ouvrage ── */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          🔨 Gestion des Types d'Ouvrage d'Affaires
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Ajoutez ou retirez les catégories d'ouvrages disponibles lors de la création et du filtrage des affaires.
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
          <button type="submit"
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg px-4 py-2 transition"
            disabled={ouvrageLoading || !newOuvrage.trim()}>
            Ajouter
          </button>
        </form>
        {typesOuvrage.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Aucun type d'ouvrage disponible.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {typesOuvrage.map((ouvrageItem) => (
              <span key={ouvrageItem}
                className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 rounded-full font-medium">
                <span>{ouvrageItem}</span>
                <button type="button"
                  onClick={() => handleDeleteOuvrage(ouvrageItem)}
                  className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs focus:outline-none"
                  title={`Supprimer "${ouvrageItem}"`}
                  disabled={ouvrageLoading}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Section Tâches-type ── */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-indigo-600" />
          Gestion des Tâches-type
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Définissez les libellés de tâches prédéfinis qui apparaîtront en menu déroulant lors de la création de tâches (ex : Diffuser le traçage, Réserver la galva, Expédier les étiquettes...).
        </p>
        <form onSubmit={handleAddTacheType} className="flex gap-2 mb-4 max-w-md">
          <input
            type="text"
            value={newTacheType}
            onChange={(e) => setNewTacheType(e.target.value)}
            placeholder="ex: Diffuser le traçage, Réserver la galva..."
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 flex-1 bg-white"
            disabled={tacheTypeLoading}
          />
          <button type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg px-4 py-2 transition"
            disabled={tacheTypeLoading || !newTacheType.trim()}>
            Ajouter
          </button>
        </form>
        {tachesType.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Aucune tâche-type définie. Ajoutez-en ci-dessus.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tachesType.map((t) => (
              <span key={t.id}
                className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1 rounded-full font-medium">
                <span>{t.libelle}</span>
                <button type="button"
                  onClick={() => handleDeleteTacheType(t.id, t.libelle)}
                  className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs focus:outline-none"
                  title={`Supprimer "${t.libelle}"`}
                  disabled={tacheTypeLoading}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Section Historique ── */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          📋 Historique des modifications
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Journal des connexions et modifications sur les 15 derniers jours. Visible uniquement par les administrateurs.
        </p>

        {/* Filtres + boutons */}
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Catégorie</label>
            <select value={auditCategorie} onChange={e => setAuditCategorie(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white">
              <option value="">Toutes</option>
              <option value="connexion">Connexions</option>
              <option value="affaire">Affaires</option>
              <option value="budget">Budgets / Réalisés</option>
              <option value="facturation">Facturation</option>
              <option value="tache">Tâches</option>
              <option value="utilisateur">Utilisateurs</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Utilisateur</label>
            <select value={auditActeur} onChange={e => setAuditActeur(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-teal-500 bg-white">
              <option value="">Tous</option>
              {[...new Set(auditLog.map((e: any) => e.actorEmail))].map(email => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchAuditLog} disabled={auditLoading}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg px-4 py-2 transition">
            {auditLoading ? "Chargement..." : "🔍 Afficher"}
          </button>
          <button onClick={handleExportAudit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg px-4 py-2 transition flex items-center gap-1.5">
            📥 Export Excel
          </button>
        </div>

        {/* Tableau */}
        {auditLog.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-2.5">Date / Heure</th>
                  <th className="px-3 py-2.5">Utilisateur</th>
                  <th className="px-3 py-2.5">Catégorie</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLog.map((entry: any) => {
                  const cat = entry.categorie || "autre";
                  const catColor: Record<string, string> = {
                    connexion: "bg-blue-100 text-blue-800",
                    affaire: "bg-teal-100 text-teal-800",
                    budget: "bg-orange-100 text-orange-800",
                    facturation: "bg-amber-100 text-amber-800",
                    tache: "bg-indigo-100 text-indigo-800",
                    utilisateur: "bg-red-100 text-red-800",
                    autre: "bg-slate-100 text-slate-600"
                  };
                  const isEchec = entry.action?.toLowerCase().includes("échec");
                  return (
                    <tr key={entry.id} className={`transition ${isEchec ? "bg-red-50/40" : "hover:bg-slate-50/60"}`}>
                      <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">
                        {new Date(entry.timestamp).toLocaleDateString("fr-FR")} {new Date(entry.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{entry.actorNom}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${catColor[cat] || catColor.autre}`}>
                          {cat}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-700">{entry.action}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{entry.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {auditLog.length === 0 && !auditLoading && (
          <p className="text-xs text-slate-400 italic">Cliquez sur "Afficher" pour charger l'historique.</p>
        )}
      </div>

    </div>
  );
}
