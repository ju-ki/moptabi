import React from 'react';

type LegendItem = {
  label: string;
  name: string;
  color: string;
};

const markerLegendItems: LegendItem[] = [
  { label: 'DEPARTURE', name: '出発地', color: '#34A853' },
  { label: 'SPOT', name: 'スポット', color: '#4285F4' },
  { label: 'DESTINATION', name: '目的地', color: '#FF0000' },
  { label: 'NEAREST_STATION', name: '最寄駅', color: '#F59E0B' },
];

const routeLegendItems: LegendItem[] = [
  { label: 'DEPARTURE_TO_SPOT', name: '出発から最初のスポットのルート', color: '#34A853' },
  { label: 'SPOT_TO_SPOT', name: 'スポット間のルート', color: '#4285F4' },
  { label: 'SPOT_TO_DESTINATION', name: '最後のスポットから目的地ルート', color: '#FF0000' },
  { label: 'TO_STATION', name: '最寄駅へのルート', color: '#FACC15' },
  { label: 'STATION_TO_STATION', name: '最寄駅間のルート', color: '#F97316' },
];

function LegendDot({ color }: { color: string }) {
  return <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />;
}

function LegendLine({ color }: { color: string }) {
  return <span className="inline-block h-0.5 w-5 rounded" style={{ backgroundColor: color }} aria-hidden="true" />;
}

function LegendRow({
  label,
  name,
  color,
  type,
}: {
  label: string;
  name: string;
  color: string;
  type: 'marker' | 'route';
}) {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-gray-700" data-testid="map-legend-item">
      {type === 'marker' ? <LegendDot color={color} /> : <LegendLine color={color} />}
      <span>{name}</span>
    </div>
  );
}

const MapLegend = () => {
  return (
    <section className="rounded-lg border bg-white p-3 shadow-sm" aria-label="地図の凡例" data-testid="map-legend">
      <div className="space-y-2">
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-600">マーカー</p>
          <div className="flex flex-wrap gap-3">
            {markerLegendItems.map((item) => (
              <LegendRow
                key={`marker-${item.label}`}
                label={item.label}
                name={item.name}
                color={item.color}
                type="marker"
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-gray-600">ルート</p>
          <div className="flex flex-wrap gap-3">
            {routeLegendItems.map((item) => (
              <LegendRow
                key={`route-${item.label}`}
                label={item.label}
                name={item.name}
                color={item.color}
                type="route"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapLegend;
