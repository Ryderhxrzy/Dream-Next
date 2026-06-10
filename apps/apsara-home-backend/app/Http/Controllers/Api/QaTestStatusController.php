<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QaTestStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Pusher\Pusher;

class QaTestStatusController extends Controller
{
    private const ALLOWED_STATUSES = ['pending', 'pass', 'bug', 'skip'];

    /** Presence channel every tester on the QA board shares. */
    private const CHANNEL = 'presence-qa-board';

    /**
     * Return every saved QA status keyed by test id so the board can hydrate.
     */
    public function index(): JsonResponse
    {
        $statuses = QaTestStatus::query()
            ->get()
            ->keyBy('qts_test_id')
            ->map(fn (QaTestStatus $row) => [
                'status' => $row->qts_status,
                'note' => $row->qts_note,
                'updated_by' => $row->qts_updated_by,
                'updated_at' => optional($row->updated_at)->toIso8601String(),
            ]);

        return response()->json(['statuses' => $statuses]);
    }

    /**
     * Upsert a single test case status.
     */
    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'test_id' => ['required', 'string', 'max:64'],
            'status' => ['required', 'string', 'in:' . implode(',', self::ALLOWED_STATUSES)],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $attributes = [
            'qts_status' => $validated['status'],
            'qts_updated_by' => $this->actorLabel($request),
        ];

        // Only touch the note when the client actually sent the field, so a
        // plain status change never wipes an existing comment.
        if ($request->exists('note')) {
            $note = is_string($validated['note'] ?? null) ? trim($validated['note']) : null;
            $attributes['qts_note'] = $note === '' ? null : $note;
        }

        $row = QaTestStatus::query()->updateOrCreate(
            ['qts_test_id' => $validated['test_id']],
            $attributes
        );

        $payload = [
            'test_id' => $row->qts_test_id,
            'status' => $row->qts_status,
            'note' => $row->qts_note,
            'updated_by' => $row->qts_updated_by,
            'updated_at' => optional($row->updated_at)->toIso8601String(),
        ];

        // Push the change to everyone else viewing the board in real time.
        $this->broadcast('qa.status.updated', $payload);

        return response()->json($payload);
    }

    /**
     * Clear all saved statuses (Reset all).
     */
    public function reset(): JsonResponse
    {
        QaTestStatus::query()->delete();

        $this->broadcast('qa.reset', []);

        return response()->json(['message' => 'All QA statuses cleared.']);
    }

    /**
     * Authorize the presence channel so the board can show who is online and
     * who is editing which test case. Returns the Pusher auth signature plus
     * channel_data (the tester's id + display name).
     */
    public function realtimeAuth(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'socket_id' => ['required', 'string', 'max:100'],
            'channel_name' => ['required', 'string', 'max:255'],
        ]);

        $channelName = (string) $validated['channel_name'];
        if ($channelName !== self::CHANNEL) {
            return response()->json(['message' => 'Forbidden channel.'], 403);
        }

        $key = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');
        if ($key === '' || $secret === '') {
            return response()->json(['message' => 'Pusher is not configured.'], 503);
        }

        $user = $request->user();
        $channelData = json_encode([
            'user_id' => (string) ($user?->getKey() ?? 'anon-' . substr(md5($validated['socket_id']), 0, 8)),
            'user_info' => [
                'name' => $this->actorLabel($request) ?? 'Tester',
            ],
        ]);

        $socketId = (string) $validated['socket_id'];
        $signature = hash_hmac('sha256', $socketId . ':' . $channelName . ':' . $channelData, $secret);

        return response()->json([
            'auth' => $key . ':' . $signature,
            'channel_data' => $channelData,
        ]);
    }

    /**
     * Broadcast an ephemeral "this tester is editing this card" ping. Triggered
     * server-side with the Pusher secret, so it needs no client-events toggle.
     * A null test_id means the tester stopped editing.
     */
    public function editing(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'test_id' => ['present', 'nullable', 'string', 'max:64'],
        ]);

        $user = $request->user();

        $this->broadcast('qa.editing', [
            'test_id' => $validated['test_id'] !== '' ? $validated['test_id'] : null,
            'by_id' => (string) ($user?->getKey() ?? ''),
            'by_name' => $this->actorLabel($request) ?? 'Tester',
        ]);

        return response()->json(['ok' => true]);
    }

    private function actorLabel(Request $request): ?string
    {
        $user = $request->user();
        if (! $user) {
            return null;
        }

        return $user->fname ?? $user->username ?? $user->user_email ?? null;
    }

    /**
     * Fire-and-forget broadcast to the shared QA presence channel. Failures
     * are logged but never break the save — realtime is best-effort.
     */
    private function broadcast(string $event, array $payload): void
    {
        $appId = (string) config('services.pusher.app_id', '');
        $key = (string) config('services.pusher.key', '');
        $secret = (string) config('services.pusher.secret', '');

        if ($appId === '' || $key === '' || $secret === '') {
            return;
        }

        try {
            $pusher = new Pusher($key, $secret, $appId, [
                'cluster' => (string) config('services.pusher.cluster', 'ap3'),
                'useTLS' => (bool) config('services.pusher.use_tls', true),
            ]);

            $pusher->trigger(self::CHANNEL, $event, $payload);
        } catch (\Throwable $e) {
            Log::warning('Failed to broadcast QA board event.', [
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
