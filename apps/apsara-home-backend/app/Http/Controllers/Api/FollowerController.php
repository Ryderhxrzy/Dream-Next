<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follower;
use Illuminate\Http\Request;

class FollowerController extends Controller
{
    public function follow(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'brand_id' => 'required|integer|exists:tbl_product_brand,pb_id',
        ]);

        $brandId = (int) $validated['brand_id'];

        // Race-safe: firstOrCreate relies on the unique (user_id, brand_id) index,
        // so two concurrent requests can't create duplicate rows. The original
        // followed_at is preserved on re-follow; we only flip is_active back on.
        $follow = Follower::firstOrCreate(
            ['user_id' => $user->c_userid, 'brand_id' => $brandId],
            ['is_active' => true, 'followed_at' => now(), 'updated_at' => now()],
        );

        if (! $follow->wasRecentlyCreated && ! $follow->is_active) {
            $follow->update(['is_active' => true, 'updated_at' => now()]);
        }

        return response()->json([
            'message' => 'Successfully followed',
            'is_following' => true,
            'followers_count' => $this->activeCount($brandId),
        ], $follow->wasRecentlyCreated ? 201 : 200);
    }

    public function unfollow(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'brand_id' => 'required|integer',
        ]);

        $brandId = (int) $validated['brand_id'];

        // Idempotent soft-unfollow: keeps the row (preserving follow history) and
        // always returns the current count, so the client stays in sync even if the
        // user was already unfollowed.
        Follower::where('user_id', $user->c_userid)
            ->where('brand_id', $brandId)
            ->update(['is_active' => false, 'updated_at' => now()]);

        return response()->json([
            'message' => 'Successfully unfollowed',
            'is_following' => false,
            'followers_count' => $this->activeCount($brandId),
        ], 200);
    }

    public function getFollowing(Request $request)
    {
        $user = $request->user();

        $following = Follower::where('user_id', $user->c_userid)
            ->where('is_active', true)
            ->pluck('brand_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();

        return response()->json([
            'user_id' => $user->c_userid,
            'following' => $following,
        ], 200);
    }

    public function isFollowing(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'brand_id' => 'required|integer',
        ]);

        $isFollowing = Follower::where('user_id', $user->c_userid)
            ->where('brand_id', $validated['brand_id'])
            ->where('is_active', true)
            ->exists();

        return response()->json([
            'is_following' => $isFollowing,
        ], 200);
    }

    /**
     * Public follower count for a brand. Lets guests see how many followers a
     * brand has before deciding to follow.
     */
    public function count(int $brandId)
    {
        return response()->json([
            'brand_id' => $brandId,
            'followers_count' => $this->activeCount($brandId),
        ], 200);
    }

    private function activeCount(int $brandId): int
    {
        return Follower::where('brand_id', $brandId)
            ->where('is_active', true)
            ->count();
    }
}
