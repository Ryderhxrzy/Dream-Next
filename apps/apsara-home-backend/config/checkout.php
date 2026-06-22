<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Abandoned checkout recovery
    |--------------------------------------------------------------------------
    |
    | A checkout becomes a row in tbl_checkout_history the moment a PayMongo
    | session is created (before the customer pays). When ch_paid_at stays null
    | the checkout was "abandoned". These settings tune detection, expiry and
    | the recovery reminders. All hour/minute values are integers.
    |
    */
    'abandoned' => [
        // Grace period (minutes) after checkout creation before an unpaid order
        // is considered abandoned. The customer may still be completing payment.
        'grace_minutes' => (int) env('CHECKOUT_ABANDONED_GRACE_MINUTES', 60),

        // After this many hours unpaid, the checkout is marked terminally
        // abandoned (ch_status = 'abandoned') and reminders stop.
        'expire_after_hours' => (int) env('CHECKOUT_ABANDONED_EXPIRE_HOURS', 72),

        // Maximum number of recovery reminders sent per checkout.
        'max_reminders' => (int) env('CHECKOUT_ABANDONED_MAX_REMINDERS', 2),

        // Minimum hours between two reminders for the same checkout.
        'reminder_gap_hours' => (int) env('CHECKOUT_ABANDONED_REMINDER_GAP_HOURS', 20),

        // Payment methods settled offline (e.g. cash on delivery). These are
        // never treated as abandoned. Comma separated, lower-cased on read.
        'offline_payment_methods' => array_values(array_filter(array_map(
            'trim',
            explode(',', strtolower((string) env('CHECKOUT_OFFLINE_PAYMENT_METHODS', '')))
        ))),

        // Reminder delivery channels.
        'channels' => [
            'email' => filter_var(env('CHECKOUT_ABANDONED_EMAIL', true), FILTER_VALIDATE_BOOL),
            'sms' => filter_var(env('CHECKOUT_ABANDONED_SMS', true), FILTER_VALIDATE_BOOL),
            'push' => filter_var(env('CHECKOUT_ABANDONED_PUSH', true), FILTER_VALIDATE_BOOL),
        ],
    ],

    // Public base URL of the storefront, used to build resume-payment / order
    // links inside reminders when a stored PayMongo checkout_url is missing.
    'frontend_url' => rtrim((string) env('FRONTEND_URL', env('APP_FRONTEND_URL', env('APP_URL', 'http://localhost:3000'))), '/'),
];
