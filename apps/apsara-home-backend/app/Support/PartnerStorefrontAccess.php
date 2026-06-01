<?php

namespace App\Support;

use App\Models\Admin;
use App\Models\WebPageContent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

final class PartnerStorefrontAccess
{
    private ?array $storefrontSlugToId = null;

    private ?array $expiredStorefrontIds = null;

    public function normalizeStorefrontIds(mixed $storefrontIds): array
    {
        if (! is_array($storefrontIds)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($id) => is_numeric($id) ? (int) $id : null,
            $storefrontIds,
        ), static fn ($id) => is_int($id) && $id > 0)));
    }

    public function resolveActiveStorefrontIds(?Admin $admin): array
    {
        if (! $admin || (int) $admin->user_level_id !== 4) {
            return [];
        }

        $assignedIds = $this->normalizeStorefrontIds($admin->admin_permissions ?? []);
        if (empty($assignedIds)) {
            return [];
        }

        $disabledIds = $this->resolveDisabledStorefrontIds($admin);

        return array_values(array_diff($assignedIds, $disabledIds));
    }

    public function resolveDisabledStorefrontIds(?Admin $admin): array
    {
        if (! $admin || (int) $admin->user_level_id !== 4) {
            return [];
        }

        $assignedIds = $this->normalizeStorefrontIds($admin->admin_permissions ?? []);
        $storedDisabledIds = $this->normalizeStorefrontIds($admin->partner_disabled_storefront_ids ?? []);
        $expiredIds = $this->resolveExpiredStorefrontIds($assignedIds);

        return $this->normalizeStorefrontIds(array_merge($storedDisabledIds, $expiredIds));
    }

    public function mergeDisabledStorefrontIds(array $storedDisabledIds, ?array $assignedStorefrontIds = null): array
    {
        $assignedIds = is_array($assignedStorefrontIds)
            ? $this->normalizeStorefrontIds($assignedStorefrontIds)
            : null;

        $merged = array_merge(
            $this->normalizeStorefrontIds($storedDisabledIds),
            $this->resolveExpiredStorefrontIds($assignedIds),
        );

        if (is_array($assignedIds)) {
            $merged = array_values(array_intersect($this->normalizeStorefrontIds($merged), $assignedIds));
        }

        return $this->normalizeStorefrontIds($merged);
    }

    private function resolveExpiredStorefrontIds(?array $limitToStorefrontIds = null): array
    {
        $expiredIds = $this->expiredStorefrontIds ??= $this->computeExpiredStorefrontIds();

        if (! is_array($limitToStorefrontIds)) {
            return $expiredIds;
        }

        $limitToStorefrontIds = $this->normalizeStorefrontIds($limitToStorefrontIds);

        return array_values(array_intersect($expiredIds, $limitToStorefrontIds));
    }

    private function computeExpiredStorefrontIds(): array
    {
        $latestByStorefrontId = $this->computeLatestApprovedSubscriptionsByStorefrontId();
        if (empty($latestByStorefrontId)) {
            return [];
        }

        $now = Carbon::now('Asia/Manila');
        $expiredIds = [];

        foreach ($latestByStorefrontId as $storefrontId => $subscription) {
            $endDate = $subscription['end_date'] ?? null;
            if (! $endDate instanceof Carbon) {
                continue;
            }

            if ($now->greaterThan($endDate->copy()->endOfDay())) {
                $expiredIds[] = (int) $storefrontId;
            }
        }

        return $this->normalizeStorefrontIds($expiredIds);
    }

    private function computeLatestApprovedSubscriptionsByStorefrontId(): array
    {
        $storefrontSlugMap = $this->resolveStorefrontSlugMap();
        if (empty($storefrontSlugMap)) {
            return [];
        }

        $subject = mb_strtolower('Partner Webstore Request', 'UTF-8');
        $tickets = DB::table('tbl_tickets')
            ->where(function ($query) use ($subject) {
                $query
                    ->whereRaw('LOWER(TRIM(t_subject)) = ?', [$subject])
                    ->orWhereRaw('LOWER(TRIM(t_subject)) = ?', ['webstore request'])
                    ->orWhereRaw('LOWER(TRIM(t_subject)) = ?', ['partner webstore request']);
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

            $requestDetails = DB::table('tbl_tickets_details')
                ->where('t_id', $ticketId)
                ->where('td_replystat', 0)
                ->orderBy('td_datetime')
                ->orderBy('td_id')
                ->get();

            $payloads = [];
            foreach ($requestDetails as $detail) {
                $payload = $this->decodeWebstorePayload($detail->td_content ?? null);
                if (is_array($payload) && ! empty($payload)) {
                    $payloads[] = $payload;
                }
            }

            if (empty($payloads)) {
                continue;
            }

            $initialPayload = $payloads[0];
            $normalizedSlug = $this->normalizeStorefrontSlug((string) ($initialPayload['slug_name'] ?? ''));
            if ($normalizedSlug === '') {
                continue;
            }

            $storefrontId = $storefrontSlugMap[$normalizedSlug] ?? null;
            if (! is_int($storefrontId) || $storefrontId <= 0) {
                continue;
            }

            $approvedAt = $approval['approved_at'];
            if (! $approvedAt instanceof Carbon) {
                continue;
            }

            $billingOption = strtolower(trim((string) ($initialPayload['billing_option'] ?? '')));
            $plan = strtolower(trim((string) ($initialPayload['plan'] ?? '')));
            $planTerm = (string) ($initialPayload['plan_term'] ?? '');
            $planTermMonths = $this->resolvePlanTermMonths($initialPayload);
            $endDate = $this->computeEndDate(
                approvedAt: $approvedAt,
                billingOption: $billingOption,
                plan: $plan,
                planTermMonths: $planTermMonths,
                planTerm: $planTerm,
                payloads: $payloads,
            );

            if (! $endDate instanceof Carbon) {
                continue;
            }

            $current = $latestByStorefrontId[$storefrontId] ?? null;
            if (! is_array($current) || ! ($current['approved_at'] instanceof Carbon) || $approvedAt->greaterThan($current['approved_at'])) {
                $latestByStorefrontId[$storefrontId] = [
                    'approved_at' => $approvedAt,
                    'end_date' => $endDate,
                ];
            }
        }

        return $latestByStorefrontId;
    }

    private function computeEndDate(Carbon $approvedAt, string $billingOption, string $plan, int $planTermMonths, string $planTerm, array $payloads): ?Carbon
    {
        $billingOption = strtolower(trim($billingOption));
        $plan = strtolower(trim($plan));

        if ($billingOption === 'monthly') {
            $continuationCount = 0;
            foreach ($payloads as $payload) {
                $type = strtolower(trim((string) ($payload['type'] ?? '')));
                if ($type !== 'webstore_payment_continuation') {
                    continue;
                }

                if ($this->isApprovedReceiptPayload($payload)) {
                    $continuationCount++;
                }
            }

            $monthsPaid = 1 + $continuationCount;

            return $approvedAt->copy()->addMonthsNoOverflow($monthsPaid);
        }

        if ($planTermMonths <= 0) {
            $planTermDays = $this->resolvePlanTermDays($planTerm, $plan);
            if ($planTermDays <= 0) {
                return null;
            }

            return $approvedAt->copy()->addDays($planTermDays);
        }

        return $approvedAt->copy()->addMonthsNoOverflow($planTermMonths);
    }

    private function resolveTicketApproval(int $ticketId): array
    {
        $decisionRows = DB::table('tbl_tickets_details')
            ->where('t_id', $ticketId)
            ->whereIn('td_replystat', [1, 2])
            ->orderByDesc('td_id')
            ->get();

        foreach ($decisionRows as $row) {
            $payload = $this->decodeWebstorePayload($row->td_content ?? null);
            if (($payload['type'] ?? '') !== 'webstore_request_decision') {
                continue;
            }

            if (strtolower(trim((string) ($payload['decision'] ?? ''))) !== 'approved') {
                return [
                    'approved' => false,
                    'approved_at' => null,
                ];
            }

            $approvedAtRaw = trim((string) ($payload['reviewed_at'] ?? '')) ?: (string) ($row->td_datetime ?? '');
            $approvedAt = $approvedAtRaw !== ''
                ? Carbon::parse($approvedAtRaw, 'Asia/Manila')
                : Carbon::now('Asia/Manila');

            return [
                'approved' => true,
                'approved_at' => $approvedAt,
            ];
        }

        return [
            'approved' => false,
            'approved_at' => null,
        ];
    }

    private function resolvePlanTermMonths(array $payload): int
    {
        $termMonths = (int) ($payload['plan_term_months'] ?? 0);
        if ($termMonths > 0) {
            return $termMonths;
        }

        $plan = strtolower(trim((string) ($payload['plan'] ?? '')));
        return match ($plan) {
            'quarterly' => 3,
            'semi_annual', 'semi-annual' => 6,
            'annual' => 12,
            default => 0,
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

    private function isApprovedReceiptPayload(array $payload): bool
    {
        $status = strtolower(trim((string) ($payload['approval_status'] ?? '')));
        return $status === 'approved' || ($status === '' && ! empty($payload['approved_at']));
    }

    private function resolveStorefrontSlugMap(): array
    {
        if (is_array($this->storefrontSlugToId)) {
            return $this->storefrontSlugToId;
        }

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

            $keys = [
                strtolower(trim((string) ($storefront->wpc_key ?? ''))),
                strtolower(trim((string) data_get($storefront->wpc_payload, 'fields.slug', ''))),
            ];

            foreach ($keys as $slug) {
                if ($slug === '' || isset($map[$slug])) {
                    continue;
                }

                $map[$slug] = $id;
            }
        }

        return $this->storefrontSlugToId = $map;
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

    private function decodeWebstorePayload(?string $content): array
    {
        if (! is_string($content) || trim($content) === '') {
            return [];
        }

        $decoded = json_decode($content, true);
        return is_array($decoded) ? $decoded : [];
    }
}
