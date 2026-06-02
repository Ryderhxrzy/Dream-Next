<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierWarehouse extends Model
{
    protected $table = 'tbl_supplier_warehouses';
    protected $primaryKey = 'sw_id';

    protected $fillable = [
        'sw_supplier_id',
        'sw_name',
        'sw_address',
        'sw_image_url',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'sw_supplier_id', 's_id');
    }
}
