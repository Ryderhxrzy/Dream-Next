<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\AdminNotification;
use App\Models\Customer;
use App\Models\CustomerNotification;
use App\Models\WebPageContent;
use App\Mail\Webstore\WebstoreReceiptMail;
use App\Support\PartnerStorefrontAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminInquiryController extends Controller
{
    public function webstoreRequests(Request $request)
    {
        return response()->json([
            'requests' => $this->buildWebstoreRequestRows(),
        ]);
    }

    public function partnerWebstoreRequests(Request $request)
    {
        $admin = $request->user();
        $allowedStorefrontSlugs = $this->resolvePartnerStorefrontSlugs($admin instanceof Admin ? $admin : null);

        if (empty($allowedStorefrontSlugs)) {
            return response()->json(['requests' => []]);
        }

        return response()->json([
            'requests' => $this->buildWebstoreRequestRows($allowedStorefrontSlugs),
        ]);
    }

    private function buildWebstoreRequestRows(array $allowedStorefrontSlugs = []): array
    {
        $subject = mb_strtolower($this->webstoreRequestTicketSubject(), 'UTF-8');
        $tickets = DB::table('tbl_tickets')
            ->where(function ($query) use ($subject) {
                $query
                    ->whereRaw('LOWER(TRIM(t_subject)) = ?', [$subject])
                    ->orWhereRaw('LOWER(TRIM(t_subject)) = ?', ['webstore request'])
                    ->orWhereRaw('LOWER(TRIM(t_subject)) = ?', ['partner webstore request']);
            })
            ->orderByDesc('t_id')
            ->get();

        $rows = $tickets->map(function ($ticket): array {
            $customer = Customer::query()->where('c_userid', (int) $ticket->t_eid)->first();
            $customerName = $customer instanceof Customer ? $this->fullName($customer) : null;

            $requestDetails = DB::table('tbl_tickets_details')
                ->where('t_id', (int) $ticket->t_id)
                ->where('td_replystat', 0)
                ->orderBy('td_datetime')
                ->orderBy('td_id')
                ->get();

            $payload = [];
            $latestPayload = [];
            $activePayload = [];
            foreach ($requestDetails as $detail) {
                $rowPayload = $this->decodeWebstorePayload($detail->td_content ?? null);
                if (!is_array($rowPayload) || empty($rowPayload)) {
                    continue;
                }
                if (empty($payload)) {
                    $payload = $rowPayload;
                }
                $latestPayload = $rowPayload;

                $rowType = strtolower(trim((string) ($rowPayload['type'] ?? '')));
                $rowApprovalStatus = strtolower(trim((string) ($rowPayload['approval_status'] ?? '')));
                $rowApproved = $rowApprovalStatus === 'approved' || ($rowApprovalStatus === '' && ! empty($rowPayload['approved_at']));
                if (empty($activePayload)) {
                    $activePayload = $rowPayload;
                } elseif ($rowType === 'webstore_payment_continuation' && $rowApproved) {
                    $activePayload = $rowPayload;
                }
            }
            if (empty($activePayload)) {
                $activePayload = $payload;
            }
            $slugName = (string) ($payload['slug_name'] ?? '');
            if (! empty($allowedStorefrontSlugs)) {
                $normalizedSlug = mb_strtolower(trim($slugName), 'UTF-8');
                if (! in_array($normalizedSlug, $allowedStorefrontSlugs, true)) {
                    return null;
                }
            }
            $approvedAt = $this->webstoreApprovedAt((int) $ticket->t_id);
            $receiptItems = $this->collectWebstoreReceiptItems((int) $ticket->t_id);
            $subscriptionProgress = $this->calculateWebstoreSubscriptionProgress((int) $ticket->t_id);

            return [
                'id' => (int) $ticket->t_id,
                'ticket_id' => (int) $ticket->t_id,
                'customer_id' => (int) ($ticket->t_eid ?? 0),
                'customer_name' => $customerName,
                'customer_email' => $customer instanceof Customer ? (string) ($customer->c_email ?? '') : null,
                'full_name' => (string) ($payload['full_name'] ?? ''),
                'username' => (string) ($payload['username'] ?? ''),
                'email' => (string) ($payload['email'] ?? ''),
                'slug_name' => $slugName,
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
                'receipt_items' => $receiptItems,
                'remaining_balance' => (int) ($subscriptionProgress['remaining_balance'] ?? 0),
                'payment_count' => (int) ($subscriptionProgress['payment_count'] ?? 0),
                'total_paid_amount' => (int) ($subscriptionProgress['total_paid_amount'] ?? 0),
                'status' => $this->mapWebstoreRequestStatus((int) $ticket->t_status, (int) $ticket->t_id, $slugName),
                'submitted_at' => $ticket->t_date ? (string) $ticket->t_date : null,
                'approved_at' => $approvedAt,
            ];
        })->values();

        return $rows->filter()->values()->all();
    }

    private function resolvePartnerStorefrontSlugs(?Admin $admin): array
    {
        if (! $admin) {
            return [];
        }

        $access = new PartnerStorefrontAccess();
        // Use all assigned IDs (including expired) so partners can always
        // view their subscription history, even after expiry.
        $storefrontIds = $access->normalizeStorefrontIds($admin->admin_permissions ?? []);
        if (empty($storefrontIds)) {
            return [];
        }

        $storefronts = WebPageContent::query()
            ->whereIn('wpc_id', $storefrontIds)
            ->whereIn('wpc_type', ['partner-storefront', 'partner-storefronts'])
            ->get();

        $slugs = [];
        foreach ($storefronts as $storefront) {
            $keys = [
                strtolower(trim((string) ($storefront->wpc_key ?? ''))),
                strtolower(trim((string) data_get($storefront->wpc_payload, 'fields.slug', ''))),
            ];

            foreach ($keys as $slug) {
                if ($slug === '') {
                    continue;
                }
                $slugs[] = $slug;
            }
        }

        return array_values(array_unique(array_filter($slugs)));
    }

    public function usernameChangeRequests(Request $request)
    {
        $tickets = DB::table('tbl_tickets')
            ->where('t_subject', $this->usernameChangeTicketSubject())
            ->orderByDesc('t_id')
            ->get();

        $rows = $tickets->map(function ($ticket): array {
            $customer = Customer::query()->where('c_userid', (int) $ticket->t_eid)->first();
            $customerName = $customer instanceof Customer ? $this->fullName($customer) : null;

            $requestDetail = DB::table('tbl_tickets_details')
                ->where('t_id', (int) $ticket->t_id)
                ->where('td_replystat', 0)
                ->orderBy('td_id')
                ->first();
            $payload = $this->decodeUsernameChangePayload($requestDetail?->td_content ?? null);

            return [
                'id' => (int) $ticket->t_id,
                'ticket_id' => (int) $ticket->t_id,
                'customer_id' => (int) ($ticket->t_eid ?? 0),
                'customer_name' => $customerName,
                'customer_email' => $customer instanceof Customer ? (string) ($customer->c_email ?? '') : null,
                'current_username' => (string) ($payload['current_username'] ?? ''),
                'requested_username' => (string) ($payload['requested_username'] ?? ''),
                'status' => $this->mapUsernameChangeStatus((int) $ticket->t_status, (int) $ticket->t_id),
                'submitted_at' => $ticket->t_date ? (string) $ticket->t_date : null,
            ];
        })->values();

        return response()->json(['requests' => $rows]);
    }

    public function approveUsernameChange(Request $request, int $id)
    {
        $admin = $request->user();

        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Username change request not found.'], 404);
        }

        if ((int) $ticket->t_status !== 1) {
            return response()->json(['message' => 'This request is no longer pending.'], 422);
        }

        $customer = Customer::query()->where('c_userid', (int) $ticket->t_eid)->first();
        if (! $customer) {
            return response()->json(['message' => 'Customer account not found.'], 404);
        }

        $requestDetail = DB::table('tbl_tickets_details')
            ->where('t_id', (int) $ticket->t_id)
            ->where('td_replystat', 0)
            ->orderBy('td_id')
            ->first();
        $payload = $this->decodeUsernameChangePayload($requestDetail?->td_content ?? null);
        $requestedUsername = trim((string) ($payload['requested_username'] ?? ''));
        if ($requestedUsername === '') {
            return response()->json(['message' => 'Requested username is invalid.'], 422);
        }

        $duplicate = Customer::query()
            ->whereRaw('LOWER(c_username) = ?', [mb_strtolower($requestedUsername, 'UTF-8')])
            ->where('c_userid', '!=', (int) $customer->c_userid)
            ->exists();
        if ($duplicate) {
            return response()->json(['message' => 'This username is already taken.'], 422);
        }

        $customer->c_username = $requestedUsername;
        $customer->save();

        $reviewedAt = now('Asia/Manila');

        DB::table('tbl_tickets')->where('t_id', (int) $ticket->t_id)->update([
            't_status' => 2,
            't_view_status' => 2,
        ]);

        $decisionPayload = [
            'type' => 'username_change_decision',
            'decision' => 'approved',
            'reviewed_by' => $admin instanceof Admin ? (int) $admin->id : null,
            'reviewed_at' => $reviewedAt->toDateTimeString(),
        ];

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticket->t_id,
            'td_content' => json_encode($decisionPayload, JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => now(),
            'td_rate' => 0,
            'td_eid' => $admin instanceof Admin ? (int) $admin->id : 0,
            'td_replystat' => 1,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        CustomerNotification::query()->create([
            'cn_customer_id' => (int) $customer->c_userid,
            'cn_type' => 'username_change',
            'cn_severity' => 'success',
            'cn_title' => 'Username Change Request',
            'cn_message' => sprintf(
                'Your username request has been approved by admin (%s).',
                $reviewedAt->format('F j, Y g:i A')
            ),
            'cn_href' => '/profile?tab=change-username',
            'cn_payload' => [
                'ticket_id' => (int) $ticket->t_id,
                'requested_username' => $requestedUsername,
                'approved_at' => $reviewedAt->toDateTimeString(),
            ],
            'cn_source_type' => 'username_change_request',
            'cn_source_id' => (int) $ticket->t_id,
            'cn_created_at' => $reviewedAt,
        ]);

        return response()->json(['message' => 'Username change approved.']);
    }

    public function rejectUsernameChange(Request $request, int $id)
    {
        $admin = $request->user();

        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Username change request not found.'], 404);
        }

        if ((int) $ticket->t_status !== 1) {
            return response()->json(['message' => 'This request is no longer pending.'], 422);
        }

        DB::table('tbl_tickets')->where('t_id', (int) $ticket->t_id)->update([
            't_status' => 2,
            't_view_status' => 2,
        ]);

        $decisionPayload = [
            'type' => 'username_change_decision',
            'decision' => 'rejected',
            'reviewed_by' => $admin instanceof Admin ? (int) $admin->id : null,
            'reviewed_at' => now()->toDateTimeString(),
        ];

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticket->t_id,
            'td_content' => json_encode($decisionPayload, JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => now(),
            'td_rate' => 0,
            'td_eid' => $admin instanceof Admin ? (int) $admin->id : 0,
            'td_replystat' => 2,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        return response()->json(['message' => 'Username change rejected.']);
    }

    public function approveWebstoreRequest(Request $request, int $id)
    {
        $admin = $request->user();

        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Webstore request not found.'], 404);
        }

        if ((int) $ticket->t_status !== 1) {
            return response()->json(['message' => 'This request is no longer pending.'], 422);
        }

        DB::table('tbl_tickets')->where('t_id', (int) $ticket->t_id)->update([
            't_status' => 2,
            't_view_status' => 2,
        ]);

        $reviewedAt = now('Asia/Manila');

        $decisionPayload = [
            'type' => 'webstore_request_decision',
            'decision' => 'approved',
            'reviewed_by' => $admin instanceof Admin ? (int) $admin->id : null,
            'reviewed_at' => $reviewedAt->toDateTimeString(),
        ];

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticket->t_id,
            'td_content' => json_encode($decisionPayload, JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => now(),
            'td_rate' => 0,
            'td_eid' => $admin instanceof Admin ? (int) $admin->id : 0,
            'td_replystat' => 1,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        $requestDetail = DB::table('tbl_tickets_details')
            ->where('t_id', (int) $ticket->t_id)
            ->where('td_replystat', 0)
            ->orderBy('td_id')
            ->first();
        $payload = $this->decodeWebstorePayload($requestDetail?->td_content ?? null);
        $displayName = trim((string) ($payload['display_name'] ?? ''));
        $slugName = trim((string) ($payload['slug_name'] ?? ''));

        $storefront = $this->createOrUpdatePartnerStorefrontFromRequest($displayName, $slugName, $payload);
        $recipientEmail = trim((string) ($payload['email'] ?? ''));
        if ($recipientEmail === '') {
            $customer = Customer::query()->where('c_userid', (int) ($ticket->t_eid ?? 0))->first();
            $recipientEmail = trim((string) ($customer?->c_email ?? ''));
        }

        if ($recipientEmail !== '' && filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $frontendUrl = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
            $partnerLoginUrl = $frontendUrl . '/partner/login';
            $emailSubject = 'Partner Webstore Request Approved';
            $emailBody = implode("\n", [
                'Hello,',
                '',
                'Great news. Your Partner Webstore request has been approved.',
                '',
                $displayName !== '' ? "Display Name: {$displayName}" : null,
                $slugName !== '' ? "Slug: {$slugName}" : null,
                '',
                "Partner Login Link: {$partnerLoginUrl}",
                '',
                'Please use this link to access your partner portal.',
                '',
                'AF Home Team',
            ]);

            try {
                Mail::mailer('resend')->raw(
                    preg_replace("/\n{3,}/", "\n\n", (string) $emailBody),
                    function ($message) use ($recipientEmail, $emailSubject): void {
                        $message->to($recipientEmail)->subject($emailSubject);
                    }
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to send approved webstore partner login email.', [
                    'ticket_id' => (int) $ticket->t_id,
                    'email' => $recipientEmail,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        CustomerNotification::query()->create([
            'cn_customer_id' => (int) ($ticket->t_eid ?? 0),
            'cn_type' => 'webstore_request',
            'cn_severity' => 'success',
            'cn_title' => 'Webstore Request',
            'cn_message' => sprintf(
                'Your webstore request has been approved by admin (%s).',
                $reviewedAt->format('F j, Y g:i A')
            ),
            'cn_href' => '/profile?tab=webstore',
            'cn_payload' => [
                'ticket_id' => (int) $ticket->t_id,
                'storefront_id' => $storefront ? (int) $storefront->wpc_id : null,
                'storefront_slug' => $slugName,
                'storefront_display_name' => $displayName,
                'approved_at' => $reviewedAt->toDateTimeString(),
            ],
            'cn_source_type' => 'webstore_request',
            'cn_source_id' => (int) $ticket->t_id,
            'cn_created_at' => $reviewedAt,
        ]);

        return response()->json(['message' => 'Webstore request approved.']);
    }

    public function approveWebstoreReceipt(Request $request, int $id, int $detailId)
    {
        $admin = $request->user();

        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Webstore request not found.'], 404);
        }

        if ($this->mapTicketDecisionStatus((int) $ticket->t_status, (int) $ticket->t_id) !== 'approved') {
            return response()->json(['message' => 'Only approved webstore requests can approve receipts.'], 422);
        }

        $detail = DB::table('tbl_tickets_details')
            ->where('td_id', $detailId)
            ->where('t_id', (int) $ticket->t_id)
            ->where('td_replystat', 0)
            ->first();

        if (! $detail) {
            return response()->json(['message' => 'Receipt entry not found.'], 404);
        }

        $payload = $this->decodeWebstorePayload($detail->td_content ?? null);
        if (! is_array($payload) || empty($payload)) {
            return response()->json(['message' => 'Receipt payload is invalid.'], 422);
        }

        $type = strtolower(trim((string) ($payload['type'] ?? '')));
        if ($type !== 'webstore_payment_continuation') {
            return response()->json(['message' => 'Only continuation receipts can be approved here.'], 422);
        }

        if (! empty($payload['approved_at']) || strtolower(trim((string) ($payload['approval_status'] ?? ''))) === 'approved') {
            return response()->json(['message' => 'This receipt is already approved.'], 422);
        }

        $approvedAt = now('Asia/Manila');
        $approvedPayload = array_merge($payload, [
            'approval_status' => 'approved',
            'approved_at' => $approvedAt->toDateTimeString(),
            'approved_by' => $admin instanceof Admin ? (int) $admin->id : 0,
        ]);

        DB::table('tbl_tickets_details')
            ->where('td_id', (int) $detailId)
            ->update([
                'td_content' => json_encode($approvedPayload, JSON_THROW_ON_ERROR),
            ]);

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticket->t_id,
            'td_content' => json_encode([
                'type' => 'webstore_receipt_decision',
                'decision' => 'approved',
                'receipt_detail_id' => (int) $detailId,
                'reviewed_by' => $admin instanceof Admin ? (int) $admin->id : null,
                'reviewed_at' => $approvedAt->toDateTimeString(),
            ], JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => $approvedAt,
            'td_rate' => 0,
            'td_eid' => $admin instanceof Admin ? (int) $admin->id : 0,
            'td_replystat' => 1,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        $customer = Customer::query()->where('c_userid', (int) $ticket->t_eid)->first();
        if ($customer instanceof Customer) {
            CustomerNotification::query()->create([
                'cn_customer_id' => (int) $customer->c_userid,
                'cn_type' => 'webstore_request',
                'cn_severity' => 'success',
                'cn_title' => 'Webstore Receipt Approved',
                'cn_message' => sprintf(
                    'Your webstore receipt #%d has been approved by admin (%s).',
                    (int) $detailId,
                    $approvedAt->format('F j, Y g:i A')
                ),
                'cn_href' => '/profile?tab=webstore',
                'cn_payload' => [
                    'ticket_id' => (int) $ticket->t_id,
                    'receipt_detail_id' => (int) $detailId,
                    'approved_at' => $approvedAt->toDateTimeString(),
                ],
                'cn_source_type' => 'webstore_receipt',
                'cn_source_id' => (int) $detailId,
                'cn_created_at' => $approvedAt,
            ]);

            $this->sendWebstoreReceiptEmail($customer, (int) $ticket->t_id);
        }

        return response()->json(['message' => 'Webstore receipt approved successfully.']);
    }

    public function rejectWebstoreReceipt(Request $request, int $id, int $detailId)
    {
        $admin = $request->user();

        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Webstore request not found.'], 404);
        }

        if ($this->mapTicketDecisionStatus((int) $ticket->t_status, (int) $ticket->t_id) !== 'approved') {
            return response()->json(['message' => 'Only approved webstore requests can reject receipts.'], 422);
        }

        $detail = DB::table('tbl_tickets_details')
            ->where('td_id', $detailId)
            ->where('t_id', (int) $ticket->t_id)
            ->where('td_replystat', 0)
            ->first();

        if (! $detail) {
            return response()->json(['message' => 'Receipt entry not found.'], 404);
        }

        $payload = $this->decodeWebstorePayload($detail->td_content ?? null);
        if (! is_array($payload) || empty($payload)) {
            return response()->json(['message' => 'Receipt payload is invalid.'], 422);
        }

        $type = strtolower(trim((string) ($payload['type'] ?? '')));
        if ($type !== 'webstore_payment_continuation') {
            return response()->json(['message' => 'Only continuation receipts can be rejected here.'], 422);
        }

        $currentApprovalStatus = strtolower(trim((string) ($payload['approval_status'] ?? '')));
        if ($currentApprovalStatus !== '' || ! empty($payload['approved_at'])) {
            return response()->json(['message' => 'This receipt has already been reviewed.'], 422);
        }

        $reviewedAt = now('Asia/Manila');
        $rejectionReason = 'Your payment has been rejected by the admin due to mismatch ID.';
        $rejectedPayload = array_merge($payload, [
            'approval_status' => 'rejected',
            'approved_at' => null,
            'rejected_at' => $reviewedAt->toDateTimeString(),
            'approved_by' => $admin instanceof Admin ? (int) $admin->id : 0,
            'rejection_reason' => $rejectionReason,
            'review_note' => $rejectionReason,
        ]);

        DB::table('tbl_tickets_details')
            ->where('td_id', (int) $detailId)
            ->update([
                'td_content' => json_encode($rejectedPayload, JSON_THROW_ON_ERROR),
            ]);

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticket->t_id,
            'td_content' => json_encode([
                'type' => 'webstore_receipt_decision',
                'decision' => 'rejected',
                'receipt_detail_id' => (int) $detailId,
                'reason' => $rejectionReason,
                'reviewed_by' => $admin instanceof Admin ? (int) $admin->id : null,
                'reviewed_at' => $reviewedAt->toDateTimeString(),
            ], JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => $reviewedAt,
            'td_rate' => 0,
            'td_eid' => $admin instanceof Admin ? (int) $admin->id : 0,
            'td_replystat' => 2,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        $customer = Customer::query()->where('c_userid', (int) $ticket->t_eid)->first();
        if ($customer instanceof Customer) {
            CustomerNotification::query()->create([
                'cn_customer_id' => (int) $customer->c_userid,
                'cn_type' => 'webstore_request',
                'cn_severity' => 'error',
                'cn_title' => 'Webstore Receipt Rejected',
                'cn_message' => $rejectionReason,
                'cn_href' => '/profile?tab=webstore',
                'cn_payload' => [
                    'ticket_id' => (int) $ticket->t_id,
                    'receipt_detail_id' => (int) $detailId,
                    'reason' => $rejectionReason,
                    'rejected_at' => $reviewedAt->toDateTimeString(),
                ],
                'cn_source_type' => 'webstore_receipt',
                'cn_source_id' => (int) $detailId,
                'cn_created_at' => $reviewedAt,
            ]);
        }

        return response()->json(['message' => 'Webstore receipt rejected successfully.']);
    }

    private function createOrUpdatePartnerStorefrontFromRequest(string $displayName, string $slugName, array $payload): ?WebPageContent
    {
        $normalizedSlug = $this->normalizeStorefrontSlug($slugName);
        if ($normalizedSlug === '') {
            return null;
        }

        $resolvedDisplayName = trim($displayName) !== '' ? trim($displayName) : ucwords(str_replace('-', ' ', $normalizedSlug));
        $payloadFields = [
            'slug' => $normalizedSlug,
            'display_name' => $resolvedDisplayName,
            'notification_email' => trim((string) ($payload['email'] ?? '')),
        ];

        $storefront = WebPageContent::query()
            ->whereIn('wpc_type', ['partner-storefront', 'partner-storefronts'])
            ->orderByDesc('wpc_id')
            ->get()
            ->first(function (WebPageContent $item) use ($normalizedSlug): bool {
                $key = strtolower(trim((string) ($item->wpc_key ?? '')));
                $payloadSlug = strtolower(trim((string) data_get($item->wpc_payload, 'fields.slug', '')));
                return $key === $normalizedSlug || $payloadSlug === $normalizedSlug;
            });

        if (! $storefront instanceof WebPageContent) {
            return WebPageContent::query()->create([
                'wpc_type' => 'partner-storefront',
                'wpc_key' => $normalizedSlug,
                'wpc_title' => $resolvedDisplayName,
                'wpc_subtitle' => 'Shop ' . $resolvedDisplayName,
                'wpc_body' => '',
                'wpc_payload' => [
                    'fields' => $payloadFields,
                ],
                'wpc_sort' => 0,
                'wpc_status' => true,
            ]);
        }

        $existingPayload = is_array($storefront->wpc_payload) ? $storefront->wpc_payload : [];
        $existingFields = is_array($existingPayload['fields'] ?? null) ? $existingPayload['fields'] : [];
        $storefront->wpc_type = 'partner-storefront';
        $storefront->wpc_key = $normalizedSlug;
        $storefront->wpc_title = $resolvedDisplayName;
        $storefront->wpc_subtitle = trim((string) ($storefront->wpc_subtitle ?? '')) !== '' ? $storefront->wpc_subtitle : ('Shop ' . $resolvedDisplayName);
        $storefront->wpc_body = trim((string) ($storefront->wpc_body ?? ''));
        $storefront->wpc_status = true;
        $storefront->wpc_payload = [
            ...$existingPayload,
            'fields' => [
                ...$existingFields,
                ...$payloadFields,
            ],
        ];
        $storefront->save();

        return $storefront;
    }

    private function normalizeStorefrontSlug(string $value): string
    {
        $slug = mb_strtolower(trim($value), 'UTF-8');
        if ($slug === '') return '';
        $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug) ?? '';
        $slug = trim($slug, '-');
        return $slug;
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

    private function sendWebstoreReceiptEmail(Customer $customer, int $ticketId): void
    {
        $recipient = trim((string) ($customer->c_email ?? ''));
        if ($recipient === '') {
            return;
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

        $initialPayload = $payloads[0] ?? [];
        $activePayload = [];
        foreach ($payloads as $rowPayload) {
            if (! is_array($rowPayload) || empty($rowPayload)) {
                continue;
            }

            $rowType = strtolower(trim((string) ($rowPayload['type'] ?? '')));
            $rowApprovalStatus = strtolower(trim((string) ($rowPayload['approval_status'] ?? '')));
            $rowApproved = $rowApprovalStatus === 'approved' || ($rowApprovalStatus === '' && ! empty($rowPayload['approved_at']));
            if (empty($activePayload)) {
                $activePayload = $rowPayload;
            } elseif ($rowType === 'webstore_payment_continuation' && $rowApproved) {
                $activePayload = $rowPayload;
            }
        }
        if (empty($activePayload)) {
            $activePayload = $initialPayload;
        }

        $planLabel = (string) ($initialPayload['plan'] ?? '');
        $planLabel = match ($planLabel) {
            'quarterly' => 'Quarterly',
            'semi_annual' => 'Semi-Annual',
            'annual' => 'Annual',
            default => $planLabel,
        };

        $billingLabel = (string) ($activePayload['billing_option'] ?? '');
        $billingLabel = match ($billingLabel) {
            'monthly' => 'Monthly Installment',
            'full' => 'Full Payment',
            default => $billingLabel,
        };

        $subscriptionFee = (int) ($initialPayload['subscription_fee'] ?? 0);
        $effectiveMonthly = (int) ($initialPayload['effective_monthly'] ?? 0);
        $planTerm = (string) ($initialPayload['plan_term'] ?? '');

        $subscriptionProgress = $this->calculateWebstoreSubscriptionProgress($ticketId);
        $receiptCount = (int) ($subscriptionProgress['payment_count'] ?? 0);
        $remainingBalance = (float) ($subscriptionProgress['remaining_balance'] ?? 0);
        $paidAmount = (float) ($subscriptionProgress['total_paid_amount'] ?? 0);

        $submittedAt = (string) ($activePayload['submitted_at'] ?? $initialPayload['submitted_at'] ?? '');
        $payload = [
            'customer_name' => $this->fullName($customer) ?: ('Member #' . $customer->c_userid),
            'reference_no' => sprintf('TKT-%06d', $ticketId),
            'plan_label' => $planLabel,
            'plan_term' => $planTerm,
            'subscription_fee' => $subscriptionFee,
            'effective_monthly' => $effectiveMonthly,
            'billing_label' => $billingLabel,
            'payment_method' => (string) ($activePayload['payment_method'] ?? ''),
            'checkout_id' => (string) ($activePayload['checkout_id'] ?? $initialPayload['checkout_id'] ?? ''),
            'payment_reference' => (string) ($activePayload['payment_reference'] ?? $initialPayload['payment_reference'] ?? ''),
            'payment_intent_id' => (string) ($activePayload['payment_intent_id'] ?? $initialPayload['payment_intent_id'] ?? ''),
            'submitted_at_label' => $submittedAt !== '' ? date('F j, Y g:i A', strtotime($submittedAt)) : '',
            'payment_count' => $receiptCount,
            'amount_paid' => (int) $paidAmount,
            'remaining_balance' => (float) $remainingBalance,
            'receipt_urls' => is_array($activePayload['receipt_urls'] ?? null) ? array_values($activePayload['receipt_urls']) : [],
        ];

        try {
            Mail::mailer('resend')->to($recipient)->send(new WebstoreReceiptMail($payload));
        } catch (\Throwable $exception) {
            Log::warning('Failed to send approved webstore receipt email.', [
                'ticket_id' => $ticketId,
                'customer_id' => (int) $customer->c_userid,
                'email' => $recipient,
                'error' => $exception->getMessage(),
            ]);
        }
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
        $stepAmount = $effectiveMonthly > 0 ? $effectiveMonthly : (int) ($subscriptionFee > 0 && $planTermMonths > 0 ? (int) round($subscriptionFee / max($planTermMonths, 1)) : 0);

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

    public function rejectWebstoreRequest(Request $request, int $id)
    {
        $admin = $request->user();

        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Webstore request not found.'], 404);
        }

        if ((int) $ticket->t_status !== 1) {
            return response()->json(['message' => 'This request is no longer pending.'], 422);
        }

        DB::table('tbl_tickets')->where('t_id', (int) $ticket->t_id)->update([
            't_status' => 2,
            't_view_status' => 2,
        ]);

        $reviewedAt = now('Asia/Manila');

        $decisionPayload = [
            'type' => 'webstore_request_decision',
            'decision' => 'rejected',
            'reviewed_by' => $admin instanceof Admin ? (int) $admin->id : null,
            'reviewed_at' => $reviewedAt->toDateTimeString(),
        ];

        DB::table('tbl_tickets_details')->insert([
            't_id' => (int) $ticket->t_id,
            'td_content' => json_encode($decisionPayload, JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime' => now(),
            'td_rate' => 0,
            'td_eid' => $admin instanceof Admin ? (int) $admin->id : 0,
            'td_replystat' => 2,
            'td_viewstat' => '1',
            'td_ip' => (string) $request->ip(),
        ]);

        CustomerNotification::query()->create([
            'cn_customer_id' => (int) ($ticket->t_eid ?? 0),
            'cn_type' => 'webstore_request',
            'cn_severity' => 'warning',
            'cn_title' => 'Webstore Request',
            'cn_message' => sprintf(
                'Your webstore request has been rejected by admin (%s).',
                $reviewedAt->format('F j, Y g:i A')
            ),
            'cn_href' => '/profile?tab=webstore',
            'cn_payload' => [
                'ticket_id' => (int) $ticket->t_id,
                'rejected_at' => $reviewedAt->toDateTimeString(),
            ],
            'cn_source_type' => 'webstore_request',
            'cn_source_id' => (int) $ticket->t_id,
            'cn_created_at' => $reviewedAt,
        ]);

        return response()->json(['message' => 'Webstore request rejected.']);
    }

    public function destroyWebstoreRequest(Request $request, int $id)
    {
        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Webstore request not found.'], 404);
        }

        DB::transaction(function () use ($ticket): void {
            DB::table('tbl_tickets_details')->where('t_id', (int) $ticket->t_id)->delete();
            DB::table('tbl_tickets')->where('t_id', (int) $ticket->t_id)->delete();

            DB::table('tbl_admin_notifications')
                ->where('an_source_type', 'ticket')
                ->where('an_source_id', (int) $ticket->t_id)
                ->where('an_type', 'webstore_request')
                ->delete();

            DB::table('tbl_customer_notifications')
                ->where('cn_source_type', 'webstore_request')
                ->where('cn_source_id', (int) $ticket->t_id)
                ->delete();
        });

        return response()->json(['message' => 'Webstore request deleted.']);
    }

    public function destroyPartnerWebstoreRequest(Request $request, int $id)
    {
        $admin = $request->user();
        $allowedSlugs = $this->resolvePartnerStorefrontSlugs($admin instanceof Admin ? $admin : null);

        if (empty($allowedSlugs)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $ticket = DB::table('tbl_tickets')->where('t_id', $id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Webstore request not found.'], 404);
        }

        $detail = DB::table('tbl_tickets_details')
            ->where('t_id', (int) $ticket->t_id)
            ->where('td_replystat', 0)
            ->orderBy('td_id')
            ->first();

        $payload = $this->decodeWebstorePayload($detail->td_content ?? null);
        $slugName = mb_strtolower(trim((string) ($payload['slug_name'] ?? '')), 'UTF-8');

        if (! in_array($slugName, $allowedSlugs, true)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        DB::transaction(function () use ($ticket): void {
            DB::table('tbl_tickets_details')->where('t_id', (int) $ticket->t_id)->delete();
            DB::table('tbl_tickets')->where('t_id', (int) $ticket->t_id)->delete();

            DB::table('tbl_admin_notifications')
                ->where('an_source_type', 'ticket')
                ->where('an_source_id', (int) $ticket->t_id)
                ->where('an_type', 'webstore_request')
                ->delete();

            DB::table('tbl_customer_notifications')
                ->where('cn_source_type', 'webstore_request')
                ->where('cn_source_id', (int) $ticket->t_id)
                ->delete();
        });

        return response()->json(['message' => 'Webstore request deleted.']);
    }

    public function destroyPartnerWebstoreReceiptItem(Request $request, int $id)
    {
        $admin = $request->user();
        $allowedSlugs = $this->resolvePartnerStorefrontSlugs($admin instanceof Admin ? $admin : null);

        if (empty($allowedSlugs)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $detail = DB::table('tbl_tickets_details')->where('td_id', $id)->first();
        if (! $detail) {
            return response()->json(['message' => 'Receipt item not found.'], 404);
        }

        $ticket = DB::table('tbl_tickets')->where('t_id', (int) $detail->t_id)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Webstore request not found.'], 404);
        }

        $firstDetail = DB::table('tbl_tickets_details')
            ->where('t_id', (int) $ticket->t_id)
            ->where('td_replystat', 0)
            ->orderBy('td_id')
            ->first();

        $payload = $this->decodeWebstorePayload($firstDetail->td_content ?? null);
        $slugName = mb_strtolower(trim((string) ($payload['slug_name'] ?? '')), 'UTF-8');

        if (! in_array($slugName, $allowedSlugs, true)) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        DB::table('tbl_tickets_details')->where('td_id', $id)->delete();

        return response()->json(['message' => 'Receipt item deleted.']);
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

    private function webstoreApprovedAt(int $ticketId): ?string
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
            if (($payload['decision'] ?? '') !== 'approved') {
                continue;
            }
            $reviewedAt = trim((string) ($payload['reviewed_at'] ?? ''));
            if ($reviewedAt !== '') {
                return $reviewedAt;
            }
        }

        return null;
    }

    // ─── Partner payment endpoints ────────────────────────────────────────────

    public function createPartnerWebstorePaymentSession(Request $request)
    {
        $admin = $request->user();
        if (! $admin instanceof Admin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $allowedStorefrontSlugs = $this->resolvePartnerStorefrontSlugs($admin);
        if (empty($allowedStorefrontSlugs)) {
            return response()->json(['message' => 'No storefronts assigned to this account.'], 403);
        }

        $validated = $request->validate([
            'plan'           => ['required', Rule::in(['test', 'quarterly', 'semi_annual', 'annual'])],
            'billing_option' => ['required', Rule::in(['full', 'monthly'])],
            'payment_method' => ['required', Rule::in(['gcash', 'grab_pay', 'maya', 'card'])],
            'payment_mode'   => ['nullable', Rule::in(['test', 'live'])],
            'slug_name'      => ['nullable', 'string', 'max:255'],
        ]);

        $slugName = strtolower(trim((string) ($validated['slug_name'] ?? '')));
        if ($slugName !== '' && ! in_array($slugName, $allowedStorefrontSlugs, true)) {
            return response()->json(['message' => 'Access to this storefront is denied.'], 403);
        }

        $planMatrix = [
            'test'        => ['label' => 'Test',        'full_amount' => 1,      'monthly_amount' => 1],
            'quarterly'   => ['label' => 'Quarterly',   'full_amount' => 48000,  'monthly_amount' => 16000],
            'semi_annual' => ['label' => 'Semi-Annual', 'full_amount' => 90000,  'monthly_amount' => 15000],
            'annual'      => ['label' => 'Annual',      'full_amount' => 150000, 'monthly_amount' => 12500],
        ];
        $planKey = (string) $validated['plan'];
        $plan    = $planMatrix[$planKey] ?? $planMatrix['quarterly'];
        $amount  = (int) (($validated['billing_option'] === 'monthly' ? $plan['monthly_amount'] : $plan['full_amount']) ?? $plan['full_amount']);

        $paymongo = $this->resolveWebstorePaymongoConfig($request, $validated['payment_mode'] ?? null);
        if ($paymongo['secret_key'] === '') {
            return response()->json(['message' => sprintf('PayMongo %s secret key is missing.', $paymongo['mode'])], 500);
        }

        $frontendBase  = $this->resolveWebstoreFrontendBaseUrl($request);
        $methodTypes   = $this->mapWebstorePaymentMethodTypes((string) $validated['payment_method'], $paymongo['mode']);
        $returnSlug    = $slugName !== '' ? $slugName : ($allowedStorefrontSlugs[0] ?? '');
        $storefrontParam = $returnSlug !== '' ? ('&storefront=' . urlencode($returnSlug)) : '';

        $payload = [
            'data' => [
                'attributes' => [
                    'description'          => sprintf('Partner Webstore Renewal (%s)', (string) $plan['label']),
                    'line_items'           => [[
                        'currency' => 'PHP',
                        'amount'   => $amount * 100,
                        'name'     => sprintf(
                            'Webstore Renewal - %s (%s)',
                            (string) $plan['label'],
                            $validated['billing_option'] === 'monthly' ? 'Monthly Installment' : 'Full Payment'
                        ),
                        'quantity' => 1,
                    ]],
                    'payment_method_types' => $methodTypes,
                    'send_email_receipt'   => true,
                    'show_description'     => true,
                    'show_line_items'      => true,
                    'reference_number'     => 'PWS-' . strtoupper(Str::random(10)),
                    'success_url'          => $frontendBase . '/partner/webpages/renewal?webstore_payment=success',
                    'cancel_url'           => $frontendBase . '/partner/webpages/renewal?webstore_payment=cancelled',
                    'metadata'             => [
                        'flow'           => 'partner_webstore_renewal',
                        'admin_id'       => (int) $admin->id,
                        'plan'           => $planKey,
                        'billing_option' => (string) $validated['billing_option'],
                        'payment_method' => (string) $validated['payment_method'],
                        'slug_name'      => $returnSlug,
                    ],
                ],
            ],
        ];

        $response = Http::withBasicAuth($paymongo['secret_key'], '')
            ->withHeaders(['Accept' => 'application/json'])
            ->post($paymongo['api_base_url'] . '/v1/checkout_sessions', $payload);

        if (! $response->successful()) {
            return response()->json([
                'message' => data_get($response->json(), 'errors.0.detail')
                    ?: data_get($response->json(), 'errors.0.title')
                    ?: 'Failed to create webstore payment session.',
            ], $response->status() > 0 ? $response->status() : 422);
        }

        $data        = (array) $response->json();
        $checkoutId  = (string) data_get($data, 'data.id', '');
        $checkoutUrl = (string) data_get($data, 'data.attributes.checkout_url', '');

        if ($checkoutId === '' || $checkoutUrl === '') {
            return response()->json(['message' => 'Checkout session created but missing checkout URL.'], 422);
        }

        $successUrl = $frontendBase . '/partner/webpages/renewal?webstore_payment=success&checkout_id=' . urlencode($checkoutId) . '&payment_mode=' . urlencode($paymongo['mode']) . $storefrontParam;
        $cancelUrl  = $frontendBase . '/partner/webpages/renewal?webstore_payment=cancelled&checkout_id=' . urlencode($checkoutId) . '&payment_mode=' . urlencode($paymongo['mode']) . $storefrontParam;

        $patchResponse = Http::withBasicAuth($paymongo['secret_key'], '')
            ->withHeaders(['Accept' => 'application/json'])
            ->put($paymongo['api_base_url'] . '/v1/checkout_sessions/' . $checkoutId, [
                'data' => ['attributes' => ['success_url' => $successUrl, 'cancel_url' => $cancelUrl]],
            ]);
        if ($patchResponse->successful()) {
            $patchedData = (array) $patchResponse->json();
            $checkoutUrl = (string) data_get($patchedData, 'data.attributes.checkout_url', $checkoutUrl);
        }

        return response()->json([
            'checkout_id'  => $checkoutId,
            'checkout_url' => $checkoutUrl,
            'payment_mode' => $paymongo['mode'],
        ]);
    }

    public function verifyPartnerWebstorePaymentSession(Request $request, string $checkoutId)
    {
        $admin = $request->user();
        if (! $admin instanceof Admin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $mode     = strtolower(trim((string) $request->query('payment_mode', '')));
        $paymongo = $this->resolveWebstorePaymongoConfig($request, in_array($mode, ['test', 'live'], true) ? $mode : null);
        if ($paymongo['secret_key'] === '') {
            return response()->json(['message' => sprintf('PayMongo %s secret key is missing.', $paymongo['mode'])], 500);
        }

        $response = Http::withBasicAuth($paymongo['secret_key'], '')
            ->withHeaders(['Accept' => 'application/json'])
            ->get($paymongo['api_base_url'] . '/v1/checkout_sessions/' . $checkoutId);

        if (! $response->successful()) {
            return response()->json([
                'message' => data_get($response->json(), 'errors.0.detail')
                    ?: data_get($response->json(), 'errors.0.title')
                    ?: 'Failed to verify webstore payment session.',
            ], $response->status() > 0 ? $response->status() : 422);
        }

        $data   = (array) $response->json();
        $status = strtolower((string) data_get($data, 'data.attributes.payments.0.attributes.status', data_get($data, 'data.attributes.status', '')));
        $isPaid = in_array($status, ['paid', 'succeeded'], true);

        return response()->json([
            'checkout_id'       => (string) data_get($data, 'data.id', $checkoutId),
            'status'            => $status,
            'is_paid'           => $isPaid,
            'payment_mode'      => $paymongo['mode'],
            'payment_method'    => (string) data_get($data, 'data.attributes.metadata.payment_method', ''),
            'proof_url'         => (string) data_get($data, 'data.attributes.checkout_url', ''),
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

    public function submitPartnerWebstoreRequest(Request $request)
    {
        $admin = $request->user();
        if (! $admin instanceof Admin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $allowedStorefrontSlugs = $this->resolvePartnerStorefrontSlugs($admin);
        if (empty($allowedStorefrontSlugs)) {
            return response()->json(['message' => 'No storefronts assigned to this account.'], 403);
        }

        $validated = $request->validate([
            'full_name'         => 'required|string|max:255',
            'username'          => 'required|string|max:255',
            'email'             => 'required|email|max:255',
            'slug_name'         => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'display_name'      => 'required|string|max:255',
            'plan'              => ['required', Rule::in(['test', 'quarterly', 'semi_annual', 'annual'])],
            'billing_option'    => ['required', Rule::in(['full', 'monthly'])],
            'payment_method'    => ['required', Rule::in(['gcash', 'grab_pay', 'maya', 'card'])],
            'receipt_urls'      => 'required|array|min:1|max:5',
            'receipt_urls.*'    => 'required|url|max:2048',
            'checkout_id'       => ['nullable', 'string', 'max:255'],
            'payment_reference' => ['required', 'string', 'max:255'],
            'payment_intent_id' => ['nullable', 'string', 'max:255'],
            'accepted_terms'    => 'required|boolean|accepted',
        ]);

        $slugName = mb_strtolower(trim((string) $validated['slug_name']), 'UTF-8');
        if (! in_array($slugName, $allowedStorefrontSlugs, true)) {
            return response()->json(['message' => 'Access to this storefront is denied.'], 403);
        }

        $submittedAt = now();

        $subscriptionMatrix = [
            'test'        => ['term' => '2 days',   'term_months' => 0,  'subscription_fee' => 1,      'effective_monthly' => 1],
            'quarterly'   => ['term' => '3 months', 'term_months' => 3,  'subscription_fee' => 48000,  'effective_monthly' => 16000],
            'semi_annual' => ['term' => '6 months', 'term_months' => 6,  'subscription_fee' => 90000,  'effective_monthly' => 15000],
            'annual'      => ['term' => 'Yearly',   'term_months' => 12, 'subscription_fee' => 150000, 'effective_monthly' => 12500],
        ];
        $selectedPlan     = (string) $validated['plan'];
        $subscriptionMeta = $subscriptionMatrix[$selectedPlan] ?? $subscriptionMatrix['quarterly'];

        $requestPayload = [
            'type'               => 'webstore_request',
            'full_name'          => trim((string) $validated['full_name']),
            'username'           => trim((string) $validated['username']),
            'email'              => trim((string) $validated['email']),
            'slug_name'          => trim((string) $validated['slug_name']),
            'display_name'       => trim((string) $validated['display_name']),
            'plan'               => $selectedPlan,
            'plan_term'          => (string) ($subscriptionMeta['term'] ?? ''),
            'plan_term_months'   => (int) ($subscriptionMeta['term_months'] ?? 0),
            'subscription_fee'   => (int) ($subscriptionMeta['subscription_fee'] ?? 0),
            'effective_monthly'  => (int) ($subscriptionMeta['effective_monthly'] ?? 0),
            'billing_option'     => (string) $validated['billing_option'],
            'payment_method'     => (string) $validated['payment_method'],
            'checkout_id'        => trim((string) ($validated['checkout_id'] ?? '')),
            'payment_reference'  => trim((string) ($validated['payment_reference'] ?? '')),
            'payment_intent_id'  => trim((string) ($validated['payment_intent_id'] ?? '')),
            'receipt_urls'       => array_values(array_unique(array_map(static fn ($url) => trim((string) $url), (array) $validated['receipt_urls']))),
            'accepted_terms'     => true,
            'submitted_at'       => $submittedAt->toDateTimeString(),
            'submitted_by_admin' => (int) $admin->id,
        ];

        // Find the latest ticket for this storefront slug
        $subject    = mb_strtolower($this->webstoreRequestTicketSubject(), 'UTF-8');
        $allTickets = DB::table('tbl_tickets')
            ->where(function ($q) use ($subject) {
                $q->whereRaw('LOWER(TRIM(t_subject)) = ?', [$subject])
                  ->orWhereRaw('LOWER(TRIM(t_subject)) = ?', ['webstore request'])
                  ->orWhereRaw('LOWER(TRIM(t_subject)) = ?', ['partner webstore request']);
            })
            ->orderByDesc('t_id')
            ->get();

        $latest = $allTickets->first(function ($ticket) use ($slugName): bool {
            $detail = DB::table('tbl_tickets_details')
                ->where('t_id', (int) $ticket->t_id)
                ->where('td_replystat', 0)
                ->orderBy('td_id')
                ->first();
            $payload = $this->decodeWebstorePayload($detail?->td_content ?? null);
            return mb_strtolower(trim((string) ($payload['slug_name'] ?? '')), 'UTF-8') === $slugName;
        });

        $latestStatus = $latest
            ? $this->mapWebstoreRequestStatus((int) $latest->t_status, (int) $latest->t_id, $slugName)
            : '';

        if ($latest && $latestStatus === 'approved') {
            $continuationPayload = array_merge($requestPayload, ['type' => 'webstore_payment_continuation']);

            $newDetailId = DB::table('tbl_tickets_details')->insertGetId([
                't_id'          => (int) $latest->t_id,
                'td_content'    => json_encode($continuationPayload, JSON_THROW_ON_ERROR),
                'td_attachment' => null,
                'td_datetime'   => $submittedAt,
                'td_rate'       => 0,
                'td_eid'        => (int) $admin->id,
                'td_replystat'  => 0,
                'td_viewstat'   => '1',
                'td_ip'         => (string) $request->ip(),
            ], 'td_id');

            $paymentRef    = strtolower(trim((string) ($continuationPayload['payment_reference'] ?? '')));
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

            if ($filenameMatch) {
                $reviewedAt = now('Asia/Manila');
                DB::table('tbl_tickets_details')
                    ->where('td_id', $newDetailId)
                    ->update(['td_content' => json_encode(array_merge($continuationPayload, [
                        'approval_status' => 'approved',
                        'approved_at'     => $reviewedAt->toDateTimeString(),
                        'approved_by'     => 0,
                    ]), JSON_THROW_ON_ERROR)]);
            }

            AdminNotification::query()->create([
                'an_type'       => 'webstore_payment_continuation',
                'an_source_type' => 'ticket',
                'an_source_id'  => (int) $latest->t_id,
                'an_severity'   => 'info',
                'an_title'      => 'Partner Webstore Renewal Payment',
                'an_message'    => sprintf('Partner submitted renewal payment for "%s" (%s).', trim((string) $validated['display_name']), trim((string) $validated['slug_name'])),
                'an_href'       => '/admin/inquiry',
                'an_payload'    => ['ticket_id' => (int) $latest->t_id, 'admin_id' => (int) $admin->id, 'request' => $continuationPayload, 'submitted_at' => $submittedAt->toDateTimeString()],
                'an_created_at' => $submittedAt,
            ]);

            return response()->json([
                'message' => 'Webstore receipt uploaded successfully.',
                'request' => ['id' => (int) $latest->t_id, 'submitted_at' => $submittedAt->toDateTimeString()],
            ]);
        }

        $ticketId = DB::table('tbl_tickets')->insertGetId([
            't_bid'         => 0,
            't_eid'         => 0,
            't_department'  => 1,
            't_subject'     => $this->webstoreRequestTicketSubject(),
            't_urgency'     => 2,
            't_related'     => 0,
            't_view_status' => 1,
            't_status'      => 1,
            't_date'        => $submittedAt,
            't_archive'     => 0,
            't_category'    => 0,
        ], 't_id');

        DB::table('tbl_tickets_details')->insert([
            't_id'          => (int) $ticketId,
            'td_content'    => json_encode($requestPayload, JSON_THROW_ON_ERROR),
            'td_attachment' => null,
            'td_datetime'   => $submittedAt,
            'td_rate'       => 0,
            'td_eid'        => (int) $admin->id,
            'td_replystat'  => 0,
            'td_viewstat'   => '1',
            'td_ip'         => (string) $request->ip(),
        ]);

        AdminNotification::query()->firstOrCreate(
            ['an_type' => 'webstore_request', 'an_source_type' => 'ticket', 'an_source_id' => (int) $ticketId],
            [
                'an_severity'   => 'info',
                'an_title'      => 'Partner Webstore Request',
                'an_message'    => sprintf('Partner submitted a Webstore Request for "%s" (%s).', trim((string) $validated['display_name']), trim((string) $validated['slug_name'])),
                'an_href'       => '/admin/inquiry',
                'an_payload'    => ['ticket_id' => (int) $ticketId, 'admin_id' => (int) $admin->id, 'request' => $requestPayload, 'submitted_at' => $submittedAt->toDateTimeString()],
                'an_created_at' => $submittedAt,
            ]
        );

        return response()->json([
            'message' => 'Webstore request submitted successfully.',
            'request' => ['id' => (int) $ticketId, 'submitted_at' => $submittedAt->toDateTimeString()],
        ]);
    }

    // ─── Payment helpers ──────────────────────────────────────────────────────

    private function resolveWebstorePaymongoConfig(Request $request, ?string $requestedMode = null): array
    {
        $mode   = $this->resolveWebstorePaymongoMode($request, $requestedMode);
        $config = (array) config("services.paymongo.modes.{$mode}", []);
        return [
            'mode'         => $mode,
            'secret_key'   => (string) ($config['secret_key'] ?? ''),
            'api_base_url' => rtrim((string) config('services.paymongo.api_base_url', 'https://api.paymongo.com'), '/'),
        ];
    }

    private function resolveWebstorePaymongoMode(Request $request, ?string $requestedMode = null): string
    {
        $requestedMode  = strtolower(trim((string) $requestedMode));
        $localHosts     = ['localhost', '127.0.0.1', '::1'];
        $hostCandidates = [
            $request->getHost(),
            parse_url((string) $request->headers->get('origin', ''), PHP_URL_HOST),
            parse_url((string) $request->headers->get('referer', ''), PHP_URL_HOST),
        ];

        $isLocal = app()->environment(['local', 'development', 'dev']);
        foreach ($hostCandidates as $candidate) {
            $normalized = strtolower(trim((string) $candidate));
            if (in_array($normalized, $localHosts, true) || str_ends_with($normalized, '.local')) {
                $isLocal = true;
                break;
            }
        }

        if ($isLocal) {
            return $requestedMode === 'live' ? 'live' : 'test';
        }

        return 'live';
    }

    private function resolveWebstoreFrontendBaseUrl(Request $request): string
    {
        $fallback  = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $sourceUrl = trim((string) (
            $request->headers->get('origin')
            ?: $request->headers->get('referer')
            ?: $fallback
        ));
        $parts  = parse_url($sourceUrl);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host   = strtolower((string) ($parts['host'] ?? ''));
        $port   = isset($parts['port']) ? (int) $parts['port'] : null;
        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return $fallback;
        }
        $portSegment = ($port && ! in_array($port, [80, 443], true)) ? ':' . $port : '';
        return $scheme . '://' . $host . $portSegment;
    }

    private function mapWebstorePaymentMethodTypes(string $method, string $mode): array
    {
        return match ($method) {
            'gcash'    => ['gcash'],
            'grab_pay' => ['grab_pay'],
            'maya'     => ['paymaya'],
            'card'     => ['card'],
            default    => ['card'],
        };
    }
}
