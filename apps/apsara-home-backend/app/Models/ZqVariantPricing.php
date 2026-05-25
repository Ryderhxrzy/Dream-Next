<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ZqVariantPricing extends Model
{
    protected $table      = 'tbl_zqproduct_variant_pricing';
    protected $primaryKey = 'zvp_id';

    protected $fillable = [
        'zvp_external_id',
        'zvp_sku_id',
        'zvp_dealer_price',
        'zvp_member_price',
        'zvp_pv',
    ];

    protected $casts = [
        'zvp_dealer_price' => 'integer',
        'zvp_member_price' => 'integer',
        'zvp_pv'           => 'decimal:2',
    ];
}
