'use client';
import { useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { type Panel, type Breaker } from '@/types';
import { Download, Image, FileText, Tag, Printer } from 'lucide-react';

interface Props {
  panel: Panel;
  breakers: Breaker[];
  onClose: () => void;
}

function PanelPrintView({ panel, breakers }: { panel: Panel; breakers: Breaker[] }) {
  return (
    <div style={{ fontFamily: 'monospace', background: '#1a1f2e', color: '#e2e8f0', padding: '24px', borderRadius: '8px', width: '400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px solid #374151', paddingBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>{panel.name}</div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
          {[panel.amperage && `${panel.amperage}A`, panel.voltage && `${panel.voltage}V`, panel.manufacturer].filter(Boolean).join(' · ')}
        </div>
      </div>

      {panel.has_main_disconnect && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '8px', textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ color: '#fca5a5', fontSize: '11px', fontWeight: 'bold', letterSpacing: '4px' }}>{panel.main_disconnect_label || 'MAIN'}</div>
          {panel.amperage && <div style={{ color: '#ef444450', fontSize: '10px' }}>{panel.amperage}A</div>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
        {breakers.map(b => (
          <div key={b.id} style={{
            background: b.is_vacant ? 'transparent' : b.is_spare ? '#1e2940' : '#1e293b',
            border: b.is_vacant ? '1px dashed #374151' : `1px solid #374151`,
            borderLeft: b.is_vacant ? undefined : `3px solid ${b.is_spare ? '#4b5563' : '#22c55e'}`,
            borderRadius: '4px', padding: '6px', opacity: b.is_vacant ? 0.4 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>{b.label}</span>
              {b.amperage && <span style={{ fontSize: '10px', color: '#4b5563' }}>{b.amperage}A</span>}
            </div>
            <div style={{ fontSize: '10px', color: b.is_spare ? '#4b5563' : b.is_vacant ? '#374151' : '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.is_vacant ? 'vacant' : b.is_spare ? 'spare' : (b.description || `${b.assets?.length || 0} devices`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelView({ panel, breakers }: { panel: Panel; breakers: Breaker[] }) {
  // Standard panel label layout: 2 columns, numbered 1-N
  const active = breakers.filter(b => !b.is_vacant && !b.is_spare);
  return (
    <div style={{ background: 'white', padding: '16px', fontFamily: 'Arial, sans-serif', fontSize: '9px', width: '320px' }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', marginBottom: '8px', borderBottom: '2px solid black', paddingBottom: '4px' }}>
        {panel.name} — CIRCUIT DIRECTORY
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {Array.from({ length: Math.ceil(active.length / 2) }, (_, i) => {
            const left = active[i * 2 + 1]; // odd (left side)
            const right = active[i * 2];    // even (right side)
            return (
              <tr key={i} style={{ borderBottom: '1px solid #d1d5db' }}>
                <td style={{ padding: '2px 4px', borderRight: '1px solid #d1d5db', width: '25px', textAlign: 'center', fontWeight: 'bold' }}>{left?.label || ''}</td>
                <td style={{ padding: '2px 4px', borderRight: '2px solid black', flex: 1 }}>{left?.description || ''}</td>
                <td style={{ padding: '2px 4px', borderRight: '1px solid #d1d5db', flex: 1 }}>{right?.description || ''}</td>
                <td style={{ padding: '2px 4px', width: '25px', textAlign: 'center', fontWeight: 'bold' }}>{right?.label || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ExportPanel({ panel, breakers, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'panel' | 'label' | 'csv'>('panel');
  const [exporting, setExporting] = useState(false);

  const downloadImage = async () => {
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const el = activeTab === 'label' ? labelRef.current : printRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: activeTab === 'label' ? '#ffffff' : '#1a1f2e' });
      const link = document.createElement('a');
      link.download = `${panel.name.replace(/\s+/g, '-')}-${activeTab}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const downloadPDF = async () => {
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const el = activeTab === 'label' ? labelRef.current : printRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${panel.name.replace(/\s+/g, '-')}-${activeTab}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = () => {
    const rows = [
      ['Label', 'Amperage', 'Poles', 'Type', 'Description', 'Status', 'Devices'],
      ...breakers.map(b => [
        b.label, b.amperage || '', b.poles, b.breaker_type || 'standard',
        b.description || '', b.is_spare ? 'spare' : b.is_vacant ? 'vacant' : 'active',
        (b.assets?.map(a => a.name).join('; ') || ''),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${panel.name.replace(/\s+/g, '-')}-breakers.csv`;
    link.click();
  };

  const tabs = [
    { id: 'panel', label: 'Panel View', icon: <Printer className="w-3.5 h-3.5" /> },
    { id: 'label', label: 'Panel Label', icon: <Tag className="w-3.5 h-3.5" /> },
    { id: 'csv', label: 'CSV Export', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog open onClose={onClose} title="Export Panel" size="lg">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${activeTab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="overflow-auto max-h-64 flex justify-center">
          {activeTab === 'panel' && (
            <div ref={printRef}><PanelPrintView panel={panel} breakers={breakers} /></div>
          )}
          {activeTab === 'label' && (
            <div ref={labelRef}><LabelView panel={panel} breakers={breakers} /></div>
          )}
          {activeTab === 'csv' && (
            <div className="text-sm text-muted-foreground text-center py-8">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Export all {breakers.length} breakers with their circuit info and connected devices as a CSV spreadsheet.</p>
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex gap-3 pt-2 border-t border-border">
          {activeTab !== 'csv' ? (
            <>
              <button onClick={downloadImage} disabled={exporting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <Image className="w-4 h-4" /> Save as Image
              </button>
              <button onClick={downloadPDF} disabled={exporting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                <Download className="w-4 h-4" /> Save as PDF
              </button>
            </>
          ) : (
            <button onClick={downloadCSV}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Download CSV
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
