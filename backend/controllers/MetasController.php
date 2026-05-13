<?php
// backend/controllers/MetasController.php

class MetasController {
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
        $stmt = $this->db->prepare("
            SELECT id, nombre, icono, color,
                   monto_objetivo, monto_actual, fecha_objetivo, estado, created_at
            FROM metas
            WHERE usuario_id = ?
            ORDER BY estado ASC, created_at DESC
        ");
        $stmt->execute([USER_ID]);
        $rows = $stmt->fetchAll();

        $now = new DateTime();

        foreach ($rows as &$r) {
            $r['monto_objetivo'] = (float)$r['monto_objetivo'];
            $r['monto_actual']   = (float)$r['monto_actual'];

            $r['porcentaje'] = $r['monto_objetivo'] > 0
                ? round(($r['monto_actual'] / $r['monto_objetivo']) * 100, 2)
                : 0;
            $r['restante'] = round($r['monto_objetivo'] - $r['monto_actual'], 2);

            if ($r['fecha_objetivo']) {
                $fechaObj = new DateTime($r['fecha_objetivo']);
                $diff = $now->diff($fechaObj);
                $mesesRestantes = ($diff->invert ? 0 : ($diff->y * 12 + $diff->m + ($diff->d > 0 ? 1 : 0)));
                $mesesRestantes = max(1, $mesesRestantes);
                $r['meses_restantes'] = $mesesRestantes;
                $r['aporte_mensual_necesario'] = $r['restante'] > 0
                    ? (int)round($r['restante'] / $mesesRestantes)
                    : 0;
            }
        }

        Response::json($rows);
    }

    private function store(): void {
        $body = Response::getBody();
        Response::require($body, ['nombre', 'monto_objetivo']);

        if ((float)$body['monto_objetivo'] <= 0) {
            Response::error('El monto objetivo debe ser mayor a cero', 422);
        }

        $nombre         = trim($body['nombre']);
        $monto_objetivo = (float)$body['monto_objetivo'];
        $icono          = $body['icono']          ?? 'star';
        $color          = $body['color']          ?? '#15803d';
        $fecha_objetivo = $body['fecha_objetivo'] ?? null;

        if ($fecha_objetivo === '') $fecha_objetivo = null;

        $stmt = $this->db->prepare("
            INSERT INTO metas (usuario_id, nombre, icono, color, monto_objetivo, fecha_objetivo)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([USER_ID, $nombre, $icono, $color, $monto_objetivo, $fecha_objetivo]);

        Response::json(['mensaje' => 'Meta creada', 'id' => (int)$this->db->lastInsertId()], 201);
    }

    private function update(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);

        $body = Response::getBody();

        if (array_key_exists('aportar', $body)) {
            $aporte = (float)$body['aportar'];
            if ($aporte <= 0) Response::error('El aporte debe ser mayor a cero', 422);

            $stmt = $this->db->prepare("
                SELECT monto_objetivo, monto_actual FROM metas
                WHERE id = ? AND usuario_id = ?
            ");
            $stmt->execute([$id, USER_ID]);
            $meta = $stmt->fetch();
            if (!$meta) Response::error('Meta no encontrada', 404);

            $nuevoMonto = min(
                (float)$meta['monto_actual'] + $aporte,
                (float)$meta['monto_objetivo']
            );
            $completada = $nuevoMonto >= (float)$meta['monto_objetivo'];
            $estado = $completada ? 'completada' : 'activa';

            $stmt2 = $this->db->prepare("
                UPDATE metas SET monto_actual = ?, estado = ?
                WHERE id = ? AND usuario_id = ?
            ");
            $stmt2->execute([$nuevoMonto, $estado, $id, USER_ID]);

            Response::json([
                'completada'   => $completada,
                'monto_actual' => $nuevoMonto,
            ]);
            return;
        }

        $nombre         = isset($body['nombre'])         ? trim($body['nombre'])          : null;
        $icono          = $body['icono']          ?? null;
        $color          = $body['color']          ?? null;
        $monto_objetivo = isset($body['monto_objetivo'])  ? (float)$body['monto_objetivo'] : null;
        $fecha_objetivo = array_key_exists('fecha_objetivo', $body) ? ($body['fecha_objetivo'] ?: null) : false;

        $fields = [];
        $params = [];

        if ($nombre !== null)         { $fields[] = 'nombre = ?';         $params[] = $nombre; }
        if ($icono !== null)          { $fields[] = 'icono = ?';          $params[] = $icono; }
        if ($color !== null)          { $fields[] = 'color = ?';          $params[] = $color; }
        if ($monto_objetivo !== null) { $fields[] = 'monto_objetivo = ?'; $params[] = $monto_objetivo; }
        if ($fecha_objetivo !== false){ $fields[] = 'fecha_objetivo = ?'; $params[] = $fecha_objetivo; }

        if (empty($fields)) Response::error('Sin cambios', 422);

        $params[] = $id;
        $params[] = USER_ID;

        $stmt = $this->db->prepare("UPDATE metas SET " . implode(', ', $fields) . " WHERE id = ? AND usuario_id = ?");
        $stmt->execute($params);

        Response::json(['mensaje' => 'Meta actualizada']);
    }

    private function destroy(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        $stmt = $this->db->prepare("DELETE FROM metas WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, USER_ID]);
        Response::json(['mensaje' => 'Meta eliminada']);
    }
}
