<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RequestAbuseGuard
{
    private function blockedIps(): array
    {
        $raw = (string) env('SECURITY_BLOCKED_IPS', '');
        if ($raw === '') return [];
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }

    private function blockedUaPatterns(): array
    {
        $raw = (string) env('SECURITY_BLOCKED_UA_PATTERNS', '');
        if ($raw === '') return [];
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }

    private function globalRequestsPerMinute(): int
    {
        return max(60, (int) env('SECURITY_GLOBAL_RPM', 900));
    }

    private function maxJsonBodyBytes(): int
    {
        return max(1024 * 1024, (int) env('SECURITY_MAX_JSON_BODY_BYTES', 2 * 1024 * 1024));
    }

    private function globalRequestKey(Request $request): string
    {
        $userId = $request->user()?->getAuthIdentifier();
        $ip = (string) $request->ip();
        $ua = mb_substr(mb_strtolower((string) $request->userAgent()), 0, 120);

        return 'global|' . ($userId ? 'u:' . $userId : 'ip:' . $ip) . '|ua:' . sha1($ua);
    }

    public function handle(Request $request, Closure $next): Response
    {
        $ip = (string) $request->ip();
        if ($ip !== '' && in_array($ip, $this->blockedIps(), true)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $ua = mb_strtolower((string) $request->userAgent());
        if ($ua !== '') {
            foreach ($this->blockedUaPatterns() as $pattern) {
                if ($pattern !== '' && str_contains($ua, mb_strtolower($pattern))) {
                    return response()->json(['message' => 'Access denied.'], 403);
                }
            }
        }

        if ($request->isMethodCacheable() === false) {
            $contentType = mb_strtolower((string) $request->header('content-type', ''));
            $contentLength = (int) $request->header('content-length', 0);

            if (
                $contentLength > 0 &&
                str_contains($contentType, 'application/json') &&
                $contentLength > $this->maxJsonBodyBytes()
            ) {
                return response()->json([
                    'message' => 'Payload too large.',
                ], 413);
            }
        }

        $key = $this->globalRequestKey($request);
        $maxAttempts = $this->globalRequestsPerMinute();

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            return response()->json([
                'message' => 'Too many requests. Please slow down and try again.',
            ], 429);
        }

        RateLimiter::hit($key, 60);

        return $next($request);
    }
}
