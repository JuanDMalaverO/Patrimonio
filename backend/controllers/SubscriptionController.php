<?php
// backend/controllers/SubscriptionController.php

class SubscriptionController {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function handle(string $method, ?string $action): void {
        match ([$method, $action]) {
            ['POST', 'upgrade']   => $this->upgrade(),
            ['POST', 'downgrade'] => $this->downgrade(),
            default               => Response::error('Ruta de suscripción no encontrada', 404),
        };
    }

    private function upgrade(): void {
        $this->setPlan('premium');
        Response::json(['plan' => 'premium', 'mensaje' => 'Plan Premium activado']);
    }

    private function downgrade(): void {
        $this->setPlan('free');
        Response::json(['plan' => 'free', 'mensaje' => 'Plan cambiado a Free']);
    }

    private function setPlan(string $plan): void {
        // Actualizar en DB
        $this->db->prepare("UPDATE usuarios SET plan = ? WHERE id = ?")
                 ->execute([$plan, USER_ID]);

        // Sincronizar el payload de la sesión activa para que getUserPlan() lo refleje
        $token = $_COOKIE['patrimonio_session'] ?? null;
        if (!$token) return;

        $stmt = $this->db->prepare("SELECT payload FROM sesiones WHERE id = ?");
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        if (!$row) return;

        $payload = json_decode($row['payload'], true);
        $payload['user']['plan'] = $plan;
        $this->db->prepare("UPDATE sesiones SET payload = ? WHERE id = ?")
                 ->execute([json_encode($payload), $token]);
    }
}
