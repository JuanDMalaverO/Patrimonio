<?php
// backend/controllers/SubscriptionController.php
// El plan se gestiona manualmente — no hay self-service para evitar abuso.

class SubscriptionController {
    private PDO $db;
    public function __construct(PDO $db) { $this->db = $db; }

    public function handle(string $method, ?string $action): void {
        Response::error('Los cambios de plan se gestionan directamente con el equipo de Patrimonio.', 403);
    }
}
