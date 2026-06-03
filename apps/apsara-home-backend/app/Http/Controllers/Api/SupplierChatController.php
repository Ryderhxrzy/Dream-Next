<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\ProductBrand;
use App\Models\SupplierChatConversation;
use App\Models\SupplierChatMessage;
use App\Models\SupplierUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        $actorInfo = $this->resolveActor($actor);

        if (! $actorInfo) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ($actorInfo['actor_type'] === 'supplier') {
            $this->ensureDefaultConversation($actorInfo['supplier_user_id']);
        }

        $query = SupplierChatConversation::query()
            ->with(['supplierUser.supplier', 'assignedAdmin']);

        if ($actorInfo['actor_type'] === 'supplier') {
            $supplierId = (int) $actorInfo['supplier_id'];
            $query->whereHas('supplierUser', fn ($q) => $q->where('su_supplier', $supplierId));
        }

        if ($actorInfo['actor_type'] === 'admin') {
            $supplierUserId = (int) $request->query('supplier_user_id', 0);
            if ($supplierUserId > 0) {
                $query->where('supplier_user_id', $supplierUserId);
            } elseif (! empty($actorInfo['supplier_id'])) {
                $query->whereHas('supplierUser', function ($builder) use ($actorInfo): void {
                    $builder->where('su_supplier', (int) $actorInfo['supplier_id']);
                });
            }
        }

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder->where('subject', 'like', '%' . $search . '%')
                    ->orWhereHas('messages', function ($messages) use ($search): void {
                        $messages->where('message', 'like', '%' . $search . '%');
                    });
            });
        }

        $conversations = $query
            ->with(['supplierUser.supplier', 'assignedAdmin', 'latestMessage'])
            ->withCount([
                'messages',
                'messages as admin_unread_count'    => fn ($q) => $q->whereNull('read_at')->where('sender_type', 'admin'),
                'messages as supplier_unread_count' => fn ($q) => $q->whereNull('read_at')->where('sender_type', 'supplier'),
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at')
            ->paginate((int) $request->query('per_page', 25));

        // Load brands once so resolveSupplierBrandLogo doesn't query the DB per conversation
        $brands = ProductBrand::query()->select(['pb_id', 'pb_name', 'pb_image'])->get();

        return response()->json([
            'data' => $conversations->getCollection()->map(function (SupplierChatConversation $conversation) use ($actorInfo, $brands): array {
                return $this->formatConversationSummary($conversation, $actorInfo['actor_type'], $brands);
            })->values(),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        $actorInfo = $this->resolveActor($actor);

        if (! $actorInfo) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'supplier_user_id' => 'nullable|integer|exists:tbl_supplier_user,su_id',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string|min:1|max:5000',
        ]);

        $targetSupplierUserId = $actorInfo['supplier_user_id'];
        if ($actorInfo['actor_type'] === 'admin') {
            $targetSupplierUserId = (int) ($validated['supplier_user_id'] ?? 0);

            if ($targetSupplierUserId <= 0) {
                return response()->json([
                    'message' => 'supplier_user_id is required when an admin creates a supplier conversation.',
                ], 422);
            }

            $supplierUser = SupplierUser::query()->find($targetSupplierUserId);
            if (! $supplierUser) {
                return response()->json(['message' => 'Supplier user not found.'], 404);
            }

            if (! empty($actorInfo['supplier_id']) && (int) $supplierUser->su_supplier !== (int) $actorInfo['supplier_id']) {
                return response()->json(['message' => 'Forbidden: supplier mismatch.'], 403);
            }
        }

        $subject = trim((string) ($validated['subject'] ?? ''));
        if ($subject === '') {
            $subject = 'General support';
        }

        // For supplier actors: reuse existing company-level conversation instead of creating a duplicate
        if ($actorInfo['actor_type'] === 'supplier') {
            $supplierId = (int) $actorInfo['supplier_id'];
            $existing = SupplierChatConversation::query()
                ->with(['supplierUser.supplier', 'assignedAdmin', 'messages'])
                ->whereHas('supplierUser', fn ($q) => $q->where('su_supplier', $supplierId))
                ->first();

            if ($existing) {
                $this->sendMessageToConversation(
                    conversation: $existing,
                    actorType: $actorInfo['actor_type'],
                    actorId: $actorInfo['actor_id'],
                    message: (string) $validated['message'],
                );

                return response()->json([
                    'message' => 'Message sent to existing conversation.',
                    'data' => $this->formatConversationDetail($existing->fresh(['supplierUser.supplier', 'assignedAdmin', 'messages']), $actorInfo['actor_type']),
                ], 201);
            }
        }

        $conversation = SupplierChatConversation::create([
            'supplier_user_id' => $targetSupplierUserId,
            'assigned_admin_id' => null,
            'status' => 'open',
            'subject' => $subject,
            'last_message_at' => now(),
        ]);

        $this->sendMessageToConversation(
            conversation: $conversation,
            actorType: $actorInfo['actor_type'],
            actorId: $actorInfo['actor_id'],
            message: (string) $validated['message'],
        );

        return response()->json([
            'message' => 'Conversation created successfully.',
            'data' => $this->formatConversationDetail($conversation->fresh(['supplierUser.supplier', 'assignedAdmin', 'messages']), $actorInfo['actor_type']),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $actorInfo = $this->resolveActor($actor);

        if (! $actorInfo) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $conversation = $this->queryForActor($actorInfo)->where('id', $id)->first();
        if (! $conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $this->markConversationAsRead($conversation, $actorInfo['actor_type']);

        return response()->json([
            'data' => $this->formatConversationDetail($conversation->fresh(['supplierUser.supplier', 'assignedAdmin', 'messages']), $actorInfo['actor_type']),
        ]);
    }

    public function sendMessage(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $actorInfo = $this->resolveActor($actor);

        if (! $actorInfo) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $conversation = $this->queryForActor($actorInfo)->where('id', $id)->first();
        if (! $conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $validated = $request->validate([
            'message'         => 'nullable|string|max:5000',
            'attachment_url'  => 'nullable|url|max:2048',
            'attachment_type' => 'nullable|in:image,video,file',
            'attachment_name' => 'nullable|string|max:255',
        ]);

        $messageText    = trim((string) ($validated['message'] ?? ''));
        $attachmentUrl  = trim((string) ($validated['attachment_url'] ?? ''));

        if ($messageText === '' && $attachmentUrl === '') {
            return response()->json(['message' => 'A message or attachment is required.'], 422);
        }

        $message = $this->sendMessageToConversation(
            conversation: $conversation,
            actorType: $actorInfo['actor_type'],
            actorId: $actorInfo['actor_id'],
            message: $messageText,
            attachmentUrl: $attachmentUrl ?: null,
            attachmentType: $attachmentUrl ? (trim((string) ($validated['attachment_type'] ?? '')) ?: null) : null,
            attachmentName: $attachmentUrl ? (trim((string) ($validated['attachment_name'] ?? '')) ?: null) : null,
        );

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => $this->formatMessage($message),
        ], 201);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $actorInfo = $this->resolveActor($actor);

        if (! $actorInfo) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $conversation = $this->queryForActor($actorInfo)->where('id', $id)->first();
        if (! $conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|in:open,pending,resolved',
        ]);

        $conversation->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Conversation updated successfully.',
            'data' => $this->formatConversationSummary($conversation->fresh(['supplierUser', 'assignedAdmin']), $actorInfo['actor_type']),
        ]);
    }

    private function resolveActor($actor): ?array
    {
        if ($actor instanceof SupplierUser) {
            $supplierId = (int) $actor->su_supplier;
            if ($supplierId <= 0) {
                return null;
            }

            return [
                'actor_type' => 'supplier',
                'actor_id' => (int) $actor->su_id,
                'supplier_user_id' => (int) $actor->su_id,
                'supplier_id' => $supplierId,
                'display_name' => (string) ($actor->su_fullname ?: $actor->su_username ?: 'Supplier'),
            ];
        }

        if ($actor instanceof Admin) {
            $supplierId = (int) ($actor->supplier_id ?? 0);

            return [
                'actor_type' => 'admin',
                'actor_id' => (int) $actor->id,
                'supplier_user_id' => null,
                'supplier_id' => $supplierId > 0 ? $supplierId : null,
                'display_name' => (string) ($actor->fname ?: $actor->user_email ?: 'Admin'),
            ];
        }

        return null;
    }

    private function queryForActor(array $actorInfo)
    {
        $query = SupplierChatConversation::query()->with(['supplierUser.supplier', 'assignedAdmin']);

        if ($actorInfo['actor_type'] === 'supplier') {
            $supplierId = (int) $actorInfo['supplier_id'];
            return $query->whereHas('supplierUser', fn ($q) => $q->where('su_supplier', $supplierId));
        }

        if (! empty($actorInfo['supplier_id'])) {
            return $query->whereHas('supplierUser', function ($builder) use ($actorInfo): void {
                $builder->where('su_supplier', (int) $actorInfo['supplier_id']);
            });
        }

        return $query;
    }

    private function ensureDefaultConversation(int $supplierUserId): void
    {
        $supplierUser = SupplierUser::query()->find($supplierUserId);
        if (! $supplierUser) {
            return;
        }

        $supplierId = (int) $supplierUser->su_supplier;

        // Check if any user in this company already has a conversation
        $exists = SupplierChatConversation::query()
            ->whereHas('supplierUser', fn ($q) => $q->where('su_supplier', $supplierId))
            ->exists();

        if ($exists) {
            return;
        }

        SupplierChatConversation::create([
            'supplier_user_id' => $supplierUserId,
            'assigned_admin_id' => null,
            'status' => 'open',
            'subject' => 'General support',
            'last_message_at' => null,
        ]);
    }

    private function sendMessageToConversation(
        SupplierChatConversation $conversation,
        string $actorType,
        int $actorId,
        string $message,
        ?string $attachmentUrl = null,
        ?string $attachmentType = null,
        ?string $attachmentName = null,
    ): SupplierChatMessage {
        $payload = [
            'conversation_id' => (int) $conversation->id,
            'sender_type'     => $actorType,
            'message'         => trim($message),
            'attachment_url'  => $attachmentUrl,
            'attachment_type' => $attachmentType,
            'attachment_name' => $attachmentName,
            'read_at'         => null,
        ];

        if ($actorType === 'supplier') {
            $payload['sender_supplier_user_id'] = $actorId;
            $payload['sender_admin_id'] = null;
        } else {
            $payload['sender_admin_id'] = $actorId;
            $payload['sender_supplier_user_id'] = null;
            if (! $conversation->assigned_admin_id) {
                $conversation->update(['assigned_admin_id' => $actorId]);
            }
        }

        $messageRow = SupplierChatMessage::create($payload);

        $conversation->update([
            'last_message_at' => $messageRow->created_at ?? now(),
        ]);

        return $messageRow;
    }

    private function markConversationAsRead(SupplierChatConversation $conversation, string $actorType): void
    {
        $query = $conversation->messages();

        if ($actorType === 'supplier') {
            $query->where('sender_type', 'admin');
        } else {
            $query->where('sender_type', 'supplier');
        }

        $query->whereNull('read_at')->update(['read_at' => now()]);
    }

    private function formatConversationSummary(SupplierChatConversation $conversation, string $actorType, ?\Illuminate\Support\Collection $brands = null): array
    {
        // Use eager-loaded latestMessage when available (set by index()); fall back to a query otherwise.
        $latestMessage = $conversation->relationLoaded('latestMessage')
            ? $conversation->latestMessage
            : $conversation->messages()->latest('created_at')->first();

        // Use withCount results when available; fall back to individual queries otherwise.
        $messageCount = isset($conversation->messages_count)
            ? (int) $conversation->messages_count
            : $conversation->messages()->count();

        $unreadCount = $actorType === 'supplier'
            ? (isset($conversation->admin_unread_count)
                ? (int) $conversation->admin_unread_count
                : $conversation->messages()->where('sender_type', 'admin')->whereNull('read_at')->count())
            : (isset($conversation->supplier_unread_count)
                ? (int) $conversation->supplier_unread_count
                : $conversation->messages()->where('sender_type', 'supplier')->whereNull('read_at')->count());

        $supplierModel = $conversation->supplierUser?->supplier ?? null;
        $brandLogo = $supplierModel ? $this->resolveSupplierBrandLogo($supplierModel, $brands) : null;

        return [
            'id' => (int) $conversation->id,
            'subject' => (string) ($conversation->subject ?: 'General support'),
            'status' => (string) $conversation->status,
            'company' => $supplierModel ? [
                'id' => (int) $supplierModel->s_id,
                'name' => (string) ($supplierModel->s_company ?: $supplierModel->s_name ?: 'Company'),
                'logo' => $brandLogo ?: ($supplierModel->s_warehouse_image_url ?: null),
            ] : null,
            'supplier_user' => $conversation->supplierUser ? [
                'id' => (int) $conversation->supplierUser->su_id,
                'name' => (string) ($conversation->supplierUser->su_fullname ?: $conversation->supplierUser->su_username ?: 'Supplier'),
                'username' => (string) ($conversation->supplierUser->su_username ?? ''),
                'email' => (string) ($conversation->supplierUser->su_email ?? ''),
            ] : null,
            'assigned_admin' => $conversation->assignedAdmin ? [
                'id' => (int) $conversation->assignedAdmin->id,
                'name' => (string) ($conversation->assignedAdmin->fname ?: $conversation->assignedAdmin->user_email ?: 'Admin'),
                'email' => (string) ($conversation->assignedAdmin->user_email ?? ''),
                'avatar_url' => ! empty($conversation->assignedAdmin->avatar_url) ? (string) $conversation->assignedAdmin->avatar_url : null,
            ] : null,
            'counterpart_label' => $conversation->assignedAdmin
                ? (string) ($conversation->assignedAdmin->fname ?: $conversation->assignedAdmin->user_email ?: 'Admin Support')
                : 'Admin Support',
            'last_message' => $latestMessage ? [
                'id' => (int) $latestMessage->id,
                'message' => (string) $latestMessage->message,
                'sender_type' => (string) $latestMessage->sender_type,
                'sent_at' => $latestMessage->created_at?->toDateTimeString(),
            ] : null,
            'messages' => [],
            'message_count' => $messageCount,
            'unread_count' => $unreadCount,
            'last_message_at' => $conversation->last_message_at?->toDateTimeString(),
            'created_at' => $conversation->created_at->toDateTimeString(),
            'updated_at' => $conversation->updated_at->toDateTimeString(),
        ];
    }

    private function formatConversationDetail(SupplierChatConversation $conversation, string $actorType): array
    {
        return array_merge($this->formatConversationSummary($conversation, $actorType), [
            'messages' => $conversation->messages()
                ->orderBy('created_at')
                ->get()
                ->map(fn (SupplierChatMessage $message) => $this->formatMessage($message))
                ->values(),
        ]);
    }

    private function formatMessage(SupplierChatMessage $message): array
    {
        return [
            'id'                      => (int) $message->id,
            'conversation_id'         => (int) $message->conversation_id,
            'sender_type'             => (string) $message->sender_type,
            'sender_admin_id'         => $message->sender_admin_id ? (int) $message->sender_admin_id : null,
            'sender_supplier_user_id' => $message->sender_supplier_user_id ? (int) $message->sender_supplier_user_id : null,
            'message'                 => (string) $message->message,
            'attachment_url'          => $message->attachment_url ? (string) $message->attachment_url : null,
            'attachment_type'         => $message->attachment_type ? (string) $message->attachment_type : null,
            'attachment_name'         => $message->attachment_name ? (string) $message->attachment_name : null,
            'is_read'                 => (bool) $message->read_at,
            'read_at'                 => $message->read_at?->toDateTimeString(),
            'created_at'              => $message->created_at->toDateTimeString(),
            'updated_at'              => $message->updated_at->toDateTimeString(),
        ];
    }

    private function resolveSupplierBrandLogo($supplier, ?\Illuminate\Support\Collection $brands = null): ?string
    {
        $candidates = [
            (string) ($supplier->s_company ?? ''),
            (string) ($supplier->s_name ?? ''),
        ];

        $normalizedCandidates = collect($candidates)
            ->map(fn (string $value) => strtolower(preg_replace('/[^a-z0-9]/i', '', trim($value)) ?? ''))
            ->filter(fn (string $value) => $value !== '')
            ->values();

        if ($normalizedCandidates->isEmpty()) {
            return null;
        }

        $brands = $brands ?? ProductBrand::query()->select(['pb_id', 'pb_name', 'pb_image'])->get();
        foreach ($brands as $brand) {
            $brandKey = strtolower(preg_replace('/[^a-z0-9]/i', '', (string) ($brand->pb_name ?? '')) ?? '');
            if ($brandKey !== '' && $normalizedCandidates->contains($brandKey)) {
                return $brand->pb_image ? (string) $brand->pb_image : null;
            }
        }

        $bestScore = 0;
        $bestBrand = null;
        foreach ($brands as $brand) {
            $brandKey = strtolower(preg_replace('/[^a-z0-9]/i', '', (string) ($brand->pb_name ?? '')) ?? '');
            if ($brandKey === '' || strlen($brandKey) < 2) {
                continue;
            }

            foreach ($normalizedCandidates as $candidate) {
                $similarity = 0;
                similar_text($candidate, $brandKey, $similarity);
                if ($similarity > $bestScore) {
                    $bestScore = $similarity;
                    $bestBrand = $brand;
                }
            }
        }

        return $bestBrand && $bestBrand->pb_image ? (string) $bestBrand->pb_image : null;
    }
}
