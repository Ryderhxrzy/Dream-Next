<?php

namespace App\Mail\Webstore;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class WebstoreReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public array $payload)
    {
    }

    public function build(): self
    {
        return $this
            ->subject('Webstore Receipt Confirmation - AF Home')
            ->view('emails.webstore.receipt')
            ->with([
                'payload' => $this->payload,
            ]);
    }
}
