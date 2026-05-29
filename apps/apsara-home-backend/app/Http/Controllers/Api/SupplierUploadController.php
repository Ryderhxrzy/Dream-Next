<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SupplierUploadController extends Controller
{
    private function resolveSupplierUser(Request $request): ?SupplierUser
    {
        $user = $request->user();
        return $user instanceof SupplierUser ? $user : null;
    }

    public function uploadNotificationImage(Request $request)
    {
        $supplierUser = $this->resolveSupplierUser($request);

        if (!$supplierUser) {
            return response()->json(['message' => 'Only suppliers can access this.'], 403);
        }

        $validated = $request->validate([
            'file' => 'required|image|max:5120', // max 5MB
        ]);

        try {
            $file = $validated['file'];
            $cloudName = config('services.cloudinary.cloud_name');
            $apiKey = config('services.cloudinary.api_key');
            $apiSecret = config('services.cloudinary.api_secret');

            if (!$cloudName || !$apiKey || !$apiSecret) {
                return response()->json([
                    'message' => 'Cloudinary is not configured.',
                ], 500);
            }

            // Upload to Cloudinary
            $response = Http::asMultipart()->post(
                "https://api.cloudinary.com/v1_1/{$cloudName}/image/upload",
                [
                    'file' => $file,
                    'folder' => 'apsara/supplier/notifications',
                    'api_key' => $apiKey,
                    'timestamp' => time(),
                    'signature' => $this->generateTimestampSignature($apiSecret, time()),
                ]
            );

            if ($response->failed()) {
                throw new \Exception('Cloudinary upload failed');
            }

            $data = $response->json();

            return response()->json([
                'url' => $data['secure_url'],
                'message' => 'Image uploaded successfully.',
            ], 200);
        } catch (\Throwable $e) {
            \Log::error('Error uploading supplier notification image', [
                'supplier_id' => $supplierUser->su_supplier,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to upload image.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function generateTimestampSignature(string $apiSecret, int $timestamp): string
    {
        $toSign = "folder=apsara/supplier/notifications&timestamp={$timestamp}{$apiSecret}";
        return hash('sha256', $toSign);
    }

    public function generateCloudinarySignature(Request $request)
    {
        $paramsToSign = $request->input('params_to_sign', []);
        $apiSecret = config('services.cloudinary.api_secret');

        if (!$apiSecret) {
            return response()->json(['message' => 'Cloudinary is not configured.'], 500);
        }

        ksort($paramsToSign);
        $toSign = implode('&', array_map(
            fn($key) => "{$key}={$paramsToSign[$key]}",
            array_keys($paramsToSign)
        )) . $apiSecret;

        $signature = hash('sha256', $toSign);

        return response()->json(['signature' => $signature], 200);
    }
}
