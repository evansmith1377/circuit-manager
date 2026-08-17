# Circuit Manager

Electrical circuit documentation and management system. Track which circuit breakers control which outlets, switches, appliances, and devices across your home or business.

## Features

- **Multi-location support** – manage homes, offices, or any site with role-based access sharing
- **Area hierarchy** – structures → floors → rooms with auto-generated area codes (S1-F2-R3)
- **Electrical panel UI** – graphical panel display with drag-and-drop breaker ordering, main disconnect, spare/vacant states
- **Asset tracking** – every device gets a unique system ID (e.g. `S1-F2-R3-OU4`) linking it to its area and breaker
- **Omni-search** – ⌘K search across breakers, assets, areas, and panels simultaneously
- **Export** – panel view as PNG/PDF, printable circuit directory label, CSV export
- **Topology diagram** – interactive ReactFlow visualization of electrical hierarchy
- **Access management** – share locations with view/edit/manage-access permissions + ownership transfer
- **Admin panel** – user management, grant/revoke admin

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, TypeScript) |
| GraphQL | Hasura v2.40 |
| Database | PostgreSQL 16 |
| Auth | Custom JWT (HTTP-only cookies, bcrypt) |
| UI | Tailwind CSS, Radix UI primitives |
| Drag & Drop | @dnd-kit |
| Diagrams | ReactFlow |
| Export | html2canvas + jsPDF |
| Runtime | Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 22+ (for local development only)

### 1. Start services

```bash
cd circuit-manager
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Hasura** on port `8080`
- **Next.js** on port `3000`

### 2. Configure Hasura (first time only)

```bash
./hasura-setup.sh
```

This tracks all tables and creates relationships in Hasura automatically.

### 3. Open the app

Visit **http://localhost:3000**

The first user to register becomes the **System Administrator**.

---

## Development

### Hot reload

The Next.js container mounts the source directory, so code changes reload automatically.

### Hasura Console

Visit **http://localhost:8080/console**  
Admin secret: `circuit_admin_secret`

### Environment variables

All secrets are in `docker-compose.yml`. For production, move them to a `.env` file:

```env
POSTGRES_PASSWORD=your_secure_password
HASURA_GRAPHQL_ADMIN_SECRET=your_admin_secret
JWT_SECRET=your_jwt_secret_min_32_chars
```

---

## Database Schema

```
users ──────────────────────────────────────────────────────────
  └─ owns → locations ──────────────────────────────────────────
              ├─ location_access (shares with users)
              ├─ areas (tree structure: structure→floor→room)
              ├─ services
              │    └─ panels (main + subpanels tree)
              │         └─ breakers (with position ordering)
              │              └─ assets (linked devices)
              └─ assets (all devices at this location)
```

### Area Type Codes

| Type | Code | Example |
|------|------|---------|
| Structure | S | S1 = House |
| Floor | F | F1 = First Floor |
| Indoors (room) | R | R3 = Kitchen |
| Outdoors | O | O1 = Backyard |
| Other | X | X1 = Crawlspace |

### Asset System IDs

Assets receive hierarchical IDs based on their area path and type:
- `S1-F2-R3-OU4` = 4th outlet in Room 3 on Floor 2 of Structure 1
- `S1-AC1` = 1st air conditioner in Structure 1 (no room assigned)

---

## Architecture Notes

- **Authentication**: Custom JWT stored in HTTP-only cookies. The token embeds Hasura claims for future row-level security support.
- **GraphQL**: All database access goes through Hasura's auto-generated GraphQL API. Next.js API routes use an admin secret server-side to bypass RLS.
- **Circular reference prevention**: PostgreSQL trigger on `areas` prevents circular parent references up to 100 levels deep.
- **System IDs**: Generated server-side at asset creation by walking up the area tree and counting existing assets with the same prefix.

---

## Project Structure

```
circuit-manager/
├── docker-compose.yml
├── hasura-setup.sh          # One-time Hasura metadata setup
├── postgres/
│   └── init.sql             # Full schema with triggers
├── hasura/
│   └── metadata/
│       └── databases.yaml   # Table tracking config
└── nextjs/
    ├── Dockerfile
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/         # Login, Register
    │   │   ├── api/            # All API routes
    │   │   ├── dashboard/      # Location list
    │   │   ├── locations/[id]/ # Location detail + sub-pages
    │   │   └── admin/          # User management
    │   ├── components/
    │   │   ├── layout/         # Sidebar, Header
    │   │   ├── panels/         # Export component
    │   │   ├── search/         # OmniSearch
    │   │   └── ui/             # Dialog, Form, Toast
    │   ├── hooks/              # useAuth, useToast
    │   ├── lib/                # GraphQL client, auth, queries
    │   └── types/              # TypeScript interfaces
    └── package.json
```
