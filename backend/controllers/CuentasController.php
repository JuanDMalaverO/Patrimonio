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

    /**
     * Saldo dinámico = saldo_inicial
     *  + ingresos a la cuenta
     *  - egresos desde la cuenta
     *  + transferencias recibidas
     *  - transferencias enviadas
     */
    private function index(): void {
        $sql = "
            SELECT
                c.id, c.nombre, c.tipo, c.saldo_inicial, c.moneda, c.color, c.icono, c.activa,
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

        // Cast numérico
        foreach ($cuentas as &$c) {
            $c['saldo_inicial'] = (float)$c['saldo_inicial'];
            $c['saldo_actual']  = (float)$c['saldo_actual'];
        }

        $patrimonio = array_sum(array_column($cuentas, 'saldo_actual'));

        Response::json([
            'cuentas' => $cuentas,
            'patrimonio_neto' => round($patrimonio, 2),
            'total_cuentas' => count($cuentas),
        ]);
    }

    private function store(): void {
        $body = Response::getBody();
        Response::require($body, ['nombre', 'tipo']);

        $tiposValidos = ['ahorros','efectivo','tarjeta','inversion','otro'];
        if (!in_array($body['tipo'], $tiposValidos)) {
            Response::error('Tipo de cuenta inválido', 422);
        }

        $sql = "INSERT INTO cuentas (usuario_id, nombre, tipo, saldo_inicial, moneda, color, icono)
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            USER_ID,
            $body['nombre'],
            $body['tipo'],
            $body['saldo_inicial'] ?? 0,
            $body['moneda'] ?? 'COP',
            $body['color'] ?? '#1a1a1a',
            $body['icono'] ?? 'wallet',
        ]);
        Response::json(['id' => $this->db->lastInsertId(), 'mensaje' => 'Cuenta creada'], 201);
    }

    private function update(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        $body = Response::getBody();
        $sql = "UPDATE cuentas SET nombre = ?, tipo = ?, color = ?, icono = ?
                WHERE id = ? AND usuario_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $body['nombre'] ?? '',
            $body['tipo'] ?? 'otro',
            $body['color'] ?? '#1a1a1a',
            $body['icono'] ?? 'wallet',
            $id, USER_ID,
        ]);
        Response::json(['mensaje' => 'Cuenta actualizada']);
    }

    private function destroy(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        // Soft delete para preservar histórico de transacciones
        $stmt = $this->db->prepare("UPDATE cuentas SET activa = 0 WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, USER_ID]);
        Response::json(['mensaje' => 'Cuenta archivada']);
    }
}
