/**
 * Dependency Resolver
 * Builds entity dependency graph from FK relations and performs topological sort (Kahn's algorithm)
 * Ensures seed order respects all foreign key constraints
 */

import type { NormalizedSchema, Relation } from '../../types/index.js';

export interface DependencyGraph {
  /** Map of entity name -> set of entities it depends on (has FK pointing to) */
  dependencies: Map<string, Set<string>>;
  /** Topologically sorted entity names (seed order) */
  seedOrder: string[];
  /** Detected cycles (if any) */
  cycles: string[][];
  /** Self-referential entities detected */
  selfReferential: string[];
}

export function buildDependencyGraph(schema: NormalizedSchema): DependencyGraph {
  const dependencies = new Map<string, Set<string>>();
  const selfReferential: string[] = [];

  // Initialize all entities
  for (const entity of schema.entities) {
    dependencies.set(entity.name, new Set());
  }

  // Build dependency edges from relations
  for (const relation of schema.relations) {
    const fromEntity = relation.from.entity;
    const toEntity = relation.to.entity;

    if (fromEntity === toEntity) {
      // Self-referential: Category.parentId -> Category.id
      if (!selfReferential.includes(fromEntity)) {
        selfReferential.push(fromEntity);
      }
    } else {
      // from depends on to (must seed to before from)
      dependencies.get(fromEntity)?.add(toEntity);
    }
  }

  // Also check field-level FK references
  for (const entity of schema.entities) {
    for (const field of entity.fields) {
      if (field.isForeignKey && field.referencedEntity) {
        if (field.referencedEntity === entity.name) {
          if (!selfReferential.includes(entity.name)) {
            selfReferential.push(entity.name);
          }
        } else {
          dependencies.get(entity.name)?.add(field.referencedEntity);
        }
      }
    }
  }

  // Topological sort using Kahn's algorithm
  const { order, cycles } = topologicalSort(dependencies);

  return {
    dependencies,
    seedOrder: order,
    cycles,
    selfReferential,
  };
}

function topologicalSort(dependencies: Map<string, Set<string>>): {
  order: string[];
  cycles: string[][];
} {
  const nodes = Array.from(dependencies.keys());

  // Calculate in-degree for each node
  // in-degree = number of dependencies that this node has
  // (how many entities must be seeded BEFORE this one)
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node, dependencies.get(node)?.size ?? 0);
  }

  // Build reverse adjacency: for each dependency target, which nodes depend on it
  const dependents = new Map<string, Set<string>>();
  for (const node of nodes) {
    dependents.set(node, new Set());
  }
  for (const [node, deps] of dependencies) {
    for (const dep of deps) {
      dependents.get(dep)?.add(node);
    }
  }

  // Start with nodes that have no dependencies (in-degree = 0)
  const queue: string[] = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  const order: string[] = [];
  
  while (queue.length > 0) {
    // Pick the first node with in-degree 0 (stable ordering)
    const current = queue.shift()!;
    order.push(current);

    // For all entities that depend on current, reduce their in-degree
    for (const dependent of dependents.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // Detect cycles: nodes not in order have circular dependencies
  const cycles: string[][] = [];
  if (order.length < nodes.length) {
    const remaining = nodes.filter(n => !order.includes(n));
    
    // Find cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function findCycle(startNode: string): string[] | null {
      const path: string[] = [];
      
      function dfs(node: string): boolean {
        if (recursionStack.has(node)) {
          // Found cycle - extract it
          const cycleStart = path.indexOf(node);
          if (cycleStart >= 0) {
            const cycle = path.slice(cycleStart);
            cycles.push(cycle);
          }
          return true;
        }
        if (visited.has(node)) return false;
        
        visited.add(node);
        recursionStack.add(node);
        path.push(node);
        
        const deps = dependencies.get(node);
        if (deps) {
          for (const dep of deps) {
            if (remaining.includes(dep)) {
              if (dfs(dep)) return true;
            }
          }
        }
        
        path.pop();
        recursionStack.delete(node);
        return false;
      }
      
      dfs(startNode);
      return null;
    }
    
    for (const node of remaining) {
      if (!visited.has(node)) {
        findCycle(node);
      }
    }
    
    // If no cycles found but still remaining nodes, report them as a single cycle
    if (cycles.length === 0 && remaining.length > 0) {
      cycles.push(remaining);
    }
  }

  return { order, cycles };
}

export function generateSelfReferentialStrategy(
  entityName: string,
  totalRecords: number,
): { pass1Count: number; pass2Count: number } {
  // Pass 1: Create root records (no parent reference)
  // Pass 2: Assign parent references from pass 1 records
  const rootPercentage = 0.3; // 30% are root-level
  const pass1Count = Math.max(1, Math.floor(totalRecords * rootPercentage));
  return {
    pass1Count,
    pass2Count: totalRecords - pass1Count,
  };
}
