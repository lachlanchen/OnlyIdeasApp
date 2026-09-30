[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Lire en profondeur. Réfléchir ensemble.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Présentation

OnlyIdeas est une salle de lecture partagée pour les articles scientifiques. Importez un PDF ou un lien PDF en accès ouvert, conservez les équations et les figures avec Mathpix et discutez des passages dans le lecteur. Les nouvelles importations sont partagées par défaut, avec une option Moi uniquement. La publication nécessite une vérification des droits et une modération ; les notes et les conversations avec l’agent restent privées.

Un modèle économique configurable produit des guides de lecture et des traductions sur demande. Les textes générés restent séparés de la source. GitHub ne stocke que les articles explicitement publiés avec les droits nécessaires. L’application dispose de sa propre connexion GitHub et de sessions persistantes.

![OnlyIdeas reading room](../evidence/library-desktop.png)

<!-- watchsearch24 -->
**Watch et recherche · TestFlight 1.0.4 (24)**

Envoyez des extraits d’articles publics à la Watch en version originale, traduite ou alternée depuis l’iPhone jumelé. Les traductions téléchargées sont réutilisées. macOS 12 et versions ultérieures ont passé les tests de lecture en ligne et hors ligne sur les quatre Mac du propriétaire. Les recherches exactes DOI/arXiv réutilisent les textes existants ; les index lents ont un délai maximal et un téléchargement bloqué permet d’ouvrir la source ou d’importer un PDF.

[24](../docs/watch-search-24.md)

<!-- distribution20260930 -->
**Distribution · 1er octobre 2026**

Mac 1.0.3 (22) a été publié automatiquement après validation et peut être téléchargé dans 175 boutiques Apple. Le prix aux États-Unis est de 0,99 USD. Les fiches publiques affichent encore 1.0.2 pendant la propagation de la mise à jour. iOS/Watch 1.0.2 (21) reste en cours de validation ; la version de test 24 est disponible en interne sur TestFlight. Consultez le suivi de publication pour les autres plateformes et les abonnements.

[Mac App Store](https://apps.apple.com/app/onlyideas/id6816392935?mt=12) · [2026-10-01](../docs/distribution-20260930.md)

<!-- plans21 -->
1.0.2 (21) : Le profil affiche toujours les forfaits et leur utilisation, même sans connexion ou lorsque le paiement est indisponible. Les trois forfaits et leurs quotas sont visibles sur iOS, Android, Mac et PWA. Les paiements restent soumis à la validation des achats en environnement de test.

[1.0.2 (21)](../docs/release-candidate-21.md)

<!-- reader20 -->
1.0.2 (20) : original, traduction ou paragraphes alternés dans le même lecteur, avec cache, équations, figures et commentaires. Mac natif pour Apple silicon et Intel. Les intérêts incluent les organoïdes de Shaohua Ma. Abonnements et essai de sept jours préparés ; achats en attente de validation en sandbox.

[1.0.2 (20)](../docs/release-candidate-20.md)

<!-- agent19 -->
1.0.2 (19) : demandez à l’agent de trouver, télécharger, transcrire, résumer, traduire ou enregistrer un article. Recherche par titre approximatif et DOI, sources publiques complémentaires et vérification du PDF. Les résultats se rouvrent depuis la conversation. Modifiez vos intérêts dans Votre espace. Retour sur Android ramène à la conversation.

[1.0.2 (19)](../docs/release-candidate-19.md)

<!-- recovery17 -->
La version 1.0.2 (17) ajoute des listes distinctes de documents enregistrés et aimés, un historique, une boîte de réception et des préférences de lecture. En cas de téléchargement bloqué, importez votre PDF depuis la fiche ou la demande échouée. Traduisez un article entier, un paragraphe ou une phrase en réutilisant les traductions enregistrées et en conservant équations et figures. Le partage reste activé par défaut : une licence ouverte compatible vérifiée permet la publication automatique, sinon le document attend une validation. Les rappels quotidiens sur l’appareil sont facultatifs ; les alertes d’activité sont actualisées dans l’application.

[1.0.2 (17)](../docs/paper-recovery-and-translation.md)


## Démarrage

Consultez le guide d’exploitation avant de connecter les services. Gardez la configuration dans un fichier protégé, hors de Git.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## Conception

Le code, les contenus publics et les données privées sont séparés. MMD préserve TeX ; les sections sont dérivées au besoin. Le traitement évite les doublons et impose des limites de pages, de taille et d’usage quotidien.

## État

La version native 1.0.0 (10) propose une interface vive turquoise, bleue et violette, des thèmes système, clair et sombre, et 11 langues suivant celle de l’appareil par défaut. L’agent accepte des pièces jointes privées PDF, Word, images et texte. Commentez un paragraphe ou continuez à sélectionner un passage. Les demandes simultanées de traduction réutilisent le travail et le résultat de la même révision, en préservant équations et figures. L’icône approuvée et le cache local sont conservés. Consultez les notes de version pour les tests et l’état des boutiques.

La salle publique contient deux véritables articles : OpenAlex (CC0-1.0) et Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), ainsi que l’exemple original clairement signalé. Quatre figures originales sont conservées. Les deux articles ont suivi le véritable parcours de conversion et ont été vérifiés sans connexion dans un lecteur de largeur mobile.

En développement : crédits de lecture en base de données, avec réservations atomiques, remboursements et récompenses sans doublons pour les articles publics approuvés. Le profil affiche le solde et l’historique ; les options de partage passent au-dessus de la conversation et les imports privés demandent confirmation du coût. Les nouveaux contrôles sont disponibles dans les 11 langues. Le débit de crédits et les achats mensuels ne sont pas encore activés en production.

Étape suivante préparée : abonnements mensuels natifs aux prix de la boutique, restauration des achats, renouvellements et remboursements vérifiés. Lecteur, Chercheur et Studio comprennent 200/1 200/2 600 crédits mensuels et 40/80/160 messages quotidiens à l’agent. Les achats restent désactivés en attendant les tests en boutique et sur appareil.

La version 1.0.2 (13) ajoute une app Mac native (macOS 13+, Intel et Apple Silicon), avec barre latérale et raccourcis, et un compagnon Apple Watch (watchOS 11+). Envoyez explicitement un extrait d’article public depuis les options de lecture de l’iPhone : les trois derniers restent disponibles hors ligne, avec taille du texte réglable. Les équations et figures complètes restent sur iPhone et Mac. Aucun article privé, échange ou identifiant n’est envoyé à la Watch. Consultez le suivi de version pour l’état de validation. Les abonnements restent réservés aux tests de l’opérateur.

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

## Soutenir

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Citation

Citez ce dépôt si vous l’utilisez dans vos recherches. GitHub exploite CITATION.cff pour proposer une citation. [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```

**2026-09-30 · OnlyIdeas** — L’icône fluide approuvée est en ligne et intégrée à **1.0.4 (23)**, disponible dans TestFlight (iPhone/iPad, compagnon Watch et Mac) et en test interne Google Play. La nouvelle version de production Google et son icône sont préparées. Les examens Apple et Google en cours restent inchangés dans l’attente de la décision du propriétaire. Les articles, traductions et données ont été préservés.
