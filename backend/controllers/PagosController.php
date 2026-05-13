<?php
// backend/controllers/PagosController.php
// Maneja pagos via Wompi (widget checkout + webhook de confirmación).
//
// Flujo:
//   1. POST /api/pagos/iniciar  → crea referencia, devuelve params para el widget
//   2. Usuario paga en Wompi (widget)
//   3. POST /api/pagos/webhook  → Wompi notifica el resultado (NO requiere sesión)
//   4. GET  /api/pagos/estado   → frontend consulta estado mientras espera

class PagosController {
    private PDO $db;

    const PLANS = [
        'monthly' => ['monto_cop' => 19900,  'label' => 'Patrimonio Premium Mensual', 'dias' => 31],
        'annual'  => ['monto_cop' => 149000, 'label' => 'Patrimonio Premium Anual',   'dias' => 366],
    ];

    public function __construct(PDO $db) { $this->db = $db; }

    // ── Router (rutas protegidas) ─────────────────────────────────────────────
    public function handle(string $method, ?string $id): void {
        match ([$method, $id]) {
            ['POST', null]    => $this->iniciar(),
            ['GET',  'estado']=> $this->estado(),
            default           => Response::error('Ruta no encontrada', 404),
        };
    }

    // ── Webhook (público — sin sesión, verificación por firma) ────────────────
    public function handleWebhook(): void {
        $raw  = file_get_contents('php://input');
        $body = json_decode($raw, true);

        if (!is_array($body)) {
            http_response_code(400);
            exit;
        }

        if (!$this->verificarFirma($body)) {
            http_response_code(401);
            exit;
        }

        $event = $body['event'] ?? '';
        if ($event !== 'transaction.updated') {
            Response::json(['ok' => true]);
            return;
        }

        $tx = $body['data']['transaction'] ?? null;
        if (!$tx) { Response::json(['ok' => true]); return; }

        $referencia = $tx['reference'] ?? null;
        $status     = $tx['status']    ?? null;
        $wompiId    = $tx['id']        ?? null;

        if (!$referencia) { Response::json(['ok' => true]); return; }

        // Buscar pago pendiente (idempotente: no procesar dos veces)
        $stmt = $this->db->prepare("
            SELECT id, usuario_id, plan, estado
            FROM pagos WHERE referencia = ?
        ");
        $stmt->execute([$referencia]);
        $pago = $stmt->fetch();

        if (!$pago) { Response::json(['ok' => true]); return; }

        // Ya procesado previamente
        if ($pago['estado'] === 'aprobado') { Response::json(['ok' => true]); return; }

        $estado = match($status) {
            'APPROVED' => 'aprobado',
            'DECLINED' => 'declinado',
            'VOIDED'   => 'anulado',
            default    => 'pendiente',
        };

        $this->db->prepare("
            UPDATE pagos SET estado = ?, wompi_id = ?, wompi_payload = ?, updated_at = NOW()
            WHERE referencia = ?
        ")->execute([$estado, $wompiId, json_encode($tx), $referencia]);

        if ($status === 'APPROVED') {
            $dias   = self::PLANS[$pago['plan']]['dias'] ?? 31;
            $expiry = date('Y-m-d H:i:s', strtotime("+{$dias} days"));

            $this->db->prepare("
                UPDATE usuarios SET plan = 'premium', plan_expires_at = ? WHERE id = ?
            ")->execute([$expiry, $pago['usuario_id']]);
        }

        Response::json(['ok' => true]);
    }

    // ── Crear referencia de pago ──────────────────────────────────────────────
    private function iniciar(): void {
        if (USER_PLAN === 'premium') {
            Response::error('Tu plan ya es Premium.', 409);
        }

        $body = Response::getBody();
        $plan = $body['plan'] ?? null;

        if (!isset(self::PLANS[$plan])) {
            Response::error('Plan inválido. Usa "monthly" o "annual".', 422);
        }

        $planData       = self::PLANS[$plan];
        $montoCop       = $planData['monto_cop'];
        $montoEnCentavos = $montoCop * 100;
        $referencia     = 'PAT-' . strtoupper(bin2hex(random_bytes(6))) . '-' . time();

        // Firma de integridad: SHA256(referencia + monto_en_centavos + moneda + llave_integridad)
        $integrityHash = hash('sha256',
            $referencia . $montoEnCentavos . 'COP' . WOMPI_INTEGRITY_KEY
        );

        // Guardar pago pendiente
        $this->db->prepare("
            INSERT INTO pagos (usuario_id, referencia, plan, monto_cop)
            VALUES (?, ?, ?, ?)
        ")->execute([USER_ID, $referencia, $plan, $montoCop]);

        Response::json([
            'referencia'         => $referencia,
            'monto_en_centavos'  => $montoEnCentavos,
            'moneda'             => 'COP',
            'descripcion'        => $planData['label'],
            'integrity_hash'     => $integrityHash,
            'public_key'         => WOMPI_PUBLIC_KEY,
            'redirect_url'       => WOMPI_REDIRECT_URL . '?ref=' . urlencode($referencia),
        ]);
    }

    // ── Consultar estado de un pago ───────────────────────────────────────────
    private function estado(): void {
        $ref = $_GET['ref'] ?? null;
        if (!$ref) Response::error('Referencia requerida', 422);

        $stmt = $this->db->prepare("
            SELECT estado, plan, monto_cop, wompi_id, created_at
            FROM pagos WHERE referencia = ? AND usuario_id = ?
        ");
        $stmt->execute([$ref, USER_ID]);
        $pago = $stmt->fetch();

        if (!$pago) Response::error('Pago no encontrado', 404);

        $pago['monto_cop'] = (int)$pago['monto_cop'];
        Response::json($pago);
    }

    // ── Verificar firma del evento Wompi ──────────────────────────────────────
    private function verificarFirma(array $event): bool {
        $sig       = $event['signature'] ?? null;
        if (!$sig) return false;

        $properties = $sig['properties'] ?? [];
        $checksum   = $sig['checksum']   ?? '';

        $chain = '';
        foreach ($properties as $prop) {
            $keys  = explode('.', $prop);
            $value = $event;
            foreach ($keys as $key) {
                $value = is_array($value) ? ($value[$key] ?? '') : '';
            }
            $chain .= $value;
        }
        $chain .= WOMPI_EVENTS_KEY;

        return hash('sha256', $chain) === $checksum;
    }
}
