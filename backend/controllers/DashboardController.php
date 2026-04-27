<?php
// backend/controllers/DashboardController.php

class DashboardController {
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function handle(string $method): void {
        if ($method !== 'GET') Response::error('Método no permitido', 405);
        $this->resumen();
    }

    private function resumen(): void {
        $periodo = $_GET['periodo'] ?? date('Y-m');
        $inicio = $periodo . '-01';
        $fin    = date('Y-m-t', strtotime($inicio));

        // 1. Patrimonio neto consolidado
        $stmt = $this->db->prepare("
            SELECT
                COALESCE(SUM(c.saldo_inicial), 0)
              + COALESCE((SELECT SUM(monto) FROM transacciones
                          WHERE usuario_id = ? AND tipo = 'ingreso'), 0)
              - COALESCE((SELECT SUM(monto) FROM transacciones
                          WHERE usuario_id = ? AND tipo = 'egreso'), 0) AS patrimonio
            FROM cuentas c WHERE c.usuario_id = ? AND c.activa = 1
        ");
        $stmt->execute([USER_ID, USER_ID, USER_ID]);
        $patrimonio = (float)$stmt->fetch()['patrimonio'];

        // 2. Flujo del mes: ingresos vs egresos
        $stmt = $this->db->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto END), 0) AS ingresos,
                COALESCE(SUM(CASE WHEN tipo='egreso'  THEN monto END), 0) AS egresos
            FROM transacciones
            WHERE usuario_id = ? AND fecha BETWEEN ? AND ?
        ");
        $stmt->execute([USER_ID, $inicio, $fin]);
        $flujo = $stmt->fetch();
        $ingresos = (float)$flujo['ingresos'];
        $egresos  = (float)$flujo['egresos'];

        // 3. Top categorías de egreso del mes
        $stmt = $this->db->prepare("
            SELECT
                cat.id, cat.nombre, cat.color, cat.icono,
                COALESCE(SUM(t.monto), 0) AS total
            FROM transacciones t
            INNER JOIN categorias cat ON t.categoria_id = cat.id
            WHERE t.usuario_id = ? AND t.tipo = 'egreso'
              AND t.fecha BETWEEN ? AND ?
            GROUP BY cat.id, cat.nombre, cat.color, cat.icono
            ORDER BY total DESC
            LIMIT 5
        ");
        $stmt->execute([USER_ID, $inicio, $fin]);
        $topCategorias = $stmt->fetchAll();
        foreach ($topCategorias as &$c) {
            $c['total'] = (float)$c['total'];
            $c['porcentaje'] = $egresos > 0
                ? round(($c['total'] / $egresos) * 100, 1)
                : 0;
        }

        // 4. Tendencia diaria (para mini gráfico)
        $stmt = $this->db->prepare("
            SELECT
                fecha,
                COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto END), 0) AS ingresos,
                COALESCE(SUM(CASE WHEN tipo='egreso'  THEN monto END), 0) AS egresos
            FROM transacciones
            WHERE usuario_id = ? AND fecha BETWEEN ? AND ?
            GROUP BY fecha
            ORDER BY fecha ASC
        ");
        $stmt->execute([USER_ID, $inicio, $fin]);
        $tendencia = $stmt->fetchAll();
        foreach ($tendencia as &$t) {
            $t['ingresos'] = (float)$t['ingresos'];
            $t['egresos']  = (float)$t['egresos'];
        }

        // 5. Conteo de cuentas activas
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) AS total FROM cuentas WHERE usuario_id = ? AND activa = 1"
        );
        $stmt->execute([USER_ID]);
        $totalCuentas = (int)$stmt->fetch()['total'];

        Response::json([
            'periodo'         => $periodo,
            'patrimonio_neto' => round($patrimonio, 2),
            'total_cuentas'   => $totalCuentas,
            'flujo_mes' => [
                'ingresos' => $ingresos,
                'egresos'  => $egresos,
                'balance'  => round($ingresos - $egresos, 2),
                'tasa_ahorro' => $ingresos > 0
                    ? round((($ingresos - $egresos) / $ingresos) * 100, 1)
                    : 0,
            ],
            'top_categorias' => $topCategorias,
            'tendencia_diaria' => $tendencia,
        ]);
    }
}
