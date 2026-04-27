<?php
// backend/utils/response.php

class Response {
    public static function json($data, int $status = 200): void {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function error(string $msg, int $status = 400): void {
        self::json(['error' => $msg], $status);
    }

    public static function getBody(): array {
        $raw = file_get_contents('php://input');
        if (!$raw) return [];
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    public static function require(array $body, array $fields): void {
        foreach ($fields as $f) {
            if (!isset($body[$f]) || $body[$f] === '' || $body[$f] === null) {
                self::error("Falta el campo requerido: {$f}", 422);
            }
        }
    }
}
