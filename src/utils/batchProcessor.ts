/**
 * Utility functions for batch processing operations
 */

export interface BatchProcessOptions {
  batchSize: number;
  delayMs?: number;
  onProgress?: (completed: number, total: number) => void;
  onBatchComplete?: (batchIndex: number, batchResults: any[]) => void;
}

export interface BatchProcessorOptions {
  batchSize?: number;
  delayMs?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Generic batch processor for individual items
 */
export const batchProcessor = async <T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  options: BatchProcessorOptions = {}
): Promise<void> => {
  const { batchSize = 10, delayMs = 100, onProgress } = options;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch items in parallel
    await Promise.all(batch.map(item => processor(item)));
    
    onProgress?.(Math.min(i + batchSize, items.length), items.length);
    
    // Add delay between batches if specified
    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

/**
 * Process items in batches with optional delay between batches
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchProcessOptions
): Promise<R[]> {
  const { batchSize, delayMs = 0, onProgress, onBatchComplete } = options;
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);
    
    try {
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      onBatchComplete?.(batchIndex, batchResults);
      onProgress?.(Math.min(i + batchSize, items.length), items.length);
      
      // Add delay between batches if specified
      if (delayMs > 0 && batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Error processing batch ${batchIndex + 1}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Batch update leads with progress tracking
 */
export async function batchUpdateLeads(
  leadIds: string[],
  updates: Record<string, any>,
  options: Partial<BatchProcessOptions> = {}
) {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const defaultOptions: BatchProcessOptions = {
    batchSize: 50,
    delayMs: 100,
    ...options
  };

  return processBatch(
    leadIds,
    async (batch) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .in('id', batch)
        .select('id');
      
      if (error) throw error;
      return data || [];
    },
    defaultOptions
  );
}

/**
 * Batch create lead assignments with progress tracking
 */
export async function batchCreateAssignments(
  assignments: Array<{ lead_id: string; team_member_id: string; assigned_by: string }>,
  options: Partial<BatchProcessOptions> = {}
) {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const defaultOptions: BatchProcessOptions = {
    batchSize: 50,
    delayMs: 100,
    ...options
  };

  return processBatch(
    assignments,
    async (batch) => {
      const { data, error } = await supabase
        .from('lead_assignments')
        .insert(batch)
        .select('id');
      
      if (error) throw error;
      return data || [];
    },
    defaultOptions
  );
}

/**
 * Batch create tasks with progress tracking
 */
export async function batchCreateTasks(
  tasks: Array<{
    title: string;
    description?: string;
    type: string;
    priority: string;
    due_date: string;
    lead_id?: string;
    user_id: string;
  }>,
  options: Partial<BatchProcessOptions> = {}
) {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const defaultOptions: BatchProcessOptions = {
    batchSize: 50,
    delayMs: 100,
    ...options
  };

  return processBatch(
    tasks,
    async (batch) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(batch)
        .select('id');
      
      if (error) throw error;
      return data || [];
    },
    defaultOptions
  );
}