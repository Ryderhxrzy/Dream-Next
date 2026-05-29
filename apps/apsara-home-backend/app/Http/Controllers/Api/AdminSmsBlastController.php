<?php

namespace App\Http\Controllers\Api;

use App\Jobs\SendSmsBlastJob;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Customer;
use App\Services\SemaphoreService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AdminSmsBlastController extends Controller
{
    public function __construct(private readonly SemaphoreService $semaphoreService)
    {
    }

    public function send(Request $request)
    {
        try {
            $actor = $this->resolveAdmin($request);
            if (!$actor) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (!$this->canSendSmsBlasts($actor)) {
                return response()->json(['message' => 'Forbidden: you do not have permission to send SMS blasts.'], 403);
            }

            $validated = $request->validate([
                'subject' => 'required|string|max:255',
                'body' => 'required|string|max:5000',
                'recipients' => 'nullable|array',
                'recipients.*' => 'required|string|max:30',
                'recipient_type' => 'nullable|string|in:members,all',
                'scheduled_at' => 'nullable|date',
            ]);

            $subject = trim((string) ($validated['subject'] ?? ''));
            $body = trim((string) ($validated['body'] ?? ''));
            $recipientType = (string) ($validated['recipient_type'] ?? 'members');
            $scheduledAt = !empty($validated['scheduled_at'] ?? null) ? Carbon::parse((string) $validated['scheduled_at']) : null;
            $recipientRows = $this->resolveRecipientRows(
                type: $recipientType !== '' ? $recipientType : 'members',
                providedPhones: $validated['recipients'] ?? []
            );

            if ($subject === '' || $body === '') {
                throw ValidationException::withMessages([
                    'subject' => 'Subject and body cannot be empty.',
                ]);
            }

            if (empty($recipientRows)) {
                return response()->json([
                    'message' => 'No recipients found matching the criteria.',
                    'sent_count' => 0,
                ], 400);
            }

            if ($scheduledAt && $scheduledAt->isFuture()) {
                SendSmsBlastJob::dispatch(
                    subject: $subject,
                    body: $body,
                    recipientRows: $recipientRows,
                    senderName: 'AFHome'
                )->onConnection('database')->delay($scheduledAt);

                return response()->json([
                    'message' => 'SMS blast scheduled successfully.',
                    'scheduled' => true,
                    'scheduled_at' => $scheduledAt->toIso8601String(),
                    'sent_count' => 0,
                    'failed_count' => 0,
                ], 202);
            }

            $sentCount = 0;
            $failedCount = 0;
            $failedPhones = [];
            $message = trim($subject . "\n\n" . $body);

            foreach ($recipientRows as $recipient) {
                try {
                    $variables = $this->buildPersonalizationVariables($recipient);
                    $personalizedMessage = $this->applyTemplateVariables($message, $variables);
                    $ok = $this->semaphoreService->sendMessage(
                        phoneNumber: (string) $recipient['phone'],
                        message: $personalizedMessage,
                        senderName: 'AFHome'
                    );

                    if ($ok) {
                        $sentCount++;
                    } else {
                        $failedCount++;
                        $failedPhones[] = (string) ($recipient['phone'] ?? '');
                    }
                } catch (\Exception $e) {
                    $failedCount++;
                    $failedPhones[] = (string) ($recipient['phone'] ?? '');
                    Log::error('SMS blast send failed', [
                        'recipient' => (string) ($recipient['phone'] ?? ''),
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return response()->json([
                'message' => 'SMS blast sent successfully.',
                'sent_count' => $sentCount,
                'failed_count' => $failedCount,
                'failed_phones' => count($failedPhones) > 0 ? $failedPhones : null,
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Unexpected error in sms blast', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getRecipients(Request $request)
    {
        try {
            $actor = $this->resolveAdmin($request);
            if (!$actor) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'recipient_type' => 'required|string|in:members,all',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100000',
            ]);

            $phones = $this->getRecipientContacts($validated['recipient_type']);
            $perPage = (int) ($validated['per_page'] ?? 50);

            return response()->json([
                'recipients' => array_slice($phones, 0, $perPage),
                'total_count' => count($phones),
                'per_page' => $perPage,
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * @return array<int, array{phone:string,name:string,first_name:string,last_name:string,username:string,registered_at:string}>
     */
    private function resolveRecipientRows(string $type, array $providedPhones = []): array
    {
        $normalizedProvidedPhones = collect($providedPhones)
            ->map(fn ($phone) => $this->normalizePhoneNumber((string) $phone))
            ->filter(fn (string $phone) => $phone !== '')
            ->unique()
            ->values();

        if ($normalizedProvidedPhones->isNotEmpty()) {
            $rows = Customer::query()
                ->whereNotNull('c_mobile')
                ->get(['c_mobile', 'c_fname', 'c_lname', 'c_username', 'c_date_started'])
                ->map(function (Customer $customer): array {
                    $phone = $this->normalizePhoneNumber((string) ($customer->c_mobile ?? ''));
                    $firstName = trim((string) ($customer->c_fname ?? ''));
                    $lastName = trim((string) ($customer->c_lname ?? ''));
                    $fullName = trim($firstName . ' ' . $lastName);
                    $username = trim((string) ($customer->c_username ?? ''));
                    $registeredAt = $customer->c_date_started ? Carbon::parse($customer->c_date_started)->toDateString() : '';

                    return [
                        'phone' => $phone,
                        'name' => $fullName !== '' ? $fullName : ($username !== '' ? $username : 'Customer'),
                        'first_name' => $firstName !== '' ? $firstName : 'Customer',
                        'last_name' => $lastName,
                        'username' => $username !== '' ? $username : 'member',
                        'registered_at' => $registeredAt,
                    ];
                })
                ->filter(fn (array $row) => in_array($row['phone'], $normalizedProvidedPhones->all(), true))
                ->values()
                ->all();

            if (!empty($rows)) {
                return $rows;
            }

            return $normalizedProvidedPhones
                ->map(function (string $phone): array {
                    return [
                        'phone' => $phone,
                        'name' => 'Customer',
                        'first_name' => 'Customer',
                        'last_name' => '',
                        'username' => 'member',
                        'registered_at' => '',
                    ];
                })
                ->all();
        }

        if ($type !== 'members') {
            $type = 'members';
        }

        return Customer::query()
            ->whereNotNull('c_mobile')
            ->where('c_mobile', '!=', '')
            ->get(['c_mobile', 'c_fname', 'c_lname', 'c_username', 'c_date_started'])
            ->map(function (Customer $customer): array {
                $phone = $this->normalizePhoneNumber((string) ($customer->c_mobile ?? ''));
                $firstName = trim((string) ($customer->c_fname ?? ''));
                $lastName = trim((string) ($customer->c_lname ?? ''));
                $fullName = trim($firstName . ' ' . $lastName);
                $username = trim((string) ($customer->c_username ?? ''));
                $registeredAt = $customer->c_date_started ? Carbon::parse($customer->c_date_started)->toDateString() : '';

                return [
                    'phone' => $phone,
                    'name' => $fullName !== '' ? $fullName : ($username !== '' ? $username : 'Customer'),
                    'first_name' => $firstName !== '' ? $firstName : 'Customer',
                    'last_name' => $lastName,
                    'username' => $username !== '' ? $username : 'member',
                    'registered_at' => $registeredAt,
                ];
            })
            ->filter(fn (array $row) => $row['phone'] !== '')
            ->unique('phone')
            ->values()
            ->all();
    }

    /**
     * @param array{phone:string,name:string,first_name:string,last_name:string,username:string,registered_at:string} $recipient
     * @return array<string,string>
     */
    private function buildPersonalizationVariables(array $recipient): array
    {
        $now = now();

        return [
            'customer_name' => (string) ($recipient['name'] ?? 'Customer'),
            'first_name' => (string) ($recipient['first_name'] ?? 'Customer'),
            'last_name' => (string) ($recipient['last_name'] ?? ''),
            'username' => (string) ($recipient['username'] ?? 'member'),
            'customer_email' => '',
            'email' => '',
            'store_name' => 'AF Home',
            'current_date' => $now->format('F j, Y'),
            'current_time' => $now->format('g:i A'),
            'current_year' => $now->format('Y'),
            'member_since' => (string) ($recipient['registered_at'] ?? ''),
            'support_email' => (string) config('mail.from.address', 'support@afhome.com'),
        ];
    }

    /**
     * @param array<string,string> $variables
     */
    private function applyTemplateVariables(string $content, array $variables): string
    {
        $result = $content;
        foreach ($variables as $key => $value) {
            $escapedKey = preg_quote((string) $key, '/');
            $result = (string) preg_replace(
                '/\{\{[\s\x{00A0}]*' . $escapedKey . '[\s\x{00A0}]*\}\}/iu',
                $value,
                $result
            );
        }

        return $result;
    }

    private function canSendSmsBlasts($actor): bool
    {
        $allowedLevels = [1, 2, 5];
        return in_array($actor->user_level_id, $allowedLevels);
    }

    private function getRecipientContacts(string $type): array
    {
        if ($type !== 'members') {
            $type = 'members';
        }

        return Customer::query()
            ->whereNotNull('c_mobile')
            ->where('c_mobile', '!=', '')
            ->get(['c_mobile', 'c_fname', 'c_lname', 'c_username'])
            ->map(function (Customer $customer): array {
                $phone = $this->normalizePhoneNumber((string) ($customer->c_mobile ?? ''));
                $firstName = trim((string) ($customer->c_fname ?? ''));
                $lastName = trim((string) ($customer->c_lname ?? ''));
                $fullName = trim($firstName . ' ' . $lastName);
                $username = trim((string) ($customer->c_username ?? ''));

                return [
                    'phone' => $phone,
                    'name' => $fullName !== '' ? $fullName : ($username !== '' ? $username : 'Customer'),
                ];
            })
            ->filter(fn (array $row) => $row['phone'] !== '')
            ->unique('phone')
            ->values()
            ->all();
    }

    private function normalizePhoneNumber(string $phoneNumber): string
    {
        $number = preg_replace('/[^0-9]/', '', $phoneNumber) ?? '';

        if ($number === '') {
            return '';
        }

        if (str_starts_with($number, '0')) {
            $number = '63' . substr($number, 1);
        } elseif (!str_starts_with($number, '63')) {
            $number = '63' . $number;
        }

        return $number;
    }

    private function resolveAdmin(Request $request): ?Admin
    {
        $user = $request->user();
        $userClass = $user ? get_class($user) : 'null';

        if (!$user || $userClass !== Admin::class) {
            return null;
        }

        return $user;
    }
}
