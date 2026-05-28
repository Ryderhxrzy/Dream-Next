<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SemaphoreService
{
    private const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4';
    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = (string) config('services.semaphore.key');
    }

    public function sendOtp(string $phoneNumber, string $otp, ?string $senderName = 'AFHome'): bool
    {
        try {
            $message = "AF Home Verification Code: {$otp}\nWelcome to AF Home! Use this code to complete your registration.";

            // Log OTP for local testing (remove in production)
            if (config('app.env') === 'local') {
                Log::info('Semaphore OTP (LOCAL TESTING)', [
                    'otp' => $otp,
                    'phone' => $phoneNumber,
                ]);
            }

            $response = Http::post(self::SEMAPHORE_API_URL . '/messages', [
                'apikey' => $this->apiKey,
                'number' => $this->normalizePhoneNumber($phoneNumber),
                'message' => $message,
                'sendername' => $senderName,
            ]);

            if ($response->successful()) {
                Log::info('Semaphore OTP sent successfully', [
                    'phone' => $this->maskPhoneNumber($phoneNumber),
                    'response' => $response->json(),
                ]);
                return true;
            }

            Log::error('Semaphore OTP send failed', [
                'phone' => $this->maskPhoneNumber($phoneNumber),
                'status' => $response->status(),
                'response' => $response->json(),
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('Semaphore OTP exception', [
                'phone' => $this->maskPhoneNumber($phoneNumber),
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function sendMessage(string $phoneNumber, string $message, ?string $senderName = 'AFHome'): bool
    {
        try {
            $response = Http::post(self::SEMAPHORE_API_URL . '/messages', [
                'apikey' => $this->apiKey,
                'number' => $this->normalizePhoneNumber($phoneNumber),
                'message' => $message,
                'sendername' => $senderName,
            ]);

            if ($response->successful()) {
                Log::info('Semaphore message sent successfully', [
                    'phone' => $this->maskPhoneNumber($phoneNumber),
                ]);
                return true;
            }

            Log::error('Semaphore message send failed', [
                'phone' => $this->maskPhoneNumber($phoneNumber),
                'status' => $response->status(),
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('Semaphore message exception', [
                'phone' => $this->maskPhoneNumber($phoneNumber),
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    private function normalizePhoneNumber(string $phoneNumber): string
    {
        $number = preg_replace('/[^0-9]/', '', $phoneNumber);

        if (str_starts_with($number, '0')) {
            $number = '63' . substr($number, 1);
        } elseif (!str_starts_with($number, '63')) {
            $number = '63' . $number;
        }

        return $number;
    }

    private function maskPhoneNumber(string $phoneNumber): string
    {
        $normalized = $this->normalizePhoneNumber($phoneNumber);
        return substr($normalized, 0, 4) . '***' . substr($normalized, -3);
    }
}
