<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tbl_supplier_warehouses')) {
            Schema::create('tbl_supplier_warehouses', function (Blueprint $table): void {
                $table->bigIncrements('sw_id');
                $table->unsignedBigInteger('sw_supplier_id');
                $table->string('sw_name', 255);
                $table->text('sw_address');
                $table->text('sw_image_url')->nullable();
                $table->timestamps();

                $table->index('sw_supplier_id', 'idx_tbl_supplier_warehouses_supplier_id');
            });
        }

        $existingSuppliers = DB::table('tbl_supplier')
            ->select([
                's_id',
                's_warehouse_name',
                's_warehouse_address',
                's_warehouse_image_url',
            ])
            ->where(function ($query): void {
                $query
                    ->whereNotNull('s_warehouse_name')
                    ->orWhereNotNull('s_warehouse_address')
                    ->orWhereNotNull('s_warehouse_image_url');
            })
            ->get();

        foreach ($existingSuppliers as $supplier) {
            $name = trim((string) ($supplier->s_warehouse_name ?? ''));
            $address = trim((string) ($supplier->s_warehouse_address ?? ''));
            $imageUrl = trim((string) ($supplier->s_warehouse_image_url ?? ''));

            if ($name === '' && $address === '' && $imageUrl === '') {
                continue;
            }

            DB::table('tbl_supplier_warehouses')->insert([
                'sw_supplier_id' => (int) $supplier->s_id,
                'sw_name' => $name !== '' ? $name : 'Warehouse',
                'sw_address' => $address,
                'sw_image_url' => $imageUrl !== '' ? $imageUrl : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tbl_supplier_warehouses');
    }
};
