<?php
// backend/controllers/AiController.php

class AiController {
    private PDO $db;

    private const MODEL       = 'claude-haiku-4-5-20251001';
    private const MAX_TOKENS  = 1200;
    private const CACHE_HOURS = 12;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // ── Router ────────────────────────────────────────────────────────────────

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
        $periodo = $_GET['periodo'] ?? date('Y-m');
        $cached  = $this->getCached($periodo);
        if ($cached) {
            Response::json($cached);
            return;
        }
        $context = $this->buildContext($periodo);
        $result  = $this->callClaude($context);
        Response::json($this->saveAndReturn($result, $periodo));
    }

    private function refreshInsights(): void {
        $periodo = $_GET['periodo'] ?? date('Y-m');
        // Invalidar caché del período
        $this->db->prepare("DELETE FROM ai_insights WHERE usuario_id = ? AND periodo = ?")
                 ->execute([USER_ID, $periodo]);
        $context = $this->buildContext($periodo);
        $result  = $this->callClaude($context);
        Response::json($this->saveAndReturn($result, $periodo));
    }

    // ── Caché ─────────────────────────────────────────────────────────────────

    private function getCached(string $periodo): ?array {
        $stmt = $this->db->prepare("
            SELECT contenido, generado_at
            FROM ai_insights
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
        $this->db->prepare("INSERT INTO ai_insights (usuario_id, periodo, contenido) VALUES (?, ?, ?)")
                 ->execute([USER_ID, $periodo, json_encode($data)]);
        $data['_meta'] = ['cached' => false, 'generado_at' => date('Y-m-d H:i:s'), 'periodo' => $periodo];
        return $data;
    }

    // ── Constructor de contexto financiero ────────────────────────────────────

    private function buildContext(string $periodo): array {
        [$inicio, $fin] = $this->periodRange($periodo);

        // Cuentas y patrimonio
        $stmt = $this->db->prepare("
            SELECT c.tipo, c.tea_anual,
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

        $patrimonio = round(array_sum(array_column($cuentas, 'saldo')));

        // Flujo del período
        $stmt = $this->db->prepare("
            SELECT
                SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos,
                SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END) AS egresos
            FROM transacciones WHERE usuario_id=? AND fecha BETWEEN ? AND ?
        ");
        $stmt->execute([USER_ID, $inicio, $fin]);
        $flujo    = $stmt->fetch();
        $ingresos = (float)($flujo['ingresos'] ?? 0);
        $egresos  = (float)($flujo['egresos']  ?? 0);
        $balance  = $ingresos - $egresos;

        // Presupuestos del período
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

        // Top 5 categorías de gasto
        $stmt = $this->db->prepare("
            SELECT cat.nombre, SUM(t.monto) AS total
            FROM transacciones t JOIN categorias cat ON cat.id=t.categoria_id
            WHERE t.usuario_id=? AND t.tipo='egreso' AND t.fecha BETWEEN ? AND ?
            GROUP BY cat.id, cat.nombre ORDER BY total DESC LIMIT 5
        ");
        $stmt->execute([USER_ID, $inicio, $fin]);
        $topGastos = array_map(fn($r) => [
            'categoria' => $r['nombre'],
            'total'     => (int)$r['total'],
        ], $stmt->fetchAll());

        // Tendencia: 3 meses anteriores para detectar patrones
        $tendencia = [];
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
            }
        }

        return [
            'periodo'          => $periodo,
            'moneda'           => 'COP',
            'patrimonio_neto'  => $patrimonio,
            'total_cuentas'    => count($cuentas),
            'cuentas_con_tea'  => count(array_filter($cuentas, fn($c) => $c['tea_anual'] > 0)),
            'flujo_mes'        => [
                'ingresos'        => (int)$ingresos,
                'egresos'         => (int)$egresos,
                'balance'         => (int)$balance,
                'tasa_ahorro_pct' => $ingresos > 0 ? round($balance / $ingresos * 100, 1) : 0,
            ],
            'presupuestos'     => $presupuestos,
            'top_gastos'       => $topGastos,
            'meses_anteriores' => $tendencia,
        ];
    }

    // ── Llamada a Claude API ──────────────────────────────────────────────────

    private function callClaude(array $context): array {
        $apiKey = defined('ANTHROPIC_API_KEY') ? ANTHROPIC_API_KEY : '';
        if (empty($apiKey)) {
            Response::error('API key no configurada. Agrega tu key en backend/config/ai.php', 503);
        }

        $systemPrompt = 'Eres un asesor financiero personal integrado en Patrimonio, app colombiana de finanzas personales. Los montos están en pesos colombianos (COP).

TU ÚNICO OBJETIVO: ayudar al usuario a tomar mejores decisiones con su dinero. NO describes datos, los analizas para dar acción concreta.

REGLAS — SIN EXCEPCIONES:
1. Solo analiza los datos proporcionados. Si algo no está, no lo uses.
2. Máximo 4 insights. Elige los de mayor impacto financiero real.
3. CADA insight debe citar al menos un número concreto de los datos. Sin número = no es un insight.
4. PROHIBIDO consejo genérico sin cifra: "ahorra más", "gasta menos", "diversifica". Solo si los datos lo justifican con números específicos.
5. Si algo está bien (buena tasa de ahorro, TEA aprovechada, presupuesto bajo control), dilo. No todo debe ser negativo.
6. Sé directo. Máximo 2 oraciones en "descripcion".
7. Responde ÚNICAMENTE con JSON válido, sin texto antes ni después, sin bloques markdown.

TIPOS DE INSIGHT:
- "alerta": problema activo que necesita acción inmediata
- "riesgo": tendencia preocupante que puede empeorar
- "positivo": algo funcionando bien que vale reforzar
- "oportunidad": acción concreta que mejoraría la situación

FORMATO ESTRICTO:
{
  "insights": [
    {
      "tipo": "alerta|riesgo|positivo|oportunidad",
      "titulo": "Máx 7 palabras, directo y específico",
      "descripcion": "Hecho + número de los datos. Máx 2 oraciones.",
      "accion": "Qué hacer exactamente con número si aplica. null si no hay acción clara.",
      "impacto": "Resultado proyectado cuantificado si aplica. null si no."
    }
  ],
  "score": {
    "valor": <0-100>,
    "etiqueta": "Crítico|En riesgo|Estable|Sólido|Excelente",
    "razon": "Una oración con el número clave que justifica el score."
  }
}';

        $userMessage = "Analiza estos datos financieros y genera insights accionables:\n\n"
                     . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $payload = json_encode([
            'model'      => self::MODEL,
            'max_tokens' => self::MAX_TOKENS,
            'system'     => $systemPrompt,
            'messages'   => [['role' => 'user', 'content' => $userMessage]],
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
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode !== 200) {
            $err = json_decode($response, true);
            $msg = $err['error']['message'] ?? 'Error al contactar el servicio de IA';
            Response::error($msg, 503);
        }

        $data = json_decode($response, true);
        $text = trim($data['content'][0]['text'] ?? '');

        // Extraer el JSON de la respuesta (el modelo puede incluir texto extra)
        if (preg_match('/\{[\s\S]*\}/u', $text, $m)) {
            $parsed = json_decode($m[0], true);
            if ($parsed && isset($parsed['insights'], $parsed['score'])) {
                return $parsed;
            }
        }

        Response::error('La IA devolvió una respuesta con formato inesperado. Intenta de nuevo.', 503);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function requirePremium(): void {
        if (!defined('USER_PLAN') || USER_PLAN !== 'premium') {
            Response::error('Esta función requiere una suscripción Premium.', 403);
        }
    }

    private function periodRange(string $periodo): array {
        $inicio = $periodo . '-01';
        $fin    = date('Y-m-t', strtotime($inicio));
        return [$inicio, $fin];
    }
}
