<?php
// backend/controllers/AiController.php

class AiController {
    private PDO $db;

    private const MODEL            = 'claude-haiku-4-5-20251001';
    private const MAX_TOKENS       = 1000;
    private const CACHE_HOURS      = 12;
    private const MAX_DAILY_CALLS  = 5;   // tope de llamadas reales a Claude por usuario/día
    private const MIN_REFRESH_MINS = 30;  // mínimo entre refreshes manuales

    public function __construct(PDO $db) { $this->db = $db; }

    public function handle(string $method, ?string $action): void {
        $this->requirePremium();
        match ([$method, $action]) {
            ['GET',  'insights'] => $this->getInsights(),
            ['POST', 'refresh']  => $this->refreshInsights(),
            default              => Response::error('Ruta de IA no encontrada', 404),
        };
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    private function getInsights(): void {
        $periodo = $this->validPeriodo($_GET['periodo'] ?? date('Y-m'));
        $cached  = $this->getCached($periodo);
        if ($cached) { Response::json($cached); return; }

        $this->requireMinData();
        $this->checkDailyLimit();
        $context = $this->buildContext($periodo);
        Response::json($this->saveAndReturn($this->callClaude($context), $periodo));
    }

    private function refreshInsights(): void {
        $periodo = $this->validPeriodo($_GET['periodo'] ?? date('Y-m'));

        // Bloquear si el caché tiene menos de MIN_REFRESH_MINS
        $stmt = $this->db->prepare("
            SELECT generado_at FROM ai_insights
            WHERE usuario_id = ? AND periodo = ?
            ORDER BY generado_at DESC LIMIT 1
        ");
        $stmt->execute([USER_ID, $periodo]);
        $last = $stmt->fetch();
        if ($last) {
            $minsSince = (time() - strtotime($last['generado_at'])) / 60;
            if ($minsSince < self::MIN_REFRESH_MINS) {
                $wait = (int)(self::MIN_REFRESH_MINS - $minsSince);
                Response::error("Espera {$wait} minutos antes de regenerar el análisis.", 429);
            }
        }

        $this->requireMinData();
        $this->checkDailyLimit();

        $this->db->prepare("DELETE FROM ai_insights WHERE usuario_id = ? AND periodo = ?")
                 ->execute([USER_ID, $periodo]);

        $context = $this->buildContext($periodo);
        Response::json($this->saveAndReturn($this->callClaude($context), $periodo));
    }

    // ── Seguridad ─────────────────────────────────────────────────────────────

    private function requirePremium(): void {
        if (!defined('USER_PLAN') || USER_PLAN !== 'premium') {
            Response::error('Esta función requiere Plan Premium.', 403);
        }
    }

    private function requireMinData(): void {
        $stmt = $this->db->prepare("SELECT COUNT(*) AS cnt FROM transacciones WHERE usuario_id = ?");
        $stmt->execute([USER_ID]);
        if ((int)$stmt->fetch()['cnt'] < 1) {
            Response::error('Registra al menos una transacción para generar análisis de IA.', 422);
        }
    }

    private function checkDailyLimit(): void {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) AS llamadas
            FROM ai_insights
            WHERE usuario_id = ? AND generado_at >= CURDATE()
        ");
        $stmt->execute([USER_ID]);
        if ((int)$stmt->fetch()['llamadas'] >= self::MAX_DAILY_CALLS) {
            Response::error('Límite diario de análisis alcanzado. El análisis se actualiza automáticamente cada 12 horas.', 429);
        }
    }

    private function validPeriodo(string $p): string {
        if (!preg_match('/^\d{4}-\d{2}$/', $p)) {
            Response::error('Periodo inválido.', 422);
        }
        return $p;
    }

    // ── Caché ─────────────────────────────────────────────────────────────────

    private function getCached(string $periodo): ?array {
        $stmt = $this->db->prepare("
            SELECT contenido, generado_at FROM ai_insights
            WHERE usuario_id = ? AND periodo = ?
              AND generado_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY generado_at DESC LIMIT 1
        ");
        $stmt->execute([USER_ID, $periodo, self::CACHE_HOURS]);
        $row = $stmt->fetch();
        if (!$row) return null;
        $data = json_decode($row['contenido'], true);
        $data['_meta'] = ['cached' => true, 'generado_at' => $row['generado_at'], 'periodo' => $periodo];
        return $data;
    }

    private function saveAndReturn(array $data, string $periodo): array {
        $this->db->prepare("INSERT INTO ai_insights (usuario_id, periodo, contenido) VALUES (?,?,?)")
                 ->execute([USER_ID, $periodo, json_encode($data)]);
        $data['_meta'] = ['cached' => false, 'generado_at' => date('Y-m-d H:i:s'), 'periodo' => $periodo];
        return $data;
    }

    // ── Constructor de contexto ────────────────────────────────────────────────

    private function buildContext(string $periodo): array {
        [$inicio, $fin] = $this->periodRange($periodo);

        // Cuentas con saldo calculado (subconsultas correlacionadas — MySQL no soporta c.id en derived tables)
        $stmt = $this->db->prepare("
            SELECT c.tipo, c.tea_anual, c.nombre,
                COALESCE(c.saldo_inicial,0)
                + COALESCE((SELECT SUM(monto) FROM transacciones t WHERE t.cuenta_id=c.id AND t.tipo='ingreso'),0)
                - COALESCE((SELECT SUM(monto) FROM transacciones t WHERE t.cuenta_id=c.id AND t.tipo='egreso'),0)
                + COALESCE((SELECT SUM(monto) FROM transacciones t WHERE t.cuenta_destino_id=c.id AND t.tipo='transferencia'),0)
                - COALESCE((SELECT SUM(monto) FROM transacciones t WHERE t.cuenta_id=c.id AND t.tipo='transferencia'),0)
                AS saldo
            FROM cuentas c WHERE c.usuario_id=? AND c.activa=1
        ");
        $stmt->execute([USER_ID]);
        $cuentas = $stmt->fetchAll();

        $patrimonio   = round(array_sum(array_column($cuentas, 'saldo')));
        $saldoAhorros = round(array_sum(array_column(
            array_filter($cuentas, fn($c) => $c['tipo'] === 'ahorros'), 'saldo'
        )));

        // Flujo del período actual
        $stmt = $this->db->prepare("
            SELECT SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos,
                   SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END) AS egresos
            FROM transacciones WHERE usuario_id=? AND fecha BETWEEN ? AND ?
        ");
        $stmt->execute([USER_ID, $inicio, $fin]);
        $flujo    = $stmt->fetch();
        $ingresos = (float)($flujo['ingresos'] ?? 0);
        $egresos  = (float)($flujo['egresos']  ?? 0);

        // Presupuestos
        $stmt = $this->db->prepare("
            SELECT cat.nombre AS categoria, p.monto_limite AS limite,
                COALESCE(SUM(t.monto),0) AS gastado,
                ROUND(COALESCE(SUM(t.monto),0)/p.monto_limite*100,1) AS pct
            FROM presupuestos p
            JOIN categorias cat ON cat.id=p.categoria_id
            LEFT JOIN transacciones t
                ON t.categoria_id=p.categoria_id AND t.usuario_id=p.usuario_id
                AND t.tipo='egreso' AND t.fecha BETWEEN ? AND ?
            WHERE p.usuario_id=? AND p.periodo=?
            GROUP BY p.id, cat.nombre, p.monto_limite ORDER BY pct DESC
        ");
        $stmt->execute([$inicio, $fin, USER_ID, $periodo]);
        $presupuestos = array_map(fn($p) => [
            'categoria' => $p['categoria'],
            'limite'    => (int)$p['limite'],
            'gastado'   => (int)$p['gastado'],
            'pct'       => (float)$p['pct'],
            'estado'    => $p['pct'] >= 100 ? 'excedido' : ($p['pct'] >= 80 ? 'alerta' : 'normal'),
        ], $stmt->fetchAll());

        // Top 5 categorías de egreso
        $stmt = $this->db->prepare("
            SELECT cat.nombre, SUM(t.monto) AS total
            FROM transacciones t JOIN categorias cat ON cat.id=t.categoria_id
            WHERE t.usuario_id=? AND t.tipo='egreso' AND t.fecha BETWEEN ? AND ?
            GROUP BY cat.id ORDER BY total DESC LIMIT 5
        ");
        $stmt->execute([USER_ID, $inicio, $fin]);
        $topGastos = array_map(fn($r) => [
            'categoria' => $r['nombre'], 'total' => (int)$r['total'],
        ], $stmt->fetchAll());

        // Tendencia: 3 meses anteriores
        $tendencia = [];
        $avgEgresos = 0;
        for ($i = 1; $i <= 3; $i++) {
            $mes = date('Y-m', strtotime("-{$i} months", strtotime($periodo.'-01')));
            [$mI, $mF] = $this->periodRange($mes);
            $stmt = $this->db->prepare("
                SELECT SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ing,
                       SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END) AS egr
                FROM transacciones WHERE usuario_id=? AND fecha BETWEEN ? AND ?
            ");
            $stmt->execute([USER_ID, $mI, $mF]);
            $m = $stmt->fetch();
            if ((float)$m['ing'] + (float)$m['egr'] > 0) {
                $tendencia[] = [
                    'periodo'  => $mes,
                    'ingresos' => (int)$m['ing'],
                    'egresos'  => (int)$m['egr'],
                    'balance'  => (int)((float)$m['ing'] - (float)$m['egr']),
                ];
                $avgEgresos += (float)$m['egr'];
            }
        }
        $avgEgresos = count($tendencia) > 0 ? round($avgEgresos / count($tendencia)) : 0;

        // Fondo de emergencia (meses cubiertos con saldo en cuentas de ahorros)
        $fondoEmergenciaMeses = ($avgEgresos > 0 && $saldoAhorros > 0)
            ? round($saldoAhorros / $avgEgresos, 1)
            : null;

        // Metas de ahorro activas
        $stmt = $this->db->prepare("
            SELECT nombre, monto_objetivo, monto_actual,
                   ROUND(monto_actual/monto_objetivo*100,1) AS porcentaje,
                   (monto_objetivo - monto_actual) AS restante,
                   fecha_objetivo
            FROM metas
            WHERE usuario_id=? AND estado='activa'
            ORDER BY created_at ASC LIMIT 5
        ");
        $stmt->execute([USER_ID]);
        $metas = array_map(fn($m) => [
            'nombre'          => $m['nombre'],
            'monto_objetivo'  => (int)$m['monto_objetivo'],
            'monto_actual'    => (int)$m['monto_actual'],
            'porcentaje'      => (float)$m['porcentaje'],
            'restante'        => (int)$m['restante'],
            'fecha_objetivo'  => $m['fecha_objetivo'],
        ], $stmt->fetchAll());

        return [
            'periodo'                   => $periodo,
            'moneda'                    => 'COP',
            'patrimonio_neto'           => $patrimonio,
            'saldo_ahorros'             => $saldoAhorros,
            'total_cuentas'             => count($cuentas),
            'flujo_mes'                 => [
                'ingresos'        => (int)$ingresos,
                'egresos'         => (int)$egresos,
                'balance'         => (int)($ingresos - $egresos),
                'tasa_ahorro_pct' => $ingresos > 0 ? round(($ingresos - $egresos) / $ingresos * 100, 1) : 0,
            ],
            'fondo_emergencia_meses'    => $fondoEmergenciaMeses,
            'promedio_gastos_mensual'   => $avgEgresos,
            'presupuestos'              => $presupuestos,
            'top_gastos'                => $topGastos,
            'meses_anteriores'          => $tendencia,
            'metas_ahorro'              => $metas,
        ];
    }

    // ── Llamada a Claude ──────────────────────────────────────────────────────

    private function callClaude(array $context): array {
        $apiKey = defined('ANTHROPIC_API_KEY') ? ANTHROPIC_API_KEY : '';
        if (empty($apiKey)) Response::error('API key no configurada.', 503);

        // Prompt en inglés con ASCII puro — evita problemas de encoding con caracteres especiales
        $system = 'You are the built-in financial advisor for Patrimonio, a Colombian personal finance app. All amounts are in COP.

Respond with ONLY a valid JSON object. No markdown, no code blocks, no text before or after the JSON.

EXACT JSON structure required:
{
  "score": {
    "valor": <integer 0-100>,
    "etiqueta": "<one of: Critico|En riesgo|Estable|Solido|Excelente>",
    "razon": "<one sentence citing a specific number from the data>",
    "componentes": [
      {"nombre": "Tasa de ahorro",   "puntaje": <0-10>, "max": 10, "detalle": "<X% de ahorro - meta: 20%+>"},
      {"nombre": "Fondo emergencia", "puntaje": <0-10>, "max": 10, "detalle": "<X meses cubiertos - meta: 3-6>"},
      {"nombre": "Presupuestos",     "puntaje": <0-10>, "max": 10, "detalle": "<X de Y presupuestos en rango>"},
      {"nombre": "Metas de ahorro",  "puntaje": <0-10>, "max": 10, "detalle": "<X% promedio de progreso>"}
    ]
  },
  "insights": [
    {
      "tipo": "<one of: alerta|riesgo|positivo|oportunidad>",
      "titulo": "<max 8 words in Spanish>",
      "descripcion": "<specific fact + number from the data, max 2 sentences, in Spanish>",
      "accion": "<concrete action with a specific number, in Spanish, or null>",
      "impacto": "<projected quantified result, in Spanish, or null>"
    }
  ],
  "metas_proyeccion": [
    {
      "nombre": "<goal name>",
      "comentario": "<months at current pace + how much extra per month to finish 30% faster, in Spanish>"
    }
  ]
}

Score rules:
- Tasa de ahorro (weight 35%): puntaje 10 = savings rate >=25% | 7 = 15-24% | 4 = 5-14% | 1 = <5% or negative
- Fondo emergencia (weight 30%): puntaje 10 = >=6 months covered | 7 = 3-5 months | 4 = 1-2 months | 1 = <1 month or no data
- Presupuestos (weight 20%): puntaje 10 = all on track | 7 = max 1 alert | 4 = any exceeded | 1 = no budgets set
- Metas de ahorro (weight 15%): puntaje 10 = >=75% progress or no goals | 7 = 50-74% | 4 = 25-49% | 1 = <25%
- Global score = weighted average rounded to integer
- etiqueta: 0-40=Critico, 41-59=En riesgo, 60-74=Estable, 75-89=Solido, 90-100=Excelente
- If no data for a component, use puntaje=5 and detalle="Sin datos suficientes"

Insights rules:
- Generate 3 to 5 insights
- EACH insight MUST cite at least one specific number from the provided data
- FORBIDDEN: generic advice without numbers ("save more", "spend less", "diversify")
- metas_proyeccion: one entry per goal in metas_ahorro array; if metas_ahorro is empty, return empty array []';

        $userMsg = "Analyze this financial data and return only the JSON:\n\n"
                 . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        // Safe UTF-8 truncation
        if (mb_strlen($userMsg, 'UTF-8') > 6000) {
            $userMsg = mb_substr($userMsg, 0, 6000, 'UTF-8') . "\n...[data truncated for length]";
        }

        $payload = json_encode([
            'model'      => self::MODEL,
            'max_tokens' => self::MAX_TOKENS,
            'system'     => $system,
            'messages'   => [['role' => 'user', 'content' => $userMsg]],
        ]);

        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . $apiKey,
                'anthropic-version: 2023-06-01',
            ],
            CURLOPT_TIMEOUT        => 28,
            CURLOPT_CONNECTTIMEOUT => 8,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($response === false || $httpCode !== 200) {
            $err = json_decode((string)$response, true);
            $msg = $err['error']['message'] ?? 'Error al contactar el servicio de IA';
            Response::error($msg, 503);
        }

        $data = json_decode($response, true);
        $text = trim($data['content'][0]['text'] ?? '');

        return $this->parseAndSanitize($text);
    }

    /**
     * Extrae el JSON de la respuesta de Claude (maneja markdown, texto extra, etc.)
     * y rellena valores por defecto para campos faltantes en lugar de fallar.
     */
    private function parseAndSanitize(string $text): array {
        // 1. Quitar bloques de código markdown si los hay (```json ... ```)
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $text);
        $clean = preg_replace('/\s*```\s*$/i', '', $clean ?? $text);
        $clean = trim($clean ?? $text);

        // 2. Extraer el objeto JSON más externo del texto
        $parsed = null;
        if (preg_match('/\{[\s\S]*\}/u', $clean, $m)) {
            $parsed = json_decode($m[0], true);
        }

        // 3. Si sigue sin parsear, intentar el texto completo directamente
        if (!is_array($parsed)) {
            $parsed = json_decode($clean, true);
        }

        if (!is_array($parsed)) {
            error_log('[Patrimonio AI] Respuesta no parseable (' . strlen($text) . ' chars): ' . substr($text, 0, 300));
            Response::error('El análisis no pudo generarse en este momento. Intenta de nuevo en unos minutos.', 503);
            exit;
        }

        // 4. Sanitizar — rellenar defaults para campos opcionales faltantes
        if (!isset($parsed['score']) || !is_array($parsed['score'])) {
            $parsed['score'] = [];
        }
        $s = &$parsed['score'];
        $s['valor']    = max(0, min(100, (int)($s['valor'] ?? 50)));
        $s['etiqueta'] = $s['etiqueta'] ?? 'Estable';
        $s['razon']    = $s['razon']    ?? '';
        $s['componentes'] = array_slice(
            is_array($s['componentes'] ?? null) ? $s['componentes'] : [],
            0, 4
        );
        unset($s);

        $parsed['insights'] = array_slice(
            is_array($parsed['insights'] ?? null) ? $parsed['insights'] : [],
            0, 5
        );
        $parsed['metas_proyeccion'] = array_slice(
            is_array($parsed['metas_proyeccion'] ?? null) ? $parsed['metas_proyeccion'] : [],
            0, 5
        );

        return $parsed;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function periodRange(string $periodo): array {
        $inicio = $periodo . '-01';
        $fin    = date('Y-m-t', strtotime($inicio));
        return [$inicio, $fin];
    }
}
