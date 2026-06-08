<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Make static media (video/image) responses cacheable.
 *
 * Laravel's default response carries "Cache-Control: no-cache, private",
 * which forces the browser to re-download a looping <video> on every loop
 * iteration — piling up requests endlessly in the Network tab. Static media
 * never changes per-request, so we mark it publicly cacheable instead.
 */
class MediaCacheHeaders
{
    /** One year, in seconds. */
    private const MAX_AGE = 31536000;

    private const MEDIA_EXTENSIONS = [
        'mp4', 'webm', 'mov', 'm4v', 'ogv',
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico',
        'woff', 'woff2', 'ttf', 'otf',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if (! $this->isMediaRequest($request) || $response->isServerError() || $response->isClientError()) {
            return $response;
        }

        $response->headers->set('Cache-Control', 'public, max-age=' . self::MAX_AGE . ', immutable');
        $response->headers->remove('Pragma');

        // Session cookies on a long-lived asset prevent shared/CDN caching.
        $response->headers->remove('Set-Cookie');

        return $response;
    }

    private function isMediaRequest(Request $request): bool
    {
        $extension = strtolower(pathinfo($request->path(), PATHINFO_EXTENSION));

        return $extension !== '' && in_array($extension, self::MEDIA_EXTENSIONS, true);
    }
}
