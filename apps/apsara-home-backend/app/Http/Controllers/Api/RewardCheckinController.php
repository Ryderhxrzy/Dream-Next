<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyCheckin;
use App\Support\RewardPvPosting;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class RewardCheckinController extends Controller
{
    private const TIMEZONE = 'Asia/Manila';

    /**
     * 7-day check-in reward ladder (PV per day index).
     * The week hard-resets every Sunday 12AM; missing a day rolls back to day 1.
     */
    private const REWARD_LADDER = [
        1 => 20.0,
        2 => 25.0,
        3 => 30.0,
        4 => 35.0,
        5 => 40.0,
        6 => 50.0,
        7 => 60.0,
    ];

    private function ladderAmount(int $dayIndex): float
    {
        return (float) (self::REWARD_LADDER[$dayIndex] ?? self::REWARD_LADDER[1]);
    }

    private function formatPv(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }

    private function weekStart(Carbon $now): Carbon
    {
        return $now->copy()->startOfWeek(Carbon::SUNDAY);
    }

    private function dateString($value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return Carbon::parse((string) $value)->format('Y-m-d');
    }

    /**
     * Resolve what the next claim's day index + streak would be.
     *
     * @return array{day_index:int, streak:int}
     */
    private function resolveNextClaim(?DailyCheckin $last, string $yesterdayStr, string $weekStartStr): array
    {
        if (!$last) {
            return ['day_index' => 1, 'streak' => 1];
        }

        $lastStr = $this->dateString($last->dc_checkin_date);

        // Continue the streak only when the last check-in was yesterday AND
        // still inside the current Sunday-anchored week (resets every Sunday).
        if ($lastStr === $yesterdayStr && $lastStr >= $weekStartStr) {
            return [
                'day_index' => min(7, (int) $last->dc_day_index + 1),
                'streak'    => (int) $last->dc_streak + 1,
            ];
        }

        // Missed a day, or a brand new week started -> roll back to day one.
        return ['day_index' => 1, 'streak' => 1];
    }

    private function buildLadder(): array
    {
        $ladder = [];
        foreach (self::REWARD_LADDER as $day => $amount) {
            $ladder[] = ['day' => $day, 'pv' => $amount];
        }

        return $ladder;
    }

    private function latestCheckin(int $customerId): ?DailyCheckin
    {
        return DailyCheckin::query()
            ->where('dc_customer_id', $customerId)
            ->orderByDesc('dc_checkin_date')
            ->orderByDesc('dc_id')
            ->first();
    }

    /**
     * GET /api/rewards/check-in
     * Today's claim status, streak, the 7-day ladder, and a week calendar.
     */
    public function status(Request $request)
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $customerId = (int) $customer->c_userid;
        $now = now(self::TIMEZONE);
        $todayStr = $now->toDateString();
        $weekStart = $this->weekStart($now);
        $weekStartStr = $weekStart->toDateString();
        $yesterdayStr = $now->copy()->subDay()->toDateString();

        $last = $this->latestCheckin($customerId);
        $claimedToday = $last && $this->dateString($last->dc_checkin_date) === $todayStr;
        $next = $this->resolveNextClaim($last, $yesterdayStr, $weekStartStr);

        $weekRecords = DailyCheckin::query()
            ->where('dc_customer_id', $customerId)
            ->whereBetween('dc_checkin_date', [
                $weekStartStr,
                $weekStart->copy()->addDays(6)->toDateString(),
            ])
            ->get()
            ->keyBy(fn (DailyCheckin $r) => (int) $r->dc_day_index);

        $calendar = [];
        foreach (self::REWARD_LADDER as $day => $amount) {
            $record = $weekRecords->get($day);
            $calendar[] = [
                'day'             => $day,
                'pv'              => $amount,
                'claimed'         => (bool) $record,
                'claimed_at'      => $record?->created_at?->toIso8601String(),
                'is_today_reward' => !$claimedToday && $next['day_index'] === $day,
            ];
        }

        $currentStreak = $claimedToday
            ? (int) $last->dc_streak
            : max(0, $next['streak'] - 1);

        return response()->json([
            'checked_in_today' => $claimedToday,
            'can_check_in'     => !$claimedToday,
            'current_streak'   => $currentStreak,
            'next_day_index'   => $claimedToday ? null : $next['day_index'],
            'next_reward_pv'   => $claimedToday ? null : $this->ladderAmount($next['day_index']),
            'today_earned_pv'  => $claimedToday ? (float) $last->dc_amount : 0.0,
            'week_start'       => $weekStartStr,
            'resets_at'        => $weekStart->copy()->addWeek()->toIso8601String(),
            'total_checkins'   => DailyCheckin::where('dc_customer_id', $customerId)->count(),
            'total_pv_earned'  => round((float) DailyCheckin::where('dc_customer_id', $customerId)->sum('dc_amount'), 2),
            'ladder'           => $this->buildLadder(),
            'calendar'         => $calendar,
        ]);
    }

    /**
     * POST /api/rewards/check-in
     * Claim today's check-in reward. Idempotent: one claim per calendar day.
     */
    public function checkIn(Request $request)
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $customerId = (int) $customer->c_userid;
        $now = now(self::TIMEZONE);
        $todayStr = $now->toDateString();
        $weekStart = $this->weekStart($now);
        $weekStartStr = $weekStart->toDateString();
        $yesterdayStr = $now->copy()->subDay()->toDateString();

        $last = $this->latestCheckin($customerId);

        if ($last && $this->dateString($last->dc_checkin_date) === $todayStr) {
            return response()->json([
                'message'          => 'You have already checked in today.',
                'checked_in_today' => true,
                'today_earned_pv'  => (float) $last->dc_amount,
                'current_streak'   => (int) $last->dc_streak,
            ], 409);
        }

        $next = $this->resolveNextClaim($last, $yesterdayStr, $weekStartStr);
        $amount = $this->ladderAmount($next['day_index']);

        try {
            $checkin = DailyCheckin::create([
                'dc_customer_id'  => $customerId,
                'dc_checkin_date' => $todayStr,
                'dc_cycle_start'  => $weekStartStr,
                'dc_day_index'    => $next['day_index'],
                'dc_amount'       => $amount,
                'dc_streak'       => $next['streak'],
                'dc_source_type'  => RewardPvPosting::SOURCE_DAILY_CHECKIN,
            ]);
        } catch (QueryException $e) {
            // Unique (customer, date) violation -> a concurrent request already claimed today.
            return response()->json([
                'message'          => 'You have already checked in today.',
                'checked_in_today' => true,
            ], 409);
        }

        $ledgerId = RewardPvPosting::credit(
            $customerId,
            $amount,
            RewardPvPosting::SOURCE_DAILY_CHECKIN,
            (int) $checkin->dc_id,
            sprintf('DCHK-%d-%s', $customerId, $now->format('Ymd')),
            sprintf('Day %d daily check-in reward (+%s PV)', $next['day_index'], $this->formatPv($amount)),
        );

        if ($ledgerId) {
            $checkin->dc_ledger_id = $ledgerId;
            $checkin->save();
        }

        $nextDay = $next['day_index'] < 7 ? $next['day_index'] + 1 : null;

        return response()->json([
            'message'          => sprintf('Checked in! You earned %s PV.', $this->formatPv($amount)),
            'checked_in_today' => true,
            'day_index'        => $next['day_index'],
            'earned_pv'        => $amount,
            'current_streak'   => $next['streak'],
            'ledger_id'        => $ledgerId,
            'next_day_index'   => $nextDay,
            'next_reward_pv'   => $nextDay ? $this->ladderAmount($nextDay) : null,
        ], 201);
    }

    /**
     * GET /api/rewards/check-in/history
     * Paginated check-in log + lifetime metrics (the "performance value log").
     */
    public function history(Request $request)
    {
        $customer = $request->user();
        if (!$customer) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $customerId = (int) $customer->c_userid;
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));

        $log = DailyCheckin::query()
            ->where('dc_customer_id', $customerId)
            ->orderByDesc('dc_checkin_date')
            ->orderByDesc('dc_id')
            ->paginate($perPage);

        $items = collect($log->items())->map(fn (DailyCheckin $r) => [
            'id'         => (int) $r->dc_id,
            'date'       => $this->dateString($r->dc_checkin_date),
            'day_index'  => (int) $r->dc_day_index,
            'pv'         => (float) $r->dc_amount,
            'streak'     => (int) $r->dc_streak,
            'label'      => sprintf('Day %d Check-in', (int) $r->dc_day_index),
            'created_at' => $r->created_at?->toIso8601String(),
        ])->all();

        return response()->json([
            'metrics' => [
                'total_checkins'  => DailyCheckin::where('dc_customer_id', $customerId)->count(),
                'total_pv_earned' => round((float) DailyCheckin::where('dc_customer_id', $customerId)->sum('dc_amount'), 2),
                'longest_streak'  => (int) DailyCheckin::where('dc_customer_id', $customerId)->max('dc_streak'),
            ],
            'items' => $items,
            'meta'  => [
                'current_page' => $log->currentPage(),
                'last_page'    => $log->lastPage(),
                'per_page'     => $log->perPage(),
                'total'        => $log->total(),
            ],
        ]);
    }
}
