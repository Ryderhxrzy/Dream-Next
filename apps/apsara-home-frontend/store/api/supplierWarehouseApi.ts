import { baseApi } from './baseApi'

export interface SupplierWarehouseProfile {
  id: number
  supplier_id: number
  warehouse_name: string
  warehouse_address: string
  image_url?: string | null
  google_maps_url?: string | null
  waze_url?: string | null
}

export interface SupplierWarehouseResponse {
  warehouse: SupplierWarehouseProfile
  message?: string
}

export interface SupplierWarehousesResponse {
  warehouses: SupplierWarehouseProfile[]
}

export const supplierWarehouseApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getSupplierWarehouses: builder.query<SupplierWarehousesResponse, void>({
      query: () => ({
        url: '/api/supplier/warehouse',
        method: 'GET',
      }),
      providesTags: ['Suppliers'],
    }),
    getAdminSupplierWarehouses: builder.query<SupplierWarehousesResponse, number>({
      query: (supplierId) => ({
        url: `/api/admin/suppliers/${supplierId}/warehouses`,
        method: 'GET',
      }),
      providesTags: ['Suppliers'],
    }),
    createSupplierWarehouse: builder.mutation<SupplierWarehouseResponse, FormData>({
      query: (body) => ({
        url: '/api/supplier/warehouse',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Suppliers'],
    }),
    updateSupplierWarehouse: builder.mutation<SupplierWarehouseResponse, { id: number; body: FormData }>({
      query: ({ id, body }) => ({
        url: `/api/supplier/warehouse/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Suppliers'],
    }),
    deleteSupplierWarehouse: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/api/supplier/warehouse/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Suppliers'],
    }),
  }),
})

export const {
  useGetSupplierWarehousesQuery,
  useGetAdminSupplierWarehousesQuery,
  useCreateSupplierWarehouseMutation,
  useUpdateSupplierWarehouseMutation,
  useDeleteSupplierWarehouseMutation,
} = supplierWarehouseApi
