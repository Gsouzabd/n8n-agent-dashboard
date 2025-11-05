import { supabase } from '@/lib/supabase'
import { AgentHandoffConfig, AgentHandoffTrigger } from '@/types'

export const handoffService = {
  /**
   * Get handoff configuration for an agent
   */
  async getHandoffConfig(agentId: string): Promise<AgentHandoffConfig | null> {
    const { data, error } = await supabase
      .from('agent_handoff_config')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching handoff config:', error)
      throw new Error('Failed to fetch handoff configuration')
    }

    return data
  },

  /**
   * Save or update handoff configuration for an agent
   */
  async saveHandoffConfig(agentId: string, enabled: boolean): Promise<AgentHandoffConfig> {
    // Check if config exists
    const existing = await this.getHandoffConfig(agentId)

    if (existing) {
      // Update existing config
      const { data, error } = await supabase
        .from('agent_handoff_config')
        .update({ enabled })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating handoff config:', error)
        throw new Error('Failed to update handoff configuration')
      }

      return data
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('agent_handoff_config')
        .insert({ agent_id: agentId, enabled })
        .select()
        .single()

      if (error) {
        console.error('Error creating handoff config:', error)
        throw new Error('Failed to create handoff configuration')
      }

      return data
    }
  },

  /**
   * Get all triggers for an agent
   */
  async getTriggers(agentId: string): Promise<AgentHandoffTrigger[]> {
    const { data, error } = await supabase
      .from('agent_handoff_triggers')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching triggers:', error)
      throw new Error('Failed to fetch triggers')
    }

    return data || []
  },

  /**
   * Save or update a trigger
   */
  async saveTrigger(trigger: Partial<AgentHandoffTrigger>): Promise<AgentHandoffTrigger> {
    if (!trigger.agent_id) {
      throw new Error('Agent ID is required')
    }

    if (!trigger.trigger_type || !trigger.value) {
      throw new Error('Trigger type and value are required')
    }

    // Validate matching_type only for keyword triggers
    if (trigger.trigger_type !== 'keyword' && trigger.matching_type) {
      throw new Error('Matching type is only allowed for keyword triggers')
    }

    if (trigger.id) {
      // Update existing trigger
      const { id, agent_id, trigger_type, value, matching_type, is_active } = trigger
      const updateData: Partial<AgentHandoffTrigger> = {
        trigger_type,
        value,
        is_active: is_active ?? true,
      }

      // Only include matching_type if trigger_type is keyword
      if (trigger_type === 'keyword') {
        updateData.matching_type = matching_type
      } else {
        updateData.matching_type = null
      }

      const { data, error } = await supabase
        .from('agent_handoff_triggers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating trigger:', error)
        throw new Error('Failed to update trigger')
      }

      return data
    } else {
      // Create new trigger
      const insertData: Partial<AgentHandoffTrigger> = {
        agent_id: trigger.agent_id,
        trigger_type: trigger.trigger_type,
        value: trigger.value,
        is_active: trigger.is_active ?? true,
      }

      // Only include matching_type if trigger_type is keyword
      if (trigger.trigger_type === 'keyword') {
        insertData.matching_type = trigger.matching_type
      }

      const { data, error } = await supabase
        .from('agent_handoff_triggers')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating trigger:', error)
        throw new Error('Failed to create trigger')
      }

      return data
    }
  },

  /**
   * Delete a trigger
   */
  async deleteTrigger(triggerId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_handoff_triggers')
      .delete()
      .eq('id', triggerId)

    if (error) {
      console.error('Error deleting trigger:', error)
      throw new Error('Failed to delete trigger')
    }
  },

  /**
   * Toggle trigger active status
   */
  async toggleTriggerStatus(triggerId: string, isActive: boolean): Promise<AgentHandoffTrigger> {
    const { data, error } = await supabase
      .from('agent_handoff_triggers')
      .update({ is_active: isActive })
      .eq('id', triggerId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling trigger status:', error)
      throw new Error('Failed to toggle trigger status')
    }

    return data
  },
}


