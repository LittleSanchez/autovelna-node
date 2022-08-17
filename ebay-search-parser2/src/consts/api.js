export const API_URL = 'http://localhost:3213/';
export const API_SELLER_URL = 'http://localhost:3213/seller';
export const API_TOKEN = 'http://localhost:3213/compatibility_token';
export const API_IMAGE_TRANSFER = 'http://localhost:3253/';

export const COMPABILITY_TEMPLATE_URL = (id, limit, offset) =>
    `https://api.ebay.com/parts_compatibility/v1/compatible_products/listing/${id}?fieldgroups=full&limit=${limit}&offset=${offset}`;
export const OAUTH_PUBLIC_KEY = "v^1.1#i^1#r^1#f^0#I^3#p^3#t^Ul42XzEwOjI3M0IxQUQzOTRBREVGMjIzRDRGNTc0QTQ0NzlGMjUxXzJfMSNFXjI2MA==";