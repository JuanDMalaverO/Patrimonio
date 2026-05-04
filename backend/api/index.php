<?php
// backend/api/index.php

// ── CORS ──────────────────────────────────────────────────────────────────────
// Orígenes permitidos: Vite dev server y producción (mismo dominio).
// Al usar credentials:true, el origen debe ser explícito (no wildcard).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
} elseif (empty($origin)) {
    // Petición directa (p.ej. desde Postman/curl), permitir sin credenciales
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Dependencias ──────────────────────────────────────────────────────────────
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/CuentasController.php';
require_once __DIR__ . '/../controllers/CategoriasController.php';
require_once __DIR__ . '/../controllers/TransaccionesController.php';
require_once __DIR__ . '/../controllers/PresupuestosController.php';
require_once __DIR__ . '/../controllers/DashboardController.php';

$db = (new Database())->connect();

// ── Parseo de ruta ────────────────────────────────────────────────────────────
$uri      = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path     = trim(str_replace('/api', '', $uri), '/');
$parts    = $path === '' ? [] : explode('/', $path);
$method   = $_SERVER['REQUEST_METHOD'];
$resource = $parts[0] ?? null;
$id       = $parts[1] ?? null;

try {
    // ── Rutas públicas (sin sesión) ───────────────────────────────────────────
    if ($resource === 'auth') {
        (new AuthController($db))->handle($method, $id);
        exit;
    }

    // ── Rutas protegidas: sesión requerida ────────────────────────────────────
    // requireSession() valida la cookie, actualiza last_activity y retorna
    // el ID binario del usuario. Si no hay sesión válida, emite 401 y termina.
    $userId = (new AuthController($db))->requireSession();
    define('USER_ID', $userId);

    switch ($resource) {
        case 'cuentas':
            (new CuentasController($db))->handle($method, $id);
            break;
        case 'categorias':
            (new CategoriasController($db))->handle($method, $id);
            break;
        case 'transacciones':
            (new TransaccionesController($db))->handle($method, $id);
            break;
        case 'presupuestos':
            (new PresupuestosController($db))->handle($method, $id);
            break;
        case 'dashboard':
            (new DashboardController($db))->handle($method);
            break;
        case null:
        case '':
            Response::json(['name' => 'Patrimonio API', 'version' => '2.0.0']);
            break;
        default:
            Response::error('Recurso no encontrado', 404);
    }
} catch (Throwable $e) {
    Response::error('Error interno: ' . $e->getMessage(), 500);
}
