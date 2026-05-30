<?php

namespace App\Jobs;

use App\Mail\Admin\EmailBlastMail;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendEmailBlastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param array<int, array{email:string,name:string,first_name:string,last_name:string,username:string,registered_at:string}> $recipientRows
     * @param array<int, string> $attachments
     */
    public function __construct(
        public string $subject,
        public string $body,
        public array $recipientRows,
        public string $brandName = 'AF Home',
        public ?string $bannerImageBase64 = null,
        public array $attachments = []
    ) {
    }

    public function handle(): void
    {
        $sentCount = 0;
        $failedCount = 0;
        $failedEmails = [];

        foreach ($this->recipientRows as $recipient) {
            try {
                $variables = $this->buildPersonalizationVariables($recipient);
                $personalizedSubject = $this->applyTemplateVariables($this->subject, $variables);
                $personalizedBody = $this->applyTemplateVariables($this->body, $variables);

                Mail::to($recipient['email'])
                    ->send(new EmailBlastMail(
                        subject: $personalizedSubject,
                        body: $personalizedBody,
                        brandName: $this->brandName,
                        bannerImageBase64: $this->bannerImageBase64,
                        attachments: $this->attachments
                    ));

                $sentCount++;
            } catch (\Throwable $e) {
                $failedCount++;
                $failedEmails[] = (string) ($recipient['email'] ?? '');
                Log::error('Scheduled email blast failed', [
                    'recipient' => (string) ($recipient['email'] ?? ''),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Scheduled email blast completed', [
            'sent' => $sentCount,
            'failed' => $failedCount,
            'failed_emails' => $failedEmails,
            'scheduled_for' => Carbon::now()->toIso8601String(),
        ]);
    }

    /**
     * @param array{email:string,name:string,first_name:string,last_name:string,username:string,registered_at:string} $recipient
     * @return array<string,string>
     */
    private function buildPersonalizationVariables(array $recipient): array
    {
        $now = now();

        return [
            'customer_name' => (string) ($recipient['name'] ?? 'Customer'),
            'first_name' => (string) ($recipient['first_name'] ?? 'Customer'),
            'last_name' => (string) ($recipient['last_name'] ?? ''),
            'username' => (string) ($recipient['username'] ?? 'member'),
            'customer_email' => (string) ($recipient['email'] ?? ''),
            'email' => (string) ($recipient['email'] ?? ''),
            'store_name' => 'AF Home',
            'current_date' => $now->format('F j, Y'),
            'current_time' => $now->format('g:i A'),
            'current_year' => $now->format('Y'),
            'member_since' => (string) ($recipient['registered_at'] ?? ''),
            'support_email' => (string) config('mail.from.address', 'support@afhome.com'),
        ];
    }

    /**
     * @param array<string,string> $variables
     */
    private function applyTemplateVariables(string $content, array $variables): string
    {
        $result = $content;
        foreach ($variables as $key => $value) {
            $escapedKey = preg_quote((string) $key, '/');
            $result = (string) preg_replace(
                '/\{\{[\s\x{00A0}]*' . $escapedKey . '[\s\x{00A0}]*\}\}/iu',
                $value,
                $result
            );
        }

        return $result;
    }
}
