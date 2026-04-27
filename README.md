# Patrimonio · Sistema de Finanzas Personales (MVP)

Sistema web full-stack para gestión de finanzas personales: cuentas, transacciones, presupuestos y dashboard consolidado.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts + lucide-react
- **Backend:** PHP 8+ (sin framework, PDO + router REST propio)
- **Base de datos:** MySQL 8

## Estructura

```
finanzas/
├── database/
│   └── schema.sql              # Esquema + datos semilla
├── backend/
│   ├── api/index.php           # Router REST (entry point)
│   ├── config/database.php     # Conexión PDO
│   ├── controllers/            # 5 controllers (Cuentas, Categorias,
│   │                           # Transacciones, Presupuestos, Dashboard)
│   └── utils/response.php      # Helpers JSON
├── frontend/
│   ├── src/
│   │   ├── pages/              # Dashboard, Cuentas, Transacciones,
│   │   │                       # Presupuestos, Categorias
│   │   ├── components/         # Layout, Modal, PageHeader, States
│   │   ├── services/api.js     # Cliente HTTP
│   │   └── utils/format.js     # Formato COP, fechas, periodos
│   ├── tailwind.config.js
│   └── vite.config.js          # Proxy /api → :8080
└── .htaccess                   # Reescritura para Apache
```

## Instalación

### 1. Base de datos

```bash
mysql -u root -p < database/schema.sql
```

Esto crea la BD `finanzas_personales` con un usuario demo (`id=1`), 3 cuentas, 10 categorías, 10 transacciones y 5 presupuestos de ejemplo para abril 2026.

### 2. Backend PHP

Ajusta credenciales en `backend/config/database.php` si es necesario.

Para desarrollo, lanzar el servidor PHP integrado:

```bash
cd backend
php -S localhost:8080 -t .. ../.htaccess  # opción simple
# o usar Apache/Nginx apuntando al directorio raíz con el .htaccess
```

Para que el router funcione con `php -S`, también puedes crear un router minimal:

```bash
# Desde la raíz del proyecto:
php -S localhost:8080 -t . router.php
```

Donde `router.php` es:

```php
<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($uri, '/api') === 0) {
    require __DIR__ . '/backend/api/index.php';
    return true;
}
return false;
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173

El proxy de Vite redirige `/api/*` al backend en `localhost:8080`.

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/dashboard?periodo=YYYY-MM` | Patrimonio + flujo + top categorías |
| GET    | `/api/cuentas`                   | Lista con saldo dinámico calculado |
| POST   | `/api/cuentas`                   | Crear cuenta |
| DELETE | `/api/cuentas/{id}`              | Archivar (soft delete) |
| GET    | `/api/transacciones`             | Filtros: `desde`, `hasta`, `tipo`, `cuenta_id` |
| POST   | `/api/transacciones`             | Crear ingreso/egreso/transferencia |
| GET    | `/api/presupuestos?periodo=YYYY-MM` | Con % consumido y estado |
| POST   | `/api/presupuestos`              | Upsert por (categoría, periodo) |

## Decisiones técnicas

- **Saldos dinámicos**: el saldo de cada cuenta se calcula en tiempo real desde `saldo_inicial + Σ(ingresos) - Σ(egresos) ± transferencias`. No se almacena denormalizado, evitando inconsistencias.
- **Transferencias internas**: una sola fila en `transacciones` con `cuenta_id` (origen) y `cuenta_destino_id` (destino). El check constraint garantiza coherencia.
- **Presupuestos como upsert**: `ON DUPLICATE KEY UPDATE` sobre la unique key `(usuario_id, categoria_id, periodo)`.
- **Estado del presupuesto**: derivado en backend (`normal` <80%, `alerta` 80-100%, `excedido` >100%).
- **Soft delete en cuentas**: al archivar (`activa=0`) se preserva el histórico de transacciones.
- **MVP sin auth**: usuario fijo `USER_ID=1`. La estructura ya soporta multi-usuario para extensión futura con JWT.

## Diseño

- **Tipografía**: Fraunces (serif display, para cifras y titulares) + Manrope (sans body) + JetBrains Mono (numeración secundaria).
- **Paleta editorial**: papel crema (`#f5f3ee`), tinta (`#0a0a0a`), acentos en sage (verde profundo) y rust (terracota) en lugar del típico verde/rojo fintech.
- **Tabular nums** activadas en cifras para alineación contable perfecta.
