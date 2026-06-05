<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierChatMessage extends Model
{
    use HasFactory;

    protected $table = 'tbl_supplier_chat_messages';

    protected $fillable = [
        'conversation_id',
        'sender_type',
        'sender_admin_id',
        'sender_supplier_user_id',
        'message',
        'attachment_url',
        'attachment_type',
        'attachment_name',
        'read_at',
        'reactions',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'reactions' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(SupplierChatConversation::class, 'conversation_id');
    }

    public function senderAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'sender_admin_id', 'id');
    }

    public function senderSupplierUser(): BelongsTo
    {
        return $this->belongsTo(SupplierUser::class, 'sender_supplier_user_id', 'su_id');
    }
}
