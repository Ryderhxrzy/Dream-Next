<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\Checkout\PartnerStorefrontGuestOrderMail;
use App\Models\AdminNotification;
use App\Mail\Checkout\CheckoutCompletedMail;
use App\Models\CheckoutHistory;
use App\Models\CustomerWalletLedger;
use App\Models\CustomerNotification;
use App\Models\OrderNotification;
use App\Models\ProductReview;
use App\Models\Product;
use App\Models\SystemSetting;
use App\Models\WebPageContent;
use App\Services\CloudinaryUploadService;
use App\Services\FirebaseMessagingService;
use App\Services\QueryOptimizerService;
use App\Support\DirectReferralCommission;
use App\Support\OrderPvPosting;
use App\Support\PersonalPurchaseCashback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Pusher\Pusher;
use RuntimeException;


class PaymentController extends Controller
{
    private const LOCAL_PAYMENT_HOSTS = ['localhost', '127.0.0.1', '::1'];

    private function isLocalPaymentEnvironment(): bool
    {
        return app()->environment(['local', 'development', 'dev']);
    }

    private function isLocalPaymentHost(?string $host): bool
    {
        $normalized = strtolower(trim((string) $host));
        return in_array($normalized, self::LOCAL_PAYMENT_HOSTS, true);
    }

    private function requestCanUseTestPaymongoMode(?Request $request = null): bool
    {
        if ($this->systemAllowsTestPayments()) {
            return true;
        }

        if ($request === null) {
            return $this->isLocalPaymentEnvironment();
        }

        $hostCandidates = [
            $request->getHost(),
            parse_url((string) $request->headers->get('origin', ''), PHP_URL_HOST),
            parse_url((string) $request->headers->get('referer', ''), PHP_URL_HOST),
        ];

        foreach ($hostCandidates as $candidate) {
            if ($this->isLocalPaymentHost(is_string($candidate) ? $candidate : null)) {
                return true;
            }
        }

        return false;
    }

    private function systemAllowsTestPayments(): bool
    {
        if (!Schema::hasTable('tbl_system_settings') || !Schema::hasColumn('tbl_system_settings', 'enable_test_payments')) {
            return false;
        }

        return (bool) (SystemSetting::query()->value('enable_test_payments') ?? false);
    }

    private function paymongoDefaultMode(): string
    {
        $mode = strtolower((string) config('services.paymongo.default_mode', 'live'));
        return in_array($mode, ['test', 'live'], true) ? $mode : 'live';
    }

    private function canSwitchPaymongoMode(): bool
    {
        return (bool) config('services.paymongo.allow_mode_switch', false) || $this->systemAllowsTestPayments();
    }

    private function resolveRequestedPaymongoMode(?string $requestedMode = null, ?Request $request = null): string
    {
        $requestedMode = strtolower(trim((string) $requestedMode));

        if (!$this->requestCanUseTestPaymongoMode($request)) {
            return 'live';
        }

        if (!$this->canSwitchPaymongoMode()) {
            return 'live';
        }

        if (in_array($requestedMode, ['test', 'live'], true)) {
            return $requestedMode;
        }

        return $this->paymongoDefaultMode();
    }

    private function getPaymongoConfig(?string $requestedMode = null, ?Request $request = null): array
    {
        $mode = $this->resolveRequestedPaymongoMode($requestedMode, $request);
        $config = (array) config("services.paymongo.modes.{$mode}", []);

        return [
            'mode' => $mode,
            'secret_key' => (string) ($config['secret_key'] ?? ''),
            'public_key' => (string) ($config['public_key'] ?? ''),
            'webhook_secret' => (string) ($config['webhook_secret'] ?? ''),
            'api_base_url' => (string) config('services.paymongo.api_base_url', 'https://api.paymongo.com'),
        ];
    }

    private function resolveCheckoutPaymentMode(string $checkoutId, ?string $requestedMode = null, ?Request $request = null): string
    {
        if (!$this->requestCanUseTestPaymongoMode($request)) {
            return 'live';
        }

        if ($requestedMode !== null && $requestedMode !== '' && $this->canSwitchPaymongoMode()) {
            return $this->resolveRequestedPaymongoMode($requestedMode, $request);
        }

        try {
            $cachedCustomer = Cache::get("checkout_customer:{$checkoutId}");
            if (is_array($cachedCustomer) && in_array(($cachedCustomer['payment_mode'] ?? null), ['test', 'live'], true)) {
                return (string) $cachedCustomer['payment_mode'];
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to read checkout payment mode from cache.', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->paymongoDefaultMode();
    }

    private function getValidPaymongoWebhookSecrets(?string $requestedMode = null): array
    {
        if ($requestedMode !== null && $requestedMode !== '') {
            $config = $this->getPaymongoConfig($requestedMode);
            return array_values(array_filter([(string) ($config['webhook_secret'] ?? '')]));
        }

        if ($this->canSwitchPaymongoMode()) {
            return array_values(array_filter([
                (string) config('services.paymongo.modes.test.webhook_secret', ''),
                (string) config('services.paymongo.modes.live.webhook_secret', ''),
            ]));
        }

        return array_values(array_filter([
            (string) config('services.paymongo.modes.live.webhook_secret', ''),
        ]));
    }

    private function mapMethods(string $method, ?string $onlineBankingProvider = null, ?string $paymentMode = null): array
    {
        return match ($method) {
            'card' => ['card'],
            'gcash' => ['gcash'],
            'maya' => ['paymaya'],
            'online_banking' => $this->resolveOnlineBankingMethods($onlineBankingProvider, $paymentMode),
            default => ['gcash'],
        };
    }

    private function resolveOnlineBankingMethods(?string $provider = null, ?string $paymentMode = null): array
    {
        $resolvedMode = strtolower(trim((string) $paymentMode));
        if ($resolvedMode === 'live') {
            return ['dob'];
        }

        return [$this->resolveOnlineBankingProvider($provider)];
    }

    private function resolveOnlineBankingProvider(?string $provider = null): string
    {
        $provider = strtolower(trim((string) $provider));
        return in_array($provider, ['dob', 'ubp'], true) ? $provider : 'dob';
    }

    private function paymongoApiUrl(string $path, ?string $requestedMode = null): string
    {
        $base = rtrim((string) ($this->getPaymongoConfig($requestedMode)['api_base_url'] ?? 'https://api.paymongo.com'), '/');
        return $base . '/' . ltrim($path, '/');
    }

    private function resolveFrontendBaseUrl(?string $sourceUrl = null): string
    {
        $fallback = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $raw = trim((string) $sourceUrl);
        if ($raw === '') {
            return $fallback;
        }

        $parts = parse_url($raw);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        $port = isset($parts['port']) ? (int) $parts['port'] : null;

        if (!in_array($scheme, ['http', 'https'], true) || $host === '') {
            return $fallback;
        }

        $portSegment = ($port && !in_array($port, [80, 443], true)) ? ':' . $port : '';
        return sprintf('%s://%s%s', $scheme, $host, $portSegment);
    }

    private function resolveStorefrontSlug(?string $sourceSlug = null, ?string $sourceUrl = null, ?string $sourceLabel = null): string
    {
        $explicit = Str::slug(trim((string) $sourceSlug));
        if ($explicit !== '') {
            return $explicit;
        }

        $rawUrl = trim((string) $sourceUrl);
        if ($rawUrl !== '') {
            $path = trim((string) parse_url($rawUrl, PHP_URL_PATH));
            if ($path !== '') {
                if (preg_match('#^/shop/([^/?\#]+)#i', $path, $matches)) {
                    return Str::slug((string) ($matches[1] ?? ''));
                }
                if (preg_match('#^/([^/?\#]+)/(product|category|checkout|track-order)(?:/|$)#i', $path, $matches)) {
                    return Str::slug((string) ($matches[1] ?? ''));
                }
            }
        }

        $label = Str::slug(trim((string) $sourceLabel));
        return $label;
    }

    public function createCheckoutSession(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string|max:255',
            'payment_method' => 'required|in:online_banking,card,gcash,maya',
            'payment_mode' => 'nullable|in:test,live',
            'online_banking_provider' => 'nullable|in:dob,ubp',
            'voucher_code' => 'nullable|string|max:80',
            'cashback_amount' => 'nullable|numeric|min:0',
            'egc_amount' => 'nullable|numeric|min:0',
            'source_label' => 'nullable|string|max:255',
            'source_slug' => 'nullable|string|max:255',
            'storefront_partner' => 'nullable|string|max:255',
            'source_host' => 'nullable|string|max:255',
            'source_url' => 'nullable|string|max:2000',

            'customer' => 'nullable|array',
            'customer.name' => 'nullable|string|max:255',
            'customer.email' => 'nullable|email|max:255',
            'customer.phone' => 'nullable|string|max:50',
            'customer.address' => 'nullable|string|max:500',
            'customer.referred_by' => 'nullable|string|max:255',
            'customer.is_member' => 'nullable|boolean',
            'order' => 'nullable|array',
            'order.product_name' => 'nullable|string|max:255',
            'order.product_id' => 'nullable|integer|min:1',
            'order.product_sku' => 'nullable|string|max:100',
            'order.product_pv' => 'nullable|numeric|min:0',
            'order.product_image' => 'nullable|string|max:1000',
            'order.quantity' => 'nullable|integer|min:1|max:1000',
            'order.selected_color' => 'nullable|string|max:100',
            'order.selected_style' => 'nullable|string|max:100',
            'order.selected_size' => 'nullable|string|max:100',
            'order.selected_type' => 'nullable|string|max:100',
            'order.subtotal' => 'nullable|numeric|min:0',
            'order.handling_fee' => 'nullable|numeric|min:0',
            'order.source_type' => 'nullable|string|in:local,zq',
            'order.zq_product_id' => 'nullable|integer|min:1',
            'order.zq_external_id' => 'nullable|string|max:120',
            'order.zq_offer_id' => 'nullable|string|max:120',
        ]);

        $isMember = (bool) data_get($validated, 'customer.is_member', false);
        $authenticatedRequestUser = $request->user();
        $customerId = $authenticatedRequestUser instanceof \App\Models\Customer
            ? (int) $authenticatedRequestUser->getAuthIdentifier()
            : (auth('sanctum')->id() ? (int) auth('sanctum')->id() : null);
        $requiresReferral = !$customerId;
        $normalizedReferral = $this->normalizeReferralValue((string) data_get($validated, 'customer.referred_by', ''));
        $referrer = null;
        $referralSourceType = null;
        $authenticatedCustomer = $customerId
            ? \App\Models\Customer::query()
                ->select(['c_userid', 'c_sponsor'])
                ->with('sponsor:c_userid,c_username,c_accnt_status,c_lockstatus')
                ->find((int) $customerId)
            : null;

        if ($authenticatedCustomer instanceof \App\Models\Customer) {
            $sponsorUsername = trim((string) ($authenticatedCustomer->sponsor?->c_username ?? ''));
            if ($normalizedReferral === '' && $sponsorUsername !== '') {
                $normalizedReferral = $sponsorUsername;
                $referrer = $authenticatedCustomer->sponsor;
                $referralSourceType = 'member_sponsor';
            }
        }

        if ($normalizedReferral === '' && $requiresReferral && !$isMember) {
            return response()->json([
                'message' => 'The referred by field is required.',
                'errors' => [
                    'customer.referred_by' => ['The referred by field is required.'],
                ],
            ], 422);
        }

        if ($normalizedReferral !== '') {
            if (!$referrer) {
                $referrer = $this->resolveValidReferrer($normalizedReferral);
            }
            if (!$referrer) {
                return response()->json([
                    'message' => 'Referral code is invalid or referrer account is not verified.',
                    'errors' => [
                        'customer.referred_by' => ['Referral code is invalid or referrer account is not verified.'],
                    ],
                ], 422);
            }
            if ($referralSourceType === null) {
                $referralSourceType = 'checkout_referral';
            }
        }

        $paymongoConfig = $this->getPaymongoConfig($validated['payment_mode'] ?? null, $request);
        $secretKey = $paymongoConfig['secret_key'];
        if (!$secretKey) {
            return response()->json(['message' => sprintf('PayMongo %s secret key is missing.', $paymongoConfig['mode'])], 500);
        }

        $sourceLabel = trim((string) ($validated['source_label'] ?? ''));
        $sourceSlug = trim((string) ($validated['source_slug'] ?? ''));
        $storefrontPartner = trim((string) ($validated['storefront_partner'] ?? ''));
        $sourceHost = trim((string) ($validated['source_host'] ?? ''));
        $sourceUrl = trim((string) ($validated['source_url'] ?? ''));
        $frontendBase = $this->resolveFrontendBaseUrl($sourceUrl);
        $normalizedSourceSlug = $this->resolveStorefrontSlug($storefrontPartner !== '' ? $storefrontPartner : $sourceSlug, $sourceUrl, $sourceLabel);
        $successPath = $normalizedSourceSlug !== ''
            ? "/{$normalizedSourceSlug}/checkout/success"
            : '/checkout/success';
        $cancelPath = $normalizedSourceSlug !== ''
            ? "/{$normalizedSourceSlug}/checkout/failed"
            : '/checkout/failed';

        $voucherCode = trim((string) ($validated['voucher_code'] ?? ''));
        $resolvedOrderSnapshot = $this->resolveOrderSnapshot(is_array($validated['order'] ?? null) ? $validated['order'] : []);
        $subtotal = (float) ($validated['order']['subtotal'] ?? $validated['amount'] ?? 0);
        if (!$isMember) {
            $guestSrpUnit = (float) ($resolvedOrderSnapshot['unit_srp'] ?? 0);
            $guestQty = max(1, (int) ($resolvedOrderSnapshot['quantity'] ?? ($validated['order']['quantity'] ?? 1)));
            if ($guestSrpUnit > 0) {
                $subtotal = $guestSrpUnit * $guestQty;
            }
        }
        $handlingFee = (float) ($validated['order']['handling_fee'] ?? 0);

        $voucher = null;
        $voucherDiscount = 0.0;
        if ($voucherCode !== '') {
            $voucher = $this->resolveAffiliateVoucher($voucherCode);
            if (!$voucher) {
                return response()->json(['message' => 'Voucher code is invalid or expired.'], 422);
            }

            $voucherValidation = $this->computeVoucherDiscountForProduct(
                $voucher,
                (int) ($resolvedOrderSnapshot['product_id'] ?? 0),
                $subtotal
            );

            if (!$voucherValidation['valid']) {
                return response()->json(['message' => $voucherValidation['message']], 422);
            }

            $voucherDiscount = (float) $voucherValidation['discount'];
        }

        $cashbackAmount = round(max(0, (float) ($validated['cashback_amount'] ?? 0)), 2);
        if ($cashbackAmount > 0) {
            if (!$customerId) {
                return response()->json(['message' => 'Please sign in to use personal cashback.'], 422);
            }

            $availableCashbackBalance = PersonalPurchaseCashback::availableBalance((int) $customerId);
            $maxCashbackAmount = round(max(0, $subtotal - $voucherDiscount), 2);
            if ($cashbackAmount > $availableCashbackBalance) {
                return response()->json(['message' => 'Personal cashback amount exceeds available balance.'], 422);
            }
            if ($cashbackAmount > $maxCashbackAmount) {
                return response()->json(['message' => 'Personal cashback amount exceeds the remaining product subtotal.'], 422);
            }

            $cashbackValidation = $this->computeStoreCreditDiscountForProduct(
                $cashbackAmount,
                (int) ($resolvedOrderSnapshot['product_id'] ?? 0),
                $maxCashbackAmount,
                'personal cashback'
            );

            if (!$cashbackValidation['valid']) {
                return response()->json(['message' => $cashbackValidation['message']], 422);
            }

            if (round((float) $cashbackValidation['discount'], 2) < $cashbackAmount) {
                return response()->json(['message' => 'Personal cashback amount exceeds the allowed discount for this product.'], 422);
            }
        }

        $egcAmount = round(max(0, (float) ($validated['egc_amount'] ?? 0)), 2);
        if ($egcAmount > 0) {
            if (!$customerId) {
                return response()->json(['message' => 'Please sign in to use E-GC.'], 422);
            }

            $availableEgcBalance = $this->customerEgcBalance((int) $customerId);
            $maxEgcAmount = round(max(0, $subtotal - $voucherDiscount - $cashbackAmount), 2);
            if ($egcAmount > $availableEgcBalance) {
                return response()->json(['message' => 'E-GC amount exceeds available balance.'], 422);
            }
            if ($egcAmount > $maxEgcAmount) {
                return response()->json(['message' => 'E-GC amount exceeds the remaining product subtotal.'], 422);
            }

            $egcValidation = $this->computeStoreCreditDiscountForProduct(
                $egcAmount,
                (int) ($resolvedOrderSnapshot['product_id'] ?? 0),
                $maxEgcAmount
            );

            if (!$egcValidation['valid']) {
                return response()->json(['message' => $egcValidation['message']], 422);
            }

            if (round((float) $egcValidation['discount'], 2) < $egcAmount) {
                return response()->json(['message' => 'E-GC amount exceeds the allowed discount for this product.'], 422);
            }
        }

        $computedAmount = max(0, $subtotal - $voucherDiscount - $cashbackAmount - $egcAmount) + $handlingFee;

        $payload = [
            'data' => [
                'attributes' => [
                    'line_items' => [[
                        'currency' => 'PHP',
                        'amount' => (int) round($computedAmount * 100), // centavos
                        'name' => $validated['description'],
                        'quantity' => 1,
                    ]],
                    'payment_method_types' => $this->mapMethods(
                        $validated['payment_method'],
                        $validated['online_banking_provider'] ?? null,
                        $paymongoConfig['mode']
                    ),
                    'success_url' => $frontendBase . $successPath,
                    'cancel_url' => $frontendBase . $cancelPath,
                    'description' => $validated['description'],
                ],
            ],
        ];

        try {
            $res = Http::withBasicAuth($secretKey, '')
                ->post($this->paymongoApiUrl('/v1/checkout_sessions', $paymongoConfig['mode']), $payload);
        } catch (\Throwable $e) {
            $isLocalSslError = app()->environment(['local', 'development'])
                && str_contains(strtolower($e->getMessage()), 'curl error 60');

            if ($isLocalSslError) {
                Log::warning('Retrying PayMongo create session with SSL verification disabled for local environment.', [
                    'payment_mode' => $paymongoConfig['mode'],
                    'error' => $e->getMessage(),
                ]);

                try {
                    $res = Http::withOptions(['verify' => false])
                        ->withBasicAuth($secretKey, '')
                        ->post($this->paymongoApiUrl('/v1/checkout_sessions', $paymongoConfig['mode']), $payload);
                } catch (\Throwable $retryError) {
                    return response()->json([
                        'message' => 'PayMongo create session failed',
                        'provider' => $validated['online_banking_provider'] ?? null,
                        'error' => $retryError->getMessage(),
                    ], 502);
                }
            } else {
                return response()->json([
                    'message' => 'PayMongo create session failed',
                    'provider' => $validated['online_banking_provider'] ?? null,
                    'error' => $e->getMessage(),
                ], 502);
            }
        }

        if ($res->failed()) {
            return response()->json([
                'message' => 'PayMongo create session failed',
                'provider' => $validated['online_banking_provider'] ?? null,
                'error' => $res->json(),
            ], $res->status());
        }

        $data = $res->json('data');
        $checkoutId = $data['id'] ?? null;
        if (is_string($checkoutId) && trim($checkoutId) !== '') {
            $successBase = $normalizedSourceSlug !== ''
                ? "{$frontendBase}/{$normalizedSourceSlug}/checkout/success"
                : "{$frontendBase}/checkout/success";
            $cancelBase = $normalizedSourceSlug !== ''
                ? "{$frontendBase}/{$normalizedSourceSlug}/checkout/failed"
                : "{$frontendBase}/checkout/failed";

            $patchedSuccessUrl = $successBase . '?checkout_id=' . urlencode($checkoutId);
            $patchedCancelUrl = $cancelBase . '?checkout_id=' . urlencode($checkoutId);

            try {
                $patchResponse = Http::withBasicAuth($secretKey, '')
                    ->put($this->paymongoApiUrl("/v1/checkout_sessions/{$checkoutId}", $paymongoConfig['mode']), [
                        'data' => [
                            'attributes' => [
                                'success_url' => $patchedSuccessUrl,
                                'cancel_url' => $patchedCancelUrl,
                            ],
                        ],
                    ]);
                if (
                    app()->environment(['local', 'development'])
                    && $patchResponse->failed()
                    && str_contains(strtolower((string) $patchResponse->body()), 'ssl certificate')
                ) {
                    Http::withOptions(['verify' => false])
                        ->withBasicAuth($secretKey, '')
                        ->put($this->paymongoApiUrl("/v1/checkout_sessions/{$checkoutId}", $paymongoConfig['mode']), [
                            'data' => [
                                'attributes' => [
                                    'success_url' => $patchedSuccessUrl,
                                    'cancel_url' => $patchedCancelUrl,
                                ],
                            ],
                        ]);
                }
                data_set($data, 'attributes.success_url', $patchedSuccessUrl);
            } catch (\Throwable $e) {
                Log::warning('Failed to patch checkout session redirect URLs with checkout_id.', [
                    'checkout_id' => $checkoutId,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        if ($checkoutId) {
            Cache::put("checkout_customer:{$checkoutId}", [
                'customer_id' => $customerId ? (int) $customerId : null,
                'name' => $validated['customer']['name'] ?? 'Customer',
                'email' => $validated['customer']['email'] ?? null,
                'phone' => $validated['customer']['phone'] ?? null,
                'address' => $validated['customer']['address'] ?? null,
                'referred_by' => $normalizedReferral,
                'referrer_user_id' => $referrer ? (int) $referrer->c_userid : null,
                'referral_source_type' => $referralSourceType,
                'description' => $validated['description'],
                'amount' => (float) $computedAmount,
                'shipping_fee' => (float) $handlingFee,
                'payment_method' => $validated['payment_method'],
                'online_banking_provider' => $validated['online_banking_provider'] ?? null,
                'payment_mode' => $paymongoConfig['mode'],
                'source_label' => $sourceLabel !== '' ? $sourceLabel : null,
                'source_slug' => $normalizedSourceSlug !== '' ? $normalizedSourceSlug : ($sourceSlug !== '' ? $sourceSlug : null),
                'source_host' => $sourceHost !== '' ? $sourceHost : null,
                'source_url' => $sourceUrl !== '' ? $sourceUrl : null,
                'order' => $resolvedOrderSnapshot,
                'voucher' => $voucher ? [
                    'id' => (int) $voucher->avi_id,
                    'code' => (string) ($voucher->avi_code ?? ''),
                    'amount' => (float) ($voucher->avi_amount ?? 0),
                    'discount' => (float) $voucherDiscount,
                ] : null,
                'cashback' => $cashbackAmount > 0 ? [
                    'amount' => (float) $cashbackAmount,
                ] : null,
                'egc' => $egcAmount > 0 ? [
                    'amount' => (float) $egcAmount,
                ] : null,
            ], now()->addDays(3));

            Log::info('Checkout cached for email confirmation', [
                'checkout_id' => $checkoutId,
                'customer_email' => $validated['customer']['email'] ?? null,
                'payment_method' => $validated['payment_method'],
            ]);

            try {
                $this->persistCheckoutHistoryIfNeeded($checkoutId, [
                    'status' => 'pending',
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to persist pending checkout history after session creation.', [
                    'checkout_id' => $checkoutId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'checkout_id' => $checkoutId,
            'checkout_url' => $data['attributes']['checkout_url'] ?? null,
            'payment_mode' => $paymongoConfig['mode'],
        ]);
    }

    public function validateVoucher(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:80',
            'subtotal' => 'nullable|numeric|min:0',
            'product_id' => 'nullable|integer|min:1',
        ]);

        $voucher = $this->resolveAffiliateVoucher((string) $validated['code']);
        if (!$voucher) {
            return response()->json(['message' => 'Voucher code is invalid or expired.'], 422);
        }

        $subtotal = (float) ($validated['subtotal'] ?? ($voucher->avi_amount ?? 0));
        $voucherValidation = $this->computeVoucherDiscountForProduct(
            $voucher,
            (int) ($validated['product_id'] ?? 0),
            $subtotal
        );

        if (!$voucherValidation['valid']) {
            return response()->json(['message' => $voucherValidation['message']], 422);
        }

        $discount = (float) $voucherValidation['discount'];

        return response()->json([
            'valid' => true,
            'message' => $voucherValidation['message'],
            'voucher' => [
                'id' => (int) $voucher->avi_id,
                'code' => (string) ($voucher->avi_code ?? ''),
                'amount' => (float) ($voucher->avi_amount ?? 0),
                'source_type' => 'personal_cashback',
                'max_uses' => $voucher->avi_max_uses !== null ? (int) $voucher->avi_max_uses : null,
                'used_count' => $voucher->avi_used_count !== null ? (int) $voucher->avi_used_count : null,
                'expires_at' => $voucher->avi_expires_at,
            ],
            'discount' => round($discount, 2),
            'rule' => $voucherValidation['rule'],
        ]);
    }

    public function validateEgc(Request $request)
    {
        $validated = $request->validate([
            'subtotal' => 'nullable|numeric|min:0',
            'product_id' => 'nullable|integer|min:1',
            'voucher_discount' => 'nullable|numeric|min:0',
        ]);

        $authenticatedRequestUser = $request->user();
        $customerId = $authenticatedRequestUser instanceof \App\Models\Customer
            ? (int) $authenticatedRequestUser->getAuthIdentifier()
            : (auth('sanctum')->id() ? (int) auth('sanctum')->id() : null);

        if (!$customerId) {
            return response()->json([
                'valid' => true,
                'message' => 'Please sign in to use E-GC.',
                'available_balance' => 0.0,
                'discount' => 0.0,
                'rule' => null,
            ]);
        }

        $subtotal = (float) ($validated['subtotal'] ?? 0);
        $voucherDiscount = (float) ($validated['voucher_discount'] ?? 0);
        $remainingSubtotal = round(max(0, $subtotal - $voucherDiscount), 2);
        $availableEgcBalance = $this->customerEgcBalance((int) $customerId);
        $requestedAmount = round(min($availableEgcBalance, $remainingSubtotal), 2);

        if ($requestedAmount <= 0) {
            return response()->json([
                'valid' => true,
                'message' => null,
                'available_balance' => $availableEgcBalance,
                'discount' => 0.0,
                'rule' => null,
            ]);
        }

        $egcValidation = $this->computeStoreCreditDiscountForProduct(
            $requestedAmount,
            (int) ($validated['product_id'] ?? 0),
            $remainingSubtotal
        );

        return response()->json([
            'valid' => (bool) $egcValidation['valid'],
            'message' => $egcValidation['message'],
            'available_balance' => $availableEgcBalance,
            'discount' => round((float) $egcValidation['discount'], 2),
            'rule' => $egcValidation['rule'],
        ]);
    }

    public function validateCashback(Request $request)
    {
        $validated = $request->validate([
            'subtotal' => 'nullable|numeric|min:0',
            'product_id' => 'nullable|integer|min:1',
            'voucher_discount' => 'nullable|numeric|min:0',
        ]);

        $authenticatedRequestUser = $request->user();
        $customerId = $authenticatedRequestUser instanceof \App\Models\Customer
            ? (int) $authenticatedRequestUser->getAuthIdentifier()
            : (auth('sanctum')->id() ? (int) auth('sanctum')->id() : null);

        if (!$customerId) {
            return response()->json([
                'valid' => true,
                'message' => 'Please sign in to use personal cashback.',
                'available_balance' => 0.0,
                'discount' => 0.0,
                'rule' => null,
            ]);
        }

        $subtotal = (float) ($validated['subtotal'] ?? 0);
        $voucherDiscount = (float) ($validated['voucher_discount'] ?? 0);
        $remainingSubtotal = round(max(0, $subtotal - $voucherDiscount), 2);
        $availableCashbackBalance = PersonalPurchaseCashback::availableBalance((int) $customerId);
        $requestedAmount = round(min($availableCashbackBalance, $remainingSubtotal), 2);

        if ($requestedAmount <= 0) {
            return response()->json([
                'valid' => true,
                'message' => null,
                'available_balance' => $availableCashbackBalance,
                'discount' => 0.0,
                'rule' => null,
            ]);
        }

        $cashbackValidation = $this->computeStoreCreditDiscountForProduct(
            $requestedAmount,
            (int) ($validated['product_id'] ?? 0),
            $remainingSubtotal,
            'personal cashback'
        );

        return response()->json([
            'valid' => (bool) $cashbackValidation['valid'],
            'message' => $cashbackValidation['message'],
            'available_balance' => $availableCashbackBalance,
            'discount' => round((float) $cashbackValidation['discount'], 2),
            'rule' => $cashbackValidation['rule'],
        ]);
    }

    public function verifyCheckoutSession(Request $request, string $checkoutId)
    {
        $paymentMode = $this->resolveCheckoutPaymentMode($checkoutId, $request->query('payment_mode'), $request);
        $secretKey = $this->getPaymongoConfig($paymentMode, $request)['secret_key'];
        if (!$secretKey) {
            return response()->json(['message' => sprintf('PayMongo %s secret key is missing.', $paymentMode)], 500);
        }

        try {
            $res = Http::withBasicAuth($secretKey, '')
                ->get($this->paymongoApiUrl("/v1/checkout_sessions/{$checkoutId}", $paymentMode));
        } catch (\Throwable $e) {
            $isLocalSslError = app()->environment(['local', 'development'])
                && str_contains(strtolower($e->getMessage()), 'curl error 60');

            if ($isLocalSslError) {
                try {
                    Log::warning('Retrying PayMongo verify with SSL verification disabled for local environment.', [
                        'checkout_id' => $checkoutId,
                        'payment_mode' => $paymentMode,
                    ]);

                    $res = Http::withOptions(['verify' => false])
                        ->withBasicAuth($secretKey, '')
                        ->get($this->paymongoApiUrl("/v1/checkout_sessions/{$checkoutId}", $paymentMode));
                } catch (\Throwable $retryError) {
                    Log::warning('PayMongo verify retry (verify=false) failed.', [
                        'checkout_id' => $checkoutId,
                        'payment_mode' => $paymentMode,
                        'error' => $retryError->getMessage(),
                    ]);

                    return response()->json([
                        'message' => 'Unable to contact payment provider for verification.',
                        'error' => $retryError->getMessage(),
                    ], 502);
                }
            } else {
            Log::warning('PayMongo verify request crashed.', [
                'checkout_id' => $checkoutId,
                'payment_mode' => $paymentMode,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Unable to contact payment provider for verification.',
                'error' => $e->getMessage(),
            ], 502);
            }
        }

        if ($res->failed()) {
            return response()->json([
                'message' => 'PayMongo verify failed',
                'error' => $res->json(),
            ], $res->status());
        }

        $attrs = $res->json('data.attributes');
        $status = $this->resolveCheckoutStatusForStorage(is_array($attrs) ? $attrs : []);
        $attrs['status'] = $status;

        $hasCachedCustomer = false;
        try {
            $hasCachedCustomer = Cache::has("checkout_customer:{$checkoutId}");
        } catch (\Throwable $e) {
            Log::warning('Cache unavailable while checking checkout customer cache.', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);
        }

        Log::info('Checkout verify response received', [
            'checkout_id' => $checkoutId,
            'status' => $status,
            'has_cached_customer' => $hasCachedCustomer,
        ]);

        try {
            $this->persistCheckoutHistoryIfNeeded($checkoutId, $attrs);
        } catch (\Throwable $e) {
            Log::warning('Failed to persist checkout history during verification.', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);
        }

        if ($this->isPaidStatus($status)) {
            try {
                $this->sendCheckoutCompletedEmailIfNeeded($checkoutId, $attrs);
            } catch (\Throwable $e) {
                Log::warning('Failed to send checkout completed email.', [
                    'checkout_id' => $checkoutId,
                    'error' => $e->getMessage(),
                ]);
            }

            $order = CheckoutHistory::query()
                ->where('ch_checkout_id', $checkoutId)
                ->first();

            if ($order && (int) $order->ch_customer_id > 0) {
                $this->notifyCustomerOrderStatusUpdate(
                    $order,
                    'payment_success',
                    'Payment Successful',
                    "Your payment for order #{$checkoutId} has been successfully processed. Your order is now being prepared."
                );
            }
        }

        $cachedCustomer = null;
        try {
            $cachedCustomer = Cache::get("checkout_customer:{$checkoutId}");
        } catch (\Throwable $e) {
            Log::warning('Cache unavailable while reading checkout customer payload.', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);
        }
        $order = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->first();

        // Block cross-user PII access: an authenticated user must own this checkout.
        // Guest checkouts (ch_customer_id = 0/null) are exempt — the checkout ID is their proof.
        $requestUser = $request->user();
        if (
            $order !== null
            && $requestUser !== null
            && (int) ($order->ch_customer_id ?? 0) > 0
            && (int) $order->ch_customer_id !== (int) $requestUser->getAuthIdentifier()
        ) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $customerPayload = [
            'name' => is_array($cachedCustomer) ? ($cachedCustomer['name'] ?? null) : null,
            'email' => is_array($cachedCustomer) ? ($cachedCustomer['email'] ?? null) : null,
            'phone' => is_array($cachedCustomer) ? ($cachedCustomer['phone'] ?? null) : null,
            'address' => is_array($cachedCustomer) ? ($cachedCustomer['address'] ?? null) : null,
        ];

        $orderSummaryPayload = [
            'description' => is_array($cachedCustomer) ? ($cachedCustomer['description'] ?? null) : null,
            'amount' => is_array($cachedCustomer) ? ($cachedCustomer['amount'] ?? null) : null,
            'shipping_fee' => is_array($cachedCustomer) ? ($cachedCustomer['shipping_fee'] ?? null) : null,
            'payment_method' => is_array($cachedCustomer) ? ($cachedCustomer['payment_method'] ?? null) : null,
            'product_name' => is_array($cachedCustomer['order'] ?? null) ? ($cachedCustomer['order']['product_name'] ?? null) : null,
            'product_sku' => is_array($cachedCustomer['order'] ?? null) ? ($cachedCustomer['order']['product_sku'] ?? null) : null,
            'quantity' => is_array($cachedCustomer['order'] ?? null) ? ($cachedCustomer['order']['quantity'] ?? null) : null,
        ];

        if ($order) {
            $customerPayload = [
                'name' => $order->ch_customer_name ?: ($customerPayload['name'] ?? null),
                'email' => $order->ch_customer_email ?: ($customerPayload['email'] ?? null),
                'phone' => $order->ch_customer_phone ?: ($customerPayload['phone'] ?? null),
                'address' => $order->ch_customer_address ?: ($customerPayload['address'] ?? null),
            ];

            $orderSummaryPayload = [
                'description' => $order->ch_description ?: ($orderSummaryPayload['description'] ?? null),
                'amount' => $order->ch_amount ?? ($orderSummaryPayload['amount'] ?? null),
                'shipping_fee' => $order->ch_shipping_fee ?? ($orderSummaryPayload['shipping_fee'] ?? null),
                'payment_method' => $order->ch_payment_method ?: ($orderSummaryPayload['payment_method'] ?? null),
                'product_name' => $order->ch_product_name ?: ($orderSummaryPayload['product_name'] ?? null),
                'product_sku' => $order->ch_product_sku ?: ($orderSummaryPayload['product_sku'] ?? null),
                'quantity' => $order->ch_quantity ?: ($orderSummaryPayload['quantity'] ?? null),
            ];
        }

        return response()->json([
            'checkout_id' => $checkoutId,
            'payment_intent_id' => $attrs['payment_intent']['id'] ?? null,
            'status' => $status, // usually paid / unpaid / failed
            'payment_mode' => $paymentMode,
            'customer' => $customerPayload,
            'order_summary' => $orderSummaryPayload,
        ]);
    }

    public function handlePaymongoWebhook(Request $request)
    {
        $payload = $request->json()->all();
        $rawBody = $request->getContent();
        $signatureHeader = (string) $request->header('Paymongo-Signature', '');

        // EARLY ENTRY LOG - This should always appear if webhook is called
        Log::info('PayMongo webhook RECEIVED', [
            'ip' => $request->ip(),
            'has_payload' => !empty($payload),
            'has_signature' => !empty($signatureHeader),
            'event_type' => data_get($payload, 'data.attributes.type', 'unknown'),
        ]);

        if (!$this->isValidPaymongoWebhookSignature($rawBody, $signatureHeader)) {
            Log::warning('PayMongo webhook rejected: invalid signature.', [
                'has_signature' => $signatureHeader !== '',
                'ip' => $request->ip(),
            ]);
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        $eventType = strtolower((string) data_get($payload, 'data.attributes.type', ''));
        $paidEventTypes   = ['checkout_session.payment.paid', 'checkout_session.paid', 'payment.paid'];
        $failedEventTypes = ['checkout_session.payment.failed', 'payment.failed'];

        if (!in_array($eventType, $paidEventTypes, true) && !in_array($eventType, $failedEventTypes, true)) {
            Log::info('PayMongo webhook ignored: unsupported event type.', [
                'event_type' => $eventType ?: 'unknown',
            ]);
            return response()->json([
                'received' => true,
                'processed' => false,
                'reason' => 'unsupported_event',
                'event_type' => $eventType ?: null,
            ]);
        }

        $checkoutId = $this->extractCheckoutIdFromWebhook($payload);
        Log::info('PayMongo webhook extracted checkout_id', [
            'checkout_id' => $checkoutId,
            'event_type' => $eventType,
            'payload_checkout_id' => data_get($payload, 'data.attributes.data.id'),
        ]);

        if (!$checkoutId) {
            Log::warning('PayMongo webhook ignored: checkout id missing.', ['event_type' => $eventType]);
            return response()->json([
                'received' => true,
                'processed' => false,
                'reason' => 'missing_checkout_id',
            ], 202);
        }

        if (in_array($eventType, $failedEventTypes, true)) {
            CheckoutHistory::where('ch_checkout_id', $checkoutId)
                ->update(['ch_status' => 'failed']);

            OrderNotification::updateStatusForCheckout($checkoutId, 'cancelled');

            Log::info('PayMongo webhook processed: payment failed.', [
                'checkout_id' => $checkoutId,
                'event_type'  => $eventType,
            ]);

            return response()->json([
                'received'    => true,
                'processed'   => true,
                'checkout_id' => $checkoutId,
                'status'      => 'failed',
            ]);
        }

        $attrs = $this->extractCheckoutAttributesFromWebhook($payload);
        $attrs['status'] = $attrs['status'] ?? 'paid';
        $attrs = $this->hydrateCheckoutAttributesIfNeeded($checkoutId, $attrs);

        // Debug: Check if notification exists before update
        $notificationExists = \App\Models\OrderNotification::query()
            ->where('on_checkout_id', $checkoutId)
            ->exists();

        // Also check order exists for comparison
        $orderExists = \App\Models\CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->exists();

        // Get actual notification record details
        $notificationRecord = \App\Models\OrderNotification::query()
            ->where('on_checkout_id', $checkoutId)
            ->first();

        Log::info('PayMongo webhook lookup comparison', [
            'checkout_id' => $checkoutId,
            'notification_exists' => $notificationExists,
            'order_exists' => $orderExists,
            'notification_found' => $notificationRecord ? [
                'on_id' => $notificationRecord->on_id,
                'on_checkout_id' => $notificationRecord->on_checkout_id,
                'on_status' => $notificationRecord->on_status,
                'on_customer_id' => $notificationRecord->on_customer_id,
            ] : null,
        ]);

        $this->persistCheckoutHistoryIfNeeded($checkoutId, $attrs);

        $isPaid = $this->isPaidStatus($attrs['status'] ?? 'paid');
        Log::info('PayMongo webhook payment check', [
            'checkout_id' => $checkoutId,
            'status' => $attrs['status'] ?? 'paid',
            'is_paid' => $isPaid,
        ]);

        if ($isPaid) {
            $this->sendCheckoutCompletedEmailIfNeeded($checkoutId, $attrs);

            Log::info('Updating order notification for paid status', [
                'checkout_id' => $checkoutId,
                'status' => 'paid',
            ]);

            try {
                OrderNotification::updateStatusForCheckout($checkoutId, 'paid');
                Log::info('Order notification update completed successfully', [
                    'checkout_id' => $checkoutId,
                ]);

                // Get the order to send FCM push notification with customized message from OrderNotification
                $order = CheckoutHistory::query()
                    ->where('ch_checkout_id', $checkoutId)
                    ->first();

                if ($order && $order->ch_customer_id) {
                    $orderNotification = OrderNotification::query()
                        ->where('on_checkout_id', $checkoutId)
                        ->where('on_customer_id', $order->ch_customer_id)
                        ->first();

                    if ($orderNotification) {
                        $this->notifyCustomerOrderStatusUpdate(
                            $order,
                            'payment_confirmed',
                            (string) ($orderNotification->on_title ?? 'Payment Confirmed'),
                            (string) ($orderNotification->on_message ?? 'Your payment has been confirmed.')
                        );
                    }
                }

                // Remove cart items after successful payment
                $this->removeOrderItemsFromCart($checkoutId);

                // Send confirmation email for mobile orders after payment
                $mobileOrder = CheckoutHistory::query()
                    ->where('ch_checkout_id', $checkoutId)
                    ->where('ch_is_mobile', true)
                    ->first();

                if ($mobileOrder) {
                    MobilePaymentController::sendOrderConfirmationEmailAfterPayment($mobileOrder, $attrs['payment_method'] ?? '');
                }
            } catch (\Throwable $e) {
                Log::error('Order notification update FAILED', [
                    'checkout_id' => $checkoutId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        Log::info('PayMongo webhook processed.', [
            'event_type' => $eventType,
            'checkout_id' => $checkoutId,
            'status' => $attrs['status'] ?? null,
        ]);

        return response()->json([
            'received' => true,
            'processed' => true,
            'checkout_id' => $checkoutId,
            'status' => $attrs['status'] ?? null,
            'payment_intent_id' => data_get($attrs, 'payment_intent.id'),
        ]);
    }


    private function sendCheckoutCompletedEmailIfNeeded(string $checkoutId, array $attrs): void
    {
        $customer = Cache::get("checkout_customer:{$checkoutId}");
        $order = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->first();

        $cachedEmail = is_array($customer) ? trim((string) ($customer['email'] ?? '')) : '';
        $orderEmail = $order ? trim((string) ($order->ch_customer_email ?? '')) : '';
        $resolvedRecipient = $cachedEmail !== '' ? $cachedEmail : $orderEmail;

        $orderDetails = is_array($customer['order'] ?? null) ? $customer['order'] : [];
        if ($order) {
            $orderDetails = [
                'product_name' => $order->ch_product_name ?? null,
                'product_sku' => $order->ch_product_sku ?? null,
                'quantity' => $order->ch_quantity ?? 1,
                'selected_color' => $order->ch_selected_color ?? null,
                'selected_size' => $order->ch_selected_size ?? null,
                'selected_type' => $order->ch_selected_type ?? null,
            ];
        }

        $mailPayload = $this->buildCheckoutCompletedMailPayload($checkoutId, $attrs, is_array($customer) ? $customer : [], $order, $orderDetails);

        if ($resolvedRecipient === '') {
            Log::warning('Checkout email skipped: missing customer email', [
                'checkout_id' => $checkoutId,
                'has_cached_customer' => (bool) $customer,
                'has_order_record' => (bool) $order,
            ]);
        } else {
            $recipient = env('MAIL_TEST_TO') ?: $resolvedRecipient;
            $notifiedKey = "checkout_email_sent:{$checkoutId}";
            if (!Cache::add($notifiedKey, true, now()->addDays(7))) {
                Log::info('Checkout email skipped: already sent', ['checkout_id' => $checkoutId]);
            } else {
                try {
                    $this->sendCheckoutMailWithFallback($recipient, new CheckoutCompletedMail($mailPayload));

                    Log::info('Checkout email sent', [
                        'checkout_id' => $checkoutId,
                        'recipient' => $recipient,
                        'mailer' => app()->environment(['local', 'development']) ? $this->resolvePreferredCheckoutMailer().'|fallback-possible' : $this->resolvePreferredCheckoutMailer(),
                    ]);
                } catch (\Throwable $e) {
                    Cache::forget($notifiedKey);
                    Log::error('Checkout email send failed', [
                        'checkout_id' => $checkoutId,
                        'recipient' => $recipient,
                        'error' => $e->getMessage(),
                    ]);
                    report($e);
                }
            }
        }

        try {
            $this->sendPartnerStorefrontOrderEmailIfNeeded($checkoutId, $mailPayload, is_array($customer) ? $customer : [], $order);
        } catch (\Throwable $e) {
            Log::error('Partner storefront order email pipeline failed', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);
            report($e);
        }
    }

    private function buildCheckoutCompletedMailPayload(
        string $checkoutId,
        array $attrs,
        array $customer,
        ?CheckoutHistory $order,
        array $orderDetails
    ): array {
        $voucher = is_array($customer['voucher'] ?? null) ? $customer['voucher'] : [];
        $paymentStatus = (string) ($attrs['status'] ?? 'paid');
        $approvalStatus = (string) ($order?->ch_approval_status ?? 'pending_approval');

        $displayStatus = $this->isPaidStatus($paymentStatus) && $approvalStatus === 'pending_approval'
            ? 'pending approval'
            : $paymentStatus;

        return [
            'checkout_id' => $checkoutId,
            'customer_name' => $customer['name'] ?? ($order?->ch_customer_name ?? 'Customer'),
            'customer_email' => $customer['email'] ?? ($order?->ch_customer_email ?? null),
            'customer_phone' => $customer['phone'] ?? ($order?->ch_customer_phone ?? null),
            'description' => $customer['description'] ?? ($order?->ch_description ?? 'Order'),
            'amount' => $customer['amount'] ?? ($order?->ch_amount ?? 0),
            'payment_method' => $customer['payment_method'] ?? ($order?->ch_payment_method ?? null),
            'status' => $paymentStatus,
            'order_status_label' => $displayStatus,
            'payment_intent_id' => $attrs['payment_intent']['id'] ?? null,
            'shipping_address' => $customer['address'] ?? ($order?->ch_customer_address ?? null),
            'referred_by' => $customer['referred_by'] ?? null,
            'source_label' => $customer['source_label'] ?? ($order?->ch_source_label ?? null),
            'source_slug' => $customer['source_slug'] ?? ($order?->ch_source_slug ?? null),
            'source_url' => $customer['source_url'] ?? null,
            'voucher' => [
                'code' => $voucher['code'] ?? null,
                'discount' => (float) ($voucher['discount'] ?? 0),
            ],
            'order' => [
                'product_name' => $orderDetails['product_name'] ?? null,
                'product_sku' => $orderDetails['product_sku'] ?? null,
                'quantity' => $orderDetails['quantity'] ?? 1,
                'selected_color' => $orderDetails['selected_color'] ?? null,
                'selected_size' => $orderDetails['selected_size'] ?? null,
                'selected_type' => $orderDetails['selected_type'] ?? null,
            ],
        ];
    }

    private function sendPartnerStorefrontOrderEmailIfNeeded(
        string $checkoutId,
        array $mailPayload,
        array $customer,
        ?CheckoutHistory $order
    ): void {
        $sourceSlug = $this->resolvePartnerStorefrontSlugFromMailPayload($mailPayload);
        if ($sourceSlug === '') {
            Log::info('Partner storefront order email skipped: missing storefront source slug', [
                'checkout_id' => $checkoutId,
                'source_label' => $mailPayload['source_label'] ?? null,
                'source_url' => $mailPayload['source_url'] ?? null,
            ]);
            return;
        }

        $storefront = $this->findPartnerStorefrontBySlug($sourceSlug);
        if (!$storefront) {
            Log::info('Partner storefront order email skipped: storefront not found', [
                'checkout_id' => $checkoutId,
                'source_slug' => $sourceSlug,
            ]);
            return;
        }

        $notificationEmail = $this->extractPartnerStorefrontNotificationEmail($storefront);
        if ($notificationEmail === '') {
            Log::info('Partner storefront order email skipped: missing notification email', [
                'checkout_id' => $checkoutId,
                'source_slug' => $sourceSlug,
            ]);
            return;
        }

        $recipient = env('MAIL_TEST_TO') ?: $notificationEmail;
        $notifiedKey = "checkout_partner_email_sent:{$checkoutId}";
        if (!Cache::add($notifiedKey, true, now()->addDays(7))) {
            Log::info('Partner storefront order email skipped: already sent', ['checkout_id' => $checkoutId]);
            return;
        }

        try {
            $this->sendCheckoutMailWithFallback($recipient, new PartnerStorefrontGuestOrderMail([
                ...$mailPayload,
                'storefront_display_name' => $this->extractPartnerStorefrontDisplayName($storefront),
                'storefront_notification_email' => $notificationEmail,
            ]));

            Log::info('Partner storefront order email sent', [
                'checkout_id' => $checkoutId,
                'recipient' => $recipient,
                'source_slug' => $sourceSlug,
                'mailer' => app()->environment(['local', 'development']) ? $this->resolvePreferredCheckoutMailer().'|fallback-possible' : $this->resolvePreferredCheckoutMailer(),
            ]);
        } catch (\Throwable $e) {
            Cache::forget($notifiedKey);
            Log::error('Partner storefront order email send failed', [
                'checkout_id' => $checkoutId,
                'recipient' => $recipient,
                'source_slug' => $sourceSlug,
                'error' => $e->getMessage(),
            ]);
            report($e);
        }
    }

    private function sendCheckoutMailWithFallback(string $recipient, mixed $mailable): void
    {
        $preferredMailer = $this->resolvePreferredCheckoutMailer();

        try {
            Mail::mailer($preferredMailer)->to($recipient)->send($mailable);
            return;
        } catch (\Throwable $e) {
            $isLocalLike = app()->environment(['local', 'development']);
            $looksLikeSsl = str_contains(strtolower($e->getMessage()), 'ssl certificate')
                || str_contains(strtolower($e->getMessage()), 'curl error 60');

            if (!$isLocalLike || !$looksLikeSsl || $preferredMailer !== 'resend') {
                throw $e;
            }

            Log::warning('Resend SSL issue in local/dev, falling back to log mailer.', [
                'recipient' => $recipient,
                'error' => $e->getMessage(),
            ]);

            Mail::mailer('log')->to($recipient)->send($mailable);
        }
    }

    private function resolvePreferredCheckoutMailer(): string
    {
        $mailer = trim((string) env('MAIL_MAILER', 'resend'));
        return $mailer !== '' ? $mailer : 'resend';
    }

    private function findPartnerStorefrontBySlug(string $slug): ?WebPageContent
    {
        $normalizedSlug = strtolower(trim($slug));
        if ($normalizedSlug === '') {
            return null;
        }

        $storefronts = WebPageContent::query()
            ->whereIn('wpc_type', ['partner-storefront', 'partner-storefronts'])
            ->orderByDesc('wpc_status')
            ->get();

        $matched = $storefronts->first(function (WebPageContent $storefront) use ($normalizedSlug) {
            $key = strtolower(trim((string) ($storefront->wpc_key ?? '')));
            $payloadSlug = strtolower(trim((string) data_get($storefront->wpc_payload, 'fields.slug', '')));
            return $key === $normalizedSlug || $payloadSlug === $normalizedSlug;
        });

        return $matched instanceof WebPageContent ? $matched : null;
    }

    private function extractPartnerStorefrontNotificationEmail(WebPageContent $storefront): string
    {
        $email = trim((string) data_get($storefront->wpc_payload, 'fields.notification_email', ''));
        if ($email !== '') {
            return $email;
        }

        $legacyEmail = trim((string) data_get($storefront->wpc_payload, 'notification_email', ''));
        if ($legacyEmail !== '') {
            return $legacyEmail;
        }

        return '';
    }

    private function extractPartnerStorefrontDisplayName(WebPageContent $storefront): string
    {
        return trim((string) (
            data_get($storefront->wpc_payload, 'fields.display_name', '')
            ?: $storefront->wpc_title
            ?: $storefront->wpc_key
            ?: 'Partner Storefront'
        ));
    }

    private function resolvePartnerStorefrontSlugFromMailPayload(array $mailPayload): string
    {
        $sourceSlug = strtolower(trim((string) ($mailPayload['source_slug'] ?? '')));
        if ($sourceSlug !== '') {
            return $sourceSlug;
        }

        $sourceUrl = trim((string) ($mailPayload['source_url'] ?? ''));
        if ($sourceUrl !== '') {
            $path = trim((string) parse_url($sourceUrl, PHP_URL_PATH));
            if ($path !== '') {
                if (preg_match('#^/shop/([^/?\#]+)#i', $path, $matches)) {
                    return strtolower(trim((string) ($matches[1] ?? '')));
                }

                if (preg_match('#^/([^/?\#]+)/(product|category|checkout|track-order)(?:/|$)#i', $path, $matches)) {
                    return strtolower(trim((string) ($matches[1] ?? '')));
                }
            }
        }

        $sourceLabel = trim((string) ($mailPayload['source_label'] ?? ''));
        if ($sourceLabel !== '') {
            return Str::slug($sourceLabel);
        }

        return '';
    }

    public function checkoutHistory(Request $request)
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $checkoutRecords = CheckoutHistory::query()
            ->where('ch_customer_id', (int) $customer->getAuthIdentifier())
            ->orderByRaw('COALESCE(ch_paid_at, created_at) DESC')
            ->orderByDesc('ch_id')
            ->get();

        // Group by checkout_id to handle multiple items per order
        $groupedOrders = $checkoutRecords->groupBy('ch_checkout_id')->map(function ($itemsGroup) {
            $firstItem = $itemsGroup->first();
            $trackingNo = $this->resolveOrderTrackingNumber($firstItem);
            $paymentStatus = $this->mapCheckoutStatusToOrderStatus((string) $firstItem->ch_status);
            $fulfillmentStatus = $firstItem->ch_fulfillment_status ?: 'pending';
            $status = $fulfillmentStatus !== 'pending' ? $fulfillmentStatus : $paymentStatus;

            // Build items array from all records with same checkout_id
            $items = $itemsGroup->map(function (CheckoutHistory $order) use ($itemsGroup) {
                $quantity = max(1, (int) $order->ch_quantity);
                $itemName = $order->ch_product_name ?: ($order->ch_description ?: 'Order Item');

                return [
                    'id' => (int) $order->ch_id,
                    'product_id' => $order->ch_product_id ? (int) $order->ch_product_id : null,
                    'name' => $itemName,
                    'image' => $order->ch_product_image ?: '/Images/HeroSection/sofas.jpg',
                    'quantity' => $quantity,
                    'price' => max(0, (float) $order->ch_amount),
                    'selected_color' => $order->ch_selected_color ?: null,
                    'selected_size' => $order->ch_selected_size ?: null,
                    'selected_type' => $order->ch_selected_type ?: null,
                ];
            })->values()->all();

            return [
                'id' => (int) $firstItem->ch_id,
                'order_number' => $firstItem->ch_checkout_id,
                'status' => $status,
                'payment_status' => $paymentStatus,
                'fulfillment_status' => $fulfillmentStatus,
                'items' => $items,
                'total_amount' => (float) $itemsGroup->sum('ch_amount'),
                'shipping_fee' => (float) ($firstItem->ch_shipping_fee ?? 0),
                'payment_method' => $this->formatPaymentMethod((string) ($firstItem->ch_payment_method ?? '')),
                'courier' => $firstItem->ch_courier ?: null,
                'shipment_status' => $firstItem->ch_shipment_status ?: null,
                'tracking_no' => $trackingNo,
                'tracking_number' => $trackingNo,
                'refund_reason' => $firstItem->ch_refund_reason ?: null,
                'refund_image_urls' => is_array($firstItem->ch_refund_image_urls) ? array_values($firstItem->ch_refund_image_urls) : [],
                'refund_video_urls' => is_array($firstItem->ch_refund_video_urls) ? array_values($firstItem->ch_refund_video_urls) : [],
                'refund_requested_at' => optional($firstItem->ch_refund_requested_at)->toDateTimeString(),
                'created_at' => optional($firstItem->ch_paid_at ?? $firstItem->created_at)->toDateTimeString(),
            ];
        })->values()->all();

        return response()->json([
            'orders' => $groupedOrders,
            'total' => count($groupedOrders),
        ]);
    }

    public function orderCounts(Request $request)
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $customerId = (int) $customer->getAuthIdentifier();
        $base = CheckoutHistory::query()->where('ch_customer_id', $customerId);

        return response()->json([
            'all' => (int) (clone $base)->count(),
            'pending' => (int) (clone $base)->where(function ($q) {
                $q->where('ch_approval_status', 'pending_approval')
                    ->orWhere('ch_fulfillment_status', 'pending');
            })->whereNotIn('ch_status', ['paid', 'succeeded', 'success'])->count(),
            'processing' => (int) (clone $base)->whereIn('ch_fulfillment_status', ['processing', 'packed'])->count(),
            'shipped' => (int) (clone $base)->where('ch_fulfillment_status', 'shipped')->count(),
            'to_receive' => (int) (clone $base)->where('ch_fulfillment_status', 'out_for_delivery')->count(),
            'out_for_delivery' => (int) (clone $base)->where('ch_fulfillment_status', 'out_for_delivery')->count(),
            'delivered' => (int) (clone $base)->where('ch_fulfillment_status', 'delivered')->count(),
            'cancelled' => (int) (clone $base)->whereIn('ch_fulfillment_status', ['cancelled', 'refunded'])->count(),
            'completed' => (int) (clone $base)->where('ch_fulfillment_status', 'delivered')->count(),
            'paid' => (int) (clone $base)->whereIn('ch_status', ['paid', 'succeeded', 'success'])->where('ch_fulfillment_status', 'pending')->count(),
        ]);
    }

    public function confirmOrder(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'review' => 'required|string|min:3|max:2000',
            'review_image' => 'nullable|image|max:10240',
            'review_video' => 'nullable|file|mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
            'review_images' => 'nullable|array|max:10',
            'review_images.*' => 'image|max:10240',
            'review_videos' => 'nullable|array|max:5',
            'review_videos.*' => 'file|mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
        ]);

        $order = CheckoutHistory::query()
            ->where('ch_id', $id)
            ->where('ch_customer_id', (int) $customer->getAuthIdentifier())
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if ($order->ch_fulfillment_status !== 'out_for_delivery') {
            return response()->json(['message' => 'Order is not eligible for confirmation.'], 422);
        }

        $existingReview = ProductReview::query()
            ->where('pr_order_id', (int) $order->ch_id)
            ->where('pr_customer_id', (int) $customer->getAuthIdentifier())
            ->first();

        if ($existingReview) {
            return response()->json(['message' => 'Review already submitted.'], 409);
        }

        $reviewImageUrls = [];
        if ($request->hasFile('review_images')) {
            try {
                $cloudinary = app(CloudinaryUploadService::class);
                foreach ((array) $request->file('review_images') as $imageFile) {
                    if (! $imageFile) {
                        continue;
                    }
                    $upload = $cloudinary->uploadImage($imageFile, 'afhome/reviews/images');
                    $reviewImageUrls[] = (string) ($upload['secure_url'] ?? '');
                }
            } catch (RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }
        }

        $reviewVideoUrls = [];
        if ($request->hasFile('review_videos')) {
            try {
                $cloudinary = app(CloudinaryUploadService::class);
                foreach ((array) $request->file('review_videos') as $videoFile) {
                    if (! $videoFile) {
                        continue;
                    }
                    $upload = $cloudinary->uploadVideo($videoFile, 'afhome/reviews/videos');
                    $reviewVideoUrls[] = (string) ($upload['secure_url'] ?? '');
                }
            } catch (RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }
        }

        if ($request->hasFile('review_image')) {
            try {
                $upload = app(CloudinaryUploadService::class)->uploadImage(
                    $request->file('review_image'),
                    'afhome/reviews/images'
                );
                $reviewImageUrls[] = (string) ($upload['secure_url'] ?? '');
            } catch (RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }
        }

        if ($request->hasFile('review_video')) {
            try {
                $upload = app(CloudinaryUploadService::class)->uploadVideo(
                    $request->file('review_video'),
                    'afhome/reviews/videos'
                );
                $reviewVideoUrls[] = (string) ($upload['secure_url'] ?? '');
            } catch (RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }
        }

        $reviewImageUrls = array_values(array_unique(array_filter($reviewImageUrls)));
        $reviewVideoUrls = array_values(array_unique(array_filter($reviewVideoUrls)));

        \Illuminate\Support\Facades\DB::transaction(function () use ($order, $customer, $validated, $reviewImageUrls, $reviewVideoUrls) {
            ProductReview::create([
                'pr_product_id' => (int) ($order->ch_product_id ?? 0),
                'pr_customer_id' => (int) $customer->getAuthIdentifier(),
                'pr_order_id' => (int) $order->ch_id,
                'pr_rating' => (int) $validated['rating'],
                'pr_review' => (string) $validated['review'],
                'pr_image_url' => $reviewImageUrls[0] ?? null,
                'pr_video_url' => $reviewVideoUrls[0] ?? null,
                'pr_image_urls' => ! empty($reviewImageUrls) ? $reviewImageUrls : null,
                'pr_video_urls' => ! empty($reviewVideoUrls) ? $reviewVideoUrls : null,
            ]);

            $order->ch_fulfillment_status = 'delivered';
            if (empty($order->ch_shipment_status) || $order->ch_shipment_status === 'out_for_delivery') {
                $order->ch_shipment_status = 'delivered';
            }
            if (!$order->ch_shipped_at) {
                $order->ch_shipped_at = now();
            }
            $order->save();

            OrderPvPosting::postIfNeeded($order, (int) $customer->getAuthIdentifier());
            DirectReferralCommission::releaseAvailableForOrder($order, (int) $customer->getAuthIdentifier());
        });

        return response()->json([
            'message' => 'Order confirmed and review submitted.',
        ]);
    }

    public function refundOrder(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:2000',
            'refund_images' => 'nullable|array|max:10',
            'refund_images.*' => 'image|max:10240',
            'refund_videos' => 'nullable|array|max:5',
            'refund_videos.*' => 'file|mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
        ]);

        $order = CheckoutHistory::query()
            ->where('ch_id', $id)
            ->where('ch_customer_id', (int) $customer->getAuthIdentifier())
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if ($order->ch_fulfillment_status !== 'out_for_delivery') {
            return response()->json(['message' => 'Order is not eligible for refund at this stage.'], 422);
        }

        $refundImageUrls = [];
        if ($request->hasFile('refund_images')) {
            try {
                $cloudinary = app(CloudinaryUploadService::class);
                foreach ((array) $request->file('refund_images') as $imageFile) {
                    if (!$imageFile) {
                        continue;
                    }
                    $upload = $cloudinary->uploadImage($imageFile, 'afhome/refunds/images');
                    $refundImageUrls[] = (string) ($upload['secure_url'] ?? '');
                }
            } catch (RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }
        }

        $refundVideoUrls = [];
        if ($request->hasFile('refund_videos')) {
            try {
                $cloudinary = app(CloudinaryUploadService::class);
                foreach ((array) $request->file('refund_videos') as $videoFile) {
                    if (!$videoFile) {
                        continue;
                    }
                    $upload = $cloudinary->uploadVideo($videoFile, 'afhome/refunds/videos');
                    $refundVideoUrls[] = (string) ($upload['secure_url'] ?? '');
                }
            } catch (RuntimeException $exception) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }
        }

        $refundImageUrls = array_values(array_unique(array_filter($refundImageUrls)));
        $refundVideoUrls = array_values(array_unique(array_filter($refundVideoUrls)));

        $order->ch_fulfillment_status = 'refunded';
        if (empty($order->ch_shipment_status) || $order->ch_shipment_status === 'out_for_delivery') {
            $order->ch_shipment_status = 'refunded';
        }
        $order->ch_refund_reason = (string) $validated['reason'];
        $order->ch_refund_image_urls = !empty($refundImageUrls) ? $refundImageUrls : null;
        $order->ch_refund_video_urls = !empty($refundVideoUrls) ? $refundVideoUrls : null;
        $order->ch_refund_requested_at = now();
        $order->save();

        $this->notifyCustomerOrderStatusUpdate(
            $order,
            'order_refund_requested',
            'Refund requested',
            'Your refund request was submitted and is now under review.',
        );

        return response()->json([
            'message' => 'Refund request submitted successfully.',
        ]);
    }

    public function trackGuestOrder(Request $request)
    {
        $validated = $request->validate([
            'order_number' => 'required|string|max:255',
            'contact' => 'required|string|max:255',
        ]);

        $orderNumber = trim((string) $validated['order_number']);
        $contact = trim((string) $validated['contact']);

        $order = CheckoutHistory::query()
            ->where('ch_checkout_id', $orderNumber)
            ->orderByDesc('ch_id')
            ->first();

        if (!$order) {
            return response()->json(['message' => 'No order found for the provided reference.'], 404);
        }

        $normalizedContact = $this->normalizeContact($contact);
        $storedEmail = $this->normalizeContact((string) ($order->ch_customer_email ?? ''));
        $storedPhone = $this->normalizeContact((string) ($order->ch_customer_phone ?? ''));

        if ($normalizedContact === '' || ($normalizedContact !== $storedEmail && $normalizedContact !== $storedPhone)) {
            return response()->json(['message' => 'The order reference and contact details do not match.'], 404);
        }

        return response()->json([
            'order' => $this->transformCheckoutHistoryOrder($order, true),
        ]);
    }

    private function persistCheckoutHistoryIfNeeded(string $checkoutId, array $attrs): void
    {
        $normalizedIncomingStatus = $this->resolveCheckoutStatusForStorage($attrs);
        $attrs['status'] = $normalizedIncomingStatus;

        $cached = Cache::get("checkout_customer:{$checkoutId}");
        if (!$cached) {
            // Look for existing order - check mobile orders first (more specific), then any order by checkout_id
            $history = CheckoutHistory::query()
                ->where('ch_checkout_id', $checkoutId)
                ->where('ch_is_mobile', true)
                ->first();

            if (!$history) {
                $history = CheckoutHistory::query()
                    ->where('ch_checkout_id', $checkoutId)
                    ->first();
            }

            $fallbackDescription = (string) (data_get($attrs, 'description') ?: data_get($attrs, 'line_items.0.name') ?: 'Order');
            $fallbackAmountCents = (int) data_get($attrs, 'line_items.0.amount', 0);
            $fallbackAmount = $fallbackAmountCents > 0 ? ($fallbackAmountCents / 100) : 0.0;
            $resolvedEmail = $this->extractCustomerEmailFromCheckoutAttributes($attrs);
            $resolvedPhone = $this->extractCustomerPhoneFromCheckoutAttributes($attrs);
            $resolvedName = $this->extractCustomerNameFromCheckoutAttributes($attrs);
            $resolvedAddress = $this->extractCustomerAddressFromCheckoutAttributes($attrs);
            $resolvedPaymentMethod = $this->extractPaymentMethodFromCheckoutAttributes($attrs);

            if (!$history) {
                // Use firstOrCreate to prevent duplicate creation from race conditions
                $history = CheckoutHistory::firstOrCreate(
                    ['ch_checkout_id' => $checkoutId],
                    [
                        'ch_customer_id' => null,
                        'ch_payment_intent_id' => data_get($attrs, 'payment_intent.id'),
                        'ch_status' => (string) ($attrs['status'] ?? 'pending'),
                        'ch_approval_status' => 'pending_approval',
                        'ch_fulfillment_status' => 'pending',
                        'ch_description' => $fallbackDescription,
                        'ch_amount' => $fallbackAmount,
                        'ch_shipping_fee' => 0,
                        'ch_payment_method' => $resolvedPaymentMethod,
                        'ch_quantity' => 1,
                        'ch_product_name' => $fallbackDescription,
                        'ch_product_id' => null,
                        'ch_product_sku' => '',
                        'ch_product_pv' => 0,
                        'ch_earned_pv' => 0,
                        'ch_commission_basis_amount' => 0,
                        'ch_product_image' => '',
                        'ch_selected_color' => '',
                        'ch_selected_size' => '',
                        'ch_selected_type' => '',
                        'ch_customer_name' => $resolvedName !== '' ? $resolvedName : 'Customer',
                        'ch_customer_email' => $resolvedEmail,
                        'ch_customer_phone' => $resolvedPhone,
                        'ch_customer_address' => $resolvedAddress,
                        'ch_source_label' => '',
                        'ch_source_slug' => '',
                        'ch_source_host' => '',
                        'ch_source_url' => '',
                        'ch_paid_at' => $this->isPaidStatus($attrs['status'] ?? null) ? now() : null,
                    ]
                );

                // If newly created, return early. If found existing, continue to update
                if ($history->wasRecentlyCreated) {
                    return;
                }
            }

            $wasPaidBefore = $this->isPaidStatus($history->ch_status ?? null);
            $isNowPaid = $this->isPaidStatus($attrs['status'] ?? null);

            $history->ch_status = (string) ($attrs['status'] ?? $history->ch_status ?? 'pending');
            $history->ch_payment_intent_id = data_get($attrs, 'payment_intent.id') ?: $history->ch_payment_intent_id;
            if ((string) ($history->ch_payment_method ?? '') === '' && $resolvedPaymentMethod !== '') {
                $history->ch_payment_method = $resolvedPaymentMethod;
            }
            if ((string) ($history->ch_customer_name ?? '') === '' && $resolvedName !== '') {
                $history->ch_customer_name = $resolvedName;
            }
            if ((string) ($history->ch_customer_email ?? '') === '' && $resolvedEmail !== '') {
                $history->ch_customer_email = $resolvedEmail;
            }
            if ((string) ($history->ch_customer_phone ?? '') === '' && $resolvedPhone !== '') {
                $history->ch_customer_phone = $resolvedPhone;
            }
            if ((string) ($history->ch_customer_address ?? '') === '' && $resolvedAddress !== '') {
                $history->ch_customer_address = $resolvedAddress;
            }
            if ($isNowPaid && !$history->ch_paid_at) {
                $history->ch_paid_at = now();
            }
            $history->save();

            if ($isNowPaid && !$wasPaidBefore) {
                $this->notifyAdminOrderCreated($history);
            }

            return;
        }

        $order = is_array($cached['order'] ?? null) ? $cached['order'] : [];
        $quantity = (int) ($order['quantity'] ?? 1);
        $quantity = $quantity > 0 ? $quantity : 1;
        $resolvedOrderSnapshot = $this->resolveOrderSnapshot($order);
        $isZqOrder = ($resolvedOrderSnapshot['source_type'] ?? 'local') === 'zq';
        $zqMetadata = $isZqOrder ? [
            'source_type' => 'zq',
            'zq_product_id' => $resolvedOrderSnapshot['zq_product_id'] ?? null,
            'zq_external_id' => $resolvedOrderSnapshot['zq_external_id'] ?? null,
            'zq_offer_id' => $resolvedOrderSnapshot['zq_offer_id'] ?? null,
            'product_sku' => $resolvedOrderSnapshot['product_sku'] ?? null,
            'product_name' => $resolvedOrderSnapshot['product_name'] ?? null,
            'selected_variant' => $resolvedOrderSnapshot['selected_type'] ?? null,
        ] : null;
        $productPv = (float) ($resolvedOrderSnapshot['product_pv'] ?? 0);
        $commissionBasisAmount = (float) ($resolvedOrderSnapshot['commission_basis_amount'] ?? 0);
        $alreadyExists = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->exists();
        $existingPaymentStatus = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->value('ch_status');
        $existingFulfillmentStatus = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->value('ch_fulfillment_status');
        $existingApprovalStatus = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->value('ch_approval_status');

        try {
            $history = CheckoutHistory::updateOrCreate(
                ['ch_checkout_id' => $checkoutId],
                [
                    // Guest checkouts may not have a member account; keep NULL to satisfy FK constraints.
                    'ch_customer_id' => !empty($cached['customer_id']) ? (int) $cached['customer_id'] : null,
                    'ch_referrer_customer_id' => !empty($cached['referrer_user_id']) ? (int) $cached['referrer_user_id'] : null,
                    'ch_referral_source_type' => (string) ($cached['referral_source_type'] ?? ''),
                    'ch_payment_intent_id' => data_get($attrs, 'payment_intent.id'),
                    'ch_status' => (string) ($attrs['status'] ?? 'paid'),
                    'ch_description' => (string) ($cached['description'] ?? ''),
                    'ch_amount' => (float) ($cached['amount'] ?? 0),
                    'ch_shipping_fee' => (float) ($cached['shipping_fee'] ?? 0),
                    'ch_payment_method' => (string) (($cached['payment_method'] ?? '') ?: $this->extractPaymentMethodFromCheckoutAttributes($attrs)),
                    'ch_quantity' => $quantity,
                    'ch_product_name' => (string) ($resolvedOrderSnapshot['product_name'] ?? ($cached['description'] ?? 'Order Item')),
                    'ch_product_id' => isset($resolvedOrderSnapshot['product_id']) ? (int) $resolvedOrderSnapshot['product_id'] : null,
                    'ch_product_sku' => (string) ($resolvedOrderSnapshot['product_sku'] ?? ''),
                    'ch_product_pv' => $productPv,
                    'ch_earned_pv' => $productPv * $quantity,
                    'ch_commission_basis_amount' => $commissionBasisAmount * $quantity,
                    'ch_product_image' => (string) ($resolvedOrderSnapshot['product_image'] ?? ''),
                    'ch_selected_color' => (string) ($resolvedOrderSnapshot['selected_color'] ?? ''),
                    'ch_selected_size' => (string) ($resolvedOrderSnapshot['selected_size'] ?? ''),
                    'ch_selected_type' => (string) ($resolvedOrderSnapshot['selected_type'] ?? ''),
                    'ch_customer_name' => (string) (($cached['name'] ?? '') ?: $this->extractCustomerNameFromCheckoutAttributes($attrs) ?: 'Customer'),
                    'ch_customer_email' => (string) (($cached['email'] ?? '') ?: $this->extractCustomerEmailFromCheckoutAttributes($attrs)),
                    'ch_customer_phone' => (string) (($cached['phone'] ?? '') ?: $this->extractCustomerPhoneFromCheckoutAttributes($attrs)),
                    'ch_customer_address' => (string) (($cached['address'] ?? '') ?: $this->extractCustomerAddressFromCheckoutAttributes($attrs)),
                    'ch_source_label' => (string) ($cached['source_label'] ?? ''),
                    'ch_source_slug' => (string) ($cached['source_slug'] ?? ''),
                    'ch_source_host' => (string) ($cached['source_host'] ?? ''),
                    'ch_source_url' => (string) ($cached['source_url'] ?? ''),
                    'ch_courier' => $isZqOrder ? 'zq' : null,
                    'ch_zq_payload' => $zqMetadata,
                    'ch_zq_response' => $isZqOrder ? ['admin_fulfillment_mode' => 'zq', 'state' => 'pending_push'] : null,
                    'ch_paid_at' => $this->isPaidStatus($attrs['status'] ?? null) ? now() : null,
                    'ch_approval_status' => $existingApprovalStatus ?: 'pending_approval',
                    'ch_fulfillment_status' => $existingFulfillmentStatus ?: 'pending',
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Primary checkout history upsert failed, falling back to minimal persistence.', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);

            $history = CheckoutHistory::updateOrCreate(
                ['ch_checkout_id' => $checkoutId],
                [
                    'ch_customer_id' => null,
                    'ch_payment_intent_id' => data_get($attrs, 'payment_intent.id'),
                    'ch_status' => (string) ($attrs['status'] ?? 'pending'),
                    'ch_approval_status' => $existingApprovalStatus ?: 'pending_approval',
                    'ch_fulfillment_status' => $existingFulfillmentStatus ?: 'pending',
                    'ch_description' => (string) ($cached['description'] ?? 'Order'),
                    'ch_amount' => (float) ($cached['amount'] ?? 0),
                    'ch_shipping_fee' => (float) ($cached['shipping_fee'] ?? 0),
                    'ch_payment_method' => (string) (($cached['payment_method'] ?? '') ?: $this->extractPaymentMethodFromCheckoutAttributes($attrs)),
                    'ch_quantity' => $quantity,
                    'ch_product_name' => (string) ($resolvedOrderSnapshot['product_name'] ?? ($cached['description'] ?? 'Order Item')),
                    'ch_product_sku' => (string) ($resolvedOrderSnapshot['product_sku'] ?? ''),
                    'ch_customer_name' => (string) (($cached['name'] ?? '') ?: $this->extractCustomerNameFromCheckoutAttributes($attrs) ?: 'Customer'),
                    'ch_customer_email' => (string) (($cached['email'] ?? '') ?: $this->extractCustomerEmailFromCheckoutAttributes($attrs)),
                    'ch_customer_phone' => (string) (($cached['phone'] ?? '') ?: $this->extractCustomerPhoneFromCheckoutAttributes($attrs)),
                    'ch_customer_address' => (string) (($cached['address'] ?? '') ?: $this->extractCustomerAddressFromCheckoutAttributes($attrs)),
                    'ch_courier' => $isZqOrder ? 'zq' : null,
                    'ch_zq_payload' => $zqMetadata,
                    'ch_zq_response' => $isZqOrder ? ['admin_fulfillment_mode' => 'zq', 'state' => 'pending_push'] : null,
                    'ch_paid_at' => $this->isPaidStatus($attrs['status'] ?? null) ? now() : null,
                ]
            );
        }

        $isNowPaid = $this->isPaidStatus($attrs['status'] ?? null);
        $wasPaidBefore = $this->isPaidStatus($existingPaymentStatus);

        // Update ALL items with this checkout_id (for multi-item orders)
        if ($alreadyExists) {
            CheckoutHistory::where('ch_checkout_id', $checkoutId)
                ->update([
                    'ch_status' => (string) ($attrs['status'] ?? 'paid'),
                    'ch_payment_intent_id' => data_get($attrs, 'payment_intent.id') ?: DB::raw('ch_payment_intent_id'),
                    'ch_payment_id' => data_get($attrs, 'payments.0.id') ?: data_get($attrs, 'payment_id') ?: DB::raw('ch_payment_id'),
                    'ch_paid_at' => $this->isPaidStatus($attrs['status'] ?? null) ? now() : DB::raw('ch_paid_at'),
                ]);
        }

        if ($isNowPaid && (!$alreadyExists || !$wasPaidBefore)) {
            $this->notifyAdminOrderCreated($history);

            if (strtolower(trim((string) ($history->ch_courier ?? ''))) === 'zq') {
                $this->notifyZqSupplierOrderCreated($history);
            }
        }

        if ($isNowPaid) {
            DirectReferralCommission::createPendingIfEligible(
                $history,
                !empty($history->ch_referrer_customer_id) ? (int) $history->ch_referrer_customer_id : null,
                (string) ($history->ch_referral_source_type ?? 'checkout_referral')
            );
            DirectReferralCommission::releaseAvailableForOrder($history, null);
            $this->markAffiliateVoucherUsedIfNeeded($checkoutId, is_array($cached) ? $cached : []);
            $this->debitCashbackIfNeeded($checkoutId, is_array($cached) ? $cached : []);
            $this->debitEgcIfNeeded($checkoutId, is_array($cached) ? $cached : []);
        }
    }

    private function extractCustomerEmailFromCheckoutAttributes(array $attrs): string
    {
        $candidates = [
            data_get($attrs, 'billing.email'),
            data_get($attrs, 'customer.email'),
            data_get($attrs, 'metadata.customer_email'),
            data_get($attrs, 'metadata.email'),
            data_get($attrs, 'payments.0.billing.email'),
            data_get($attrs, 'payments.0.attributes.billing.email'),
            data_get($attrs, 'payments.0.attributes.source.billing.email'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return '';
    }

    private function extractCustomerPhoneFromCheckoutAttributes(array $attrs): string
    {
        $candidates = [
            data_get($attrs, 'billing.phone'),
            data_get($attrs, 'customer.phone'),
            data_get($attrs, 'metadata.customer_phone'),
            data_get($attrs, 'metadata.phone'),
            data_get($attrs, 'payments.0.billing.phone'),
            data_get($attrs, 'payments.0.attributes.billing.phone'),
            data_get($attrs, 'payments.0.attributes.source.billing.phone'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return '';
    }

    private function extractCustomerNameFromCheckoutAttributes(array $attrs): string
    {
        $candidates = [
            data_get($attrs, 'billing.name'),
            data_get($attrs, 'customer.name'),
            data_get($attrs, 'metadata.customer_name'),
            data_get($attrs, 'metadata.name'),
            data_get($attrs, 'payments.0.billing.name'),
            data_get($attrs, 'payments.0.attributes.billing.name'),
            data_get($attrs, 'payments.0.attributes.source.billing.name'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return '';
    }

    private function extractCustomerAddressFromCheckoutAttributes(array $attrs): string
    {
        $address = data_get($attrs, 'billing.address');
        if (is_array($address)) {
            $parts = array_filter([
                $address['line1'] ?? null,
                $address['line2'] ?? null,
                $address['city'] ?? null,
                $address['state'] ?? null,
                $address['postal_code'] ?? null,
                $address['country'] ?? null,
            ], static fn ($part) => is_string($part) && trim($part) !== '');

            if ($parts !== []) {
                return implode(', ', array_map(static fn ($part) => trim((string) $part), $parts));
            }
        }

        $candidates = [
            data_get($attrs, 'customer.address'),
            data_get($attrs, 'metadata.customer_address'),
            data_get($attrs, 'metadata.address'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return '';
    }

    private function extractPaymentMethodFromCheckoutAttributes(array $attrs): string
    {
        $direct = [
            data_get($attrs, 'payment_method'),
            data_get($attrs, 'payment_method_type'),
            data_get($attrs, 'payments.0.payment_method_used'),
            data_get($attrs, 'payments.0.attributes.payment_method_used'),
            data_get($attrs, 'payments.0.source.type'),
            data_get($attrs, 'payments.0.attributes.source.type'),
        ];

        foreach ($direct as $candidate) {
            if (!is_string($candidate)) {
                continue;
            }

            $normalized = strtolower(trim($candidate));
            if ($normalized === '') {
                continue;
            }
            if (str_contains($normalized, 'gcash')) {
                return 'gcash';
            }
            if (str_contains($normalized, 'maya') || str_contains($normalized, 'paymaya')) {
                return 'maya';
            }
            if (str_contains($normalized, 'card')) {
                return 'card';
            }
            if (str_contains($normalized, 'bank')) {
                return 'online_banking';
            }
        }

        return '';
    }

    private function resolveOrderSnapshot(array $order): array
    {
        $quantity = max(1, (int) ($order['quantity'] ?? 1));
        $selectedSku = trim((string) ($order['product_sku'] ?? ''));
        $selectedColor = trim((string) ($order['selected_color'] ?? ''));
        $selectedStyle = trim((string) ($order['selected_style'] ?? ''));
        $selectedSize = trim((string) ($order['selected_size'] ?? ''));
        $selectedType = trim((string) ($order['selected_type'] ?? ''));
        $sourceType = strtolower(trim((string) ($order['source_type'] ?? 'local')));
        $fallbackPv = isset($order['product_pv']) ? (float) $order['product_pv'] : 0.0;
        $fallbackName = trim((string) ($order['product_name'] ?? ''));
        $fallbackImage = trim((string) ($order['product_image'] ?? ''));
        $fallbackSubtotal = isset($order['subtotal']) ? (float) $order['subtotal'] : 0.0;

        $snapshot = [
            'product_id' => isset($order['product_id']) ? (int) $order['product_id'] : null,
            'product_name' => $fallbackName,
            'product_sku' => $selectedSku,
            'product_pv' => $fallbackPv,
            'unit_srp' => 0.0,
            'commission_basis_amount' => 0.0,
            'product_image' => $fallbackImage,
            'quantity' => $quantity,
            'source_type' => $sourceType === 'zq' ? 'zq' : 'local',
            'zq_product_id' => isset($order['zq_product_id']) ? (int) $order['zq_product_id'] : null,
            'zq_external_id' => trim((string) ($order['zq_external_id'] ?? '')) ?: null,
            'zq_offer_id' => trim((string) ($order['zq_offer_id'] ?? '')) ?: null,
            'selected_color' => $selectedColor !== '' ? $selectedColor : null,
            'selected_style' => $selectedStyle !== '' ? $selectedStyle : null,
            'selected_size' => $selectedSize !== '' ? $selectedSize : null,
            'selected_type' => $selectedType !== '' ? $selectedType : null,
        ];

        if ($snapshot['source_type'] === 'zq') {
            $snapshot['unit_srp'] = $fallbackSubtotal > 0 ? ($fallbackSubtotal / $quantity) : 0.0;
            $snapshot['commission_basis_amount'] = 0.0;
            return $snapshot;
        }

        $productId = (int) ($snapshot['product_id'] ?? 0);
        if ($productId <= 0) {
            return $snapshot;
        }

        $product = Product::query()
            ->select(['pd_id', 'pd_name', 'pd_parent_sku', 'pd_prodpv', 'pd_price_srp', 'pd_price_dp', 'pd_image'])
            ->with(['variants' => function ($query) {
                $query->select([
                    'pv_id',
                    'pv_pdid',
                    'pv_sku',
                    'pv_name',
                    'pv_color',
                    'pv_size',
                    'pv_price_srp',
                    'pv_price_dp',
                    'pv_prodpv',
                    'pv_status',
                ]);
            }])
            ->find($productId);

        if (!$product) {
            return $snapshot;
        }

        $snapshot['product_name'] = trim((string) ($product->pd_name ?? '')) !== ''
            ? trim((string) $product->pd_name)
            : $snapshot['product_name'];
        $snapshot['product_image'] = trim((string) ($product->pd_image ?? '')) !== ''
            ? trim((string) $product->pd_image)
            : $snapshot['product_image'];
        $snapshot['unit_srp'] = max(0, (float) ($product->pd_price_srp ?? 0));

        $matchingVariant = $product->variants
            ->filter(fn ($variant) => (int) ($variant->pv_status ?? 1) === 1)
            ->first(function ($variant) use ($selectedSku, $selectedColor, $selectedSize, $selectedType) {
                if ($selectedSku !== '' && strcasecmp((string) ($variant->pv_sku ?? ''), $selectedSku) === 0) {
                    return true;
                }

                $variantName = trim((string) ($variant->pv_name ?? ''));
                if ($selectedType !== '' && $variantName !== '' && strcasecmp($variantName, $selectedType) === 0) {
                    return true;
                }

                $variantColor = trim((string) ($variant->pv_color ?? ''));
                $variantSize = trim((string) ($variant->pv_size ?? ''));

                return $selectedColor !== ''
                    && $selectedSize !== ''
                    && $variantColor !== ''
                    && $variantSize !== ''
                    && strcasecmp($variantColor, $selectedColor) === 0
                    && strcasecmp($variantSize, $selectedSize) === 0;
            });

        if ($matchingVariant) {
            $variantSku = trim((string) ($matchingVariant->pv_sku ?? ''));
            if ($variantSku !== '') {
                $snapshot['product_sku'] = $variantSku;
            }

            $variantPv = (float) ($matchingVariant->pv_prodpv ?? 0);
            if ($variantPv > 0) {
                $snapshot['product_pv'] = $variantPv;
            }

            $variantSrp = (float) ($matchingVariant->pv_price_srp ?? 0);
            $variantDp = (float) ($matchingVariant->pv_price_dp ?? 0);
            if ($variantSrp > 0) {
                $snapshot['unit_srp'] = $variantSrp;
            }
            $snapshot['commission_basis_amount'] = max(0, $variantSrp - $variantDp);
        } else {
            $snapshot['product_sku'] = trim((string) ($product->pd_parent_sku ?? '')) !== ''
                ? trim((string) $product->pd_parent_sku)
                : $snapshot['product_sku'];
        }

        if ((float) $snapshot['product_pv'] <= 0) {
            $snapshot['product_pv'] = (float) ($product->pd_prodpv ?? 0);
        }

        if ((float) $snapshot['commission_basis_amount'] <= 0) {
            $snapshot['commission_basis_amount'] = max(0, (float) ($product->pd_price_srp ?? 0) - (float) ($product->pd_price_dp ?? 0));
        }

        return $snapshot;
    }

    private function resolveAffiliateVoucher(string $code): ?object
    {
        if (!Schema::hasTable('tbl_affiliate_voucher_issuances')) {
            return null;
        }

        $normalized = mb_strtolower(trim($code), 'UTF-8');
        if ($normalized === '') {
            return null;
        }

        $voucher = DB::table('tbl_affiliate_voucher_issuances')
            ->whereRaw('LOWER(avi_code) = ?', [$normalized])
            ->first();

        if (!$voucher || (string) ($voucher->avi_status ?? '') !== 'active') {
            return null;
        }

        if (!empty($voucher->avi_expires_at)) {
            $expiresAt = \Illuminate\Support\Carbon::parse($voucher->avi_expires_at, 'Asia/Manila');
            if ($expiresAt->isPast()) {
                return null;
            }
        }

        $maxUses = $voucher->avi_max_uses !== null ? (int) $voucher->avi_max_uses : null;
        $usedCount = (int) ($voucher->avi_used_count ?? 0);
        if ($maxUses !== null && $usedCount >= $maxUses) {
            return null;
        }

        return $voucher;
    }

    private function computeVoucherDiscountForProduct(object $voucher, int $productId, float $subtotal): array
    {
        $voucherAmount = max(0, (float) ($voucher->avi_amount ?? 0));
        $subtotal = max(0, $subtotal);

        if ($productId <= 0 || !Schema::hasTable('tbl_affiliate_voucher_product_rules')) {
            return [
                'valid' => true,
                'discount' => round(min($subtotal, $voucherAmount), 2),
                'message' => null,
                'rule' => null,
            ];
        }

        $rule = DB::table('tbl_affiliate_voucher_product_rules')
            ->where('avpr_product_id', $productId)
            ->first();

        if (!$rule || !(bool) ($rule->avpr_enabled ?? false)) {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => 'This voucher is not available for this product.',
                'rule' => [
                    'product_id' => $productId,
                    'enabled' => false,
                ],
            ];
        }

        $minSpend = $rule->avpr_min_spend !== null ? max(0, (float) $rule->avpr_min_spend) : 0.0;
        if ($minSpend > 0 && $subtotal < $minSpend) {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => sprintf('Minimum spend of PHP %s is required to use this voucher.', number_format($minSpend, 2)),
                'rule' => [
                    'product_id' => $productId,
                    'enabled' => true,
                    'max_discount' => $rule->avpr_max_discount !== null ? (float) $rule->avpr_max_discount : null,
                    'min_spend' => $minSpend,
                ],
            ];
        }

        $maxDiscount = $rule->avpr_max_discount !== null ? max(0, (float) $rule->avpr_max_discount) : null;
        if ($maxDiscount !== null && $maxDiscount <= 0) {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => 'This product does not allow voucher discounts.',
                'rule' => [
                    'product_id' => $productId,
                    'enabled' => true,
                    'max_discount' => 0.0,
                    'min_spend' => $minSpend,
                ],
            ];
        }

        $discount = min($subtotal, $voucherAmount);
        $limitReached = false;
        if ($maxDiscount !== null && $discount > $maxDiscount) {
            $discount = $maxDiscount;
            $limitReached = true;
        }

        return [
            'valid' => $discount > 0,
            'discount' => round($discount, 2),
            'message' => $limitReached
                ? sprintf('PHP %s discount applied. Product limit reached.', number_format($discount, 2))
                : null,
            'rule' => [
                'product_id' => $productId,
                'enabled' => true,
                'max_discount' => $maxDiscount,
                'min_spend' => $minSpend,
            ],
        ];
    }

    private function computeStoreCreditDiscountForProduct(float $amount, int $productId, float $subtotal, string $label = 'E-GC'): array
    {
        $result = $this->computeVoucherDiscountForProduct((object) [
            'avi_amount' => max(0, $amount),
        ], $productId, $subtotal);

        if (is_string($result['message'] ?? null)) {
            $result['message'] = str_replace('voucher', $label, (string) $result['message']);
        }

        return $result;
    }

    private function markAffiliateVoucherUsedIfNeeded(string $checkoutId, array $cached): void
    {
        $voucher = $cached['voucher'] ?? null;
        if (!is_array($voucher) || empty($voucher['id'])) {
            return;
        }

        $cacheKey = "checkout_voucher_applied:{$checkoutId}";
        if (Cache::has($cacheKey)) {
            return;
        }

        DB::transaction(function () use ($voucher, $cached) {
            if (!Schema::hasTable('tbl_affiliate_voucher_issuances')) {
                return;
            }

            $row = DB::table('tbl_affiliate_voucher_issuances')
                ->where('avi_id', (int) $voucher['id'])
                ->lockForUpdate()
                ->first();

            if (!$row || (string) ($row->avi_status ?? '') !== 'active') {
                return;
            }

            if (!empty($row->avi_expires_at)) {
                $expiresAt = \Illuminate\Support\Carbon::parse($row->avi_expires_at, 'Asia/Manila');
                if ($expiresAt->isPast()) {
                    return;
                }
            }

            $maxUses = $row->avi_max_uses !== null ? (int) $row->avi_max_uses : null;
            $usedCount = (int) ($row->avi_used_count ?? 0);
            if ($maxUses !== null && $usedCount >= $maxUses) {
                return;
            }

            $nextUsed = $usedCount + 1;

            $update = [
                'avi_used_count' => $nextUsed,
                'avi_redeemed_at' => now('Asia/Manila'),
            ];

            if (!empty($cached['customer_id'])) {
                $update['avi_redeemed_by_customer_id'] = (int) $cached['customer_id'];
            }

            if ($maxUses !== null && $nextUsed >= $maxUses) {
                $update['avi_status'] = 'redeemed';
            }

            DB::table('tbl_affiliate_voucher_issuances')
                ->where('avi_id', (int) $row->avi_id)
                ->update($update);
        });

        Cache::put($cacheKey, true, now()->addDays(7));
    }

    private function customerEgcBalance(int $customerId): float
    {
        if ($customerId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return 0.0;
        }

        $credits = (float) CustomerWalletLedger::query()
            ->where('wl_customer_id', $customerId)
            ->where('wl_wallet_type', 'egc')
            ->where('wl_entry_type', 'credit')
            ->sum('wl_amount');

        $debits = (float) CustomerWalletLedger::query()
            ->where('wl_customer_id', $customerId)
            ->where('wl_wallet_type', 'egc')
            ->where('wl_entry_type', 'debit')
            ->sum('wl_amount');

        return round(max(0, $credits - $debits), 2);
    }

    private function debitEgcIfNeeded(string $checkoutId, array $cached): void
    {
        $egc = $cached['egc'] ?? null;
        $amount = is_array($egc) ? round(max(0, (float) ($egc['amount'] ?? 0)), 2) : 0.0;
        $customerId = (int) ($cached['customer_id'] ?? 0);

        if ($amount <= 0 || $customerId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return;
        }

        $cacheKey = "checkout_egc_debited:{$checkoutId}";
        if (Cache::has($cacheKey)) {
            return;
        }

        DB::transaction(function () use ($amount, $customerId, $checkoutId) {
            $alreadyDebited = CustomerWalletLedger::query()
                ->where('wl_wallet_type', 'egc')
                ->where('wl_entry_type', 'debit')
                ->where('wl_source_type', 'checkout_egc')
                ->where('wl_reference_no', $checkoutId)
                ->exists();

            if ($alreadyDebited) {
                return;
            }

            if ($this->customerEgcBalance($customerId) < $amount) {
                Log::warning('Skipping E-GC debit because balance is insufficient at payment confirmation.', [
                    'checkout_id' => $checkoutId,
                    'customer_id' => $customerId,
                    'amount' => $amount,
                ]);
                return;
            }

            CustomerWalletLedger::create([
                'wl_customer_id' => $customerId,
                'wl_wallet_type' => 'egc',
                'wl_entry_type' => 'debit',
                'wl_amount' => $amount,
                'wl_source_type' => 'checkout_egc',
                'wl_source_id' => null,
                'wl_reference_no' => $checkoutId,
                'wl_notes' => 'E-GC store credit applied to checkout.',
                'wl_created_by' => null,
            ]);
        });

        Cache::put($cacheKey, true, now()->addDays(7));
    }

    private function debitCashbackIfNeeded(string $checkoutId, array $cached): void
    {
        $cashback = $cached['cashback'] ?? null;
        $amount = is_array($cashback) ? round(max(0, (float) ($cashback['amount'] ?? 0)), 2) : 0.0;
        $customerId = (int) ($cached['customer_id'] ?? 0);

        if ($amount <= 0 || $customerId <= 0 || !Schema::hasTable('tbl_customer_wallet_ledger')) {
            return;
        }

        $cacheKey = "checkout_cashback_debited:{$checkoutId}";
        if (Cache::has($cacheKey)) {
            return;
        }

        DB::transaction(function () use ($amount, $customerId, $checkoutId) {
            $alreadyDebited = CustomerWalletLedger::query()
                ->where('wl_wallet_type', 'voucher')
                ->where('wl_entry_type', 'debit')
                ->where('wl_source_type', 'personal_cashback_checkout')
                ->where('wl_reference_no', $checkoutId)
                ->exists();

            if ($alreadyDebited) {
                return;
            }

            if (PersonalPurchaseCashback::availableBalance($customerId) < $amount) {
                Log::warning('Skipping personal cashback debit because balance is insufficient at payment confirmation.', [
                    'checkout_id' => $checkoutId,
                    'customer_id' => $customerId,
                    'amount' => $amount,
                ]);
                return;
            }

            CustomerWalletLedger::create([
                'wl_customer_id' => $customerId,
                'wl_wallet_type' => 'voucher',
                'wl_entry_type' => 'debit',
                'wl_amount' => $amount,
                'wl_source_type' => 'personal_cashback_checkout',
                'wl_source_id' => null,
                'wl_reference_no' => $checkoutId,
                'wl_notes' => 'Personal cashback discount applied to checkout.',
                'wl_created_by' => null,
            ]);
        });

        Cache::put($cacheKey, true, now()->addDays(7));
    }

    public function notifyCustomerOrderStatusUpdate(CheckoutHistory $order, string $eventType, string $title, string $description): void
    {
        if ((int) $order->ch_customer_id === 0) {
            return; // Skip guest checkouts
        }

        $createdAt = now('Asia/Manila');
        $status = $order->ch_fulfillment_status ?: $this->mapCheckoutStatusToOrderStatus((string) $order->ch_status);
        $href = '/orders';
        $severity = match ($status) {
            'delivered' => 'success',
            'cancelled', 'refunded', 'failed_delivery', 'returned_to_sender' => 'critical',
            'out_for_delivery', 'shipped', 'packed', 'processing' => 'warning',
            default => 'info',
        };

        // Fetch OrderNotification data first for custom messages, images, and deep links
        $orderNotificationTitle = $title;
        $orderNotificationMessage = $description;
        $orderNotificationImage = '';
        $orderNotificationHref = '/orders';

        Log::info('🔍 [DEBUG] Fetching OrderNotification for checkout', [
            'checkout_id' => (string) $order->ch_checkout_id,
        ]);

        $orderNotification = OrderNotification::query()
            ->where('on_checkout_id', (string) $order->ch_checkout_id)
            ->first();

        Log::info('🔍 [DEBUG] OrderNotification query result', [
            'checkout_id' => (string) $order->ch_checkout_id,
            'notification_found' => $orderNotification ? 'YES' : 'NO',
            'notification_id' => $orderNotification?->on_id,
        ]);

        if ($orderNotification) {
            $customTitle = trim((string) ($orderNotification->on_title ?? ''));
            $customMessage = trim((string) ($orderNotification->on_message ?? ''));
            $customImage = trim((string) ($orderNotification->on_product_image ?? ''));
            $customHref = trim((string) ($orderNotification->on_href ?? ''));

            Log::info('🔍 [DEBUG] OrderNotification data extracted', [
                'checkout_id' => (string) $order->ch_checkout_id,
                'notification_id' => $orderNotification->on_id,
                'title' => $customTitle ?: 'EMPTY',
                'message' => $customMessage ?: 'EMPTY',
                'image' => $customImage ?: 'EMPTY',
                'href_raw' => (string) ($orderNotification->on_href ?? 'NULL'),
                'href_trimmed' => $customHref ?: 'EMPTY',
                'href_is_empty' => empty($customHref) ? 'YES' : 'NO',
            ]);

            if ($customTitle !== '') {
                $orderNotificationTitle = $customTitle;
            }
            if ($customMessage !== '') {
                $orderNotificationMessage = $customMessage;
            }
            if ($customImage !== '') {
                $orderNotificationImage = $customImage;
            }
            if ($customHref !== '') {
                $orderNotificationHref = $customHref;
            }

            Log::info('📸 [DEBUG] Image assignment result', [
                'checkout_id' => (string) $order->ch_checkout_id,
                'orderNotificationImage_assigned' => $orderNotificationImage ?: 'EMPTY',
                'image_is_not_empty' => !empty($orderNotificationImage),
            ]);
        } else {
            Log::warning('⚠️ [DEBUG] No OrderNotification found for this checkout', [
                'checkout_id' => (string) $order->ch_checkout_id,
                'will_send_without_custom_image' => true,
            ]);
        }

        try {
            $notification = CustomerNotification::query()->create([
                'cn_customer_id' => (int) $order->ch_customer_id,
                'cn_type' => 'order_update',
                'cn_severity' => $severity,
                'cn_title' => $orderNotificationTitle,
                'cn_message' => $orderNotificationMessage,
                'cn_href' => $href,
                'cn_payload' => [
                    'order_id' => (int) $order->ch_id,
                    'checkout_id' => (string) $order->ch_checkout_id,
                    'event_type' => $eventType,
                    'status' => $status,
                    'payment_status' => (string) $order->ch_status,
                    'tracking_number' => $this->resolveOrderTrackingNumber($order),
                ],
                'cn_source_type' => $eventType,
                'cn_source_id' => (int) $order->ch_id,
                'cn_created_at' => $createdAt,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to store customer order notification.', [
                'customer_id' => (int) $order->ch_customer_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
            return;
        }

        $appId = (string) config('services.pusher.app_id', '');
        $key = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');

        if ($appId === '' || $key === '' || $secret === '') {
            return;
        }

        $cluster = (string) config('services.pusher.cluster', 'ap1');
        $useTls = (bool) config('services.pusher.use_tls', true);

        try {
            $pusher = new Pusher(
                $key,
                $secret,
                $appId,
                [
                    'cluster' => $cluster,
                    'useTLS' => $useTls,
                ]
            );

            $channelName = 'private-customer-' . (int) $order->ch_customer_id;

            // Use custom message from OrderNotification if available
            $pusher->trigger($channelName, 'order.status.updated', [
                'order_id' => (int) $order->ch_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'event_type' => $eventType,
                'title' => (string) $notification->cn_title,
                'description' => (string) $notification->cn_message,
                'status' => $status,
                'payment_status' => (string) $order->ch_status,
                'tracking_number' => $this->resolveOrderTrackingNumber($order),
                'created_at' => $createdAt->toIso8601String(),
            ]);

            // Use custom message from OrderNotification if available
            $pusher->trigger($channelName, 'notification.created', [
                'id' => 'customer_notification:' . (int) $notification->cn_id,
                'type' => 'order_update',
                'title' => (string) $notification->cn_title,
                'description' => (string) $notification->cn_message,
                'count' => 1,
                'severity' => (string) $notification->cn_severity,
                'href' => $href,
                'latest_at' => $createdAt->toIso8601String(),
                'order_id' => (int) $order->ch_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'status' => $status,
                'created_at' => $createdAt->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to publish customer realtime notification.', [
                'customer_id' => (int) $order->ch_customer_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
        }

        // Send Expo push notification with custom message and image from OrderNotification
        try {
            $fcmService = new FirebaseMessagingService();

            $fcmData = [
                'title' => $orderNotificationTitle,
                'body' => $orderNotificationMessage,
                'sound' => 'default',
                'badge' => 1,
                'mutableContent' => true,
                'data' => [
                    'order_id' => (string) $order->ch_id,
                    'checkout_id' => (string) $order->ch_checkout_id,
                    'event_type' => (string) $eventType,
                    'status' => (string) $status,
                    'type' => 'order_update',
                    'href' => (string) $orderNotificationHref,
                    'screen' => 'OrderDetail',
                    'params' => json_encode([
                        'orderId' => (int) $order->ch_id,
                        'checkoutId' => (string) $order->ch_checkout_id,
                    ]),
                    'buttonText' => 'View Order',
                ],
            ];

            // Include product image in notification payload
            $normalizedNotificationImage = $this->normalizeNotificationImageUrl($orderNotificationImage);
            if ($normalizedNotificationImage !== null) {
                $fcmData['image'] = $normalizedNotificationImage;
            }

            // DEBUG: Log the complete notification payload being sent
            Log::info('DEBUG Preparing FCM push notification', [
                'customer_id' => (int) $order->ch_customer_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'title' => $orderNotificationTitle,
                'body' => $orderNotificationMessage,
                'product_image' => $orderNotificationImage ?? 'NO_IMAGE',
                'image_empty_check' => empty($orderNotificationImage) ? 'TRUE (image is empty)' : 'FALSE (image exists)',
                'full_payload' => json_encode($fcmData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            ]);

            $result = $fcmService->sendToCustomer((int) $order->ch_customer_id, $fcmData);

            Log::info('FCM push notification sent for order status update', [
                'customer_id' => (int) $order->ch_customer_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'status' => $status,
                'sent' => $result['sent'],
                'failed' => $result['failed'],
                'product_image_included' => !empty($orderNotificationImage),
                'image_url' => $orderNotificationImage ?? 'NONE',
                'title' => $orderNotificationTitle,
                'body' => $orderNotificationMessage,
                'href' => $orderNotificationHref,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to send FCM push notification for order status update.', [
                'customer_id' => (int) $order->ch_customer_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'title' => $orderNotificationTitle,
                'body' => $orderNotificationMessage,
                'href' => $orderNotificationHref,
            ]);
        }
    }

    private function notifyAdminOrderCreated(CheckoutHistory $history): void
    {
        // Skip admin notifications for guest checkouts (customer_id = 0)
        if ((int) $history->ch_customer_id === 0) {
            return;
        }
        $customerName = trim((string) ($history->ch_customer_name ?? 'Customer'));
        $checkoutId = (string) ($history->ch_checkout_id ?? '');
        $amount = (float) ($history->ch_amount ?? 0);

        $notification = AdminNotification::query()->firstOrCreate(
            [
                'an_type' => 'order_created',
                'an_source_type' => 'order',
                'an_source_id' => (int) $history->ch_id,
            ],
            [
                'an_severity' => 'warning',
                'an_title' => 'New Order Placed',
                'an_message' => sprintf(
                    '%s placed order %s (%s).',
                    $customerName !== '' ? $customerName : 'Customer',
                    $checkoutId !== '' ? $checkoutId : '#' . (int) $history->ch_id,
                    'PHP ' . number_format($amount, 2)
                ),
                'an_href' => '/admin/orders/pending',
                'an_payload' => [
                    'order_id' => (int) $history->ch_id,
                    'checkout_id' => $checkoutId,
                    'customer_name' => $customerName,
                    'amount' => $amount,
                ],
                'an_created_at' => now(),
            ]
        );

        $appId = (string) config('services.pusher.app_id', '');
        $key = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');

        if ($appId === '' || $key === '' || $secret === '') {
            return;
        }

        $cluster = (string) config('services.pusher.cluster', 'ap1');
        $useTls = (bool) config('services.pusher.use_tls', true);

        try {
            $pusher = new Pusher(
                $key,
                $secret,
                $appId,
                [
                    'cluster' => $cluster,
                    'useTLS' => $useTls,
                ]
            );

            $pusher->trigger('private-admin-orders', 'order.created', [
                'order_id' => (int) $history->ch_id,
                'checkout_id' => (string) $history->ch_checkout_id,
                'notification_id' => (int) $notification->an_id,
                'type' => 'order_created',
                'title' => (string) $notification->an_title,
                'description' => (string) $notification->an_message,
                'created_at' => now()->toDateTimeString(),
            ]);
            $pusher->trigger('private-admin-orders', 'notification.created', [
                'id' => (int) $notification->an_id,
                'type' => 'order_created',
                'title' => (string) $notification->an_title,
                'description' => (string) $notification->an_message,
                'href' => (string) ($notification->an_href ?? '/admin/orders/pending'),
                'created_at' => now()->toDateTimeString(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to publish admin realtime order notification.', [
                'checkout_id' => (string) $history->ch_checkout_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function notifyZqSupplierOrderCreated(CheckoutHistory $history): void
    {
        $supplier = \App\Models\Supplier::query()
            ->get(['s_id', 's_name', 's_company'])
            ->first(function ($s) {
                $candidate = strtolower(preg_replace('/[^a-z0-9]/i', '', trim(
                    ((string) ($s->s_company ?? '')) . ' ' . ((string) ($s->s_name ?? ''))
                )));
                return str_contains($candidate, 'afhomeglobal')
                    || str_contains($candidate, 'globalsupplier')
                    || str_contains($candidate, 'zqsupplier');
            });

        if (! $supplier) {
            Log::warning('ZQ supplier notification skipped: no global supplier found.', [
                'checkout_id' => (string) $history->ch_checkout_id,
            ]);
            return;
        }

        $appId  = (string) config('services.pusher.app_id', '');
        $key    = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');

        if ($appId === '' || $key === '' || $secret === '') {
            return;
        }

        $supplierId   = (int) $supplier->s_id;
        $channelName  = 'private-supplier-' . $supplierId;
        $checkoutId   = (string) ($history->ch_checkout_id ?? '');
        $customerName = trim((string) ($history->ch_customer_name ?? 'Customer'));
        $productName  = trim((string) ($history->ch_product_name ?? 'Order Item'));
        $amount       = (float) ($history->ch_amount ?? 0);

        $description = sprintf(
            '%s placed a new ZQ order %s for %s (PHP %s).',
            $customerName !== '' ? $customerName : 'Customer',
            $checkoutId !== '' ? $checkoutId : '#' . (int) $history->ch_id,
            $productName !== '' ? $productName : 'Order Item',
            number_format($amount, 2)
        );

        try {
            $pusher = new Pusher(
                $key,
                $secret,
                $appId,
                [
                    'cluster' => (string) config('services.pusher.cluster', 'ap1'),
                    'useTLS'  => (bool) config('services.pusher.use_tls', true),
                ]
            );

            $pusher->trigger($channelName, 'order.created', [
                'order_id'    => (int) $history->ch_id,
                'checkout_id' => $checkoutId,
                'type'        => 'order_created',
                'title'       => 'New ZQ Order',
                'description' => $description,
                'created_at'  => now()->toDateTimeString(),
            ]);

            $pusher->trigger($channelName, 'notification.created', [
                'order_id'    => (int) $history->ch_id,
                'checkout_id' => $checkoutId,
                'type'        => 'order_created',
                'title'       => 'New ZQ Order',
                'description' => $description,
                'href'        => '/supplier/orders',
                'created_at'  => now()->toDateTimeString(),
            ]);

            Log::info('ZQ supplier realtime notification sent.', [
                'checkout_id' => $checkoutId,
                'supplier_id' => $supplierId,
                'channel'     => $channelName,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to publish ZQ supplier realtime notification.', [
                'checkout_id' => $checkoutId,
                'supplier_id' => $supplierId,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    private function isPaidStatus(mixed $status): bool
    {
        if (!is_string($status)) {
            return false;
        }

        return in_array(strtolower($status), ['paid', 'succeeded', 'success'], true);
    }

    private function normalizeCheckoutStatusForStorage(mixed $status): string
    {
        if (!is_string($status)) {
            return 'pending';
        }

        $normalized = strtolower(trim($status));
        if (in_array($normalized, ['active', 'unpaid', 'pending'], true)) {
            return 'pending';
        }

        return $normalized;
    }

    private function resolveCheckoutStatusForStorage(array $attrs): string
    {
        $normalizedStatus = $this->normalizeCheckoutStatusForStorage($attrs['status'] ?? null);

        if ($this->isPaidStatus($normalizedStatus)) {
            return 'paid';
        }

        $paymentStatuses = array_filter([
            data_get($attrs, 'payment_intent.status'),
            data_get($attrs, 'payment_intent.attributes.status'),
            data_get($attrs, 'payment_intent.data.attributes.status'),
            data_get($attrs, 'payment.status'),
            data_get($attrs, 'payment.attributes.status'),
            ...$this->extractPaymentStatuses(data_get($attrs, 'payments')),
        ], static fn ($value) => is_string($value) && trim($value) !== '');

        foreach ($paymentStatuses as $paymentStatus) {
            if ($this->isPaidStatus($paymentStatus)) {
                return 'paid';
            }
        }

        return $normalizedStatus;
    }

    private function extractPaymentStatuses(mixed $payments): array
    {
        if (!is_array($payments)) {
            return [];
        }

        $statuses = [];
        foreach ($payments as $payment) {
            if (!is_array($payment)) {
                continue;
            }

            $candidateStatuses = [
                $payment['status'] ?? null,
                data_get($payment, 'attributes.status'),
                data_get($payment, 'data.attributes.status'),
            ];

            foreach ($candidateStatuses as $candidateStatus) {
                if (is_string($candidateStatus) && trim($candidateStatus) !== '') {
                    $statuses[] = $candidateStatus;
                }
            }
        }

        return $statuses;
    }

    private function mapCheckoutStatusToOrderStatus(string $status): string
    {
        return match (strtolower($status)) {
            'paid', 'succeeded', 'success' => 'paid',
            'failed', 'cancelled', 'expired' => 'cancelled',
            'active', 'unpaid', 'pending' => 'pending',
            default => 'pending',
        };
    }

    private function formatPaymentMethod(string $method): string
    {
        return match (strtolower($method)) {
            'gcash' => 'GCash',
            'maya', 'paymaya' => 'Maya',
            'card' => 'Credit / Debit Card',
            'online_banking' => 'Online Banking',
            default => ucfirst(str_replace('_', ' ', $method)),
        };
    }

    private function extractCheckoutIdFromWebhook(array $payload): ?string
    {
        $candidates = [
            data_get($payload, 'data.attributes.data.id'),
            data_get($payload, 'data.attributes.data.attributes.id'),
            data_get($payload, 'data.attributes.data.attributes.checkout_session_id'),
            data_get($payload, 'data.attributes.checkout_session_id'),
            data_get($payload, 'data.id'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return null;
    }

    private function extractCheckoutAttributesFromWebhook(array $payload): array
    {
        $attrs = data_get($payload, 'data.attributes.data.attributes');
        return is_array($attrs) ? $attrs : [];
    }

    private function hydrateCheckoutAttributesIfNeeded(string $checkoutId, array $attrs): array
    {
        $hasStatus = !empty($attrs['status']);
        $hasPaymentIntent = !empty(data_get($attrs, 'payment_intent.id'));
        if ($hasStatus && $hasPaymentIntent) {
            return $attrs;
        }

        $paymentMode = $this->resolveCheckoutPaymentMode($checkoutId);
        $secretKey = $this->getPaymongoConfig($paymentMode)['secret_key'];
        if (!$secretKey) {
            return $attrs;
        }

        try {
            $res = Http::withBasicAuth($secretKey, '')
                ->get($this->paymongoApiUrl("/v1/checkout_sessions/{$checkoutId}", $paymentMode));

            if ($res->failed()) {
                Log::warning('Failed to hydrate checkout attributes from PayMongo API.', [
                    'checkout_id' => $checkoutId,
                    'status' => $res->status(),
                ]);
                return $attrs;
            }

            $fetched = $res->json('data.attributes');
            if (!is_array($fetched)) {
                return $attrs;
            }

            return array_merge($fetched, $attrs);
        } catch (\Throwable $e) {
            Log::warning('Error hydrating checkout attributes from PayMongo API.', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);
            return $attrs;
        }
    }

    private function isValidPaymongoWebhookSignature(string $rawBody, string $header, ?string $requestedMode = null): bool
    {
        $secrets = $this->getValidPaymongoWebhookSecrets($requestedMode);
        if ($secrets === []) {
            Log::warning('PAYMONGO webhook secret is not configured. Skipping signature verification in the current environment.');
            return true;
        }

        if ($header === '' || $rawBody === '') {
            return false;
        }

        $parts = [];
        foreach (explode(',', $header) as $segment) {
            [$key, $value] = array_pad(explode('=', trim($segment), 2), 2, null);
            if ($key && $value) {
                $parts[trim($key)] = trim($value);
            }
        }

        $timestamp = $parts['t'] ?? null;
        if (!$timestamp) {
            return false;
        }

        $signatures = array_filter([
            $parts['te'] ?? null,
            $parts['li'] ?? null,
            $parts['v1'] ?? null,
            $parts['s'] ?? null,
        ]);

        foreach ($secrets as $secret) {
            $expected = hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);
            foreach ($signatures as $signature) {
                if (hash_equals($expected, $signature)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function transformCheckoutHistoryOrder(CheckoutHistory $order, bool $includeGuestFields = false): array
    {
        $quantity = max(1, (int) $order->ch_quantity);
        $itemName = $order->ch_product_name ?: ($order->ch_description ?: 'Order Item');
        $status = $order->ch_fulfillment_status
            ? (string) $order->ch_fulfillment_status
            : $this->mapCheckoutStatusToOrderStatus((string) $order->ch_status);

        $payload = [
            'id' => (int) $order->ch_id,
            'order_number' => $order->ch_checkout_id,
            'status' => $status,
            'items' => [[
                'id' => (int) $order->ch_id,
                'product_id' => $order->ch_product_id ? (int) $order->ch_product_id : null,
                'name' => $itemName,
                'image' => $order->ch_product_image ?: '/Images/HeroSection/sofas.jpg',
                'quantity' => $quantity,
                'price' => $quantity > 0 ? (max(0, (float) $order->ch_amount - (float) ($order->ch_shipping_fee ?? 0)) / $quantity) : (float) $order->ch_amount,
                'selected_color' => $order->ch_selected_color ?: null,
                'selected_size' => $order->ch_selected_size ?: null,
                'selected_type' => $order->ch_selected_type ?: null,
            ]],
            'total' => (float) $order->ch_amount,
            'shipping_fee' => (float) ($order->ch_shipping_fee ?? 0),
            'payment_method' => $this->formatPaymentMethod((string) $order->ch_payment_method),
            'shipping_address' => $order->ch_customer_address ?: 'No address provided',
            'source_label' => $order->ch_source_label ?: null,
            'source_slug' => $order->ch_source_slug ?: null,
            'source_host' => $order->ch_source_host ?: null,
            'source_url' => $order->ch_source_url ?: null,
            'created_at' => optional($order->ch_paid_at ?? $order->created_at)->toDateTimeString(),
            'estimated_delivery' => null,
            'refund_reason' => $order->ch_refund_reason ?: null,
            'refund_image_urls' => is_array($order->ch_refund_image_urls) ? array_values($order->ch_refund_image_urls) : [],
            'refund_video_urls' => is_array($order->ch_refund_video_urls) ? array_values($order->ch_refund_video_urls) : [],
            'refund_requested_at' => optional($order->ch_refund_requested_at)->toDateTimeString(),
        ];

        if ($includeGuestFields) {
            $trackingNo = $this->resolveOrderTrackingNumber($order);
            $payload['customer_name'] = (string) ($order->ch_customer_name ?? 'Customer');
            $payload['courier'] = $order->ch_courier ?: null;
            $payload['tracking_no'] = $trackingNo;
            $payload['shipment_status'] = $order->ch_shipment_status ?: null;
            $payload['shipped_at'] = optional($order->ch_shipped_at)->toDateTimeString();
        }

        return $payload;
    }

    private function normalizeContact(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }

        if (filter_var($trimmed, FILTER_VALIDATE_EMAIL)) {
            return strtolower($trimmed);
        }

        return preg_replace('/\D+/', '', $trimmed) ?? '';
    }

    private function resolveOrderTrackingNumber(CheckoutHistory $order): ?string
    {
        $trackingNo = trim((string) ($order->ch_tracking_no ?? ''));
        if ($trackingNo !== '') {
            return $trackingNo;
        }

        if (strtolower(trim((string) ($order->ch_courier ?? ''))) !== 'afhome') {
            return null;
        }

        $generated = $this->generateAfHomeTrackingNumber($order);
        $order->ch_tracking_no = $generated;
        $order->save();

        return $generated;
    }

    private function generateAfHomeTrackingNumber(CheckoutHistory $order): string
    {
        $datePart = now()->format('Ymd');
        $orderPart = str_pad((string) ((int) $order->ch_id), 4, '0', STR_PAD_LEFT);

        return "AFH-{$datePart}-{$orderPart}";
    }

    private function normalizeReferralValue(string $value): string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return '';
        }

        if (filter_var($trimmed, FILTER_VALIDATE_URL)) {
            $parts = parse_url($trimmed);
            parse_str($parts['query'] ?? '', $query);

            $fromQuery = trim((string) ($query['ref'] ?? $query['referred_by'] ?? ''));
            if ($fromQuery !== '') {
                return $fromQuery;
            }

            $path = trim((string) ($parts['path'] ?? ''), '/');
            if ($path !== '') {
                $segments = explode('/', $path);
                return trim((string) end($segments));
            }
        }

        return $trimmed;
    }

    private function resolveValidReferrer(string $referral): ?\App\Models\Customer
    {
        return \App\Models\Customer::query()
            ->select(['c_userid', 'c_username', 'c_accnt_status', 'c_lockstatus'])
            ->whereRaw('LOWER(c_username) = ?', [strtolower($referral)])
            ->where('c_lockstatus', 0)
            ->first();
    }

    private function normalizeNotificationImageUrl(?string $imageUrl): ?string
    {
        $raw = trim((string) $imageUrl);
        if ($raw === '') {
            return null;
        }

        $normalizedUrl = '';
        if (filter_var($raw, FILTER_VALIDATE_URL)) {
            $normalizedUrl = $raw;
        } elseif (str_starts_with($raw, '/')) {
            $normalizedUrl = url($raw);
        } else {
            $normalizedUrl = url('/' . ltrim($raw, '/'));
        }

        // Apply Cloudinary transformation for border radius if URL is from Cloudinary
        if (str_contains($normalizedUrl, 'cloudinary.com')) {
            $normalizedUrl = str_replace(
                '/image/upload/',
                '/image/upload/c_fill,w_400,h_300,r_20/',
                $normalizedUrl
            );
            // Add cache-busting param to force Android to reload without cache
            $normalizedUrl = $normalizedUrl . '?t=' . time();
        }

        return $normalizedUrl;
    }

    public function testOrderStatusUpdateWithFcn(Request $request)
    {
        $customer = auth('sanctum')->user();
        if (!$customer || !isset($customer->c_userid)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'checkout_id' => 'required|string',
            'status' => 'required|string|in:processing,packed,shipped,out_for_delivery,delivered,cancelled,refunded',
        ]);

        $checkoutId = (string) $validated['checkout_id'];
        $status = (string) $validated['status'];
        $customerId = (int) $customer->c_userid;

        Log::info('TEST: Customer testing order status update', [
            'checkout_id' => $checkoutId,
            'status' => $status,
            'customer_id' => $customerId,
        ]);

        $order = CheckoutHistory::query()
            ->where('ch_checkout_id', $checkoutId)
            ->where('ch_customer_id', $customerId)
            ->first();

        if (!$order) {
            Log::warning('TEST: Order not found or does not belong to customer', [
                'checkout_id' => $checkoutId,
                'customer_id' => $customerId,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Order not found or does not belong to you',
                'checkout_id' => $checkoutId,
            ], 404);
        }

        Log::info('TEST: Order found', [
            'order_id' => $order->ch_id,
            'customer_id' => $order->ch_customer_id,
            'current_status' => $order->ch_fulfillment_status,
        ]);

        // Fetch OrderNotification for custom messages and images (same as actual method)
        $orderNotificationTitle = 'Order Status Updated';
        $orderNotificationMessage = "Your order #{$checkoutId} status has been updated.";
        $orderNotificationImage = $order->ch_product_image ?: '/Images/HeroSection/sofas.jpg';
        $orderNotificationHref = '/orders';

        $orderNotification = OrderNotification::query()
            ->where('on_checkout_id', (string) $order->ch_checkout_id)
            ->first();

        if ($orderNotification) {
            $customTitle = trim((string) ($orderNotification->on_title ?? ''));
            $customMessage = trim((string) ($orderNotification->on_message ?? ''));
            $customImage = trim((string) ($orderNotification->on_product_image ?? ''));
            $customHref = trim((string) ($orderNotification->on_href ?? ''));

            Log::info('TEST: OrderNotification data found', [
                'checkout_id' => (string) $order->ch_checkout_id,
                'title' => $customTitle ?: 'EMPTY',
                'message' => $customMessage ?: 'EMPTY',
                'image' => $customImage ?: 'EMPTY',
                'href' => $customHref ?: 'EMPTY',
            ]);

            if ($customTitle !== '') {
                $orderNotificationTitle = $customTitle;
            }
            if ($customMessage !== '') {
                $orderNotificationMessage = $customMessage;
            }
            if ($customImage !== '') {
                $orderNotificationImage = $customImage;
            }
            if ($customHref !== '') {
                $orderNotificationHref = $customHref;
            }
        } else {
            Log::warning('TEST: No OrderNotification found, using defaults', [
                'checkout_id' => (string) $order->ch_checkout_id,
            ]);
        }

        $order->update([
            'ch_fulfillment_status' => $status,
        ]);

        Log::info('TEST: Order status updated in database', [
            'order_id' => $order->ch_id,
            'new_status' => $status,
        ]);

        Log::info('TEST: Sending FCM notification with OrderNotification data', [
            'order_id' => $order->ch_id,
            'customer_id' => $order->ch_customer_id,
            'title' => $orderNotificationTitle,
            'message' => $orderNotificationMessage,
            'image' => $orderNotificationImage ?: 'NO_IMAGE',
        ]);

        try {
            $fcmService = new FirebaseMessagingService();

            $fcmData = [
                'title' => $orderNotificationTitle,
                'body' => $orderNotificationMessage,
                'sound' => 'default',
                'badge' => 1,
                'mutableContent' => true,
                'data' => [
                    'order_id' => (string) $order->ch_id,
                    'checkout_id' => (string) $order->ch_checkout_id,
                    'event_type' => 'status_update',
                    'status' => (string) $status,
                    'type' => 'order_update',
                    'href' => (string) $orderNotificationHref,
                    'screen' => 'OrderDetail',
                    'params' => json_encode([
                        'orderId' => (int) $order->ch_id,
                        'checkoutId' => (string) $order->ch_checkout_id,
                    ]),
                ],
            ];

            $normalizedNotificationImage = $this->normalizeNotificationImageUrl($orderNotificationImage);
            if ($normalizedNotificationImage !== null) {
                $fcmData['image'] = $normalizedNotificationImage;
            }

            $result = $fcmService->sendToCustomer((int) $order->ch_customer_id, $fcmData);

            Log::info('TEST: FCM notification result', [
                'customer_id' => (int) $order->ch_customer_id,
                'checkout_id' => (string) $order->ch_checkout_id,
                'sent' => $result['sent'],
                'failed' => $result['failed'],
                'image_included' => !empty($orderNotificationImage),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order status updated and FCM notification sent',
                'order' => [
                    'id' => $order->ch_id,
                    'checkout_id' => $order->ch_checkout_id,
                    'customer_id' => $order->ch_customer_id,
                    'status' => $status,
                ],
                'notification' => [
                    'title' => $orderNotificationTitle,
                    'message' => $orderNotificationMessage,
                    'image' => $orderNotificationImage ?: 'none',
                    'href' => $orderNotificationHref,
                ],
                'notification_result' => [
                    'sent' => $result['sent'],
                    'failed' => $result['failed'],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('TEST: Error sending FCM notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Order status updated but FCM notification failed',
                'error' => $e->getMessage(),
                'order' => [
                    'id' => $order->ch_id,
                    'checkout_id' => $order->ch_checkout_id,
                    'customer_id' => $order->ch_customer_id,
                    'status' => $status,
                ],
            ], 500);
        }
    }

    private function removeOrderItemsFromCart(string $checkoutId): void
    {
        try {
            // Get all order items for this checkout
            $orderItems = CheckoutHistory::query()
                ->where('ch_checkout_id', $checkoutId)
                ->get();

            if ($orderItems->isEmpty()) {
                Log::warning('No order items found for checkout', ['checkout_id' => $checkoutId]);
                return;
            }

            // Get the customer ID from the first order item
            $customerId = $orderItems->first()->ch_customer_id;

            if (!$customerId) {
                Log::warning('Customer ID not found in order', ['checkout_id' => $checkoutId]);
                return;
            }

            // Collect product IDs and variants from order items
            $productVariantPairs = $orderItems->map(function ($item) {
                return [
                    'product_id' => $item->ch_product_id,
                    'variant_id' => $item->ch_variant_id,
                    'selected_color' => $item->ch_selected_color,
                    'selected_size' => $item->ch_selected_size,
                    'selected_type' => $item->ch_selected_type,
                ];
            })->toArray();

            // Remove matching cart items - only exact matches
            foreach ($productVariantPairs as $pair) {
                $query = DB::table('tbl_add_to_cart')
                    ->where('crt_customer_id', $customerId)
                    ->where('crt_product_id', $pair['product_id'])
                    ->where('crt_status', 'active');

                // Match variant only if it exists in the order
                if (!is_null($pair['variant_id'])) {
                    $query->where('crt_variant_id', $pair['variant_id']);
                } else {
                    $query->whereNull('crt_variant_id');
                }

                // Match selected options exactly (including NULL values)
                if (!is_null($pair['selected_color'])) {
                    $query->where('crt_selected_color', $pair['selected_color']);
                } else {
                    $query->whereNull('crt_selected_color');
                }

                if (!is_null($pair['selected_size'])) {
                    $query->where('crt_selected_size', $pair['selected_size']);
                } else {
                    $query->whereNull('crt_selected_size');
                }

                if (!is_null($pair['selected_type'])) {
                    $query->where('crt_selected_type', $pair['selected_type']);
                } else {
                    $query->whereNull('crt_selected_type');
                }

                $query->update([
                    'crt_status' => 'completed',
                    'crt_updated_at' => now(),
                ]);
            }

            Log::info('Cart items removed after successful payment', [
                'checkout_id' => $checkoutId,
                'customer_id' => $customerId,
                'items_removed' => count($productVariantPairs),
            ]);

            // Invalidate customer cache
            QueryOptimizerService::invalidateCustomerCaches((int) $customerId);

        } catch (\Throwable $e) {
            Log::error('Error removing cart items after payment', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
