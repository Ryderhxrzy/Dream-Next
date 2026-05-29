<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierPushNotification extends Model
{
    protected $table = 'tbl_supplier_push_notifications';
    protected $primaryKey = 'spn_id';
    public $timestamps = false;

    protected $fillable = [
        'spn_supplier_id',
        'spn_title',
        'spn_body',
        'spn_image',
        'spn_recipients',
        'spn_sent_count',
        'spn_failed_count',
        'spn_sent_at',
        'spn_scheduled_at',
        'spn_status',
        'spn_created_at',
        'spn_updated_at',
    ];

    protected $casts = [
        'spn_recipients' => 'array',
        'spn_sent_at' => 'datetime',
        'spn_scheduled_at' => 'datetime',
        'spn_created_at' => 'datetime',
        'spn_updated_at' => 'datetime',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'spn_supplier_id');
    }
}
