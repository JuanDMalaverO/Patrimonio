<?php
// backend/config/wompi.php
// ──────────────────────────────────────────────────────────────────────────────
// INSTRUCCIONES:
//   1. Copia este archivo como wompi.php en la misma carpeta
//   2. Llena tus llaves desde comercios.wompi.co > Desarrolladores > Llaves
//   3. NUNCA subas wompi.php a git (está en .gitignore)
//
// SANDBOX (pruebas):  llaves que empiezan con pub_test_ / prv_test_ / test_
// PRODUCCIÓN:         llaves que empiezan con pub_prod_ / prv_prod_ / prod_
// ──────────────────────────────────────────────────────────────────────────────

define('WOMPI_PUBLIC_KEY',    'pub_test_XXXXXXXXXXXXXXXX');
define('WOMPI_PRIVATE_KEY',   'prv_test_XXXXXXXXXXXXXXXX');   // no se usa en el flujo widget
define('WOMPI_INTEGRITY_KEY', 'test_integrity_XXXXXXXXXXXXXXXX'); // Secrets > Llave de integridad
define('WOMPI_EVENTS_KEY',    'test_events_XXXXXXXXXXXXXXXX');    // Secrets > Llave de eventos

// URL de retorno después del pago — debe ser una URL pública accesible por el navegador
// En sandbox puedes usar: http://localhost:5173/pago/resultado
// En producción: https://tudominio.com/pago/resultado
define('WOMPI_REDIRECT_URL', 'https://tudominio.com/pago/resultado');
