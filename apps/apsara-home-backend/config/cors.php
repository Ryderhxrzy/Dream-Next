<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:3000'),
        'https://www.afhome.ph',
        'https://afhome.ph',
        'https://frontend.afhome.ph',
        'https://backend.afhome.ph',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:8081',
        // 'null' removed: React Native uses bearer tokens in Authorization headers,
        // so CORS (browser-only) does not apply to it. Allowing null origin with
        // supports_credentials=true enables sandboxed-iframe CSRF attacks.
    ],

    'allowed_origins_patterns' => [
        // Scoped to this project's Vercel preview deployments only.
        // The previous wildcard (.*\.vercel\.app) allowed any attacker-owned
        // Vercel subdomain to make credentialed cross-origin requests.
        '#^https://apsara-home-frontend(-[a-z0-9]+)*\.vercel\.app$#',
        '#^https://([a-z0-9-]+\\.)?afhome\\.ph$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
