<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ZqCategoryMapping extends Model
{
    protected $table = 'tbl_zq_category_mappings';
    protected $primaryKey = 'zqcm_id';

    protected $fillable = [
        'zq_category_id',
        'zq_category_name',
        'zq_category_key',
        'local_category_id',
        'is_active',
    ];

    protected $casts = [
        'local_category_id' => 'integer',
        'is_active' => 'boolean',
    ];
}
