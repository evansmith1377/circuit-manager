export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
  password_hash?: string;
}

export interface LocationAccess {
  id: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_access: boolean;
  user?: User;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  icon?: string;
  description?: string;
  owner_id: string;
  owner?: User;
  location_access?: LocationAccess[];
  areas_aggregate?: { aggregate: { count: number } };
  assets_aggregate?: { aggregate: { count: number } };
  services?: Service[];
  created_at: string;
}

export type AreaType = 'structure' | 'floor' | 'outdoors' | 'indoors' | 'other';

export interface Area {
  id: string;
  location_id: string;
  parent_id?: string;
  name: string;
  types: AreaType[];
  icon?: string;
  description?: string;
  short_code: string;
  sequence_num: number;
  // Hasura uses the relationship name "areas" for children
  areas?: Area[];
  children?: Area[]; // alias kept for compatibility
  assets?: Asset[];
  assets_aggregate?: { aggregate: { count: number } };
}

export interface Service {
  id: string;
  location_id: string;
  name: string;
  voltage?: number;
  amperage?: number;
  description?: string;
  icon?: string;
  panels?: Panel[];
  panels_aggregate?: { aggregate: { count: number } };
}

export type PanelType = 'main' | 'sub' | 'transfer' | 'distribution';

export interface Panel {
  id: string;
  service_id: string;
  parent_id?: string;
  area_id?: string;
  name: string;
  type: PanelType;
  amperage?: number;
  voltage?: number;
  has_main_disconnect: boolean;
  main_disconnect_label?: string;
  slots?: number;
  manufacturer?: string;
  model?: string;
  icon?: string;
  description?: string;
  breakers?: Breaker[];
  // Hasura self-relationship is named "panels"
  panels?: Panel[];
  children?: Panel[]; // alias for compatibility
  breakers_aggregate?: { aggregate: { count: number } };
  service?: Service;
  area?: Area;
}

export interface Breaker {
  id: string;
  panel_id: string;
  label: string;
  position?: number;
  amperage?: number;
  poles: number;
  voltage?: number;
  breaker_type?: string;
  description?: string;
  icon?: string;
  is_spare: boolean;
  is_vacant: boolean;
  assets?: Asset[];
  assets_aggregate?: { aggregate: { count: number } };
}

export interface AssetType {
  id: string;
  name: string;
  icon: string;
  description?: string;
  category?: string;
}

export interface Asset {
  id: string;
  location_id: string;
  area_id?: string;
  breaker_id?: string;
  asset_type_id?: string;
  name: string;
  system_id?: string;
  description?: string;
  icon?: string;
  notes?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  install_date?: string;
  wattage?: number;
  amperage?: number;
  voltage?: number;
  asset_type?: AssetType;
  area?: Area;
  breaker?: Breaker & { panel?: Panel };
  location?: Location;
}

export interface SearchResult {
  assets: Asset[];
  breakers: Breaker[];
  areas: Area[];
  panels: Panel[];
}

// Area type display helpers
export const AREA_TYPE_LABELS: Record<AreaType, string> = {
  structure: 'Structure',
  floor: 'Floor',
  outdoors: 'Outdoors',
  indoors: 'Indoors',
  other: 'Other',
};

export const AREA_TYPE_ICONS: Record<AreaType, string> = {
  structure: 'home',
  floor: 'layers',
  outdoors: 'tree-pine',
  indoors: 'door-open',
  other: 'box',
};

export const AREA_TYPE_PREFIXES: Record<AreaType, string> = {
  structure: 'S',
  floor: 'F',
  outdoors: 'O',
  indoors: 'R',
  other: 'X',
};

export function getDisplayName(user: User): string {
  if (user.display_name && user.display_name.trim()) {
    return user.display_name;
  }
  return `${user.first_name} ${user.last_name}`;
}
