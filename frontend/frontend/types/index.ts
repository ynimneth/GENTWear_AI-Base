export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number | null;
  sort_order: number;
  is_active: boolean;
  subcategories?: Category[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size?: string | null;
  color?: string | null;
  color_hex?: string | null;
  price_override?: number | null;
  stock_qty: number;
  sku?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compare_at_price?: number | null;
  category_id?: number | null;
  is_active: boolean;
  is_featured: boolean;
  category?: Category | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}
