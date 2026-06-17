<?php

namespace App\Console\Commands;

use App\Mail\Webstore\WebstoreExpiryReminderMail;
use App\Models\Customer;
use App\Models\WebPageContent;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendWebstoreExpiryReminders extends Command
{
    protected $signature = 'webstore:send-expiry-reminders';
    protected $description = 'Send daily email reminders for webstore subscriptions expiring in 1–3 days';

    public function handle(): int
    {
        $now = Carbon::now('Asia/Manila');
        $subscriptions = $this->resolveSubscriptionsWithEndDates();
        $sent = 0;

        foreach ($subscriptions as $sub) {
            $endDate = $sub['end_date'];
            $daysLeft = (int) $now->copy()->startOfDay()->diffInDays($endDate->copy()->startOfDay(), false);

            if ($daysLeft < 1 || $daysLeft > 3) {
                continue;
            }

            $email = trim((string) ($sub['recipient_email'] ?? ''));
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            try {
                Mail::to($email)->send(new WebstoreExpiryReminderMail([
                    'admin_name'      => $sub['admin_name'],
                    'storefront_name' => $sub['display_name'],
                    'plan'            => $sub['plan'],
                    'billing_option'  => $sub['billing_option'],
                    'end_date_label'  => $endDate->format('F j, Y'),
                    'days_left'       => $daysLeft,
                ]));
                $sent++;
            } catch (\Throwable $e) {
                Log::error('Webstore expiry reminder email failed', [
                    'email'         => $email,
                    'storefront_id' => $sub['storefront_id'],
                    'days_left'     => $daysLeft,
                    'error'         => $e->getMessage(),
                ]);
            }
        }

        Log::info('Webstore expiry reminders sent', ['count' => $sent, 'run_at' => $now->toIso8601String()]);
        $this->info("Sent {$sent} webstore expiry reminder(s).");

        return self::SUCCESS;
    }

    private function resolveSubscriptionsWithEndDates(): array
    {
        $slugMap = $this->resolveStorefrontSlugMap();
        if (empty($slugMap)) {
            return [];
        }

        $tickets = DB::table('tbl_tickets')
            ->where(function ($q) {
                $q->whereRaw("LOWER(TRIM(t_subject)) = 'partner webstore request'")
                    ->orWhereRaw("LOWER(TRIM(t_subject)) = 'webstore request'");
            })
            ->orderByDesc('t_id')
            ->get();

        $latestByStorefrontId = [];

        foreach ($tickets as $ticket) {
            $ticketId = (int) ($ticket->t_id ?? 0);
            if ($ticketId <= 0) {
                continue;
            }

            $approval = $this->resolveTicketApproval($ticketId);
            if (! $approval['approved']) {
                continue;
            }

            $initialDetails = DB::table('tbl_tickets_details')
                ->where('t_id', $ticketId)
                ->where('td_replystat', 0)
                ->orderBy('td_datetime')
                ->orderBy('td_id')
                ->get();

            if ($initialDetails->isEmpty()) {
                continue;
            }

            $payloads = [];
            foreach ($initialDetails as $detail) {
                $p = $this->decodePayload($detail->td_content ?? null);
                if (! empty($p)) {
                    $payloads[] = $p;
                }
            }

            // Also collect approved continuation receipts from reply rows
            $replyDetails = DB::table('tbl_tickets_details')
                ->where('t_id', $ticketId)
                ->whereIn('td_replystat', [1, 2])
                ->orderBy('td_datetime')
                ->orderBy('td_id')
                ->get();

            foreach ($replyDetails as $detail) {
                $p = $this->decodePayload($detail->td_content ?? null);
                if (! empty($p) && strtolower(trim((string) ($p['type'] ?? ''))) === 'webstore_payment_continuation') {
                    $payloads[] = $p;
                }
            }

            if (empty($payloads)) {
                continue;
            }

            $initialPayload = $payloads[0];
            $slug = $this->normalizeSlug((string) ($initialPayload['slug_name'] ?? ''));
            if ($slug === '') {
                continue;
            }

            $storefrontId = $slugMap[$slug] ?? null;
            if (! is_int($storefrontId) || $storefrontId <= 0) {
                continue;
            }

            $approvedAt = $approval['approved_at'];
            $billingOption = strtolower(trim((string) ($initialPayload['billing_option'] ?? '')));
            $plan = strtolower(trim((string) ($initialPayload['plan'] ?? '')));
            $planTerm = (string) ($initialPayload['plan_term'] ?? '');
            $planTermMonths = $this->resolvePlanTermMonths($initialPayload);

            $endDate = $this->computeEndDate($approvedAt, $billingOption, $plan, $planTermMonths, $planTerm, $payloads);
            if (! $endDate instanceof Carbon) {
                continue;
            }

            $current = $latestByStorefrontId[$storefrontId] ?? null;
            if (! is_array($current) || ! ($current['approved_at'] instanceof Carbon) || $approvedAt->greaterThan($current['approved_at'])) {
                $memberId = (int) ($ticket->t_eid ?? 0);
                $latestByStorefrontId[$storefrontId] = [
                    'storefront_id'  => $storefrontId,
                    'approved_at'    => $approvedAt,
                    'end_date'       => $endDate,
                    'admin_id'       => (int) ($initialDetails->first()->td_eid ?? 0),
                    'member_id'      => $memberId,
                    'display_name'   => trim((string) ($initialPayload['display_name'] ?? $slug)),
                    'plan'           => $plan,
                    'billing_option' => $billingOption,
                    'recipient_email'=> trim((string) ($initialPayload['email'] ?? '')),
                ];
            }
        }

        if (empty($latestByStorefrontId)) {
            return [];
        }

        $memberIds = array_unique(array_filter(array_column($latestByStorefrontId, 'member_id')));
        $admins = collect();
        $members = collect();
        $adminIds = array_unique(array_filter(array_column($latestByStorefrontId, 'admin_id')));
        if (! empty($adminIds)) {
            $admins = DB::table('tbl_admin')
                ->whereIn('id', $adminIds)
                ->get(['id', 'user_email', 'fname'])
                ->keyBy('id');
        }

        if (! empty($memberIds)) {
            $members = Customer::query()
                ->whereIn('c_userid', $memberIds)
                ->get(['c_userid', 'c_email', 'c_fname', 'c_username'])
                ->keyBy('c_userid');
        }

        return array_values(array_map(function (array $sub) use ($admins, $members) {
            $admin = $admins->get($sub['admin_id']);
            $member = $members->get($sub['member_id']);
            $recipientEmail = trim((string) ($sub['recipient_email'] ?? ''));
            if ($recipientEmail === '') {
                $recipientEmail = trim((string) ($member->c_email ?? ''));
            }

            return array_merge($sub, [
                'recipient_email' => $recipientEmail,
                'admin_email' => (string) ($admin->user_email ?? ''),
                'member_email' => (string) ($member->c_email ?? ''),
                'admin_name'  => (string) ($admin->fname ?? 'Partner'),
            ]);
        }, $latestByStorefrontId));
    }

    private function resolveTicketApproval(int $ticketId): array
    {
        $rows = DB::table('tbl_tickets_details')
            ->where('t_id', $ticketId)
            ->whereIn('td_replystat', [1, 2])
            ->orderByDesc('td_id')
            ->get();

        foreach ($rows as $row) {
            $payload = $this->decodePayload($row->td_content ?? null);
            if (($payload['type'] ?? '') !== 'webstore_request_decision') {
                continue;
            }
            if (strtolower(trim((string) ($payload['decision'] ?? ''))) !== 'approved') {
                return ['approved' => false, 'approved_at' => null];
            }
            $raw = trim((string) ($payload['reviewed_at'] ?? '')) ?: (string) ($row->td_datetime ?? '');
            $approvedAt = $raw !== '' ? Carbon::parse($raw, 'Asia/Manila') : Carbon::now('Asia/Manila');

            return ['approved' => true, 'approved_at' => $approvedAt];
        }

        return ['approved' => false, 'approved_at' => null];
    }

    private function computeEndDate(Carbon $approvedAt, string $billingOption, string $plan, int $planTermMonths, string $planTerm, array $payloads): ?Carbon
    {
        if ($billingOption === 'monthly') {
            $continuationCount = 0;
            foreach ($payloads as $payload) {
                if (strtolower(trim((string) ($payload['type'] ?? ''))) === 'webstore_payment_continuation'
                    && $this->isApprovedPayload($payload)) {
                    $continuationCount++;
                }
            }

            return $approvedAt->copy()->addMonthsNoOverflow(1 + $continuationCount);
        }

        $latestReceiptAt = null;
        foreach ($payloads as $payload) {
            if (strtolower(trim((string) ($payload['type'] ?? ''))) !== 'webstore_payment_continuation') {
                continue;
            }
            if (! $this->isApprovedPayload($payload)) {
                continue;
            }
            $raw = trim((string) ($payload['approved_at'] ?? ''));
            if ($raw === '') {
                continue;
            }
            $receiptAt = Carbon::parse($raw, 'Asia/Manila');
            if ($latestReceiptAt === null || $receiptAt->greaterThan($latestReceiptAt)) {
                $latestReceiptAt = $receiptAt;
            }
        }

        if ($planTermMonths <= 0) {
            $days = $this->resolvePlanTermDays($planTerm, $plan);
            if ($days <= 0) {
                return null;
            }
            $initialEnd = $approvedAt->copy()->addDays($days);
            if ($latestReceiptAt !== null) {
                $renewalEnd = $latestReceiptAt->copy()->addDays($days);
                if ($renewalEnd->greaterThan($initialEnd)) {
                    return $renewalEnd;
                }
            }

            return $initialEnd;
        }

        $initialEnd = $approvedAt->copy()->addMonthsNoOverflow($planTermMonths);
        if ($latestReceiptAt !== null) {
            $renewalEnd = $latestReceiptAt->copy()->addMonthsNoOverflow($planTermMonths);
            if ($renewalEnd->greaterThan($initialEnd)) {
                return $renewalEnd;
            }
        }

        return $initialEnd;
    }

    private function resolvePlanTermMonths(array $payload): int
    {
        $months = (int) ($payload['plan_term_months'] ?? 0);
        if ($months > 0) {
            return $months;
        }

        return match (strtolower(trim((string) ($payload['plan'] ?? '')))) {
            'quarterly'                  => 3,
            'semi_annual', 'semi-annual' => 6,
            'annual'                     => 12,
            default                      => 0,
        };
    }

    private function resolvePlanTermDays(string $planTerm, string $plan = ''): int
    {
        $normalized = strtolower(trim($planTerm));
        if ($normalized === '') {
            return $plan === 'test' ? 2 : 0;
        }
        if (preg_match('/(\d+)\s*day/', $normalized, $matches)) {
            return max(0, (int) $matches[1]);
        }

        return $plan === 'test' ? 2 : 0;
    }

    private function isApprovedPayload(array $payload): bool
    {
        $status = strtolower(trim((string) ($payload['approval_status'] ?? '')));

        return $status === 'approved' || ($status === '' && ! empty($payload['approved_at']));
    }

    private function resolveStorefrontSlugMap(): array
    {
        $map = [];
        $storefronts = WebPageContent::query()
            ->whereIn('wpc_type', ['partner-storefront', 'partner-storefronts'])
            ->orderByDesc('wpc_status')
            ->orderByDesc('wpc_id')
            ->get();

        foreach ($storefronts as $storefront) {
            $id = (int) ($storefront->wpc_id ?? 0);
            if ($id <= 0) {
                continue;
            }
            foreach ([
                strtolower(trim((string) ($storefront->wpc_key ?? ''))),
                strtolower(trim((string) data_get($storefront->wpc_payload, 'fields.slug', ''))),
            ] as $slug) {
                if ($slug !== '' && ! isset($map[$slug])) {
                    $map[$slug] = $id;
                }
            }
        }

        return $map;
    }

    private function normalizeSlug(string $value): string
    {
        $slug = mb_strtolower(trim($value), 'UTF-8');
        if ($slug === '') {
            return '';
        }
        $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug) ?? '';

        return trim($slug, '-');
    }

    private function decodePayload(?string $content): array
    {
        if (! is_string($content) || trim($content) === '') {
            return [];
        }
        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }
}
