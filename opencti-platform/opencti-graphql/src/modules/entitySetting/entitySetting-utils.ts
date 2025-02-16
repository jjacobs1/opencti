import type { JSONSchemaType } from 'ajv';
import { head } from 'ramda';
import {
  ABSTRACT_STIX_CORE_RELATIONSHIP,
  ABSTRACT_STIX_CYBER_OBSERVABLE,
  ABSTRACT_STIX_DOMAIN_OBJECT
} from '../../schema/general';
import { STIX_SIGHTING_RELATIONSHIP } from '../../schema/stixSightingRelationship';
import {
  ENTITY_TYPE_CONTAINER_NOTE,
  ENTITY_TYPE_CONTAINER_OPINION,
  isStixDomainObject
} from '../../schema/stixDomainObject';
import { UnsupportedError } from '../../config/errors';
import type { AttributeConfiguration, BasicStoreEntityEntitySetting, ScaleConfig } from './entitySetting-types';
import { ENTITY_TYPE_ENTITY_SETTING } from './entitySetting-types';
import { getEntitiesFromCache } from '../../database/cache';
import { SYSTEM_USER } from '../../utils/access';
import type { AuthContext } from '../../types/user';
import { isStixCoreRelationship } from '../../schema/stixCoreRelationship';
import { isStixCyberObservable } from '../../schema/stixCyberObservable';
import { ENTITY_TYPE_CONTAINER_CASE } from '../case/case-types';
import { ENTITY_TYPE_CONTAINER_CASE_TASK } from '../case/case-task/case-task-types';

export type typeAvailableSetting = boolean | string;

export const defaultEntitySetting: Record<string, typeAvailableSetting> = {
  platform_entity_files_ref: false,
  platform_hidden_type: false,
  enforce_reference: false,
  attributes_configuration: JSON.stringify([]),
};

export const defaultScale = JSON.stringify({
  local_config: {
    better_side: 'min',
    min: {
      value: 0,
      color: '#f44336',
      label: 'Low',
    },
    max: {
      value: 100,
      color: '#6e44ad',
      label: 'Out of Range',
    },
    ticks: [
      { value: 30, color: '#ff9800', label: 'Med' },
      { value: 70, color: '#4caf50', label: 'High' },
    ],
  }
});

// Available settings works by override.
export const availableSettings: Record<string, Array<string>> = {
  [ABSTRACT_STIX_DOMAIN_OBJECT]: ['attributes_configuration', 'platform_entity_files_ref', 'platform_hidden_type', 'enforce_reference'],
  [ABSTRACT_STIX_CORE_RELATIONSHIP]: ['attributes_configuration', 'enforce_reference'],
  [STIX_SIGHTING_RELATIONSHIP]: ['attributes_configuration', 'enforce_reference'],
  // enforce_reference not available on specific entities
  [ENTITY_TYPE_CONTAINER_NOTE]: ['attributes_configuration', 'platform_entity_files_ref', 'platform_hidden_type'],
  [ENTITY_TYPE_CONTAINER_OPINION]: ['attributes_configuration', 'platform_entity_files_ref', 'platform_hidden_type'],
  [ENTITY_TYPE_CONTAINER_CASE]: ['attributes_configuration', 'platform_entity_files_ref', 'platform_hidden_type'],
  [ENTITY_TYPE_CONTAINER_CASE_TASK]: [],
};

export const getAvailableSettings = (targetType: string) => {
  let settings;
  if (isStixDomainObject(targetType)) {
    settings = availableSettings[targetType] ?? availableSettings[ABSTRACT_STIX_DOMAIN_OBJECT];
  } else {
    settings = availableSettings[targetType];
  }

  if (!settings) {
    throw UnsupportedError('This entity type is not support for entity settings', { target_type: targetType });
  }

  return settings;
};

// -- HELPERS --

export const getEntitySettingFromCache = async (context: AuthContext, type: string) => {
  const entitySettings = await getEntitiesFromCache<BasicStoreEntityEntitySetting>(context, SYSTEM_USER, ENTITY_TYPE_ENTITY_SETTING);
  let entitySetting = entitySettings.find((es) => es.target_type === type);

  if (!entitySetting) {
    // Inheritance
    if (isStixCoreRelationship(type)) {
      entitySetting = entitySettings.find((es) => es.target_type === ABSTRACT_STIX_CORE_RELATIONSHIP);
    } else if (isStixCyberObservable(type)) {
      entitySetting = entitySettings.find((es) => es.target_type === ABSTRACT_STIX_CYBER_OBSERVABLE);
    }
  }

  return entitySetting;
};

export const getAttributesConfiguration = (entitySetting: BasicStoreEntityEntitySetting) => {
  if (entitySetting?.attributes_configuration) {
    return JSON.parse(entitySetting.attributes_configuration as string) as AttributeConfiguration[];
  }
  return null;
};

export const getDefaultValues = (attributeConfiguration: AttributeConfiguration, multiple: boolean) => {
  if (attributeConfiguration.default_values) {
    if (multiple) {
      return attributeConfiguration.default_values;
    }
    return head(attributeConfiguration.default_values);
  }
  return undefined;
};

// -- AJV --

export const scaleConfig: JSONSchemaType<ScaleConfig> = {
  type: 'object',
  properties: {
    better_side: { type: 'string' },
    min: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        color: { type: 'string', pattern: '#[a-zA-Z0-9]{6}' },
        label: { type: 'string', minLength: 1 },
      },
      required: ['value', 'color', 'label'],
    },
    max: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        color: { type: 'string', pattern: '#[a-zA-Z0-9]{6}' },
        label: { type: 'string', minLength: 1 },
      },
      required: ['value', 'color', 'label'],
    },
    ticks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'number' },
          color: { type: 'string', pattern: '#[a-zA-Z0-9]{6}' },
          label: { type: 'string', minLength: 1 },
        },
        required: ['value', 'color', 'label'],
      }
    },
  },
  required: ['min', 'max'],
};

export const attributeConfiguration: JSONSchemaType<AttributeConfiguration[]> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      mandatory: { type: 'boolean' },
      default_values: {
        type: 'array',
        nullable: true,
        items: { type: 'string' }
      },
      scale: {
        type: 'object',
        properties: {
          local_config: scaleConfig
        },
        nullable: true,
        required: ['local_config'],
      }
    },
    required: ['name']
  },
};
