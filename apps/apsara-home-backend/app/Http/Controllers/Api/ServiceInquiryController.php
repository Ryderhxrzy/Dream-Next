<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ServiceInquiry;
use App\Models\SupplierUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceInquiryController extends Controller
{
    /**
     * Customer submits a service inquiry.
     * Route: POST /api/service-inquiries
     * Middleware: auth:sanctum, customer.actor (optional — also accepts guests via no-auth route)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:tbl_product,pd_id',
            'fullname'   => 'required|string|max:255',
            'email'      => 'required|email|max:255',
            'contact'    => 'required|string|max:50',
            'address'    => 'required|string|max:1000',
        ]);

        $product = Product::query()->findOrFail((int) $validated['product_id']);
        $supplierId = (int) $product->pd_supplier;

        $customer = $request->user();
        $customerId = ($customer instanceof Customer) ? (int) $customer->c_userid : null;

        $inquiry = ServiceInquiry::create([
            'product_id'  => (int) $validated['product_id'],
            'supplier_id' => $supplierId,
            'customer_id' => $customerId,
            'fullname'    => $validated['fullname'],
            'email'       => $validated['email'],
            'contact'     => $validated['contact'],
            'address'     => $validated['address'],
            'status'      => 'new',
        ]);

        return response()->json([
            'message' => 'Inquiry submitted successfully.',
            'inquiry' => [
                'id'         => $inquiry->id,
                'product_id' => $inquiry->product_id,
                'status'     => $inquiry->status,
                'created_at' => $inquiry->created_at,
            ],
        ], 201);
    }

    /**
     * Admin views all service inquiries across all suppliers.
     * Route: GET /api/admin/service-inquiries
     * Middleware: auth:sanctum, admin.token.validation, admin.role
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $status  = $request->query('status');
        $search  = $request->query('search');
        $perPage = min((int) ($request->query('per_page', 20)), 100);

        $query = ServiceInquiry::query()
            ->with(['product:pd_id,pd_name,pd_image'])
            ->orderByDesc('created_at');

        if ($status && in_array($status, ['new', 'viewed', 'responded', 'closed'], true)) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('fullname', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('contact', 'like', "%{$search}%");
            });
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'inquiries' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
            'counts' => [
                'total'     => ServiceInquiry::count(),
                'new'       => ServiceInquiry::where('status', 'new')->count(),
                'viewed'    => ServiceInquiry::where('status', 'viewed')->count(),
                'responded' => ServiceInquiry::where('status', 'responded')->count(),
                'closed'    => ServiceInquiry::where('status', 'closed')->count(),
            ],
        ]);
    }

    /**
     * Supplier views their service inquiries.
     * Route: GET /api/supplier/service-inquiries
     * Middleware: auth:sanctum, supplier.actor
     */
    public function index(Request $request): JsonResponse
    {
        $supplierUser = $request->user();
        if (! $supplierUser instanceof SupplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplierId = (int) $supplierUser->su_supplier;

        $status  = $request->query('status');
        $perPage = min((int) ($request->query('per_page', 20)), 100);

        $query = ServiceInquiry::query()
            ->where('supplier_id', $supplierId)
            ->with(['product:pd_id,pd_name,pd_image'])
            ->orderByDesc('created_at');

        if ($status && in_array($status, ['new', 'viewed', 'responded', 'closed'], true)) {
            $query->where('status', $status);
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'inquiries' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
            'counts' => [
                'total'     => ServiceInquiry::where('supplier_id', $supplierId)->count(),
                'new'       => ServiceInquiry::where('supplier_id', $supplierId)->where('status', 'new')->count(),
                'viewed'    => ServiceInquiry::where('supplier_id', $supplierId)->where('status', 'viewed')->count(),
                'responded' => ServiceInquiry::where('supplier_id', $supplierId)->where('status', 'responded')->count(),
                'closed'    => ServiceInquiry::where('supplier_id', $supplierId)->where('status', 'closed')->count(),
            ],
        ]);
    }

    /**
     * Admin updates any inquiry status.
     * Route: PATCH /api/admin/service-inquiries/{id}
     * Middleware: auth:sanctum, admin.token.validation, admin.role
     */
    public function adminUpdateStatus(Request $request, int $id): JsonResponse
    {
        $inquiry = ServiceInquiry::query()->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:new,viewed,responded,closed',
        ]);

        $inquiry->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Inquiry status updated.',
            'inquiry' => $inquiry->only(['id', 'status', 'updated_at']),
        ]);
    }

    /**
     * Supplier updates inquiry status.
     * Route: PATCH /api/supplier/service-inquiries/{id}
     * Middleware: auth:sanctum, supplier.actor
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $supplierUser = $request->user();
        if (! $supplierUser instanceof SupplierUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $supplierId = (int) $supplierUser->su_supplier;

        $inquiry = ServiceInquiry::query()
            ->where('id', $id)
            ->where('supplier_id', $supplierId)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:new,viewed,responded,closed',
        ]);

        $inquiry->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Inquiry status updated.',
            'inquiry' => $inquiry->only(['id', 'status', 'updated_at']),
        ]);
    }
}
