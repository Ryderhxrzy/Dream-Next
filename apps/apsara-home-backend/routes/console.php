<?php

use App\Models\AdminNotification;
use App\Models\CheckoutHistory;
use App\Models\CustomerNotification;
use App\Models\Supplier;
use App\Models\SystemSetting;
use App\Services\DatabaseExportService;
use App\Services\GoogleDriveUploadService;
use App\Services\Payments\PaymongoPaymentSyncService;
use App\Services\Zq\ZqApiService;
use App\Services\Zq\ZqProductSyncService;
use App\Services\Zq\ZqTrackingSyncService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;
use Pusher\Pusher;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('backend:check', function () {
    $migrationTableExists = Schema::hasTable('migrations');
    $migrationCount = $migrationTableExists ? DB::table('migrations')->count() : 0;
    $latestMigration = $migrationTableExists
        ? DB::table('migrations')->orderByDesc('id')->value('migration')
        : null;

    $this->newLine();
    $this->info('Backend check OK');
    $this->line('App: ' . config('app.name'));
    $this->line('Environment: ' . app()->environment());
    $this->line('Database connection: ' . DB::connection()->getName());
    $this->line('Database name: ' . config('database.connections.' . config('database.default') . '.database'));
    $this->line('Migrations table: ' . ($migrationTableExists ? 'found' : 'missing'));
    $this->line('Migration count: ' . $migrationCount);
    $this->line('Latest migration: ' . ($latestMigration ?? 'none'));
    $this->newLine();
})->purpose('Print a quick backend and migration status check');

Artisan::command('payments:sync-pending {--limit=25}', function () {
    /** @var PaymongoPaymentSyncService $service */
    $service = app(PaymongoPaymentSyncService::class);
    $summary = $service->syncPendingOrders((int) $this->option('limit'));

    $this->newLine();
    $this->info('PayMongo pending payment sync completed.');
    $this->line('Processed: ' . (int) ($summary['processed'] ?? 0));
    $this->line('Updated: ' . (int) ($summary['updated'] ?? 0));
    $this->line('Skipped: ' . (int) ($summary['skipped'] ?? 0));

    $errors = $summary['errors'] ?? [];
    if (! empty($errors)) {
        $this->warn('Errors:');
        foreach ($errors as $error) {
            $this->line('- ' . $error);
        }
    }

    $this->newLine();
})->purpose('Reconcile recent pending checkout sessions with PayMongo');

Artisan::command('zq:sync-tracking {--limit=25}', function () {
    /** @var ZqTrackingSyncService $service */
    $service = app(ZqTrackingSyncService::class);
    $summary = $service->syncPendingOrders((int) $this->option('limit'));

    $this->newLine();
    $this->info('ZQ tracking sync completed.');
    $this->line('Processed: ' . (int) ($summary['processed'] ?? 0));
    $this->line('Updated: ' . (int) ($summary['updated'] ?? 0));
    $this->line('Skipped: ' . (int) ($summary['skipped'] ?? 0));

    $errors = $summary['errors'] ?? [];
    if (! empty($errors)) {
        $this->warn('Errors:');
        foreach ($errors as $error) {
            $this->line('- ' . $error);
        }
    }

    $this->newLine();
})->purpose('Sync pending ZQ tracking updates into local orders');

Artisan::command('zq:test-tracking {checkout_id? : Checkout ID to update, e.g. cs_xxx} {--tracking=TEST-ZQ-TRACK-123456 : Fake tracking number} {--status=shipped : Local fulfillment status} {--shipment=in_transit : Local shipment status} {--force : Allow this command outside local/testing environments}', function () {
    if (! app()->environment(['local', 'testing']) && ! $this->option('force')) {
        $this->error('This dev-only command is blocked outside local/testing. Add --force only if you really intend to run it here.');
        return self::FAILURE;
    }

    $checkoutId = trim((string) ($this->argument('checkout_id') ?? ''));
    $trackingNo = trim((string) $this->option('tracking'));
    $status = strtolower(trim((string) $this->option('status')));
    $shipmentStatus = strtolower(trim((string) $this->option('shipment')));
    $allowedStatuses = ['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    $allowedShipmentStatuses = ['for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned_to_sender', 'cancelled'];

    if ($trackingNo === '') {
        $this->error('Tracking number is required.');
        return self::FAILURE;
    }

    if (! in_array($status, $allowedStatuses, true)) {
        $this->error('Invalid status. Allowed: ' . implode(', ', $allowedStatuses));
        return self::FAILURE;
    }

    if (! in_array($shipmentStatus, $allowedShipmentStatuses, true)) {
        $this->error('Invalid shipment status. Allowed: ' . implode(', ', $allowedShipmentStatuses));
        return self::FAILURE;
    }

    $query = CheckoutHistory::query()
        ->where('ch_approval_status', 'approved')
        ->whereNotNull('ch_zq_platform_order_id')
        ->where('ch_zq_platform_order_id', '!=', '');

    if ($checkoutId !== '') {
        $query->where('ch_checkout_id', $checkoutId);
    }

    /** @var CheckoutHistory|null $order */
    $order = $query->orderByDesc('ch_id')->first();

    if (! $order) {
        $this->error($checkoutId !== ''
            ? "No approved pushed ZQ order found for {$checkoutId}."
            : 'No approved pushed ZQ order found.'
        );
        return self::FAILURE;
    }

    $now = now('Asia/Manila');
    $orderLabel = trim((string) ($order->ch_checkout_id ?? '')) ?: '#' . (int) $order->ch_id;
    $previousStatus = (string) ($order->ch_fulfillment_status ?? 'pending');
    $shipmentPayload = is_array($order->ch_shipment_payload) ? $order->ch_shipment_payload : [];
    $shipmentPayload['zq_test_tracking'] = [
        'trackNumber' => $trackingNo,
        'state' => strtoupper($status),
        'generated_at' => $now->toIso8601String(),
        'dev_only' => true,
    ];

    $order->fill([
        'ch_courier' => 'zq',
        'ch_tracking_no' => $trackingNo,
        'ch_shipment_status' => $shipmentStatus,
        'ch_fulfillment_status' => $status,
        'ch_zq_status' => strtoupper($status),
        'ch_zq_synced_at' => $now,
        'ch_shipment_payload' => $shipmentPayload,
    ]);

    if (in_array($status, ['shipped', 'out_for_delivery', 'delivered'], true)) {
        $order->ch_shipped_at = $order->ch_shipped_at ?: $now;
    }

    $order->save();

    $adminNotification = AdminNotification::query()->create([
        'an_type' => 'zq_test_tracking',
        'an_severity' => 'info',
        'an_title' => 'ZQ Test Tracking Applied',
        'an_message' => sprintf('Test tracking %s was applied to order %s.', $trackingNo, $orderLabel),
        'an_href' => '/admin/orders',
        'an_source_type' => 'order',
        'an_source_id' => (int) $order->ch_id,
        'an_payload' => [
            'order_id' => (int) $order->ch_id,
            'checkout_id' => trim((string) ($order->ch_checkout_id ?? '')),
            'tracking_no' => $trackingNo,
            'previous_status' => $previousStatus,
            'status' => $status,
            'shipment_status' => $shipmentStatus,
            'courier' => 'zq',
            'dev_only' => true,
        ],
        'an_created_at' => $now,
    ]);

    $customerNotification = null;
    $customerId = (int) ($order->ch_customer_id ?? 0);
    if ($customerId > 0) {
        $customerNotification = CustomerNotification::query()->create([
            'cn_customer_id' => $customerId,
            'cn_type' => 'zq_test_tracking',
            'cn_severity' => 'info',
            'cn_title' => 'Order Tracking Update',
            'cn_message' => sprintf('Your order %s now has tracking number %s.', $orderLabel, $trackingNo),
            'cn_href' => '/orders',
            'cn_source_type' => 'order',
            'cn_source_id' => (int) $order->ch_id,
            'cn_payload' => [
                'order_id' => (int) $order->ch_id,
                'checkout_id' => trim((string) ($order->ch_checkout_id ?? '')),
                'tracking_no' => $trackingNo,
                'status' => $status,
                'shipment_status' => $shipmentStatus,
                'courier' => 'zq',
                'dev_only' => true,
            ],
            'cn_created_at' => $now,
        ]);
    }

    $appId = (string) config('services.pusher.app_id', '');
    $key = (string) config('services.pusher.key', '');
    $secret = (string) config('services.pusher.secret', '');

    if ($appId !== '' && $key !== '' && $secret !== '') {
        try {
            $pusher = new Pusher($key, $secret, $appId, [
                'cluster' => (string) config('services.pusher.cluster', 'ap1'),
                'useTLS' => (bool) config('services.pusher.use_tls', true),
            ]);

            $createdAt = $now->toIso8601String();
            $pusher->trigger('private-admin-orders', 'notification.created', [
                'id' => (int) $adminNotification->an_id,
                'type' => (string) $adminNotification->an_type,
                'title' => (string) $adminNotification->an_title,
                'description' => (string) $adminNotification->an_message,
                'href' => (string) ($adminNotification->an_href ?? '/admin/orders'),
                'severity' => (string) ($adminNotification->an_severity ?? 'info'),
                'created_at' => $createdAt,
                'payload' => $adminNotification->an_payload,
            ]);

            if ($customerNotification && $customerId > 0) {
                $pusher->trigger('private-customer-' . $customerId, 'notification.created', [
                    'id' => 'customer_notification:' . (int) $customerNotification->cn_id,
                    'type' => (string) $customerNotification->cn_type,
                    'title' => (string) $customerNotification->cn_title,
                    'description' => (string) $customerNotification->cn_message,
                    'count' => 1,
                    'severity' => (string) ($customerNotification->cn_severity ?? 'info'),
                    'href' => (string) ($customerNotification->cn_href ?? '/orders'),
                    'latest_at' => $createdAt,
                    'created_at' => $createdAt,
                    'payload' => $customerNotification->cn_payload,
                ]);
            }

            $supplier = Supplier::query()
                ->get(['s_id', 's_name', 's_company'])
                ->first(function (Supplier $supplier) {
                    $candidate = strtolower(preg_replace('/[^a-z0-9]/i', '', trim(
                        ((string) ($supplier->s_company ?? '')) . ' ' . ((string) ($supplier->s_name ?? ''))
                    )) ?? '');

                    return str_contains($candidate, 'afhomeglobal')
                        || str_contains($candidate, 'globalsupplier')
                        || str_contains($candidate, 'zqsupplier');
                });

            if ($supplier) {
                $pusher->trigger('private-supplier-' . (int) $supplier->s_id, 'notification.created', [
                    'order_id' => (int) $order->ch_id,
                    'checkout_id' => trim((string) ($order->ch_checkout_id ?? '')),
                    'type' => 'zq_test_tracking',
                    'title' => 'ZQ Test Tracking Applied',
                    'description' => sprintf('Test tracking %s was applied to order %s.', $trackingNo, $orderLabel),
                    'href' => '/supplier/orders',
                    'created_at' => $createdAt,
                    'payload' => [
                        'order_id' => (int) $order->ch_id,
                        'checkout_id' => trim((string) ($order->ch_checkout_id ?? '')),
                        'tracking_no' => $trackingNo,
                        'status' => $status,
                        'shipment_status' => $shipmentStatus,
                        'courier' => 'zq',
                        'dev_only' => true,
                    ],
                ]);
            } else {
                $this->warn('Supplier realtime notification skipped: no global supplier found.');
            }
        } catch (Throwable $exception) {
            $this->warn('Order updated, but realtime Pusher publish failed: ' . $exception->getMessage());
        }
    } else {
        $this->warn('Order updated, but Pusher is not configured.');
    }

    $this->newLine();
    $this->info('ZQ test tracking applied.');
    $this->line('Order: ' . $orderLabel);
    $this->line('Tracking: ' . $trackingNo);
    $this->line('Fulfillment: ' . $previousStatus . ' -> ' . $status);
    $this->line('Shipment: ' . $shipmentStatus);
    $this->line('PH Time: ' . $now->toDateTimeString());
    $this->newLine();

    return self::SUCCESS;
})->purpose('Dev-only: simulate a ZQ tracking/status update and realtime notification');

Artisan::command('zq:test-supplier-notification {--supplier-id= : Specific supplier ID channel to notify} {--all : Send to every supplier channel for channel-mismatch testing} {--message=Supplier realtime test from ZQ flow. : Notification message} {--force : Allow this command outside local/testing environments}', function () {
    if (! app()->environment(['local', 'testing']) && ! $this->option('force')) {
        $this->error('This dev-only command is blocked outside local/testing. Add --force only if you really intend to run it here.');
        return self::FAILURE;
    }

    $supplierIdOption = trim((string) ($this->option('supplier-id') ?? ''));
    $suppliers = collect();

    if ($this->option('all')) {
        $suppliers = Supplier::query()->get(['s_id', 's_name', 's_company']);
    } elseif ($supplierIdOption !== '') {
        $supplier = Supplier::query()->find((int) $supplierIdOption);
        $suppliers = $supplier ? collect([$supplier]) : collect();
    } else {
        $supplier = Supplier::query()
            ->get(['s_id', 's_name', 's_company'])
            ->first(function (Supplier $supplier) {
                $candidate = strtolower(preg_replace('/[^a-z0-9]/i', '', trim(
                    ((string) ($supplier->s_company ?? '')) . ' ' . ((string) ($supplier->s_name ?? ''))
                )) ?? '');

                return str_contains($candidate, 'afhomeglobal')
                    || str_contains($candidate, 'globalsupplier')
                    || str_contains($candidate, 'zqsupplier');
            });
        $suppliers = $supplier ? collect([$supplier]) : collect();
    }

    if ($suppliers->isEmpty()) {
        $this->error('No supplier found. Try passing --supplier-id=YOUR_SUPPLIER_ID or --all.');
        return self::FAILURE;
    }

    $appId = (string) config('services.pusher.app_id', '');
    $key = (string) config('services.pusher.key', '');
    $secret = (string) config('services.pusher.secret', '');

    if ($appId === '' || $key === '' || $secret === '') {
        $this->error('Pusher is not configured.');
        return self::FAILURE;
    }

    $now = now('Asia/Manila');
    $message = trim((string) $this->option('message')) ?: 'Supplier realtime test from ZQ flow.';
    $sent = [];

    try {
        $pusher = new Pusher($key, $secret, $appId, [
            'cluster' => (string) config('services.pusher.cluster', 'ap1'),
            'useTLS' => (bool) config('services.pusher.use_tls', true),
        ]);

        foreach ($suppliers as $supplier) {
            $supplierId = (int) $supplier->s_id;
            $channelName = 'private-supplier-' . $supplierId;
            $pusher->trigger($channelName, 'notification.created', [
                'order_id' => time() + $supplierId,
                'checkout_id' => 'TEST-SUPPLIER-NOTIF',
                'type' => 'zq_supplier_realtime_test',
                'title' => 'Supplier Realtime Test',
                'description' => $message,
                'href' => '/supplier/orders',
                'created_at' => $now->toIso8601String(),
                'payload' => [
                    'supplier_id' => $supplierId,
                    'dev_only' => true,
                    'ph_time' => $now->toIso8601String(),
                ],
            ]);
            $sent[] = [
                'id' => $supplierId,
                'name' => trim(((string) ($supplier->s_company ?? '')) . ' ' . ((string) ($supplier->s_name ?? ''))),
                'channel' => $channelName,
            ];
        }
    } catch (Throwable $exception) {
        $this->error('Failed to publish supplier notification: ' . $exception->getMessage());
        return self::FAILURE;
    }

    $this->newLine();
    $this->info('Supplier realtime test sent.');
    foreach ($sent as $target) {
        $this->line('Supplier ID: ' . $target['id'] . ' | ' . $target['channel'] . ' | ' . $target['name']);
    }
    $this->line('PH Time: ' . $now->toDateTimeString());
    $this->newLine();

    return self::SUCCESS;
})->purpose('Dev-only: send a direct supplier realtime notification test');

Artisan::command('database:export-daily', function () {
    /** @var DatabaseExportService $service */
    $service = app(DatabaseExportService::class);
    $driveUploadService = app(GoogleDriveUploadService::class);
    $export = $service->exportDatabaseZip();
    $disk = \Illuminate\Support\Facades\Storage::disk('local');
    $absolutePath = $disk->path((string) ($export['path'] ?? ''));
    $backupDir = trim((string) env('GOOGLE_DRIVE_DESKTOP_BACKUP_PATH', 'G:\\My Drive\\db_backup'), " \t\n\r\0\x0B\"'");
    $backupDir = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $backupDir);
    $downloadName = (string) ($export['download_name'] ?? $service->buildBackupDownloadName());

    if (! str_ends_with(strtolower($downloadName), '.zip')) {
        $downloadName .= '.zip';
    }

    $uploadedViaApi = false;
    if ($driveUploadService->isConfigured()) {
        try {
            $uploaded = $driveUploadService->uploadFile($absolutePath, $downloadName);
            $uploadedViaApi = true;
            $this->line('Google Drive API upload: OK');
            $this->line('Drive file ID: ' . (string) ($uploaded['id'] ?? 'unknown'));
            if (! empty($uploaded['webViewLink'])) {
                $this->line('View link: ' . (string) $uploaded['webViewLink']);
            }
        } catch (\Throwable $e) {
            Log::warning('Daily backup upload to Google Drive API failed.', [
                'file' => $absolutePath,
                'error' => $e->getMessage(),
            ]);
            $this->warn('Google Drive API upload failed: ' . $e->getMessage());
            $this->warn('Falling back to Google Drive Desktop path copy...');
        }
    } else {
        $this->line('Google Drive API upload skipped (service account config missing).');
    }

    if (! $uploadedViaApi) {
        try {
            if ($backupDir === '') {
                throw new \RuntimeException('Backup directory path is empty.');
            }

            if (! File::isDirectory($backupDir)) {
                File::makeDirectory($backupDir, 0755, true);
            }

            if (! File::isWritable($backupDir)) {
                throw new \RuntimeException('Backup directory is not writable by PHP process: ' . $backupDir);
            }

            $destinationPath = rtrim($backupDir, "\\/") . DIRECTORY_SEPARATOR . $downloadName;
            if (File::exists($destinationPath)) {
                $base = pathinfo($downloadName, PATHINFO_FILENAME);
                $ext = pathinfo($downloadName, PATHINFO_EXTENSION);
                $destinationPath = rtrim($backupDir, "\\/") . DIRECTORY_SEPARATOR . $base . '_' . now()->format('His') . ($ext !== '' ? '.' . $ext : '');
            }

            $copied = File::copy($absolutePath, $destinationPath);
            if (! $copied || ! File::exists($destinationPath)) {
                $source = fopen($absolutePath, 'rb');
                $target = fopen($destinationPath, 'wb');
                if (! is_resource($source) || ! is_resource($target)) {
                    if (is_resource($source)) {
                        fclose($source);
                    }
                    if (is_resource($target)) {
                        fclose($target);
                    }
                    throw new \RuntimeException('Unable to open source or destination stream for backup copy.');
                }
                stream_copy_to_stream($source, $target);
                fclose($source);
                fclose($target);
            }

            $this->line('Google Drive Desktop copy: OK');
            $this->line('Saved to: ' . $destinationPath);
        } catch (\Throwable $e) {
            Log::warning('Daily backup copy to Google Drive Desktop path failed.', [
                'destination' => $destinationPath ?? null,
                'backup_dir' => $backupDir,
                'error' => $e->getMessage(),
            ]);
            $this->warn('Google Drive Desktop copy failed: ' . $e->getMessage());
            $this->warn('Tip: make sure Google Drive Desktop is running and the PHP user can write to ' . $backupDir);
            $this->warn('Backup was still created in local storage exports folder.');
        }
    }

    $this->info('Daily database export completed.');
    $this->line('File: ' . (string) ($export['name'] ?? 'unknown'));
    $this->line('Tables: ' . (int) ($export['table_count'] ?? 0));
    $this->line('Rows: ' . (int) ($export['total_rows'] ?? 0));
    $this->line('Size: ' . (int) ($export['size_bytes'] ?? 0) . ' bytes');
})->purpose('Create a CSV ZIP database backup');

Artisan::command('zq:sync-products {--reset : Reset saved cursor so the next run starts from the beginning}', function () {
    /** @var ZqProductSyncService $service */
    $service = app(ZqProductSyncService::class);

    if ($this->option('reset')) {
        $settings = SystemSetting::query()->first();
        if ($settings) {
            $settings->zq_saved_cursor = null;
            $settings->save();
        }
        $this->info('ZQ product sync cursor reset. Next sync will start from the beginning.');
        return;
    }

    /** @var ZqApiService $apiService */
    $apiService = app(ZqApiService::class);
    if (! $apiService->isConfigured()) {
        $this->warn('ZQ API is not configured. Skipping sync.');
        return;
    }

    $result = $service->syncImportProducts(
        filters: [],
        resumeFromSaved: true,
        resetCursor: false,
    );

    $summary = $result['summary'] ?? [];

    $this->newLine();
    $this->info('ZQ product sync completed.');
    $this->line('Requested: ' . (int) ($summary['requested'] ?? 0));
    $this->line('Synced:    ' . (int) ($summary['synced'] ?? 0));
    $this->line('Skipped:   ' . (int) ($summary['skipped'] ?? 0));
    $this->line('Failed:    ' . (int) ($summary['failed'] ?? 0));
    $this->line('Has more:  ' . ($result['hasMore'] ? 'Yes' : 'No'));
    $this->line('Cursor:    ' . ($result['savedCursor'] ?? 'none (end of list)'));
    $this->newLine();
})->purpose('Incrementally sync new ZQ products into tbl_zqproducts using cursor-based pagination');

Artisan::command('psgc:import-addresses {--truncate : Truncate address tables before import}', function () {
    $psgcBaseUrl = 'https://psgc.gitlab.io/api';
    $philippinesCountryId = 175;

    $fetchPsgc = function (string $path) use ($psgcBaseUrl) {
        $response = Http::acceptJson()
            ->timeout(60)
            ->retry(3, 500)
            ->get("{$psgcBaseUrl}{$path}");

        if (! $response->successful()) {
            throw new RuntimeException("PSGC request failed for {$path} with HTTP {$response->status()}.");
        }

        return $response->json();
    };

    $normalizeItems = function (array $items): array {
        return collect($items)
            ->map(function ($item) {
                $code = trim((string) ($item['code'] ?? ''));
                $name = trim((string) ($item['regionName'] ?? $item['name'] ?? ''));

                return [
                    'code' => $code,
                    'name' => $name,
                ];
            })
            ->filter(fn (array $item) => $item['code'] !== '' && $item['name'] !== '')
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    };

    $insertInChunks = function (string $table, array $rows) {
        foreach (array_chunk($rows, 1000) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    };

    $toRegionCode = function (string $psgcCode): string {
        return substr($psgcCode, 0, 2);
    };

    $toProvinceCode = function (string $psgcCode): string {
        return substr($psgcCode, 0, 4);
    };

    $toCityCode = function (string $psgcCode): string {
        return substr($psgcCode, 0, 6);
    };

    $this->info('Fetching PSGC regions...');
    $regions = $normalizeItems($fetchPsgc('/regions/'));

    if (empty($regions)) {
        $this->error('PSGC returned no regions. Import aborted.');
        return self::FAILURE;
    }

    $regionRows = [];
    $provinceRows = [];
    $cityRows = [];
    $barangayRows = [];
    $provinceCodesByRegion = [];
    $cityCodesForBarangays = [];

    foreach ($regions as $region) {
        $regionRows[] = [
            'region_name' => $region['name'],
            'region_code' => $toRegionCode($region['code']),
            'country_id' => $philippinesCountryId,
        ];

        $this->line("Fetching provinces for {$region['name']}...");
        $regionProvinces = $normalizeItems($fetchPsgc("/regions/{$region['code']}/provinces/"));

        if (empty($regionProvinces)) {
            $this->line("No provinces for {$region['name']}; fetching region-level cities/municipalities...");
            $regionCities = $normalizeItems($fetchPsgc("/regions/{$region['code']}/cities-municipalities/"));

            foreach ($regionCities as $city) {
                $cityRows[] = [
                    'city_name' => $city['name'],
                    'region_code' => $toRegionCode($region['code']),
                    'prov_code' => '',
                    'city_code' => $toCityCode($city['code']),
                    'psgc_code' => $city['code'],
                    'city_status' => 1,
                ];

                $cityCodesForBarangays[] = [
                    'region_code' => $toRegionCode($region['code']),
                    'prov_code' => '',
                    'city_code' => $toCityCode($city['code']),
                    'city_psgc_code' => $city['code'],
                    'city_name' => $city['name'],
                ];
            }

            continue;
        }

        foreach ($regionProvinces as $province) {
            $provinceRows[] = [
                'prov_name' => $province['name'],
                'region_code' => $toRegionCode($region['code']),
                'prov_code' => $toProvinceCode($province['code']),
                'psgc_code' => $province['code'],
                'prov_status' => 1,
            ];

            $provinceCodesByRegion[] = [
                'region_code' => $toRegionCode($region['code']),
                'prov_code' => $toProvinceCode($province['code']),
                'prov_psgc_code' => $province['code'],
                'prov_name' => $province['name'],
            ];
        }
    }

    foreach ($provinceCodesByRegion as $provinceMeta) {
        $this->line("Fetching cities/municipalities for {$provinceMeta['prov_name']}...");
        $provinceCities = $normalizeItems($fetchPsgc("/provinces/{$provinceMeta['prov_psgc_code']}/cities-municipalities/"));

        foreach ($provinceCities as $city) {
            $cityRows[] = [
                'city_name' => $city['name'],
                'region_code' => $provinceMeta['region_code'],
                'prov_code' => $provinceMeta['prov_code'],
                'city_code' => $toCityCode($city['code']),
                'psgc_code' => $city['code'],
                'city_status' => 1,
            ];

            $cityCodesForBarangays[] = [
                'region_code' => $provinceMeta['region_code'],
                'prov_code' => $provinceMeta['prov_code'],
                'city_code' => $toCityCode($city['code']),
                'city_psgc_code' => $city['code'],
                'city_name' => $city['name'],
            ];
        }
    }

    foreach ($cityCodesForBarangays as $cityMeta) {
        $this->line("Fetching barangays for {$cityMeta['city_name']}...");
        $cityBarangays = $normalizeItems($fetchPsgc("/cities-municipalities/{$cityMeta['city_psgc_code']}/barangays/"));

        foreach ($cityBarangays as $barangay) {
            $barangayRows[] = [
                'barangay_name' => $barangay['name'],
                'region_code' => $cityMeta['region_code'],
                'prov_code' => $cityMeta['prov_code'],
                'city_code' => $cityMeta['city_code'],
                'barangay_code' => substr($barangay['code'], 0, 10),
                'barangay_status' => 1,
            ];
        }
    }

    DB::transaction(function () use ($regionRows, $provinceRows, $cityRows, $barangayRows, $insertInChunks) {
        DB::statement('TRUNCATE TABLE tbl_address_barangay, tbl_address_city, tbl_address_province, tbl_address_region RESTART IDENTITY CASCADE');

        $insertInChunks('tbl_address_region', $regionRows);
        $insertInChunks('tbl_address_province', $provinceRows);
        $insertInChunks('tbl_address_city', $cityRows);
        $insertInChunks('tbl_address_barangay', $barangayRows);
    });

    $this->newLine();
    $this->info('PSGC address import completed.');
    $this->line('Regions: ' . count($regionRows));
    $this->line('Provinces: ' . count($provinceRows));
    $this->line('Cities/Municipalities: ' . count($cityRows));
    $this->line('Barangays: ' . count($barangayRows));
    $this->newLine();

    return self::SUCCESS;
})->purpose('Import PSGC regions, provinces, cities, and barangays into backend address tables');

Schedule::command('payments:sync-pending --limit=25')
    ->everyFiveMinutes()
    ->withoutOverlapping();

Schedule::command('zq:sync-tracking --limit=25')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Incremental sync: fetches only new ZQ products using saved cursor.
// Runs every 2 hours so new products appear automatically without a manual import.
Schedule::command('zq:sync-products')
    ->everyTwoHours()
    ->withoutOverlapping()
    ->onFailure(function () {
        Log::warning('Scheduled ZQ product incremental sync failed.');
    });

// Weekly reset: clears the saved cursor every Sunday at 2 AM so the next
// incremental run re-scans from the beginning (catches any gaps or missed products).
Schedule::command('zq:sync-products --reset')
    ->weekly()
    ->sundays()
    ->at('02:00')
    ->withoutOverlapping();

if (filter_var(env('DB_DAILY_EXPORT_ENABLED', false), FILTER_VALIDATE_BOOL)) {
    Schedule::command('database:export-daily')
        ->dailyAt('17:00')
        ->timezone(config('app.timezone', 'UTC'))
        ->withoutOverlapping()
        ->onFailure(function () {
            Log::error('Scheduled daily database export failed.');
        });
}
