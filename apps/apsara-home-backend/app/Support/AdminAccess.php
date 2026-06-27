<?php

namespace App\Support;

use App\Models\Admin;

class AdminAccess
{
    public const PERMISSIONS = [
        'dashboard',
        'members',
        'orders',
        'interior_requests',
        'products',
        'shipping',
        'suppliers',
        'web_content',
        'settings_users',
        'payments',
        'expenses',
        'email_blast',
        'conversations',
        'settings',
    ];

    public const WEB_CONTENT_SECTION_PERMISSIONS = [
        'wc:shop-builder',
        'wc:dreambuild',
        'wc:partner-storefronts',
    ];

    public static function roleFromLevel(int $level): string
    {
        return match ($level) {
            1 => 'super_admin',
            2 => 'admin',
            3 => 'csr',
            4 => 'web_content',
            5 => 'accounting',
            6 => 'finance_officer',
            7 => 'merchant_admin',
            8 => 'supplier_admin',
            default => 'staff',
        };
    }

    public static function availablePermissions(): array
    {
        return self::PERMISSIONS;
    }

    public static function availableWebContentSectionPermissions(): array
    {
        return self::WEB_CONTENT_SECTION_PERMISSIONS;
    }

    public static function normalizePermissions(mixed $permissions): array
    {
        if (! is_array($permissions)) {
            return [];
        }

        $valid = array_flip(self::PERMISSIONS);

        return array_values(array_unique(array_filter(
            array_map(static fn ($item) => is_string($item) ? trim($item) : '', $permissions),
            static fn ($item) => $item !== '' && isset($valid[$item]),
        )));
    }

    public static function normalizeWebContentSectionPermissions(mixed $permissions): array
    {
        if (! is_array($permissions)) {
            return [];
        }

        $valid = array_flip(self::WEB_CONTENT_SECTION_PERMISSIONS);

        return array_values(array_unique(array_filter(
            array_map(static fn ($item) => is_string($item) ? trim($item) : '', $permissions),
            static fn ($item) => $item !== '' && isset($valid[$item]),
        )));
    }

    public static function defaultPermissionsForLevel(int $level): array
    {
        return match ($level) {
            1 => self::PERMISSIONS,
            2 => ['dashboard', 'orders', 'interior_requests', 'products', 'shipping', 'web_content', 'settings_users', 'payments', 'expenses', 'email_blast', 'conversations', 'settings'],
            3 => ['dashboard', 'members', 'orders', 'interior_requests', 'conversations'],
            4 => ['dashboard', 'products', 'web_content'],
            7 => ['dashboard', 'orders', 'interior_requests', 'products', 'shipping'],
            8 => ['dashboard', 'products', 'suppliers'],
            default => ['dashboard'],
        };
    }

    public static function sanitizePermissionsForLevel(int $level, mixed $permissions): array
    {
        if ($level !== 2) {
            return [];
        }

        $normalized = self::normalizePermissions($permissions);

        return array_values(array_unique(array_merge(['dashboard'], $normalized)));
    }

    public static function sanitizeWebContentPermissionsForLevel(int $level, mixed $permissions, mixed $storefrontIds = []): array
    {
        if ($level !== 4) {
            return [];
        }

        $sections = self::normalizeWebContentSectionPermissions($permissions);
        $ids = [];
        if (is_array($storefrontIds)) {
            $ids = array_values(array_unique(array_filter(array_map(
                static fn ($id) => is_numeric($id) ? (int) $id : null,
                $storefrontIds,
            ), static fn ($id) => is_int($id) && $id > 0)));
        }

        return array_values(array_merge($sections, $ids));
    }

    public static function permissionsForAdmin(Admin $admin): array
    {
        $level = (int) $admin->user_level_id;
        if ($level === 1) {
            return self::PERMISSIONS;
        }

        if ($level === 4) {
            $rawPermissions = $admin->admin_permissions ?? [];
            $wcSections = self::normalizeWebContentSectionPermissions($rawPermissions);

            // admin_permissions for level-4 stores storefront IDs as integers alongside wc:* strings.
            // When the user has assigned storefronts, auto-grant wc:partner-storefronts so the
            // partner storefronts API (which requires that permission) is accessible.
            $hasStorefrontIds = ! empty(array_filter(
                is_array($rawPermissions) ? $rawPermissions : [],
                static fn ($item) => is_numeric($item) && (int) $item > 0,
            ));
            if ($hasStorefrontIds && ! in_array('wc:partner-storefronts', $wcSections, true)) {
                $wcSections[] = 'wc:partner-storefronts';
            }

            return array_values(array_unique(array_merge(
                self::defaultPermissionsForLevel($level),
                $wcSections,
            )));
        }

        $custom = self::sanitizePermissionsForLevel($level, $admin->admin_permissions ?? []);
        if ($level === 2 && ! empty($custom)) {
            return $custom;
        }

        return self::defaultPermissionsForLevel($level);
    }

    public static function hasPermission(Admin $admin, string $permission): bool
    {
        return in_array($permission, self::permissionsForAdmin($admin), true);
    }

    public static function permissionForPath(string $path): ?string
    {
        $normalized = '/' . ltrim($path, '/');
        if (str_starts_with($normalized, '/api/')) {
            $normalized = substr($normalized, 4);
            $normalized = $normalized === '' ? '/' : $normalized;
        }

        return match (true) {
            $normalized === '/admin',
            str_starts_with($normalized, '/admin/dashboard') => 'dashboard',
            str_starts_with($normalized, '/admin/members') => 'members',
            str_starts_with($normalized, '/admin/member-tiers') => 'members',
            str_starts_with($normalized, '/admin/service-inquiries') => 'members',
            str_starts_with($normalized, '/admin/inquiries') => 'members',
            str_starts_with($normalized, '/admin/activity-logs') => 'members',
            str_starts_with($normalized, '/admin/partner/webstore-requests') => 'web_content',
            str_starts_with($normalized, '/admin/orders') => 'orders',
            str_starts_with($normalized, '/admin/interior-requests') => 'interior_requests',
            str_starts_with($normalized, '/admin/products'),
            str_starts_with($normalized, '/admin/product-brands'),
            str_starts_with($normalized, '/admin/categories') => 'products',
            str_starts_with($normalized, '/admin/shipping') => 'shipping',
            str_starts_with($normalized, '/admin/suppliers') => 'suppliers',
            str_starts_with($normalized, '/admin/web-pages'),
            str_starts_with($normalized, '/admin/webpages') => 'web_content',
            str_starts_with($normalized, '/admin/users'),
            str_starts_with($normalized, '/admin/settings/users') => 'settings_users',
            str_starts_with($normalized, '/admin/payments'),
            str_starts_with($normalized, '/admin/encashment') => 'payments',
            str_starts_with($normalized, '/admin/expenses') => 'expenses',
            str_starts_with($normalized, '/admin/email-blast'),
            str_starts_with($normalized, '/admin/sms-blast') => 'email_blast',
            str_starts_with($normalized, '/admin/conversations') => 'conversations',
            str_starts_with($normalized, '/admin/settings') => 'settings',
            default => null,
        };
    }

    public static function webContentSectionPermissionForPath(string $path): ?string
    {
        $normalized = '/' . ltrim($path, '/');
        if (str_starts_with($normalized, '/api/')) {
            $normalized = substr($normalized, 4);
            $normalized = $normalized === '' ? '/' : $normalized;
        }

        return match (true) {
            str_starts_with($normalized, '/admin/web-pages/shop-builder'),
            str_starts_with($normalized, '/admin/webpages/shop-builder') => 'wc:shop-builder',
            str_starts_with($normalized, '/admin/web-pages/dreambuild-'),
            str_starts_with($normalized, '/admin/webpages/dreambuild-') => 'wc:dreambuild',
            str_starts_with($normalized, '/admin/web-pages/partner-storefront'),
            str_starts_with($normalized, '/admin/webpages/partner-storefront') => 'wc:partner-storefronts',
            default => null,
        };
    }
}
