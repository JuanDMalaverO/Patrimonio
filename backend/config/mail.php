<?php
// backend/config/mail.php
// ─────────────────────────────────────────────────────────────────────────────
// Configura el email desde el que Patrimonio envía los códigos.
// OBLIGATORIO: crea una cuenta de correo en Hostinger (hPanel → Correo electrónico)
// y pon aquí sus datos.
//
// En Hostinger ve a hPanel → Correo electrónico → Cuentas de correo electrónico
// y crea: noreply@tudominio.com
// ─────────────────────────────────────────────────────────────────────────────

define('MAIL_FROM',      'patrimony@mypatrimony.com');   // ← CAMBIAR por tu email real
define('MAIL_FROM_NAME', 'Patrimonio');
