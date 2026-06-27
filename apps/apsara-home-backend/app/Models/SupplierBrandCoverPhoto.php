<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierBrandCoverPhoto extends Model
{
    protected $table = 'tbl_supplier_brand_cover_photos';
    protected $primaryKey = 'sbcp_id';

    protected $fillable = [
        'sbcp_supplier_id',
        'sbcp_brand_id',
        'sbcp_image_url',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(ProductBrand::class, 'sbcp_brand_id', 'pb_id');
    }
}
