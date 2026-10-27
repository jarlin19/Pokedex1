#!/usr/bin/env node
/**
 * fix-index.js
 * ------------------------------------------------------------------
 * Ajusta el index.html GENERADO por `ng build` (carpeta dist/) para que
 * la aplicación funcione con una Content-Security-Policy estricta
 * (script-src 'self', sin 'unsafe-inline').
 *
 * Se ejecuta únicamente en el pipeline de despliegue, sobre el artefacto
 * compilado. NO modifica ningún archivo del código fuente Angular.
 *
 * ¿Qué corrige?
 *
 * 1. Angular CLI (optimización "inlineCritical") emite la hoja de estilos así:
 *        <link rel="stylesheet" href="styles.xxx.css" media="print" onload="this.media='all'">
 *    `onload` es un manejador de eventos inline. Una CSP sin 'unsafe-inline'
 *    lo bloquea y la página quedaría sin estilos (media="print").
 *    Se eliminan esos dos atributos para que la hoja cargue de forma normal.
 *
 * 2. El index.html trae un <script> inline ("Single Page Apps for GitHub Pages")
 *    que sólo sirve en GitHub Pages (reconstruye la ruta a partir del query
 *    string que genera 404.html). En Azure Static Web Apps las rutas de la SPA
 *    las resuelve `navigationFallback` en staticwebapp.config.json, de modo que
 *    el script es innecesario; se retira para no requerir 'unsafe-inline' ni
 *    hashes en script-src.
 *
 * Uso:  node fix-index.js   (ajusta dist/pokedex-angular/index.html)
 * ------------------------------------------------------------------
 */
const fs = require('fs');

const file = process.argv[2] || 'dist/pokedex-angular/index.html';
const original = fs.readFileSync(file, 'utf8');
let html = original;

// (1) Hoja de estilos sin el truco media="print" + onload
html = html.replace(/\s+media="print"\s+onload="this\.media='all'"/g, '');

// (2) Script inline de GitHub Pages (bloque completo, incluidos sus comentarios)
html = html.replace(
  /\s*<!-- Start Single Page Apps for GitHub Pages -->[\s\S]*?<!-- End Single Page Apps for GitHub Pages -->/,
  ''
);

if (html === original) {
  console.warn(`[fix-index] Aviso: no se encontró nada que ajustar en ${file}`);
} else {
  fs.writeFileSync(file, html);
  console.log(`[fix-index] index.html ajustado para CSP estricta: ${file}`);
}

// Verificación final: no debe quedar ningún <script> inline ni atributo onload
const hasInlineScript = /<script(?![^>]*\bsrc=)[^>]*>/i.test(html);
const hasOnload = /\sonload=/i.test(html);
if (hasInlineScript || hasOnload) {
  console.error(`[fix-index] ERROR: todavía hay script inline u onload en ${file}`);
  process.exit(1);
}
