import { baseApi } from "./baseApi"

export type KnowledgeDocumentScope = "global" | "partner"
export type KnowledgeDocumentStatus = "active" | "draft" | "archived"

export interface KnowledgeDocument {
  id: number
  title: string
  type: string
  scope: KnowledgeDocumentScope
  partner_slug?: string | null
  status: KnowledgeDocumentStatus
  index_status: string
  content: string
  metadata?: Record<string, unknown> | null
  indexed_at?: string | null
  index_error?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface KnowledgeDocumentsResponse {
  documents: KnowledgeDocument[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface KnowledgeDocumentPayload {
  title: string
  type?: string
  scope?: KnowledgeDocumentScope
  partner_slug?: string | null
  status?: KnowledgeDocumentStatus
  content: string
  metadata?: Record<string, unknown> | null
}

export const knowledgeBaseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getKnowledgeDocuments: builder.query<
      KnowledgeDocumentsResponse,
      { page?: number; perPage?: number; search?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/api/admin/knowledge-documents",
        method: "GET",
        params: {
          page: params?.page ?? 1,
          per_page: params?.perPage ?? 20,
          search: params?.search || undefined,
          status: params?.status || undefined,
        },
        cache: "no-store",
      }),
      providesTags: ["KnowledgeDocuments"],
    }),
    createKnowledgeDocument: builder.mutation<
      { message: string; document: KnowledgeDocument },
      KnowledgeDocumentPayload
    >({
      query: (body) => ({
        url: "/api/admin/knowledge-documents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["KnowledgeDocuments"],
    }),
    updateKnowledgeDocument: builder.mutation<
      { message: string; document: KnowledgeDocument },
      KnowledgeDocumentPayload & { id: number }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/admin/knowledge-documents/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["KnowledgeDocuments"],
    }),
    deleteKnowledgeDocument: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/api/admin/knowledge-documents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["KnowledgeDocuments"],
    }),
    previewKnowledgeUpload: builder.mutation<
      { title: string; content: string; filename: string; extension: string },
      FormData
    >({
      query: (body) => ({
        url: "/api/admin/knowledge-documents/upload-preview",
        method: "POST",
        body,
      }),
    }),
    reindexKnowledgeDocument: builder.mutation<
      { message: string; document: KnowledgeDocument },
      number
    >({
      query: (id) => ({
        url: `/api/admin/knowledge-documents/${id}/reindex`,
        method: "POST",
      }),
      invalidatesTags: ["KnowledgeDocuments"],
    }),
  }),
})

export const {
  useCreateKnowledgeDocumentMutation,
  useDeleteKnowledgeDocumentMutation,
  useGetKnowledgeDocumentsQuery,
  usePreviewKnowledgeUploadMutation,
  useReindexKnowledgeDocumentMutation,
  useUpdateKnowledgeDocumentMutation,
} = knowledgeBaseApi
