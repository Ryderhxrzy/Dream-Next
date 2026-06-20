<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductBrand extends Model
{
    protected $table = 'tbl_product_brand';
    protected $primaryKey = 'pb_id';
    public $timestamps = false;

    protected $fillable = [
        'pb_name',
        'pb_image',
        'pb_status',
        'pb_supplier_id',
    ];

    protected $casts = [
        'pb_status' => 'integer',
        'pb_supplier_id' => 'integer',
    ];

    /**
     * The merchant (tbl_supplier) that owns this brand.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'pb_supplier_id', 's_id');
    }
}
