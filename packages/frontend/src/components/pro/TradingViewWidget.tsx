import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
    symbol?: string;
    theme?: 'light' | 'dark';
    height?: number;
}

/**
 * TradingView Widget Component using Pyth price feeds
 * Symbol format: PYTH:ETHUSD, PYTH:APTUSD, etc.
 */
function TradingViewWidgetComponent({
    symbol = 'PYTH:ETHUSD',
    theme = 'dark',
    height = 500,
}: TradingViewWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear previous widget
        containerRef.current.innerHTML = '';

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: symbol,
            interval: '15',
            timezone: 'Etc/UTC',
            theme: theme,
            style: '1',
            locale: 'en',
            withdateranges: true,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            calendar: false,
            support_host: 'https://www.tradingview.com',
        });

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [symbol, theme]);

    return (
        <div
            className="tradingview-widget-container rounded-xl overflow-hidden border border-border"
            style={{ height: `${height}px`, width: '100%' }}
        >
            <div
                ref={containerRef}
                className="tradingview-widget-container__widget"
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
