
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TOKENS } from '../intent-swap/forms/TokenSelector';
import { PriceService } from '@/lib/pyth';
import { PriceData } from '@/types';

export function BestRates() {
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [loading, setLoading] = useState(true);

    const fetchPrices = async () => {
        const data = await PriceService.getLatestPrices();
        setPrices(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 3000); // Poll every 3 seconds for "live" feel
        return () => clearInterval(interval);
    }, []);

    // Helper to get price value
    const getPrice = (symbol: string) => {
        const p = prices[symbol];
        return p ? PriceService.formatPrice(p) : 0;
    };

    // Helper to format currency
    const formatUSD = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const marketList = [
        {
            ticker: "MOVE",
            name: "Movement",
            icon: TOKENS.find(t => t.symbol === "MOVE")?.icon || "",
            volume: "$1.2M",
            mockChange: 12.4 // We'll use mock change for now as stats aren't in simple feed
        },
        {
            ticker: "ETH",
            name: "Ethereum",
            symbolKey: "ETH", // Key in prices record
            icon: TOKENS.find(t => t.symbol === "WETH.e")?.icon || "",
            volume: "$845.5M",
            mockChange: 3.2
        },
        {
            ticker: "USDT",
            name: "Tether USD",
            symbolKey: "USDT",
            icon: TOKENS.find(t => t.symbol === "USDT.e")?.icon || "",
            volume: "$2.1B",
            mockChange: 0.05
        },
        {
            ticker: "USDC",
            name: "USD Coin",
            symbolKey: "USDC",
            icon: TOKENS.find(t => t.symbol === "USDC.e")?.icon || "",
            volume: "$540M",
            mockChange: 0.01
        }
    ];

    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-background via-muted/20 to-background pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-heading font-bold flex items-center gap-3 justify-center md:justify-start">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Activity className="h-6 w-6 text-primary" />
                            </div>
                            Live Market Rates
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            Real-time prices from Pyth Network oracles on Movement.
                        </p>
                    </div>

                    <Link to="/swap">
                        <button className="group flex items-center gap-2 px-6 py-3 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground font-medium transition-all">
                            View All Markets
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {marketList.map((item, i) => {
                        const price = getPrice(item.ticker);
                        const isPositive = item.mockChange >= 0;

                        return (
                            <Link key={i} to={`/pro?pair=${item.ticker}-USDC`}>
                                <Card className="group relative overflow-hidden border-border/50 bg-card/40 backdrop-blur-md hover:bg-card/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-background p-1 shadow-sm ring-1 ring-border/50">
                                                    <img
                                                        src={item.icon}
                                                        alt={item.ticker}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg leading-none">{item.ticker}</h3>
                                                    <span className="text-xs text-muted-foreground">{item.name}</span>
                                                </div>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={`${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} border-0 px-2 py-0.5`}
                                            >
                                                {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                                {Math.abs(item.mockChange)}%
                                            </Badge>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="text-2xl font-bold tracking-tight">
                                                {loading && price === 0 ? (
                                                    <span className="animate-pulse bg-muted/50 rounded h-8 w-24 block" />
                                                ) : (
                                                    formatUSD(price)
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Vol: {item.volume}</span>
                                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                            </div>
                                        </div>

                                        {/* Hosting Glow Effect */}
                                        <div className="absolute -right-12 -bottom-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors opacity-0 group-hover:opacity-100" />
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
