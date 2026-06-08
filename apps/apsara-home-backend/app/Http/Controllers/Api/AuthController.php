<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\Admin;
use App\Models\Customer;
use App\Models\CustomerNotification;
use App\Models\CustomerLoginSession;
use App\Models\CustomerAddress;
use App\Models\MemberActivityLog;
use App\Models\MemberTier;
use App\Models\SystemSetting;
use App\Models\WebPageContent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use App\Support\MemberMonthlyActivation;
use App\Support\MemberActivityLogger;
use App\Support\ProfileCompletionReward;
use App\Support\TierEvaluator;
use App\Services\CloudinaryUploadService;
use App\Mail\Auth\RegistrationOtpMail;
use App\Mail\Auth\PortalLoginOtpMail;
use App\Mail\Auth\PortalLoginApprovalMail;
use App\Mail\Auth\UsernameChangeOtpMail;
use App\Mail\Auth\ReferralRegistrationAlertMail;
use App\Mail\Webstore\WebstoreReceiptMail;
use Pusher\Pusher;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private const PASSWORD_RESET_TTL_MINUTES = 60;
    // Per-identifier reset attempts allowed per minute (anti-enumeration).
    private const FORGOT_PASSWORD_MAX_PER_MINUTE = 5;
    // Per-account SMS OTP cap per day (protects Semaphore credits from drain).
    private const FORGOT_PASSWORD_OTP_DAILY_CAP = 5;
    private const LOGIN_OTP_TTL_MINUTES = 10;
    private const LOGIN_OTP_MAX_ATTEMPTS = 5;
    private const LOGIN_APPROVAL_TTL_MINUTES = 10;
    private const LOCAL_PAYMENT_HOSTS = ['localhost', '127.0.0.1', '::1'];

    public function register(Request $request)
    {
        return $this->handleRegistration($request, true);
    }

    public function mobileRegister(Request $request)
    {
        return $this->handleRegistration($request, false);
    }

    private function handleRegistration(Request $request, bool $requireTurnstile)
    {
        if ($requireTurnstile) {
            $turnstileToken = trim((string) $request->input('cf_turnstile_response', ''));
            if (!(new \App\Services\TurnstileService())->verifySignup($turnstileToken, (string) $request->ip())) {
                return response()->json(['message' => 'Bot verification failed.'], 422);
            }
        }

        $systemSettings = SystemSetting::query()->first();
        $otpEnabled = (bool) ($systemSettings?->registration_otp_enabled ?? true);
        $strictPassword = (bool) ($systemSettings?->strict_password_policy ?? true);

        $request->merge([
            'referred_by' => $this->normalizeReferralValue((string) $request->input('referred_by', '')),
            'email' => $request->input('email') ? trim((string) $request->input('email')) : null,
        ]);

        $passwordRules = $strictPassword
            ? ['required', 'string', 'min:8', 'confirmed', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/']
            : ['required', 'string', 'min:6', 'confirmed'];

        $passwordMessages = $strictPassword
            ? [
                'password.min' => 'Password must be at least 8 characters.',
                'password.confirmed' => 'Password confirmation does not match.',
                'password.regex' => 'Password must include uppercase, lowercase, number, and special character.',
            ]
            : [
                'password.min' => 'Password must be at least 6 characters.',
                'password.confirmed' => 'Password confirmation does not match.',
            ];

        $validated = $request->validate([
            'first_name'            => 'required|string|max:255',
            'last_name'             => 'required|string|max:255',
            'middle_name'           => 'nullable|string|max:255',
            'name'                  => 'required|string|max:255',
            'email'                 => ['nullable', 'email', Rule::unique('tbl_customer', 'c_email')],
            'username'              => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9]+$/', Rule::unique('tbl_customer', 'c_username')],
            'phone'                 => 'nullable|string|max:20',
            'birth_date'            => 'nullable|date',
            'gender'                => 'nullable|in:male,female,other',
            'occupation'            => 'nullable|string|max:155',
            'work_location'         => 'nullable|in:local,overseas',
            'country'               => 'nullable|string|max:45',
            'referred_by'           => 'required|string|max:255',
            'password'              => $passwordRules,
            'address'               => 'nullable|string|max:500',
            'barangay'              => 'nullable|string|max:255',
            'city'                  => 'nullable|string|max:255',
            'province'              => 'nullable|string|max:255',
            'region'                => 'nullable|string|max:255',
            'barangay_code'         => 'nullable|string|max:20',
            'city_code'             => 'nullable|string|max:20',
            'province_code'         => 'nullable|string|max:20',
            'region_code'           => 'nullable|string|max:20',
            'zip_code'              => 'nullable|string|max:20',
            'partner_slug'          => 'nullable|string|max:255',
        ], array_merge($passwordMessages, [
            'username.regex' => 'Username must contain letters and numbers only.',
        ]));

        $this->validateNoBadWords([
            'first_name' => $validated['first_name'] ?? null,
            'last_name' => $validated['last_name'] ?? null,
            'middle_name' => $validated['middle_name'] ?? null,
            'name' => $validated['name'] ?? null,
            'username' => $validated['username'] ?? null,
        ]);

        if ($this->looksLikeEmailUsername((string) ($validated['username'] ?? ''))) {
            throw ValidationException::withMessages([
                'username' => ['Username must not be an email address. Please choose a username without @gmail.com, @yahoo.com, and similar email formats.'],
            ]);
        }

        $referrer = Customer::query()
            ->select(['c_userid', 'c_username', 'c_accnt_status', 'c_lockstatus'])
            ->whereRaw('LOWER(c_username) = ?', [strtolower((string) $validated['referred_by'])])
            ->where('c_lockstatus', 0)
            ->first();

        if (! $referrer) {
            throw ValidationException::withMessages([
                'referred_by' => ['Referral code is invalid or referrer account is unavailable.'],
            ]);
        }

        $email = $validated['email'] ? (string) $validated['email'] : null;
        $partnerSlug = strtolower(trim((string) ($validated['partner_slug'] ?? '')));
        $senderContext = $this->resolvePartnerOtpSenderContext($partnerSlug);

        // OTP disabled — create account immediately without a verification step
        if (! $otpEnabled) {
            $customer = $this->createCustomerFromValidated($validated, (int) $referrer->c_userid);

            return response()->json([
                'message' => 'Registration complete. You can now sign in.',
                'requires_otp' => false,
                'user' => $this->transformCustomer($customer),
            ], 201);
        }

        $verificationToken = (string) Str::uuid();
        $otp = (string) random_int(1000, 9999);

        Cache::put($this->registrationOtpCacheKey($verificationToken), [
            'otp_hash' => Hash::make($otp),
            'payload' => Crypt::encryptString(json_encode([
                'validated' => $validated,
                'referrer_user_id' => (int) $referrer->c_userid,
            ], JSON_THROW_ON_ERROR)),
            'email' => $email,
            'sender_context' => $senderContext,
        ], now()->addMinutes(10));

        if ($email) {
            $this->sendRegistrationOtpEmail($email, $otp, $senderContext);
        }

        return response()->json([
            'message' => 'A 4-digit verification code has been sent to your email.',
            'requires_otp' => true,
            'verification_token' => $verificationToken,
            'email' => $email,
        ]);
    }

    private function createCustomerFromValidated(array $registration, int $referrerUserId): Customer
    {
        return DB::transaction(function () use ($registration, $referrerUserId): Customer {
            if (DB::connection()->getDriverName() === 'pgsql') {
                DB::statement('LOCK TABLE tbl_customer IN EXCLUSIVE MODE');
            }

            $nextCustomerId = ((int) DB::table('tbl_customer')->whereNotNull('c_userid')->max('c_userid')) + 1;

            return Customer::create([
                'c_userid'       => $nextCustomerId,
                'c_fname'        => $registration['first_name'],
                'c_lname'        => $registration['last_name'],
                'c_mname'        => $registration['middle_name'] ?? null,
                'c_username'     => $registration['username'],
                'c_email'        => $registration['email'] ?? null,
                'c_mobile'       => $registration['phone'] ?? '0',
                'c_bdate'        => $registration['birth_date'] ?? null,
                'c_gender'       => $this->mapGenderToInt($registration['gender'] ?? null),
                'c_occupation'   => $registration['occupation'] ?? 'None',
                'c_country'      => $registration['country'] ?? (($registration['work_location'] ?? 'local') === 'overseas' ? 'Overseas' : 'Philippines'),
                'c_password'     => Hash::make($registration['password']),
                'c_password_pin' => '',
                'c_password_change_required' => false,
                'c_rank'         => 0,
                'c_accnt_status' => 0,
                'c_lockstatus'   => 0,
                'c_sponsor'      => $referrerUserId,
                'c_date_started' => now(),
                'c_address'      => $registration['address'] ?? null,
                'c_barangay'     => $registration['barangay'] ?? null,
                'c_city'         => $registration['city'] ?? null,
                'c_province'     => $registration['province'] ?? null,
                'c_region'       => $registration['region'] ?? null,
                'c_region_code'  => $registration['region_code'] ?? null,
                'c_province_code'=> $registration['province_code'] ?? null,
                'c_city_code'    => $registration['city_code'] ?? null,
                'c_barangay_code'=> $registration['barangay_code'] ?? null,
                'c_zipcode'      => $registration['zip_code'] ?? null,
                'c_partner_slug' => ($slug = strtolower(trim((string) ($registration['partner_slug'] ?? '')))) !== '' ? $slug : null,
            ]);
        });
    }

    public function verifyRegistrationOtp(Request $request)
    {
        $debugId = (string) Str::uuid();
        $fail = function (string $field, string $message) use ($debugId): void {
            throw ValidationException::withMessages([
                $field => [sprintf('%s (Ref: %s)', $message, $debugId)],
            ]);
        };

        $validated = $request->validate([
            'verification_token' => 'required|string',
            'otp' => 'required|string|size:4',
            'debug_trace_id' => 'nullable|string|max:120',
        ]);
        $traceId = trim((string) ($validated['debug_trace_id'] ?? ''));

        Log::info('verifyRegistrationOtp:start', [
            'debug_id' => $debugId,
            'trace_id' => $traceId !== '' ? $traceId : null,
            'verification_token_prefix' => substr((string) $validated['verification_token'], 0, 8),
        ]);

        $cached = Cache::get($this->registrationOtpCacheKey($validated['verification_token']));

        if (!is_array($cached) || empty($cached['otp_hash']) || empty($cached['payload'])) {
            $fail('otp', 'The verification code has expired. Please register again.');
        }

        if (!Hash::check((string) $validated['otp'], (string) $cached['otp_hash'])) {
            $fail('otp', 'Invalid verification code.');
        }

        $payload = json_decode(Crypt::decryptString((string) $cached['payload']), true, 512, JSON_THROW_ON_ERROR);
        $registration = $payload['validated'] ?? [];
        $referrerUserId = (int) ($payload['referrer_user_id'] ?? 0);

        if (empty($registration['username'])) {
            $fail('otp', 'The verification payload is invalid. Please register again.');
        }

        $existingByEmail = Customer::query()
            ->whereRaw('LOWER(c_email) = ?', [mb_strtolower((string) $registration['email'], 'UTF-8')])
            ->first();
        $existingByUsername = Customer::query()
            ->whereRaw('LOWER(c_username) = ?', [mb_strtolower((string) $registration['username'], 'UTF-8')])
            ->first();

        // Idempotency: if the same account is already created for this OTP payload,
        // return success instead of failing the client with a duplicate error.
        if ($existingByEmail instanceof Customer && $existingByUsername instanceof Customer
            && (int) $existingByEmail->c_userid === (int) $existingByUsername->c_userid) {
            Cache::forget($this->registrationOtpCacheKey($validated['verification_token']));
            return response()->json([
                'message' => 'Registration complete. You can now sign in.',
                'user' => $this->transformCustomer($existingByEmail),
            ], 201);
        }

        if ($existingByEmail instanceof Customer) {
            $fail('email', 'This email is already registered.');
        }

        if ($existingByUsername instanceof Customer) {
            $fail('username', 'This username is already taken.');
        }

        $customer = $this->createCustomerFromValidated($registration, $referrerUserId);

        $requestIp = request()->ip();
        $requestUserAgent = request()->userAgent();
        Cache::forget($this->registrationOtpCacheKey($validated['verification_token']));

        Log::info('verifyRegistrationOtp:success', [
            'debug_id' => $debugId,
            'trace_id' => $traceId !== '' ? $traceId : null,
            'customer_id' => (int) $customer->c_userid,
        ]);

        $response = response()->json([
            'message' => 'Registration complete. You can now sign in.',
            'user' => $this->transformCustomer($customer),
            'debug_id' => $debugId,
        ], 201);

        // Avoid corrupting JSON responses in local/dev when heavy post-registration
        // hooks can hit timeouts. Enable explicitly when infra can handle it.
        $runPostRegistrationHooks = (bool) env('AUTH_RUN_POST_REGISTRATION_HOOKS', false);
        if ($runPostRegistrationHooks) {
            dispatch(function () use ($customer, $referrerUserId, $requestIp, $requestUserAgent): void {
                try {
                    $this->createPrimaryAddressRecord($customer);
                    $referrer = Customer::query()->where('c_userid', $referrerUserId)->first();
                    if ($referrer instanceof Customer) {
                        $this->notifyReferrerAboutRegistration($referrer, $customer);
                        TierEvaluator::evaluate($referrer);
                    }
                    $this->notifyAdminsAboutNewRegistration($customer);
                } catch (\Throwable $e) {
                    Log::warning('Post-registration hooks failed after account creation', [
                        'customer_id' => (int) $customer->c_userid,
                        'error' => $e->getMessage(),
                    ]);
                }

                try {
                    MemberActivityLog::create([
                        'mal_customer_id' => (int) $customer->c_userid,
                        'mal_activity_type' => 'registration',
                        'mal_action' => MemberActivityLog::ACTION_CREATE,
                        'mal_description' => 'New member registered',
                        'mal_resource_type' => 'account',
                        'mal_resource_id' => (int) $customer->c_userid,
                        'mal_details' => [
                            'username' => $customer->c_username,
                            'email' => $customer->c_email,
                            'referrer_id' => $referrerUserId,
                        ],
                        'mal_ip_address' => $requestIp,
                        'mal_user_agent' => $requestUserAgent,
                        'mal_created_at' => now(),
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('Failed to log registration activity', [
                        'customer_id' => (int) $customer->c_userid,
                        'error' => $e->getMessage(),
                    ]);
                }
            })->afterResponse();
        } else {
            Log::info('verifyRegistrationOtp:post-hooks-skipped', [
                'debug_id' => $debugId,
                'trace_id' => $traceId !== '' ? $traceId : null,
                'customer_id' => (int) $customer->c_userid,
            ]);
        }

        return $response;
    }

    public function resendRegistrationOtp(Request $request)
    {
        $validated = $request->validate([
            'verification_token' => 'required|string',
        ]);

        $cached = Cache::get($this->registrationOtpCacheKey($validated['verification_token']));

        if (!is_array($cached) || empty($cached['payload']) || empty($cached['email'])) {
            throw ValidationException::withMessages([
                'verification_token' => ['The verification session has expired. Please register again.'],
            ]);
        }

        $otp = (string) random_int(1000, 9999);

        Cache::put($this->registrationOtpCacheKey($validated['verification_token']), [
            'otp_hash' => Hash::make($otp),
            'payload' => $cached['payload'],
            'email' => (string) $cached['email'],
        ], now()->addMinutes(10));

        $senderContext = is_array($cached['sender_context'] ?? null) ? $cached['sender_context'] : [];
        $this->sendRegistrationOtpEmail((string) $cached['email'], $otp, $senderContext);

        return response()->json([
            'message' => 'A new verification code has been sent.',
        ]);
    }

    public function checkUsernameAvailability(Request $request)
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
        ]);

        $username = trim((string) $validated['username']);

        if ($username === '') {
            return response()->json([
                'available' => false,
                'message' => 'Username is required.',
            ], 422);
        }

        if (! preg_match('/^[A-Za-z0-9]+$/', $username)) {
            return response()->json([
                'available' => false,
                'message' => 'Username must contain letters and numbers only.',
            ]);
        }

        if ($this->looksLikeEmailUsername($username)) {
            return response()->json([
                'available' => false,
                'message' => 'Username must not be an email address.',
            ]);
        }

        $exists = Customer::query()
            ->whereRaw('LOWER(c_username) = ?', [mb_strtolower($username, 'UTF-8')])
            ->exists();

        return response()->json([
            'available' => ! $exists,
            'message' => $exists ? 'This username is already taken.' : 'Username is available.',
        ]);
    }

    public function checkEmailAvailability(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $email = trim((string) $validated['email']);

        if ($email === '') {
            return response()->json([
                'available' => false,
                'message' => 'Email address is required.',
            ], 422);
        }

        $exists = Customer::query()
            ->whereRaw('LOWER(c_email) = ?', [mb_strtolower($email, 'UTF-8')])
            ->exists();

        return response()->json([
            'available' => ! $exists,
            'message' => $exists ? 'This email is already registered.' : 'Email address is available.',
        ]);
    }

    public function checkReferralAvailability(Request $request)
    {
        $validated = $request->validate([
            'referred_by' => ['required', 'string', 'max:255'],
        ]);

        $referral = $this->normalizeReferralValue((string) $validated['referred_by']);

        if ($referral === '') {
            return response()->json([
                'available' => false,
                'message' => 'Referral code is required.',
            ], 422);
        }

        $referrer = Customer::query()
            ->select(['c_userid', 'c_username'])
            ->whereRaw('LOWER(c_username) = ?', [mb_strtolower($referral, 'UTF-8')])
            ->where('c_lockstatus', 0)
            ->first();

        return response()->json([
            'available' => $referrer instanceof Customer,
            'message' => $referrer instanceof Customer
                ? 'Referral code is valid.'
                : 'Referral code is invalid or referrer account is unavailable.',
            'normalized_referral' => $referral,
            'referrer_username' => $referrer instanceof Customer ? (string) ($referrer->c_username ?? '') : null,
        ]);
    }

    public function publicProfile($username)
    {
        try {
            if (empty($username)) {
                return response()->json(['message' => 'Username is required.'], 400);
            }

            $customer = Customer::query()
                ->whereRaw('LOWER(c_username) = ?', [mb_strtolower(trim((string) $username), 'UTF-8')])
                ->where('c_lockstatus', 0)
                ->first();

            if (!$customer) {
                return response()->json(['message' => 'User not found.'], 404);
            }

            // Get customer name - try different column names that might exist
            $fullName = '';

            if (!empty($customer->c_fname) || !empty($customer->c_lname)) {
                $fullName = trim(implode(' ', array_filter([
                    $customer->c_fname ?? '',
                    $customer->c_lname ?? '',
                ])));
            } elseif (!empty($customer->c_first_name) || !empty($customer->c_last_name)) {
                $fullName = trim(implode(' ', array_filter([
                    $customer->c_first_name ?? '',
                    $customer->c_last_name ?? '',
                ])));
            } elseif (!empty($customer->c_name)) {
                $fullName = (string) $customer->c_name;
            }

            return response()->json([
                'username' => (string) ($customer->c_username ?? ''),
                'name' => $fullName ?: (string) ($customer->c_username ?? ''),
                'avatar_url' => !empty($customer->c_avatar_url) ? (string) $customer->c_avatar_url : null,
                'avatar_original_url' => !empty($customer->c_avatar_url) ? (string) $customer->c_avatar_url : null,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching public profile: ' . $e->getMessage(), [
                'username' => $username,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Failed to fetch profile.'], 500);
        }
    }

    public function login(Request $request)
    {
        $mfaChallengeToken = trim((string) $request->input('mfa_challenge_token', ''));
        $isMfaContinuation = $mfaChallengeToken !== '';

        if (! $isMfaContinuation) {
            $turnstileToken = trim((string) $request->input('cf_turnstile_response', ''));
            if (!(new \App\Services\TurnstileService())->verifyLogin($turnstileToken, (string) $request->ip())) {
                return response()->json(['message' => 'Bot verification failed.'], 422);
            }
        }

        return $this->handleLogin($request);
    }

    public function mobileLogin(Request $request)
    {
        return $this->handleLoginMobile($request);
    }

    private function handleLogin(Request $request)
    {
        $otpValue = trim((string) $request->input('otp', ''));
        $challengeTokenValue = trim((string) $request->input('otp_challenge_token', ''));
        $mfaChallengeTokenValue = trim((string) $request->input('mfa_challenge_token', ''));
        $otpLower = strtolower($otpValue);
        $challengeLower = strtolower($challengeTokenValue);
        $mfaChallengeLower = strtolower($mfaChallengeTokenValue);
        $request->merge([
            'otp' => (!in_array($otpLower, ['', 'undefined', 'null'], true)) ? $otpValue : null,
            'otp_challenge_token' => (!in_array($challengeLower, ['', 'undefined', 'null'], true)) ? $challengeTokenValue : null,
            'mfa_challenge_token' => (!in_array($mfaChallengeLower, ['', 'undefined', 'null'], true)) ? $mfaChallengeTokenValue : null,
        ]);

        $request->validate([
            'email'    => 'required|string',
            'password' => 'required|string',
            'otp' => 'nullable|string|size:6',
            'otp_challenge_token' => 'nullable|string',
            'mfa_challenge_token' => 'nullable|string',
        ]);

        $identifier = trim($request->email);
        $customer = Customer::query()
            ->where(function ($query) use ($identifier) {
                $query
                    ->whereRaw('LOWER(c_email) = ?', [mb_strtolower($identifier, 'UTF-8')])
                    ->orWhereRaw('LOWER(c_username) = ?', [mb_strtolower($identifier, 'UTF-8')]);
            })
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $password = (string) $request->password;
        $hashMatch = $this->matchesHashedCustomerPassword($customer, $password);
        $legacyDirectMatch = $this->matchesLegacyCustomerPassword($customer, $password, false);
        $legacyCaseInsensitiveMatch = $this->matchesLegacyCustomerPassword($customer, $password, true);
        if (! $hashMatch && ! $legacyDirectMatch && ! $legacyCaseInsensitiveMatch) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ((int) ($customer->c_lockstatus ?? 0) === 1) {
            return response()->json([
                'message' => 'Your account has been banned. Please contact support for assistance.',
                'reason' => 'banned',
            ], 403);
        }

        if ((bool) ($customer->c_two_factor_enabled ?? false)) {
            $approvalRequired = $this->requiresLoginApproval($customer, $request);
            $mfaChallengeToken = trim((string) $request->input('mfa_challenge_token', ''));

            if ($approvalRequired) {
                if ($mfaChallengeToken === '') {
                    $mfaChallengeToken = (string) Str::uuid();
                    $this->issueLoginApprovalChallenge(
                        challengeToken: $mfaChallengeToken,
                        customer: $customer,
                        request: $request,
                    );

                    return response()->json([
                        'requires_mfa_approval' => true,
                        'mfa_challenge_token' => $mfaChallengeToken,
                        'message' => 'A new device sign-in approval link was sent to your email.',
                    ], 202);
                }

                $approvalStatus = $this->getLoginApprovalChallengeStatus($mfaChallengeToken, $customer);
                if ($approvalStatus === 'pending') {
                    return response()->json([
                        'requires_mfa_approval' => true,
                        'mfa_challenge_token' => $mfaChallengeToken,
                        'message' => 'Please approve this sign-in from your email before continuing.',
                    ], 202);
                }

                if ($approvalStatus === 'denied') {
                    throw ValidationException::withMessages([
                        'login' => ['This sign-in request was denied. Please try again if this was you.'],
                    ]);
                }

                if ($approvalStatus !== 'approved') {
                    throw ValidationException::withMessages([
                        'login' => ['The sign-in approval session has expired. Please sign in again.'],
                    ]);
                }

                $this->consumeLoginApprovalChallenge($mfaChallengeToken);
            }
        }

        $systemSettings = SystemSetting::query()->first();
        $forcePasswordChangeEnabled = (bool) ($systemSettings?->force_password_change_enabled ?? true);

        $modernPasswordInUse = $hashMatch
            && ! $legacyDirectMatch
            && ! $legacyCaseInsensitiveMatch
            && $this->passwordMeetsModernRequirements($password);

        if (! $forcePasswordChangeEnabled) {
            // Forced password change is disabled — clear any existing flag and let the user in.
            if ($this->customerRequiresPasswordChange($customer) || trim((string) ($customer->c_password_pin ?? '')) !== '') {
                $customer->c_password_change_required = false;
                $customer->c_password_pin = '';
                $customer->save();
            }
            $mustChangePassword = false;
        } else {
            if (
                $modernPasswordInUse
                && trim((string) ($customer->c_password_pin ?? '')) === ''
                && $this->customerRequiresPasswordChange($customer)
            ) {
                $customer->c_password_change_required = false;
            }

            $mustChangePassword = $this->customerRequiresPasswordChange($customer)
                || $legacyDirectMatch
                || $legacyCaseInsensitiveMatch
                || ! $this->passwordMeetsModernRequirements($password);

            if (
                $hashMatch
                && ! $legacyDirectMatch
                && ! $legacyCaseInsensitiveMatch
                && trim((string) ($customer->c_password_pin ?? '')) !== ''
            ) {
                $customer->c_password_pin = '';
            }

            if ($mustChangePassword && ! $this->customerRequiresPasswordChange($customer)) {
                $customer->c_password_change_required = true;
            }

            if ($customer->isDirty(['c_password_pin', 'c_password_change_required'])) {
                $customer->save();
            }
        }

        $tokenResult = $customer->createToken('auth_token');
        $token = $tokenResult->plainTextToken;
        $plainTokenId = (int) ($tokenResult->accessToken->id ?? 0);
        try {
            $this->recordLoginSession($customer, $request, $plainTokenId > 0 ? $plainTokenId : null);
            MemberActivityLogger::logLogin((int) $customer->c_userid, $request);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'user'  => $this->transformCustomer($customer),
            'token' => $token,
            'message' => $mustChangePassword
                ? 'Your account was signed in using a legacy password. Please change your password before continuing to the shop.'
                : null,
        ]);
    }

    private function handleLoginMobile(Request $request)
    {
        $request->validate([
            'email'    => 'required|string',
            'password' => 'required|string',
        ]);

        $identifier = trim($request->email);
        $customer = Customer::query()
            ->where(function ($query) use ($identifier) {
                $query
                    ->whereRaw('LOWER(c_email) = ?', [mb_strtolower($identifier, 'UTF-8')])
                    ->orWhereRaw('LOWER(c_username) = ?', [mb_strtolower($identifier, 'UTF-8')]);
            })
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $password = (string) $request->password;
        $hashMatch = $this->matchesHashedCustomerPassword($customer, $password);
        $legacyDirectMatch = $this->matchesLegacyCustomerPassword($customer, $password, false);
        $legacyCaseInsensitiveMatch = $this->matchesLegacyCustomerPassword($customer, $password, true);
        if (! $hashMatch && ! $legacyDirectMatch && ! $legacyCaseInsensitiveMatch) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ((int) ($customer->c_lockstatus ?? 0) === 1) {
            return response()->json([
                'message' => 'Your account has been banned. Please contact support for assistance.',
                'reason' => 'banned',
            ], 403);
        }

        $systemSettings = SystemSetting::query()->first();
        $forcePasswordChangeEnabled = (bool) ($systemSettings?->force_password_change_enabled ?? true);

        $modernPasswordInUse = $hashMatch
            && ! $legacyDirectMatch
            && ! $legacyCaseInsensitiveMatch
            && $this->passwordMeetsModernRequirements($password);

        if (! $forcePasswordChangeEnabled) {
            if ($this->customerRequiresPasswordChange($customer) || trim((string) ($customer->c_password_pin ?? '')) !== '') {
                $customer->c_password_change_required = false;
                $customer->c_password_pin = '';
                $customer->save();
            }
            $mustChangePassword = false;
        } else {
            if (
                $modernPasswordInUse
                && trim((string) ($customer->c_password_pin ?? '')) === ''
                && $this->customerRequiresPasswordChange($customer)
            ) {
                $customer->c_password_change_required = false;
            }

            $mustChangePassword = $this->customerRequiresPasswordChange($customer)
                || $legacyDirectMatch
                || $legacyCaseInsensitiveMatch
                || ! $this->passwordMeetsModernRequirements($password);

            if (
                $hashMatch
                && ! $legacyDirectMatch
                && ! $legacyCaseInsensitiveMatch
                && trim((string) ($customer->c_password_pin ?? '')) !== ''
            ) {
                $customer->c_password_pin = '';
            }

            if ($mustChangePassword && ! $this->customerRequiresPasswordChange($customer)) {
                $customer->c_password_change_required = true;
            }

            if ($customer->isDirty(['c_password_pin', 'c_password_change_required'])) {
                $customer->save();
            }
        }

        $tokenResult = $customer->createToken('auth_token');
        $token = $tokenResult->plainTextToken;
        $plainTokenId = (int) ($tokenResult->accessToken->id ?? 0);
        try {
            $this->recordLoginSession($customer, $request, $plainTokenId > 0 ? $plainTokenId : null);
            $this->logLoginActivity($customer, $request, 'email');
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'user'  => $this->transformCustomer($customer),
            'token' => $token,
            'message' => $mustChangePassword
                ? 'Your account was signed in using a legacy password. Please change your password before continuing to the shop.'
                : null,
        ]);
    }

    public function resendLoginOtp(Request $request)
    {
        $request->validate([
            'mfa_challenge_token' => 'required|string',
        ]);

        $challengeToken = trim((string) $request->input('mfa_challenge_token'));
        $cached = Cache::get($this->loginApprovalCacheKey($challengeToken));
        if (! is_array($cached) || empty($cached['customer_id'])) {
            throw ValidationException::withMessages([
                'mfa_challenge_token' => ['The sign-in approval session has expired. Please sign in again.'],
            ]);
        }

        $customer = Customer::query()->where('c_userid', (int) $cached['customer_id'])->first();
        if (! $customer) {
            Cache::forget($this->loginApprovalCacheKey($challengeToken));
            throw ValidationException::withMessages([
                'mfa_challenge_token' => ['Customer account not found. Please sign in again.'],
            ]);
        }

        $this->issueLoginApprovalChallenge(
            challengeToken: $challengeToken,
            customer: $customer,
            request: $request,
            preserveStatus: true,
        );

        return response()->json([
            'requires_mfa_approval' => true,
            'mfa_challenge_token' => $challengeToken,
            'message' => 'A new sign-in approval email has been sent.',
        ]);
    }

    public function loginMfaStatus(Request $request)
    {
        $validated = $request->validate([
            'mfa_challenge_token' => 'required|string',
        ]);

        $challengeToken = trim((string) $validated['mfa_challenge_token']);
        $cached = Cache::get($this->loginApprovalCacheKey($challengeToken));
        if (! is_array($cached) || empty($cached['status'])) {
            return response()->json([
                'status' => 'expired',
                'message' => 'Sign-in approval session expired. Please sign in again.',
            ], 410);
        }

        return response()->json([
            'status' => (string) $cached['status'],
            'message' => match ((string) $cached['status']) {
                'approved' => 'Sign-in approved. You can continue in your app.',
                'denied' => 'Sign-in request denied.',
                default => 'Waiting for your approval.',
            },
        ]);
    }

    public function respondLoginMfa(Request $request)
    {
        $validated = $request->validate([
            'mfa_challenge_token' => 'required|string',
            'decision' => 'required|string|in:approve,deny',
        ]);

        $challengeToken = trim((string) $validated['mfa_challenge_token']);
        $cached = Cache::get($this->loginApprovalCacheKey($challengeToken));
        if (! is_array($cached) || empty($cached['customer_id'])) {
            return response()->json([
                'status' => 'expired',
                'message' => 'This sign-in request has expired.',
            ], 410);
        }

        $status = ((string) $validated['decision']) === 'approve' ? 'approved' : 'denied';
        $cached['status'] = $status;
        $cached['responded_at'] = now()->toIso8601String();
        Cache::put(
            $this->loginApprovalCacheKey($challengeToken),
            $cached,
            now()->addMinutes(self::LOGIN_APPROVAL_TTL_MINUTES),
        );

        return response()->json([
            'status' => $status,
            'message' => $status === 'approved'
                ? 'Sign-in approved. You can go back to the app.'
                : 'Sign-in denied. If this was not you, please change your password.',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $existingResetToken = trim((string) $request->input('reset_token', ''));
        if ($existingResetToken !== '') {
            return $this->resendPasswordResetOtp($existingResetToken);
        }

        $turnstileToken = trim((string) $request->input('cf_turnstile_response', ''));
        if (!(new \App\Services\TurnstileService())->verifyForgotPassword($turnstileToken, (string) $request->ip())) {
            return response()->json(['message' => 'Bot verification failed.'], 422);
        }

        $validated = $request->validate([
            'identifier' => 'nullable|string|max:255',
            'email' => 'nullable|string|max:255',
        ]);

        $identifier = trim((string) ($validated['identifier'] ?? $validated['email'] ?? ''));
        if ($identifier === '') {
            throw ValidationException::withMessages([
                'identifier' => ['Email, username, or mobile number is required.'],
            ]);
        }

        // Per-identifier throttle: blunts targeted account enumeration even when an
        // attacker rotates IPs or solves the captcha. Applied BEFORE the lookup and
        // keyed by the normalized identifier, so it behaves identically whether or
        // not the account exists (no timing/behaviour leak from this guard itself).
        $identifierThrottleKey = 'forgot-password|id:' . mb_strtolower($identifier, 'UTF-8');
        if (RateLimiter::tooManyAttempts($identifierThrottleKey, self::FORGOT_PASSWORD_MAX_PER_MINUTE)) {
            $retryAfter = RateLimiter::availableIn($identifierThrottleKey);

            return response()->json([
                'message' => 'Too many reset attempts for this account. Please wait ' . $retryAfter . ' seconds and try again.',
            ], 429);
        }
        RateLimiter::hit($identifierThrottleKey, 60);

        $customer = $this->findCustomerForPasswordReset($identifier);
        $phone = $customer instanceof Customer ? trim((string) ($customer->c_mobile ?? '')) : '';

        // No account, OR an account without a usable mobile number — return a single
        // combined message so we never reveal which of the two is actually true.
        if (! ($customer instanceof Customer) || ! $this->hasUsablePhoneNumber($phone)) {
            return response()->json([
                'message' => 'No account found with a registered mobile number. Please check your details and try again.',
            ], 404);
        }

        // Per-account daily OTP cap — even a determined attacker (or a stuck client)
        // cannot drain SMS credits by repeatedly requesting codes for a known account.
        $otpCapKey = 'forgot-password-otp-cap|cust:' . (int) $customer->c_userid;
        $otpSentToday = (int) Cache::get($otpCapKey, 0);
        if ($otpSentToday >= self::FORGOT_PASSWORD_OTP_DAILY_CAP) {
            return response()->json([
                'message' => 'You have reached the maximum number of reset codes for today. Please try again tomorrow or contact support.',
            ], 429);
        }

        $token = Str::random(64);
        $otp = (string) random_int(1000, 9999);
        $expiresAt = now()->addMinutes(self::PASSWORD_RESET_TTL_MINUTES);
        $payload = [
            'customer_id' => (int) $customer->c_userid,
            'email' => (string) $customer->c_email,
            'name' => $this->fullName($customer),
            'phone' => $phone,
            'otp_hash' => Hash::make($otp),
            'expires_at' => $expiresAt->toIso8601String(),
        ];

        $sent = (new \App\Services\SemaphoreService())->sendPasswordResetOtp($phone, $otp);

        if ($sent) {
            Cache::put($this->passwordResetCacheKey($token), $payload, $expiresAt);
            // Count this send toward the per-account daily cap (window resets after 24h).
            Cache::put($otpCapKey, $otpSentToday + 1, now()->addDay());

            return response()->json([
                'message' => 'A password reset OTP has been sent to your registered mobile number.',
                'requires_otp' => true,
                'reset_token' => $token,
                'phone' => $this->maskPhoneNumber($phone),
                'expires_at' => $expiresAt->toIso8601String(),
            ]);
        }

        Log::error('Password reset OTP send failed', [
            'customer_id' => (int) $customer->c_userid,
            'phone' => $this->maskPhoneNumber($phone),
        ]);

        return response()->json([
            'message' => 'We could not send the reset code right now. Please try again in a few minutes.',
        ], 502);
    }

    private function resendPasswordResetOtp(string $token)
    {
        $cacheKey = $this->passwordResetCacheKey($token);
        $payload = Cache::get($cacheKey);

        if (! is_array($payload) || empty($payload['customer_id']) || empty($payload['phone'])) {
            throw ValidationException::withMessages([
                'token' => ['Password reset session is invalid or expired.'],
            ]);
        }

        $phone = trim((string) $payload['phone']);
        if (! $this->hasUsablePhoneNumber($phone)) {
            throw ValidationException::withMessages([
                'phone' => ['This account has no registered mobile number for password reset.'],
            ]);
        }

        // Resends share the same per-account daily OTP cap as the initial send,
        // so this path cannot be used to bypass the SMS credit protection.
        $otpCapKey = 'forgot-password-otp-cap|cust:' . (int) $payload['customer_id'];
        $otpSentToday = (int) Cache::get($otpCapKey, 0);
        if ($otpSentToday >= self::FORGOT_PASSWORD_OTP_DAILY_CAP) {
            return response()->json([
                'message' => 'You have reached the maximum number of reset codes for today. Please try again tomorrow or contact support.',
            ], 429);
        }

        $otp = (string) random_int(1000, 9999);
        $expiresAt = now()->addMinutes(self::PASSWORD_RESET_TTL_MINUTES);
        $payload['otp_hash'] = Hash::make($otp);
        $payload['expires_at'] = $expiresAt->toIso8601String();

        $sent = (new \App\Services\SemaphoreService())->sendPasswordResetOtp($phone, $otp);
        if (! $sent) {
            throw ValidationException::withMessages([
                'otp' => ['Unable to send OTP right now. Please try again shortly.'],
            ]);
        }

        Cache::put($cacheKey, $payload, $expiresAt);
        Cache::put($otpCapKey, $otpSentToday + 1, now()->addDay());
        Cache::forget($this->passwordResetAttemptsCacheKey($token));

        return response()->json([
            'message' => 'A new password reset OTP has been sent to your registered mobile number.',
            'requires_otp' => true,
            'reset_token' => $token,
            'phone' => $this->maskPhoneNumber($phone),
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    public function showResetToken(string $token)
    {
        $payload = Cache::get($this->passwordResetCacheKey($token));
        if (!is_array($payload)) {
            return response()->json(['message' => 'Reset link is invalid or expired.'], 404);
        }

        return response()->json([
            'reset' => [
                'email' => (string) $payload['email'],
                'name' => (string) $payload['name'],
                'expires_at' => (string) $payload['expires_at'],
            ],
        ]);
    }

    /**
     * Verify a password-reset OTP without consuming the session, so the UI can
     * advance to the new-password step. Shares the same per-token attempt cap as
     * resetPassword(), so the 4-digit code cannot be brute-forced here either.
     */
    public function verifyResetOtp(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'otp' => 'required|string|size:4',
        ]);

        $token = (string) $validated['token'];
        $payload = Cache::get($this->passwordResetCacheKey($token));
        if (! is_array($payload)) {
            throw ValidationException::withMessages([
                'token' => ['Password reset session is invalid or expired.'],
            ]);
        }

        // Sessions without an OTP hash are already considered verified.
        if (empty($payload['otp_hash'])) {
            return response()->json(['verified' => true, 'message' => 'Code verified.']);
        }

        $attemptsKey = $this->passwordResetAttemptsCacheKey($token);
        $attempts = (int) Cache::get($attemptsKey, 0);

        if ($attempts >= 5) {
            Cache::forget($this->passwordResetCacheKey($token));
            Cache::forget($attemptsKey);

            throw ValidationException::withMessages([
                'otp' => ['Too many invalid OTP attempts. Please request a new code.'],
            ]);
        }

        $otp = trim((string) $validated['otp']);
        if (! Hash::check($otp, (string) $payload['otp_hash'])) {
            Cache::put($attemptsKey, $attempts + 1, now()->addMinutes(self::PASSWORD_RESET_TTL_MINUTES));

            throw ValidationException::withMessages([
                'otp' => ['Invalid verification code.'],
            ]);
        }

        // Valid code — clear the failed-attempt counter but keep the session intact;
        // the OTP is re-checked when the password is actually submitted.
        Cache::forget($attemptsKey);

        return response()->json(['verified' => true, 'message' => 'Code verified.']);
    }

    public function resetPassword(Request $request)
    {
        $systemSettings = SystemSetting::query()->first();
        $strictPassword = (bool) ($systemSettings?->strict_password_policy ?? true);

        $passwordRules = $strictPassword
            ? ['required', 'string', 'min:8', 'confirmed', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/']
            : ['required', 'string', 'min:6', 'confirmed'];

        $passwordMessages = $strictPassword
            ? [
                'password.min' => 'Password must be at least 8 characters.',
                'password.confirmed' => 'Password confirmation does not match.',
                'password.regex' => 'Password must include uppercase, lowercase, number, and special character.',
            ]
            : [
                'password.min' => 'Password must be at least 6 characters.',
                'password.confirmed' => 'Password confirmation does not match.',
            ];

        $validated = $request->validate([
            'token' => 'required|string',
            'otp' => 'nullable|string|size:4',
            'password' => $passwordRules,
        ], $passwordMessages);

        $token = (string) $validated['token'];
        $payload = Cache::get($this->passwordResetCacheKey($token));
        if (!is_array($payload)) {
            throw ValidationException::withMessages([
                'token' => ['Password reset session is invalid or expired.'],
            ]);
        }

        if (! empty($payload['otp_hash'])) {
            $attemptsKey = $this->passwordResetAttemptsCacheKey($token);
            $attempts = (int) Cache::get($attemptsKey, 0);

            if ($attempts >= 5) {
                Cache::forget($this->passwordResetCacheKey($token));
                Cache::forget($attemptsKey);

                throw ValidationException::withMessages([
                    'otp' => ['Too many invalid OTP attempts. Please request a new code.'],
                ]);
            }

            $otp = trim((string) ($validated['otp'] ?? ''));
            if ($otp === '' || ! Hash::check($otp, (string) $payload['otp_hash'])) {
                $newAttempts = $attempts + 1;
                Cache::put($attemptsKey, $newAttempts, now()->addMinutes(self::PASSWORD_RESET_TTL_MINUTES));

                throw ValidationException::withMessages([
                    'otp' => ['Invalid verification code.'],
                ]);
            }

            Cache::forget($attemptsKey);
        }

        $customer = Customer::query()->where('c_userid', (int) $payload['customer_id'])->first();
        if (! $customer) {
            Cache::forget($this->passwordResetCacheKey($token));

            throw ValidationException::withMessages([
                'token' => ['Customer account could not be found.'],
            ]);
        }

        $plainPassword = (string) $validated['password'];
        $customer->c_password = Hash::make($plainPassword);
        $customer->c_password_pin = '';
        $customer->save();

        Cache::forget($this->passwordResetCacheKey($token));

        return response()->json([
            'message' => 'Your password has been reset. You may now sign in.',
        ]);
    }

    public function logout(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();
        $token = $customer->currentAccessToken();
        $tokenId = $token instanceof PersonalAccessToken ? (int) $token->id : 0;

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        try {
            if ($tokenId > 0) {
                $this->revokeSessionByTokenId((int) $customer->c_userid, $tokenId, 'logout');
            }
            MemberActivityLogger::logLogout((int) $customer->c_userid, $request);
        } catch (\Throwable $e) {
            report($e);
        }

        // Log logout activity
        try {
            if ($customer instanceof Customer) {
                MemberActivityLog::create([
                    'mal_customer_id' => (int) $customer->c_userid,
                    'mal_activity_type' => MemberActivityLog::ACTIVITY_LOGOUT,
                    'mal_action' => MemberActivityLog::ACTION_CREATE,
                    'mal_description' => 'Member logged out from all devices',
                    'mal_ip_address' => $request->ip(),
                    'mal_user_agent' => $request->userAgent(),
                    'mal_created_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to log logout activity', [
                'customer_id' => $customer->c_userid ?? null,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Logged out successfully from all devices.']);
    }

    public function me(Request $request)
    {
        $customer = $request->user();

        if ($customer instanceof Customer) {
            $customer->loadMissing('sponsor:c_userid,c_username,c_fname,c_mname,c_lname');
        }

        if ((int) ($customer->c_lockstatus ?? 0) === 1) {
            optional($customer->currentAccessToken())->delete();

            return response()->json([
                'message' => 'Your account has been banned. Please contact support for assistance.',
                'reason' => 'banned',
            ], 401);
        }

        try {
            $currentTokenId = (int) ($customer->currentAccessToken()?->id ?? 0);
            if ($currentTokenId > 0) {
                $this->touchSessionByTokenId((int) $customer->c_userid, $currentTokenId);
            }
        } catch (\Throwable $e) {
            report($e);
        }

        $this->creditProfileCompletionRewardIfEligible($customer);
        $customer->refresh();
        $customer->loadMissing('sponsor:c_userid,c_username,c_fname,c_mname,c_lname');

        return response()->json($this->transformCustomer($customer));
    }

    public function activity(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $items = MemberActivityLog::forCustomer((int) $customer->c_userid)
            ->where('mal_activity_type', MemberActivityLog::ACTIVITY_LOGIN)
            ->orderByDesc('mal_created_at')
            ->limit(5)
            ->get()
            ->map(function (MemberActivityLog $log): array {
                return [
                    'id' => (int) $log->mal_id,
                    'activity_type' => (string) $log->mal_activity_type,
                    'action' => (string) $log->mal_action,
                    'title' => $this->activityTitle($log),
                    'description' => (string) ($log->mal_description ?? ''),
                    'created_at' => optional($log->mal_created_at)->toIso8601String(),
                    'ip_address' => (string) ($log->mal_ip_address ?? ''),
                    'user_agent' => (string) ($log->mal_user_agent ?? ''),
                ];
            })
            ->values();

        return response()->json([
            'items' => $items,
        ]);
    }

    public function sessions(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();
        $currentTokenId = (int) ($customer->currentAccessToken()?->id ?? 0);

        $tokenRows = PersonalAccessToken::query()
            ->where('tokenable_type', Customer::class)
            ->where('tokenable_id', (int) $customer->c_userid)
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $tokenIds = $tokenRows->pluck('id')->map(fn ($id) => (int) $id)->filter(fn (int $id) => $id > 0)->values();

        $resolvedLocation = $this->resolveRequestLocation($request);

        $sessionsByToken = collect();
        $sessionRows = collect();
        if ($this->isSessionTrackingReady() && $tokenIds->isNotEmpty()) {
            $sessionsByToken = CustomerLoginSession::query()
                ->where('cls_customer_id', (int) $customer->c_userid)
                ->whereIn('cls_token_id', $tokenIds->all())
                ->whereNull('cls_revoked_at')
                ->orderByDesc('cls_last_active_at')
                ->orderByDesc('cls_created_at')
                ->get()
                ->keyBy(fn (CustomerLoginSession $row) => (int) ($row->cls_token_id ?? 0));
        }
        if ($this->isSessionTrackingReady()) {
            $sessionRows = CustomerLoginSession::query()
                ->where('cls_customer_id', (int) $customer->c_userid)
                ->whereNull('cls_revoked_at')
                ->orderByDesc('cls_last_active_at')
                ->orderByDesc('cls_created_at')
                ->limit(100)
                ->get();
        }

        $tokenItems = $tokenRows
            ->map(function (PersonalAccessToken $token) use ($sessionsByToken, $currentTokenId, $resolvedLocation): array {
                $tokenId = (int) $token->id;
                /** @var CustomerLoginSession|null $session */
                $session = $sessionsByToken->get($tokenId);

                $platform = (string) ($session?->cls_platform ?? 'Unknown OS');
                $browser = (string) ($session?->cls_browser ?? 'Unknown Browser');
                $device = (string) ($session?->cls_device ?? 'Desktop');
                $locationRaw = (string) ($session?->cls_location ?? 'Unknown location');
                $location = $locationRaw;
                if ($locationRaw === 'Current location' || trim($locationRaw) === '') {
                    $location = $resolvedLocation;
                }
                $ipAddress = (string) ($session?->cls_ip_address ?? '');
                $userAgent = (string) ($session?->cls_user_agent ?? '');

                if (($platform === 'Unknown OS' || $browser === 'Unknown Browser') && $userAgent !== '') {
                    [$uaPlatform, $uaBrowser, $uaDevice] = $this->detectDeviceInfo($userAgent);
                    $platform = $uaPlatform;
                    $browser = $uaBrowser;
                    $device = $uaDevice;
                }

                $createdAt = $session?->cls_created_at ?? $token->created_at;
                $lastActiveAt = $session?->cls_last_active_at ?? $token->last_used_at ?? $token->created_at;

                return [
                    'id' => (int) ($session?->cls_id ?? 0),
                    'token_id' => $tokenId,
                    'device' => $device,
                    'platform' => $platform,
                    'browser' => $browser,
                    'location' => $location,
                    'ip_address' => $ipAddress,
                    'user_agent' => $userAgent,
                    'created_at' => optional($createdAt)->toIso8601String(),
                    'last_active_at' => optional($lastActiveAt)->toIso8601String(),
                    'is_current' => $tokenId === $currentTokenId,
                ];
            })
            ->values();

        $sessionItems = $sessionRows
            ->map(function (CustomerLoginSession $session) use ($currentTokenId, $resolvedLocation): array {
                $tokenId = (int) ($session->cls_token_id ?? 0);
                $platform = (string) ($session->cls_platform ?? 'Unknown OS');
                $browser = (string) ($session->cls_browser ?? 'Unknown Browser');
                $device = (string) ($session->cls_device ?? 'Desktop');
                $locationRaw = (string) ($session->cls_location ?? 'Unknown location');
                $location = $locationRaw;
                if ($locationRaw === 'Current location' || trim($locationRaw) === '') {
                    $location = $resolvedLocation;
                }
                $ipAddress = (string) ($session->cls_ip_address ?? '');
                $userAgent = (string) ($session->cls_user_agent ?? '');

                if (($platform === 'Unknown OS' || $browser === 'Unknown Browser') && $userAgent !== '') {
                    [$uaPlatform, $uaBrowser, $uaDevice] = $this->detectDeviceInfo($userAgent);
                    $platform = $uaPlatform;
                    $browser = $uaBrowser;
                    $device = $uaDevice;
                }

                $createdAt = $session->cls_created_at;
                $lastActiveAt = $session->cls_last_active_at ?? $session->cls_created_at;

                return [
                    'id' => (int) ($session->cls_id ?? 0),
                    'token_id' => $tokenId,
                    'device' => $device,
                    'platform' => $platform,
                    'browser' => $browser,
                    'location' => $location,
                    'ip_address' => $ipAddress,
                    'user_agent' => $userAgent,
                    'created_at' => optional($createdAt)->toIso8601String(),
                    'last_active_at' => optional($lastActiveAt)->toIso8601String(),
                    'is_current' => $tokenId > 0 && $tokenId === $currentTokenId,
                ];
            })
            ->values();

        $items = $tokenItems
            ->concat($sessionItems)
            ->unique(function (array $item): string {
                $tokenId = (int) ($item['token_id'] ?? 0);
                if ($tokenId > 0) {
                    return 'token:' . $tokenId;
                }

                $createdAt = (string) ($item['created_at'] ?? '');
                $ip = (string) ($item['ip_address'] ?? '');
                $ua = (string) ($item['user_agent'] ?? '');
                return 'session:' . md5($createdAt . '|' . $ip . '|' . $ua);
            })
            ->values();

        // Fallback only when there are no tokens at all.
        // If tokens exist but session-tracking rows are missing, we already build per-token items above
        // (with Unknown device/platform/browser fields) so Active Sessions still shows multiple devices.
        if ($items->isEmpty() && $tokenIds->isEmpty()) {
            [$platform, $browser, $device] = $this->detectDeviceInfo((string) $request->userAgent());
            $items = collect([[
                'id' => 0,
                'token_id' => $currentTokenId > 0 ? $currentTokenId : 0,
                'device' => $device !== '' ? $device : 'Current Device',
                'platform' => $platform !== '' ? $platform : 'Unknown OS',
                'browser' => $browser !== '' ? $browser : 'Unknown Browser',
                'location' => $this->resolveRequestLocation($request),
                'ip_address' => (string) $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'created_at' => now()->toIso8601String(),
                'last_active_at' => now()->toIso8601String(),
                'is_current' => true,
            ]]);
        }

        $items = $items
            ->sort(function (array $a, array $b): int {
                if (($a['is_current'] ?? false) && !($b['is_current'] ?? false)) return -1;
                if (!($a['is_current'] ?? false) && ($b['is_current'] ?? false)) return 1;
                $aTime = strtotime((string) ($a['last_active_at'] ?? $a['created_at'] ?? '')) ?: 0;
                $bTime = strtotime((string) ($b['last_active_at'] ?? $b['created_at'] ?? '')) ?: 0;
                return $bTime <=> $aTime;
            })
            ->values();

        return response()->json([
            'items' => $items,
        ]);
    }

    public function getLoginHistory(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $page = (int) ($request->query('page', 1));
        $perPage = (int) ($request->query('per_page', 20));
        $page = max(1, $perPage > 0 ? $page : 1);
        $perPage = min(100, max(1, $perPage));

        $loginLogs = MemberActivityLog::query()
            ->where('mal_customer_id', (int) $customer->c_userid)
            ->where('mal_activity_type', 'login')
            ->orderBy('mal_created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        $items = $loginLogs->map(function ($log) {
            $details = is_array($log->mal_details) ? $log->mal_details : [];
            $method = $details['method'] ?? 'unknown';

            $methodIcons = [
                'email' => '✉️',
                'biometric' => '👆',
                'google' => '🔵',
                'qr' => '📱',
                'facebook' => '📘',
            ];

            return [
                'id' => $log->mal_id,
                'description' => $log->mal_description,
                'method' => $method,
                'method_icon' => $methodIcons[$method] ?? '🔐',
                'device' => $details['device'] ?? 'Unknown Device',
                'platform' => $details['platform'] ?? 'Unknown',
                'browser' => $details['browser'] ?? 'Unknown',
                'ip_address' => $log->mal_ip_address,
                'location' => $details['location'] ?? null,
                'created_at' => $log->mal_created_at->toIso8601String(),
                'timestamp' => $log->mal_created_at->timestamp,
            ];
        });

        return response()->json([
            'data' => $items,
            'pagination' => [
                'current_page' => $loginLogs->currentPage(),
                'per_page' => $loginLogs->perPage(),
                'total' => $loginLogs->total(),
                'last_page' => $loginLogs->lastPage(),
                'has_more' => $loginLogs->hasMorePages(),
            ],
        ]);
    }

    public function revokeSession(Request $request, int $tokenId)
    {
        /** @var Customer $customer */
        $customer = $request->user();
        $tokenId = (int) $tokenId;
        if ($tokenId <= 0) {
            throw ValidationException::withMessages([
                'token_id' => ['Invalid session token.'],
            ]);
        }

        $token = PersonalAccessToken::query()
            ->where('id', $tokenId)
            ->where('tokenable_type', Customer::class)
            ->where('tokenable_id', (int) $customer->c_userid)
            ->first();

        if (! $token) {
            throw ValidationException::withMessages([
                'token_id' => ['Session not found.'],
            ]);
        }

        $isCurrent = (int) ($customer->currentAccessToken()?->id ?? 0) === $tokenId;

        $token->delete();
        $this->revokeSessionByTokenId((int) $customer->c_userid, $tokenId, $isCurrent ? 'logout_current' : 'logout_device');

        if ($isCurrent) {
            MemberActivityLogger::logLogout((int) $customer->c_userid, $request);
        }

        return response()->json([
            'message' => $isCurrent ? 'Current device signed out successfully.' : 'Device signed out successfully.',
            'revoked_token_id' => $tokenId,
            'is_current' => $isCurrent,
        ]);
    }

    public function referralTree(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $descendants = Customer::query()
            ->select([
                'c_userid',
                'c_username',
                'c_fname',
                'c_mname',
                'c_lname',
                'c_email',
                'c_avatar_url',
                'c_accnt_status',
                'c_lockstatus',
                'c_totalincome',
                'c_gpv',
                'c_date_started',
                'c_sponsor',
            ])
            ->orderBy('c_userid')
            ->get();

        $descendantsBySponsor = $descendants
            ->filter(fn (Customer $member) => (int) ($member->c_sponsor ?? 0) > 0)
            ->groupBy(fn (Customer $member) => (int) ($member->c_sponsor ?? 0));

        $buildNode = function (Customer $member, array $path = []) use (&$buildNode, $descendantsBySponsor): array {
            $memberId = (int) $member->c_userid;
            $nextPath = [...$path, $memberId];

            $children = collect($descendantsBySponsor->get($memberId, []))
                ->reject(fn (Customer $child) => in_array((int) $child->c_userid, $nextPath, true))
                ->map(fn (Customer $child): array => $buildNode($child, $nextPath))
                ->values();

            $node = $this->transformReferralNode($member);
            $node['children_count'] = $children->count();
            $node['children'] = $children->all();

            return $node;
        };

        $customerId = (int) $customer->c_userid;

        $customerColumns = [
            'c_userid',
            'c_username',
            'c_fname',
            'c_mname',
            'c_lname',
            'c_email',
            'c_avatar_url',
            'c_accnt_status',
            'c_lockstatus',
            'c_totalincome',
            'c_gpv',
            'c_date_started',
            'c_sponsor',
        ];

        $levelOneMembers = Customer::query()
            ->select($customerColumns)
            ->where('c_sponsor', $customerId)
            ->orderByDesc('c_userid')
            ->get();

        $inferredDirectIds = $this->inferredDirectReferralIdsFromCheckouts($customerId);
        if (! empty($inferredDirectIds)) {
            $inferredMembers = Customer::query()
                ->select($customerColumns)
                ->whereIn('c_userid', $inferredDirectIds)
                ->get();

            $levelOneMembers = $levelOneMembers
                ->concat($inferredMembers)
                ->unique(fn (Customer $member) => (int) $member->c_userid)
                ->values();
        }

        $levelOneMembers = $levelOneMembers
            ->sortByDesc('c_userid')
            ->values();

        $levelOneIds = $levelOneMembers->pluck('c_userid')->all();

        $levelTwoMembers = empty($levelOneIds)
            ? collect()
            : $descendants
                ->filter(fn (Customer $member) => in_array((int) ($member->c_sponsor ?? 0), array_map('intval', $levelOneIds), true))
                ->values();

        $secondLevelCount = $levelTwoMembers->count();
        $directCount = $levelOneMembers->count();

        $children = $levelOneMembers
            ->map(fn (Customer $member): array => $buildNode($member))
            ->values();

        $countNodes = function (array $nodes) use (&$countNodes): int {
            $count = count($nodes);
            foreach ($nodes as $node) {
                $count += $countNodes($node['children'] ?? []);
            }
            return $count;
        };

        $totalNetwork = $countNodes($children->all());

        $networkIds = collect($children)
            ->flatMap(function (array $node) {
                $collectIds = function (array $current) use (&$collectIds): array {
                    $ids = [(int) ($current['id'] ?? 0)];
                    foreach (($current['children'] ?? []) as $child) {
                        $ids = [...$ids, ...$collectIds($child)];
                    }
                    return $ids;
                };
                return $collectIds($node);
            })
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values();

        $networkMembers = $networkIds->isEmpty()
            ? collect()
            : $descendants->whereIn('c_userid', $networkIds->all())->values();
        $totalPv = (float) $networkMembers->sum(fn (Customer $member) => (float) ($member->c_gpv ?? 0));

        return response()->json([
            'root' => $this->transformReferralNode($customer),
            'summary' => [
                'direct_count' => $directCount,
                'second_level_count' => $secondLevelCount,
                'total_network' => $totalNetwork,
                'total_pv' => $totalPv,
            ],
            'children' => $children,
        ]);
    }

    public function updateMe(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'username' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('tbl_customer', 'c_username')->ignore($customer->c_userid, 'c_userid'),
            ],
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'occupation' => 'nullable|string|max:155',
            'work_location' => 'nullable|in:local,overseas',
            'country' => 'nullable|string|max:45',
            'address' => 'nullable|string|max:500',
            'barangay' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'region' => 'nullable|string|max:255',
            'barangay_code' => 'nullable|string|max:20',
            'city_code' => 'nullable|string|max:20',
            'province_code' => 'nullable|string|max:20',
            'region_code' => 'nullable|string|max:20',
            'zip_code' => 'nullable|string|max:20',
            'avatar_url' => 'nullable|url|max:1200',
            'avatar_original_url' => 'nullable|url|max:1200',
            'two_factor_enabled' => 'nullable|boolean',
        ]);

        if (array_key_exists('first_name', $validated) || array_key_exists('middle_name', $validated) || array_key_exists('last_name', $validated)) {
            $firstName = $validated['first_name'] ?? $customer->c_fname;
            $middleName = $validated['middle_name'] ?? $customer->c_mname;
            $lastName = $validated['last_name'] ?? $customer->c_lname;
        } else {
            [$firstName, $middleName, $lastName] = $this->splitName((string) $validated['name']);
        }

        if (array_key_exists('username', $validated) && $validated['username'] !== null && $this->looksLikeEmailUsername((string) $validated['username'])) {
            throw ValidationException::withMessages([
                'username' => ['Username must not be an email address. Please choose a username without @gmail.com, @yahoo.com, and similar email formats.'],
            ]);
        }

        $customer->c_fname = $firstName;
        if (array_key_exists('middle_name', $validated)) {
            $customer->c_mname = ($validated['middle_name'] ?? '') !== ''
                ? trim((string) $validated['middle_name'])
                : null;
        } else {
            $customer->c_mname = $middleName;
        }
        $customer->c_lname = $lastName;

        if (array_key_exists('username', $validated) && $validated['username'] !== null) {
            $customer->c_username = $validated['username'];
        }

        if (array_key_exists('phone', $validated) && $validated['phone'] !== null) {
            $customer->c_mobile = $validated['phone'];
        }

        if (array_key_exists('birth_date', $validated)) {
            $customer->c_bdate = $validated['birth_date'] ?: null;
        }

        if (array_key_exists('gender', $validated)) {
            $customer->c_gender = $this->mapGenderToInt($validated['gender'] ?? null);
        }

        if (array_key_exists('occupation', $validated)) {
            $customer->c_occupation = $validated['occupation'] ?: null;
        }

        if (array_key_exists('country', $validated)) {
            $customer->c_country = $validated['country'] ?: null;
        } elseif (
            array_key_exists('work_location', $validated)
            && ($validated['work_location'] ?? null) === 'local'
            && trim((string) ($customer->c_country ?? '')) === ''
        ) {
            $customer->c_country = 'Philippines';
        }

        if (array_key_exists('address', $validated)) {
            $customer->c_address = $validated['address'] ?: null;
        }

        if (array_key_exists('barangay', $validated)) {
            $customer->c_barangay = $validated['barangay'] ?: null;
        }

        if (array_key_exists('city', $validated)) {
            $customer->c_city = $validated['city'] ?: null;
        }

        if (array_key_exists('province', $validated)) {
            $customer->c_province = $validated['province'] ?: null;
        }

        if (array_key_exists('region', $validated)) {
            $customer->c_region = $validated['region'] ?: null;
        }

        if (array_key_exists('barangay_code', $validated)) {
            $customer->c_barangay_code = $validated['barangay_code'] ?: null;
        }

        if (array_key_exists('city_code', $validated)) {
            $customer->c_city_code = $validated['city_code'] ?: null;
        }

        if (array_key_exists('province_code', $validated)) {
            $customer->c_province_code = $validated['province_code'] ?: null;
        }

        if (array_key_exists('region_code', $validated)) {
            $customer->c_region_code = $validated['region_code'] ?: null;
        }

        if (array_key_exists('zip_code', $validated)) {
            $customer->c_zipcode = $validated['zip_code'] ?: null;
        }

        if (array_key_exists('avatar_url', $validated)) {
            $customer->c_avatar_url = $validated['avatar_url'] ?: null;
        }

        if (array_key_exists('avatar_original_url', $validated) && Schema::hasColumn('tbl_customer', 'c_avatar_original_url')) {
            $customer->c_avatar_original_url = $validated['avatar_original_url'] ?: null;
        }

        if (array_key_exists('two_factor_enabled', $validated)) {
            $customer->c_two_factor_enabled = (bool) $validated['two_factor_enabled'];
        }

        $customer->save();
        $this->creditProfileCompletionRewardIfEligible($customer);
        $customer->refresh();
        $customer->loadMissing('sponsor:c_userid,c_username,c_fname,c_mname,c_lname');

        return response()->json($this->transformCustomer($customer));
    }

    public function uploadAvatar(Request $request, CloudinaryUploadService $cloudinary)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $validated = $request->validate([
            'file' => 'required|image|mimes:jpeg,jpg,png,webp,gif|max:5120',
            'original_file' => 'nullable|image|mimes:jpeg,jpg,png,webp,gif|max:5120',
            'require_cloudinary' => 'nullable|boolean',
        ]);
        $requireCloudinary = (bool) ($validated['require_cloudinary'] ?? false);

        try {
            $upload = $cloudinary->uploadImage($validated['file'], 'apsara/profile', $requireCloudinary);
            $avatarUrl = (string) ($upload['secure_url'] ?? '');

            if ($avatarUrl === '') {
                return response()->json(['message' => 'Profile photo upload returned no image URL.'], 422);
            }

            $customer->c_avatar_url = $avatarUrl;
            $avatarOriginalUrl = null;
            if ($request->hasFile('original_file') && Schema::hasColumn('tbl_customer', 'c_avatar_original_url')) {
                $originalUpload = $cloudinary->uploadImage($request->file('original_file'), 'apsara/profile/originals', $requireCloudinary);
                $avatarOriginalUrl = (string) ($originalUpload['secure_url'] ?? '');
                $customer->c_avatar_original_url = $avatarOriginalUrl !== '' ? $avatarOriginalUrl : null;
            }
            $customer->save();
            $this->creditProfileCompletionRewardIfEligible($customer);
            $customer->refresh();
            $customer->loadMissing('sponsor:c_userid,c_username,c_fname,c_mname,c_lname');

            return response()->json([
                'message' => 'Profile photo updated successfully.',
                'avatar_url' => $avatarUrl,
                'avatar_original_url' => $avatarOriginalUrl ?: (string) ($customer->c_avatar_original_url ?? $avatarUrl),
                'user' => $this->transformCustomer($customer),
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage() ?: 'Failed to upload profile photo.',
            ], 422);
        }
    }

    public function changePassword(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();
        $passwordChangeRequired = $this->customerRequiresPasswordChange($customer);

        $systemSettings = SystemSetting::query()->first();
        $strictPassword = (bool) ($systemSettings?->strict_password_policy ?? true);

        $passwordRules = $strictPassword
            ? ['required', 'string', 'min:8', 'confirmed', 'regex:/[A-Z]/', 'regex:/[a-z]/', 'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/']
            : ['required', 'string', 'min:6', 'confirmed'];

        $passwordMessages = $strictPassword
            ? [
                'new_password.min' => 'Password must be at least 8 characters.',
                'new_password.confirmed' => 'Password confirmation does not match.',
                'new_password.regex' => 'Password must include uppercase, lowercase, number, and special character.',
            ]
            : [
                'new_password.min' => 'Password must be at least 6 characters.',
                'new_password.confirmed' => 'Password confirmation does not match.',
            ];

        $validated = $request->validate([
            'current_password' => $passwordChangeRequired ? 'nullable|string' : 'required|string',
            'new_password' => $passwordRules,
        ], $passwordMessages);

        $currentPassword = (string) ($validated['current_password'] ?? '');
        if (! $passwordChangeRequired) {
            if (! $this->matchesAnyCustomerPassword($customer, $currentPassword)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Your current password is incorrect.'],
                ]);
            }
        }

        $newPassword = (string) $validated['new_password'];
        if ($this->matchesAnyCustomerPassword($customer, $newPassword)) {
            throw ValidationException::withMessages([
                'new_password' => ['New password must be different from your current password.'],
            ]);
        }

        $customer->c_password = Hash::make($newPassword);
        $customer->c_password_pin = '';
        $customer->c_password_change_required = false;
        $customer->save();

        return response()->json([
            'message' => 'Your password has been updated successfully.',
            'user' => $this->transformCustomer($customer),
        ]);
    }

    public function sendUsernameChangeOtp(Request $request)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['message' => 'Only customer accounts can change usernames.'], 403);
        }

        $validated = $request->validate([
            'username' => ['required', 'string', 'max:120', 'regex:/^[A-Za-z0-9]+$/'],
        ], [
            'username.regex' => 'Username must contain letters and numbers only.',
        ]);

        $nextUsername = trim((string) $validated['username']);
        $this->validateNoBadWords(['username' => $nextUsername]);

        $currentUsername = trim((string) ($customer->c_username ?? ''));
        if ($nextUsername === '' || strcasecmp($nextUsername, $currentUsername) === 0) {
            return response()->json(['message' => 'This is already your current username.'], 422);
        }

        $email = trim((string) ($customer->c_email ?? ''));
        if ($email === '') {
            return response()->json(['message' => 'Your account email is missing. Please update your profile email first.'], 422);
        }

        $duplicate = Customer::query()
            ->whereRaw('LOWER(c_username) = ?', [mb_strtolower($nextUsername, 'UTF-8')])
            ->where('c_userid', '!=', (int) $customer->c_userid)
            ->exists();
        if ($duplicate) {
            return response()->json(['message' => 'This username is already taken.'], 422);
        }

        $existingPending = DB::table('tbl_tickets')
            ->where('t_subject', $this->usernameChangeTicketSubject())
            ->where('t_eid', (int) $customer->c_userid)
            ->where('t_status', 1)
            ->orderByDesc('t_id')
            ->first();
        if ($existingPending) {
            return response()->json(['message' => 'You already have a pending username change request.'], 422);
        }

        $verificationToken = (string) Str::uuid();
        $otp = (string) random_int(1000, 9999);

        Cache::put($this->usernameChangeOtpCacheKey($verificationToken), [
            'otp_hash' => Hash::make($otp),
            'payload' => Crypt::encryptString(json_encode([
                'customer_id' => (int) $customer->c_userid,
                'requested_username' => $nextUsername,
                'current_username' => $currentUsername,
            ], JSON_THROW_ON_ERROR)),
            'email' => $email,
        ], now()->addMinutes(10));

        $this->sendUsernameChangeOtpEmail($email, $otp);

        return response()->json([
            'message' => 'A 4-digit verification code has been sent to your email.',
            'verification_token' => $verificationToken,
            'email' => $email,
        ]);
    }

    public function submitUsernameChangeRequest(Request $request)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['message' => 'Only customer accounts can change usernames.'], 403);
        }

        $validated = $request->validate([
            'verification_token' => 'required|string',
            'otp' => 'required|string|size:4',
        ]);

        $cached = Cache::get($this->usernameChangeOtpCacheKey((string) $validated['verification_token']));
        if (!is_array($cached) || empty($cached['otp_hash']) || empty($cached['payload'])) {
            throw ValidationException::withMessages([
                'otp' => ['The verification code has expired. Please request a new code.'],
            ]);
        }

        if (!Hash::check((string) $validated['otp'], (string) $cached['otp_hash'])) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid verification code.'],
            ]);
        }

        $payload = json_decode(Crypt::decryptString((string) $cached['payload']), true, 512, JSON_THROW_ON_ERROR);
        $payloadCustomerId = (int) ($payload['customer_id'] ?? 0);
        if ($payloadCustomerId !== (int) $customer->c_userid) {
            return response()->json(['message' => 'The verification session is invalid.'], 403);
        }

        $requestedUsername = trim((string) ($payload['requested_username'] ?? ''));
        if ($requestedUsername === '') {
            throw ValidationException::withMessages([
                'otp' => ['The verification payload is invalid. Please request a new code.'],
            ]);
        }

        $duplicate = Customer::query()
            ->whereRaw('LOWER(c_username) = ?', [mb_strtolower($requestedUsername, 'UTF-8')])
            ->where('c_userid', '!=', (int) $customer->c_userid)
            ->exists();
        if ($duplicate) {
            throw ValidationException::withMessages([
                'username' => ['This username is already taken.'],
            ]);
        }

        $existingPending = DB::table('tbl_tickets')
            ->where('t_subject', $this->usernameChangeTicketSubject())
            ->where('t_eid', (int) $customer->c_userid)
            ->where('t_status', 1)
            ->orderByDesc('t_id')
            ->first();
        if ($existingPending) {
            return response()->json(['message' => 'You already have a pending username change request.'], 422);
        }

        $ticketId = DB::table('tbl_tickets')->insertGetId([
            't_bid' => 0,
            't_eid' => (int) $customer->c_userid,
            't_department' => 1,
            't_subject' => $this->usernameChangeTicketSubject(),
            't_urgency' => 2,
            't_related' => 0,
            't_view_status' => 1,
            't_status' => 1,
            't_date' => now(),
            't_archive' => 0,
            't_category' => 0,
        ], 't_id');

        $requestPayload = [
            'type' => 'username_change_request',
            'current_username' => trim((string) ($customer->c_username ?? '')) ?: null,
            'requested_username' => $requestedUsername,
        ];

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticketId,
            'td_content' => json_encode($requestPayload, JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => now(),
            'td_rate' => 0,
            'td_eid' => (int) $customer->c_userid,
            'td_replystat' => 0,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        $customerName = $this->fullName($customer);
        AdminNotification::query()->firstOrCreate(
            [
                'an_type' => 'username_change_request',
                'an_source_type' => 'ticket',
                'an_source_id' => (int) $ticketId,
            ],
            [
                'an_severity' => 'warning',
                'an_title' => 'Username Change Request',
                'an_message' => sprintf(
                    '%s requested a username change from "%s" to "%s".',
                    $customerName !== '' ? $customerName : ('Member #' . $customer->c_userid),
                    trim((string) ($customer->c_username ?? '')),
                    $requestedUsername
                ),
                'an_href' => '/admin/inquiry',
                'an_payload' => [
                    'ticket_id' => (int) $ticketId,
                    'customer_id' => (int) $customer->c_userid,
                    'customer_name' => $customerName,
                    'customer_email' => (string) ($customer->c_email ?? ''),
                    'current_username' => trim((string) ($customer->c_username ?? '')),
                    'requested_username' => $requestedUsername,
                ],
                'an_created_at' => now(),
            ]
        );

        Cache::forget($this->usernameChangeOtpCacheKey((string) $validated['verification_token']));

        return response()->json([
            'message' => 'Request submitted. Please wait for admin approval.',
            'request' => $this->transformUsernameChangeTicket((int) $ticketId),
        ]);
    }

    public function latestUsernameChangeRequest(Request $request)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['request' => null]);
        }

        $latest = DB::table('tbl_tickets')
            ->where('t_subject', $this->usernameChangeTicketSubject())
            ->where('t_eid', (int) $customer->c_userid)
            ->orderByDesc('t_id')
            ->first();

        return response()->json([
            'request' => $latest ? $this->transformUsernameChangeTicket((int) $latest->t_id) : null,
        ]);
    }

    public function submitWebstoreRequest(Request $request)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['message' => 'Only customer accounts can submit webstore requests.'], 403);
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'username' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'slug_name' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'display_name' => 'required|string|max:255',
            'plan' => ['required', Rule::in(['test', 'quarterly', 'semi_annual', 'annual'])],
            'billing_option' => ['required', Rule::in(['full', 'monthly'])],
            'payment_method' => ['required', Rule::in(['gcash', 'grab_pay', 'maya', 'card'])],
            'receipt_urls' => 'required|array|min:1|max:5',
            'receipt_urls.*' => 'required|url|max:2048',
            'checkout_id' => ['nullable', 'string', 'max:255'],
            'payment_reference' => ['required', 'string', 'max:255'],
            'payment_intent_id' => ['nullable', 'string', 'max:255'],
            'accepted_terms' => 'required|boolean|accepted',
        ]);

        $submittedAt = now();
        $latest = DB::table('tbl_tickets')
            ->where('t_subject', $this->webstoreRequestTicketSubject())
            ->where('t_eid', (int) $customer->c_userid)
            ->orderByDesc('t_id')
            ->first();

        $subscriptionMatrix = [
            'test' => ['term' => '2 days', 'term_months' => 0, 'subscription_fee' => 1, 'effective_monthly' => 1],
            'quarterly' => ['term' => '3 months', 'term_months' => 3, 'subscription_fee' => 48000, 'effective_monthly' => 16000],
            'semi_annual' => ['term' => '6 months', 'term_months' => 6, 'subscription_fee' => 90000, 'effective_monthly' => 15000],
            'annual' => ['term' => 'Yearly', 'term_months' => 12, 'subscription_fee' => 150000, 'effective_monthly' => 12500],
        ];
        $selectedPlan = (string) $validated['plan'];
        $subscriptionMeta = $subscriptionMatrix[$selectedPlan] ?? $subscriptionMatrix['quarterly'];

        $requestPayload = [
            'type' => 'webstore_request',
            'full_name' => trim((string) $validated['full_name']),
            'username' => trim((string) $validated['username']),
            'email' => trim((string) $validated['email']),
            'slug_name' => trim((string) $validated['slug_name']),
            'display_name' => trim((string) $validated['display_name']),
            'plan' => $selectedPlan,
            'plan_term' => (string) ($subscriptionMeta['term'] ?? ''),
            'plan_term_months' => (int) ($subscriptionMeta['term_months'] ?? 0),
            'subscription_fee' => (int) ($subscriptionMeta['subscription_fee'] ?? 0),
            'effective_monthly' => (int) ($subscriptionMeta['effective_monthly'] ?? 0),
            'billing_option' => (string) $validated['billing_option'],
            'payment_method' => (string) $validated['payment_method'],
            'checkout_id' => trim((string) ($validated['checkout_id'] ?? '')),
            'payment_reference' => trim((string) ($validated['payment_reference'] ?? '')),
            'payment_intent_id' => trim((string) ($validated['payment_intent_id'] ?? '')),
            'receipt_urls' => array_values(array_unique(array_map(static fn ($url) => trim((string) $url), (array) $validated['receipt_urls']))),
            'accepted_terms' => true,
            'submitted_at' => $submittedAt->toDateTimeString(),
        ];

        $latestPayload = [];
        if ($latest) {
            $latestDetail = DB::table('tbl_tickets_details')
                ->where('t_id', (int) $latest->t_id)
                ->where('td_replystat', 0)
                ->orderBy('td_id')
                ->first();
            $decodedLatestPayload = $this->decodeWebstorePayload($latestDetail?->td_content ?? null);
            if (is_array($decodedLatestPayload) && ! empty($decodedLatestPayload)) {
                $latestPayload = $decodedLatestPayload;
            }
        }

        $latestStatus = $latest ? $this->mapWebstoreRequestStatus(
            (int) $latest->t_status,
            (int) $latest->t_id,
            (string) ($latestPayload['slug_name'] ?? '')
        ) : '';

        // Only keep adding continuation receipts when the previous request is truly
        // active/approved. A deleted storefront request should behave like a fresh start.
        if ($latest && $latestStatus === 'approved') {
            $continuationPayload = array_merge($requestPayload, [
                'type' => 'webstore_payment_continuation',
            ]);

            $newDetailId = DB::table('tbl_tickets_details')->insertGetId([
                't_id' => (int) $latest->t_id,
                'td_content' => json_encode($continuationPayload, JSON_THROW_ON_ERROR),
                'td_attachment' => null,
                'td_datetime' => $submittedAt,
                'td_rate' => 0,
                'td_eid' => (int) $customer->c_userid,
                'td_replystat' => 0,
                'td_viewstat' => '1',
                'td_ip' => (string) $request->ip(),
            ], 'td_id');

            // Auto-approve or auto-reject based on whether any receipt URL filename
            // contains the payment reference (set by use_filename=true on Cloudinary upload).
            $paymentRef = strtolower(trim((string) ($continuationPayload['payment_reference'] ?? '')));
            $filenameMatch = false;
            if ($paymentRef !== '') {
                foreach (($continuationPayload['receipt_urls'] ?? []) as $receiptUrl) {
                    try {
                        $filename = strtolower(rawurldecode((string) basename(parse_url((string) $receiptUrl, PHP_URL_PATH))));
                    } catch (\Throwable) {
                        $filename = strtolower(rawurldecode((string) basename(explode('?', (string) $receiptUrl)[0])));
                    }
                    if (str_contains($filename, $paymentRef)) {
                        $filenameMatch = true;
                        break;
                    }
                }
            }

            $reviewedAt = now('Asia/Manila');
            if ($filenameMatch) {
                $autoApprovedPayload = array_merge($continuationPayload, [
                    'approval_status' => 'approved',
                    'approved_at'     => $reviewedAt->toDateTimeString(),
                    'approved_by'     => 0,
                ]);
                DB::table('tbl_tickets_details')
                    ->where('td_id', $newDetailId)
                    ->update(['td_content' => json_encode($autoApprovedPayload, JSON_THROW_ON_ERROR)]);

                DB::table('tbl_tickets_details')->insert([
                    't_id'          => (int) $latest->t_id,
                    'td_content'    => json_encode([
                        'type'              => 'webstore_receipt_decision',
                        'decision'          => 'approved',
                        'receipt_detail_id' => $newDetailId,
                        'reviewed_by'       => null,
                        'reviewed_at'       => $reviewedAt->toDateTimeString(),
                        'auto_processed'    => true,
                    ], JSON_THROW_ON_ERROR),
                    'td_attachment' => null,
                    'td_datetime'   => $reviewedAt,
                    'td_rate'       => 0,
                    'td_eid'        => 0,
                    'td_replystat'  => 1,
                    'td_viewstat'   => '1',
                    'td_ip'         => (string) $request->ip(),
                ]);

                CustomerNotification::query()->create([
                    'cn_customer_id'  => (int) $customer->c_userid,
                    'cn_type'         => 'webstore_request',
                    'cn_severity'     => 'success',
                    'cn_title'        => 'Webstore Receipt Approved',
                    'cn_message'      => sprintf('Your webstore receipt has been automatically approved (%s).', $reviewedAt->format('F j, Y g:i A')),
                    'cn_href'         => '/profile?tab=webstore',
                    'cn_payload'      => [
                        'ticket_id'         => (int) $latest->t_id,
                        'receipt_detail_id' => $newDetailId,
                        'approved_at'       => $reviewedAt->toDateTimeString(),
                    ],
                    'cn_source_type'  => 'webstore_receipt',
                    'cn_source_id'    => $newDetailId,
                    'cn_created_at'   => $reviewedAt,
                ]);
            } else {
                $rejectionReason = 'Receipt does not match the payment reference.';
                $autoRejectedPayload = array_merge($continuationPayload, [
                    'approval_status' => 'rejected',
                    'approved_at'     => null,
                    'rejected_at'     => $reviewedAt->toDateTimeString(),
                    'approved_by'     => 0,
                    'rejection_reason' => $rejectionReason,
                    'review_note'     => $rejectionReason,
                ]);
                DB::table('tbl_tickets_details')
                    ->where('td_id', $newDetailId)
                    ->update(['td_content' => json_encode($autoRejectedPayload, JSON_THROW_ON_ERROR)]);

                DB::table('tbl_tickets_details')->insert([
                    't_id'          => (int) $latest->t_id,
                    'td_content'    => json_encode([
                        'type'              => 'webstore_receipt_decision',
                        'decision'          => 'rejected',
                        'receipt_detail_id' => $newDetailId,
                        'reason'            => $rejectionReason,
                        'reviewed_by'       => null,
                        'reviewed_at'       => $reviewedAt->toDateTimeString(),
                        'auto_processed'    => true,
                    ], JSON_THROW_ON_ERROR),
                    'td_attachment' => null,
                    'td_datetime'   => $reviewedAt,
                    'td_rate'       => 0,
                    'td_eid'        => 0,
                    'td_replystat'  => 2,
                    'td_viewstat'   => '1',
                    'td_ip'         => (string) $request->ip(),
                ]);

                CustomerNotification::query()->create([
                    'cn_customer_id'  => (int) $customer->c_userid,
                    'cn_type'         => 'webstore_request',
                    'cn_severity'     => 'error',
                    'cn_title'        => 'Webstore Receipt Rejected',
                    'cn_message'      => $rejectionReason,
                    'cn_href'         => '/profile?tab=webstore',
                    'cn_payload'      => [
                        'ticket_id'         => (int) $latest->t_id,
                        'receipt_detail_id' => $newDetailId,
                        'reason'            => $rejectionReason,
                        'rejected_at'       => $reviewedAt->toDateTimeString(),
                    ],
                    'cn_source_type'  => 'webstore_receipt',
                    'cn_source_id'    => $newDetailId,
                    'cn_created_at'   => $reviewedAt,
                ]);
            }

            AdminNotification::query()->firstOrCreate(
                [
                    'an_type' => 'webstore_payment_continuation',
                    'an_source_type' => 'ticket',
                    'an_source_id' => (int) $latest->t_id,
                ],
                [
                    'an_severity' => 'info',
                    'an_title' => 'Webstore Monthly Payment Upload',
                    'an_message' => sprintf(
                        '%s uploaded continuation payment proof for "%s" (%s).',
                        $this->fullName($customer) !== '' ? $this->fullName($customer) : ('Member #' . $customer->c_userid),
                        trim((string) $validated['display_name']),
                        trim((string) $validated['slug_name'])
                    ),
                    'an_href' => '/admin/inquiry',
                    'an_payload' => [
                        'ticket_id' => (int) $latest->t_id,
                        'customer_id' => (int) $customer->c_userid,
                        'request' => $continuationPayload,
                        'submitted_at' => $submittedAt->toDateTimeString(),
                    ],
                    'an_created_at' => $submittedAt,
                ]
            );

            return response()->json([
                'message' => 'Webstore receipt uploaded successfully.',
                'request' => $this->transformWebstoreTicket((int) $latest->t_id),
            ]);
        }

        $ticketId = DB::table('tbl_tickets')->insertGetId([
            't_bid' => 0,
            't_eid' => (int) $customer->c_userid,
            't_department' => 1,
            't_subject' => $this->webstoreRequestTicketSubject(),
            't_urgency' => 2,
            't_related' => 0,
            't_view_status' => 1,
            't_status' => 1,
            't_date' => $submittedAt,
            't_archive' => 0,
            't_category' => 0,
        ], 't_id');

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticketId,
            'td_content' => json_encode($requestPayload, JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => $submittedAt,
            'td_rate' => 0,
            'td_eid' => (int) $customer->c_userid,
            'td_replystat' => 0,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        $customerName = $this->fullName($customer);
        AdminNotification::query()->firstOrCreate(
            [
                'an_type' => 'webstore_request',
                'an_source_type' => 'ticket',
                'an_source_id' => (int) $ticketId,
            ],
            [
                'an_severity' => 'info',
                'an_title' => 'Partner Webstore Request',
                'an_message' => sprintf(
                    '%s submitted a Partner Webstore Request for "%s" (%s).',
                    $customerName !== '' ? $customerName : ('Member #' . $customer->c_userid),
                    trim((string) $validated['display_name']),
                    trim((string) $validated['slug_name'])
                ),
                'an_href' => '/admin/inquiry',
                'an_payload' => [
                    'ticket_id' => (int) $ticketId,
                    'customer_id' => (int) $customer->c_userid,
                    'customer_name' => $customerName,
                    'customer_email' => (string) ($customer->c_email ?? ''),
                    'request' => $requestPayload,
                    'submitted_at' => $submittedAt->toDateTimeString(),
                ],
                'an_created_at' => $submittedAt,
            ]
        );

        $this->sendWebstoreReceiptEmail($customer, $this->transformWebstoreTicket((int) $ticketId));

        return response()->json([
            'message' => 'Webstore request submitted successfully.',
            'request' => [
                'id' => (int) $ticketId,
                'submitted_at' => $submittedAt->toDateTimeString(),
            ],
        ]);
    }

    public function createWebstorePaymentSession(Request $request)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['message' => 'Only customer accounts can create webstore payment sessions.'], 403);
        }

        $validated = $request->validate([
            'plan' => ['required', Rule::in(['test', 'quarterly', 'semi_annual', 'annual'])],
            'billing_option' => ['required', Rule::in(['full', 'monthly'])],
            'payment_method' => ['required', Rule::in(['gcash', 'grab_pay', 'maya', 'card'])],
            'payment_mode' => ['nullable', Rule::in(['test', 'live'])],
        ]);

        $planMatrix = [
            'test' => ['label' => 'Test', 'full_amount' => 1, 'monthly_amount' => 1],
            'quarterly' => ['label' => 'Quarterly', 'full_amount' => 48000, 'monthly_amount' => 16000],
            'semi_annual' => ['label' => 'Semi-Annual', 'full_amount' => 90000, 'monthly_amount' => 15000],
            'annual' => ['label' => 'Annual', 'full_amount' => 150000, 'monthly_amount' => 12500],
        ];
        $planKey = (string) $validated['plan'];
        $plan = $planMatrix[$planKey] ?? $planMatrix['quarterly'];
        $amount = (int) (($validated['billing_option'] === 'monthly' ? $plan['monthly_amount'] : $plan['full_amount']) ?? $plan['full_amount']);

        $latestApprovedTicket = DB::table('tbl_tickets')
            ->where('t_subject', $this->webstoreRequestTicketSubject())
            ->where('t_eid', (int) $customer->c_userid)
            ->orderByDesc('t_id')
            ->get()
            ->first(function ($ticket): bool {
                return $this->mapTicketDecisionStatus((int) $ticket->t_status, (int) $ticket->t_id) === 'approved';
            });

        if ($latestApprovedTicket) {
            $progress = $this->calculateWebstoreSubscriptionProgress((int) $latestApprovedTicket->t_id);
            $remainingBalance = (int) ($progress['remaining_balance'] ?? 0);
            if ($validated['billing_option'] === 'full' && $remainingBalance > 0) {
                $amount = $remainingBalance;
            }
        }

        $paymongo = $this->resolveWebstorePaymongoConfig($request, $validated['payment_mode'] ?? null);
        if ($paymongo['secret_key'] === '') {
            return response()->json(['message' => sprintf('PayMongo %s secret key is missing.', $paymongo['mode'])], 500);
        }

        $frontendBase = $this->resolveWebstoreFrontendBaseUrl($request);
        $methodTypes = $this->mapWebstorePaymentMethodTypes((string) $validated['payment_method'], $paymongo['mode']);

        $payload = [
            'data' => [
                'attributes' => [
                    'description' => sprintf('Partner Webstore Subscription (%s)', (string) $plan['label']),
                    'line_items' => [[
                        'currency' => 'PHP',
                        'amount' => $amount * 100,
                        'name' => sprintf(
                            'Webstore Subscription - %s (%s)',
                            (string) $plan['label'],
                            $validated['billing_option'] === 'monthly' ? 'Monthly Installment' : 'Full Payment'
                        ),
                        'quantity' => 1,
                    ]],
                    'payment_method_types' => $methodTypes,
                    'send_email_receipt' => true,
                    'show_description' => true,
                    'show_line_items' => true,
                    'reference_number' => 'WS-' . strtoupper(Str::random(10)),
                    'success_url' => $frontendBase . '/profile?tab=webstore&webstore_payment=success',
                    'cancel_url' => $frontendBase . '/profile?tab=webstore&webstore_payment=cancelled',
                    'metadata' => [
                        'flow' => 'webstore_subscription',
                        'customer_id' => (int) $customer->c_userid,
                        'plan' => $planKey,
                        'billing_option' => (string) $validated['billing_option'],
                        'payment_method' => (string) $validated['payment_method'],
                    ],
                ],
            ],
        ];

        $response = Http::withBasicAuth($paymongo['secret_key'], '')
            ->withHeaders(['Accept' => 'application/json'])
            ->post($paymongo['api_base_url'] . '/v1/checkout_sessions', $payload);

        if (!$response->successful()) {
            return response()->json([
                'message' => data_get($response->json(), 'errors.0.detail')
                    ?: data_get($response->json(), 'errors.0.title')
                    ?: 'Failed to create webstore payment session.',
            ], $response->status() > 0 ? $response->status() : 422);
        }

        $data = (array) $response->json();
        $checkoutId = (string) data_get($data, 'data.id', '');
        $checkoutUrl = (string) data_get($data, 'data.attributes.checkout_url', '');

        if ($checkoutId === '' || $checkoutUrl === '') {
            return response()->json(['message' => 'Checkout session created but missing checkout URL.'], 422);
        }

        $successUrl = $frontendBase . '/profile?tab=webstore&webstore_payment=success&checkout_id=' . urlencode($checkoutId) . '&payment_mode=' . urlencode($paymongo['mode']);
        $cancelUrl = $frontendBase . '/profile?tab=webstore&webstore_payment=cancelled&checkout_id=' . urlencode($checkoutId) . '&payment_mode=' . urlencode($paymongo['mode']);
        $patchResponse = Http::withBasicAuth($paymongo['secret_key'], '')
            ->withHeaders(['Accept' => 'application/json'])
            ->put($paymongo['api_base_url'] . '/v1/checkout_sessions/' . $checkoutId, [
                'data' => [
                    'attributes' => [
                        'success_url' => $successUrl,
                        'cancel_url' => $cancelUrl,
                    ],
                ],
            ]);
        if ($patchResponse->successful()) {
            $patchedData = (array) $patchResponse->json();
            $checkoutUrl = (string) data_get($patchedData, 'data.attributes.checkout_url', $checkoutUrl);
        }

        return response()->json([
            'checkout_id' => $checkoutId,
            'checkout_url' => $checkoutUrl,
            'payment_mode' => $paymongo['mode'],
        ]);
    }

    public function verifyWebstorePaymentSession(Request $request, string $checkoutId)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['message' => 'Only customer accounts can verify webstore payment sessions.'], 403);
        }

        $mode = strtolower(trim((string) $request->query('payment_mode', '')));
        $paymongo = $this->resolveWebstorePaymongoConfig($request, in_array($mode, ['test', 'live'], true) ? $mode : null);
        if ($paymongo['secret_key'] === '') {
            return response()->json(['message' => sprintf('PayMongo %s secret key is missing.', $paymongo['mode'])], 500);
        }

        $response = Http::withBasicAuth($paymongo['secret_key'], '')
            ->withHeaders(['Accept' => 'application/json'])
            ->get($paymongo['api_base_url'] . '/v1/checkout_sessions/' . $checkoutId);

        if (!$response->successful()) {
            return response()->json([
                'message' => data_get($response->json(), 'errors.0.detail')
                    ?: data_get($response->json(), 'errors.0.title')
                    ?: 'Failed to verify webstore payment session.',
            ], $response->status() > 0 ? $response->status() : 422);
        }

        $data = (array) $response->json();
        $status = strtolower((string) data_get($data, 'data.attributes.payments.0.attributes.status', data_get($data, 'data.attributes.status', '')));
        $isPaid = in_array($status, ['paid', 'succeeded'], true);
        $checkoutUrl = (string) data_get($data, 'data.attributes.checkout_url', '');

        return response()->json([
            'checkout_id' => (string) data_get($data, 'data.id', $checkoutId),
            'status' => $status,
            'is_paid' => $isPaid,
            'payment_mode' => $paymongo['mode'],
            'payment_method' => (string) data_get($data, 'data.attributes.metadata.payment_method', ''),
            'proof_url' => $checkoutUrl,
            'payment_intent_id' => (string) data_get($data, 'data.attributes.payments.0.attributes.payment_intent_id', ''),
            'payment_reference' => (string) (
                data_get($data, 'data.attributes.payments.0.id')
                ?: data_get($data, 'data.attributes.payments.0.attributes.payment_intent_id')
                ?: data_get($data, 'data.attributes.reference_number')
                ?: data_get($data, 'data.id')
            ),
            'raw' => $data,
        ]);
    }

    public function uploadWebstoreReceipt(Request $request, CloudinaryUploadService $cloudinary)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['message' => 'Only customer accounts can upload webstore receipts.'], 403);
        }

        $validated = $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        try {
            $upload = $cloudinary->uploadImage($validated['file'], 'apsara/webstore/receipts', true, true);
            $url = (string) ($upload['secure_url'] ?? '');
            if ($url === '') {
                return response()->json(['message' => 'Receipt upload returned no image URL.'], 422);
            }

            return response()->json([
                'message' => 'Receipt uploaded successfully.',
                'url' => $url,
                'public_id' => (string) ($upload['public_id'] ?? ''),
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => $exception->getMessage() ?: 'Failed to upload receipt image.',
            ], 422);
        }
    }

    public function latestWebstoreRequest(Request $request)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['request' => null]);
        }

        $latest = DB::table('tbl_tickets')
            ->where('t_subject', $this->webstoreRequestTicketSubject())
            ->where('t_eid', (int) $customer->c_userid)
            ->orderByDesc('t_id')
            ->first();

        $transformed = $latest ? $this->transformWebstoreTicket((int) $latest->t_id) : null;
        return response()->json([
            'request' => $transformed,
        ]);
    }

    public function syncWebstorePartnerAccount(Request $request)
    {
        $customer = $request->user();
        if (! $customer instanceof Customer) {
            return response()->json(['message' => 'Only customer accounts can sync partner access.'], 403);
        }

        $latest = DB::table('tbl_tickets')
            ->where('t_subject', $this->webstoreRequestTicketSubject())
            ->where('t_eid', (int) $customer->c_userid)
            ->orderByDesc('t_id')
            ->first();

        if (! $latest) {
            return response()->json(['message' => 'No webstore request found.'], 404);
        }

        $status = $this->mapTicketDecisionStatus((int) $latest->t_status, (int) $latest->t_id);
        if ($status !== 'approved') {
            return response()->json(['message' => 'Only approved webstore requests can be synced.'], 422);
        }

        $requestDetail = DB::table('tbl_tickets_details')
            ->where('t_id', (int) $latest->t_id)
            ->where('td_replystat', 0)
            ->orderByDesc('td_id')
            ->first();
        $payload = $this->decodeWebstorePayload($requestDetail?->td_content ?? null);

        $requestedUsername = trim((string) ($payload['username'] ?? ''));
        $requestedEmail = trim((string) ($payload['email'] ?? ''));
        $requestedName = trim((string) ($payload['full_name'] ?? ''));
        $requestedSlug = strtolower(trim((string) ($payload['slug_name'] ?? '')));

        $targetUsername = $requestedUsername !== '' ? $requestedUsername : trim((string) ($customer->c_username ?? ''));
        if ($targetUsername === '') {
            return response()->json(['message' => 'Unable to determine username for partner login.'], 422);
        }

        $storefrontId = $this->resolveStorefrontIdBySlug($requestedSlug);
        if (! $storefrontId) {
            return response()->json(['message' => 'Unable to map request slug to a partner storefront.'], 422);
        }

        $existingByUsername = Admin::query()
            ->whereRaw('LOWER(username) = ?', [mb_strtolower($targetUsername, 'UTF-8')])
            ->first();

        if ($existingByUsername instanceof Admin && (int) ($existingByUsername->user_level_id ?? 0) !== 4) {
            return response()->json(['message' => 'Username already belongs to a non-partner account.'], 422);
        }

        $existingByEmail = null;
        $partnerByEmail = null;
        if ($requestedEmail !== '') {
            $existingByEmail = Admin::query()
                ->whereRaw('LOWER(user_email) = ?', [mb_strtolower($requestedEmail, 'UTF-8')])
                ->first();

            if ($existingByEmail instanceof Admin && (int) ($existingByEmail->user_level_id ?? 0) === 4) {
                $partnerByEmail = $existingByEmail;
            }

            if (
                $partnerByEmail instanceof Admin
                && mb_strtolower(trim((string) ($partnerByEmail->username ?? '')), 'UTF-8') !== mb_strtolower($targetUsername, 'UTF-8')
            ) {
                return response()->json(['message' => 'Email is already used by another partner account.'], 422);
            }
        }

        $sourcePassword = trim((string) ($customer->c_password ?? ''));
        if ($sourcePassword === '') {
            return response()->json(['message' => 'Customer password is missing. Please reset password first.'], 422);
        }

        $passwordInfo = password_get_info($sourcePassword);
        if (($passwordInfo['algo'] ?? null) === null) {
            return response()->json(['message' => 'Please reset your member password first before syncing partner login.'], 422);
        }

        $partner = $existingByUsername instanceof Admin ? $existingByUsername : ($partnerByEmail instanceof Admin ? $partnerByEmail : null);
        $existingStorefrontIds = $this->normalizeStorefrontIds($partner?->admin_permissions ?? []);
        $mergedStorefrontIds = array_values(array_unique(array_filter(array_merge($existingStorefrontIds, [$storefrontId]))));

        $resolvedName = $requestedName !== '' ? $requestedName : $this->fullName($customer);
        $resolvedEmail = $requestedEmail !== '' ? $requestedEmail : trim((string) ($customer->c_email ?? ''));

        if (! $partner instanceof Admin) {
            $partner = Admin::query()->create([
                'fname' => $resolvedName,
                'username' => $targetUsername,
                'user_email' => $resolvedEmail,
                'passworde' => $sourcePassword,
                'user_level_id' => 4,
                'admin_permissions' => $mergedStorefrontIds,
                'partner_disabled_storefront_ids' => [],
            ]);
        } else {
            $partner->fname = $resolvedName !== '' ? $resolvedName : (string) $partner->fname;
            if ($resolvedEmail !== '') {
                $partner->user_email = $resolvedEmail;
            }
            $partner->passworde = $sourcePassword;
            $partner->user_level_id = 4;
            $partner->admin_permissions = $mergedStorefrontIds;
            $partner->save();
        }

        return response()->json([
            'message' => 'Partner login account synced successfully.',
            'partner' => [
                'id' => (int) $partner->id,
                'username' => (string) $partner->username,
                'storefront_ids' => $mergedStorefrontIds,
            ],
        ]);
    }

    private function transformCustomer(Customer $customer): array
    {
        $fullName = $this->fullName($customer);
        $primaryAddress = $this->primaryAddressSnapshot($customer);

        $accountStatus = (int) ($customer->c_accnt_status ?? 0);
        $lockStatus = (int) ($customer->c_lockstatus ?? 0);
        $verificationStatus = $lockStatus === 1
            ? 'blocked'
            : match ($accountStatus) {
                1 => 'verified',
                2 => 'pending_review',
                default => 'not_verified',
            };

        $rank = (int) ($customer->c_rank ?? 0);
        $badgeName = MemberTier::getTierNameByRank($rank);

        return [
            'id' => (int) $customer->c_userid,
            'name' => $fullName,
            'first_name' => (string) ($customer->c_fname ?? ''),
            'last_name' => (string) ($customer->c_lname ?? ''),
            'email' => $customer->c_email,
            'username' => $customer->c_username,
            'referrer_id' => (int) ($customer->c_sponsor ?? 0),
            'referrer_username' => $customer->sponsor?->c_username ? (string) $customer->sponsor->c_username : null,
            'referrer_name' => $customer->sponsor instanceof Customer ? $this->fullName($customer->sponsor) : null,
            'phone' => $this->filledCustomerValue($customer->c_mobile ?? null, $primaryAddress['phone'] ?? ''),
            'address' => $this->filledCustomerValue($customer->c_address ?? null, $primaryAddress['address'] ?? ''),
            'barangay' => $this->filledCustomerValue($customer->c_barangay ?? null, $primaryAddress['barangay'] ?? ''),
            'city' => $this->filledCustomerValue($customer->c_city ?? null, $primaryAddress['city'] ?? ''),
            'province' => $this->filledCustomerValue($customer->c_province ?? null, $primaryAddress['province'] ?? ''),
            'region' => $this->filledCustomerValue($customer->c_region ?? null, $primaryAddress['region'] ?? ''),
            'barangay_code' => (string) ($customer->c_barangay_code ?? ''),
            'city_code' => (string) ($customer->c_city_code ?? ''),
            'province_code' => (string) ($customer->c_province_code ?? ''),
            'region_code' => (string) ($customer->c_region_code ?? ''),
            'zip_code' => $this->filledCustomerValue($customer->c_zipcode ?? null, $primaryAddress['zip_code'] ?? ''),
            'middle_name' => ($middleName = trim((string) ($customer->c_mname ?? ''))) !== '' ? $middleName : null,
            'birth_date' => $this->formatNullableDate($customer->c_bdate ?? null),
            'gender' => $this->mapIntToGender((int) ($customer->c_gender ?? 0)),
            'occupation' => ($occupation = trim((string) ($customer->c_occupation ?? ''))) !== '' ? $occupation : null,
            'work_location' => $this->inferWorkLocation($customer->c_country ?? null),
            'country' => ($country = trim((string) ($customer->c_country ?? ''))) !== '' ? $country : null,
            'avatar_url' => $customer->c_avatar_url,
            'avatar_original_url' => Schema::hasColumn('tbl_customer', 'c_avatar_original_url')
                ? ($customer->c_avatar_original_url ?: $customer->c_avatar_url)
                : $customer->c_avatar_url,
            'rank' => $rank,
            'badge' => $rank,
            'badge_name' => $badgeName,
            'account_status' => $accountStatus,
            'lock_status' => $lockStatus,
            'verification_status' => $verificationStatus,
            'monthly_activation' => MemberMonthlyActivation::summary($customer),
            'profile_complete' => $this->isCustomerProfileComplete($customer),
            'profile_completion_percentage' => $this->customerProfileCompletionPercentage($customer),
            'email_verified' => true,
            'password_change_required' => $this->customerRequiresPasswordChange($customer),
            'two_factor_enabled' => (bool) ($customer->c_two_factor_enabled ?? false),
            'totp_enabled' => (bool) ($customer->c_totp_enabled ?? false),
        ];
    }

    private function activityTitle(MemberActivityLog $log): string
    {
        $type = (string) ($log->mal_activity_type ?? '');
        $description = trim((string) ($log->mal_description ?? ''));
        if ($description !== '') {
            return $description;
        }

        return match ($type) {
            MemberActivityLog::ACTIVITY_LOGIN => 'Signed in',
            MemberActivityLog::ACTIVITY_LOGOUT => 'Signed out',
            MemberActivityLog::ACTIVITY_PROFILE_UPDATE => 'Updated profile details',
            MemberActivityLog::ACTIVITY_PASSWORD_CHANGE => 'Changed account password',
            MemberActivityLog::ACTIVITY_ADDRESS_UPDATE => 'Updated address information',
            MemberActivityLog::ACTIVITY_PURCHASE => 'Placed an order',
            default => 'Account activity',
        };
    }

    private function recordLoginSession(Customer $customer, Request $request, ?int $tokenId = null): void
    {
        if (! $this->isSessionTrackingReady()) {
            return;
        }
        $userAgent = trim((string) ($request->userAgent() ?? ''));
        [$platform, $browser, $device] = $this->detectDeviceInfo($userAgent);
        $location = $this->resolveRequestLocation($request);

        CustomerLoginSession::create([
            'cls_customer_id' => (int) $customer->c_userid,
            'cls_token_id' => $tokenId,
            'cls_device' => $device,
            'cls_platform' => $platform,
            'cls_browser' => $browser,
            'cls_location' => $location,
            'cls_ip_address' => (string) ($request->ip() ?? ''),
            'cls_user_agent' => $userAgent,
            'cls_last_active_at' => now(),
            'cls_created_at' => now(),
        ]);
    }

    private function logLoginActivity(Customer $customer, Request $request, string $method): void
    {
        try {
            $userAgent = trim((string) ($request->userAgent() ?? ''));
            [$platform, $browser, $device] = $this->detectDeviceInfo($userAgent);

            $description = match($method) {
                'email' => 'Login via email and password',
                'biometric' => 'Login via biometric authentication',
                'google' => 'Login via Google',
                'facebook' => 'Login via Facebook',
                'qr' => 'Login via QR code',
                default => 'Login',
            };

            \App\Models\MemberActivityLog::log(
                customerId: (int) $customer->c_userid,
                activityType: \App\Models\MemberActivityLog::ACTIVITY_LOGIN,
                action: \App\Models\MemberActivityLog::ACTION_CREATE,
                description: $description,
                details: [
                    'method' => $method,
                    'device' => $device,
                    'platform' => $platform,
                    'browser' => $browser,
                ],
                ipAddress: (string) ($request->ip() ?? ''),
                userAgent: $userAgent
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function revokeSessionByTokenId(int $customerId, int $tokenId, string $reason): void
    {
        if (! $this->isSessionTrackingReady()) {
            return;
        }
        CustomerLoginSession::query()
            ->where('cls_customer_id', $customerId)
            ->where('cls_token_id', $tokenId)
            ->whereNull('cls_revoked_at')
            ->update([
                'cls_revoked_at' => now(),
                'cls_revoke_reason' => $reason,
            ]);
    }

    private function touchSessionByTokenId(int $customerId, int $tokenId): void
    {
        if (! $this->isSessionTrackingReady()) {
            return;
        }

        CustomerLoginSession::query()
            ->where('cls_customer_id', $customerId)
            ->where('cls_token_id', $tokenId)
            ->whereNull('cls_revoked_at')
            ->update([
                'cls_last_active_at' => now(),
            ]);
    }

    private function isSessionTrackingReady(): bool
    {
        try {
            return Schema::hasTable('tbl_customer_login_sessions');
        } catch (\Throwable $e) {
            report($e);
            return false;
        }
    }

    private function resolveRequestLocation(Request $request): string
    {
        $city = trim((string) ($request->header('X-App-City') ?? $request->header('X-City') ?? ''));
        $region = trim((string) ($request->header('X-App-Region') ?? $request->header('X-Region') ?? ''));
        $country = trim((string) ($request->header('CF-IPCountry') ?? $request->header('X-App-Country') ?? $request->header('X-Country') ?? ''));

        $parts = array_values(array_filter([$city, $region, $country], fn (string $v): bool => $v !== ''));
        if (!empty($parts)) {
            return implode(', ', $parts);
        }

        $ip = (string) ($request->ip() ?? '');
        if ($ip === '127.0.0.1' || $ip === '::1' || strtolower($ip) === 'localhost') {
            return 'Localhost';
        }

        return $ip !== '' ? $ip : 'Unknown location';
    }

    private function detectDeviceInfo(string $userAgent): array
    {
        $ua = strtolower($userAgent);

        $platform = 'Unknown OS';
        if (str_contains($ua, 'windows')) {
            $platform = 'Windows';
        } elseif (str_contains($ua, 'mac os') || str_contains($ua, 'macintosh')) {
            $platform = 'macOS';
        } elseif (str_contains($ua, 'android')) {
            $platform = 'Android';
        } elseif (str_contains($ua, 'iphone') || str_contains($ua, 'ipad') || str_contains($ua, 'ios')) {
            $platform = 'iOS';
        } elseif (str_contains($ua, 'linux')) {
            $platform = 'Linux';
        }

        $browser = 'Unknown Browser';
        if (str_contains($ua, 'edg/')) {
            $browser = 'Edge';
        } elseif (str_contains($ua, 'opr/') || str_contains($ua, 'opera')) {
            $browser = 'Opera';
        } elseif (str_contains($ua, 'chrome/') && !str_contains($ua, 'edg/')) {
            $browser = 'Chrome';
        } elseif (str_contains($ua, 'safari/') && !str_contains($ua, 'chrome/')) {
            $browser = 'Safari';
        } elseif (str_contains($ua, 'firefox/')) {
            $browser = 'Firefox';
        }

        $device = 'Desktop';
        if (str_contains($ua, 'mobile') || str_contains($ua, 'iphone') || str_contains($ua, 'android')) {
            $device = 'Mobile';
        } elseif (str_contains($ua, 'ipad') || str_contains($ua, 'tablet')) {
            $device = 'Tablet';
        }

        return [$platform, $browser, $device];
    }

    private function issueLoginOtpChallenge(string $challengeToken, Customer $customer, int $attempts = 0): void
    {
        $email = trim((string) $customer->c_email);
        if ($email === '') {
            throw ValidationException::withMessages([
                'login' => ['This account has no email configured for OTP verification.'],
            ]);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(self::LOGIN_OTP_TTL_MINUTES);

        Cache::put($this->loginOtpCacheKey($challengeToken), [
            'customer_id' => (int) $customer->c_userid,
            'otp_hash' => Hash::make($otp),
            'attempts' => $attempts,
        ], $expiresAt);

        try {
            Mail::mailer('resend')->to($email)->send(new PortalLoginOtpMail(
                otp: $otp,
                email: $email,
                portalLabel: 'AF Home',
                expiresInMinutes: (string) self::LOGIN_OTP_TTL_MINUTES,
            ));
        } catch (\Throwable $e) {
            report($e);
            throw ValidationException::withMessages([
                'login' => ['Unable to send OTP email right now. Please try again shortly.'],
            ]);
        }
    }

    private function validateLoginOtpChallenge(string $challengeToken, Customer $customer, string $otp): void
    {
        $cached = Cache::get($this->loginOtpCacheKey($challengeToken));
        if (! is_array($cached) || empty($cached['otp_hash']) || empty($cached['customer_id'])) {
            throw ValidationException::withMessages([
                'otp' => ['OTP session expired. Please sign in again.'],
            ]);
        }

        if ((int) $cached['customer_id'] !== (int) $customer->c_userid) {
            throw ValidationException::withMessages([
                'otp' => ['OTP session mismatch. Please sign in again.'],
            ]);
        }

        $attempts = (int) ($cached['attempts'] ?? 0);
        if (! Hash::check($otp, (string) $cached['otp_hash'])) {
            $attempts++;
            if ($attempts >= self::LOGIN_OTP_MAX_ATTEMPTS) {
                Cache::forget($this->loginOtpCacheKey($challengeToken));
                throw ValidationException::withMessages([
                    'otp' => ['Too many invalid OTP attempts. Please sign in again.'],
                ]);
            }

            $cached['attempts'] = $attempts;
            Cache::put(
                $this->loginOtpCacheKey($challengeToken),
                $cached,
                now()->addMinutes(self::LOGIN_OTP_TTL_MINUTES),
            );

            throw ValidationException::withMessages([
                'otp' => ['Invalid OTP code.'],
            ]);
        }

        Cache::forget($this->loginOtpCacheKey($challengeToken));
    }

    private function loginOtpCacheKey(string $challengeToken): string
    {
        return 'customer:login-otp:' . $challengeToken;
    }

    private function requiresLoginApproval(Customer $customer, Request $request): bool
    {
        if (! $this->isSessionTrackingReady()) {
            return true;
        }

        $userAgent = trim((string) ($request->userAgent() ?? ''));
        if ($userAgent === '') {
            return true;
        }

        return ! CustomerLoginSession::query()
            ->where('cls_customer_id', (int) $customer->c_userid)
            ->whereNull('cls_revoked_at')
            ->where('cls_user_agent', $userAgent)
            ->exists();
    }

    private function issueLoginApprovalChallenge(
        string $challengeToken,
        Customer $customer,
        Request $request,
        bool $preserveStatus = false,
    ): void {
        $email = trim((string) $customer->c_email);
        if ($email === '') {
            throw ValidationException::withMessages([
                'login' => ['This account has no email configured for login approval.'],
            ]);
        }

        $existing = Cache::get($this->loginApprovalCacheKey($challengeToken));
        $status = ($preserveStatus && is_array($existing)) ? (string) ($existing['status'] ?? 'pending') : 'pending';
        if (! in_array($status, ['pending', 'approved', 'denied'], true)) {
            $status = 'pending';
        }

        $userAgent = trim((string) ($request->userAgent() ?? ''));
        [$platform, $browser, $device] = $this->detectDeviceInfo($userAgent);
        $location = $this->resolveRequestLocation($request);
        $ipAddress = (string) ($request->ip() ?? '');

        $frontendUrl = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        $approveUrl = sprintf(
            '%s/mfa-approval?token=%s&decision=approve',
            $frontendUrl,
            urlencode($challengeToken),
        );
        $denyUrl = sprintf(
            '%s/mfa-approval?token=%s&decision=deny',
            $frontendUrl,
            urlencode($challengeToken),
        );

        Cache::put($this->loginApprovalCacheKey($challengeToken), [
            'customer_id' => (int) $customer->c_userid,
            'status' => $status,
            'device' => $device,
            'platform' => $platform,
            'browser' => $browser,
            'ip_address' => $ipAddress,
            'location' => $location,
            'user_agent' => $userAgent,
            'responded_at' => is_array($existing) ? ($existing['responded_at'] ?? null) : null,
        ], now()->addMinutes(self::LOGIN_APPROVAL_TTL_MINUTES));

        try {
            Mail::mailer('resend')->to($email)->send(new PortalLoginApprovalMail(
                portalLabel: 'AF Home',
                email: $email,
                device: $device,
                platform: $platform,
                browser: $browser,
                location: $location,
                ipAddress: $ipAddress,
                approveUrl: $approveUrl,
                denyUrl: $denyUrl,
                expiresInMinutes: (string) self::LOGIN_APPROVAL_TTL_MINUTES,
            ));
        } catch (\Throwable $e) {
            report($e);
            throw ValidationException::withMessages([
                'login' => ['Unable to send sign-in approval email right now. Please try again shortly.'],
            ]);
        }
    }

    private function getLoginApprovalChallengeStatus(string $challengeToken, Customer $customer): string
    {
        $cached = Cache::get($this->loginApprovalCacheKey($challengeToken));
        if (! is_array($cached) || empty($cached['customer_id'])) {
            return 'expired';
        }

        if ((int) $cached['customer_id'] !== (int) $customer->c_userid) {
            return 'expired';
        }

        $status = (string) ($cached['status'] ?? 'pending');
        if (! in_array($status, ['pending', 'approved', 'denied'], true)) {
            return 'pending';
        }

        return $status;
    }

    private function consumeLoginApprovalChallenge(string $challengeToken): void
    {
        Cache::forget($this->loginApprovalCacheKey($challengeToken));
    }

    private function loginApprovalCacheKey(string $challengeToken): string
    {
        return 'customer:login-approval:' . $challengeToken;
    }

    private function customerRequiresPasswordChange(Customer $customer): bool
    {
        return (bool) ($customer->c_password_change_required ?? false);
    }

    private function getCustomerPasswordCandidates(Customer $customer): array
    {
        return array_values(array_filter(array_unique([
            trim((string) ($customer->c_password ?? '')),
            trim((string) ($customer->c_password_pin ?? '')),
        ]), static fn (string $value): bool => $value !== ''));
    }

    private function matchesLegacyCustomerPassword(Customer $customer, string $password, bool $ignoreCase): bool
    {
        foreach ($this->getCustomerPasswordCandidates($customer) as $stored) {
            if (password_get_info($stored)['algo'] !== null) {
                continue;
            }

            if (! $ignoreCase && hash_equals($stored, $password)) {
                return true;
            }

            if (
                $ignoreCase
                && mb_strtolower($stored, 'UTF-8') === mb_strtolower($password, 'UTF-8')
            ) {
                return true;
            }
        }

        return false;
    }

    private function matchesHashedCustomerPassword(Customer $customer, string $password): bool
    {
        foreach ($this->getCustomerPasswordCandidates($customer) as $stored) {
            if (password_get_info($stored)['algo'] === null) {
                continue;
            }

            if (Hash::check($password, $stored)) {
                return true;
            }
        }

        return false;
    }

    private function matchesAnyCustomerPassword(Customer $customer, string $password): bool
    {
        return $this->matchesHashedCustomerPassword($customer, $password)
            || $this->matchesLegacyCustomerPassword($customer, $password, false)
            || $this->matchesLegacyCustomerPassword($customer, $password, true);
    }

    private function passwordMeetsModernRequirements(string $password): bool
    {
        return strlen($password) >= 8
            && preg_match('/[A-Z]/', $password) === 1
            && preg_match('/[a-z]/', $password) === 1
            && preg_match('/[0-9]/', $password) === 1
            && preg_match('/[^A-Za-z0-9]/', $password) === 1;
    }

    private function transformReferralNode(Customer $customer): array
    {
        $accountStatus = (int) ($customer->c_accnt_status ?? 0);
        $lockStatus = (int) ($customer->c_lockstatus ?? 0);

        return [
            'id' => (int) $customer->c_userid,
            'name' => $this->fullName($customer),
            'username' => (string) ($customer->c_username ?? ''),
            'email' => (string) ($customer->c_email ?? ''),
            'avatar_url' => (string) ($customer->c_avatar_url ?? ''),
            'joined_at' => (string) ($customer->c_date_started ?? ''),
            'total_earnings' => (float) ($customer->c_totalincome ?? 0),
            'total_pv' => (float) ($customer->c_gpv ?? 0),
            'verification_status' => $this->verificationStatus($accountStatus, $lockStatus),
        ];
    }

    private function fullName(Customer $customer): string
    {
        $fullName = trim(implode(' ', array_filter([
            $customer->c_fname,
            $customer->c_mname,
            $customer->c_lname,
        ])));

        if ($fullName !== '') {
            return $fullName;
        }

        return (string) ($customer->c_username ?: ('Member #' . $customer->c_userid));
    }

    private function verificationStatus(int $accountStatus, int $lockStatus): string
    {
        if ($lockStatus === 1) {
            return 'blocked';
        }

        return match ($accountStatus) {
            1 => 'verified',
            2 => 'pending_review',
            default => 'not_verified',
        };
    }

    private function splitName(string $name): array
    {
        $trimmed = trim($name);
        if ($trimmed === '') {
            return ['', null, null];
        }

        $parts = preg_split('/\s+/', $trimmed) ?: [];
        if (count($parts) === 1) {
            return [$parts[0], null, null];
        }

        if (count($parts) === 2) {
            return [$parts[0], null, $parts[1]];
        }

        $first = array_shift($parts);
        $last = array_pop($parts);
        $middle = implode(' ', $parts);

        return [$first ?? '', $middle !== '' ? $middle : null, $last ?? null];
    }

    private function createPrimaryAddressRecord(Customer $customer): void
    {
        $street = trim((string) ($customer->c_address ?? ''));
        $region = trim((string) ($customer->c_region ?? ''));
        $province = trim((string) ($customer->c_province ?? ''));
        $city = trim((string) ($customer->c_city ?? ''));
        $barangay = trim((string) ($customer->c_barangay ?? ''));

        if ($street === '' || $region === '' || $province === '' || $city === '' || $barangay === '') {
            return;
        }

        $existing = CustomerAddress::query()
            ->where('a_cid', (int) $customer->c_userid)
            ->where('a_address', $street)
            ->where('a_region', $region)
            ->where('a_province', $province)
            ->where('a_city', $city)
            ->where('a_barangay', $barangay)
            ->where('a_postcode', (string) ($customer->c_zipcode ?? '') ?: null)
            ->exists();

        if ($existing) {
            return;
        }

        CustomerAddress::create([
            'a_cid' => (int) $customer->c_userid,
            'a_fullname' => $this->fullName($customer),
            'a_mobile' => (string) ($customer->c_mobile ?? '0'),
            'a_mobile_code' => '0',
            'a_address' => $street,
            'a_country' => $this->normalizeAddressCountryValue($customer->c_country ?? null),
            'a_region' => $region,
            'a_province' => $province,
            'a_city' => $city,
            'a_barangay' => $barangay,
            'a_region_code' => (string) ($customer->c_region_code ?? '') ?: null,
            'a_province_code' => (string) ($customer->c_province_code ?? '') ?: null,
            'a_city_code' => (string) ($customer->c_city_code ?? '') ?: null,
            'a_barangay_code' => (string) ($customer->c_barangay_code ?? '') ?: null,
            'a_shipping_status' => 1,
            'a_billing_status' => 1,
            'a_postcode' => (string) ($customer->c_zipcode ?? '') ?: null,
            'a_address_type' => 'Home',
            'a_notes' => '',
        ]);
    }

    private function normalizeAddressCountryValue(?string $country): string
    {
        $value = trim((string) $country);

        if ($value === '' || strcasecmp($value, 'philippines') === 0 || strtoupper($value) === 'PH') {
            return '175';
        }

        if (ctype_digit($value)) {
            return $value;
        }

        return '0';
    }

    private function notifyAdminsAboutNewRegistration(Customer $customer): void
    {
        $displayName = $this->fullName($customer);
        $joinedAt = $customer->c_date_started ?? now();

        $notification = AdminNotification::query()->firstOrCreate(
            [
                'an_type' => 'member_joined',
                'an_source_type' => 'customer',
                'an_source_id' => (int) $customer->c_userid,
            ],
            [
                'an_severity' => 'success',
                'an_title' => 'New Member Joined',
                'an_message' => sprintf(
                    '%s joined as a new member.',
                    $displayName !== '' ? $displayName : ('Member #' . (int) $customer->c_userid)
                ),
                'an_href' => '/admin/members',
                'an_payload' => [
                    'customer_id' => (int) $customer->c_userid,
                    'customer_name' => $displayName,
                    'customer_email' => (string) ($customer->c_email ?? ''),
                    'username' => (string) ($customer->c_username ?? ''),
                    'joined_at' => optional($joinedAt)->toDateTimeString(),
                ],
                'an_created_at' => $joinedAt,
            ]
        );

        $appId = (string) config('services.pusher.app_id', '');
        $key = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');

        if ($appId === '' || $key === '' || $secret === '') {
            return;
        }

        try {
            $pusher = new Pusher(
                $key,
                $secret,
                $appId,
                [
                    'cluster' => (string) config('services.pusher.cluster', 'ap1'),
                    'useTLS' => (bool) config('services.pusher.use_tls', true),
                ]
            );

            $pusher->trigger('private-admin-orders', 'notification.created', [
                'id' => (int) $notification->an_id,
                'type' => 'member_joined',
                'title' => (string) $notification->an_title,
                'description' => (string) $notification->an_message,
                'href' => (string) ($notification->an_href ?? '/admin/members'),
                'created_at' => optional($notification->an_created_at)->toDateTimeString(),
                'payload' => is_array($notification->an_payload) ? $notification->an_payload : null,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to publish admin realtime member registration notification.', [
                'customer_id' => (int) $customer->c_userid,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function mapRole(int $level): string
    {
    return match ($level) {
            1 => 'super_admin',
            2 => 'admin',
            3 => 'csr',
            4 => 'web_content',
            default => 'staff',
    } ;
}

    private function mapGenderToInt(?string $gender): int
    {
        return match ($gender) {
            'male' => 1,
            'female' => 2,
            'other' => 3,
            default => 0,
        };
    }

    private function mapIntToGender(int $gender): ?string
    {
        return match ($gender) {
            1 => 'male',
            2 => 'female',
            3 => 'other',
            default => null,
        };
    }

    private function mapGenderFromInt(mixed $gender): ?string
    {
        if ($gender === null || $gender === '') {
            return null;
        }

        return $this->mapIntToGender((int) $gender);
    }

    private function formatNullableDate(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        $stringValue = trim((string) $value);
        if ($stringValue === '') {
            return null;
        }

        $timestamp = strtotime($stringValue);
        if ($timestamp === false) {
            return $stringValue;
        }

        return date('Y-m-d', $timestamp);
    }

    private function inferWorkLocation(?string $country): ?string
    {
        $value = trim((string) $country);
        if ($value === '') {
            return null;
        }

        if (
            strcasecmp($value, 'philippines') === 0
            || strtoupper($value) === 'PH'
            || $value === '175'
            || strcasecmp($value, 'local') === 0
        ) {
            return 'local';
        }

        return 'overseas';
    }

    private function customerProfileCompletionPercentage(Customer $customer): int
    {
        $primaryAddress = $this->primaryAddressSnapshot($customer);
        $country = trim((string) ($customer->c_country ?? ''));
        $occupation = trim((string) ($customer->c_occupation ?? ''));
        $phone = trim($this->filledCustomerValue($customer->c_mobile ?? null, $primaryAddress['phone'] ?? ''));
        $address = trim($this->filledCustomerValue($customer->c_address ?? null, $primaryAddress['address'] ?? ''));
        $barangay = trim($this->filledCustomerValue($customer->c_barangay ?? null, $primaryAddress['barangay'] ?? ''));
        $city = trim($this->filledCustomerValue($customer->c_city ?? null, $primaryAddress['city'] ?? ''));
        $province = trim($this->filledCustomerValue($customer->c_province ?? null, $primaryAddress['province'] ?? ''));
        $region = trim($this->filledCustomerValue($customer->c_region ?? null, $primaryAddress['region'] ?? ''));
        $zipCode = trim($this->filledCustomerValue($customer->c_zipcode ?? null, $primaryAddress['zip_code'] ?? ''));

        $checks = [
            trim((string) ($customer->c_avatar_url ?? '')) !== '',
            trim($this->fullName($customer)) !== '',
            trim((string) ($customer->c_email ?? '')) !== '',
            $phone !== '' && $phone !== '0',
            trim((string) ($customer->c_username ?? '')) !== '',
            $this->formatNullableDate($customer->c_bdate ?? null) !== null,
            $this->mapIntToGender((int) ($customer->c_gender ?? 0)) !== null,
            $occupation !== '' && strcasecmp($occupation, 'none') !== 0,
            $this->inferWorkLocation($country) !== null,
            $country !== '',
            $address !== '',
            $barangay !== '',
            $city !== '',
            $province !== '',
            $region !== '',
            $zipCode !== '',
        ];

        return (int) round((count(array_filter($checks)) / count($checks)) * 100);
    }

    private function isCustomerProfileComplete(Customer $customer): bool
    {
        return $this->customerProfileCompletionPercentage($customer) >= 100;
    }

    private function creditProfileCompletionRewardIfEligible(?Customer $customer): bool
    {
        return ProfileCompletionReward::creditIfEligible($customer);
    }

    private function primaryAddressSnapshot(Customer $customer): ?array
    {
        if (!Schema::hasTable('tbl_customer_address')) {
            return null;
        }

        /** @var CustomerAddress|null $address */
        $address = CustomerAddress::query()
            ->where('a_cid', (int) $customer->c_userid)
            ->orderByDesc('a_shipping_status')
            ->orderByDesc('a_id')
            ->first();

        if (!$address) {
            return null;
        }

        return [
            'phone' => (string) ($address->a_mobile ?? ''),
            'address' => (string) ($address->a_address ?? ''),
            'barangay' => (string) ($address->a_barangay ?? ''),
            'city' => (string) ($address->a_city ?? ''),
            'province' => (string) ($address->a_province ?? ''),
            'region' => (string) ($address->a_region ?? ''),
            'zip_code' => (string) ($address->a_postcode ?? ''),
        ];
    }

    private function filledCustomerValue(mixed $primary, mixed $fallback): string
    {
        $primaryValue = trim((string) ($primary ?? ''));
        if ($primaryValue !== '' && $primaryValue !== '0') {
            return $primaryValue;
        }

        return trim((string) ($fallback ?? ''));
    }

    private function validateNoBadWords(array $values): void
    {
        $blocked = $this->badWordList();
        $errors = [];

        foreach ($values as $field => $value) {
            if (!is_string($value) || trim($value) === '') {
                continue;
            }

            if ($this->containsBlockedWord($value, $blocked)) {
                $errors[$field] = ['This field contains prohibited words. Please use appropriate text.'];
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function containsBlockedWord(string $value, array $blocked): bool
    {
        $lower = strtolower($value);
        $normalized = preg_replace('/[^a-z0-9]+/', ' ', $lower) ?? '';
        $compact = preg_replace('/[^a-z0-9]+/', '', $lower) ?? '';

        foreach ($blocked as $word) {
            $needle = strtolower(trim($word));
            if ($needle === '') {
                continue;
            }

            $needleCompact = preg_replace('/[^a-z0-9]+/', '', $needle) ?? '';

            if (str_contains($normalized, $needle) || ($needleCompact !== '' && str_contains($compact, $needleCompact))) {
                return true;
            }
        }

        return false;
    }

    private function badWordList(): array
    {
        return [
            'fuck',
            'shit',
            'bitch',
            'asshole',
            'puta',
            'gago',
            'ulol',
            'tanga',
            'tarantado',
            'nigger',
            'nigga',
            'faggot',
            'porn',
            'sex',
        ];
    }

    private function transformUsernameChangeTicket(int $ticketId): array
    {
        $ticket = DB::table('tbl_tickets')->where('t_id', $ticketId)->first();
        if (! $ticket) {
            return [];
        }

        $requestDetail = DB::table('tbl_tickets_details')
            ->where('t_id', $ticketId)
            ->where('td_replystat', 0)
            ->orderByDesc('td_id')
            ->first();

        $payload = $this->decodeUsernameChangePayload($requestDetail?->td_content ?? null);

        $status = $this->mapUsernameChangeStatus((int) $ticket->t_status, $ticketId);

        return [
            'id' => (int) $ticket->t_id,
            'reference_no' => $this->ticketReferenceNo((int) $ticket->t_id),
            'status' => $status,
            'requested_username' => (string) ($payload['requested_username'] ?? ''),
            'review_notes' => $payload['review_notes'] ?? null,
            'reviewed_at' => $payload['reviewed_at'] ?? null,
            'created_at' => $ticket->t_date ? (string) $ticket->t_date : null,
        ];
    }

    private function transformWebstoreTicket(int $ticketId): array
    {
        $ticket = DB::table('tbl_tickets')->where('t_id', $ticketId)->first();
        if (! $ticket) {
            return [];
        }

        $requestDetails = DB::table('tbl_tickets_details')
            ->where('t_id', $ticketId)
            ->where('td_replystat', 0)
            ->orderBy('td_datetime')
            ->orderBy('td_id')
            ->get();

        $initialPayload = [];
        $latestPayload = [];
        $latestReceiptPayload = [];
        $latestReceiptDetail = null;
        foreach ($requestDetails as $detail) {
            $payload = $this->decodeWebstorePayload($detail->td_content ?? null);
            if (!is_array($payload) || empty($payload)) {
                continue;
            }

            if (empty($initialPayload)) {
                $initialPayload = $payload;
            }
            $latestPayload = $payload;

            $rowType = strtolower(trim((string) ($payload['type'] ?? '')));
            if ($rowType === 'webstore_payment_continuation') {
                $latestReceiptPayload = $payload;
                $latestReceiptDetail = $detail;
            }
        }

        $payload = is_array($initialPayload) && !empty($initialPayload) ? $initialPayload : $latestPayload;
        $activePayload = is_array($latestPayload) && !empty($latestPayload) ? $latestPayload : $payload;
        $latestReceiptStatus = null;
        $latestReceiptMessage = null;
        $latestReceiptSubmittedAt = null;
        $latestReceiptDetailId = null;
        if (is_array($latestReceiptPayload) && !empty($latestReceiptPayload)) {
            $latestReceiptDetailId = $latestReceiptDetail ? (int) $latestReceiptDetail->td_id : null;
            $latestReceiptSubmittedAt = $latestReceiptDetail?->td_datetime
                ? (string) $latestReceiptDetail->td_datetime
                : (string) ($latestReceiptPayload['submitted_at'] ?? null);
            $latestReceiptStatus = strtolower(trim((string) ($latestReceiptPayload['approval_status'] ?? '')));
            if ($latestReceiptStatus === '') {
                $latestReceiptStatus = 'pending_review';
            }
            if ($latestReceiptStatus === 'rejected') {
                $latestReceiptMessage = trim((string) ($latestReceiptPayload['rejection_reason'] ?? ''));
                if ($latestReceiptMessage === '') {
                    $latestReceiptMessage = 'Your payment has been rejected by the admin due to mismatch ID.';
                }
            }
        }
        $latestReceiptUrls = is_array($latestReceiptPayload['receipt_urls'] ?? null)
            ? array_values($latestReceiptPayload['receipt_urls'])
            : [];
        $subscriptionProgress = $this->calculateWebstoreSubscriptionProgress($ticketId);
        $status = $this->mapWebstoreRequestStatus((int) $ticket->t_status, $ticketId, (string) ($payload['slug_name'] ?? ''));

        return [
            'id' => (int) $ticket->t_id,
            'reference_no' => $this->ticketReferenceNo((int) $ticket->t_id),
            'status' => $status,
            'full_name' => (string) ($payload['full_name'] ?? ''),
            'username' => (string) ($payload['username'] ?? ''),
            'email' => (string) ($payload['email'] ?? ''),
            'slug_name' => (string) ($payload['slug_name'] ?? ''),
            'display_name' => (string) ($payload['display_name'] ?? ''),
            'plan' => (string) ($payload['plan'] ?? ''),
            'plan_term' => (string) ($payload['plan_term'] ?? ''),
            'plan_term_months' => (int) ($payload['plan_term_months'] ?? 0),
            'subscription_fee' => (int) ($payload['subscription_fee'] ?? 0),
            'effective_monthly' => (int) ($payload['effective_monthly'] ?? 0),
            'billing_option' => (string) ($activePayload['billing_option'] ?? $payload['billing_option'] ?? ''),
            'payment_method' => (string) ($activePayload['payment_method'] ?? $payload['payment_method'] ?? ''),
            'checkout_id' => (string) ($activePayload['checkout_id'] ?? $payload['checkout_id'] ?? ''),
            'payment_reference' => (string) ($activePayload['payment_reference'] ?? $payload['payment_reference'] ?? ''),
            'payment_intent_id' => (string) ($activePayload['payment_intent_id'] ?? $payload['payment_intent_id'] ?? ''),
            'base_checkout_id' => (string) ($payload['checkout_id'] ?? ''),
            'base_payment_reference' => (string) ($payload['payment_reference'] ?? ''),
            'base_payment_intent_id' => (string) ($payload['payment_intent_id'] ?? ''),
            'receipt_urls' => is_array($payload['receipt_urls'] ?? null) ? array_values($payload['receipt_urls']) : [],
            'receipt_items' => $this->collectWebstoreReceiptItems($ticketId),
            'payment_count' => (int) ($subscriptionProgress['payment_count'] ?? 0),
            'total_paid_amount' => (int) ($subscriptionProgress['total_paid_amount'] ?? 0),
            'remaining_balance' => (int) ($subscriptionProgress['remaining_balance'] ?? 0),
            'can_sync_account' => $status === 'approved' && ! $this->hasSyncedPartnerAccount(
                (string) ($payload['username'] ?? ''),
                (string) ($payload['email'] ?? ''),
                (string) ($payload['slug_name'] ?? '')
            ),
            'partner_sync_status' => $this->hasSyncedPartnerAccount(
                (string) ($payload['username'] ?? ''),
                (string) ($payload['email'] ?? ''),
                (string) ($payload['slug_name'] ?? '')
            ) ? 'synced' : 'not_synced',
            'reviewed_at' => $payload['reviewed_at'] ?? null,
            'latest_receipt_status' => $latestReceiptStatus,
            'latest_receipt_message' => $latestReceiptMessage,
            'latest_receipt_detail_id' => $latestReceiptDetailId,
            'latest_receipt_submitted_at' => $latestReceiptSubmittedAt,
            'latest_receipt_urls' => $latestReceiptUrls,
            'created_at' => $ticket->t_date ? (string) $ticket->t_date : null,
        ];
    }

    private function calculateWebstoreSubscriptionProgress(int $ticketId): array
    {
        $ticket = DB::table('tbl_tickets')
            ->where('t_id', $ticketId)
            ->first();
        $ticketIsApproved = $ticket ? $this->mapTicketDecisionStatus((int) ($ticket->t_status ?? 0), $ticketId) === 'approved' : false;

        $details = DB::table('tbl_tickets_details')
            ->where('t_id', $ticketId)
            ->where('td_replystat', 0)
            ->orderBy('td_datetime')
            ->orderBy('td_id')
            ->get();

        $payloads = [];
        foreach ($details as $detail) {
            $payload = $this->decodeWebstorePayload($detail->td_content ?? null);
            if (is_array($payload) && ! empty($payload)) {
                $payloads[] = [
                    'payload' => $payload,
                    'submitted_at' => $detail->td_datetime ? (string) $detail->td_datetime : (string) ($payload['submitted_at'] ?? null),
                ];
            }
        }

        if (count($payloads) === 0) {
            return [
                'payment_count' => 0,
                'total_paid_amount' => 0,
                'remaining_balance' => 0,
            ];
        }

        $initialPayload = $payloads[0]['payload'];
        $subscriptionFee = (int) ($initialPayload['subscription_fee'] ?? 0);
        $effectiveMonthly = (int) ($initialPayload['effective_monthly'] ?? 0);
        $planTermMonths = (int) ($initialPayload['plan_term_months'] ?? 0);
        $stepAmount = $effectiveMonthly > 0 ? $effectiveMonthly : (int) ($subscriptionFee > 0 && $planTermMonths > 0 ? round($subscriptionFee / max($planTermMonths, 1)) : 0);

        $remainingBalance = $subscriptionFee;
        $paidAmount = 0;
        $paymentCount = 0;

        foreach ($payloads as $entry) {
            $payload = $entry['payload'];
            $type = strtolower(trim((string) ($payload['type'] ?? '')));
            if ($type !== 'webstore_request' && $type !== 'webstore_payment_continuation') {
                continue;
            }

            $receiptApprovalStatus = strtolower(trim((string) ($payload['approval_status'] ?? '')));
            if ($receiptApprovalStatus === 'rejected') {
                continue;
            }
            $isApprovedReceipt = $receiptApprovalStatus === 'approved' || ($receiptApprovalStatus === '' && ! empty($payload['approved_at']));
            $billingOption = strtolower(trim((string) ($payload['billing_option'] ?? '')));
            if ($type === 'webstore_request') {
                if (! $ticketIsApproved) {
                    continue;
                }

                if ($billingOption === 'full') {
                    $paymentCount = 1;
                    $paidAmount = $subscriptionFee;
                    $remainingBalance = 0;
                    break;
                }

                if ($billingOption === 'monthly') {
                    $paymentCount = max($paymentCount, 1);
                    $paidAmount = min($subscriptionFee, $paidAmount + $stepAmount);
                    $remainingBalance = max(0, $subscriptionFee - $paidAmount);
                }
                continue;
            }

            if (! $isApprovedReceipt) {
                continue;
            }

            if ($billingOption === 'full') {
                $paymentCount = max($paymentCount, 1);
                $paidAmount = $subscriptionFee;
                $remainingBalance = 0;
                break;
            }

            if ($billingOption === 'monthly') {
                $paymentCount++;
                $paidAmount = min($subscriptionFee, $paidAmount + $stepAmount);
                $remainingBalance = max(0, $subscriptionFee - $paidAmount);
                continue;
            }

            $fallbackAmount = (int) ($payload['amount'] ?? $stepAmount ?? 0);
            if ($fallbackAmount > 0) {
                $paymentCount++;
                $paidAmount = min($subscriptionFee, $paidAmount + $fallbackAmount);
                $remainingBalance = max(0, $subscriptionFee - $paidAmount);
            }
        }

        return [
            'payment_count' => $paymentCount,
            'total_paid_amount' => $paidAmount,
            'remaining_balance' => $remainingBalance,
        ];
    }

    private function collectWebstoreReceiptItems(int $ticketId): array
    {
        $details = DB::table('tbl_tickets_details')
            ->where('t_id', $ticketId)
            ->where('td_replystat', 0)
            ->orderBy('td_datetime')
            ->orderBy('td_id')
            ->get();

        $items = [];
        $sequence = 0;

        foreach ($details as $detail) {
            $payload = $this->decodeWebstorePayload($detail->td_content ?? null);
            if (!is_array($payload) || empty($payload)) {
                continue;
            }

            $sequence++;
            $items[] = [
                'id' => (int) $detail->td_id,
                'label' => 'Receipt ' . $sequence,
                'submitted_at' => $detail->td_datetime ? (string) $detail->td_datetime : (string) ($payload['submitted_at'] ?? null),
                'receipt_urls' => is_array($payload['receipt_urls'] ?? null) ? array_values($payload['receipt_urls']) : [],
                'billing_option' => (string) ($payload['billing_option'] ?? ''),
                'payment_method' => (string) ($payload['payment_method'] ?? ''),
                'checkout_id' => (string) ($payload['checkout_id'] ?? ''),
                'payment_reference' => (string) ($payload['payment_reference'] ?? ''),
                'payment_intent_id' => (string) ($payload['payment_intent_id'] ?? ''),
                'approval_status' => (string) ($payload['approval_status'] ?? ''),
                'approved_at' => (string) ($payload['approved_at'] ?? ''),
                'approved_by' => (int) ($payload['approved_by'] ?? 0),
                'type' => (string) ($payload['type'] ?? ''),
            ];
        }

        return $items;
    }

    private function normalizeStorefrontSlug(string $value): string
    {
        $slug = mb_strtolower(trim($value), 'UTF-8');
        if ($slug === '') {
            return '';
        }

        $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug) ?? '';
        return trim($slug, '-');
    }

    private function mapWebstoreRequestStatus(int $ticketStatus, int $ticketId, string $slugName): string
    {
        $status = $this->mapTicketDecisionStatus($ticketStatus, $ticketId);
        if ($status !== 'approved') {
            return $status;
        }

        $normalizedSlug = $this->normalizeStorefrontSlug($slugName);
        if ($normalizedSlug === '') {
            return 'deleted';
        }

        $exists = WebPageContent::query()
            ->whereIn('wpc_type', ['partner-storefront', 'partner-storefronts'])
            ->orderByDesc('wpc_status')
            ->get()
            ->contains(function (WebPageContent $item) use ($normalizedSlug): bool {
                $key = strtolower(trim((string) ($item->wpc_key ?? '')));
                $payloadSlug = strtolower(trim((string) data_get($item->wpc_payload, 'fields.slug', '')));
                return $key === $normalizedSlug || $payloadSlug === $normalizedSlug;
            });

        return $exists ? 'approved' : 'deleted';
    }

    private function ticketReferenceNo(int $ticketId): string
    {
        return sprintf('TKT-%06d', $ticketId);
    }

    private function registrationOtpCacheKey(string $verificationToken): string
    {
        return "registration_otp:{$verificationToken}";
    }

    private function usernameChangeOtpCacheKey(string $verificationToken): string
    {
        return "username_change_otp:{$verificationToken}";
    }

    private function looksLikeEmailUsername(string $value): bool
    {
        $trimmed = trim($value);

        return $trimmed !== '' && str_contains($trimmed, '@');
    }

    private function passwordResetCacheKey(string $token): string
    {
        return "customer_password_reset:{$token}";
    }

    private function passwordResetAttemptsCacheKey(string $token): string
    {
        return "customer_password_reset_attempts:{$token}";
    }

    private function findCustomerForPasswordReset(string $identifier): ?Customer
    {
        $normalized = trim($identifier);
        if ($normalized === '') {
            return null;
        }

        if (str_contains($normalized, '@')) {
            return Customer::query()
                ->whereRaw('LOWER(c_email) = ?', [mb_strtolower($normalized, 'UTF-8')])
                ->first();
        }

        if (preg_match('/[A-Za-z]/', $normalized) === 1) {
            return Customer::query()
                ->whereRaw('LOWER(c_username) = ?', [mb_strtolower($normalized, 'UTF-8')])
                ->first();
        }

        $phoneCandidates = $this->phoneNumberCandidates($normalized);
        if ($phoneCandidates === []) {
            return null;
        }

        return Customer::query()
            ->whereIn('c_mobile', $phoneCandidates)
            ->first();
    }

    /**
     * @return array<int, string>
     */
    private function phoneNumberCandidates(string $phoneNumber): array
    {
        $digits = preg_replace('/[^0-9]/', '', $phoneNumber) ?: '';
        if ($digits === '') {
            return [];
        }

        $withoutCountryCode = str_starts_with($digits, '63') ? substr($digits, 2) : $digits;
        $withoutLeadingZero = ltrim($withoutCountryCode, '0');

        return array_values(array_unique(array_filter([
            $phoneNumber,
            $digits,
            $withoutCountryCode,
            $withoutLeadingZero,
            $withoutLeadingZero !== '' ? '0' . $withoutLeadingZero : null,
            $withoutLeadingZero !== '' ? '63' . $withoutLeadingZero : null,
            $withoutLeadingZero !== '' ? '+63' . $withoutLeadingZero : null,
        ], static fn ($value): bool => is_string($value) && trim($value) !== '')));
    }

    private function hasUsablePhoneNumber(string $phoneNumber): bool
    {
        $digits = preg_replace('/[^0-9]/', '', $phoneNumber) ?: '';

        return strlen($digits) >= 10 && $digits !== str_repeat('0', strlen($digits));
    }

    private function sendRegistrationOtpEmail(string $email, string $otp, array $senderContext = []): void
    {
        $brandName = trim((string) ($senderContext['name'] ?? 'AF Home'));
        $mailable = new RegistrationOtpMail($otp, $email, $brandName);

        Mail::mailer('resend')->to($email)->send($mailable);
    }

    private function resolvePartnerOtpSenderContext(string $partnerSlug): array
    {
        $normalizedSlug = strtolower(trim($partnerSlug));
        if ($normalizedSlug === '') {
            return [];
        }

        $storefront = WebPageContent::query()
            ->whereIn('wpc_type', ['partner-storefront', 'partner-storefronts'])
            ->orderByDesc('wpc_status')
            ->get()
            ->first(function (WebPageContent $item) use ($normalizedSlug) {
                $key = strtolower(trim((string) ($item->wpc_key ?? '')));
                $payloadSlug = strtolower(trim((string) data_get($item->wpc_payload, 'fields.slug', '')));
                return $key === $normalizedSlug || $payloadSlug === $normalizedSlug;
            });

        if (!$storefront instanceof WebPageContent) {
            return [];
        }

        $senderEmail = trim((string) data_get($storefront->wpc_payload, 'fields.notification_email', ''));
        if ($senderEmail === '') {
            $senderEmail = trim((string) data_get($storefront->wpc_payload, 'notification_email', ''));
        }

        $displayName = trim((string) (
            data_get($storefront->wpc_payload, 'fields.display_name', '')
            ?: $storefront->wpc_title
            ?: $storefront->wpc_key
            ?: 'Partner Storefront'
        ));

        return [
            'slug' => $normalizedSlug,
            'email' => $senderEmail,
            'name' => $displayName !== '' ? $displayName : 'Partner Storefront',
        ];
    }

    private function notifyReferrerAboutRegistration(Customer $referrer, Customer $referral): void
    {
        $recipient = trim((string) ($referrer->c_email ?? ''));
        if ($recipient === '' || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $frontend = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        $mailRecipient = env('MAIL_TEST_TO') ?: $recipient;

        try {
            Mail::mailer('resend')->to($mailRecipient)->send(new ReferralRegistrationAlertMail([
                'referrer_name' => $this->fullName($referrer),
                'referral_name' => $this->fullName($referral),
                'referral_username' => (string) ($referral->c_username ?? ''),
                'registered_at' => now()->toDayDateTimeString(),
                'login_url' => $frontend . '/login',
            ]));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function sendUsernameChangeOtpEmail(string $email, string $otp): void
    {
        Mail::mailer('resend')->to($email)->send(new UsernameChangeOtpMail($otp, $email));
    }

    private function usernameChangeTicketSubject(): string
    {
        return 'Username Change Request';
    }

    private function webstoreRequestTicketSubject(): string
    {
        return 'Partner Webstore Request';
    }

    private function decodeUsernameChangePayload(?string $content): array
    {
        if (!is_string($content) || trim($content) === '') {
            return [];
        }

        $decoded = json_decode($content, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function decodeWebstorePayload(?string $content): array
    {
        if (!is_string($content) || trim($content) === '') {
            return [];
        }

        $decoded = json_decode($content, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function sendWebstoreReceiptEmail(Customer $customer, array $request): void
    {
        $recipient = trim((string) ($customer->c_email ?? ''));
        if ($recipient === '') {
            return;
        }

        $planLabel = (string) ($request['plan'] ?? '');
        $planLabel = match ($planLabel) {
            'test' => 'Test',
            'quarterly' => 'Quarterly',
            'semi_annual' => 'Semi-Annual',
            'annual' => 'Annual',
            default => $planLabel,
        };

        $billingLabel = (string) ($request['billing_option'] ?? '');
        $billingLabel = match ($billingLabel) {
            'monthly' => 'Monthly Installment',
            'full' => 'Full Payment',
            default => $billingLabel,
        };

        $subscriptionFee = (int) ($request['subscription_fee'] ?? 0);
        $effectiveMonthly = (int) ($request['effective_monthly'] ?? 0);
        $amountPaid = (int) ($request['amount_paid'] ?? ($billingLabel === 'Monthly Installment' ? $effectiveMonthly : $subscriptionFee));

        $submittedAt = (string) ($request['created_at'] ?? $request['reviewed_at'] ?? '');

        $payload = [
            'customer_name' => $this->fullName($customer) ?: ('Member #' . $customer->c_userid),
            'reference_no' => (string) ($request['reference_no'] ?? ''),
            'plan_label' => $planLabel,
            'plan_term' => (string) ($request['plan_term'] ?? ''),
            'subscription_fee' => $subscriptionFee,
            'effective_monthly' => $effectiveMonthly,
            'amount_paid' => $amountPaid,
            'billing_label' => $billingLabel,
            'payment_method' => (string) ($request['payment_method'] ?? ''),
            'checkout_id' => (string) ($request['checkout_id'] ?? ''),
            'payment_reference' => (string) ($request['payment_reference'] ?? ''),
            'payment_intent_id' => (string) ($request['payment_intent_id'] ?? ''),
            'submitted_at_label' => $submittedAt !== '' ? date('F j, Y g:i A', strtotime($submittedAt)) : '',
            'payment_count' => (int) ($request['payment_count'] ?? 0),
            'remaining_balance' => max(0, $subscriptionFee - $amountPaid),
            'receipt_urls' => is_array($request['receipt_urls'] ?? null) ? array_values($request['receipt_urls']) : [],
        ];

        try {
            Mail::mailer('resend')->to($recipient)->send(new WebstoreReceiptMail($payload));
        } catch (\Throwable $exception) {
            Log::warning('Failed to send webstore receipt email.', [
                'customer_id' => (int) $customer->c_userid,
                'email' => $recipient,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function mapUsernameChangeStatus(int $ticketStatus, int $ticketId): string
    {
        return $this->mapTicketDecisionStatus($ticketStatus, $ticketId);
    }

    private function mapTicketDecisionStatus(int $ticketStatus, int $ticketId): string
    {
        if ($ticketStatus === 1) {
            return 'pending_review';
        }

        $latestRequestDecision = DB::table('tbl_tickets_details')
            ->where('t_id', $ticketId)
            ->whereIn('td_replystat', [1, 2])
            ->orderByDesc('td_id')
            ->first();

        if (! $latestRequestDecision) {
            return 'approved';
        }

        $decisionPayload = $this->decodeWebstorePayload($latestRequestDecision->td_content ?? null);
        if (! is_array($decisionPayload) || empty($decisionPayload)) {
            return 'approved';
        }

        if (($decisionPayload['type'] ?? '') !== 'webstore_request_decision') {
            return 'approved';
        }

        if (strtolower(trim((string) ($decisionPayload['decision'] ?? ''))) === 'rejected') {
            return 'rejected';
        }

        return 'approved';
    }

    private function isLocalPaymentHost(?string $host): bool
    {
        $normalized = strtolower(trim((string) $host));
        return in_array($normalized, self::LOCAL_PAYMENT_HOSTS, true);
    }

    private function resolveWebstorePaymongoMode(Request $request, ?string $requestedMode = null): string
    {
        $requestedMode = strtolower(trim((string) $requestedMode));
        $hostCandidates = [
            $request->getHost(),
            parse_url((string) $request->headers->get('origin', ''), PHP_URL_HOST),
            parse_url((string) $request->headers->get('referer', ''), PHP_URL_HOST),
        ];

        $isLocal = app()->environment(['local', 'development', 'dev']);
        foreach ($hostCandidates as $candidate) {
            if ($this->isLocalPaymentHost(is_string($candidate) ? $candidate : null)) {
                $isLocal = true;
                break;
            }
        }

        if ($isLocal) {
            return $requestedMode === 'live' ? 'live' : 'test';
        }

        return 'live';
    }

    private function resolveWebstorePaymongoConfig(Request $request, ?string $requestedMode = null): array
    {
        $mode = $this->resolveWebstorePaymongoMode($request, $requestedMode);
        $config = (array) config("services.paymongo.modes.{$mode}", []);
        return [
            'mode' => $mode,
            'secret_key' => (string) ($config['secret_key'] ?? ''),
            'api_base_url' => rtrim((string) config('services.paymongo.api_base_url', 'https://api.paymongo.com'), '/'),
        ];
    }

    private function resolveWebstoreFrontendBaseUrl(Request $request): string
    {
        $fallback = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $sourceUrl = trim((string) (
            $request->headers->get('origin')
            ?: $request->headers->get('referer')
            ?: $fallback
        ));
        $parts = parse_url($sourceUrl);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        $port = isset($parts['port']) ? (int) $parts['port'] : null;
        if (!in_array($scheme, ['http', 'https'], true) || $host === '') {
            return $fallback;
        }
        $portSegment = ($port && !in_array($port, [80, 443], true)) ? ':' . $port : '';
        return $scheme . '://' . $host . $portSegment;
    }

    private function mapWebstorePaymentMethodTypes(string $method, string $mode): array
    {
        return match ($method) {
            'gcash' => ['gcash'],
            'grab_pay' => ['grab_pay'],
            'maya' => ['paymaya'],
            'card' => ['card'],
            default => ['card'],
        };
    }

    private function resolveStorefrontIdBySlug(string $slug): ?int
    {
        $normalizedSlug = strtolower(trim($slug));
        if ($normalizedSlug === '') {
            return null;
        }

        $storefront = WebPageContent::query()
            ->whereIn('wpc_type', ['partner-storefront', 'partner-storefronts'])
            ->orderByDesc('wpc_status')
            ->get()
            ->first(function (WebPageContent $item) use ($normalizedSlug) {
                $key = strtolower(trim((string) ($item->wpc_key ?? '')));
                $payloadSlug = strtolower(trim((string) data_get($item->wpc_payload, 'fields.slug', '')));
                return $key === $normalizedSlug || $payloadSlug === $normalizedSlug;
            });

        if (! $storefront instanceof WebPageContent) {
            return null;
        }

        return (int) $storefront->wpc_id;
    }

    private function storefrontSlugExists(string $slug): bool
    {
        return $this->resolveStorefrontIdBySlug($slug) !== null;
    }

    private function hasSyncedPartnerAccount(string $username, string $email, string $slug): bool
    {
        $targetUsername = trim($username);
        $targetEmail = trim($email);
        $storefrontId = $this->resolveStorefrontIdBySlug($slug);
        if (! $storefrontId) {
            return false;
        }

        $query = Admin::query()->where('user_level_id', 4);
        if ($targetUsername !== '') {
            $query->whereRaw('LOWER(username) = ?', [mb_strtolower($targetUsername, 'UTF-8')]);
        } elseif ($targetEmail !== '') {
            $query->whereRaw('LOWER(user_email) = ?', [mb_strtolower($targetEmail, 'UTF-8')]);
        } else {
            return false;
        }

        $partner = $query->first();
        if (! $partner instanceof Admin) {
            return false;
        }

        $ids = $this->normalizeStorefrontIds($partner->admin_permissions ?? []);
        return in_array($storefrontId, $ids, true);
    }

    private function normalizeStorefrontIds(mixed $storefrontIds): array
    {
        if (! is_array($storefrontIds)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($id) => is_numeric($id) ? (int) $id : null,
            $storefrontIds,
        ), static fn ($id) => is_int($id) && $id > 0)));
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

    private function inferredDirectReferralIdsFromCheckouts(int $customerId): array
    {
        if (
            $customerId <= 0
            || !Schema::hasTable('tbl_checkout_history')
            || !Schema::hasColumn('tbl_checkout_history', 'ch_referrer_customer_id')
            || !Schema::hasColumn('tbl_checkout_history', 'ch_customer_id')
        ) {
            return [];
        }

        return DB::table('tbl_checkout_history')
            ->where('ch_referrer_customer_id', $customerId)
            ->whereNotNull('ch_customer_id')
            ->where('ch_customer_id', '<>', 0)
            ->where('ch_customer_id', '<>', $customerId)
            ->distinct()
            ->pluck('ch_customer_id')
            ->map(fn ($id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->values()
            ->all();
    }

    // ========================
    // Social Authentication (OAuth)
    // ========================

    public function redirectToProvider(string $provider)
    {
        $allowedProviders = ['google', 'facebook'];

        if (!in_array($provider, $allowedProviders, true)) {
            return response()->json(['message' => 'Invalid provider.'], 400);
        }

        $config = config("services.{$provider}");

        if (!$config || empty($config['client_id']) || empty($config['client_secret'])) {
            return response()->json(['message' => 'OAuth not configured for this provider.'], 500);
        }

        $state = bin2hex(random_bytes(32));
        $nonce = bin2hex(random_bytes(16));

        Cache::put("oauth_state:{$state}", [
            'provider' => $provider,
            'nonce' => $nonce,
            'created_at' => now()->toIso8601String(),
        ], now()->addMinutes(10));

        $baseUrls = [
            'google' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'facebook' => 'https://www.facebook.com/v18.0/dialog/oauth',
        ];

        $scopes = [
            'google' => 'openid email profile',
            'facebook' => 'email public_profile',
        ];

        $params = [
            'client_id' => $config['client_id'],
            'redirect_uri' => $config['redirect'],
            'response_type' => 'code',
            'scope' => $scopes[$provider],
            'state' => $state,
        ];

        if ($provider === 'google') {
            $params['nonce'] = $nonce;
            $params['access_type'] = 'offline';
            $params['prompt'] = 'consent';
        }

        $url = $baseUrls[$provider] . '?' . http_build_query($params);

        return response()->json([
            'redirect_url' => $url,
            'state' => $state,
        ]);
    }

    public function handleProviderCallback(Request $request, string $provider)
    {
        $allowedProviders = ['google', 'facebook'];

        if (!in_array($provider, $allowedProviders, true)) {
            return response()->json(['message' => 'Invalid provider.'], 400);
        }

        $validated = $request->validate([
            'code' => 'required|string',
            'state' => 'required|string',
        ]);

        $stateData = Cache::get("oauth_state:{$validated['state']}");

        if (!$stateData || ($stateData['provider'] ?? '') !== $provider) {
            return response()->json(['message' => 'Invalid or expired state.'], 400);
        }

        Cache::forget("oauth_state:{$validated['state']}");

        $config = config("services.{$provider}");

        try {
            $tokenResponse = $this->exchangeCodeForToken($provider, $validated['code'], $config);

            if (!$tokenResponse || empty($tokenResponse['access_token'])) {
                return response()->json(['message' => 'Failed to obtain access token.'], 400);
            }

            $userInfo = $this->getUserInfoFromProvider($provider, $tokenResponse['access_token']);

            if (!$userInfo || empty($userInfo['email'])) {
                return response()->json(['message' => 'Failed to obtain user information.'], 400);
            }

            return $this->processSocialLogin($provider, $userInfo, $tokenResponse, $request);
        } catch (\Throwable $e) {
            Log::error('OAuth callback error', [
                'provider' => $provider,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Authentication failed.'], 500);
        }
    }

    private function exchangeCodeForToken(string $provider, string $code, array $config): ?array
    {
        $tokenUrls = [
            'google' => 'https://oauth2.googleapis.com/token',
            'facebook' => 'https://graph.facebook.com/v18.0/oauth/access_token',
        ];

        $params = [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'code' => $code,
            'redirect_uri' => $config['redirect'],
            'grant_type' => 'authorization_code',
        ];

        if ($provider === 'facebook') {
            unset($params['grant_type']);
        }

        $httpClient = new \GuzzleHttp\Client();

        $response = $httpClient->post($tokenUrls[$provider], [
            'form_params' => $params,
            'timeout' => 30,
        ]);

        return json_decode($response->getBody()->getContents(), true);
    }

    private function getUserInfoFromProvider(string $provider, string $accessToken): ?array
    {
        $httpClient = new \GuzzleHttp\Client();

        if ($provider === 'google') {
            $response = $httpClient->get('https://openidconnect.googleapis.com/v1/userinfo', [
                'headers' => ['Authorization' => "Bearer {$accessToken}"],
                'timeout' => 30,
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            return [
                'id' => $data['sub'] ?? null,
                'email' => $data['email'] ?? null,
                'name' => $data['name'] ?? null,
                'given_name' => $data['given_name'] ?? null,
                'family_name' => $data['family_name'] ?? null,
                'picture' => $data['picture'] ?? null,
                'verified' => $data['email_verified'] ?? false,
            ];
        }

        if ($provider === 'facebook') {
            $response = $httpClient->get('https://graph.facebook.com/v18.0/me', [
                'query' => [
                    'access_token' => $accessToken,
                    'fields' => 'id,name,email,first_name,last_name,picture',
                ],
                'timeout' => 30,
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            return [
                'id' => $data['id'] ?? null,
                'email' => $data['email'] ?? null,
                'name' => $data['name'] ?? null,
                'given_name' => $data['first_name'] ?? null,
                'family_name' => $data['last_name'] ?? null,
                'picture' => $data['picture']['data']['url'] ?? null,
                'verified' => true,
            ];
        }

        return null;
    }

    private function processSocialLogin(string $provider, array $userInfo, array $tokenResponse, Request $request)
    {
        $email = strtolower(trim((string) ($userInfo['email'] ?? '')));
        $providerId = (string) ($userInfo['id'] ?? '');

        if ($email === '' || $providerId === '') {
            return response()->json(['message' => 'Invalid user information received.'], 400);
        }

        // Check if this social account is already linked
        $existingSocial = \App\Models\CustomerSocialAccount::query()
            ->where('csa_provider', $provider)
            ->where('csa_provider_id', $providerId)
            ->first();

        if ($existingSocial) {
            $customer = Customer::query()->where('c_userid', $existingSocial->csa_customer_id)->first();

            if ($customer) {
                // Update tokens
                $existingSocial->update([
                    'csa_token' => $tokenResponse['access_token'] ?? null,
                    'csa_refresh_token' => $tokenResponse['refresh_token'] ?? $existingSocial->csa_refresh_token,
                    'csa_token_expires_at' => isset($tokenResponse['expires_in'])
                        ? now()->addSeconds((int) $tokenResponse['expires_in'])
                        : null,
                    'csa_provider_data' => $userInfo,
                ]);

                return $this->completeSocialLogin($customer, $request, $provider);
            }
        }

        // Check if customer exists with this email
        $customer = Customer::query()
            ->whereRaw('LOWER(c_email) = ?', [$email])
            ->first();

        if ($customer) {
            // Link social account to existing customer
            \App\Models\CustomerSocialAccount::create([
                'csa_customer_id' => $customer->c_userid,
                'csa_provider' => $provider,
                'csa_provider_id' => $providerId,
                'csa_token' => $tokenResponse['access_token'] ?? null,
                'csa_refresh_token' => $tokenResponse['refresh_token'] ?? null,
                'csa_token_expires_at' => isset($tokenResponse['expires_in'])
                    ? now()->addSeconds((int) $tokenResponse['expires_in'])
                    : null,
                'csa_provider_data' => $userInfo,
            ]);

            return $this->completeSocialLogin($customer, $request, $provider);
        }

        // Create new customer account
        $customer = DB::transaction(function () use ($email, $userInfo) {
            if (DB::connection()->getDriverName() === 'pgsql') {
                DB::statement('LOCK TABLE tbl_customer IN EXCLUSIVE MODE');
            }

            $nextCustomerId = ((int) DB::table('tbl_customer')->whereNotNull('c_userid')->max('c_userid')) + 1;
            $username = $this->generateUniqueUsernameFromEmail($email);

            return Customer::create([
                'c_userid' => $nextCustomerId,
                'c_fname' => $userInfo['given_name'] ?? null,
                'c_lname' => $userInfo['family_name'] ?? null,
                'c_username' => $username,
                'c_email' => $email,
                'c_mobile' => '0',
                'c_password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(32)),
                'c_password_pin' => '',
                'c_password_change_required' => false,
                'c_rank' => 0,
                'c_accnt_status' => 0,
                'c_lockstatus' => 0,
                'c_sponsor' => 0,
                'c_date_started' => now(),
            ]);
        });

        // Create social account link
        \App\Models\CustomerSocialAccount::create([
            'csa_customer_id' => $customer->c_userid,
            'csa_provider' => $provider,
            'csa_provider_id' => $providerId,
            'csa_token' => $tokenResponse['access_token'] ?? null,
            'csa_refresh_token' => $tokenResponse['refresh_token'] ?? null,
            'csa_token_expires_at' => isset($tokenResponse['expires_in'])
                ? now()->addSeconds((int) $tokenResponse['expires_in'])
                : null,
            'csa_provider_data' => $userInfo,
        ]);

        return $this->completeSocialLogin($customer, $request, $provider);
    }

    private function generateUniqueUsernameFromEmail(string $email): string
    {
        $base = preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0] ?? 'user');
        $base = strtolower(substr($base, 0, 20));
        $username = $base;
        $counter = 1;

        while (Customer::query()->where('c_username', $username)->exists()) {
            $suffix = random_int(1000, 9999);
            $username = substr($base, 0, 16) . $suffix;
            $counter++;

            if ($counter > 10) {
                $username = 'user' . time() . random_int(1000, 9999);
                break;
            }
        }

        return $username;
    }

    private function completeSocialLogin(Customer $customer, Request $request, string $method = 'google')
    {
        if ((int) ($customer->c_lockstatus ?? 0) === 1) {
            return response()->json([
                'message' => 'Your account has been banned. Please contact support.',
                'reason' => 'banned',
            ], 403);
        }

        $tokenResult = $customer->createToken('auth_token');
        $token = $tokenResult->plainTextToken;
        $plainTokenId = (int) ($tokenResult->accessToken->id ?? 0);

        try {
            $this->recordLoginSession($customer, $request, $plainTokenId > 0 ? $plainTokenId : null);
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            $this->logLoginActivity($customer, $request, $method);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'user' => $this->transformCustomer($customer),
            'token' => $token,
            'message' => 'Login successful.',
        ]);
    }

    public function linkSocialAccount(Request $request, string $provider)
    {
        $allowedProviders = ['google', 'facebook'];

        if (!in_array($provider, $allowedProviders, true)) {
            return response()->json(['message' => 'Invalid provider.'], 400);
        }

        $validated = $request->validate([
            'provider_id' => 'required|string',
            'token' => 'required|string',
            'email' => 'required|email',
            'name' => 'nullable|string',
        ]);

        /** @var Customer $customer */
        $customer = $request->user();

        // Check if this specific provider account is already linked to anyone
        $existing = \App\Models\CustomerSocialAccount::query()
            ->where('csa_provider', $provider)
            ->where('csa_provider_id', $validated['provider_id'])
            ->first();

        if ($existing) {
            if ((int) $existing->csa_customer_id === (int) $customer->c_userid) {
                return response()->json(['message' => 'Account already linked.'], 200);
            }

            return response()->json(['message' => 'This social account is linked to another user.'], 409);
        }

        // Check if customer already has a different account for this provider linked
        $existingForProvider = \App\Models\CustomerSocialAccount::query()
            ->where('csa_customer_id', $customer->c_userid)
            ->where('csa_provider', $provider)
            ->first();

        if ($existingForProvider) {
            return response()->json([
                'message' => 'You already have a ' . ucfirst($provider) . ' account linked. Unlink it first before linking a different one.',
            ], 409);
        }

        // Verify the token with provider (basic check)
        $userInfo = $this->getUserInfoFromProvider($provider, $validated['token']);

        if (!$userInfo || (string) $userInfo['id'] !== $validated['provider_id']) {
            return response()->json(['message' => 'Invalid token or provider ID.'], 400);
        }

        // Validate that the social account email matches the user's account email
        $socialEmail = strtolower(trim((string) ($userInfo['email'] ?? '')));
        $userEmail = strtolower(trim((string) ($customer->c_email ?? '')));

        if ($socialEmail !== $userEmail) {
            return response()->json([
                'message' => 'Email mismatch. The ' . ucfirst($provider) . ' account email does not match your account email.',
                'social_email' => $socialEmail,
                'account_email' => $userEmail,
            ], 400);
        }

        // Create social account link
        \App\Models\CustomerSocialAccount::create([
            'csa_customer_id' => $customer->c_userid,
            'csa_provider' => $provider,
            'csa_provider_id' => $validated['provider_id'],
            'csa_token' => $validated['token'],
            'csa_provider_data' => $userInfo,
        ]);

        return response()->json([
            'message' => ucfirst($provider) . ' account linked successfully.',
        ]);
    }

    public function unlinkSocialAccount(Request $request, string $provider)
    {
        $allowedProviders = ['google', 'facebook'];

        if (!in_array($provider, $allowedProviders, true)) {
            return response()->json(['message' => 'Invalid provider.'], 400);
        }

        /** @var Customer $customer */
        $customer = $request->user();

        $deleted = \App\Models\CustomerSocialAccount::query()
            ->where('csa_customer_id', $customer->c_userid)
            ->where('csa_provider', $provider)
            ->delete();

        if ($deleted === 0) {
            return response()->json(['message' => 'No linked account found.'], 404);
        }

        return response()->json([
            'message' => ucfirst($provider) . ' account unlinked successfully.',
        ]);
    }

    // ========================
    // Mobile Account Linking
    // ========================

    public function linkMobileAccount(Request $request)
    {
        $validated = $request->validate([
            'id_token' => 'required|string',
        ]);

        try {
            // Decode the JWT ID token
            $tokenParts = explode('.', $validated['id_token']);

            if (count($tokenParts) !== 3) {
                return response()->json(['message' => 'Invalid ID token format.'], 400);
            }

            // Decode the payload
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1])), true);

            if (!$payload) {
                return response()->json(['message' => 'Failed to decode ID token.'], 400);
            }

            // Validate required fields
            if (empty($payload['email']) || empty($payload['sub'])) {
                return response()->json(['message' => 'Invalid ID token payload.'], 400);
            }

            // Check if token is expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return response()->json(['message' => 'ID token has expired.'], 400);
            }

            // Verify audience (your Google Client ID)
            if (isset($payload['aud']) && $payload['aud'] !== config('services.google.client_id')) {
                return response()->json(['message' => 'Invalid token audience.'], 400);
            }

            // Extract user information
            $email = strtolower($payload['email']);
            $providerId = $payload['sub'];
            $name = $payload['name'] ?? null;
            $firstName = $payload['given_name'] ?? null;
            $lastName = $payload['family_name'] ?? null;
            $picture = $payload['picture'] ?? null;
            $emailVerified = $payload['email_verified'] ?? false;

            /** @var Customer $customer */
            $customer = $request->user();

            // Validate that the social account email matches the user's account email
            $socialEmail = strtolower(trim($email));
            $userEmail = strtolower(trim((string) ($customer->c_email ?? '')));

            if ($socialEmail !== $userEmail) {
                return response()->json([
                    'message' => 'Email mismatch. The account email does not match your account email.',
                    'social_email' => $socialEmail,
                    'account_email' => $userEmail,
                ], 400);
            }

            // Check if this provider account is already linked to anyone
            $existing = \App\Models\CustomerSocialAccount::query()
                ->where('csa_provider', 'google')
                ->where('csa_provider_id', $providerId)
                ->first();

            if ($existing) {
                if ((int) $existing->csa_customer_id === (int) $customer->c_userid) {
                    return response()->json(['message' => 'Account already linked.'], 200);
                }

                return response()->json(['message' => 'This account is linked to another user.'], 409);
            }

            // Check if customer already has a Google account linked
            $existingForProvider = \App\Models\CustomerSocialAccount::query()
                ->where('csa_customer_id', $customer->c_userid)
                ->where('csa_provider', 'google')
                ->first();

            if ($existingForProvider) {
                return response()->json([
                    'message' => 'You already have a Google account linked. Unlink it first before linking a different one.',
                ], 409);
            }

            // Create social account link
            \App\Models\CustomerSocialAccount::create([
                'csa_customer_id' => $customer->c_userid,
                'csa_provider' => 'google',
                'csa_provider_id' => $providerId,
                'csa_token' => $validated['id_token'],
                'csa_provider_data' => [
                    'id' => $providerId,
                    'email' => $email,
                    'name' => $name,
                    'given_name' => $firstName,
                    'family_name' => $lastName,
                    'picture' => $picture,
                    'verified' => $emailVerified,
                ],
            ]);

            return response()->json([
                'message' => 'Google account linked successfully.',
                'user' => [
                    'id' => $customer->c_userid,
                    'email' => $customer->c_email,
                    'name' => $customer->c_fname . ' ' . $customer->c_lname,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('[Mobile Link Account] Error:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to link account. Please try again.'], 500);
        }
    }

    public function unlinkMobileAccount(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $deleted = \App\Models\CustomerSocialAccount::query()
                ->where('csa_customer_id', $customer->c_userid)
                ->where('csa_provider', 'google')
                ->delete();

            if ($deleted === 0) {
                return response()->json(['message' => 'No linked account found.'], 404);
            }

            return response()->json([
                'message' => 'Google account unlinked successfully.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('[Mobile Unlink Account] Error:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to unlink account. Please try again.'], 500);
        }
    }

    public function checkGoogleLinked(Request $request)
    {
        try {
            Log::info('[Check Google Linked] Request started');

            /** @var Customer $customer */
            $customer = $request->user();

            if (!$customer) {
                Log::error('[Check Google Linked] No customer found');
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            Log::info('[Check Google Linked] Customer authenticated', [
                'customer_id' => $customer->c_userid,
                'email' => $customer->c_email,
            ]);

            // Get all social accounts for this customer
            $allAccounts = \App\Models\CustomerSocialAccount::query()
                ->where('csa_customer_id', $customer->c_userid)
                ->get();

            Log::info('[Check Google Linked] All social accounts for customer', [
                'customer_id' => $customer->c_userid,
                'total_accounts' => count($allAccounts),
                'accounts' => $allAccounts->map(fn($a) => ['provider' => $a->csa_provider, 'provider_id' => $a->csa_provider_id])->toArray(),
            ]);

            $linkedAccount = \App\Models\CustomerSocialAccount::query()
                ->where('csa_customer_id', $customer->c_userid)
                ->where('csa_provider', 'google')
                ->first();

            if ($linkedAccount) {
                Log::info('[Check Google Linked] Google account found', [
                    'customer_id' => $customer->c_userid,
                    'provider' => $linkedAccount->csa_provider,
                    'created_at' => $linkedAccount->created_at,
                ]);

                return response()->json([
                    'linked' => true,
                    'provider' => $linkedAccount->csa_provider,
                    'linked_at' => $linkedAccount->created_at->toIso8601String(),
                ], 200);
            }

            Log::info('[Check Google Linked] No Google account found', [
                'customer_id' => $customer->c_userid,
            ]);

            return response()->json([
                'linked' => false,
                'provider' => null,
                'linked_at' => null,
            ], 200);

        } catch (\Exception $e) {
            Log::error('[Check Google Linked] Unexpected error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Failed to check account status.'], 500);
        }
    }

    // ========================
    // Mobile Biometric Auth
    // ========================

    public function enableBiometric(Request $request)
    {
        try {
            Log::info('[Enable Biometric] Request started', [
                'customer_id' => $request->user()?->c_userid,
                'payload' => $request->all(),
            ]);

            $validated = $request->validate([
                'device_id' => 'required|string|max:255',
                'device_name' => 'required|string|max:255',
                'device_type' => 'required|in:ios,android',
            ]);

            Log::info('[Enable Biometric] Validation passed', ['validated' => $validated]);

            /** @var Customer $customer */
            $customer = $request->user();

            if (!$customer) {
                Log::error('[Enable Biometric] Customer not authenticated');
                return response()->json(['message' => 'Unauthorized.'], 401);
            }

            Log::info('[Enable Biometric] Customer found', [
                'customer_id' => $customer->c_userid,
                'customer_email' => $customer->c_email,
            ]);

            // Check if device is already registered for this customer
            $existing = \App\Models\CustomerBiometricMobile::query()
                ->where('cbm_customer_id', $customer->c_userid)
                ->where('cbm_device_id', $validated['device_id'])
                ->first();

            if ($existing) {
                Log::warning('[Enable Biometric] Device already registered', [
                    'customer_id' => $customer->c_userid,
                    'device_id' => $validated['device_id'],
                ]);
                return response()->json(['message' => 'Device already registered for biometric login.'], 409);
            }

            Log::info('[Enable Biometric] Device check passed, generating token');

            // Generate credential token
            $credentialToken = Str::random(64);

            // Create biometric record
            $biometric = \App\Models\CustomerBiometricMobile::create([
                'cbm_customer_id' => $customer->c_userid,
                'cbm_device_id' => $validated['device_id'],
                'cbm_device_name' => $validated['device_name'],
                'cbm_device_type' => $validated['device_type'],
                'cbm_credential_token' => $credentialToken,
                'cbm_is_active' => true,
            ]);

            Log::info('[Enable Biometric] Biometric record created successfully', [
                'customer_id' => $customer->c_userid,
                'device_id' => $biometric->cbm_device_id,
                'device_name' => $biometric->cbm_device_name,
                'device_type' => $biometric->cbm_device_type,
            ]);

            return response()->json([
                'message' => 'Biometric authentication enabled.',
                'credential_token' => $credentialToken,
                'device_id' => $biometric->cbm_device_id,
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[Enable Biometric] Validation error', [
                'errors' => $e->errors(),
                'message' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Validation failed.', 'errors' => $e->errors()], 422);

        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('[Enable Biometric] Database error', [
                'message' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'code' => $e->getCode(),
            ]);
            return response()->json(['message' => 'Database error occurred.'], 500);

        } catch (\Exception $e) {
            Log::error('[Enable Biometric] Unexpected error', [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Failed to enable biometric authentication.'], 500);
        }
    }

    public function loginBiometric(Request $request)
    {
        try {
            Log::info('[Biometric Login] Request started', [
                'payload' => $request->all(),
            ]);

            $validated = $request->validate([
                'device_id' => 'required|string|max:255',
                'credential_token' => 'required|string|max:255',
            ]);

            Log::info('[Biometric Login] Validation passed', [
                'device_id' => $validated['device_id'],
            ]);

            // Find biometric record
            $biometric = \App\Models\CustomerBiometricMobile::query()
                ->where('cbm_device_id', $validated['device_id'])
                ->where('cbm_credential_token', $validated['credential_token'])
                ->where('cbm_is_active', true)
                ->first();

            if (!$biometric) {
                Log::warning('[Biometric Login] No matching biometric record found', [
                    'device_id' => $validated['device_id'],
                    'credential_token_length' => strlen($validated['credential_token']),
                ]);
                return response()->json(['message' => 'Invalid device or credential token.'], 401);
            }

            Log::info('[Biometric Login] Biometric record found', [
                'customer_id' => $biometric->cbm_customer_id,
                'device_id' => $biometric->cbm_device_id,
            ]);

            $customer = Customer::query()
                ->where('c_userid', $biometric->cbm_customer_id)
                ->first();

            if (!$customer) {
                Log::error('[Biometric Login] Customer not found', [
                    'customer_id' => $biometric->cbm_customer_id,
                ]);
                return response()->json(['message' => 'Customer not found.'], 404);
            }

            Log::info('[Biometric Login] Customer found', [
                'customer_id' => $customer->c_userid,
                'email' => $customer->c_email,
            ]);

            if ((int) ($customer->c_lockstatus ?? 0) === 1) {
                Log::warning('[Biometric Login] Account is banned', [
                    'customer_id' => $customer->c_userid,
                ]);
                return response()->json([
                    'message' => 'Your account has been banned.',
                    'reason' => 'banned',
                ], 403);
            }

            // Update last used time
            $biometric->update(['cbm_last_used_at' => now()]);

            Log::info('[Biometric Login] Updated last_used_at');

            // Create auth token
            $token = $customer->createToken('mobile-biometric')->plainTextToken;

            Log::info('[Biometric Login] Auth token created successfully', [
                'customer_id' => $customer->c_userid,
            ]);

            // Log the login activity
            try {
                $this->logLoginActivity($customer, $request, 'biometric');
            } catch (\Throwable $e) {
                report($e);
            }

        // Match the same response structure used by mobile Google login
        // and (mobile) email/password login: top-level success/message/data.
        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'token' => $token,
                'user' => $this->transformCustomer($customer),
            ],
        ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[Biometric Login] Validation error', [
                'errors' => $e->errors(),
            ]);
            return response()->json(['message' => 'Validation failed.', 'errors' => $e->errors()], 422);

        } catch (\Exception $e) {
            Log::error('[Biometric Login] Unexpected error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Biometric login failed.'], 500);
        }
    }

    public function disableBiometric(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|string|max:255',
        ]);

        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $deleted = \App\Models\CustomerBiometricMobile::query()
                ->where('cbm_customer_id', $customer->c_userid)
                ->where('cbm_device_id', $validated['device_id'])
                ->delete();

            if ($deleted === 0) {
                return response()->json(['message' => 'Biometric device not found.'], 404);
            }

            return response()->json([
                'message' => 'Biometric authentication disabled for this device.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('[Disable Biometric] Error:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to disable biometric authentication.'], 500);
        }
    }

    public function getBiometricDevices(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $devices = \App\Models\CustomerBiometricMobile::query()
                ->where('cbm_customer_id', $customer->c_userid)
                ->where('cbm_is_active', true)
                ->get()
                ->map(function ($device) {
                    return [
                        'device_id' => $device->cbm_device_id,
                        'device_name' => $device->cbm_device_name,
                        'device_type' => $device->cbm_device_type,
                        'created_at' => $device->created_at->toIso8601String(),
                        'last_used_at' => $device->cbm_last_used_at?->toIso8601String(),
                    ];
                });

            return response()->json([
                'devices' => $devices,
            ], 200);

        } catch (\Exception $e) {
            Log::error('[Get Biometric Devices] Error:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to retrieve biometric devices.'], 500);
        }
    }

    public function deleteBiometricDevice(Request $request, string $device_id)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $deleted = \App\Models\CustomerBiometricMobile::query()
                ->where('cbm_customer_id', $customer->c_userid)
                ->where('cbm_device_id', $device_id)
                ->delete();

            if ($deleted === 0) {
                return response()->json(['message' => 'Biometric device not found.'], 404);
            }

            return response()->json([
                'message' => 'Biometric device removed successfully.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('[Delete Biometric Device] Error:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to remove biometric device.'], 500);
        }
    }

    public function getLinkedAccounts(Request $request)
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $accounts = \App\Models\CustomerSocialAccount::query()
            ->where('csa_customer_id', $customer->c_userid)
            ->get(['csa_provider', 'created_at'])
            ->map(function ($account) {
                return [
                    'provider' => $account->csa_provider,
                    'linked_at' => $account->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'accounts' => $accounts,
        ]);
    }

    // ========================
    // Simplified Google Login
    // ========================

    public function googleLogin(Request $request)
    {
        $validated = $request->validate([
            'id_token' => 'required|string',
        ]);

        try {
            // Decode the JWT ID token (basic verification without Google Client)
            $tokenParts = explode('.', $validated['id_token']);
            
            if (count($tokenParts) !== 3) {
                return response()->json(['message' => 'Invalid ID token format.'], 400);
            }

            // Decode the payload
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1])), true);

            if (!$payload) {
                return response()->json(['message' => 'Failed to decode ID token.'], 400);
            }

            // Basic validation
            if (empty($payload['email']) || empty($payload['sub'])) {
                return response()->json(['message' => 'Invalid ID token payload.'], 400);
            }

            // Check if token is expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return response()->json(['message' => 'ID token has expired.'], 400);
            }

            // Verify audience (your Google Client ID)
            if (isset($payload['aud']) && $payload['aud'] !== config('services.google.client_id')) {
                return response()->json(['message' => 'Invalid token audience.'], 400);
            }

            // Extract user information
            $email = strtolower($payload['email']);
            $googleId = $payload['sub'];
            $name = $payload['name'] ?? null;
            $firstName = $payload['given_name'] ?? null;
            $lastName = $payload['family_name'] ?? null;
            $picture = $payload['picture'] ?? null;

            // Check if this Google account is already linked
            $existingSocial = \App\Models\CustomerSocialAccount::query()
                ->where('csa_provider', 'google')
                ->where('csa_provider_id', $googleId)
                ->first();

            if ($existingSocial) {
                $customer = Customer::query()->where('c_userid', $existingSocial->csa_customer_id)->first();

                if ($customer) {
                    // Update provider data
                    $existingSocial->update([
                        'csa_provider_data' => [
                            'id' => $googleId,
                            'email' => $email,
                            'name' => $name,
                            'given_name' => $firstName,
                            'family_name' => $lastName,
                            'picture' => $picture,
                            'verified' => $payload['email_verified'] ?? false,
                        ],
                    ]);

                    return $this->completeSocialLogin($customer, $request);
                }
            }

            // Check if customer exists with this email
            $customer = Customer::query()
                ->whereRaw('LOWER(c_email) = ?', [$email])
                ->first();

            if ($customer) {
                // Link Google account to existing customer
                \App\Models\CustomerSocialAccount::create([
                    'csa_customer_id' => $customer->c_userid,
                    'csa_provider' => 'google',
                    'csa_provider_id' => $googleId,
                    'csa_token' => $validated['id_token'],
                    'csa_provider_data' => [
                        'id' => $googleId,
                        'email' => $email,
                        'name' => $name,
                        'given_name' => $firstName,
                        'family_name' => $lastName,
                        'picture' => $picture,
                        'verified' => $payload['email_verified'] ?? false,
                    ],
                ]);

                return $this->completeSocialLogin($customer, $request);
            }

            // Create new customer account
            $customer = DB::transaction(function () use ($email, $firstName, $lastName) {
                if (DB::connection()->getDriverName() === 'pgsql') {
                    DB::statement('LOCK TABLE tbl_customer IN EXCLUSIVE MODE');
                }

                $nextCustomerId = ((int) DB::table('tbl_customer')->whereNotNull('c_userid')->max('c_userid')) + 1;
                $username = $this->generateUniqueUsernameFromEmail($email);

                return Customer::create([
                    'c_userid' => $nextCustomerId,
                    'c_fname' => $firstName,
                    'c_lname' => $lastName,
                    'c_username' => $username,
                    'c_email' => $email,
                    'c_mobile' => '0',
                    'c_password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(32)),
                    'c_password_pin' => '',
                    'c_password_change_required' => false,
                    'c_rank' => 0,
                    'c_accnt_status' => 0,
                    'c_lockstatus' => 0,
                    'c_sponsor' => 0,
                    'c_date_started' => now(),
                ]);
            });

            // Create social account link
            \App\Models\CustomerSocialAccount::create([
                'csa_customer_id' => $customer->c_userid,
                'csa_provider' => 'google',
                'csa_provider_id' => $googleId,
                'csa_token' => $validated['id_token'],
                'csa_provider_data' => [
                    'id' => $googleId,
                    'email' => $email,
                    'name' => $name,
                    'given_name' => $firstName,
                    'family_name' => $lastName,
                    'picture' => $picture,
                    'verified' => $payload['email_verified'] ?? false,
                ],
            ]);

            return $this->completeSocialLogin($customer, $request);

        } catch (\Throwable $e) {
            return response()->json(['message' => 'Authentication failed.'], 500);
        }
    }

    /**
     * Mobile-specific Google Login
     * Optimized for React Native mobile applications
     * Supports FCM token registration for push notifications
     */
    public function mobileGoogleLogin(Request $request)
    {
        $validated = $request->validate([
            'id_token' => 'required|string',
            'fcm_token' => 'nullable|string',
        ]);

        try {
            Log::info('[Mobile Google Login] Starting', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Decode the JWT ID token
            $tokenParts = explode('.', $validated['id_token']);

            if (count($tokenParts) !== 3) {
                Log::warning('[Mobile Google Login] Invalid token format');
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid ID token format.'
                ], 400);
            }

            // Decode the payload
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1])), true);

            if (!$payload) {
                Log::warning('[Mobile Google Login] Failed to decode token');
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to decode ID token.'
                ], 400);
            }

            // Basic validation
            if (empty($payload['email']) || empty($payload['sub'])) {
                Log::warning('[Mobile Google Login] Missing required fields in token');
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid ID token payload.'
                ], 400);
            }

            // Check if token is expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                Log::warning('[Mobile Google Login] Token expired');
                return response()->json([
                    'success' => false,
                    'message' => 'ID token has expired.'
                ], 400);
            }

            // Verify audience (your Google Client ID)
            $expectedClientId = config('services.google.client_id');
            if (isset($payload['aud']) && $payload['aud'] !== $expectedClientId) {
                Log::warning('[Mobile Google Login] Client ID mismatch', [
                    'expected' => $expectedClientId,
                    'received' => $payload['aud']
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token audience.'
                ], 400);
            }

            // Extract user information
            $email = strtolower($payload['email']);
            $googleId = $payload['sub'];
            $firstName = $payload['given_name'] ?? null;
            $lastName = $payload['family_name'] ?? null;
            $picture = $payload['picture'] ?? null;
            $emailVerified = $payload['email_verified'] ?? false;

            // Check if this Google account is already linked
            $existingSocial = \App\Models\CustomerSocialAccount::query()
                ->where('csa_provider', 'google')
                ->where('csa_provider_id', $googleId)
                ->first();

            if ($existingSocial) {
                $customer = Customer::query()->where('c_userid', $existingSocial->csa_customer_id)->first();

                if ($customer) {
                    Log::info('[Mobile Google Login] Existing Google account found', [
                        'customer_id' => $customer->c_userid,
                        'email' => $email,
                    ]);

                    // Update provider data
                    $existingSocial->update([
                        'csa_provider_data' => [
                            'id' => $googleId,
                            'email' => $email,
                            'first_name' => $firstName,
                            'last_name' => $lastName,
                            'picture' => $picture,
                            'verified' => $emailVerified,
                        ],
                    ]);

                    // Register FCM token if provided
                    if ($validated['fcm_token']) {
                        $this->registerFcmToken($customer->c_userid, $validated['fcm_token']);
                    }

                    return $this->completeMobileGoogleLogin($customer, $request);
                }
            }

            // Check if customer exists with this email
            $customer = Customer::query()
                ->whereRaw('LOWER(c_email) = ?', [$email])
                ->first();

            if ($customer) {
                Log::info('[Mobile Google Login] Existing customer with email found', [
                    'customer_id' => $customer->c_userid,
                    'email' => $email,
                ]);

                // Google account is not linked to this customer
                Log::warning('[Mobile Google Login] Google account not linked to existing customer', [
                    'customer_id' => $customer->c_userid,
                    'email' => $email,
                    'google_id' => $googleId,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Please connect your Google account in your profile settings first.'
                ], 401);
            }

            // Google account not found and no matching customer email
            Log::warning('[Mobile Google Login] Google account not connected to any account', [
                'email' => $email,
                'google_id' => $googleId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'This Google account is not connected to any account. Please sign up first or connect it in your profile settings.'
            ], 401);

        } catch (\Throwable $e) {
            Log::error('[Mobile Google Login] Exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Authentication failed. Please try again later.'
            ], 500);
        }
    }

    /**
     * Complete mobile Google login - generate token and return user data
     */
    private function completeMobileGoogleLogin(Customer $customer, Request $request)
    {
        // Check if account is banned
        if ((int) ($customer->c_lockstatus ?? 0) === 1) {
            Log::warning('[Mobile Google Login] Account banned', [
                'customer_id' => $customer->c_userid,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Your account has been banned. Please contact support.',
            ], 403);
        }

        // Create API token
        $tokenResult = $customer->createToken('google-login-mobile');
        $token = $tokenResult->plainTextToken;

        // Log the login activity
        try {
            MemberActivityLog::create([
                'mal_customer_id' => (int) $customer->c_userid,
                'mal_activity_type' => 'login',
                'mal_action' => 'create',
                'mal_description' => 'Member logged in via Google (Mobile)',
                'mal_resource_type' => 'account',
                'mal_resource_id' => (int) $customer->c_userid,
                'mal_ip_address' => $request->ip(),
                'mal_user_agent' => $request->userAgent(),
                'mal_created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('[Mobile Google Login] Failed to log activity', [
                'error' => $e->getMessage(),
            ]);
        }

        Log::info('[Mobile Google Login] Success', [
            'customer_id' => $customer->c_userid,
            'email' => $customer->c_email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'token' => $token,
                'user' => $this->transformCustomer($customer),
            ]
        ], 200);
    }

    /**
     * Register or update FCM device token for push notifications
     */
    private function registerFcmToken(int $customerId, string $fcmToken): void
    {
        try {
            if (empty(trim($fcmToken))) {
                return;
            }

            \App\Models\FcmDeviceToken::updateOrCreate(
                [
                    'fdt_customer_id' => $customerId,
                    'fdt_fcm_token' => $fcmToken,
                ],
                [
                    'fdt_is_active' => true,
                    'fdt_created_at' => now(),
                ]
            );

            Log::info('[FCM Token] Registered', [
                'customer_id' => $customerId,
                'token' => substr($fcmToken, 0, 20) . '...',
            ]);
        } catch (\Throwable $e) {
            Log::warning('[FCM Token] Failed to register', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function googleCallback(Request $request)
    {
        $validated = $request->validate([
            'id_token' => 'required|string',
        ]);

        try {
            $token = $validated['id_token'];
            $tokenParts = explode('.', $token);
            $isEmailVerified = false;
            
            // Check if it's an access token (starts with 'ya29.') or ID token (JWT with 3 parts)
            if (strpos($token, 'ya29.') === 0) {
                // This is an access token, use Google API to get user info
                $response = Http::get('https://www.googleapis.com/oauth2/v2/userinfo', [
                    'access_token' => $token
                ]);

                if (!$response->successful()) {
                    return response()->json(['message' => 'Invalid access token.'], 400);
                }

                $userInfo = $response->json();
                
                if (empty($userInfo['email'])) {
                    return response()->json(['message' => 'Failed to get user information.'], 400);
                }

                // Extract user information from API response
                $email = strtolower($userInfo['email']);
                $googleId = $userInfo['id'];
                $name = $userInfo['name'] ?? null;
                $firstName = $userInfo['given_name'] ?? null;
                $lastName = $userInfo['family_name'] ?? null;
                $picture = $userInfo['picture'] ?? null;
                $isEmailVerified = (bool) ($userInfo['verified_email'] ?? false);
                
            } elseif (count($tokenParts) === 3) {
                // This is an ID token (JWT), decode it

                // Decode the payload
                $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1])), true);

                if (!$payload) {
                    return response()->json(['message' => 'Failed to decode ID token.'], 400);
                }

                // Basic validation
                if (empty($payload['email']) || empty($payload['sub'])) {
                    return response()->json(['message' => 'Invalid ID token payload.'], 400);
                }

                // Check if token is expired
                if (isset($payload['exp']) && $payload['exp'] < time()) {
                    return response()->json(['message' => 'ID token has expired.'], 400);
                }

                // Extract user information from ID token
                $email = strtolower($payload['email']);
                $googleId = $payload['sub'];
                $name = $payload['name'] ?? null;
                $firstName = $payload['given_name'] ?? null;
                $lastName = $payload['family_name'] ?? null;
                $picture = $payload['picture'] ?? null;
                $isEmailVerified = (bool) ($payload['email_verified'] ?? false);
                
            } else {
                return response()->json(['message' => 'Invalid token format.'], 400);
            }

            $socialAccount = \App\Models\CustomerSocialAccount::query()
                ->where('csa_provider', 'google')
                ->where('csa_provider_id', $googleId)
                ->first();

            if (!$socialAccount) {
                return response()->json([
                    'message' => 'No Google account found. Please link your Google account first.',
                    'error' => 'social_account_not_found'
                ], 401);
            }

            $customer = Customer::query()->where('c_userid', $socialAccount->csa_customer_id)->first();

            if (!$customer) {
                return response()->json(['message' => 'Customer account not found.'], 401);
            }

            // Update the social account with latest data
            $socialAccount->update([
                'csa_token' => $validated['id_token'],
                'csa_provider_data' => [
                    'id' => $googleId,
                    'email' => $email,
                    'name' => $name,
                    'given_name' => $firstName,
                    'family_name' => $lastName,
                    'picture' => $picture,
                    'verified' => $isEmailVerified,
                ],
            ]);

            return $this->completeSocialLogin($customer, $request, 'google');

        } catch (\Throwable $e) {
            return response()->json(['message' => 'Authentication failed.'], 500);
        }
    }

    public function facebookCallback(Request $request)
    {
        $validated = $request->validate([
            'access_token' => 'required|string',
            'provider_id'  => 'required|string',
        ]);

        try {
            $accessToken = $validated['access_token'];
            $providerId  = $validated['provider_id'];

            $response = Http::get('https://graph.facebook.com/v18.0/me', [
                'fields'       => 'id,name,email,first_name,last_name',
                'access_token' => $accessToken,
            ]);

            if (!$response->successful()) {
                return response()->json(['message' => 'Invalid Facebook access token.'], 400);
            }

            $userInfo = $response->json();

            if (!empty($userInfo['error'])) {
                return response()->json(['message' => 'Invalid Facebook access token.'], 400);
            }

            $facebookId = $userInfo['id'] ?? null;

            if (!$facebookId || $facebookId !== $providerId) {
                return response()->json(['message' => 'Facebook token verification failed.'], 400);
            }

            $socialAccount = \App\Models\CustomerSocialAccount::query()
                ->where('csa_provider', 'facebook')
                ->where('csa_provider_id', $facebookId)
                ->first();

            if (!$socialAccount) {
                return response()->json([
                    'message' => 'No Facebook account found. Please link your Facebook account first.',
                    'error'   => 'social_account_not_found',
                ], 401);
            }

            $customer = Customer::query()->where('c_userid', $socialAccount->csa_customer_id)->first();

            if (!$customer) {
                return response()->json(['message' => 'Customer account not found.'], 401);
            }

            $socialAccount->update([
                'csa_token'         => $accessToken,
                'csa_provider_data' => $userInfo,
            ]);

            return $this->completeSocialLogin($customer, $request, 'facebook');

        } catch (\Throwable $e) {
            return response()->json(['message' => 'Authentication failed.'], 500);
        }
    }

    public function facebookDataDeletion(Request $request)
    {
        $signedRequest = $request->input('signed_request');

        if (!$signedRequest || !str_contains($signedRequest, '.')) {
            return response()->json(['error' => 'Missing or invalid signed_request.'], 400);
        }

        [$encodedSig, $payload] = explode('.', $signedRequest, 2);

        $data = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        $facebookUserId = $data['user_id'] ?? null;

        if ($facebookUserId) {
            \App\Models\CustomerSocialAccount::query()
                ->where('csa_provider', 'facebook')
                ->where('csa_provider_id', (string) $facebookUserId)
                ->delete();
        }

        $confirmationCode = 'fbdel_' . ($facebookUserId ?? uniqid());

        return response()->json([
            'url' => url('/api/auth/facebook/data-deletion/status?id=' . $confirmationCode),
            'confirmation_code' => $confirmationCode,
        ]);
    }

    /**
     * Facebook data deletion status endpoint (required by Facebook Platform Policy)
     */
    public function facebookDataDeletionStatus(Request $request)
    {
        $confirmationId = $request->query('id');

        if (!$confirmationId) {
            return response()->json(['error' => 'Missing confirmation ID.'], 400);
        }

        return response()->json([
            'id' => $confirmationId,
            'status' => 'deleted',
            'deletion_time' => now()->toIso8601String(),
        ]);
    }

    public function accountSnapshot(Request $request)
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $customerId = (int) $customer->getAuthIdentifier();

        try {
            // Get Orders Summary
            $orders = DB::table('tbl_checkout_history')
                ->where('ch_customer_id', $customerId)
                ->orderByDesc('ch_paid_at')
                ->orderByDesc('ch_id')
                ->get();

            $ordersSummary = [
                'total' => $orders->count(),
                'pending' => $orders->whereIn('ch_status', ['pending', 'pending_approval'])->count(),
                'paid' => $orders->whereIn('ch_status', ['paid', 'succeeded', 'success'])->count(),
                'shipped' => $orders->where('ch_fulfillment_status', 'shipped')->count(),
                'delivered' => $orders->where('ch_fulfillment_status', 'delivered')->count(),
                'completed' => $orders->whereIn('ch_status', ['completed', 'shipped'])->count(),
                'total_spent' => (float) $orders->whereIn('ch_status', ['paid', 'completed', 'shipped'])->sum('ch_amount'),
                'recent_orders' => $orders->take(5)->map(function ($order) {
                    $status = $order->ch_fulfillment_status
                        ? (string) $order->ch_fulfillment_status
                        : $this->mapCheckoutStatusToOrderStatus((string) $order->ch_status);

                    return [
                        'id' => (int) $order->ch_id,
                        'order_number' => $order->ch_checkout_id,
                        'status' => $status,
                        'product_name' => $order->ch_product_name ?: $order->ch_description,
                        'amount' => (float) $order->ch_amount,
                        'date' => $order->ch_paid_at ? (is_string($order->ch_paid_at) ? $order->ch_paid_at : $order->ch_paid_at->format('Y-m-d H:i:s')) : null,
                        'image' => $order->ch_product_image ?: '/Images/HeroSection/sofas.jpg',
                    ];
                })->toArray()
            ];

            // Get Wishlist Summary
            $wishlistItems = DB::table('tbl_customer_wishlist')
                ->where('cw_customer_id', $customerId)
                ->count();

            // Get Customer Reviews
            $customerReviews = DB::table('tbl_product_reviews as r')
                ->join('tbl_product as p', 'p.pd_id', '=', 'r.pr_product_id')
                ->where('r.pr_customer_id', $customerId)
                ->orderByDesc('r.created_at')
                ->get([
                    'r.pr_id',
                    'r.pr_product_id',
                    'r.pr_rating',
                    'r.pr_review',
                    'r.created_at',
                    'p.pd_name',
                    'p.pd_image',
                ]);

            $reviewsSummary = [
                'total' => $customerReviews->count(),
                'average_rating' => $customerReviews->count() > 0 
                    ? round($customerReviews->sum('pr_rating') / $customerReviews->count(), 2)
                    : 0,
                'recent_reviews' => $customerReviews->take(5)->map(function ($review) {
                    return [
                        'id' => (int) $review->pr_id,
                        'product_id' => (int) $review->pr_product_id,
                        'product_name' => $review->pd_name,
                        'rating' => (int) $review->pr_rating,
                        'review' => $review->pr_review,
                        'date' => is_string($review->created_at) ? $review->created_at : $review->created_at->format('Y-m-d H:i:s'),
                        'product_image' => $review->pd_image ?: '/Images/HeroSection/sofas.jpg',
                    ];
                })->toArray()
            ];

            // Get Loyalty/Tier Information
            $tier = $this->mapCustomerTier((int) ($customer->c_rank ?? 0));
            $referralColumns = [
                'c_userid',
                'c_username',
                'c_fname',
                'c_mname',
                'c_lname',
                'c_email',
                'c_avatar_url',
                'c_accnt_status',
                'c_lockstatus',
                'c_totalincome',
                'c_gpv',
                'c_date_started',
                'c_sponsor',
            ];
            $referralMembers = Customer::query()
                ->select($referralColumns)
                ->orderBy('c_userid')
                ->get();
            $referralMembersBySponsor = $referralMembers
                ->filter(fn (Customer $member) => (int) ($member->c_sponsor ?? 0) > 0)
                ->groupBy(fn (Customer $member) => (int) ($member->c_sponsor ?? 0));
            $buildReferralSnapshotNode = function (Customer $member, array $path = []) use (&$buildReferralSnapshotNode, $referralMembersBySponsor): array {
                $memberId = (int) $member->c_userid;
                $nextPath = [...$path, $memberId];

                $children = collect($referralMembersBySponsor->get($memberId, []))
                    ->reject(fn (Customer $child) => in_array((int) $child->c_userid, $nextPath, true))
                    ->sortByDesc('c_userid')
                    ->map(fn (Customer $child): array => $buildReferralSnapshotNode($child, $nextPath))
                    ->values();

                $node = $this->transformReferralNode($member);
                $node['children_count'] = $children->count();
                $node['children'] = $children->all();

                return $node;
            };
            $directReferralMembers = collect($referralMembersBySponsor->get($customerId, []))
                ->sortByDesc('c_userid')
                ->values();

            $personalPv = (float) DB::table('tbl_checkout_history')
                ->where('ch_customer_id', $customerId)
                ->whereNotNull('ch_pv_posted_at')
                ->sum('ch_earned_pv');

            $directIds = $directReferralMembers->pluck('c_userid')->map(fn ($id) => (int) $id)->toArray();
            $activeMembersCount = 0;
            if (!empty($directIds)) {
                $directPvSums = DB::table('tbl_checkout_history')
                    ->whereIn('ch_customer_id', $directIds)
                    ->whereNotNull('ch_pv_posted_at')
                    ->groupBy('ch_customer_id')
                    ->selectRaw('ch_customer_id, SUM(ch_earned_pv) as total_pv')
                    ->get()
                    ->keyBy('ch_customer_id');
                foreach ($directIds as $directId) {
                    if ((float) ($directPvSums->get($directId)?->total_pv ?? 0) >= 300) {
                        $activeMembersCount++;
                    }
                }
            }
            $activeBuildersCount = $directReferralMembers->filter(fn (Customer $m) => (int) ($m->c_rank ?? 0) >= 2)->count();
            $activeLeadersCount  = $directReferralMembers->filter(fn (Customer $m) => (int) ($m->c_rank ?? 0) >= 3)->count();

            $loyaltyInfo = [
                'tier' => $tier,
                'rank' => (int) ($customer->c_rank ?? 0),
                'badge_name' => $tier,
                'total_orders' => (int) ($customer->c_totalpair ?? 0),
                'total_spent' => (float) ($customer->c_gpv ?? 0),
                'total_earnings' => (float) ($customer->c_totalincome ?? 0),
                'pv_balance' => (float) ($customer->c_gpv ?? 0),
                'cash_balance' => (float) ($customer->c_totalincome ?? 0),
                'personal_pv' => $personalPv,
                'active_members_count' => $activeMembersCount,
                'active_builders_count' => $activeBuildersCount,
                'active_leaders_count' => $activeLeadersCount,
                'referral_count' => $directReferralMembers->count(),
                'direct_referrals' => $directReferralMembers
                    ->map(fn (Customer $member): array => $buildReferralSnapshotNode($member))
                    ->values()
                    ->all(),
                'join_date' => $customer->c_date_started ? (is_string($customer->c_date_started) ? $customer->c_date_started : $customer->c_date_started->format('Y-m-d')) : null,
                'last_login' => $customer->c_last_logindate ? (is_string($customer->c_last_logindate) ? $customer->c_last_logindate : $customer->c_last_logindate->format('Y-m-d H:i:s')) : null,
            ];

            // Account Status
            $accountStatus = $this->mapAccountStatus(
                (int) ($customer->c_lockstatus ?? 0),
                (int) ($customer->c_accnt_status ?? 0)
            );

            // Profile Information
            $profileInfo = [
                'id' => $customerId,
                'username' => $customer->c_username,
                'first_name' => $customer->c_fname,
                'last_name' => $customer->c_lname,
                'email' => $customer->c_email,
                'phone' => $customer->c_mobile,
                'avatar_url' => $customer->c_avatar_url,
                'verification_status' => $accountStatus['verification_status'],
                'account_status' => $accountStatus['account_status'],
            ];

            return response()->json([
                'profile' => $profileInfo,
                'loyalty' => $loyaltyInfo,
                'orders' => $ordersSummary,
                'wishlist' => [
                    'total_items' => $wishlistItems,
                ],
                'reviews' => $reviewsSummary,
                'snapshot_date' => now()->format('Y-m-d H:i:s'),
            ]);

        } catch (\Throwable $e) {
            Log::error('Account snapshot error', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Failed to load account snapshot.'], 500);
        }
    }

    private function mapCheckoutStatusToOrderStatus(string $status): string
    {
        return match ($status) {
            'pending', 'pending_approval' => 'pending',
            'paid', 'succeeded', 'success' => 'paid',
            'completed' => 'completed',
            'shipped' => 'shipped',
            'delivered' => 'delivered',
            'failed', 'cancelled' => 'cancelled',
            default => 'unknown',
        };
    }

    private function mapCustomerTier(int $rank): string
    {
        return match ($rank) {
            5 => 'Lifestyle Elite',
            4 => 'Lifestyle Consultant',
            3 => 'Home Stylist',
            2 => 'Home Builder',
            1 => 'Home Starter',
            default => 'Home Starter',
        };
    }

    private function mapAccountStatus(int $lockStatus, int $accountStatus): array
    {
        $verificationStatus = match ($accountStatus) {
            1 => 'verified',
            2 => 'pending_review',
            default => 'not_verified',
        };

        $accountStatus = match (true) {
            $lockStatus === 1 => 'blocked',
            $accountStatus === 2 => 'kyc_review',
            $accountStatus === 0 => 'pending',
            default => 'active',
        };

        return [
            'verification_status' => $verificationStatus,
            'account_status' => $accountStatus,
        ];
    }

    public function generateQrLogin(Request $request)
    {
        $sessionId = (string) Str::uuid();
        $expiresAt = now()->addMinutes(5);

        Cache::put(
            'qr_login:' . $sessionId,
            [
                'status' => 'pending',
                'created_at' => now()->toIso8601String(),
                'expires_at' => $expiresAt->toIso8601String(),
            ],
            $expiresAt
        );

        return response()->json([
            'session_id' => $sessionId,
            'qr_data' => $sessionId,
            'expires_at' => $expiresAt->toIso8601String(),
            'expires_in_seconds' => 300,
        ]);
    }

    public function verifyQrLogin(Request $request)
    {
        $validated = $request->validate([
            'qr_data' => 'required|string|uuid',
        ]);

        $sessionId = (string) $validated['qr_data'];
        $cacheKey = 'qr_login:' . $sessionId;
        $cached = Cache::get($cacheKey);

        if (!is_array($cached)) {
            throw ValidationException::withMessages([
                'qr_data' => ['QR session is invalid or expired.'],
            ]);
        }

        /** @var Customer $customer */
        $customer = $request->user();
        if (!$customer instanceof Customer) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Update cache with approved status and customer info
        $cached['status'] = 'approved';
        $cached['customer_id'] = (int) $customer->c_userid;
        $cached['customer_email'] = (string) $customer->c_email;
        $cached['verified_at'] = now()->toIso8601String();

        Cache::put($cacheKey, $cached, now()->addMinutes(2));

        // Broadcast event to website
        try {
            $pusher = new Pusher(
                env('PUSHER_APP_KEY'),
                env('PUSHER_APP_SECRET'),
                env('PUSHER_APP_ID'),
                [
                    'cluster' => env('PUSHER_APP_CLUSTER', 'ap3'),
                    'useTLS' => true,
                ]
            );

            $pusher->trigger(
                'qr-login-' . $sessionId,
                'qr-approved',
                [
                    'session_id' => $sessionId,
                    'status' => 'approved',
                    'customer_id' => (int) $customer->c_userid,
                    'verified_at' => now()->toIso8601String(),
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to broadcast QR login approval', [
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
            ]);
        }

        // Log QR login activity
        $this->logLoginActivity($customer, $request, 'qr');

        return response()->json([
            'message' => 'QR login verified successfully.',
            'session_id' => $sessionId,
            'status' => 'approved',
        ]);
    }

    public function checkQrLoginStatus(Request $request, string $sessionId)
    {
        $cacheKey = 'qr_login:' . $sessionId;
        $cached = Cache::get($cacheKey);

        if (!is_array($cached)) {
            return response()->json([
                'status' => 'expired',
                'message' => 'QR session is invalid or expired.',
            ], 410);
        }

        $status = (string) ($cached['status'] ?? 'pending');

        return response()->json([
            'session_id' => $sessionId,
            'status' => $status,
            'expires_at' => (string) ($cached['expires_at'] ?? ''),
            'verified_at' => $status === 'approved' ? (string) ($cached['verified_at'] ?? '') : null,
        ]);
    }

    public function completeQrLogin(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|string|uuid',
        ]);

        $sessionId = (string) $validated['session_id'];
        $cacheKey = 'qr_login:' . $sessionId;
        $cached = Cache::get($cacheKey);

        if (!is_array($cached)) {
            return response()->json([
                'message' => 'QR session is invalid or expired.',
            ], 410);
        }

        $status = (string) ($cached['status'] ?? 'pending');
        if ($status !== 'approved') {
            return response()->json([
                'message' => 'QR session has not been approved yet.',
            ], 403);
        }

        $customerId = (int) ($cached['customer_id'] ?? 0);
        if (!$customerId) {
            return response()->json([
                'message' => 'QR session is missing customer information.',
            ], 400);
        }

        // Get the customer
        $customer = Customer::where('c_userid', $customerId)->first();
        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found.',
            ], 404);
        }

        // Generate token
        $token = $customer->createToken('web-qr-login')->plainTextToken;

        // Clear the cache after successful login
        Cache::forget($cacheKey);

        return response()->json([
            'message' => 'QR login completed successfully.',
            'user' => [
                'id' => (int) $customer->c_userid,
                'name' => (string) ($customer->c_first_name . ' ' . $customer->c_last_name),
                'email' => (string) $customer->c_email,
                'password_change_required' => (bool) $customer->password_change_required,
            ],
            'token' => $token,
        ]);
    }

    public function sendOtpViaSms(Request $request)
    {
        $validated = $request->validate([
            'verification_token' => 'required|string',
            'phone' => 'required|string|max:20',
        ]);

        try {
            $verificationToken = trim((string) $validated['verification_token']);
            $phoneNumber = trim((string) $validated['phone']);

            // Retrieve the cached registration data
            $cached = Cache::get($this->registrationOtpCacheKey($verificationToken));

            if (!is_array($cached) || empty($cached['payload'])) {
                Log::warning('sendOtpViaSms: verification token not found or expired', [
                    'token_prefix' => substr($verificationToken, 0, 8),
                ]);

                return response()->json([
                    'message' => 'Verification token expired. Please register again.',
                    'error' => 'TOKEN_EXPIRED',
                ], 410);
            }

            $otp = (string) random_int(1000, 9999);
            $semaphoreService = new \App\Services\SemaphoreService();
            $sent = $semaphoreService->sendOtp($phoneNumber, $otp);

            if (!$sent) {
                Log::error('sendOtpViaSms: Semaphore failed to send', [
                    'phone' => $this->maskPhoneNumber($phoneNumber),
                ]);

                return response()->json([
                    'message' => 'Failed to send OTP. Please try again.',
                ], 500);
            }

            // Store SMS OTP data using the same verification token
            Cache::put($this->otpSmsCacheKey($verificationToken), [
                'otp_hash' => Hash::make($otp),
                'phone' => $phoneNumber,
                'payload' => $cached['payload'],
            ], now()->addMinutes(10));

            Log::info('sendOtpViaSms successful', [
                'token_prefix' => substr($verificationToken, 0, 8),
                'phone' => $this->maskPhoneNumber($phoneNumber),
            ]);

            return response()->json([
                'message' => 'OTP has been sent to your phone number.',
                'requires_otp' => true,
                'verification_token' => $verificationToken,
                'phone' => $phoneNumber,
            ]);
        } catch (\Exception $e) {
            Log::error('sendOtpViaSms error', [
                'error' => $e->getMessage(),
                'phone' => $validated['phone'] ?? null,
            ]);

            return response()->json([
                'message' => 'An error occurred while sending OTP.',
            ], 500);
        }
    }

    public function verifySmsOtp(Request $request)
    {
        $validated = $request->validate([
            'verification_token' => 'required|string',
            'otp' => 'required|string|size:4',
        ]);

        $token = $validated['verification_token'];
        $cacheKey = $this->otpSmsCacheKey($token);
        $attemptsKey = $this->otpAttemptsCacheKey($token);
        $cached = Cache::get($cacheKey);

        // Check if OTP expired
        if (!is_array($cached) || empty($cached['otp_hash'])) {
            Log::warning('SMS OTP verification failed: expired', [
                'token_prefix' => substr($token, 0, 8),
            ]);

            return response()->json([
                'message' => 'The verification code has expired. Please request a new OTP.',
                'error' => 'OTP_EXPIRED',
            ], 410); // 410 Gone
        }

        // Check attempt limit (max 5 attempts)
        $attempts = (int) Cache::get($attemptsKey, 0);
        if ($attempts >= 5) {
            Log::warning('SMS OTP verification failed: max attempts exceeded', [
                'token_prefix' => substr($token, 0, 8),
                'attempts' => $attempts,
            ]);

            return response()->json([
                'message' => 'Too many failed attempts. Please request a new OTP.',
                'error' => 'MAX_ATTEMPTS_EXCEEDED',
            ], 429); // 429 Too Many Requests
        }

        // Verify OTP
        if (!Hash::check((string) $validated['otp'], (string) $cached['otp_hash'])) {
            $newAttempts = $attempts + 1;
            Cache::put($attemptsKey, $newAttempts, now()->addMinutes(10));

            Log::warning('SMS OTP verification failed: invalid OTP', [
                'token_prefix' => substr($token, 0, 8),
                'attempt' => $newAttempts,
            ]);

            return response()->json([
                'message' => "Invalid verification code. {5 - $newAttempts} attempt(s) remaining.",
                'error' => 'INVALID_OTP',
                'attempts_remaining' => max(0, 5 - $newAttempts),
            ], 422); // 422 Unprocessable Entity
        }

        // OTP is valid - proceed with registration
        Cache::forget($attemptsKey);

        // Get cached registration payload
        if (!is_array($cached) || empty($cached['payload'])) {
            Log::warning('SMS OTP verification: payload not found', [
                'token_prefix' => substr($token, 0, 8),
            ]);

            return response()->json([
                'message' => 'The verification has expired. Please register again.',
                'error' => 'VERIFICATION_EXPIRED',
            ], 410);
        }

        $payload = json_decode(Crypt::decryptString((string) $cached['payload']), true, 512, JSON_THROW_ON_ERROR);
        $registration = $payload['validated'] ?? [];
        $referrerUserId = (int) ($payload['referrer_user_id'] ?? 0);

        if (empty($registration['username'])) {
            Log::warning('SMS OTP verification: invalid payload', [
                'token_prefix' => substr($token, 0, 8),
            ]);

            return response()->json([
                'message' => 'The verification payload is invalid. Please register again.',
                'error' => 'INVALID_PAYLOAD',
            ], 422);
        }

        $existingByEmail = !empty($registration['email']) ? Customer::query()
            ->whereRaw('LOWER(c_email) = ?', [mb_strtolower((string) $registration['email'], 'UTF-8')])
            ->first() : null;
        $existingByUsername = Customer::query()
            ->whereRaw('LOWER(c_username) = ?', [mb_strtolower((string) $registration['username'], 'UTF-8')])
            ->first();

        // Idempotency: if account already exists by username, return success
        if ($existingByUsername instanceof Customer) {
            // If email is also provided, verify it matches
            if (!empty($registration['email']) && $existingByEmail instanceof Customer) {
                if ((int) $existingByEmail->c_userid === (int) $existingByUsername->c_userid) {
                    Cache::forget($cacheKey);
                    return response()->json([
                        'message' => 'Registration complete. You can now sign in.',
                        'user' => $this->transformCustomer($existingByUsername),
                    ], 201);
                }
            } else if (empty($registration['email'])) {
                // Email is null, just return the existing user
                Cache::forget($cacheKey);
                return response()->json([
                    'message' => 'Registration complete. You can now sign in.',
                    'user' => $this->transformCustomer($existingByUsername),
                ], 201);
            }

            Log::warning('SMS OTP verification: username exists', [
                'token_prefix' => substr($token, 0, 8),
            ]);

            return response()->json([
                'message' => 'This username is already taken.',
                'error' => 'USERNAME_EXISTS',
            ], 422);
        }

        if ($existingByEmail instanceof Customer) {
            Log::warning('SMS OTP verification: email exists', [
                'token_prefix' => substr($token, 0, 8),
            ]);

            return response()->json([
                'message' => 'This email is already registered.',
                'error' => 'EMAIL_EXISTS',
            ], 422);
        }

        $customer = DB::transaction(function () use ($registration, $referrerUserId) {
            if (DB::connection()->getDriverName() === 'pgsql') {
                DB::statement('LOCK TABLE tbl_customer IN EXCLUSIVE MODE');
            }

            $nextCustomerId = ((int) DB::table('tbl_customer')->whereNotNull('c_userid')->max('c_userid')) + 1;

            return Customer::create([
                'c_userid'       => $nextCustomerId,
                'c_fname'        => $registration['first_name'],
                'c_lname'        => $registration['last_name'],
                'c_mname'        => $registration['middle_name'] ?? null,
                'c_username'     => $registration['username'],
                'c_email'        => $registration['email'],
                'c_mobile'       => $registration['phone'] ?? '0',
                'c_bdate'        => $registration['birth_date'] ?? null,
                'c_gender'       => $this->mapGenderToInt($registration['gender'] ?? null),
                'c_occupation'   => $registration['occupation'] ?? 'None',
                'c_country'      => $registration['country'] ?? (($registration['work_location'] ?? 'local') === 'overseas' ? 'Overseas' : 'Philippines'),
                'c_password'     => Hash::make($registration['password']),
                'c_password_pin' => '',
                'c_password_change_required' => false,
                'c_rank'         => 0,
                'c_accnt_status' => 0,
                'c_lockstatus'   => 0,
                'c_sponsor'      => $referrerUserId,
                'c_date_started' => now(),
                'c_address'      => $registration['address'] ?? null,
                'c_barangay'     => $registration['barangay'] ?? null,
                'c_city'         => $registration['city'] ?? null,
                'c_province'     => $registration['province'] ?? null,
                'c_region'       => $registration['region'] ?? null,
                'c_region_code'  => $registration['region_code'] ?? null,
                'c_province_code'=> $registration['province_code'] ?? null,
                'c_city_code'    => $registration['city_code'] ?? null,
                'c_barangay_code'=> $registration['barangay_code'] ?? null,
                'c_zipcode'      => $registration['zip_code'] ?? null,
                'c_partner_slug' => ($slug = strtolower(trim((string) ($registration['partner_slug'] ?? '')))) !== '' ? $slug : null,
            ]);
        });

        Cache::forget($cacheKey);

        Log::info('SMS OTP verification and registration successful', [
            'token_prefix' => substr($token, 0, 8),
            'customer_id' => (int) $customer->c_userid,
        ]);

        return response()->json([
            'message' => 'Registration complete. You can now sign in.',
            'user' => $this->transformCustomer($customer),
        ], 201);
    }

    private function otpSmsCacheKey(string $verificationToken): string
    {
        return "otp_sms:{$verificationToken}";
    }

    private function otpAttemptsCacheKey(string $verificationToken): string
    {
        return "otp_sms_attempts:{$verificationToken}";
    }

    private function maskPhoneNumber(string $phoneNumber): string
    {
        $normalized = preg_replace('/[^0-9]/', '', $phoneNumber);
        if (strlen($normalized) >= 7) {
            return substr($normalized, 0, 3) . '***' . substr($normalized, -3);
        }
        return '***' . substr($normalized, -3);
    }

}
