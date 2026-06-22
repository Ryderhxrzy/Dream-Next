<?php

namespace App\Mail\Checkout;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AbandonedCheckoutReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array $payload {
     *   customer_name: string,
     *   items: array<array{name:string, quantity:int, amount:float, image?:?string}>,
     *   total: float,
     *   currency: string,
     *   resume_url: string,
     *   reminder_number: int
     * }
     */
    public function __construct(public array $payload)
    {
    }

    public function build(): self
    {
        $reminderNumber = (int) ($this->payload['reminder_number'] ?? 1);
        $subject = $reminderNumber > 1
            ? 'Still interested? Your AF Home order is waiting'
            : 'You left something behind — complete your AF Home order';

        return $this
            ->subject($subject)
            ->view('emails.checkout.abandoned-reminder')
            ->with(['payload' => $this->payload]);
    }
}
