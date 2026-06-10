<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QaTestStatus extends Model
{
    protected $table = 'tbl_qa_test_statuses';
    protected $primaryKey = 'qts_id';

    protected $fillable = [
        'qts_test_id',
        'qts_status',
        'qts_note',
        'qts_updated_by',
    ];
}
