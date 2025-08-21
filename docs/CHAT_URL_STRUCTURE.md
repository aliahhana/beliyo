# Chat URL Structure Documentation

## Overview
The BeliYo! application implements a dynamic chat system with item-specific URLs that enable direct navigation to product-related conversations.

## URL Pattern
```
/chat/item/{encodedItemCode}/{sellerId}
```

### Components

#### 1. Encoded Item Code
- **Format**: `{productId}_{productName}_{category}`
- **Encoding**: URL-encoded using `encodeURIComponent()`
- **Example**: `f7940537-d19f-434c-839a-f92ce769a9a8_Gaming_Laptop_electric-electronics`
- **Encoded**: `f7940537-d19f-434c-839a-f92ce769a9a8_Gaming_Laptop_electric-electronics`

#### 2. Seller ID
- **Format**: UUID string
- **Purpose**: Identifies the seller/other participant in the 1:1 conversation
- **Example**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

## Complete URL Examples

### Standard Product Chat
```
/chat/item/f7940537-d19f-434c-839a-f92ce769a9a8_Gaming_Laptop_electric-electronics/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Product with Special Characters
```
/chat/item/abc123_iPhone%2014%20Pro%20Max_electric-electronics/seller-uuid-here
```

### Free Item
```
/chat/item/def456_Free%20Textbooks_books/another-seller-uuid
```

## URL Generation Process

### 1. Item Code Creation
```typescript
const generateItemCode = (product) => {
  const sanitizeName = (name) => 
    name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  
  const sanitizedName = sanitizeName(product.name)
  const sanitizedCategory = product.category ? sanitizeName(product.category) : 'general'
  
  return `${product.id}_${sanitizedName}_${sanitizedCategory}`
}
```

### 2. URL Encoding
```typescript
const encodeItemCode = (itemCode) => {
  try {
    return encodeURIComponent(itemCode)
  } catch (error) {
    // Fallback encoding
    return itemCode.replace(/[^a-zA-Z0-9_-]/g, '_')
  }
}
```

### 3. Final URL Construction
```typescript
const chatUrl = `/chat/item/${encodedItemCode}/${sellerId}`
```

## URL Decoding Process

### 1. Extract Parameters
```typescript
const { encodedItemCode, sellerId } = useParams()
```

### 2. Decode Item Code
```typescript
const decodeItemCode = (encodedCode) => {
  try {
    const decodedCode = decodeURIComponent(encodedCode)
    const parts = decodedCode.split('_')
    
    return {
      productId: parts[0],
      productName: parts.slice(1, -1).join('_'),
      category: parts[parts.length - 1]
    }
  } catch (error) {
    return null
  }
}
```

## Error Handling

### Invalid URLs
- Missing parameters → Redirect to chat list
- Malformed item codes → Show error message
- Non-existent products → "Product not found" error
- Invalid seller IDs → "Seller not found" error

### Authentication
- Unauthenticated users → Redirect to login with return URL
- Self-chat attempts → "Cannot chat with yourself" warning

## SEO Considerations

### Meta Tags
- Dynamic titles based on product name
- Product descriptions in meta descriptions
- Proper Open Graph tags for social sharing

### URL Structure Benefits
- Human-readable item codes
- SEO-friendly product names in URLs
- Clear hierarchy: `/chat/item/...`

## Accessibility

### Button Attributes
```html
<button
  aria-label="Chat with seller about {productName}"
  aria-describedby="chat-button-description"
  type="button"
>
```

### Screen Reader Support
```html
<span id="chat-button-description" class="sr-only">
  Opens a private chat conversation with the seller of {productName}
</span>
```

## Security Considerations

### Input Sanitization
- Product names sanitized before URL generation
- Special characters properly encoded
- SQL injection prevention through parameterized queries

### Authentication State
- JWT tokens preserved during navigation
- Session state maintained across redirects
- Proper authorization checks before chat access

## Performance Optimizations

### Loading States
- Button shows loading spinner during navigation
- Skeleton loaders for chat page initialization
- Optimistic UI updates where possible

### Caching
- Product information cached after first load
- Chat history cached for offline access
- Image assets cached for faster loading

## Integration Points

### With Unified Chat System
- Item-specific chats integrate with existing 1:1 conversation system
- Chat context includes product metadata
- Message history preserved across sessions

### With Product Pages
- Seamless navigation from product details to chat
- Back navigation returns to product page
- Product context maintained throughout chat session
