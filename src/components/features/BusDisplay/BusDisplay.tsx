import React from 'react';
import { useEnhancedBusStore } from '../../../stores/enhancedBusStore';
import { withPerformanceMonitoring } from '../../../utils/performance';
import { logger } from '../../../utils/logger';
import { BusIcon, ClockIcon, LightningIcon, CalendarIcon } from '../../ui/Icons/Icons';
import { formatTime24 } from '../../../utils/timeFormat';

interface BusDisplayProps {
  direction: 'work' | 'home';
  maxBuses?: number;
}

const BusDisplayComponent: React.FC<BusDisplayProps> = ({ direction, maxBuses }) => {
  const { buses } = useEnhancedBusStore();
  
  // Filter buses by direction and sort chronologically by arrival time
  const filteredAndSortedBuses = React.useMemo(() => {
    const filtered = buses
      .filter(bus => bus.direction === direction)
      .sort((a, b) => a.estimatedArrival.getTime() - b.estimatedArrival.getTime())
      .slice(0, maxBuses); // Limit to maxBuses if specified
    
    logger.debug('Filtered buses for display', { 
      direction, 
      totalBuses: buses.length, 
      filteredCount: filtered.length,
      maxBuses,
      busDirections: buses.map(b => ({ id: b.id, route: b.route, direction: b.direction }))
    }, 'COMPONENT');
    
    logger.debug('BusDisplay filtering', {
      direction,
      totalBuses: buses.length,
      filteredCount: filtered.length,
      maxBuses,
      allBusDirections: buses.map(b => b.direction),
      workBuses: buses.filter(b => b.direction === 'work').length,
      homeBuses: buses.filter(b => b.direction === 'home').length,
      unknownBuses: buses.filter(b => b.direction === 'unknown').length
    });
    
    return filtered;
  }, [buses, direction, maxBuses]);





  const getUrgencyIconColor = (minutesAway: number) => {
    if (minutesAway <= 2) return 'text-rose-400';
    if (minutesAway <= 5) return 'text-amber-400';
    if (minutesAway <= 10) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getUrgencyBgColor = (minutesAway: number) => {
    if (minutesAway <= 2) return 'bg-rose-500/20';
    if (minutesAway <= 5) return 'bg-amber-500/20';
    if (minutesAway <= 10) return 'bg-yellow-500/20';
    return 'bg-emerald-500/20';
  };

  return (
    <div className="p-6" style={{ background: 'rgba(30, 41, 59, 0.3)' }}>
      {filteredAndSortedBuses.length === 0 ? (
        <div className="text-center py-16">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border"
            style={{ 
              background: 'rgba(71, 85, 105, 0.5)', 
              borderColor: 'rgba(100, 116, 139, 0.5)' 
            }}
          >
            <BusIcon size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No buses available</h3>
          <p className="text-gray-400 text-sm">
            No buses found for this direction at the moment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedBuses.map((bus, index) => {
            const getCardStyle = () => {
              const baseStyle = {
                background: 'rgba(51, 65, 85, 0.8)',
                backdropFilter: 'blur(16px)',
                borderLeft: '4px solid',
                transition: 'all 0.3s ease'
              };
              
              if (bus.minutesAway <= 2) {
                return { ...baseStyle, borderLeftColor: '#fb7185', boxShadow: '0 25px 50px -12px rgba(251, 113, 133, 0.25)' };
              } else if (bus.minutesAway <= 5) {
                return { ...baseStyle, borderLeftColor: '#fbbf24', boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.25)' };
              } else if (bus.minutesAway <= 10) {
                return { ...baseStyle, borderLeftColor: '#facc15', boxShadow: '0 25px 50px -12px rgba(250, 204, 21, 0.25)' };
              } else {
                return { ...baseStyle, borderLeftColor: '#34d399', boxShadow: '0 25px 50px -12px rgba(52, 211, 153, 0.25)' };
              }
            };

            return (
            <div
              key={bus.id}
              data-testid={`bus-${bus.id}`}
              className="relative p-5 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
              style={getCardStyle()}
            >
              {index === 0 && (
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-900 text-[11px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider shadow-lg border-2 border-white/50">
                  Next
                </div>
              )}
              
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2.5 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 ${
                      bus.minutesAway <= 2 ? `${getUrgencyBgColor(bus.minutesAway)} border-rose-400/50` :
                      bus.minutesAway <= 5 ? `${getUrgencyBgColor(bus.minutesAway)} border-amber-400/50` :
                      bus.minutesAway <= 10 ? `${getUrgencyBgColor(bus.minutesAway)} border-yellow-400/50` : 
                      `${getUrgencyBgColor(bus.minutesAway)} border-emerald-400/50`
                    }`}>
                      {bus.minutesAway <= 5 ? (
                        <LightningIcon size={20} className={getUrgencyIconColor(bus.minutesAway)} />
                      ) : (
                        <BusIcon size={20} className={getUrgencyIconColor(bus.minutesAway)} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white drop-shadow-md">
                        Route {bus.route}
                      </span>
                      {bus.routeType && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">
                          {bus.routeType === 'bus' && '🚌'}
                          {bus.routeType === 'trolleybus' && '🚎'}
                          {bus.routeType === 'tram' && '🚋'}
                          {bus.routeType === 'metro' && '🚇'}
                          {bus.routeType === 'rail' && '🚆'}
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg ${
                      bus.isLive 
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-900 border border-emerald-300/50' 
                        : bus.isScheduled
                          ? 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white border border-indigo-300/50'
                          : 'bg-slate-600/50 text-slate-300 border border-slate-500/50'
                    }`}>
                      {bus.isLive ? (
                        <>
                          <span className="w-2 h-2 bg-slate-900 rounded-full animate-pulse"></span>
                          Live
                        </>
                      ) : bus.isScheduled ? (
                        <>
                          <CalendarIcon size={11} />
                          Scheduled
                        </>
                      ) : (
                        <>
                          <ClockIcon size={11} />
                          Estimated
                        </>
                      )}
                    </span>
                    {bus.delay && Math.abs(bus.delay) > 2 && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black border ${
                        bus.delay > 0 ? 'bg-rose-500/30 text-rose-300 border-rose-400/50' : 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
                      }`}>
                        {bus.delay > 0 ? `+${bus.delay}m` : `${bus.delay}m`}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-base font-bold text-white mb-2">
                    To: {bus.destination}
                  </p>
                  <p className="text-sm text-slate-300 mb-3">
                    From: {bus.station.name}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <ClockIcon size={14} className="text-slate-400" />
                      <span className="font-semibold">
                        {formatTime24(bus.estimatedArrival)}
                      </span>
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                      bus.confidence === 'high' ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50' :
                      bus.confidence === 'medium' ? 'bg-amber-500/30 text-amber-300 border-amber-400/50' : 
                      'bg-rose-500/30 text-rose-300 border-rose-400/50'
                    }`}>
                      {bus.confidence}
                    </span>
                  </div>
                </div>
                
                <div className="ml-5 text-right flex-shrink-0">
                  <div className={`text-4xl font-black mb-1 drop-shadow-lg ${
                    bus.minutesAway <= 2 ? 'text-rose-400' :
                    bus.minutesAway <= 5 ? 'text-amber-400' :
                    bus.minutesAway <= 10 ? 'text-yellow-400' :
                    'text-emerald-400'
                  }`}>
                    {bus.minutesAway}
                  </div>
                  <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest">
                    {bus.minutesAway === 1 ? 'min' : 'mins'}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Memoized component with performance monitoring
export const BusDisplay = React.memo(withPerformanceMonitoring(BusDisplayComponent, 'BusDisplay'));

export default BusDisplay;