<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\PartnerStorefrontAccess;

class StorefrontSubscriptionController extends Controller
{
    public function show(string $slug)
    {
        $slug = trim((string) $slug);
        if ($slug === '') {
            return response()->json(['is_active' => false, 'is_expired' => false]);
        }

        $access = new PartnerStorefrontAccess();
        $isExpired = $access->isStorefrontSlugExpired($slug);

        return response()->json([
            'is_active' => ! $isExpired,
            'is_expired' => $isExpired,
        ]);
    }
}
