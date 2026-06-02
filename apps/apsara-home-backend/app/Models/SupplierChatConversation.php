<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SupplierChatConversation extends Model
{
    use HasFactory;

    protected $table = 'tbl_supplier_chat_conversations';

    protected $fillable = [
        'supplier_user_id',
        'assigned_admin_id',
        'status',
        'subject',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function supplierUser(): BelongsTo
    {
        return $this->belongsTo(SupplierUser::class, 'supplier_user_id', 'su_id');
    }

    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'assigned_admin_id', 'id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupplierChatMessage::class, 'conversation_id')->orderBy('created_at');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(SupplierChatMessage::class, 'conversation_id')->latestOfMany('created_at');
    }
}
