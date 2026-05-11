<?php
// backend/services/MailService.php

class MailService {

    // ── Envío genérico ────────────────────────────────────────────────────────

    public static function send(string $to, string $subject, string $html): bool {
        $from = defined('MAIL_FROM')      ? MAIL_FROM      : 'noreply@localhost';
        $name = defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'Patrimonio';

        $headers = implode("\r\n", [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            "From: =?utf-8?b?" . base64_encode($name) . "?= <{$from}>",
            "Reply-To: {$from}",
            'X-Mailer: Patrimonio/3.0',
            'X-Priority: 1 (High)',
        ]);

        // base64 del body para soporte correcto de tildes y caracteres especiales
        $body = chunk_split(base64_encode($html));

        return mail($to, '=?utf-8?b?' . base64_encode($subject) . '?=', $body, $headers);
    }

    // ── Email de verificación ─────────────────────────────────────────────────

    public static function enviarCodigo(string $email, string $codigo): bool {
        return self::send(
            $email,
            'Tu código de verificación · Patrimonio',
            self::templateCodigo($codigo, $email)
        );
    }

    // ── Template HTML ─────────────────────────────────────────────────────────

    private static function templateCodigo(string $codigo, string $email): string {
        $year = date('Y');
        // Los dígitos del código separados visualmente
        $digitosHtml = implode('', array_map(
            fn($d) => "<span style=\"display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#f5f3ee;border:1.5px solid rgba(10,10,10,0.12);border-radius:4px;font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#0a0a0a;margin:0 3px;\">{$d}</span>",
            str_split($codigo)
        ));

        return <<<HTML
        <!DOCTYPE html>
        <html lang="es" xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Código de verificación · Patrimonio</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f3ee;padding:48px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

                  <!-- Header con marca -->
                  <tr>
                    <td style="background:#0a0a0a;padding:28px 40px;border-radius:4px 4px 0 0;">
                      <p style="margin:0;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(245,243,238,0.5);font-weight:600;">Patrimonio</p>
                      <p style="margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:#f5f3ee;letter-spacing:-0.03em;">Verificación de email</p>
                    </td>
                  </tr>

                  <!-- Cuerpo -->
                  <tr>
                    <td style="background:#ffffff;padding:40px;border-left:1px solid rgba(10,10,10,0.08);border-right:1px solid rgba(10,10,10,0.08);">
                      <p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.6;">
                        Hola, este código te permite completar tu registro en Patrimonio.
                      </p>
                      <p style="margin:0 0 32px;font-size:13px;color:#888;">
                        Expira en <strong style="color:#0a0a0a;">15 minutos</strong>.
                      </p>

                      <!-- Código OTP -->
                      <div style="text-align:center;padding:8px 0 32px;">
                        {$digitosHtml}
                      </div>

                      <div style="background:#f5f3ee;border-radius:3px;padding:16px 20px;">
                        <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                          Si no solicitaste este código, alguien pudo haber escrito
                          <strong style="color:#777;">{$email}</strong> por error.
                          Puedes ignorar este mensaje con seguridad.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#ebe7df;padding:20px 40px;border-radius:0 0 4px 4px;border:1px solid rgba(10,10,10,0.08);border-top:none;">
                      <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">
                        Patrimonio · Finanzas Personales · {$year}
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        HTML;
    }
}
