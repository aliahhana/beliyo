/**
 * Chat Routing Utilities
 * 
 * This utility provides consistent routing patterns for the unified 1:1 chat system
 * across all contexts (shop, exchange, mission, general).
 */

export interface ChatRoute {
  path: string
  context: {
    type: 'shop' | 'exchange' | 'mission' | 'general'
    id?: string
    title?: string
  }
  otherUserId: string
}

/**
 * Generate chat route for shop/product conversations
 */
export function generateShopChatRoute(productId: string, otherUserId: string): ChatRoute {
  return {
    path: `/chat/shop/${productId}/${otherUserId}`,
    context: {
      type: 'shop',
      id: productId,
      title: 'Product Chat'
    },
    otherUserId
  }
}

/**
 * Generate chat route for money exchange conversations
 */
export function generateExchangeChatRoute(exchangeId: string, otherUserId: string): ChatRoute {
  return {
    path: `/chat/exchange/${exchangeId}/${otherUserId}`,
    context: {
      type: 'exchange',
      id: exchangeId,
      title: 'Exchange Chat'
    },
    otherUserId
  }
}

/**
 * Generate chat route for mission conversations
 */
export function generateMissionChatRoute(missionId: string, otherUserId: string): ChatRoute {
  return {
    path: `/chat/mission/${missionId}/${otherUserId}`,
    context: {
      type: 'mission',
      id: missionId,
      title: 'Mission Chat'
    },
    otherUserId
  }
}

/**
 * Generate chat route for general direct messages
 */
export function generateGeneralChatRoute(otherUserId: string): ChatRoute {
  return {
    path: `/chat/general/${otherUserId}`,
    context: {
      type: 'general',
      title: 'Direct Message'
    },
    otherUserId
  }
}

/**
 * Parse chat route from URL parameters
 */
export function parseChatRoute(params: {
  type?: string
  id?: string
  otherUserId?: string
}): ChatRoute | null {
  const { type, id, otherUserId } = params

  if (!otherUserId) {
    return null
  }

  switch (type) {
    case 'shop':
      return id ? generateShopChatRoute(id, otherUserId) : null
    case 'exchange':
      return id ? generateExchangeChatRoute(id, otherUserId) : null
    case 'mission':
      return id ? generateMissionChatRoute(id, otherUserId) : null
    case 'general':
      return generateGeneralChatRoute(otherUserId)
    default:
      return generateGeneralChatRoute(otherUserId)
  }
}

/**
 * Get back navigation path based on chat context
 */
export function getChatBackPath(context: { type: string; id?: string }): string {
  switch (context.type) {
    case 'shop':
      return context.id ? `/shop/product/${context.id}` : '/shop'
    case 'exchange':
      return context.id ? `/money-exchange/${context.id}` : '/money-exchange'
    case 'mission':
      return context.id ? `/missions/${context.id}` : '/missions'
    default:
      return '/chat-list'
  }
}

/**
 * Validate chat route parameters
 */
export function validateChatRoute(params: {
  type?: string
  id?: string
  otherUserId?: string
}): { valid: boolean; error?: string } {
  const { type, id, otherUserId } = params

  if (!otherUserId) {
    return { valid: false, error: 'Other user ID is required for 1:1 conversations' }
  }

  if (type && !['shop', 'exchange', 'mission', 'general'].includes(type)) {
    return { valid: false, error: 'Invalid chat context type' }
  }

  if ((type === 'shop' || type === 'exchange' || type === 'mission') && !id) {
    return { valid: false, error: `Context ID is required for ${type} chats` }
  }

  return { valid: true }
}

/**
 * Legacy route migration helpers
 */
export function migrateLegacyChatRoute(legacyPath: string): string | null {
  // Handle legacy chat routes and convert them to new format
  
  // Legacy: /chat/:productId -> New: /chat/shop/:productId/:otherUserId
  if (legacyPath.match(/^\/chat\/[^/]+$/)) {
    const productId = legacyPath.split('/')[2]
    // Note: otherUserId would need to be determined from context
    return `/chat/shop/${productId}/PLACEHOLDER_USER_ID`
  }

  // Legacy: /chat/exchange/:exchangeId -> New: /chat/exchange/:exchangeId/:otherUserId
  if (legacyPath.match(/^\/chat\/exchange\/[^/]+$/)) {
    const exchangeId = legacyPath.split('/')[3]
    return `/chat/exchange/${exchangeId}/PLACEHOLDER_USER_ID`
  }

  // Legacy: /chat -> New: /chat-list
  if (legacyPath === '/chat') {
    return '/chat-list'
  }

  return null
}

/**
 * Generate chat button/link props for UI components
 */
export function generateChatButtonProps(
  contextType: 'shop' | 'exchange' | 'mission' | 'general',
  contextId: string | undefined,
  otherUserId: string,
  title?: string
) {
  let route: ChatRoute

  switch (contextType) {
    case 'shop':
      route = contextId ? generateShopChatRoute(contextId, otherUserId) : generateGeneralChatRoute(otherUserId)
      break
    case 'exchange':
      route = contextId ? generateExchangeChatRoute(contextId, otherUserId) : generateGeneralChatRoute(otherUserId)
      break
    case 'mission':
      route = contextId ? generateMissionChatRoute(contextId, otherUserId) : generateGeneralChatRoute(otherUserId)
      break
    default:
      route = generateGeneralChatRoute(otherUserId)
  }

  if (title) {
    route.context.title = title
  }

  return {
    to: route.path,
    state: { context: route.context, otherUserId: route.otherUserId }
  }
}
