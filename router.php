<?php
// router.php - Para uso con `php -S localhost:8080 router.php`
// Reescribe /api/* hacia el index del backend

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (strpos($uri, '/api') === 0) {
    require __DIR__ . '/backend/api/index.php';
    return true;
}

// Para cualquier otra ruta, deja que PHP sirva el archivo si existe
return false;
