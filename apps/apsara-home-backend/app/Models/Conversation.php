<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Conversation extends Model
{
    use HasFactory;

    protected $table = 'tbl_conversations';

    protected $fillable = [
        'user_id',
        'assigned_agent_id',
        'status',
        'subject',
        'description',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the customer who initiated this conversation
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'user_id', 'c_userid');
    }

    /**
     * Get the agent assigned to this conversation
     */
    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'assigned_agent_id', 'id');
    }

    /**
     * Get all messages in this conversation
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversation_id')
            ->orderBy('created_at')
            ->orderBy('id');
    }

    /**
     * Get latest message
     */
    public function latestMessage(): HasMany
    {
        // reorder() clears the ASC order from messages(); otherwise ->latest()
        // would conflict and resolve to the oldest message.
        return $this->messages()
            ->reorder()
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * If this is an order thread (subject = "Order {checkout_id}"), resolve the
     * linked order so the chat header can show its name, price and status.
     * Subject-based — no extra column needed. Returns null for non-order threads.
     */
    public function orderInfo(): ?array
    {
        $subject = (string) $this->subject;
        if (!Str::startsWith($subject, 'Order ')) {
            return null;
        }

        $reference = trim(Str::after($subject, 'Order '));
        if ($reference === '') {
            return null;
        }

        $order = CheckoutHistory::where('ch_checkout_id', $reference)->first();

        return [
            'reference' => $reference,
            'product_name' => $order?->ch_product_name ?? $order?->ch_description,
            'amount' => ($order && $order->ch_amount !== null) ? (float) $order->ch_amount : null,
            'quantity' => $order ? (int) $order->ch_quantity : null,
            'payment_status' => $order?->ch_status,
            'approval_status' => $order?->ch_approval_status,
            'fulfillment_status' => $order?->ch_fulfillment_status,
        ];
    }

    /**
     * Get all conversation participants
     */
    public function participants()
    {
        return $this->hasMany(ConversationParticipant::class, 'conversation_id');
    }

    /**
     * Check if conversation is open
     */
    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    /**
     * Check if conversation is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if conversation is resolved
     */
    public function isResolved(): bool
    {
        return $this->status === 'resolved';
    }

    /**
     * Mark conversation as resolved
     */
    public function markAsResolved(): void
    {
        $this->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);
    }

    /**
     * Mark conversation as pending
     */
    public function markAsPending(): void
    {
        $this->update([
            'status' => 'pending',
            'resolved_at' => null,
        ]);
    }

    /**
     * Mark conversation as open
     */
    public function markAsOpen(): void
    {
        $this->update([
            'status' => 'open',
            'resolved_at' => null,
        ]);
    }

    /**
     * Assign agent to conversation
     */
    public function assignAgent(Admin $agent): void
    {
        // Optionally add validation for agent role/permissions
        $this->update(['assigned_agent_id' => $agent->user_id ?? $agent->id]);
    }

    /**
     * Unassign agent from conversation
     */
    public function unassignAgent(): void
    {
        $this->update(['assigned_agent_id' => null]);
    }

    /**
     * Get unread message count
     */
    public function unreadMessageCount(): int
    {
        return $this->messages()
            ->whereNull('read_at')
            ->where('sender_id', '!=', auth()->id())
            ->count();
    }

    /**
     * Add participant to conversation
     */
    public function addParticipant(int $userId): void
    {
        ConversationParticipant::firstOrCreate([
            'conversation_id' => $this->id,
            'user_id' => $userId,
        ]);
    }

    /**
     * Remove participant from conversation
     */
    public function removeParticipant(int $userId): void
    {
        $this->participants()
            ->where('user_id', $userId)
            ->update(['left_at' => now()]);
    }
}
