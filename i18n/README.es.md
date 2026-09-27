[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Lee con profundidad. Piensa en compañía.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Descripción

OnlyIdeas es un espacio tranquilo para leer artículos científicos. Importa tu PDF o un enlace PDF de acceso abierto, conserva ecuaciones y figuras con Mathpix y comenta un pasaje dentro del lector. Los documentos personales y las notas empiezan siendo privados.

Un modelo económico configurable crea guías de lectura y traducciones cuando se solicitan. El texto generado se guarda separado del original. GitHub solo almacena artículos publicados expresamente con los derechos necesarios. La aplicación tiene su propio acceso con GitHub y sesiones persistentes.

![OnlyIdeas reading room](../evidence/library-desktop.png)

## Inicio rápido

Lee la guía de operaciones antes de conectar credenciales. Guarda la configuración en un archivo protegido fuera de Git.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## Diseño

El código, el contenido público y los datos privados se guardan por separado. MMD conserva TeX; las secciones se derivan cuando hacen falta. El trabajador evita duplicados y limita páginas, tamaño y uso diario.

## Estado

El servicio en la nube está disponible. iOS 1.0.0 (7) está disponible en el grupo TestFlight existente con un icono nítido en verde esmeralda y dorado. Las pruebas internas de Google Play siguen en la compilación 6. Se solicitó la revisión de producción de Google; pueden ejecutarse comprobaciones automáticas antes. El envío público a Apple aún requiere las capturas finales de iOS y verificar el acceso real con Apple. Se comprobaron figuras, tablas y ecuaciones de artículos importados en una pantalla de tamaño móvil.

La versión 0.3 incorpora pantallas SwiftUI en iOS y controles nativos en Android, texto de lectura más grande y ajustable, una página de perfil y conversaciones persistentes con el agente. Un agente en la estación de trabajo busca en índices de investigación abierta y descarga PDF usando un modelo local mediante LazyEdge. Elige convertir y añadir para crear una copia privada con Mathpix que conserve ecuaciones y figuras. El registro de la actualización nativa detalla las compilaciones y pruebas.

[0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

## Apoyo

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Cita

Cita este repositorio si lo utilizas en investigación. GitHub lee CITATION.cff para ofrecer la referencia. [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
