import React, { useState, useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface LiveLogsProps {
  logs: LogEntry[];
}

export const LiveLogs: React.FC<LiveLogsProps> = ({ logs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, filterLevel]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  const getBorderColor = (level: string) => {
    switch (level) {
      case 'TRADE':
      case 'SUCCESS':
        return 'border-tertiary';
      case 'SIGNAL':
        return 'border-primary';
      case 'ERROR':
      case 'RISK':
        return 'border-error';
      case 'WARN':
        return 'border-primary-fixed-dim';
      default:
        return 'border-secondary';
    }
  };

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'TRADE':
      case 'SUCCESS':
        return 'bg-tertiary-container/20 text-tertiary border-tertiary/30';
      case 'SIGNAL':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'ERROR':
      case 'RISK':
        return 'bg-error-container/20 text-error border-error/30';
      case 'WARN':
        return 'bg-primary-container/20 text-primary-fixed border-primary/30';
      default:
        return 'bg-secondary-container/20 text-secondary border-secondary/30';
    }
  };

  return (
    <div className="bg-surface-container-low rounded-lg p-3.5 sm:p-4 border border-outline-variant/30 shadow-sm flex flex-col h-[340px] font-['Manrope']">
      <div className="flex items-center justify-between pb-2.5 border-b border-surface-container-highest/60 mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary text-[20px]">receipt_long</span>
          <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">NHẬT KÝ KHỚP LỆNH REAL-TIME</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-tertiary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> LIVE LOG
          </span>

          {/* Filter Pills */}
          <div className="flex items-center bg-surface-container-lowest rounded p-0.5 border border-outline-variant/20 font-['JetBrains_Mono']">
            {['ALL', 'TRADE', 'SIGNAL', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                  filterLevel === lvl ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1.5 font-['JetBrains_Mono'] text-xs leading-relaxed pr-1"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-on-surface-variant/60 text-center py-10 font-['JetBrains_Mono'] text-xs">
            Đang chờ bản ghi sự kiện mới từ hệ thống...
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`p-2 bg-surface-container-lowest rounded flex items-start gap-2 border-l-2 ${getBorderColor(
                log.level
              )} hover:bg-surface-container/40 transition`}
            >
              <span className="text-on-surface-variant font-mono text-[11px] flex-shrink-0">
                [{log.timestamp.split(' ')[1] || log.timestamp}]
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border whitespace-nowrap ${getBadgeStyle(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              <div className="flex-1 text-on-surface">
                <span className="text-primary font-semibold mr-1.5">[{log.category}]</span>
                <span className="text-on-surface leading-relaxed">{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 pt-1 border-t border-surface-container-highest flex items-center justify-between font-label-code text-label-code text-[11px] text-on-surface-variant">
        <span>Tự động cuộn theo luồng dữ liệu thời gian thực</span>
        <span className="text-tertiary flex items-center gap-1 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> ĐỒNG BỘ 100%
        </span>
      </div>
    </div>
  );
};
