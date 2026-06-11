<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyCheckin extends Model
{
    protected $table = 'tbl_daily_checkins';
    protected $primaryKey = 'dc_id';

    protected $fillable = [
        'dc_customer_id',
        'dc_checkin_date',
        'dc_cycle_start',
        'dc_day_index',
        'dc_amount',
        'dc_streak',
        'dc_ledger_id',
        'dc_source_type',
    ];

    protected $casts = [
        'dc_checkin_date' => 'date',
        'dc_cycle_start'  => 'date',
        'dc_day_index'    => 'integer',
        'dc_amount'       => 'float',
        'dc_streak'       => 'integer',
        'dc_ledger_id'    => 'integer',
    ];
}
