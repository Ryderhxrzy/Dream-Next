<?php

namespace App\Jobs;

use App\Services\SemaphoreService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSmsBlastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param array<int, array{phone:string,name:string,first_name:string,last_name:string,username:string,registered_at:string}> $recipientRows
     */
    public function __construct(
        public string $subject,
        public string $body,
        public array $recipientRows,
        public string $senderName = 'AFHome'
    ) {
    }

    public function handle(SemaphoreService $semaphoreService): void
    {
        $sentCount = 0;
        $failedCount = 0;
        $failedPhones = [];
        $message = trim($this->subject . "\n\n" . $this->body);

        foreach ($this->recipientRows as $recipient) {
            try {
                $variables = $this->buildPersonalizationVariables($recipient);
                $personalizedMessage = $this->applyTemplateVariables($message, $variables);
                $ok = $semaphoreService->sendMessage(
                    phoneNumber: (string) $recipient['phone'],
                    message: $personalizedMessage,
                    senderName: $this->senderName
                );

                if ($ok) {
                    $sentCount++;
                } else {
                    $failedCount++;
                    $failedPhones[] = (string) ($recipient['phone'] ?? '');
                }
            } catch (\Throwable $e) {
                $failedCount++;
                $failedPhones[] = (string) ($recipient['phone'] ?? '');
                Log::error('Scheduled SMS blast failed', [
                    'recipient' => (string) ($recipient['phone'] ?? ''),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Scheduled SMS blast completed', [
            'sent' => $sentCount,
            'failed' => $failedCount,
            'failed_phones' => $failedPhones,
            'scheduled_for' => Carbon::now()->toIso8601String(),
        ]);
    }

    /**
     * @param array{phone:string,name:string,first_name:string,last_name:string,username:string,registered_at:string} $recipient
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
            'customer_email' => '',
            'email' => '',
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
