-- =====================================================
-- Sistema de Finanzas Personales - Esquema MySQL Pro
-- =====================================================

DROP DATABASE IF EXISTS finanzas_personales;
CREATE DATABASE finanzas_personales CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finanzas_personales;

-- -----------------------------------------------------
-- 1. Usuarios (UUID, Auditoría, Roles)
-- -----------------------------------------------------
CREATE TABLE usuarios (
    id BINARY(16) PRIMARY KEY, 
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    
    -- Configuración
    moneda_default CHAR(3) DEFAULT 'COP',

    -- Auditoría de Términos
    accepted_terms BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP NULL,
    terms_version VARCHAR(10) NULL,

    -- Estado y Roles
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    role ENUM('user', 'admin', 'editor') DEFAULT 'user',

    -- Onboarding y plan
    onboarding_completado TINYINT(1) DEFAULT 0,
    plan ENUM('free', 'premium') DEFAULT 'free',

    -- Trazabilidad
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    INDEX idx_usuarios_email (email),
    INDEX idx_usuarios_active_status (is_active, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 2. Sesiones (Para manejo de Cookies/Tokens)
-- -----------------------------------------------------
CREATE TABLE sesiones (
    id VARCHAR(128) PRIMARY KEY,
    usuario_id BINARY(16) NULL, -- Corregido: Mismo tipo que usuarios.id
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload JSON NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_sesiones_expires_at (expires_at),
    INDEX idx_sesiones_usuario_id (usuario_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 3. Cuentas / Billeteras (Agregada: Estaba faltando)
-- -----------------------------------------------------
CREATE TABLE cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('ahorros', 'efectivo', 'tarjeta', 'inversion', 'otro') NOT NULL,
    saldo_inicial DECIMAL(15,2) DEFAULT 0.00,
    moneda CHAR(3) DEFAULT 'COP',
    color VARCHAR(7) DEFAULT '#1f2937',
    icono VARCHAR(30) DEFAULT 'wallet',
    activa TINYINT(1) DEFAULT 1,
    tea_anual DECIMAL(7,4) NULL DEFAULT NULL,  -- Tasa Efectiva Anual (%). NULL = sin rendimiento
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 4. Categorías
-- -----------------------------------------------------
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NOT NULL, -- Corregido
    nombre VARCHAR(80) NOT NULL,
    tipo ENUM('ingreso','egreso') NOT NULL,
    color VARCHAR(7) DEFAULT '#666666',
    icono VARCHAR(30) DEFAULT 'tag',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY uq_cat_usuario (usuario_id, nombre, tipo)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 5. Transacciones
-- -----------------------------------------------------
CREATE TABLE transacciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NOT NULL, -- Corregido
    tipo ENUM('ingreso','egreso','transferencia') NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    fecha DATE NOT NULL,
    descripcion VARCHAR(255),
    cuenta_id INT NOT NULL,
    cuenta_destino_id INT NULL,
    categoria_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    
    INDEX idx_transacciones_fecha (fecha),
    INDEX idx_transacciones_usuario_fecha (usuario_id, fecha),
    INDEX idx_transacciones_categoria (categoria_id),
    
    CHECK (monto > 0),
    CHECK (
        (tipo = 'transferencia' AND cuenta_destino_id IS NOT NULL AND cuenta_destino_id != cuenta_id)
        OR (tipo IN ('ingreso','egreso') AND cuenta_destino_id IS NULL)
    )
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 6. Presupuestos
-- -----------------------------------------------------
CREATE TABLE presupuestos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NOT NULL, -- Corregido
    categoria_id INT NOT NULL,
    monto_limite DECIMAL(15,2) NOT NULL,
    periodo CHAR(7) NOT NULL, -- Formato YYYY-MM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
    
    UNIQUE KEY uq_presupuesto_usuario (usuario_id, categoria_id, periodo),
    CHECK (monto_limite > 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 7. Insights IA (caché de análisis generados)
-- -----------------------------------------------------
CREATE TABLE ai_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BINARY(16) NOT NULL,
    periodo CHAR(7) NOT NULL,
    contenido JSON NOT NULL,
    generado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_ai_usuario_periodo (usuario_id, periodo)
) ENGINE=InnoDB;

-- =====================================================
-- DATOS SEMILLA (Adaptados para soportar UUID)
-- =====================================================

-- Generamos el UUID y quitamos los guiones para convertirlo a Binario (Universal)
SET @demo_uuid_str = UUID();
SET @demo_user_id = UNHEX(REPLACE(@demo_uuid_str, '-', ''));