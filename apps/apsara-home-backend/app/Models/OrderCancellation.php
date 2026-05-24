<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderCancellation extends Model
{
    protected $table = 'tbl_order_cancellations';
    protected $primaryKey = 'oc_id';

    protected $fillable = [
        'oc_order_id',
        'oc_customer_id',
        'oc_cancellation_reason',
        'oc_reason_label',
        'oc_cancellation_notes',
        'oc_refund_amount',
        'oc_refund_status',
        'oc_refund_id',
        'oc_cancelled_at',
        'oc_refund_processed_at',
    ];

    protected $casts = [
        'oc_refund_amount' => 'float',
        'oc_cancelled_at' => 'datetime',
        'oc_refund_processed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(CheckoutHistory::class, 'oc_order_id', 'ch_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'oc_customer_id', 'c_userid');
    }
}
