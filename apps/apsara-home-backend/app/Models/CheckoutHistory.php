<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class CheckoutHistory extends Model
{
    protected $table = 'tbl_checkout_history';
    protected $primaryKey = 'ch_id';

    /**
     * ch_status values for a checkout that was started but not yet paid and is
     * still recoverable (a payment may still complete). Excludes terminal
     * states such as paid / failed / cancelled / expired / abandoned.
     */
    public const OPEN_UNPAID_STATUSES = ['pending', 'active', 'unpaid'];

    /** Terminal status for a checkout that was never paid within the window. */
    public const STATUS_ABANDONED = 'abandoned';

    protected $fillable = [
        'ch_customer_id',
        'ch_referrer_customer_id',
        'ch_referral_source_type',
        'ch_checkout_id',
        'ch_payment_intent_id',
        'ch_payment_id',
        'ch_mobile_order_id',
        'ch_status',
        'ch_approval_status',
        'ch_approval_notes',
        'ch_approved_by',
        'ch_approved_at',
        'ch_fulfillment_status',
        'ch_description',
        'ch_amount',
        'ch_shipping_fee',
        'ch_payment_method',
        'ch_quantity',
        'ch_product_name',
        'ch_product_id',
        'ch_product_sku',
        'ch_product_pv',
        'ch_earned_pv',
        'ch_commission_basis_amount',
        'ch_pv_posted_at',
        'ch_product_image',
        'ch_selected_color',
        'ch_selected_size',
        'ch_selected_type',
        'ch_customer_name',
        'ch_customer_email',
        'ch_customer_phone',
        'ch_customer_address',
        'ch_source_label',
        'ch_source_slug',
        'ch_source_host',
        'ch_source_url',
        'ch_courier',
        'ch_tracking_no',
        'ch_shipment_status',
        'ch_shipment_payload',
        'ch_refund_reason',
        'ch_refund_image_urls',
        'ch_refund_video_urls',
        'ch_refund_requested_at',
        'ch_shipped_at',
        'ch_zq_platform_order_id',
        'ch_zq_order_id',
        'ch_zq_status',
        'ch_zq_payload',
        'ch_zq_response',
        'ch_zq_synced_at',
        'ch_paid_at',
        'ch_checkout_url',
        'ch_abandoned_at',
        'ch_reminder_count',
        'ch_last_reminder_at',
    ];

    protected $casts = [
        'ch_amount' => 'float',
        'ch_shipping_fee' => 'float',
        'ch_quantity' => 'integer',
        'ch_product_pv' => 'float',
        'ch_earned_pv' => 'float',
        'ch_commission_basis_amount' => 'float',
        'ch_paid_at' => 'datetime',
        'ch_approved_at' => 'datetime',
        'ch_pv_posted_at' => 'datetime',
        'ch_shipped_at' => 'datetime',
        'ch_shipment_payload' => 'array',
        'ch_refund_image_urls' => 'array',
        'ch_refund_video_urls' => 'array',
        'ch_refund_requested_at' => 'datetime',
        'ch_zq_payload' => 'array',
        'ch_zq_response' => 'array',
        'ch_zq_synced_at' => 'datetime',
        'ch_reminder_count' => 'integer',
        'ch_abandoned_at' => 'datetime',
        'ch_last_reminder_at' => 'datetime',
    ];

    /**
     * Scope to checkouts that were started but never paid and have aged past
     * the grace period — i.e. abandoned (including ones already marked
     * terminally abandoned). Offline payment methods (e.g. COD) are excluded.
     */
    public function scopeAbandoned(Builder $query): Builder
    {
        $grace = (int) config('checkout.abandoned.grace_minutes', 60);

        $query->whereNull('ch_paid_at')
            ->whereIn('ch_status', array_merge(self::OPEN_UNPAID_STATUSES, [self::STATUS_ABANDONED]))
            ->where('created_at', '<=', now()->subMinutes($grace));

        $offline = array_values(array_filter(array_map(
            'strtolower',
            (array) config('checkout.abandoned.offline_payment_methods', [])
        )));

        if (!empty($offline)) {
            $query->whereNotIn(DB::raw('LOWER(ch_payment_method)'), $offline);
        }

        return $query;
    }
}
