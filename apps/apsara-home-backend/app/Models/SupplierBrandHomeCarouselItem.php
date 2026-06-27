<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierBrandHomeCarouselItem extends Model
{
    protected $table = 'tbl_supplier_brand_home_carousel_items';
    protected $primaryKey = 'sbhci_id';

    protected $fillable = [
        'sbhci_section_id',
        'sbhci_image_url',
        'sbhci_order',
        'sbhci_link_type',
        'sbhci_link_target',
    ];

    protected $casts = [
        'sbhci_order' => 'integer',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(SupplierBrandHomeSection::class, 'sbhci_section_id', 'sbhs_id');
    }
}
