<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierBrandHomeSectionProduct extends Model
{
    protected $table = 'tbl_supplier_brand_home_section_products';
    protected $primaryKey = 'sbhsp_id';

    protected $fillable = [
        'sbhsp_product_section_id',
        'sbhsp_product_id',
        'sbhsp_order',
    ];

    protected $casts = [
        'sbhsp_order' => 'integer',
    ];

    public function productSection(): BelongsTo
    {
        return $this->belongsTo(SupplierBrandHomeProductSection::class, 'sbhsp_product_section_id', 'sbhps_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'sbhsp_product_id', 'pd_id');
    }
}
