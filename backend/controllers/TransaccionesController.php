<?php
// backend/controllers/TransaccionesController.php

class TransaccionesController {
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

    private function index(): void {
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;
        $tipo  = $_GET['tipo']  ?? null;
        $cuenta = $_GET['cuenta_id'] ?? null;

        $where = ['t.usuario_id = ?'];
        $params = [USER_ID];

        if ($desde) { $where[] = 't.fecha >= ?'; $params[] = $desde; }
        if ($hasta) { $where[] = 't.fecha <= ?'; $params[] = $hasta; }
        if ($tipo)  { $where[] = 't.tipo  = ?';  $params[] = $tipo; }
        if ($cuenta){ $where[] = '(t.cuenta_id = ? OR t.cuenta_destino_id = ?)';
                      $params[] = $cuenta; $params[] = $cuenta; }

        $sql = "
            SELECT
                t.id, t.tipo, t.monto, t.fecha, t.descripcion,
                t.cuenta_id, c1.nombre AS cuenta_nombre, c1.color AS cuenta_color,
                t.cuenta_destino_id, c2.nombre AS cuenta_destino_nombre,
                t.categoria_id, cat.nombre AS categoria_nombre, cat.color AS categoria_color, cat.icono AS categoria_icono
            FROM transacciones t
            LEFT JOIN cuentas c1   ON t.cuenta_id = c1.id
            LEFT JOIN cuentas c2   ON t.cuenta_destino_id = c2.id
            LEFT JOIN categorias cat ON t.categoria_id = cat.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY t.fecha DESC, t.id DESC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) { $r['monto'] = (float)$r['monto']; }
        Response::json($rows);
    }

    private function store(): void {
        $body = Response::getBody();
        Response::require($body, ['tipo','monto','fecha','cuenta_id']);

        if (!in_array($body['tipo'], ['ingreso','egreso','transferencia'])) {
            Response::error('Tipo inválido', 422);
        }
        if ((float)$body['monto'] <= 0) {
            Response::error('El monto debe ser mayor a cero', 422);
        }

        if ($body['tipo'] === 'transferencia') {
            if (empty($body['cuenta_destino_id'])) {
                Response::error('La transferencia requiere cuenta destino', 422);
            }
            if ($body['cuenta_destino_id'] == $body['cuenta_id']) {
                Response::error('La cuenta origen y destino deben ser diferentes', 422);
            }
            $body['categoria_id'] = null;
        } else {
            // ingreso/egreso requieren categoría coherente con el tipo
            if (empty($body['categoria_id'])) {
                Response::error('La categoría es requerida', 422);
            }
            $stmt = $this->db->prepare(
                "SELECT tipo FROM categorias WHERE id = ? AND usuario_id = ?"
            );
            $stmt->execute([$body['categoria_id'], USER_ID]);
            $cat = $stmt->fetch();
            if (!$cat) Response::error('Categoría no encontrada', 422);
            if ($cat['tipo'] !== $body['tipo']) {
                Response::error('La categoría no coincide con el tipo de transacción', 422);
            }
            $body['cuenta_destino_id'] = null;
        }

        $sql = "INSERT INTO transacciones
                (usuario_id, tipo, monto, fecha, descripcion, cuenta_id, cuenta_destino_id, categoria_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            USER_ID,
            $body['tipo'],
            $body['monto'],
            $body['fecha'],
            $body['descripcion'] ?? null,
            $body['cuenta_id'],
            $body['cuenta_destino_id'],
            $body['categoria_id'],
        ]);
        Response::json(['id' => $this->db->lastInsertId(), 'mensaje' => 'Transacción registrada'], 201);
    }

    private function destroy(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        $stmt = $this->db->prepare("DELETE FROM transacciones WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, USER_ID]);
        Response::json(['mensaje' => 'Transacción eliminada']);
    }
}
