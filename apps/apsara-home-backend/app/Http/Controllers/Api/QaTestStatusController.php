<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QaTestStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QaTestStatusController extends Controller
{
    private const ALLOWED_STATUSES = ['pending', 'pass', 'bug', 'skip'];

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

        return response()->json([
            'test_id' => $row->qts_test_id,
            'status' => $row->qts_status,
            'note' => $row->qts_note,
            'updated_by' => $row->qts_updated_by,
            'updated_at' => optional($row->updated_at)->toIso8601String(),
        ]);
    }

    /**
     * Clear all saved statuses (Reset all).
     */
    public function reset(): JsonResponse
    {
        QaTestStatus::query()->delete();

        return response()->json(['message' => 'All QA statuses cleared.']);
    }

    private function actorLabel(Request $request): ?string
    {
        $user = $request->user();
        if (! $user) {
            return null;
        }

        return $user->fname ?? $user->username ?? $user->user_email ?? null;
    }
}
