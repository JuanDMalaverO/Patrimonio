# Patrimonio · Finanzas Personales

> Control total sobre tu dinero. Serio, elegante, sin fricciones.

Aplicación web full-stack de finanzas personales con autenticación real por sesiones, dashboard de patrimonio neto, gestión de cuentas con tasa de rendimiento, presupuestos por categoría, historial de movimientos y tutorial de onboarding para nuevos usuarios.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 · Vite · Tailwind CSS · Recharts · lucide-react · React Router v6 |
| **Backend** | PHP 8.1+ · PDO · Router REST propio (sin framework) |
| **Base de datos** | MySQL 8 |
| **Autenticación** | Sesiones server-side · Cookie HttpOnly/SameSite=Lax · bcrypt cost 12 |

---

## Funcionalidades

### Autenticación
- Registro con validación completa (email, nombre, contraseña ≥ 8 chars, términos)
- Login con protección anti-timing-attack
- Sesiones de 30 días almacenadas en DB (`sesiones` table) con token de 128 chars criptográficamente seguro
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS
- Logout que invalida la sesión en DB y limpia la cookie
- Rutas protegidas — redirigen a `/login` si no hay sesión activa

### Landing page
- Página pública de marketing con hero, características, cómo funciona, spotlight de presupuestos y CTA
- Mockup visual del dashboard construido con CSS puro (sin imágenes)
- Detecta sesión activa y redirige al dashboard automáticamente

### Dashboard
- Patrimonio neto consolidado de todas las cuentas
- Flujo de caja mensual (ingresos / egresos / balance)
- Gráfica de área (Recharts) con evolución diaria del mes
- Top 5 categorías de gasto con gráfica de barras horizontal
- Tasa de ahorro del mes en tiempo real

### Cuentas
- Tipos: ahorros, efectivo, tarjeta, inversión, otro
- **Tasa Efectiva Anual (TEA):** activa por toggle. Calcula el rendimiento acumulado desde la creación de la cuenta y muestra el saldo proyectado con intereses. Preview de proyección a 1 año al crear.
- Saldos dinámicos calculados en tiempo real: `saldo_inicial + Σingresos − Σegresos ± transferencias`
- Soft delete (archivado) que preserva histórico

### Movimientos
- Registro de ingresos, egresos y transferencias entre cuentas
- Filtros por tipo. Agrupación cronológica por fecha
- Guard: no se pueden registrar movimientos sin tener al menos una cuenta activa

### Presupuestos
- Límites mensuales por categoría
- Estados automáticos: `normal` (< 80 %), `alerta` (80–100 %), `excedido` (> 100 %)
- Upsert por `(usuario_id, categoria_id, periodo)`

### Onboarding
- Tutorial inmersivo de 5 pasos para usuarios nuevos (primera vez en el dashboard)
- Detección robusta en 3 capas: DB flag → localStorage → estado React
- Renderizado via React Portal para centrarse correctamente sobre el layout
- Navegación por teclado (←→ / Enter). Saltable con X en cualquier momento
- Nunca vuelve a aparecer una vez completado o saltado

---

## Estructura del proyecto

```
patrimonio/
├── .htaccess                        # Reescritura Apache para /api/*
├── router.php                       # Router para php -S (desarrollo)
│
├── database/
│   └── schema.sql                   # Esquema completo (DROP + CREATE + tablas)
│
├── backend/
│   ├── api/
│   │   └── index.php                # Entry point REST — rutas auth públicas + protegidas
│   ├── config/
│   │   └── database.php             # PDO MySQL
│   ├── controllers/
│   │   ├── AuthController.php       # register · login · logout · me · onboarding
│   │   ├── CuentasController.php    # CRUD + TEA + saldo dinámico
│   │   ├── CategoriasController.php
│   │   ├── TransaccionesController.php
│   │   ├── PresupuestosController.php
│   │   └── DashboardController.php
│   └── utils/
│       └── response.php             # JSON helpers
│
└── frontend/
    ├── index.html
    ├── vite.config.js               # Puerto 5173, proxy /api → :8080
    ├── tailwind.config.js           # Tokens: ink · paper · sage · rust · gold
    └── src/
        ├── main.jsx
        ├── App.jsx                  # Rutas: / · /login · /register · /*
        ├── index.css                # Tailwind layers + componentes base
        ├── contexts/
        │   └── AuthContext.jsx      # user · loading · login · register · logout · completeOnboarding
        ├── components/
        │   ├── Layout.jsx           # Sidebar con nav + info de usuario + logout
        │   ├── ProtectedRoute.jsx   # Spinner → redirect /login si sin sesión
        │   ├── OnboardingTutorial.jsx # Tutorial 5 pasos (React Portal)
        │   ├── Modal.jsx
        │   ├── PageHeader.jsx
        │   └── States.jsx
        ├── pages/
        │   ├── Landing.jsx          # Página pública de marketing
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Cuentas.jsx          # Con TEA y cálculo de rendimiento
        │   ├── Transacciones.jsx    # Guard sin cuentas
        │   ├── Presupuestos.jsx
        │   └── Categorias.jsx
        ├── services/
        │   └── api.js               # Fetch wrapper con credentials:include
        └── utils/
            └── format.js            # COP · fechas · periodos
```

---

## Instalación

### 1. Base de datos

```bash
mysql -u root -p < database/schema.sql
```

Crea `finanzas_personales` con las tablas:
`usuarios` · `sesiones` · `cuentas` · `categorias` · `transacciones` · `presupuestos`

Los usuarios se crean únicamente a través del formulario de registro. No hay datos semilla de usuario.

### 2. Backend PHP

Ajusta las credenciales en `backend/config/database.php` si es necesario (host, usuario, contraseña, puerto).

Lanzar el servidor de desarrollo:

```bash
# Desde la raíz del proyecto:
php -S localhost:8080 router.php
```

El `router.php` enruta `/api/*` al backend y deja el resto para Vite.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**

El proxy de Vite reenvía `/api/*` a `localhost:8080`, manteniendo las cookies en el mismo origen.

---

## API Reference

### Autenticación (pública, sin sesión)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Crear cuenta (`nombre_completo`, `email`, `password`, `accepted_terms`) |
| `POST` | `/api/auth/login` | Iniciar sesión (`email`, `password`) |
| `POST` | `/api/auth/logout` | Cerrar sesión (invalida cookie + DB) |
| `GET`  | `/api/auth/me` | Usuario autenticado actual |
| `POST` | `/api/auth/onboarding` | Marcar onboarding como completado |

### Recursos protegidos (requieren cookie de sesión válida)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`    | `/api/dashboard?periodo=YYYY-MM` | Patrimonio · flujo · tendencia · top categorías |
| `GET`    | `/api/cuentas` | Lista con saldo dinámico + TEA |
| `POST`   | `/api/cuentas` | Crear cuenta (acepta `tea_anual` opcional) |
| `PUT`    | `/api/cuentas/{id}` | Editar cuenta |
| `DELETE` | `/api/cuentas/{id}` | Archivar (soft delete) |
| `GET`    | `/api/categorias` | Lista por tipo |
| `POST`   | `/api/categorias` | Crear categoría |
| `DELETE` | `/api/categorias/{id}` | Eliminar |
| `GET`    | `/api/transacciones` | Filtros: `desde`, `hasta`, `tipo`, `cuenta_id` |
| `POST`   | `/api/transacciones` | Crear ingreso/egreso/transferencia |
| `DELETE` | `/api/transacciones/{id}` | Eliminar |
| `GET`    | `/api/presupuestos?periodo=YYYY-MM` | Con % consumido y estado |
| `POST`   | `/api/presupuestos` | Upsert por (categoría, periodo) |
| `DELETE` | `/api/presupuestos/{id}` | Eliminar |

---

## Decisiones técnicas

**Sesiones server-side sobre JWT**
Las sesiones almacenadas en DB permiten invalidación inmediata (logout real), rotación de tokens y auditoría. El JWT sin blacklist no permite logout verdadero. Para una app personal el overhead de BD por request es irrelevante.

**UUID binario (`BINARY(16)`)**
Los IDs de usuarios se almacenan como UUID en binario para eficiencia de índice en MySQL. Se gestionan con `UNHEX(REPLACE(UUID(),'-',''))` en inserts y `bin2hex()` / `hex2bin()` en PHP.

**Saldos dinámicos**
El saldo de cada cuenta se calcula en tiempo real: `saldo_inicial + Σingresos − Σegresos ± transferencias`. No se desnormaliza, lo que garantiza consistencia perfecta aunque sea ligeramente más costoso.

**TEA con interés compuesto**
`rendimiento = saldo_actual × ((1 + TEA/100)^(días/365) − 1)`. Se calcula en el frontend para no hacer una query extra por cuenta. El `fecha_creacion` se retorna desde el backend.

**Detección de primera vez en 3 capas**
`onboarding_completado` en DB (fuente de verdad) + `me()` siempre lo lee fresco + localStorage como fallback ante fallos de red. Las tres capas deben estar en desacuerdo para que el tutorial reaparezca — prácticamente imposible.

**React Portal para el tutorial**
`animate-fade-up` en el Layout usa `transform`, creando un nuevo containing block que rompe `position:fixed`. El Portal renderiza el tutorial directamente en `document.body`, garantizando centrado real en viewport.

**Guard de movimientos sin cuentas**
Validación en UI (botón que redirige a Cuentas) y en lógica de apertura de modal. No se puede abrir el formulario de transacción si `cuentas.length === 0`.

---

## Diseño

**Tipografía**
- `Fraunces` — serif editorial para cifras y titulares grandes
- `Manrope` — geométrico sans para cuerpo de texto
- `JetBrains Mono` — monoespaciado para numeración secundaria y código

**Paleta**
| Token | Hex | Uso |
|-------|-----|-----|
| `ink` | `#0a0a0a` | Texto principal, fondos oscuros |
| `paper` | `#f5f3ee` | Fondo general (crema editorial) |
| `bone` | `#ebe7df` | Superficies secundarias |
| `sage` | `#5a6b58` | Ingresos, positivo, sage green |
| `rust` | `#a8472a` | Egresos, alertas, terracota |
| `gold` | `#a88a3a` | Advertencias, transferencias |

**Filosofía**
Sin verde/rojo genérico de fintech. Paleta editorial de tinta y papel. `tabular-nums` activado globalmente para alineación contable perfecta. Letra-espaciado comprimido (`-0.04em`) en tipografía display para mayor autoridad visual.
