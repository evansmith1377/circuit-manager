'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { type Service, type Panel, type Asset, type Area } from '@/types';
import { ChevronRight } from 'lucide-react';
import ReactFlow, {
  MiniMap, Controls, Background, useNodesState, useEdgesState,
  Position, Handle, type NodeProps, type Node, type Edge,
  BackgroundVariant, MarkerType, Panel as FlowPanel,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ─── Custom Node Types ───────────────────────────────────────────────────────

function ServiceNode({ data }: NodeProps) {
  return (
    <div className="bg-amber-950/80 border-2 border-amber-500/50 rounded-xl px-5 py-3 min-w-[160px] text-center shadow-lg shadow-amber-900/30">
      <div className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-1">⚡ Service</div>
      <div className="text-white font-semibold text-sm">{data.label}</div>
      {data.amperage && <div className="text-amber-300/60 text-xs mt-0.5">{data.amperage}A · {data.voltage}V</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    </div>
  );
}

function PanelNode({ data }: NodeProps) {
  const isMain = data.type === 'main';
  return (
    <div className={`border-2 rounded-xl px-4 py-3 min-w-[150px] text-center shadow-lg ${
      isMain
        ? 'bg-blue-950/80 border-blue-500/50 shadow-blue-900/30'
        : 'bg-purple-950/80 border-purple-500/50 shadow-purple-900/30'
    }`}>
      <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${isMain ? 'text-blue-400' : 'text-purple-400'}`}>
        🔌 {isMain ? 'Main Panel' : 'Subpanel'}
      </div>
      <div className="text-white font-semibold text-sm">{data.label}</div>
      {data.amperage && <div className={`text-xs mt-0.5 ${isMain ? 'text-blue-300/60' : 'text-purple-300/60'}`}>{data.amperage}A</div>}
      {data.breakerCount > 0 && <div className="text-xs text-white/40 mt-1">{data.breakerCount} breakers</div>}
      <Handle type="target" position={Position.Top} className="!bg-white/30 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-white/30 !w-2.5 !h-2.5" />
    </div>
  );
}

function BreakerNode({ data }: NodeProps) {
  const statusColor = data.isSpare
    ? 'bg-gray-800/80 border-gray-600/50'
    : data.isVacant
    ? 'bg-gray-900/40 border-gray-700/30'
    : 'bg-green-950/80 border-green-600/50';

  return (
    <div className={`border rounded-lg px-3 py-2 min-w-[120px] text-center ${statusColor} ${data.isVacant ? 'opacity-40' : ''}`}>
      <div className="text-white/50 text-xs font-mono font-bold">#{data.label}</div>
      {data.amperage && <div className="text-white/30 text-xs">{data.amperage}A</div>}
      {!data.isVacant && !data.isSpare && data.description && (
        <div className="text-green-300/70 text-xs mt-0.5 max-w-[110px] truncate">{data.description}</div>
      )}
      {data.isSpare && <div className="text-gray-400/60 text-xs">spare</div>}
      <Handle type="target" position={Position.Top} className="!bg-white/20 !w-2 !h-2" />
      {data.assetCount > 0 && <Handle type="source" position={Position.Bottom} className="!bg-green-500/60 !w-2 !h-2" />}
    </div>
  );
}

function AssetNode({ data }: NodeProps) {
  return (
    <div className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 min-w-[110px] text-center">
      <div className="text-white/50 text-xs">{data.typeName || 'Device'}</div>
      <div className="text-white text-xs font-medium mt-0.5 max-w-[100px] truncate">{data.label}</div>
      {data.systemId && <div className="text-amber-400/70 text-xs font-mono mt-0.5">{data.systemId}</div>}
      {data.area && <div className="text-blue-300/50 text-xs mt-0.5">{data.area}</div>}
      <Handle type="target" position={Position.Top} className="!bg-slate-400/30 !w-2 !h-2" />
    </div>
  );
}

function AreaNode({ data }: NodeProps) {
  return (
    <div className="bg-teal-950/80 border border-teal-600/40 rounded-lg px-3 py-2 min-w-[110px] text-center">
      <div className="text-teal-400/60 text-xs">📍 Area</div>
      <div className="text-white text-xs font-medium">{data.label}</div>
      <div className="text-teal-300/50 font-mono text-xs">{data.shortCode}</div>
      {data.assetCount > 0 && <div className="text-white/30 text-xs">{data.assetCount} devices</div>}
    </div>
  );
}

const nodeTypes = { service: ServiceNode, panel: PanelNode, breaker: BreakerNode, asset: AssetNode, area: AreaNode };

// ─── Layout Builder ──────────────────────────────────────────────────────────

type ViewMode = 'electrical' | 'area' | 'full';

function buildElectricalGraph(services: Service[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let serviceX = 0;

  services.forEach(service => {
    const sId = `svc-${service.id}`;
    nodes.push({
      id: sId, type: 'service',
      position: { x: serviceX, y: 0 },
      data: { label: service.name, amperage: service.amperage, voltage: service.voltage },
    });

    const allPanels: Panel[] = [];
    const flatPanels = (panels: Panel[]) => {
      panels.forEach(p => { allPanels.push(p); const subs = (p.panels || p.children || []) as Panel[]; if (subs.length) flatPanels(subs); });
    };
    flatPanels(service.panels || []);

    // Layout panels in a tree
    let panelColX = serviceX - (allPanels.length * 180) / 2;

    allPanels.forEach((panel, pi) => {
      const pId = `panel-${panel.id}`;
      const pX = panelColX + pi * 180;
      const parentId = panel.parent_id ? `panel-${panel.parent_id}` : sId;

      nodes.push({
        id: pId, type: 'panel',
        position: { x: pX, y: 140 },
        data: { label: panel.name, type: panel.type, amperage: panel.amperage, breakerCount: panel.breakers?.length || 0 },
      });

      edges.push({
        id: `e-${parentId}-${pId}`, source: parentId, target: pId,
        style: { stroke: panel.type === 'main' ? '#3b82f6' : '#a855f7', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: panel.type === 'main' ? '#3b82f6' : '#a855f7' },
      });

      // Add breakers
      const breakers = panel.breakers || [];
      breakers.forEach((breaker, bi) => {
        const bId = `breaker-${breaker.id}`;
        const bX = pX - (breakers.length * 80) / 2 + bi * 80;

        nodes.push({
          id: bId, type: 'breaker',
          position: { x: bX, y: 300 },
          data: { label: breaker.label, amperage: breaker.amperage, description: breaker.description, isSpare: breaker.is_spare, isVacant: breaker.is_vacant, assetCount: breaker.assets?.length || 0 },
        });

        edges.push({
          id: `e-${pId}-${bId}`, source: pId, target: bId,
          style: { stroke: breaker.is_vacant ? '#374151' : breaker.is_spare ? '#6b7280' : '#22c55e', strokeWidth: 1 },
          animated: !breaker.is_spare && !breaker.is_vacant,
        });

        // Add assets
        (breaker.assets || []).forEach((asset, ai) => {
          const aId = `asset-${asset.id}`;
          const aX = bX - ((breaker.assets?.length || 1) * 70) / 2 + ai * 70;

          nodes.push({
            id: aId, type: 'asset',
            position: { x: aX, y: 460 },
            data: { label: asset.name, systemId: asset.system_id, typeName: (asset as Asset & { asset_type?: { name: string } }).asset_type?.name, area: (asset as Asset & { area?: { name: string } }).area?.name },
          });

          edges.push({
            id: `e-${bId}-${aId}`, source: bId, target: aId,
            style: { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4,3' },
          });
        });
      });
    });

    serviceX += 1200;
  });

  return { nodes, edges };
}

function buildAreaGraph(areas: Area[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const flatAreas = (list: Area[], depth = 0, xOffset = 0): number => {
    let currentX = xOffset;
    list.forEach(area => {
      const aId = `area-${area.id}`;
      nodes.push({
        id: aId, type: 'area',
        position: { x: currentX, y: depth * 140 },
        data: { label: area.name, shortCode: area.short_code, assetCount: area.assets_aggregate?.aggregate.count || 0 },
      });

      if (area.parent_id) {
        edges.push({
          id: `e-area-${area.parent_id}-${area.id}`,
          source: `area-${area.parent_id}`, target: aId,
          style: { stroke: '#14b8a6', strokeWidth: 1.5 },
        });
      }

      if ((area.areas || area.children || []).length) {
        const childWidth = flatAreas((area.areas || area.children || []) as Area[], depth + 1, currentX);
        currentX += childWidth + 40;
      } else {
        currentX += 150;
      }
    });
    return currentX - xOffset;
  };

  flatAreas(areas.filter(a => !a.parent_id));
  return { nodes, edges };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

interface PageData {
  services: Service[];
  areas: Area[];
}

export default function TopologyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<PageData>({ services: [], areas: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('electrical');
  const [showAssets, setShowAssets] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/locations/${id}/panels`).then(r => r.json()),
      fetch(`/api/locations/${id}/areas`).then(r => r.json()),
    ]).then(([panelData, areaData]) => {
      // For topology we need breakers+assets inside panels — fetch each panel detail
      const services: Service[] = panelData.services || [];
      const areas: Area[] = areaData.areas || [];

      // Flatten all panel IDs to fetch details
      const allPanelIds: string[] = [];
      const collectPanelIds = (panels: Panel[]) => {
        panels.forEach(p => { allPanelIds.push(p.id); const subs2 = (p.panels || p.children || []) as Panel[]; if (subs2.length) collectPanelIds(subs2); });
      };
      services.forEach(s => collectPanelIds(s.panels || []));

      // Fetch all panel details in parallel
      Promise.all(
        allPanelIds.map(pid =>
          fetch(`/api/locations/${id}/panels/${pid}`).then(r => r.json()).then(d => d.panels_by_pk)
        )
      ).then(panelDetails => {
        // Merge breakers back into services tree
        const panelMap = new Map(panelDetails.filter(Boolean).map((p: Panel) => [p.id, p]));
        const mergePanels = (panels: Panel[]): Panel[] =>
          panels.map(p => ({
            ...(panelMap.get(p.id) || p),
            panels: ((p.panels || p.children || []) as Panel[]).length ? mergePanels((p.panels || p.children || []) as Panel[]) : [],
          }));

        const mergedServices = services.map(s => ({ ...s, panels: mergePanels(s.panels || []) }));
        setData({ services: mergedServices, areas });
        setLoading(false);
      });
    });
  }, [id]);

  useEffect(() => {
    if (loading) return;
    let result: { nodes: Node[]; edges: Edge[] };

    if (viewMode === 'electrical') {
      result = buildElectricalGraph(data.services);
      if (!showAssets) {
        result.nodes = result.nodes.filter(n => n.type !== 'asset');
        result.edges = result.edges.filter(e => !e.id.startsWith('e-breaker-'));
      }
    } else if (viewMode === 'area') {
      result = buildAreaGraph(data.areas);
    } else {
      const elec = buildElectricalGraph(data.services);
      const area = buildAreaGraph(data.areas);
      // Offset area graph
      area.nodes = area.nodes.map(n => ({ ...n, position: { x: n.position.x + 1400, y: n.position.y } }));
      result = { nodes: [...elec.nodes, ...area.nodes], edges: [...elec.edges, ...area.edges] };
    }

    setNodes(result.nodes);
    setEdges(result.edges);
  }, [data, viewMode, showAssets, loading]);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href={`/locations/${id}`} className="hover:text-foreground transition-colors">← Location</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Topology</span>
      </div>

      <div className="page-header mb-4">
        <div>
          <h1 className="text-2xl font-bold">Topology Diagram</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visual map of your electrical system</p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-card border border-border p-1 rounded-lg">
          {(['electrical', 'area', 'full'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${viewMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {mode === 'electrical' ? '⚡ Electrical' : mode === 'area' ? '📍 Areas' : '🗺 Full'}
            </button>
          ))}
        </div>

        {viewMode !== 'area' && (
          <button onClick={() => setShowAssets(!showAssets)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showAssets ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'}`}>
            {showAssets ? '✓' : ''} Show Devices
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 bg-card border border-border rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Building topology…</p>
          </div>
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex items-center justify-center h-96 bg-card border border-border rounded-2xl">
          <div className="text-center">
            <p className="text-muted-foreground">No data to display.</p>
            <Link href={`/locations/${id}/panels`} className="text-primary text-sm hover:underline mt-2 inline-block">Add panels →</Link>
          </div>
        </div>
      ) : (
        <div className="h-[calc(100vh-280px)] min-h-[500px] bg-card border border-border rounded-2xl overflow-hidden">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.15 }}
            minZoom={0.1} maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={24} size={1} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-card !border-border !rounded-xl !shadow-none" />
            <MiniMap
              className="!bg-card !border-border !rounded-xl"
              nodeColor={(n) => {
                if (n.type === 'service') return '#f59e0b';
                if (n.type === 'panel') return n.data?.type === 'main' ? '#3b82f6' : '#a855f7';
                if (n.type === 'breaker') return n.data?.isVacant ? '#374151' : n.data?.isSpare ? '#6b7280' : '#22c55e';
                if (n.type === 'asset') return '#64748b';
                if (n.type === 'area') return '#14b8a6';
                return '#6b7280';
              }}
            />
            <FlowPanel position="top-right">
              <div className="flex flex-col gap-1.5 bg-card/90 backdrop-blur border border-border rounded-xl p-3 text-xs">
                <p className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Legend</p>
                {[
                  { color: 'bg-amber-500', label: 'Service' },
                  { color: 'bg-blue-500', label: 'Main Panel' },
                  { color: 'bg-purple-500', label: 'Subpanel' },
                  { color: 'bg-green-500', label: 'Breaker' },
                  { color: 'bg-slate-500', label: 'Device' },
                  { color: 'bg-teal-500', label: 'Area' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </FlowPanel>
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
