<?php
// backend/controllers/CuentasController.php

class CuentasController {
    private $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function handle(string $method, ?string $id): void {
        switch ($method) {
            case 'GET':    $this->index(); break;
            case 'POST':   $this->store(); break;
            case 'PUT':    $this->update($id); break;
            case 'DELETE': $this->destroy($id); break;
            default: Response::error('Método no permitido', 405);
        }
    }

    private function index(): void {
        $sql = "
            SELECT
                c.id, c.nombre, c.tipo, c.saldo_inicial, c.moneda,
                c.color, c.icono, c.activa, c.tea_anual,
                DATE(c.created_at) AS fecha_creacion,
                COALESCE(c.saldo_inicial, 0)
                + COALESCE((SELECT SUM(monto) FROM transacciones t
                            WHERE t.cuenta_id = c.id AND t.tipo = 'ingreso'), 0)
                - COALESCE((SELECT SUM(monto) FROM transacciones t
                            WHERE t.cuenta_id = c.id AND t.tipo = 'egreso'), 0)
                + COALESCE((SELECT SUM(monto) FROM transacciones t
                            WHERE t.cuenta_destino_id = c.id AND t.tipo = 'transferencia'), 0)
                - COALESCE((SELECT SUM(monto) FROM transacciones t
                            WHERE t.cuenta_id = c.id AND t.tipo = 'transferencia'), 0)
                AS saldo_actual
            FROM cuentas c
            WHERE c.usuario_id = ? AND c.activa = 1
            ORDER BY c.id ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([USER_ID]);
        $cuentas = $stmt->fetchAll();

        foreach ($cuentas as &$c) {
            $c['saldo_inicial'] = (float)$c['saldo_inicial'];
            $c['saldo_actual']  = (float)$c['saldo_actual'];
            $c['tea_anual']     = $c['tea_anual'] !== null ? (float)$c['tea_anual'] : null;
        }

        $patrimonio = array_sum(array_column($cuentas, 'saldo_actual'));

        Response::json([
            'cuentas'         => $cuentas,
            'patrimonio_neto' => round($patrimonio, 2),
            'total_cuentas'   => count($cuentas),
        ]);
    }

    private function store(): void {
        $body = Response::getBody();
        Response::require($body, ['nombre', 'tipo']);

        $tiposValidos = ['ahorros','efectivo','tarjeta','inversion','otro'];
        if (!in_array($body['tipo'], $tiposValidos)) {
            Response::error('Tipo de cuenta inválido', 422);
        }

        // tea_anual: validar que sea un número positivo si se proporciona
        $tea = isset($body['tea_anual']) && $body['tea_anual'] !== '' && $body['tea_anual'] !== null
            ? (float)$body['tea_anual']
            : null;

        if ($tea !== null && ($tea <= 0 || $tea > 999)) {
            Response::error('La tasa efectiva anual debe estar entre 0.01% y 999%', 422);
        }

        $sql = "INSERT INTO cuentas (usuario_id, nombre, tipo, saldo_inicial, moneda, color, icono, tea_anual)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            USER_ID,
            $body['nombre'],
            $body['tipo'],
            $body['saldo_inicial'] ?? 0,
            $body['moneda'] ?? 'COP',
            $body['color'] ?? '#1a1a1a',
            $body['icono'] ?? 'wallet',
            $tea,
        ]);
        Response::json(['id' => $this->db->lastInsertId(), 'mensaje' => 'Cuenta creada'], 201);
    }

    private function update(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        $body = Response::getBody();

        $tea = isset($body['tea_anual']) && $body['tea_anual'] !== '' && $body['tea_anual'] !== null
            ? (float)$body['tea_anual']
            : null;

        $sql = "UPDATE cuentas SET nombre = ?, tipo = ?, color = ?, icono = ?, tea_anual = ?
                WHERE id = ? AND usuario_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $body['nombre'] ?? '',
            $body['tipo'] ?? 'otro',
            $body['color'] ?? '#1a1a1a',
            $body['icono'] ?? 'wallet',
            $tea,
            $id, USER_ID,
        ]);
        Response::json(['mensaje' => 'Cuenta actualizada']);
    }

    private function destroy(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        $stmt = $this->db->prepare("UPDATE cuentas SET activa = 0 WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, USER_ID]);
        Response::json(['mensaje' => 'Cuenta archivada']);
    }
}
