<?php
// backend/controllers/PresupuestosController.php

class PresupuestosController {
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function handle(string $method, ?string $id): void {
        switch ($method) {
            case 'GET':    $this->index(); break;
            case 'POST':   $this->store(); break;
            case 'DELETE': $this->destroy($id); break;
            default: Response::error('Método no permitido', 405);
        }
    }

    /**
     * Devuelve cada presupuesto con monto gastado en el periodo y % consumido.
     */
    private function index(): void {
        $periodo = $_GET['periodo'] ?? date('Y-m');
        if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) {
            Response::error('Periodo inválido (formato YYYY-MM)', 422);
        }

        $sql = "
            SELECT
                p.id,
                p.categoria_id,
                cat.nombre   AS categoria_nombre,
                cat.color    AS categoria_color,
                cat.icono    AS categoria_icono,
                p.monto_limite,
                p.periodo,
                COALESCE((
                    SELECT SUM(t.monto) FROM transacciones t
                    WHERE t.categoria_id = p.categoria_id
                      AND t.usuario_id = p.usuario_id
                      AND t.tipo = 'egreso'
                      AND DATE_FORMAT(t.fecha, '%Y-%m') = p.periodo
                ), 0) AS gastado
            FROM presupuestos p
            INNER JOIN categorias cat ON p.categoria_id = cat.id
            WHERE p.usuario_id = ? AND p.periodo = ?
            ORDER BY cat.nombre ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([USER_ID, $periodo]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['monto_limite'] = (float)$r['monto_limite'];
            $r['gastado']      = (float)$r['gastado'];
            $r['restante']     = round($r['monto_limite'] - $r['gastado'], 2);
            $r['porcentaje']   = $r['monto_limite'] > 0
                ? round(($r['gastado'] / $r['monto_limite']) * 100, 2)
                : 0;
            $r['estado']       = $r['porcentaje'] >= 100 ? 'excedido'
                              : ($r['porcentaje'] >= 80 ? 'alerta' : 'normal');
        }

        Response::json([
            'periodo' => $periodo,
            'presupuestos' => $rows,
        ]);
    }

    private function store(): void {
        $body = Response::getBody();
        Response::require($body, ['categoria_id','monto_limite','periodo']);

        if ((float)$body['monto_limite'] <= 0) {
            Response::error('El monto límite debe ser mayor a cero', 422);
        }
        if (!preg_match('/^\d{4}-\d{2}$/', $body['periodo'])) {
            Response::error('Periodo inválido (formato YYYY-MM)', 422);
        }

        // Upsert: si ya existe se actualiza
        $sql = "INSERT INTO presupuestos (usuario_id, categoria_id, monto_limite, periodo)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE monto_limite = VALUES(monto_limite)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([USER_ID, $body['categoria_id'], $body['monto_limite'], $body['periodo']]);
        Response::json(['mensaje' => 'Presupuesto guardado'], 201);
    }

    private function destroy(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        $stmt = $this->db->prepare("DELETE FROM presupuestos WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, USER_ID]);
        Response::json(['mensaje' => 'Presupuesto eliminado']);
    }
}
