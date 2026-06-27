<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierBrandHomeProductSection extends Model
{
    protected $table = 'tbl_supplier_brand_home_product_sections';
    protected $primaryKey = 'sbhps_id';

    protected $fillable = [
        'sbhps_section_id',
        'sbhps_label',
        'sbhps_button_text',
        'sbhps_button_link',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(SupplierBrandHomeSection::class, 'sbhps_section_id', 'sbhs_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(SupplierBrandHomeSectionProduct::class, 'sbhsp_product_section_id', 'sbhps_id')
            ->orderBy('sbhsp_order');
    }
}
