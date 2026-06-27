<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SupplierBrandHomeSection extends Model
{
    protected $table = 'tbl_supplier_brand_home_sections';
    protected $primaryKey = 'sbhs_id';

    protected $fillable = [
        'sbhs_supplier_id',
        'sbhs_brand_id',
        'sbhs_type',
        'sbhs_order',
        'sbhs_is_active',
    ];

    protected $casts = [
        'sbhs_is_active' => 'boolean',
        'sbhs_order' => 'integer',
    ];

    public function banner(): HasOne
    {
        return $this->hasOne(SupplierBrandHomeBanner::class, 'sbhb_section_id', 'sbhs_id');
    }

    public function carouselItems(): HasMany
    {
        return $this->hasMany(SupplierBrandHomeCarouselItem::class, 'sbhci_section_id', 'sbhs_id')
            ->orderBy('sbhci_order');
    }

    public function productSection(): HasOne
    {
        return $this->hasOne(SupplierBrandHomeProductSection::class, 'sbhps_section_id', 'sbhs_id');
    }
}
