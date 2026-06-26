<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class KnowledgeBaseService
{
    private const EMBEDDING_DIMENSIONS = 768;

    public function indexDocument(int $documentId): array
    {
        $document = DB::table('tbl_ai_knowledge_documents')
            ->where('doc_id', $documentId)
            ->first();

        if (! $document) {
            throw new \InvalidArgumentException('Knowledge document not found.');
        }

        DB::table('tbl_ai_knowledge_chunks')
            ->where('kc_document_id', $documentId)
            ->delete();

        $chunks = $this->chunkText((string) $document->doc_content);
        $hasEmbeddings = false;
        $lastError = null;

        foreach ($chunks as $index => $chunk) {
            $embedding = null;
            try {
                $embedding = $this->embedText($chunk);
                $hasEmbeddings = is_array($embedding) && count($embedding) > 0;
            } catch (\Throwable $error) {
                $lastError = $error->getMessage();
            }

            $this->insertChunk($documentId, $index, $chunk, $embedding);
        }

        DB::table('tbl_ai_knowledge_documents')
            ->where('doc_id', $documentId)
            ->update([
                'doc_index_status' => $hasEmbeddings ? 'indexed' : 'keyword_only',
                'doc_indexed_at' => now(),
                'doc_index_error' => $lastError,
                'updated_at' => now(),
            ]);

        return [
            'chunks' => count($chunks),
            'index_status' => $hasEmbeddings ? 'indexed' : 'keyword_only',
            'error' => $lastError,
        ];
    }

    public function search(string $query, ?string $partnerSlug = null, int $limit = 8): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        try {
            $embedding = $this->embedText($query);
            if ($this->canUseVectorSearch() && ! empty($embedding)) {
                $results = $this->vectorSearch($embedding, $partnerSlug, $limit);
                if (! empty($results)) {
                    return $results;
                }
            }
        } catch (\Throwable) {
            // Fall through to keyword search when embeddings are unavailable.
        }

        return $this->keywordSearch($query, $partnerSlug, $limit);
    }

    public function chunkText(string $content): array
    {
        $clean = trim(preg_replace('/\s+/', ' ', strip_tags($content)) ?? $content);
        if ($clean === '') {
            return [];
        }

        $words = preg_split('/\s+/', $clean) ?: [];
        $chunks = [];
        $size = 420;
        $overlap = 60;

        for ($offset = 0; $offset < count($words); $offset += ($size - $overlap)) {
            $chunk = trim(implode(' ', array_slice($words, $offset, $size)));
            if ($chunk !== '') {
                $chunks[] = $chunk;
            }
        }

        return $chunks;
    }

    private function embedText(string $text): array
    {
        $apiKey = (string) (config('services.gemini.api_key') ?: env('GOOGLE_GENERATIVE_AI_API_KEY') ?: env('GOOGLE_API_KEY'));
        if ($apiKey === '') {
            throw new \RuntimeException('Gemini API key is not configured for backend embeddings.');
        }

        $model = $this->embeddingModel();
        $modelPath = Str::startsWith($model, 'models/') ? $model : "models/{$model}";
        $response = Http::timeout(30)->post(
            "https://generativelanguage.googleapis.com/v1beta/{$modelPath}:embedContent?key={$apiKey}",
            [
                'content' => [
                    'parts' => [
                        ['text' => mb_substr($text, 0, 8000)],
                    ],
                ],
                'output_dimensionality' => self::EMBEDDING_DIMENSIONS,
            ]
        );

        if (! $response->successful()) {
            throw new \RuntimeException('Gemini embedding error: ' . $response->body());
        }

        $values = $response->json('embedding.values') ?? $response->json('embeddings.0.values');
        if (! is_array($values) || count($values) === 0) {
            throw new \RuntimeException('Gemini embedding response did not include values.');
        }

        return array_map(static fn ($value) => (float) $value, $values);
    }

    private function embeddingModel(): string
    {
        $model = (string) config('services.gemini.embedding_model', 'gemini-embedding-2');
        $model = trim($model);

        return match ($model) {
            '', 'text-embedding-004', 'models/text-embedding-004' => 'gemini-embedding-2',
            default => $model,
        };
    }

    private function insertChunk(int $documentId, int $index, string $content, ?array $embedding): void
    {
        $payload = [
            'kc_document_id' => $documentId,
            'kc_chunk_index' => $index,
            'kc_content' => $content,
            'kc_hash' => hash('sha256', $content),
            'kc_token_estimate' => max(1, (int) ceil(str_word_count($content) * 1.3)),
            'kc_embedding_json' => $embedding ? json_encode($embedding) : null,
            'kc_metadata' => null,
            'kc_indexed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (! $this->canUseVectorSearch() || empty($embedding)) {
            $payload['kc_embedding'] = $embedding ? $this->vectorLiteral($embedding) : null;
            DB::table('tbl_ai_knowledge_chunks')->insert($payload);
            return;
        }

        DB::insert(
            'INSERT INTO tbl_ai_knowledge_chunks
                (kc_document_id, kc_chunk_index, kc_content, kc_hash, kc_token_estimate, kc_embedding_json, kc_embedding, kc_metadata, kc_indexed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?::json, ?::vector, NULL, ?, ?, ?)',
            [
                $payload['kc_document_id'],
                $payload['kc_chunk_index'],
                $payload['kc_content'],
                $payload['kc_hash'],
                $payload['kc_token_estimate'],
                $payload['kc_embedding_json'],
                $this->vectorLiteral($embedding),
                $payload['kc_indexed_at'],
                $payload['created_at'],
                $payload['updated_at'],
            ]
        );
    }

    private function vectorSearch(array $embedding, ?string $partnerSlug, int $limit): array
    {
        $vector = $this->vectorLiteral($embedding);
        $rows = DB::select(
            'SELECT
                c.kc_id,
                c.kc_content,
                d.doc_id,
                d.doc_title,
                d.doc_type,
                d.doc_scope,
                d.doc_partner_slug,
                1 - (c.kc_embedding <=> ?::vector) AS score
             FROM tbl_ai_knowledge_chunks c
             INNER JOIN tbl_ai_knowledge_documents d ON d.doc_id = c.kc_document_id
             WHERE d.doc_status = ?
               AND c.kc_embedding IS NOT NULL
               AND (d.doc_scope = ? OR (d.doc_partner_slug IS NOT NULL AND d.doc_partner_slug = ?))
             ORDER BY c.kc_embedding <=> ?::vector
             LIMIT ?',
            [$vector, 'active', 'global', $partnerSlug ?? '', $vector, $limit]
        );

        return array_map(fn ($row) => $this->formatResult((array) $row), $rows);
    }

    private function keywordSearch(string $query, ?string $partnerSlug, int $limit): array
    {
        $tokens = collect(preg_split('/\s+/', Str::lower($query)) ?: [])
            ->map(fn ($token) => trim($token))
            ->filter(fn ($token) => mb_strlen($token) >= 3)
            ->take(8)
            ->values();

        $builder = DB::table('tbl_ai_knowledge_chunks as c')
            ->join('tbl_ai_knowledge_documents as d', 'd.doc_id', '=', 'c.kc_document_id')
            ->select([
                'c.kc_id',
                'c.kc_content',
                'd.doc_id',
                'd.doc_title',
                'd.doc_type',
                'd.doc_scope',
                'd.doc_partner_slug',
            ])
            ->where('d.doc_status', 'active')
            ->where(function ($scope) use ($partnerSlug) {
                $scope->where('d.doc_scope', 'global');
                if ($partnerSlug) {
                    $scope->orWhere('d.doc_partner_slug', $partnerSlug);
                }
            });

        if ($tokens->isNotEmpty()) {
            $builder->where(function ($where) use ($tokens) {
                foreach ($tokens as $token) {
                    $operator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                    $where->orWhere('c.kc_content', $operator, "%{$token}%")
                        ->orWhere('d.doc_title', $operator, "%{$token}%");
                }
            });
        }

        return $builder
            ->orderByDesc('c.kc_id')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => $this->formatResult((array) $row + ['score' => null]))
            ->values()
            ->all();
    }

    private function formatResult(array $row): array
    {
        return [
            'chunk_id' => (int) $row['kc_id'],
            'document_id' => (int) $row['doc_id'],
            'title' => (string) $row['doc_title'],
            'type' => (string) $row['doc_type'],
            'scope' => (string) $row['doc_scope'],
            'partner_slug' => $row['doc_partner_slug'] ?? null,
            'content' => (string) $row['kc_content'],
            'score' => isset($row['score']) ? round((float) $row['score'], 4) : null,
        ];
    }

    private function vectorLiteral(array $embedding): string
    {
        return '[' . implode(',', array_map(static fn ($value) => (string) (float) $value, $embedding)) . ']';
    }

    private function canUseVectorSearch(): bool
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return false;
        }

        try {
            $type = DB::scalar(
                "SELECT udt_name
                 FROM information_schema.columns
                 WHERE table_name = 'tbl_ai_knowledge_chunks'
                   AND column_name = 'kc_embedding'"
            );

            return $type === 'vector';
        } catch (\Throwable) {
            return false;
        }
    }
}
