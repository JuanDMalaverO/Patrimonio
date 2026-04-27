<?php
// backend/controllers/CategoriasController.php

class CategoriasController {
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
        $stmt = $this->db->prepare(
            "SELECT id, nombre, tipo, color, icono FROM categorias
             WHERE usuario_id = ? ORDER BY tipo ASC, nombre ASC"
        );
        $stmt->execute([USER_ID]);
        Response::json($stmt->fetchAll());
    }

    private function store(): void {
        $body = Response::getBody();
        Response::require($body, ['nombre', 'tipo']);
        if (!in_array($body['tipo'], ['ingreso','egreso'])) {
            Response::error('Tipo inválido', 422);
        }
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO categorias (usuario_id, nombre, tipo, color, icono) VALUES (?,?,?,?,?)"
            );
            $stmt->execute([
                USER_ID,
                $body['nombre'],
                $body['tipo'],
                $body['color'] ?? '#666666',
                $body['icono'] ?? 'tag',
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('Ya existe una categoría con ese nombre y tipo', 409);
            }
            throw $e;
        }
        Response::json(['id' => $this->db->lastInsertId(), 'mensaje' => 'Categoría creada'], 201);
    }

    private function destroy(?string $id): void {
        if (!$id) Response::error('ID requerido', 400);
        $stmt = $this->db->prepare("DELETE FROM categorias WHERE id = ? AND usuario_id = ?");
        $stmt->execute([$id, USER_ID]);
        Response::json(['mensaje' => 'Categoría eliminada']);
    }
}
