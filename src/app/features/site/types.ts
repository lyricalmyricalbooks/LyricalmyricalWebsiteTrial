export type BookPhoto = {
  url: string;
  altText?: string;
};

export type Variant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  weight?: string;
};

export type Book = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  isbn?: string;
  sku?: string;
  retailPrice: number;
  costPrice?: number;
  stockLevel: number;
  format?: string;
  dimensions?: string;
  weight?: string;
  language?: string;
  status?: string;
  isFeatured?: boolean;
  scheduleDate?: string;
  categories?: string[];
  photos?: BookPhoto[];
  stripePriceId?: string;
  slug?: string;
  isOnSale?: boolean;
  salePrice?: number;
  variants?: Variant[];
  shippingProfileId?: string;
  authorId?: string;
};

export type SiteSettings = {
  announcements?: Array<{ message: string }>;
  maintenance?: { enabled: boolean; message: string };
  domain?: { subdomain: string; custom: string };
  info?: { name: string; description: string; website: string };
  inventory?: { tracking: boolean; overselling: boolean };
  checkout?: { requirePhone: boolean };
  assets?: { profileUrl: string; faviconUrl: string };
  location?: { street: string; city: string; state: string; zip: string; country: string };
  localization?: { timezone: string; currency: string };
  aiShield?: { blockTraining: boolean; blockShopping: boolean };
  policies?: { shipping: string; returns: string; privacy: string; terms: string; legal: string };
  communications?: {
    orderReceipts: boolean;
    shippingStatus: boolean;
    abandonedCart: boolean;
    receiptMessage: string;
    newOrderNotifications: boolean;
  };
  payments?: {
    shippo?: {
      apiToken?: string;
    };
    stripe: {
      connected: boolean;
      email: string;
      publicKey?: string;
      applePay: boolean;
      googlePay: boolean;
      afterpay: boolean;
      affirm: boolean;
      klarna: boolean;
      subscriptions: boolean;
    };
    paypal: {
      connected: boolean;
      email: string;
      clientId?: string;
      venmo: boolean;
      buyNowPayLater: boolean;
    };
  };
  taxes?: {
    rates: Array<{ country: string; rate: string | number }>;
  };
    design?: {
      primaryColor?: string;
      font?: string;
      logoUrl?: string;
      faviconUrl?: string;
      categories?: string[];
      headerLinks?: {
        showEnterArchive?: boolean;
        showInformation?: boolean;
        showCustomPages?: boolean;
        showBag?: boolean;
        showSys?: boolean;
      };
      storefront?: any;
      hero?: any;
      [key: string]: any;
    };
    draftDesign?: any;
  };

export type Page = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: "published" | "draft";
  showInNav: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  // SEO fields
  seoTitle?: string;
  metaDescription?: string;
};
