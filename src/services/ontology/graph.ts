/**
 * UFFP Ontology Graph
 *
 * Core graph structure for managing entities and relationships.
 * Simplified from worldview plugin - no external dependencies, mobile-friendly.
 */

import {
  Entity,
  Relationship,
  OntologyState,
  Cardinality,
  EntityType,
  RelationType,
} from "./types";

export class OntologyGraph {
  private entities: Map<string, Entity>;
  private relationships: Map<string, Relationship>;
  private version: number;

  constructor() {
    this.entities = new Map();
    this.relationships = new Map();
    this.version = 0;
  }

  /**
   * Add or update an entity
   */
  addEntity(entity: Entity): void {
    const existing = this.entities.get(entity.id);
    if (existing) {
      existing.lastSeen = new Date();
      existing.observationCount++;
      Object.assign(existing.attributes, entity.attributes);
    } else {
      this.entities.set(entity.id, {
        ...entity,
        firstSeen: new Date(entity.firstSeen),
        lastSeen: new Date(entity.lastSeen),
      });
    }
    this.version++;
  }

  /**
   * Add or update a relationship
   */
  addRelationship(rel: Relationship): void {
    const existing = this.relationships.get(rel.id);
    if (existing) {
      existing.observations++;
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
    } else {
      this.relationships.set(rel.id, rel);
    }
    this.version++;
  }

  /**
   * Get entity by id
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities of a specific type
   */
  getEntitiesByType(type: EntityType): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.type === type);
  }

  /**
   * Get all relationships for an entity
   */
  getRelationships(entityId: string): Relationship[] {
    return Array.from(this.relationships.values()).filter(
      (rel) => rel.source === entityId || rel.target === entityId
    );
  }

  /**
   * Get relationships of a specific type
   */
  getRelationshipsByType(type: RelationType): Relationship[] {
    return Array.from(this.relationships.values()).filter(
      (rel) => rel.type === type
    );
  }

  /**
   * Check if a relationship exists
   */
  hasRelationship(source: string, target: string, type?: RelationType): boolean {
    for (const rel of this.relationships.values()) {
      if (rel.source === source && rel.target === target) {
        if (!type || rel.type === type) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get related entities following a relationship type
   */
  getRelatedEntities(
    entityId: string,
    relationshipType: RelationType,
    direction: "outgoing" | "incoming" | "both" = "both"
  ): Entity[] {
    const related: Entity[] = [];

    for (const rel of this.relationships.values()) {
      if (rel.type !== relationshipType) continue;

      if ((direction === "outgoing" || direction === "both") && rel.source === entityId) {
        const target = this.entities.get(rel.target);
        if (target) related.push(target);
      }

      if ((direction === "incoming" || direction === "both") && rel.target === entityId) {
        const source = this.entities.get(rel.source);
        if (source) related.push(source);
      }
    }

    return related;
  }

  /**
   * Query entities by pattern
   */
  query(pattern: {
    type?: EntityType;
    attribute?: string;
    value?: any;
  }): Entity[] {
    return Array.from(this.entities.values()).filter((entity) => {
      if (pattern.type && entity.type !== pattern.type) return false;
      if (
        pattern.attribute &&
        entity.attributes[pattern.attribute] !== pattern.value
      )
        return false;
      return true;
    });
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    entities: number;
    relationships: number;
    entitiesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
  } {
    const entitiesByType: Record<string, number> = {};
    for (const entity of this.entities.values()) {
      entitiesByType[entity.type] = (entitiesByType[entity.type] || 0) + 1;
    }

    const relationshipsByType: Record<string, number> = {};
    for (const rel of this.relationships.values()) {
      relationshipsByType[rel.type] = (relationshipsByType[rel.type] || 0) + 1;
    }

    return {
      entities: this.entities.size,
      relationships: this.relationships.size,
      entitiesByType,
      relationshipsByType,
    };
  }

  /**
   * Get current state for serialization
   */
  getState(): OntologyState {
    return {
      entities: new Map(this.entities),
      relationships: new Map(this.relationships),
      version: this.version,
      lastModified: new Date(),
    };
  }

  /**
   * Load state from serialized data
   */
  loadState(state: OntologyState): void {
    this.entities = new Map(state.entities);
    this.relationships = new Map(state.relationships);
    this.version = state.version;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.entities.clear();
    this.relationships.clear();
    this.version = 0;
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get all relationships
   */
  getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values());
  }

  /**
   * Export to simple JSON format (for debugging/inspection)
   */
  toJSON(): string {
    const data = {
      entities: Array.from(this.entities.entries()),
      relationships: Array.from(this.relationships.entries()),
      version: this.version,
    };
    return JSON.stringify(data, null, 2);
  }
}
