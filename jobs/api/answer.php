<?php
declare(strict_types=1);

// Backend endpoint scaffold that enforces per-user API keys via header.
// External provider keys (e.g., OpenAI, Perplexity) are read from getenv()
// and MUST NEVER be exposed to the client in responses.

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

// Task 2: Placeholder validation & quota check
function isValidAndHasQuota(string $userApiKey): bool {
    // Allow a known test key deterministically
    if ($userApiKey === 'test-allow-123') return true;
    if ($userApiKey === 'test-deny-123') return false;
    // 90% chance allow to simulate quota/validity during development
    try {
        return random_int(1, 10) <= 9;
    } catch (Throwable $e) {
        return true; // if randomness fails, be permissive in dev
    }
}

// Enforce presence of user API key in header
$userApiKey = trim((string)(header_value('X-App-API-Key') ?? ''));
if ($userApiKey === '') {
    json_response(401, [
        'ok' => false,
        'error' => 'missing_api_key',
        'message' => 'Provide your API key in the X-App-API-Key header.'
    ]);
}

// Validate and ensure quota
if (!isValidAndHasQuota($userApiKey)) {
    json_response(403, [
        'ok' => false,
        'error' => 'forbidden_or_no_quota',
        'message' => 'API key is invalid or out of quota.'
    ]);
}

// At this point, proceed with the actual operation.
// Load provider keys from environment WITHOUT exposing them.
$openaiKey = getenv('OPENAI_API_KEY') ?: '';
$perplexityKey = getenv('PERPLEXITY_API_KEY') ?: '';

// TODO: integrate with providers using the above keys server-side only.
// For now, return a safe placeholder payload.
json_response(200, [
    'ok' => true,
    'message' => 'Authorized. Backend reached. Implement provider call here.',
]);

