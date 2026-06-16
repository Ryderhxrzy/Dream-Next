<?php

namespace App\Mail\Webstore;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class WebstoreExpiryReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public array $payload)
    {
    }

    public function build(): self
    {
        $daysLeft = (int) ($this->payload['days_left'] ?? 0);
        $subject = $daysLeft === 1
            ? 'Your Webstore Subscription Expires Tomorrow - AF Home'
            : "Your Webstore Subscription Expires in {$daysLeft} Days - AF Home";

        return $this
            ->subject($subject)
            ->view('emails.webstore.expiry-reminder')
            ->with(['payload' => $this->payload]);
    }
}
