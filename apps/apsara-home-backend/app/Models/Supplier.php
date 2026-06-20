<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $table = 'tbl_supplier';
    protected $primaryKey = 's_id';
    public $timestamps = false;

    protected $fillable = [
        's_name',
        's_company',
        's_email',
        's_contact',
        's_address',
        's_logo',
        's_brand_id',
        's_warehouse_name',
        's_warehouse_address',
        's_warehouse_latitude',
        's_warehouse_longitude',
        's_warehouse_image_url',
        's_status',
    ];

    protected $casts = [
        's_brand_id' => 'integer',
    ];

    public function warehouses(): HasMany
    {
        return $this->hasMany(SupplierWarehouse::class, 'sw_supplier_id', 's_id');
    }

    /**
     * The brand a merchant/supplier is linked to (one brand per merchant).
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(ProductBrand::class, 's_brand_id', 'pb_id');
    }
}
