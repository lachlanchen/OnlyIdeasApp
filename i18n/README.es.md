[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Lee con profundidad. Piensa en compañía.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Descripción

OnlyIdeas es una sala compartida para leer artículos científicos. Importa un PDF o un enlace PDF de acceso abierto, conserva ecuaciones y figuras con Mathpix y comenta pasajes en el lector. Las importaciones nuevas usan Compartido por defecto, con la opción Solo yo. La publicación requiere revisar los permisos y las normas comunitarias; las notas y las conversaciones con el agente siguen siendo privadas.

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

La versión nativa 1.0.0 (10) añade una interfaz viva en turquesa, azul y violeta, temas del sistema, claro y oscuro, y 11 idiomas según el dispositivo por defecto. El agente acepta archivos privados PDF, Word, imágenes y texto. Comenta un párrafo o sigue seleccionando un pasaje. Las solicitudes simultáneas de traducción reutilizan el trabajo y el resultado de la misma revisión, conservando ecuaciones y figuras. Se mantienen el icono aprobado y la caché local. Consulta las pruebas y el estado de las tiendas en las notas de versión.

La sala pública incluye dos artículos reales: OpenAlex (CC0-1.0) y Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), además del ejemplo original identificado como tal. Conserva cuatro figuras originales. Ambos artículos se importaron mediante el flujo real de conversión y se verificaron sin iniciar sesión en un lector del ancho de un teléfono.

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
