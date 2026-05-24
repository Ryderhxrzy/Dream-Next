<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class CloudinaryUploadService
{
    public function uploadImage(UploadedFile $file, string $folder = 'afhome/expenses/invoices', bool $requireCloudinary = false): array
    {
        return $this->uploadFile($file, $folder, 'image', $requireCloudinary);
    }

    public function uploadVideo(UploadedFile $file, string $folder = 'afhome/reviews/videos', bool $requireCloudinary = false): array
    {
        return $this->uploadFile($file, $folder, 'video', $requireCloudinary);
    }

    private function uploadFile(UploadedFile $file, string $folder, string $resourceType, bool $requireCloudinary = false): array
    {
        $cloudName = trim((string) config('services.cloudinary.cloud_name', env('CLOUDINARY_CLOUD_NAME', '')));
        $apiKey = trim((string) config('services.cloudinary.api_key', env('CLOUDINARY_API_KEY', '')));
        $apiSecret = trim((string) config('services.cloudinary.api_secret', env('CLOUDINARY_API_SECRET', '')));

        if ($cloudName === '' || $apiKey === '' || $apiSecret === '') {
            if ($requireCloudinary) {
                throw new RuntimeException('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
            }
            return $this->uploadToLocalPublicDisk($file, $folder, $resourceType);
        }

        $timestamp = time();
        $folder = trim($folder, '/');

        $signatureBase = "folder={$folder}&timestamp={$timestamp}{$apiSecret}";
        $signature = sha1($signatureBase);

        $endpoint = "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/upload";

        $timeoutSeconds = $resourceType === 'video' ? 180 : 30;
        try {
            $stream = fopen($file->getRealPath(), 'rb');
            if ($stream === false) {
                throw new RuntimeException('Failed to read upload file stream.');
            }

            $response = Http::timeout($timeoutSeconds)
                ->connectTimeout(20)
                ->attach(
                    'file',
                    $stream,
                    $file->getClientOriginalName()
                )
                ->asMultipart()
                ->post($endpoint, [
                    'api_key' => $apiKey,
                    'timestamp' => (string) $timestamp,
                    'folder' => $folder,
                    'signature' => $signature,
                ]);
        } catch (Throwable $exception) {
            if ($requireCloudinary) {
                throw new RuntimeException('Cloudinary upload failed: ' . $exception->getMessage());
            }
            return $this->uploadToLocalPublicDisk($file, $folder, $resourceType);
        } finally {
            if (isset($stream) && is_resource($stream)) {
                fclose($stream);
            }
        }

        if (! $response->ok()) {
            $message = (string) data_get($response->json(), 'error.message', 'Cloudinary upload failed.');
            if ($requireCloudinary) {
                throw new RuntimeException($message);
            }
            return $this->uploadToLocalPublicDisk($file, $folder, $resourceType);
        }

        $payload = $response->json();
        $secureUrl = (string) data_get($payload, 'secure_url', '');
        $publicId = (string) data_get($payload, 'public_id', '');

        if ($secureUrl === '' || $publicId === '') {
            throw new RuntimeException('Cloudinary returned an invalid upload response.');
        }

        return [
            'secure_url' => $secureUrl,
            'public_id' => $publicId,
        ];
    }

    private function uploadToLocalPublicDisk(UploadedFile $file, string $folder, string $resourceType): array
    {
        $folder = trim($folder, '/');
        $safeFolder = $folder !== '' ? $folder : "afhome/{$resourceType}s";
        $extension = $file->getClientOriginalExtension() ?: $file->extension() ?: ($resourceType === 'video' ? 'mp4' : 'jpg');
        $filename = Str::uuid()->toString() . '.' . strtolower($extension);
        $relativePath = trim($safeFolder . '/' . $filename, '/');

        $storedPath = Storage::disk('public')->putFileAs($safeFolder, $file, $filename);
        if (! $storedPath) {
            throw new RuntimeException('Failed to store uploaded file.');
        }

        $publicUrl = url(Storage::url($relativePath));

        return [
            'secure_url' => $publicUrl,
            'public_id' => $relativePath,
        ];
    }
}
