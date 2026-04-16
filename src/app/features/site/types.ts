export type BookPhoto = {
  url: string;
  altText?: string;
};

export type Book = {
  id: string;
  title: string;
  status?: string;
  isFeatured?: boolean;
  scheduleDate?: string;
  genres?: string[];
  photos?: BookPhoto[];
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
    stripe: {
      connected: boolean;
      email: string;
      publicKey?: string;
      secretKey?: string;
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
      clientSecret?: string;
      venmo: boolean;
      buyNowPayLater: boolean;
    };
  };
  taxes?: {
    rates: Array<{ country: string; rate: string | number }>;
  };
  design?: {
    primaryColor: string;
    font: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
};
