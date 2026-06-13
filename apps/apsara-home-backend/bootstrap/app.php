<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use App\Http\Middleware\EnsureAdminActor;
use App\Http\Middleware\EnsureAdminOrSupplierActor;
use App\Http\Middleware\EnsureAdminRole;
use App\Http\Middleware\EnsureCustomerActor;
use App\Http\Middleware\EnsureSupplierActor;
use App\Http\Middleware\JsonAuthentication;
use App\Http\Middleware\MediaCacheHeaders;
use App\Http\Middleware\RequestAbuseGuard;
use App\Http\Middleware\SecurityHeaders;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API-first app: unauthenticated requests should return 401 JSON, not redirect to a named "login" route.
        $middleware->redirectGuestsTo(fn (Request $request) => $request->expectsJson() ? null : null);
        $trustedProxies = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('TRUSTED_PROXIES', ''))
        )));
        if ($trustedProxies !== []) {
            $middleware->trustProxies(at: $trustedProxies);
        }

        $trustedHosts = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('TRUSTED_HOSTS', ''))
        )));
        if ($trustedHosts !== []) {
            $middleware->trustHosts(fn () => $trustedHosts);
        }

        $middleware->prepend(HandleCors::class);
        $middleware->append(RequestAbuseGuard::class);
        $middleware->append(SecurityHeaders::class);
        $middleware->append(MediaCacheHeaders::class);

        $middleware->alias([
            'admin.actor' => EnsureAdminActor::class,
            'admin.or_supplier' => EnsureAdminOrSupplierActor::class,
            'admin.role' => EnsureAdminRole::class,
            'customer.actor' => EnsureCustomerActor::class,
            'supplier.actor' => EnsureSupplierActor::class,
            'auth.json' => JsonAuthentication::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        });
    })->create();
