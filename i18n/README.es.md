[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Lee con profundidad. Piensa en compañía.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Descripción

OnlyIdeas es una sala compartida para leer artículos científicos. Importa un PDF o un enlace PDF de acceso abierto, conserva ecuaciones y figuras con Mathpix y comenta pasajes en el lector. Las importaciones nuevas usan Compartido por defecto, con la opción Solo yo. La publicación requiere revisar los permisos y las normas comunitarias; las notas y las conversaciones con el agente siguen siendo privadas.

Un modelo económico configurable crea guías de lectura y traducciones cuando se solicitan. El texto generado se guarda separado del original. GitHub solo almacena artículos publicados expresamente con los derechos necesarios. La aplicación tiene su propio acceso con GitHub y sesiones persistentes.

![OnlyIdeas reading room](../evidence/library-desktop.png)

<!-- recovery17 -->
La versión 1.0.2 (17) añade listas separadas de guardados y favoritos, actividad, bandeja de entrada y preferencias de lectura. Si una descarga se bloquea, sube tu PDF desde la ficha o la solicitud fallida. Traduce el artículo completo, un párrafo o una frase reutilizando traducciones guardadas y conservando ecuaciones y figuras. Compartir sigue siendo la opción predeterminada: las licencias abiertas compatibles verificadas permiten publicar automáticamente; los demás artículos quedan pendientes de revisión. Los recordatorios diarios del dispositivo son opcionales; las alertas de actividad se actualizan dentro de la aplicación.

[1.0.2 (17)](../docs/paper-recovery-and-translation.md)


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

En desarrollo: créditos de lectura en la base de datos, con reservas atómicas, reembolsos y recompensas sin duplicados por artículos públicos aprobados. El perfil muestra el saldo y el historial; las opciones de compartir pasan a la parte superior del chat y las importaciones privadas requieren confirmar el coste. Los nuevos controles están en los 11 idiomas. El cobro de créditos y las compras mensuales aún no están activos en producción.

Próxima etapa preparada: planes mensuales nativos con precios de la tienda, restauración de compras y verificación de renovaciones y reembolsos. Lector, Investigador y Estudio incluyen 200/1.200/2.600 créditos mensuales y 40/80/160 mensajes diarios al agente. Las compras siguen desactivadas hasta completar las pruebas de tienda y dispositivo.

La versión 1.0.2 (13) añade una app nativa para Mac (macOS 13+, Intel y Apple Silicon) con barra lateral y atajos, y una app complementaria para Apple Watch (watchOS 11+). Envía explícitamente un fragmento de un artículo público desde las opciones de lectura del iPhone: los tres últimos quedan disponibles sin conexión y con texto ajustable. Las ecuaciones y figuras completas permanecen en el iPhone y Mac. Los artículos privados, chats y credenciales nunca pasan al Watch. Consulta el registro de versión para el estado de revisión. Las suscripciones siguen limitadas a pruebas del operador.

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

[Reading credits](../docs/reading-credits.md)

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
