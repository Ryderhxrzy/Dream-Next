<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierBrandHomeBanner extends Model
{
    protected $table = 'tbl_supplier_brand_home_banners';
    protected $primaryKey = 'sbhb_id';

    protected $fillable = [
        'sbhb_section_id',
        'sbhb_image_url',
        'sbhb_link_type',
        'sbhb_link_target',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(SupplierBrandHomeSection::class, 'sbhb_section_id', 'sbhs_id');
    }
}
