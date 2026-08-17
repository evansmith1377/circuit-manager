// ============================================================
// USER QUERIES
// ============================================================

export const GET_USER_BY_EMAIL = `
  query GetUserByEmail($email: String!) {
    users(where: { email: { _eq: $email } }) {
      id
      first_name
      last_name
      email
      password_hash
      display_name
      is_admin
      created_at
    }
  }
`;

export const GET_USER_BY_ID = `
  query GetUserById($id: uuid!) {
    users_by_pk(id: $id) {
      id
      first_name
      last_name
      email
      display_name
      is_admin
      created_at
    }
  }
`;

export const GET_ALL_USERS = `
  query GetAllUsers {
    users(order_by: { created_at: asc }) {
      id
      first_name
      last_name
      email
      display_name
      is_admin
      created_at
    }
  }
`;

export const COUNT_USERS = `
  query CountUsers {
    users_aggregate {
      aggregate { count }
    }
  }
`;

export const INSERT_USER = `
  mutation InsertUser($first_name: String!, $last_name: String!, $email: String!, $password_hash: String!, $display_name: String!, $is_admin: Boolean!) {
    insert_users_one(object: {
      first_name: $first_name,
      last_name: $last_name,
      email: $email,
      password_hash: $password_hash,
      display_name: $display_name,
      is_admin: $is_admin
    }) {
      id email first_name last_name display_name is_admin
    }
  }
`;

export const UPDATE_USER = `
  mutation UpdateUser($id: uuid!, $first_name: String!, $last_name: String!, $display_name: String!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: {
      first_name: $first_name,
      last_name: $last_name,
      display_name: $display_name
    }) { id first_name last_name display_name }
  }
`;

export const SET_USER_ADMIN = `
  mutation SetUserAdmin($id: uuid!, $is_admin: Boolean!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { is_admin: $is_admin }) {
      id is_admin
    }
  }
`;

// ============================================================
// LOCATION QUERIES
// ============================================================

export const GET_LOCATIONS_FOR_USER = `
  query GetLocationsForUser($user_id: uuid!) {
    locations(
      where: {
        _or: [
          { owner_id: { _eq: $user_id } },
          { location_access: { user_id: { _eq: $user_id }, can_view: { _eq: true } } }
        ]
      }
      order_by: { name: asc }
    ) {
      id name address icon description owner_id created_at
      owner { id first_name last_name display_name email }
      location_access(where: { user_id: { _eq: $user_id } }) {
        can_view can_edit can_manage_access
      }
      areas_aggregate { aggregate { count } }
      assets_aggregate { aggregate { count } }
    }
  }
`;

export const GET_LOCATION_BY_ID = `
  query GetLocationById($id: uuid!, $user_id: uuid!) {
    locations_by_pk(id: $id) {
      id name address icon description owner_id created_at
      owner { id first_name last_name display_name email }
      location_access(where: { user_id: { _eq: $user_id } }) {
        can_view can_edit can_manage_access
      }
      location_access_aggregate { aggregate { count } }
      areas_aggregate { aggregate { count } }
      assets_aggregate { aggregate { count } }
      services {
        id name voltage amperage description icon
        panels_aggregate { aggregate { count } }
      }
    }
  }
`;

export const INSERT_LOCATION = `
  mutation InsertLocation($name: String!, $address: String, $owner_id: uuid!, $icon: String, $description: String) {
    insert_locations_one(object: {
      name: $name, address: $address, owner_id: $owner_id, icon: $icon, description: $description
    }) { id name address icon description owner_id created_at }
  }
`;

export const UPDATE_LOCATION = `
  mutation UpdateLocation($id: uuid!, $name: String!, $address: String, $icon: String, $description: String) {
    update_locations_by_pk(pk_columns: { id: $id }, _set: {
      name: $name, address: $address, icon: $icon, description: $description
    }) { id name address icon description }
  }
`;

export const DELETE_LOCATION = `
  mutation DeleteLocation($id: uuid!) {
    delete_locations_by_pk(id: $id) { id }
  }
`;

export const TRANSFER_LOCATION_OWNERSHIP = `
  mutation TransferOwnership($id: uuid!, $new_owner_id: uuid!) {
    update_locations_by_pk(pk_columns: { id: $id }, _set: { owner_id: $new_owner_id }) { id owner_id }
  }
`;

// ============================================================
// LOCATION ACCESS
// ============================================================

export const GET_LOCATION_ACCESS = `
  query GetLocationAccess($location_id: uuid!) {
    location_access(where: { location_id: { _eq: $location_id } }, order_by: { created_at: asc }) {
      id user_id can_view can_edit can_manage_access created_at
      user { id first_name last_name display_name email }
    }
  }
`;

export const UPSERT_LOCATION_ACCESS = `
  mutation UpsertLocationAccess($location_id: uuid!, $user_id: uuid!, $can_view: Boolean!, $can_edit: Boolean!, $can_manage_access: Boolean!, $granted_by: uuid!) {
    insert_location_access_one(
      object: { location_id: $location_id, user_id: $user_id, can_view: $can_view, can_edit: $can_edit, can_manage_access: $can_manage_access, granted_by: $granted_by }
      on_conflict: { constraint: location_access_location_id_user_id_key, update_columns: [can_view, can_edit, can_manage_access] }
    ) { id user_id can_view can_edit can_manage_access }
  }
`;

export const DELETE_LOCATION_ACCESS = `
  mutation DeleteLocationAccess($location_id: uuid!, $user_id: uuid!) {
    delete_location_access(where: { location_id: { _eq: $location_id }, user_id: { _eq: $user_id } }) { affected_rows }
  }
`;

// ============================================================
// AREA QUERIES
// ============================================================

export const GET_AREAS_FOR_LOCATION = `
  query GetAreasForLocation($location_id: uuid!) {
    areas(where: { location_id: { _eq: $location_id }, parent_id: { _is_null: true } }, order_by: { name: asc }) {
      id name types icon description short_code sequence_num parent_id location_id created_at
      assets_aggregate { aggregate { count } }
      areas(order_by: { name: asc }) {
        id name types icon description short_code sequence_num parent_id
        assets_aggregate { aggregate { count } }
        areas(order_by: { name: asc }) {
          id name types icon description short_code sequence_num parent_id
          assets_aggregate { aggregate { count } }
          areas(order_by: { name: asc }) {
            id name types icon description short_code sequence_num parent_id
            assets_aggregate { aggregate { count } }
          }
        }
      }
    }
  }
`;

export const GET_AREA_BY_ID = `
  query GetAreaById($id: uuid!) {
    areas_by_pk(id: $id) {
      id name types icon description short_code sequence_num parent_id location_id
      assets(order_by: { name: asc }) {
        id name system_id description icon
        asset_type { id name icon }
        breaker { id label panel { id name } }
      }
    }
  }
`;

export const INSERT_AREA = `
  mutation InsertArea($location_id: uuid!, $parent_id: uuid, $name: String!, $types: [area_type!]!, $icon: String, $description: String, $short_code: String!, $sequence_num: Int!) {
    insert_areas_one(object: {
      location_id: $location_id, parent_id: $parent_id, name: $name,
      types: $types, icon: $icon, description: $description,
      short_code: $short_code, sequence_num: $sequence_num
    }) { id name types icon description short_code sequence_num parent_id location_id }
  }
`;

export const UPDATE_AREA = `
  mutation UpdateArea($id: uuid!, $name: String!, $types: [area_type!]!, $icon: String, $description: String, $parent_id: uuid) {
    update_areas_by_pk(pk_columns: { id: $id }, _set: {
      name: $name, types: $types, icon: $icon, description: $description, parent_id: $parent_id
    }) { id name types icon description parent_id }
  }
`;

export const DELETE_AREA = `
  mutation DeleteArea($id: uuid!) {
    delete_areas_by_pk(id: $id) { id }
  }
`;

// ============================================================
// SERVICE & PANEL QUERIES
// ============================================================

export const GET_SERVICES_FOR_LOCATION = `
  query GetServicesForLocation($location_id: uuid!) {
    services(where: { location_id: { _eq: $location_id } }, order_by: { name: asc }) {
      id name voltage amperage description icon location_id
      panels_aggregate { aggregate { count } }
      panels(where: { parent_id: { _is_null: true } }, order_by: { name: asc }) {
        id name type amperage has_main_disconnect slots manufacturer model icon description parent_id
        breakers_aggregate { aggregate { count } }
        children: panels(order_by: { name: asc }) {
          id name type amperage has_main_disconnect slots manufacturer model icon description parent_id
          breakers_aggregate { aggregate { count } }
          children: panels(order_by: { name: asc }) {
            id name type amperage has_main_disconnect slots manufacturer model icon description parent_id
            breakers_aggregate { aggregate { count } }
          }
        }
      }
    }
  }
`;

export const GET_PANEL_DETAIL = `
  query GetPanelDetail($id: uuid!) {
    panels_by_pk(id: $id) {
      id name type amperage voltage has_main_disconnect main_disconnect_label slots manufacturer model icon description service_id parent_id area_id
      service { id name location_id }
      area { id name }
      breakers(order_by: { position: asc, label: asc }) {
        id label position amperage poles voltage breaker_type description icon is_spare is_vacant
        assets_aggregate { aggregate { count } }
        assets(order_by: { name: asc }) {
          id name system_id description icon
          area { id name }
          asset_type { id name icon }
        }
      }
    }
  }
`;

export const INSERT_SERVICE = `
  mutation InsertService($location_id: uuid!, $name: String!, $voltage: Int, $amperage: Int, $description: String, $icon: String) {
    insert_services_one(object: {
      location_id: $location_id, name: $name, voltage: $voltage, amperage: $amperage, description: $description, icon: $icon
    }) { id name voltage amperage description icon location_id }
  }
`;

export const UPDATE_SERVICE = `
  mutation UpdateService($id: uuid!, $name: String!, $voltage: Int, $amperage: Int, $description: String, $icon: String) {
    update_services_by_pk(pk_columns: { id: $id }, _set: {
      name: $name, voltage: $voltage, amperage: $amperage, description: $description, icon: $icon
    }) { id name voltage amperage description icon }
  }
`;

export const INSERT_PANEL = `
  mutation InsertPanel($service_id: uuid!, $parent_id: uuid, $area_id: uuid, $name: String!, $type: panel_type!, $amperage: Int, $voltage: Int, $has_main_disconnect: Boolean!, $main_disconnect_label: String, $slots: Int, $manufacturer: String, $model: String, $icon: String, $description: String) {
    insert_panels_one(object: {
      service_id: $service_id, parent_id: $parent_id, area_id: $area_id, name: $name,
      type: $type, amperage: $amperage, voltage: $voltage,
      has_main_disconnect: $has_main_disconnect, main_disconnect_label: $main_disconnect_label,
      slots: $slots, manufacturer: $manufacturer, model: $model, icon: $icon, description: $description
    }) { id name type amperage has_main_disconnect slots icon description }
  }
`;

export const UPDATE_PANEL = `
  mutation UpdatePanel($id: uuid!, $name: String!, $type: panel_type!, $amperage: Int, $voltage: Int, $has_main_disconnect: Boolean!, $main_disconnect_label: String, $slots: Int, $manufacturer: String, $model: String, $icon: String, $description: String, $area_id: uuid, $parent_id: uuid) {
    update_panels_by_pk(pk_columns: { id: $id }, _set: {
      name: $name, type: $type, amperage: $amperage, voltage: $voltage,
      has_main_disconnect: $has_main_disconnect, main_disconnect_label: $main_disconnect_label,
      slots: $slots, manufacturer: $manufacturer, model: $model, icon: $icon, description: $description,
      area_id: $area_id, parent_id: $parent_id
    }) { id name type amperage has_main_disconnect slots }
  }
`;

export const DELETE_PANEL = `
  mutation DeletePanel($id: uuid!) {
    delete_panels_by_pk(id: $id) { id }
  }
`;

// ============================================================
// BREAKER QUERIES
// ============================================================

export const INSERT_BREAKER = `
  mutation InsertBreaker($panel_id: uuid!, $label: String!, $position: Int, $amperage: Int, $poles: Int!, $voltage: Int, $breaker_type: String, $description: String, $icon: String, $is_spare: Boolean!, $is_vacant: Boolean!) {
    insert_breakers_one(object: {
      panel_id: $panel_id, label: $label, position: $position, amperage: $amperage,
      poles: $poles, voltage: $voltage, breaker_type: $breaker_type,
      description: $description, icon: $icon, is_spare: $is_spare, is_vacant: $is_vacant
    }) { id label position amperage poles voltage breaker_type description icon is_spare is_vacant }
  }
`;

export const UPDATE_BREAKER = `
  mutation UpdateBreaker($id: uuid!, $label: String!, $amperage: Int, $poles: Int!, $voltage: Int, $breaker_type: String, $description: String, $icon: String, $is_spare: Boolean!, $is_vacant: Boolean!) {
    update_breakers_by_pk(pk_columns: { id: $id }, _set: {
      label: $label, amperage: $amperage, poles: $poles, voltage: $voltage,
      breaker_type: $breaker_type, description: $description, icon: $icon,
      is_spare: $is_spare, is_vacant: $is_vacant
    }) { id label amperage poles breaker_type description }
  }
`;

export const UPDATE_BREAKER_POSITIONS = `
  mutation UpdateBreakerPositions($updates: [breakers_updates!]!) {
    update_breakers_many(updates: $updates) { affected_rows }
  }
`;

export const DELETE_BREAKER = `
  mutation DeleteBreaker($id: uuid!) {
    delete_breakers_by_pk(id: $id) { id }
  }
`;

// ============================================================
// ASSET QUERIES
// ============================================================

export const GET_ASSET_TYPES = `
  query GetAssetTypes {
    asset_types(order_by: { name: asc }) {
      id name icon description category
    }
  }
`;

export const GET_ASSETS_FOR_LOCATION = `
  query GetAssetsForLocation($location_id: uuid!) {
    assets(where: { location_id: { _eq: $location_id } }, order_by: { system_id: asc, name: asc }) {
      id name system_id description icon notes wattage amperage voltage location_id
      asset_type { id name icon category }
      area { id name types icon }
      breaker { id label amperage panel { id name } }
    }
  }
`;

export const GET_ASSET_BY_ID = `
  query GetAssetById($id: uuid!) {
    assets_by_pk(id: $id) {
      id name system_id description icon notes manufacturer model serial_number
      install_date wattage amperage voltage location_id area_id breaker_id asset_type_id
      asset_type { id name icon category }
      area { id name types icon }
      breaker { id label amperage poles breaker_type panel { id name type service { id name } } }
    }
  }
`;

export const INSERT_ASSET = `
  mutation InsertAsset($location_id: uuid!, $area_id: uuid, $breaker_id: uuid, $asset_type_id: uuid, $name: String!, $system_id: String, $description: String, $icon: String, $notes: String, $manufacturer: String, $model: String, $serial_number: String, $install_date: date, $wattage: Int, $amperage: numeric, $voltage: Int) {
    insert_assets_one(object: {
      location_id: $location_id, area_id: $area_id, breaker_id: $breaker_id,
      asset_type_id: $asset_type_id, name: $name, system_id: $system_id,
      description: $description, icon: $icon, notes: $notes,
      manufacturer: $manufacturer, model: $model, serial_number: $serial_number,
      install_date: $install_date, wattage: $wattage, amperage: $amperage, voltage: $voltage
    }) {
      id name system_id description icon asset_type_id area_id breaker_id
    }
  }
`;

export const UPDATE_ASSET = `
  mutation UpdateAsset($id: uuid!, $area_id: uuid, $breaker_id: uuid, $asset_type_id: uuid, $name: String!, $description: String, $icon: String, $notes: String, $manufacturer: String, $model: String, $serial_number: String, $install_date: date, $wattage: Int, $amperage: numeric, $voltage: Int) {
    update_assets_by_pk(pk_columns: { id: $id }, _set: {
      area_id: $area_id, breaker_id: $breaker_id, asset_type_id: $asset_type_id,
      name: $name, description: $description, icon: $icon, notes: $notes,
      manufacturer: $manufacturer, model: $model, serial_number: $serial_number,
      install_date: $install_date, wattage: $wattage, amperage: $amperage, voltage: $voltage
    }) { id name system_id }
  }
`;

export const DELETE_ASSET = `
  mutation DeleteAsset($id: uuid!) {
    delete_assets_by_pk(id: $id) { id }
  }
`;

// Flat areas list for dropdowns
export const GET_AREAS_FLAT = `
  query GetAreasFlat($location_id: uuid!) {
    areas(where: { location_id: { _eq: $location_id } }, order_by: [{ short_code: asc }]) {
      id name short_code types parent_id
    }
  }
`;

// Flat breakers list for a location (across all panels)
export const GET_BREAKERS_FOR_LOCATION = `
  query GetBreakersForLocation($location_id: uuid!) {
    breakers(
      where: {
        panel: { service: { location_id: { _eq: $location_id } } }
        is_vacant: { _eq: false }
      }
      order_by: [{ panel: { name: asc } }, { position: asc }, { label: asc }]
    ) {
      id label amperage poles description is_spare
      panel { id name type }
    }
  }
`;

export const SEARCH_ALL = `
  query SearchAll($query: String!, $location_id: uuid!) {
    assets(
      where: {
        location_id: { _eq: $location_id },
        _or: [
          { name: { _ilike: $query } },
          { system_id: { _ilike: $query } },
          { description: { _ilike: $query } },
          { notes: { _ilike: $query } }
        ]
      }
      limit: 10
    ) {
      id name system_id description
      asset_type { name icon }
      area { name }
      breaker { label panel { name } }
    }
    breakers(
      where: {
        panel: { service: { location_id: { _eq: $location_id } } },
        _or: [
          { label: { _ilike: $query } },
          { description: { _ilike: $query } }
        ]
      }
      limit: 10
    ) {
      id label description amperage
      panel { id name }
      assets { id name system_id }
    }
    areas(
      where: {
        location_id: { _eq: $location_id },
        _or: [
          { name: { _ilike: $query } },
          { description: { _ilike: $query } }
        ]
      }
      limit: 5
    ) {
      id name types icon description
      assets_aggregate { aggregate { count } }
    }
    panels(
      where: {
        service: { location_id: { _eq: $location_id } },
        _or: [
          { name: { _ilike: $query } },
          { description: { _ilike: $query } }
        ]
      }
      limit: 5
    ) {
      id name type amperage description
    }
  }
`;

export const GLOBAL_SEARCH = `
  query GlobalSearch($query: String!, $user_id: uuid!) {
    assets(
      where: {
        location: {
          _or: [
            { owner_id: { _eq: $user_id } },
            { location_access: { user_id: { _eq: $user_id }, can_view: { _eq: true } } }
          ]
        },
        _or: [
          { name: { _ilike: $query } },
          { system_id: { _ilike: $query } },
          { description: { _ilike: $query } }
        ]
      }
      limit: 8
    ) {
      id name system_id description
      location { id name }
      asset_type { name icon }
      area { name }
      breaker { label panel { name } }
    }
    breakers(
      where: {
        panel: { service: { location: { _or: [
          { owner_id: { _eq: $user_id } },
          { location_access: { user_id: { _eq: $user_id }, can_view: { _eq: true } } }
        ]}}},
        _or: [
          { label: { _ilike: $query } },
          { description: { _ilike: $query } }
        ]
      }
      limit: 5
    ) {
      id label description amperage
      panel { id name service { location { id name } } }
      assets { id name system_id }
    }
  }
`;
