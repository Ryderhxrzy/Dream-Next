<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\KnowledgeBaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KnowledgeBaseController extends Controller
{
    public function __construct(private readonly KnowledgeBaseService $knowledgeBase)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);
        $query = DB::table('tbl_ai_knowledge_documents')
            ->orderByDesc('doc_id');

        if ($status = $request->query('status')) {
            $query->where('doc_status', $status);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($where) use ($search) {
                $where->where('doc_title', 'ilike', "%{$search}%")
                    ->orWhere('doc_content', 'ilike', "%{$search}%");
            });
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'documents' => collect($paginated->items())->map(fn ($row) => $this->formatDocument((array) $row))->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $id = DB::table('tbl_ai_knowledge_documents')->insertGetId([
            'doc_title' => trim((string) $validated['title']),
            'doc_type' => $validated['type'] ?? 'faq',
            'doc_scope' => $validated['scope'] ?? 'global',
            'doc_partner_slug' => $validated['partner_slug'] ?? null,
            'doc_status' => $validated['status'] ?? 'active',
            'doc_content' => trim((string) $validated['content']),
            'doc_metadata' => isset($validated['metadata']) ? json_encode($validated['metadata']) : null,
            'doc_created_by_admin_id' => (int) ($request->user()?->getKey() ?? 0) ?: null,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'doc_id');

        $index = $this->knowledgeBase->indexDocument((int) $id);

        return response()->json([
            'message' => 'Knowledge document saved.',
            'document' => $this->getDocument((int) $id),
            'index' => $index,
        ], 201);
    }

    public function uploadPreview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:4096'],
        ]);

        $file = $validated['file'];
        $name = (string) $file->getClientOriginalName();
        $extension = strtolower((string) $file->getClientOriginalExtension());

        $content = match ($extension) {
            'txt', 'md', 'markdown', 'csv', 'json' => trim((string) file_get_contents($file->getRealPath())),
            'docx' => $this->extractDocxText((string) $file->getRealPath()),
            default => abort(422, 'Unsupported knowledge file type.'),
        };

        abort_if(trim($content) === '', 422, 'No readable text found in this file.');

        return response()->json([
            'title' => trim((string) preg_replace('/\.[^.]+$/', '', $name)),
            'content' => $content,
            'filename' => $name,
            'extension' => $extension,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->ensureDocumentExists($id);
        $validated = $request->validate($this->rules(false));

        DB::table('tbl_ai_knowledge_documents')
            ->where('doc_id', $id)
            ->update([
                'doc_title' => trim((string) $validated['title']),
                'doc_type' => $validated['type'] ?? 'faq',
                'doc_scope' => $validated['scope'] ?? 'global',
                'doc_partner_slug' => $validated['partner_slug'] ?? null,
                'doc_status' => $validated['status'] ?? 'active',
                'doc_content' => trim((string) $validated['content']),
                'doc_metadata' => isset($validated['metadata']) ? json_encode($validated['metadata']) : null,
                'doc_index_status' => 'pending',
                'updated_at' => now(),
            ]);

        $index = $this->knowledgeBase->indexDocument($id);

        return response()->json([
            'message' => 'Knowledge document updated.',
            'document' => $this->getDocument($id),
            'index' => $index,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->ensureDocumentExists($id);
        DB::table('tbl_ai_knowledge_documents')->where('doc_id', $id)->delete();

        return response()->json(['message' => 'Knowledge document deleted.']);
    }

    public function reindex(int $id): JsonResponse
    {
        $this->ensureDocumentExists($id);
        $index = $this->knowledgeBase->indexDocument($id);

        return response()->json([
            'message' => 'Knowledge document reindexed.',
            'document' => $this->getDocument($id),
            'index' => $index,
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'partner_slug' => ['nullable', 'string', 'max:160'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        return response()->json([
            'chunks' => $this->knowledgeBase->search(
                $validated['message'],
                $validated['partner_slug'] ?? null,
                (int) ($validated['limit'] ?? 8)
            ),
        ]);
    }

    private function rules(bool $creating = true): array
    {
        return [
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:180'],
            'type' => ['nullable', 'string', 'max:40'],
            'scope' => ['nullable', 'in:global,partner'],
            'partner_slug' => ['nullable', 'string', 'max:160', 'required_if:scope,partner'],
            'status' => ['nullable', 'in:active,draft,archived'],
            'content' => [$creating ? 'required' : 'sometimes', 'string', 'min:10'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    private function ensureDocumentExists(int $id): void
    {
        abort_unless(
            DB::table('tbl_ai_knowledge_documents')->where('doc_id', $id)->exists(),
            404,
            'Knowledge document not found.'
        );
    }

    private function getDocument(int $id): array
    {
        return $this->formatDocument((array) DB::table('tbl_ai_knowledge_documents')->where('doc_id', $id)->first());
    }

    private function extractDocxText(string $path): string
    {
        abort_unless(class_exists(\ZipArchive::class), 422, 'DOCX extraction is not available on this server.');

        $zip = new \ZipArchive();
        abort_unless($zip->open($path) === true, 422, 'Unable to open DOCX file.');

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        abort_if($xml === false, 422, 'Unable to read DOCX document text.');

        $xml = preg_replace('/<w:tab\/>/', "\t", $xml) ?? $xml;
        $xml = preg_replace('/<\/w:p>/', "\n", $xml) ?? $xml;
        $text = html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');

        return trim((string) preg_replace("/[ \t]+\n/", "\n", $text));
    }

    private function formatDocument(array $row): array
    {
        return [
            'id' => (int) $row['doc_id'],
            'title' => (string) $row['doc_title'],
            'type' => (string) $row['doc_type'],
            'scope' => (string) $row['doc_scope'],
            'partner_slug' => $row['doc_partner_slug'] ?? null,
            'status' => (string) $row['doc_status'],
            'index_status' => (string) $row['doc_index_status'],
            'content' => (string) $row['doc_content'],
            'metadata' => isset($row['doc_metadata']) ? json_decode((string) $row['doc_metadata'], true) : null,
            'indexed_at' => $row['doc_indexed_at'] ?? null,
            'index_error' => $row['doc_index_error'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }
}
