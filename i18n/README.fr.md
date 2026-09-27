[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Lire en profondeur. Réfléchir ensemble.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Présentation

OnlyIdeas est une salle de lecture partagée pour les articles scientifiques. Importez un PDF ou un lien PDF en accès ouvert, conservez les équations et les figures avec Mathpix et discutez des passages dans le lecteur. Les nouvelles importations sont partagées par défaut, avec une option Moi uniquement. La publication nécessite une vérification des droits et une modération ; les notes et les conversations avec l’agent restent privées.

Un modèle économique configurable produit des guides de lecture et des traductions sur demande. Les textes générés restent séparés de la source. GitHub ne stocke que les articles explicitement publiés avec les droits nécessaires. L’application dispose de sa propre connexion GitHub et de sessions persistantes.

![OnlyIdeas reading room](../evidence/library-desktop.png)

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

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (13)](../docs/release-candidate-13.md)

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
