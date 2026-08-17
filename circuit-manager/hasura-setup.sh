#!/bin/bash
# hasura-setup.sh - Run after docker-compose up to configure Hasura metadata
# Usage: ./hasura-setup.sh

HASURA_URL="http://localhost:8080"
ADMIN_SECRET="circuit_admin_secret"

echo "⏳ Waiting for Hasura to be ready..."
until curl -sf "${HASURA_URL}/healthz" > /dev/null 2>&1; do
  sleep 2
done
echo "✅ Hasura is ready"

echo "📡 Applying table tracking..."

# Track all tables via Hasura API
TABLES=(
  "users" "sessions" "locations" "location_access" "areas"
  "services" "panels" "breakers" "asset_types" "assets"
  "area_type_counters" "asset_type_counters"
)

for TABLE in "${TABLES[@]}"; do
  echo "  Tracking table: $TABLE"
  curl -sf -X POST "${HASURA_URL}/v1/metadata" \
    -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"pg_track_table\",
      \"args\": {
        \"source\": \"default\",
        \"table\": { \"schema\": \"public\", \"name\": \"${TABLE}\" }
      }
    }" > /dev/null 2>&1 || echo "    (already tracked or skipped)"
done

echo ""
echo "🔗 Creating relationships..."

# locations -> owner (users)
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"locations"},
      "name": "owner",
      "using": {"foreign_key_constraint_on": "owner_id"}
    }
  }' > /dev/null 2>&1

# locations -> location_access (array)
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"locations"},
      "name": "location_access",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"location_access"},"column":"location_id"}}
    }
  }' > /dev/null 2>&1

# locations -> areas
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"locations"},
      "name": "areas",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"areas"},"column":"location_id"}}
    }
  }' > /dev/null 2>&1

# locations -> assets
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"locations"},
      "name": "assets",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"assets"},"column":"location_id"}}
    }
  }' > /dev/null 2>&1

# locations -> services
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"locations"},
      "name": "services",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"services"},"column":"location_id"}}
    }
  }' > /dev/null 2>&1

# location_access -> user
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"location_access"},
      "name": "user",
      "using": {"foreign_key_constraint_on": "user_id"}
    }
  }' > /dev/null 2>&1

# location_access -> location (object)
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"location_access"},
      "name": "location",
      "using": {"foreign_key_constraint_on": "location_id"}
    }
  }' > /dev/null 2>&1

# areas -> parent
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"areas"},
      "name": "parent",
      "using": {"foreign_key_constraint_on": "parent_id"}
    }
  }' > /dev/null 2>&1

# areas -> children
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"areas"},
      "name": "areas",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"areas"},"column":"parent_id"}}
    }
  }' > /dev/null 2>&1

# areas -> assets
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"areas"},
      "name": "assets",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"assets"},"column":"area_id"}}
    }
  }' > /dev/null 2>&1

# services -> panels
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"services"},
      "name": "panels",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"panels"},"column":"service_id"}}
    }
  }' > /dev/null 2>&1

# services -> location (object)
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"services"},
      "name": "location",
      "using": {"foreign_key_constraint_on": "location_id"}
    }
  }' > /dev/null 2>&1

# panels -> parent, area, service
for REL in "parent_id:parent" "area_id:area" "service_id:service"; do
  FK="${REL%%:*}"
  NAME="${REL##*:}"
  curl -sf -X POST "${HASURA_URL}/v1/metadata" \
    -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"pg_create_object_relationship\",
      \"args\": {
        \"source\": \"default\",
        \"table\": {\"schema\":\"public\",\"name\":\"panels\"},
        \"name\": \"${NAME}\",
        \"using\": {\"foreign_key_constraint_on\": \"${FK}\"}
      }
    }" > /dev/null 2>&1
done

# panels -> children panels
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"panels"},
      "name": "panels",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"panels"},"column":"parent_id"}}
    }
  }' > /dev/null 2>&1

# panels -> breakers
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"panels"},
      "name": "breakers",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"breakers"},"column":"panel_id"}}
    }
  }' > /dev/null 2>&1

# breakers -> panel
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_object_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"breakers"},
      "name": "panel",
      "using": {"foreign_key_constraint_on": "panel_id"}
    }
  }' > /dev/null 2>&1

# breakers -> assets
curl -sf -X POST "${HASURA_URL}/v1/metadata" \
  -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pg_create_array_relationship",
    "args": {
      "source": "default",
      "table": {"schema":"public","name":"breakers"},
      "name": "assets",
      "using": {"foreign_key_constraint_on": {"table":{"schema":"public","name":"assets"},"column":"breaker_id"}}
    }
  }' > /dev/null 2>&1

# assets -> location, area, breaker, asset_type
for REL in "location_id:location" "area_id:area" "breaker_id:breaker" "asset_type_id:asset_type"; do
  FK="${REL%%:*}"
  NAME="${REL##*:}"
  curl -sf -X POST "${HASURA_URL}/v1/metadata" \
    -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"pg_create_object_relationship\",
      \"args\": {
        \"source\": \"default\",
        \"table\": {\"schema\":\"public\",\"name\":\"assets\"},
        \"name\": \"${NAME}\",
        \"using\": {\"foreign_key_constraint_on\": \"${FK}\"}
      }
    }" > /dev/null 2>&1
done

echo ""
echo "✅ Hasura setup complete!"
echo ""
echo "🌐 App:    http://localhost:3000"
echo "📊 Hasura: http://localhost:8080/console  (admin secret: circuit_admin_secret)"
