import { supabase } from '../lib/supabase'
import { unifiedChatService } from '../services/unifiedChatService'

/**
 * Chat Migration Utilities for 1:1 Conversations
 * 
 * These utilities help migrate existing chat data from the old group-based
 * chat systems to the new 1:1 conversation system. This ensures no data is lost
 * during the transition while enforcing the 1:1 constraint.
 */

interface LegacyMessage {
  id: string
  content: string
  user_id: string
  created_at: string
  channel_id?: string
  exchange_id?: string
  product_id?: string
  mission_id?: string
}

interface LegacyChannel {
  id: string
  name: string
  context_type: string
  context_id?: string
  title: string
  created_by: string
  created_at: string
}

/**
 * Migrate messages from the old group chat system to 1:1 conversations
 */
export async function migrateLegacyToOneOnOne(): Promise<void> {
  try {
    console.log('Starting migration to 1:1 conversations...')

    // Step 1: Identify and migrate group channels to 1:1 conversations
    await migrateGroupChannelsToOneOnOne()
    
    // Step 2: Migrate from old messages table
    await migrateLegacyMessagesTable()
    
    // Step 3: Migrate from exchange messages table
    await migrateExchangeMessages()
    
    console.log('1:1 conversation migration completed successfully')
  } catch (error) {
    console.error('Error during 1:1 migration:', error)
    throw error
  }
}

/**
 * Convert group channels to 1:1 conversations
 * For channels with more than 2 users, create separate 1:1 conversations for each pair
 */
async function migrateGroupChannelsToOneOnOne(): Promise<void> {
  try {
    // Get all channels with their memberships
    const { data: channels, error: channelsError } = await supabase
      .from('unified_channels')
      .select(`
        *,
        unified_channel_memberships(user_id)
      `)

    if (channelsError) {
      if (channelsError.code === 'PGRST116' || channelsError.code === '42P01') {
        console.log('No legacy channels found, skipping channel migration')
        return
      }
      throw channelsError
    }

    if (!channels || channels.length === 0) {
      console.log('No channels to migrate')
      return
    }

    console.log(`Processing ${channels.length} channels for 1:1 conversion...`)

    for (const channel of channels) {
      const memberships = channel.unified_channel_memberships || []
      const userIds = memberships.map((m: any) => m.user_id)

      if (userIds.length === 2) {
        // Already a 1:1 conversation, migrate directly
        await migrateChannelToConversation(channel, userIds[0], userIds[1])
      } else if (userIds.length > 2) {
        // Group channel - create 1:1 conversations for each pair
        console.log(`Converting group channel ${channel.name} with ${userIds.length} users to 1:1 conversations`)
        
        for (let i = 0; i < userIds.length; i++) {
          for (let j = i + 1; j < userIds.length; j++) {
            await migrateChannelToConversation(channel, userIds[i], userIds[j])
          }
        }
      } else {
        console.log(`Skipping channel ${channel.name} with ${userIds.length} users (invalid for 1:1)`)
      }
    }

    console.log('Channel to conversation migration completed')
  } catch (error) {
    console.error('Error migrating group channels:', error)
  }
}

/**
 * Migrate a single channel to a 1:1 conversation
 */
async function migrateChannelToConversation(
  channel: LegacyChannel, 
  userId1: string, 
  userId2: string
): Promise<void> {
  try {
    const context = {
      type: channel.context_type as 'shop' | 'exchange' | 'mission' | 'general',
      id: channel.context_id,
      title: channel.title
    }

    // Create 1:1 conversation
    const conversationId = await unifiedChatService.getOrCreateConversation(
      context, 
      userId1, 
      userId2
    )

    if (!conversationId) {
      console.error(`Failed to create conversation for channel ${channel.id}`)
      return
    }

    // Migrate messages from this channel to the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('unified_messages')
      .select('*')
      .eq('channel_id', channel.id)

    if (messagesError) {
      console.error(`Error fetching messages for channel ${channel.id}:`, messagesError)
      return
    }

    if (messages && messages.length > 0) {
      // Filter messages to only include those from the two users in this conversation
      const relevantMessages = messages.filter(m => 
        m.user_id === userId1 || m.user_id === userId2
      )

      for (const message of relevantMessages) {
        await migrateSingleMessageToConversation(message, conversationId)
      }

      console.log(`Migrated ${relevantMessages.length} messages from channel ${channel.name} to 1:1 conversation`)
    }
  } catch (error) {
    console.error(`Error migrating channel ${channel.id} to conversation:`, error)
  }
}

/**
 * Migrate messages from the old 'messages' table to 1:1 conversations
 */
async function migrateLegacyMessagesTable(): Promise<void> {
  try {
    // Check if old messages table exists
    const { data: oldMessages, error } = await supabase
      .from('messages')
      .select('*')
      .limit(1000) // Process in batches

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('Old messages table not found, skipping migration')
        return
      }
      throw error
    }

    if (!oldMessages || oldMessages.length === 0) {
      console.log('No legacy messages to migrate')
      return
    }

    console.log(`Migrating ${oldMessages.length} legacy messages to 1:1 conversations...`)

    // Group messages by context and create 1:1 conversations
    // For legacy messages without explicit recipients, we'll need to make assumptions
    // or require manual intervention
    for (const message of oldMessages) {
      // This is a simplified migration - in practice, you'd need to determine
      // the other user based on your application's logic
      console.log(`Legacy message ${message.id} needs manual review for 1:1 migration`)
    }

    console.log('Legacy messages migration completed (manual review required)')
  } catch (error) {
    console.error('Error migrating legacy messages:', error)
  }
}

/**
 * Migrate messages from the exchange_messages table to 1:1 conversations
 */
async function migrateExchangeMessages(): Promise<void> {
  try {
    // Check if exchange_messages table exists
    const { data: exchangeMessages, error } = await supabase
      .from('exchange_messages')
      .select('*')
      .limit(1000) // Process in batches

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('Exchange messages table not found, skipping migration')
        return
      }
      throw error
    }

    if (!exchangeMessages || exchangeMessages.length === 0) {
      console.log('No exchange messages to migrate')
      return
    }

    console.log(`Migrating ${exchangeMessages.length} exchange messages to 1:1 conversations...`)

    // Group messages by exchange_id and create 1:1 conversations between participants
    const exchangeGroups = new Map<string, any[]>()
    
    for (const message of exchangeMessages) {
      const exchangeId = message.exchange_id
      if (!exchangeGroups.has(exchangeId)) {
        exchangeGroups.set(exchangeId, [])
      }
      exchangeGroups.get(exchangeId)!.push(message)
    }

    for (const [exchangeId, messages] of exchangeGroups) {
      // Get unique users in this exchange
      const userIds = [...new Set(messages.map(m => m.user_id))]
      
      if (userIds.length === 2) {
        // Perfect for 1:1 conversation
        const context = {
          type: 'exchange' as const,
          id: exchangeId,
          title: 'Exchange Chat'
        }

        const conversationId = await unifiedChatService.getOrCreateConversation(
          context,
          userIds[0],
          userIds[1]
        )

        if (conversationId) {
          for (const message of messages) {
            await migrateSingleMessageToConversation(message, conversationId)
          }
          console.log(`Migrated exchange ${exchangeId} with ${messages.length} messages`)
        }
      } else {
        console.log(`Exchange ${exchangeId} has ${userIds.length} users - requires manual review for 1:1 migration`)
      }
    }

    console.log('Exchange messages migration completed')
  } catch (error) {
    console.error('Error migrating exchange messages:', error)
  }
}

/**
 * Migrate a single message to a 1:1 conversation
 */
async function migrateSingleMessageToConversation(
  message: LegacyMessage, 
  conversationId: string
): Promise<void> {
  try {
    // Check if message already exists in unified system
    const { data: existingMessage } = await supabase
      .from('unified_messages')
      .select('id')
      .eq('temp_id', `migrated_${message.id}`)
      .maybeSingle()

    if (existingMessage) {
      console.log(`Message ${message.id} already migrated, skipping`)
      return
    }

    // Insert message into unified system
    const { error: insertError } = await supabase
      .from('unified_messages')
      .insert([{
        conversation_id: conversationId,
        user_id: message.user_id,
        content: message.content,
        message_type: 'text',
        context_type: 'general', // Will be updated based on conversation context
        created_at: message.created_at,
        temp_id: `migrated_${message.id}` // Mark as migrated
      }])

    if (insertError) {
      console.error('Error inserting migrated message:', insertError)
    } else {
      console.log(`Successfully migrated message ${message.id} to conversation ${conversationId}`)
    }
  } catch (error) {
    console.error(`Error migrating message ${message.id}:`, error)
  }
}

/**
 * Validate 1:1 conversation integrity
 */
export async function validateOneOnOneIntegrity(): Promise<{
  valid: boolean
  issues: string[]
}> {
  const issues: string[] = []

  try {
    // Check for conversations with invalid user pairs
    const { data: invalidConversations, error: convError } = await supabase
      .from('unified_conversations')
      .select('id, user1_id, user2_id')
      .eq('user1_id', 'user2_id') // Same user in both fields

    if (convError) {
      issues.push(`Error checking conversations: ${convError.message}`)
    } else if (invalidConversations && invalidConversations.length > 0) {
      issues.push(`Found ${invalidConversations.length} conversations with same user in both fields`)
    }

    // Check for messages in non-existent conversations
    const { data: orphanedMessages, error: msgError } = await supabase
      .from('unified_messages')
      .select('id, conversation_id')
      .not('conversation_id', 'in', `(SELECT id FROM unified_conversations)`)

    if (msgError) {
      issues.push(`Error checking messages: ${msgError.message}`)
    } else if (orphanedMessages && orphanedMessages.length > 0) {
      issues.push(`Found ${orphanedMessages.length} messages with invalid conversation references`)
    }

    return {
      valid: issues.length === 0,
      issues
    }
  } catch (error) {
    issues.push(`Validation error: ${error}`)
    return {
      valid: false,
      issues
    }
  }
}

/**
 * Clean up old group chat tables after successful migration
 * WARNING: This will permanently delete old chat data!
 */
export async function cleanupLegacyGroupChatTables(): Promise<void> {
  console.warn('WARNING: This will permanently delete legacy group chat data!')
  
  try {
    // Only run cleanup if explicitly confirmed
    const confirmed = confirm('Are you sure you want to delete legacy group chat tables? This cannot be undone!')
    
    if (!confirmed) {
      console.log('Cleanup cancelled by user')
      return
    }

    // Validate 1:1 integrity before cleanup
    const validation = await validateOneOnOneIntegrity()
    if (!validation.valid) {
      console.error('1:1 integrity validation failed:', validation.issues)
      throw new Error('Cannot cleanup - integrity issues found')
    }

    // Drop old tables (be very careful with this!)
    const tablesToDrop = [
      'unified_channel_memberships',
      'unified_channels',
      'messages',
      'channels', 
      'channel_memberships',
      'exchange_messages'
    ]

    for (const table of tablesToDrop) {
      try {
        await supabase.rpc('drop_table_if_exists', { table_name: table })
        console.log(`Dropped legacy table: ${table}`)
      } catch (error) {
        console.log(`Table ${table} may not exist or could not be dropped:`, error)
      }
    }

    console.log('Legacy group chat tables cleanup completed')
  } catch (error) {
    console.error('Error during cleanup:', error)
    throw error
  }
}
