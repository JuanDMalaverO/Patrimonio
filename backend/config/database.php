<?php
// backend/config/database.php

class Database {
    private $host = 'localhost:3307';
    private $db   = 'finanzas_personales';
    private $user = 'root';
    private $pass = '';
    private $charset = 'utf8mb4';
    private $pdo;

    public function connect() {
        if ($this->pdo) return $this->pdo;
        $dsn = "mysql:host={$this->host};dbname={$this->db};charset={$this->charset}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $this->pdo = new PDO($dsn, $this->user, $this->pass, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'DB connection failed', 'detail' => $e->getMessage()]);
            exit;
        }
        return $this->pdo;
    }
}
