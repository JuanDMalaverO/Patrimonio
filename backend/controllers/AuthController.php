<?php
// backend/controllers/AuthController.php

class AuthController {
    private PDO $db;
    private ?array $cachedPayload = null; // Evita doble query por request

    private const COOKIE_NAME  = 'patrimonio_session';
    private const SESSION_DAYS = 30;
    private const BCRYPT_COST  = 12;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // ── Router ────────────────────────────────────────────────────────────────

    public function handle(string $method, ?string $action): void {
        match ([$method, $action]) {
            ['POST', 'register']   => $this->register(),
            ['POST', 'login']      => $this->login(),
            ['POST', 'logout']     => $this->logout(),
            ['GET',  'me']         => $this->me(),
            ['POST', 'onboarding'] => $this->completeOnboarding(),
            ['PUT',  'profile']    => $this->updateProfile(),
            ['PUT',  'password']   => $this->changePassword(),
            default                => Response::error('Ruta de autenticación no encontrada', 404),
        };
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    private function register(): void {
        $b = Response::getBody();
        Response::require($b, ['nombre_completo', 'email', 'password']);

        $email  = strtolower(trim($b['email']));
        $nombre = trim($b['nombre_completo']);
        $pass   = $b['password'];
        $terms  = !empty($b['accepted_terms']);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('El email no tiene un formato válido', 422);
        }
        if (mb_strlen($nombre) < 2) {
            Response::error('El nombre debe tener al menos 2 caracteres', 422);
        }
        if (mb_strlen($pass) < 8) {
            Response::error('La contraseña debe tener al menos 8 caracteres', 422);
        }
        if (!$terms) {
            Response::error('Debes aceptar los términos y condiciones', 422);
        }

        // Verificar unicidad del email
        $stmt = $this->db->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            Response::error('Este email ya está registrado', 409);
        }

        // Generar UUID binario via MySQL
        $binaryId = $this->generateUUID();

        $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => self::BCRYPT_COST]);

        $stmt = $this->db->prepare("
            INSERT INTO usuarios (id, email, password_hash, nombre_completo, accepted_terms, terms_accepted_at, terms_version)
            VALUES (?, ?, ?, ?, 1, NOW(), '1.0')
        ");
        $stmt->execute([$binaryId, $email, $hash, $nombre]);

        // Nuevo usuario: onboarding pendiente
        $usuario = $this->buildPayload($binaryId, $email, $nombre, 'user', false);
        $this->createSession($binaryId, $usuario);

        Response::json(['usuario' => $usuario, 'mensaje' => 'Cuenta creada'], 201);
    }

    private function login(): void {
        $b = Response::getBody();
        Response::require($b, ['email', 'password']);

        $email = strtolower(trim($b['email']));
        $pass  = $b['password'];

        $stmt = $this->db->prepare("
            SELECT id, email, password_hash, nombre_completo, role, is_active, onboarding_completado, plan
            FROM usuarios
            WHERE email = ? AND deleted_at IS NULL
        ");
        $stmt->execute([$email]);
        $row = $stmt->fetch();

        // Hash de guardia para evitar timing attacks
        $hashRef = $row ? $row['password_hash'] : '$2y$12$invalido.hash.de.guardia.para.prevenir.timing.attack.';

        if (!$row || !password_verify($pass, $hashRef)) {
            Response::error('Email o contraseña incorrectos', 401);
        }
        if (!$row['is_active']) {
            Response::error('Esta cuenta está desactivada. Contacta al soporte.', 403);
        }

        $binaryId = $row['id'];
        $usuario  = $this->buildPayload($binaryId, $row['email'], $row['nombre_completo'], $row['role'], (bool)$row['onboarding_completado'], $row['plan'] ?? 'free');
        $this->createSession($binaryId, $usuario);

        Response::json(['usuario' => $usuario, 'mensaje' => 'Sesión iniciada']);
    }

    private function logout(): void {
        $token = $_COOKIE[self::COOKIE_NAME] ?? null;
        if ($token) {
            $this->db->prepare("DELETE FROM sesiones WHERE id = ?")->execute([$token]);
        }
        $this->clearCookie();
        Response::json(['mensaje' => 'Sesión cerrada']);
    }

    private function me(): void {
        $payload = $this->resolveSessionPayload();
        if (!$payload) {
            Response::error('No autenticado', 401);
        }

        $usuario = $payload['user'];

        // Leer onboarding_completado siempre fresco de la DB para evitar
        // que un payload desactualizado haga reaparecer el tutorial.
        $binaryId = hex2bin($usuario['id']);
        $stmt = $this->db->prepare("SELECT onboarding_completado, plan FROM usuarios WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$binaryId]);
        $row = $stmt->fetch();
        if ($row !== false) {
            $usuario['onboarding_completado'] = (bool)$row['onboarding_completado'];
            $usuario['plan']                  = $row['plan'] ?? 'free';
        }

        Response::json(['usuario' => $usuario]);
    }

    // ── Session pública ───────────────────────────────────────────────────────

    /**
     * Valida la cookie de sesión y retorna el ID binario del usuario.
     * Si la sesión no existe o expiró, emite HTTP 401 y termina.
     */
    public function requireSession(): string {
        $payload = $this->resolveSessionPayload();
        if (!$payload) {
            Response::error('No autenticado. Inicia sesión para continuar.', 401);
        }
        return hex2bin($payload['user']['id']);
    }

    // ── Privados ──────────────────────────────────────────────────────────────

    private function resolveSessionPayload(): ?array {
        if ($this->cachedPayload !== null) return $this->cachedPayload;

        $token = $_COOKIE[self::COOKIE_NAME] ?? null;
        if (!$token || strlen($token) !== 128) return null;

        $stmt = $this->db->prepare("
            SELECT id, payload
            FROM sesiones
            WHERE id = ? AND expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $session = $stmt->fetch();

        if (!$session) {
            $this->clearCookie();
            return null;
        }

        $this->db->prepare("UPDATE sesiones SET last_activity = NOW() WHERE id = ?")
                 ->execute([$token]);

        $this->cachedPayload = json_decode($session['payload'], true);
        return $this->cachedPayload;
    }

    /** Retorna el plan del usuario desde el payload cacheado. */
    public function getUserPlan(): string {
        $payload = $this->resolveSessionPayload();
        return $payload['user']['plan'] ?? 'free';
    }

    private function createSession(string $binaryId, array $usuario): void {
        $token   = bin2hex(random_bytes(64)); // 128 chars, criptográficamente seguro
        $expires = date('Y-m-d H:i:s', time() + self::SESSION_DAYS * 86400);
        $payload = json_encode(['user' => $usuario]);

        $stmt = $this->db->prepare("
            INSERT INTO sesiones (id, usuario_id, ip_address, user_agent, payload, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $token,
            $binaryId,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            $payload,
            $expires,
        ]);

        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        setcookie(self::COOKIE_NAME, $token, [
            'expires'  => time() + self::SESSION_DAYS * 86400,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure'   => $secure,
        ]);
    }

    private function clearCookie(): void {
        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        setcookie(self::COOKIE_NAME, '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure'   => $secure,
        ]);
    }

    private function generateUUID(): string {
        $row = $this->db->query("SELECT UNHEX(REPLACE(UUID(), '-', '')) AS uid")->fetch();
        return $row['uid'];
    }

    private function completeOnboarding(): void {
        $payload = $this->resolveSessionPayload();
        if (!$payload) {
            Response::error('No autenticado', 401);
        }

        $binaryId = hex2bin($payload['user']['id']);

        // Marcar en DB
        $this->db->prepare("UPDATE usuarios SET onboarding_completado = 1 WHERE id = ?")
                 ->execute([$binaryId]);

        // Actualizar el payload de la sesión activa para que me() lo refleje de inmediato
        $payload['user']['onboarding_completado'] = true;
        $token = $_COOKIE[self::COOKIE_NAME];
        $this->db->prepare("UPDATE sesiones SET payload = ? WHERE id = ?")
                 ->execute([json_encode($payload), $token]);

        Response::json(['mensaje' => 'Onboarding completado']);
    }

    private function updateProfile(): void {
        $payload = $this->resolveSessionPayload();
        if (!$payload) Response::error('No autenticado', 401);

        $b      = Response::getBody();
        $nombre = trim($b['nombre_completo'] ?? '');
        if (mb_strlen($nombre) < 2) Response::error('El nombre debe tener al menos 2 caracteres', 422);

        $binaryId = hex2bin($payload['user']['id']);
        $this->db->prepare("UPDATE usuarios SET nombre_completo = ? WHERE id = ?")
                 ->execute([$nombre, $binaryId]);

        // Sincronizar payload de sesión
        $payload['user']['nombre_completo'] = $nombre;
        $token = $_COOKIE[self::COOKIE_NAME] ?? null;
        if ($token) {
            $this->db->prepare("UPDATE sesiones SET payload = ? WHERE id = ?")
                     ->execute([json_encode($payload), $token]);
        }

        Response::json(['nombre_completo' => $nombre, 'mensaje' => 'Perfil actualizado']);
    }

    private function changePassword(): void {
        $payload = $this->resolveSessionPayload();
        if (!$payload) Response::error('No autenticado', 401);

        $b           = Response::getBody();
        $actual      = $b['password_actual']  ?? '';
        $nueva       = $b['password_nueva']   ?? '';
        $confirmacion = $b['password_confirmar'] ?? '';

        if (mb_strlen($nueva) < 8) Response::error('La contraseña nueva debe tener al menos 8 caracteres', 422);
        if ($nueva !== $confirmacion) Response::error('Las contraseñas nuevas no coinciden', 422);

        $binaryId = hex2bin($payload['user']['id']);
        $stmt     = $this->db->prepare("SELECT password_hash FROM usuarios WHERE id = ?");
        $stmt->execute([$binaryId]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($actual, $row['password_hash'])) {
            Response::error('La contraseña actual es incorrecta', 401);
        }

        $hash = password_hash($nueva, PASSWORD_BCRYPT, ['cost' => self::BCRYPT_COST]);
        $this->db->prepare("UPDATE usuarios SET password_hash = ? WHERE id = ?")
                 ->execute([$hash, $binaryId]);

        Response::json(['mensaje' => 'Contraseña actualizada correctamente']);
    }

    private function buildPayload(string $binaryId, string $email, string $nombre, string $role, bool $onboarding = false, string $plan = 'free'): array {
        return [
            'id'                    => bin2hex($binaryId),
            'email'                 => $email,
            'nombre_completo'       => $nombre,
            'role'                  => $role,
            'onboarding_completado' => $onboarding,
            'plan'                  => $plan,
        ];
    }
}
