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

        $system = <<<'PROMPT'
Eres el asesor financiero integrado de Patrimonio, app colombiana de finanzas personales. Montos en COP.

GENERA UN ANÁLISIS COMPLETO en 3 partes:

━━ PARTE 1: SCORE DE SALUD FINANCIERA (0-100)
Calcula un score global y desglósalo en 4 componentes (cada uno 0-10):
• Tasa de ahorro: 10 = ≥25% del ingreso | 7 = 15-24% | 4 = 5-14% | 1 = <5% o negativo
• Fondo de emergencia: 10 = ≥6 meses | 7 = 3-5 meses | 4 = 1-2 meses | 1 = <1 mes o sin datos
• Control de presupuestos: 10 = todos en rango | 7 = máx 1 alerta | 4 = algún excedido | 1 = sin presupuestos
• Progreso de metas: 10 = ≥75% o sin metas | 7 = 50-74% | 4 = 25-49% | 1 = <25%
Score global = promedio ponderado (ahorro 35%, fondo 30%, presupuestos 20%, metas 15%).
Si no hay datos para un componente, asigna 5 y nota "Sin datos suficientes".

━━ PARTE 2: INSIGHTS ACCIONABLES (3-5)
Cada insight DEBE:
- Citar un número concreto de los datos proporcionados
- Ser específico a Colombia (usa "salario mínimo", "DTF", "CDT" cuando aplique)
PROHIBIDO: consejos sin cifra ("ahorra más", "controla tus gastos")

━━ PARTE 3: PROYECCIÓN DE METAS
Solo si hay metas_ahorro activas. Para cada meta: en cuántos meses llega con el ritmo actual VS cuánto aportaría para llegar 30% más rápido.
Si no hay metas, devuelve array vacío.

FORMATO ESTRICTO — solo JSON válido, sin texto ni markdown:
{
  "score": {
    "valor": <0-100>,
    "etiqueta": "Crítico|En riesgo|Estable|Sólido|Excelente",
    "razon": "Una oración con el número clave que lo justifica.",
    "componentes": [
      {"nombre": "Tasa de ahorro", "puntaje": <0-10>, "max": 10, "detalle": "X% — meta: ≥20%"},
      {"nombre": "Fondo emergencia", "puntaje": <0-10>, "max": 10, "detalle": "X meses cubiertos — meta: 3-6"},
      {"nombre": "Presupuestos", "puntaje": <0-10>, "max": 10, "detalle": "X de Y dentro del límite"},
      {"nombre": "Metas de ahorro", "puntaje": <0-10>, "max": 10, "detalle": "X% de progreso promedio"}
    ]
  },
  "insights": [
    {
      "tipo": "alerta|riesgo|positivo|oportunidad",
      "titulo": "Máx 7 palabras, directo",
      "descripcion": "Hecho concreto con número. Máx 2 oraciones.",
      "accion": "Qué hacer exactamente con número. null si no aplica.",
      "impacto": "Resultado proyectado cuantificado. null si no aplica."
    }
  ],
  "metas_proyeccion": [
    {
      "nombre": "Nombre de la meta",
      "comentario": "Con tu ritmo actual llegarías en X meses. Aportando $Y.000 más/mes lo logras en Z meses."
    }
  ]
}
PROMPT;

        $userMsg = "Analiza estos datos financieros:\n\n"
                 . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        // Limitar tamaño del mensaje para no exceder contexto
        if (strlen($userMsg) > 8000) {
            $userMsg = substr($userMsg, 0, 8000) . "\n...[datos truncados]";
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
            CURLOPT_TIMEOUT        => 25,
            CURLOPT_CONNECTTIMEOUT => 8,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        // curl_close deprecated since PHP 8.5 — handle freed automatically

        if ($response === false || $httpCode !== 200) {
            $err = json_decode((string)$response, true);
            $msg = $err['error']['message'] ?? 'Error al contactar el servicio de IA';
            Response::error($msg, 503);
        }

        $data = json_decode($response, true);
        $text = trim($data['content'][0]['text'] ?? '');

        if (preg_match('/\{[\s\S]*\}/u', $text, $m)) {
            $parsed = json_decode($m[0], true);
            if ($parsed
                && isset($parsed['score']['valor'], $parsed['score']['componentes'])
                && isset($parsed['insights'])
                && is_array($parsed['insights'])
            ) {
                // Sanitize: max 5 insights, max 4 componentes
                $parsed['insights']          = array_slice($parsed['insights'], 0, 5);
                $parsed['score']['componentes'] = array_slice($parsed['score']['componentes'] ?? [], 0, 4);
                $parsed['metas_proyeccion']  = array_slice($parsed['metas_proyeccion'] ?? [], 0, 5);
                return $parsed;
            }
        }

        Response::error('La IA devolvió una respuesta inesperada. Intenta de nuevo.', 503);
        exit; // satisface el analizador — Response::error ya llama exit internamente
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function periodRange(string $periodo): array {
        $inicio = $periodo . '-01';
        $fin    = date('Y-m-t', strtotime($inicio));
        return [$inicio, $fin];
    }
}
