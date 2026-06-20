<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandRequest extends Model
{
    protected $table = 'tbl_brand_requests';
    protected $primaryKey = 'br_id';

    protected $fillable = [
        'br_supplier_id',
        'br_name',
        'br_image',
        'br_note',
        'br_status',
        'br_admin_reason',
        'br_created_brand_id',
        'br_handled_by',
        'br_seen_by_merchant',
        'br_decided_at',
    ];

    protected $casts = [
        'br_supplier_id' => 'integer',
        'br_created_brand_id' => 'integer',
        'br_handled_by' => 'integer',
        'br_seen_by_merchant' => 'boolean',
        'br_decided_at' => 'datetime',
    ];

    /**
     * The merchant (tbl_supplier) that submitted this request.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'br_supplier_id', 's_id');
    }
}
