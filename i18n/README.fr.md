[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Lire en profondeur. Réfléchir ensemble.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Présentation

OnlyIdeas est un espace calme pour lire des articles scientifiques. Importez votre PDF ou un lien PDF en accès libre, conservez les équations et figures avec Mathpix et discutez un passage dans le lecteur. Les documents personnels et les notes sont privés au départ.

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

Le service cloud est disponible. La version candidate 1.0.0 (6) ajoute la suppression de compte, les files de modération, le blocage, les signalements intégrés et la connexion avec Apple sur iOS. Les contrôles automatisés et les tests natifs de lecture, y compris hors ligne, ont réussi. La soumission officielle, les visuels définitifs et la vérification réelle de la connexion Apple restent en attente. Les groupes internes existants restent le canal de test.

La version 0.3 apporte des écrans SwiftUI sur iOS et des commandes natives sur Android, un texte de lecture plus grand et réglable, une page Profil et des conversations enregistrées avec l’agent. Un agent sur la station de travail recherche dans les index de publications ouvertes et télécharge les PDF, avec un modèle local via LazyEdge. Choisissez de convertir et d’ajouter un article pour créer une copie privée avec Mathpix, équations et figures comprises. Le journal de la mise à jour native précise l’état des versions et des tests.

[0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
