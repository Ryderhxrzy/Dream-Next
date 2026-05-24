import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Product {
  id: number;
  soldCount: number;
  avgRating: number;
  supplierId: number;
  supplierName: string | null;
  name: string;
  description: string;
  specifications: string;
  material: string;
  warranty: string;
  catid: number;
  catsubid: number;
  roomType: number;
  brandType: number;
  brand: string;
  priceSrp: number;
  priceDp: number;
  priceMember: number;
  prodpv: number;
  qty: number;
  weight: number;
  psweight: number;
  pswidth: number;
  pslenght: number;
  psheight: number;
  assemblyRequired: boolean;
  type: number;
  musthave: boolean;
  bestseller: boolean;
  salespromo: boolean;
  manualCheckoutEnabled: boolean;
  status: number;
  sku: string;
  uploaderName: string;
  uploaderEmail: string | null;
  uploaderRole: string;
  image: string;
  images: string[];
  variants: Array<{
    id: number;
    sku: string;
    name: string;
    color: string;
    colorHex: string;
    size: string;
    style: string;
    width: number | null;
    dimension: string | null;
    height: number | null;
    priceSrp: number;
    priceDp: number;
    priceMember: number;
    prodpv: number;
    qty: number;
    status: number;
    images: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCard {
  id: number;
  name: string;
  image: string;
  soldCount: number;
  originalPrice: number;
  memberPrice: number;
  pv: number;
  brandName: string;
  variantCount: number;
  categoryId?: number;
  brandId?: number;
  badges: {
    musthave: boolean;
    bestseller: boolean;
    salespromo: boolean;
  };
}

export function toProductCard(p: Product): ProductCard {
  return {
    id: p.id,
    name: p.name,
    image: p.image,
    soldCount: p.soldCount,
    originalPrice: p.priceSrp,
    memberPrice: p.priceMember,
    pv: p.prodpv,
    brandName: p.brand,
    variantCount: p.variants?.length ?? 0,
    categoryId: p.catid,
    brandId: p.brandType,
    badges: {
      musthave: p.musthave,
      bestseller: p.bestseller,
      salespromo: p.salespromo,
    },
  };
}

export interface ProductReview {
  id: number;
  rating: number;
  review: string;
  review_image?: string;
  review_video?: string;
  review_images: string[];
  review_videos: string[];
  customer_name: string;
  customer_avatar?: string;
  created_at: string;
}

export interface ProductReviewsResponse {
  summary: {
    average: number;
    count: number;
    breakdown: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  reviews: ProductReview[];
}

export const productService = {
  async getProductCards(token?: string): Promise<ProductCard[]> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await api.get('/products', { headers });
      const products = response.data.products ?? [];
      
      // Map API response to ProductCard interface
      return products.map((product: any) => ({
        id: product.id,
        name: product.name,
        image: product.image,
        soldCount: product.soldCount,
        originalPrice: product.priceSrp,
        memberPrice: product.priceMember,
        pv: product.prodpv,
        brandName: product.brand,
        variantCount: product.variants?.length ?? 0,
        badges: {
          musthave: product.musthave,
          bestseller: product.bestseller,
          salespromo: product.salespromo,
        },
      }));
    } catch (error) {
      console.error('Error fetching product cards:', error);
      throw error;
    }
  },

  async getProducts(token?: string): Promise<Product[]> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await api.get('/products', { headers });
      // Handle different response structures
      let products: Product[] = [];
      
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        products = response.data.data;
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products;
      } else if (response.data.items && Array.isArray(response.data.items)) {
        products = response.data.items;
      } else {
        console.warn('Unexpected API response structure:', response.data);
        products = [];
      }
      
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getProductById(id: number, token?: string): Promise<Product> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await api.get(`/products/${id}`, { headers });
    return response.data.product || response.data.data || response.data;
  },

  async getProductsByCategory(catid: number, token?: string): Promise<Product[]> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await api.get(`/products/category/${catid}`, { headers });
    return response.data.data || response.data || [];
  },

  async getProductsByBrand(brandType: number, token?: string): Promise<Product[]> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await api.get(`/products?brand_type=${brandType}`, { headers });
    const products = response.data.products || response.data.data || response.data || [];
    return products; // Return all products for shuffling
  },

  async getProductsByRoom(roomType: number, token?: string): Promise<Product[]> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await api.get(`/products?room_type=${roomType}&status=1&page=1&per_page=20`, { headers });
    const data = response.data?.data || response.data?.products || response.data || [];
    return Array.isArray(data) ? data : [];
  },

  async getProductReviews(productId: number, token?: string): Promise<ProductReviewsResponse | null> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await api.get(`/products/${productId}/reviews`, { headers });
      return response.data || null;
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      return null;
    }
  },

  async getWishlist(token: string): Promise<any[]> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await api.get('/wishlist', { headers });
      const data = response.data?.data || [];

      // Convert object to array if needed
      if (typeof data === 'object' && !Array.isArray(data)) {
        return Object.values(data);
      }

      return data;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  },
};

export default productService;
