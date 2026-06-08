# Spécifications de Sécurité Firebase & Validations

Ce document régit les règles d'intégrité, d'identité et de transition d'état au sein de l'architecture Firebase/Firestore pour l'application **FlowFab**.

## 1. Invariants de Données (Invariants du Domaine)
* **Users** : Un utilisateur ne peut pas s'auto-attribuer son rôle (ex. s'auto-promouvoir Administrateur). Les champs administratifs (`role`, `status`, `allowedProjectIds`, `allowedClientIds`) ne peuvent être édités que par un Administrateur existant.
* **Clients / Subcontractors** : Seuls les utilisateurs avec un rôle d'Éditeur ou d'Administrateur peuvent écrire, créer ou supprimer des fiches.
* **Projects / Affaires** : Un projet doit être rattaché à un client valide et à un sous-traitant valide.
* **Budgets / Réalisés** : Tout enregistrement de budget ou de réalisé doit être rattaché par clé étrangère (`projetId`) à un document de projet existant valide.
* **Billings** : Un document de facturation doit faire référence à un projet (`projetId`). Si son état (`etatFacturation`) est passé à "Payée" (valeur terminale), son statut ne peut plus repasser à "Brouillon".

## 2. Scénarios "Dirty Dozen" (Audit d'Attaque)
1. Écriture sans authentification (Refus total par le "Master Gate").
2. Création d'un profil par un utilisateur s'auto-proclament "Administrateur" ou "Approuvé".
3. Édition du taux horaire d'un client par un utilisateur muni des droits uniquement "Lecteur".
4. Création d'une affaire rattachée à un client qui n'existe pas.
5. Accès en lecture (scraping) à la liste complète des utilisateurs sans authentification administrative.
6. Mutation interdite d'un budget par injection de champs fantômes/ghost fields (Shadow Update bypass attempt).
7. Force-update de la date `createdAt` d'une affaire alors que celle-ci doit rester immuable.
8. Injection de faux horodatages de serveurs via des payloads clients frauduleux.
9. Injection de chaînes volumineuses (Denial of Wallet).
10. Dé-séquençage d'une facture payée en brouillon après validation financière définitive.
11. Suppression de projet par un simple "Lecteur".
12. Lecture de données PII d'un autre utilisateur sans habilitation directe.

---

## 3. Configuration des Règles de Sécurité (`firestore.rules`)

Les règles finales de production seront déployées sous `firestore.rules`.
