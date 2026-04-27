<?php
// backend/api/index.php
// Router REST para el sistema de finanzas

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../controllers/CuentasController.php';
require_once __DIR__ . '/../controllers/CategoriasController.php';
require_once __DIR__ . '/../controllers/TransaccionesController.php';
require_once __DIR__ . '/../controllers/PresupuestosController.php';
require_once __DIR__ . '/../controllers/DashboardController.php';

// MVP: usuario fijo. En producción viene del JWT/sesión.
define('USER_ID', 1);

$db = (new Database())->connect();

// Parseo de URI: /api/recurso/[id]/[sub]
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = '/api';
$path = trim(str_replace($base, '', $uri), '/');
$parts = $path === '' ? [] : explode('/', $path);
$method = $_SERVER['REQUEST_METHOD'];

$resource = $parts[0] ?? null;
$id = $parts[1] ?? null;

try {
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
            Response::json([
                'name' => 'Finanzas Personales API',
                'version' => '1.0.0',
                'endpoints' => [
                    'GET    /api/cuentas',
                    'POST   /api/cuentas',
                    'PUT    /api/cuentas/{id}',
                    'DELETE /api/cuentas/{id}',
                    'GET    /api/categorias',
                    'POST   /api/categorias',
                    'GET    /api/transacciones?desde=YYYY-MM-DD&hasta=YYYY-MM-DD',
                    'POST   /api/transacciones',
                    'DELETE /api/transacciones/{id}',
                    'GET    /api/presupuestos?periodo=YYYY-MM',
                    'POST   /api/presupuestos',
                    'DELETE /api/presupuestos/{id}',
                    'GET    /api/dashboard',
                ],
            ]);
            break;
        default:
            Response::error('Recurso no encontrado', 404);
    }
} catch (Throwable $e) {
    Response::error('Error interno: ' . $e->getMessage(), 500);
}
