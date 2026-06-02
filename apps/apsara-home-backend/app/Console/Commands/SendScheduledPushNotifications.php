<?php

namespace App\Console\Commands;

use App\Jobs\SendScheduledPushNotificationJob;
use App\Models\SupplierPushNotification;
use Illuminate\Console\Command;

class SendScheduledPushNotifications extends Command
{
    protected $signature = 'notifications:send-scheduled';
    protected $description = 'Send scheduled push notifications';

    public function handle(): int
    {
        SupplierPushNotification::where('spn_status', 'pending')
            ->where('spn_scheduled_at', '<=', now())
            ->get()
            ->each(fn($notification) => SendScheduledPushNotificationJob::dispatch($notification->id));

        return self::SUCCESS;
    }
}
