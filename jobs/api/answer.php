<?php
declare(strict_types=1);

// Backend endpoint that enforces per-user API keys via HttpOnly session
// (preferred) or, for backward compatibility, via an explicit header.
// External provider keys (e.g., OpenAI, Perplexity) are read from getenv()
// and MUST NEVER be exposed to the client in responses.

// Harden PHP session and start it early (before any output)
// These settings prefer secure cookies and reduce exposure to XSS/CSRF.
if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_cookies', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    // If served over HTTPS in Docker/prod, this should be on. Keep auto if behind terminator.
    // You may override via php.ini/env if needed.
    if (!headers_sent()) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        if ($isHttps) ini_set('session.cookie_secure', '1');
    }
    // Default to Strict to avoid cross-site sends; relax to Lax if necessary.
    if (function_exists('session_set_cookie_params')) {
        $params = session_get_cookie_params();
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => $params['path'] ?? '/',
            'domain' => $params['domain'] ?? '',
            'secure' => ($params['secure'] ?? false) || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }
    session_start();
}

// Utility: send JSON response
function json_response(int $status, array $body): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Utility: get header value case-insensitively
function header_value(string $name): ?string {
    // Prefer getallheaders when available
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, $name) === 0) return is_array($v) ? ($v[0] ?? null) : $v;
            }
        }
    }
    // Fallback to $_SERVER (e.g., HTTP_X_APP_API_KEY)
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return $_SERVER[$key] ?? null;
}

// Utility: read boolean-ish env flags ("1", "true", "yes" => true; "0", "false", "no" => false)
function env_flag(string $name, bool $default = false): bool {
    $v = getenv($name);
    if ($v === false || $v === null) return $default;
    $s = strtolower(trim((string)$v));
    if ($s === '1' || $s === 'true' || $s === 'yes' || $s === 'on') return true;
    if ($s === '0' || $s === 'false' || $s === 'no' || $s === 'off') return false;
    return $default;
}

// Load optional .env from ../env/.env (keeps keys out of web)
function bootstrap_env(?string $dir = null): void {
    static $booted = false;
    if ($booted) return; $booted = true;
    // Prefer explicit ENV_FILE path when provided (e.g., C:\xampp\secure\env\apply.env or /home/infra/env/apply.env)
    $envFile = getenv('ENV_FILE');
    $candidates = [];
    if (is_string($envFile) && $envFile !== '') {
        if (is_dir($envFile)) {
            $candidates[] = rtrim($envFile, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '.env';
        } else {
            $candidates[] = $envFile;
        }
    }
    // Fallbacks: project-local env locations
    $candidates[] = ($dir ?? (dirname(__DIR__) . DIRECTORY_SEPARATOR . 'env')) . DIRECTORY_SEPARATOR . '.env'; // jobs/env/.env
    $candidates[] = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'env' . DIRECTORY_SEPARATOR . '.env'; // apply/env/.env
    // Optional conventional locations (do not fail if missing)
    if (strncasecmp(PHP_OS, 'WIN', 3) === 0) {
        $candidates[] = 'C:\\xampp\\secure\\env\\apply.env';
    } else {
        $candidates[] = '/home/infra/env/apply.env';
    }

    $file = null;
    foreach ($candidates as $cand) {
        if (is_string($cand) && is_file($cand) && is_readable($cand)) { $file = $cand; break; }
    }
    if ($file === null) return;
    $lines = @file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || $line[0] === ';') continue;
        $pos = strpos($line, '=');
        if ($pos === false) continue;
        $k = trim(substr($line, 0, $pos));
        $v = trim(substr($line, $pos + 1));
        if ($v !== '' && ($v[0] === '"' && substr($v, -1) === '"' || $v[0] === "'" && substr($v, -1) === "'")) {
            $v = substr($v, 1, -1);
        }
        if ($k === '') continue;
        // set only if not already set in environment
        if (getenv($k) === false) {
            putenv($k . '=' . $v);
            $_ENV[$k] = $v;
            if (!isset($_SERVER[$k])) $_SERVER[$k] = $v;
        }
    }
}

// Minimal client IP detection (trust proxy only if explicitly enabled)
function client_ip(): string {
    $trust = getenv('TRUST_PROXY') === '1';
    if ($trust) {
        $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($xff) {
            $parts = array_map('trim', explode(',', $xff));
            if (isset($parts[0]) && filter_var($parts[0], FILTER_VALIDATE_IP)) return $parts[0];
        }
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return is_string($ip) ? $ip : '0.0.0.0';
}

// Rate limiting with APCu or filesystem fallback; stores only hashed identifiers
function rate_limit_check(string $bucketKey, int $limit, int $windowSec, ?int &$remaining = null, ?int &$resetTs = null): bool {
    $now = time();
    $resetTs = $now + $windowSec;
    $remaining = $limit;

    // Prefer APCu if available
    if (function_exists('apcu_fetch')) {
        $k = 'rl_' . $bucketKey;
        $data = apcu_fetch($k, $ok);
        if (!$ok || !is_array($data) || ($data['reset'] ?? 0) <= $now) {
            $data = ['count' => 0, 'reset' => $now + $windowSec];
        }
        $data['count'] = (int)$data['count'] + 1;
        $remaining = max(0, $limit - $data['count']);
        $resetTs = (int)$data['reset'];
        // store with TTL until reset
        apcu_store($k, $data, max(1, $resetTs - $now));
        return $data['count'] <= $limit;
    }

    // Filesystem fallback
    $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'apply_rl';
    if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
    $path = $dir . DIRECTORY_SEPARATOR . $bucketKey . '.json';
    $count = 0; $reset = $now + $windowSec;
    $fh = @fopen($path, 'c+');
    if ($fh) {
        @flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $count = (int)($decoded['count'] ?? 0);
                $reset = (int)($decoded['reset'] ?? ($now + $windowSec));
            }
        }
        if ($reset <= $now) { $count = 0; $reset = $now + $windowSec; }
        $count++;
        $remaining = max(0, $limit - $count);
        $resetTs = $reset;
        ftruncate($fh, 0); rewind($fh);
        fwrite($fh, json_encode(['count' => $count, 'reset' => $reset]));
        @flock($fh, LOCK_UN);
        fclose($fh);
    } else {
        // If we cannot open, be permissive but avoid fatal
        $remaining = $limit - 1; $resetTs = $now + $windowSec; return true;
    }
    return $count <= $limit;
}

// (Removed) Per-user API key validation/quota — feature no longer used

// Ensure env is available (if project uses ../env/.env)
bootstrap_env();

// Helper: read JSON body or form data
function read_request_body(): array {
    $ct = header_value('Content-Type') ?? ($_SERVER['CONTENT_TYPE'] ?? '');
    $raw = file_get_contents('php://input');
    if (is_string($ct) && stripos($ct, 'application/json') !== false) {
        $data = json_decode($raw ?: 'null', true);
        return is_array($data) ? $data : [];
    }
    return $_POST ?: [];
}

// Helper: minimal HTTP JSON POST with cURL
function http_json_post(string $url, array $headers, array $payload, int $timeout = 30): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => $timeout,
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false) {
        return ['ok' => false, 'status' => 0, 'error' => 'network_error', 'message' => $err ?: 'Request failed'];
    }
    $json = json_decode($resp, true);
    if (!is_array($json)) {
        return ['ok' => false, 'status' => $code, 'error' => 'invalid_json', 'body' => $resp];
    }
    return ['ok' => $code >= 200 && $code < 300, 'status' => $code, 'body' => $json];
}

// Load provider keys from environment WITHOUT exposing them.
$openaiKey = getenv('OPENAI_API_KEY') ?: '';
$perplexityKey = getenv('PERPLEXITY_API_KEY') ?: '';
$openaiModel = getenv('OPENAI_MODEL') ?: 'gpt-4o-mini';
$perplexityModel = getenv('PERPLEXITY_MODEL') ?: 'sonar-small';

// Router: two actions
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(405, [ 'ok' => false, 'error' => 'method_not_allowed', 'message' => 'Use POST' ]);
}

$data = read_request_body();
$action = trim((string)($data['action'] ?? ''));

if ($action === '') {
    json_response(400, [ 'ok' => false, 'error' => 'missing_action', 'message' => 'Provide action: perplexity_scout or generate_application' ]);
}

// Lightweight rate limiting per IP and per IP+action (hashed identifiers)
// Configure via env: RATE_LIMIT_WINDOW (seconds, default 60), RATE_LIMIT_IP_MAX (default 60), RATE_LIMIT_IP_ACTION_MAX (default 30), RATE_HASH_PEPPER
$window = (int)(getenv('RATE_LIMIT_WINDOW') ?: 60);
$maxIp = (int)(getenv('RATE_LIMIT_IP_MAX') ?: 60);
$maxIpAct = (int)(getenv('RATE_LIMIT_IP_ACTION_MAX') ?: 30);
$pepper = (string)(getenv('RATE_HASH_PEPPER') ?: 'set-a-strong-pepper');
$ip = client_ip();
$ipKey = hash('sha256', $ip . '|' . $pepper);
$ipActKey = hash('sha256', $ip . '|' . $action . '|' . $pepper);

// Apply limits (only if positive limits configured)
if ($maxIp > 0) {
    $rem = 0; $reset = 0;
    $ok = rate_limit_check($ipKey, $maxIp, $window, $rem, $reset);
    header('X-RateLimit-Limit: ' . $maxIp);
    header('X-RateLimit-Remaining: ' . max(0, $rem));
    header('X-RateLimit-Reset: ' . $reset);
    if (!$ok) {
        header('Retry-After: ' . max(1, $reset - time()));
        json_response(429, [ 'ok' => false, 'error' => 'rate_limited', 'message' => 'Too many requests from this IP. Please retry later.' ]);
    }
}
if ($maxIpAct > 0) {
    $rem2 = 0; $reset2 = 0;
    $ok2 = rate_limit_check($ipActKey, $maxIpAct, $window, $rem2, $reset2);
    header('X-RateLimit-Action-Limit: ' . $maxIpAct);
    header('X-RateLimit-Action-Remaining: ' . max(0, $rem2));
    header('X-RateLimit-Action-Reset: ' . $reset2);
    if (!$ok2) {
        header('Retry-After: ' . max(1, $reset2 - time()));
        json_response(429, [ 'ok' => false, 'error' => 'rate_limited_action', 'message' => 'Too many requests for this action from this IP. Please retry later.' ]);
    }
}

// Lightweight config endpoint for frontend to adapt UI (no secrets)
if ($action === 'config') {
    json_response(200, [ 'ok' => true, 'requireUserKey' => false, 'hasUserKey' => false ]);
}

// (Removed) set_user_key / clear_user_key actions — feature no longer used

// (Removed) Per-user API key enforcement — all routes accessible without user key

// Action: step 1 scout via Perplexity
if ($action === 'perplexity_scout') {
    $jobTitle = trim((string)($data['jobTitle'] ?? ''));
    $jobUrl   = trim((string)($data['jobUrl'] ?? ''));
    $adUrl    = trim((string)($data['adUrl'] ?? ''));
    $role     = trim((string)($data['role'] ?? ''));
    $lang     = trim((string)($data['lang'] ?? ''));

    if ($jobTitle === '' && $jobUrl === '' && $adUrl === '' && $role === '') {
        json_response(400, [ 'ok' => false, 'error' => 'missing_inputs', 'message' => 'Fill at least one of: jobTitle, jobUrl, adUrl, role' ]);
    }
    if ($perplexityKey === '') {
        json_response(500, [ 'ok' => false, 'error' => 'missing_provider_key', 'provider' => 'perplexity' ]);
    }

    $instruction = 'Find a concise and clear summary about the company and job based on the provided fields. '
        . 'At least one of the following is provided: Company name, Company website, Job post URL, or Job title. '
        . 'Do not include personal data. Keep it short. If only a job title is provided, describe typical requirements and tasks for that profession in general.';

    $userFields = [
        'company_name' => $jobTitle,
        'company_website' => $jobUrl,
        'job_post_url' => $adUrl,
        'job_title' => $role,
    ];
    $userText = json_encode(array_filter($userFields, fn($v) => $v !== ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $messages = [
        [ 'role' => 'system', 'content' => $instruction . ($lang ? (" Respond in language: " . $lang . '.') : '') ],
        [ 'role' => 'user', 'content' => 'Inputs: ' . $userText ],
    ];

    $payload = [
        'model' => $perplexityModel,
        'messages' => $messages,
        'temperature' => 0.2,
        'max_tokens' => 400,
    ];

    $resp = http_json_post(
        'https://api.perplexity.ai/chat/completions',
        [ 'Authorization: Bearer ' . $perplexityKey ],
        $payload,
        30
    );
    // Retry with fallback models if invalid_model
    if (!$resp['ok'] && (int)($resp['status'] ?? 0) === 400) {
        $etype = $resp['body']['error']['type'] ?? null;
        if ($etype === 'invalid_model') {
            $fallbacks = [];
            // If user configured an invalid model, fall back gracefully
            if ($perplexityModel !== 'sonar-small') $fallbacks[] = 'sonar-small';
            if (!in_array('sonar', $fallbacks, true)) $fallbacks[] = 'sonar';
            if (!in_array('sonar-medium', $fallbacks, true)) $fallbacks[] = 'sonar-medium';
            foreach ($fallbacks as $fm) {
                $payload['model'] = $fm;
                $retry = http_json_post(
                    'https://api.perplexity.ai/chat/completions',
                    [ 'Authorization: Bearer ' . $perplexityKey ],
                    $payload,
                    30
                );
                if ($retry['ok']) { $resp = $retry; break; }
            }
        }
    }
    if (!$resp['ok']) {
        json_response(502, [ 'ok' => false, 'error' => 'perplexity_error', 'details' => $resp ]);
    }
    $body = $resp['body'];
    $summary = '';
    if (isset($body['choices'][0]['message']['content'])) {
        $summary = trim((string)$body['choices'][0]['message']['content']);
    } elseif (isset($body['choices'][0]['text'])) {
        $summary = trim((string)$body['choices'][0]['text']);
    }
    if ($summary === '') {
        json_response(502, [ 'ok' => false, 'error' => 'empty_summary' ]);
    }
    json_response(200, [ 'ok' => true, 'summary' => $summary ]);
}

// Action: step 3 draft generation via OpenAI
if ($action === 'generate_application') {
    $summary    = trim((string)($data['summary'] ?? ''));
    $about      = trim((string)($data['about'] ?? ''));
    $why        = trim((string)($data['why'] ?? ''));
    $proof      = trim((string)($data['proof'] ?? ''));
    $nativeLang = trim((string)($data['nativeLang'] ?? 'fi'));
    $targetLang = trim((string)($data['targetLang'] ?? 'fi'));

    if ($openaiKey === '') {
        json_response(500, [ 'ok' => false, 'error' => 'missing_provider_key', 'provider' => 'openai' ]);
    }

    // Helper: map ISO code to readable language name to avoid LLM confusion (fallback to code)
    $langName = static function(string $code): string {
        $c = strtolower($code);
        $map = [
            'fi'=>'Finnish','sv'=>'Swedish','en'=>'English','de'=>'German','fr'=>'French','it'=>'Italian',
            'es'=>'Spanish','pt'=>'Portuguese','et'=>'Estonian','ru'=>'Russian','sk'=>'Slovak',
            'so'=>'Somali','ar'=>'Arabic','cs'=>'Czech','uk'=>'Ukrainian'
        ];
        return $map[$c] ?? $code;
    };

    $sys = 'You are a careful assistant that writes short, tailored job applications. '
         . 'You MUST incorporate key facts from the provided job/company summary and connect them to the applicant\'s reasons and proofs. '
         . 'Do NOT invent facts not present in the summary or user inputs. No personal data beyond what the user wrote.';

    $instr = [
        'company_or_job_summary' => $summary,
        'user_inputs' => [ 'about' => $about, 'why' => $why, 'proof' => $proof ],
        'native_language_code' => $nativeLang,
        'native_language_name' => $langName($nativeLang),
        'target_language_code' => $targetLang,
        'target_language_name' => $langName($targetLang),
        'guidelines' => [
            'Use at least 3 concrete facts from the summary when available; weave them naturally into the text (no bullet points, no citations).',
            'If the summary is empty but a job title exists, write a general application based on typical requirements for that role.',
            'Tone: professional, concise, confident, helpful; no flattery or filler.',
            'Length target: 200–300 words per draft (native and target).',
            'Structure (implicit): brief opening aligned to role/company; 1–2 sentences linking the applicant\'s strengths to the summary; 1–2 sentences showcasing proof; concise closing.',
            'Output strictly a JSON object with keys "native" and "target" only. Ensure native is in the native_language_name and target is in the target_language_name.',
        ],
        'hard_requirements' => [
            'Do not add headers, salutations, or lists.',
            'Do not include any personal data that the user did not provide.',
            'Do not fabricate client names, metrics, or technologies not present in inputs or typical for the role.',
        ],
    ];

    $messages = [
        [ 'role' => 'system', 'content' => $sys ],
        [ 'role' => 'user', 'content' => json_encode($instr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ],
    ];

    $payload = [
        'model' => $openaiModel,
        'messages' => $messages,
        'temperature' => 0.2,
        'response_format' => [ 'type' => 'json_object' ],
        'max_tokens' => 1400,
    ];

    $resp = http_json_post(
        'https://api.openai.com/v1/chat/completions',
        [ 'Authorization: Bearer ' . $openaiKey ],
        $payload,
        45
    );

    if (!$resp['ok']) {
        json_response(502, [ 'ok' => false, 'error' => 'openai_error', 'details' => $resp ]);
    }
    $body = $resp['body'];
    $content = '';
    if (isset($body['choices'][0]['message']['content'])) {
        $content = trim((string)$body['choices'][0]['message']['content']);
    }
    $native = '';
    $target = '';
    if ($content !== '') {
        $parsed = json_decode($content, true);
        if (is_array($parsed)) {
            $native = trim((string)($parsed['native'] ?? ''));
            $target = trim((string)($parsed['target'] ?? ''));
        }
    }
    // Fallback: if JSON parsing failed, put entire content as native
    if ($native === '' && $content !== '') $native = $content;
    // If target language equals native language, enforce identical text
    if ($targetLang === $nativeLang) {
        if ($native !== '') {
            $target = $native;
        } else if ($target !== '') {
            $native = $target;
        }
    } else if ($target === '' && $native !== '') {
        // If different languages but model omitted target, keep best-effort fallback only when empty
        // (previous behavior): no-op unless same language
    }

    if ($native === '' && $target === '') {
        json_response(502, [ 'ok' => false, 'error' => 'empty_draft' ]);
    }
    json_response(200, [ 'ok' => true, 'draftNative' => $native, 'draftTarget' => $target ]);
}

// Unknown action
json_response(400, [ 'ok' => false, 'error' => 'unknown_action', 'action' => $action ]);
