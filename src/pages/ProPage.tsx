import { useState, useEffect } from 'react';
import { TradingViewWidget, TokenPairSelector, ProOrderForm, TOKEN_PAIRS, TokenPair } from '@/components/pro';
import { OrderList, Order } from '@/components/intent-swap/OrderList';
import { OrderDetails } from '@/components/intent-swap/OrderDetails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Activity, Loader2 } from 'lucide-react';
import { PriceService } from '@/lib/pyth';
import { PriceData } from '@/types';
import { useSwap } from '@/context/SwapContext';
import { useWallet } from '@/context/wallet-provider';

export default function ProPage() {
    const [selectedPair, setSelectedPair] = useState<TokenPair>(TOKEN_PAIRS[0]);
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [priceLoading, setPriceLoading] = useState(false);

    // Orders state (same pattern as OrdersPage)
    const { connected } = useWallet();
    const { fetchOrderHistory, cancelOrder } = useSwap();
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [ordersLoading, setOrdersLoading] = useState(false);

    // Fetch prices for stats
    useEffect(() => {
        const fetchPrices = async () => {
            setPriceLoading(true);
            const data = await PriceService.getLatestPrices();
            setPrices(data);
            setPriceLoading(false);
        };
        fetchPrices();
        const interval = setInterval(fetchPrices, 15000);
        return () => clearInterval(interval);
    }, []);

    // Fetch orders (same pattern as OrdersPage)
    useEffect(() => {
        if (connected) {
            loadOrders();
        }
    }, [connected]);

    const loadOrders = async () => {
        setOrdersLoading(true);
        try {
            const fetchedOrders = await fetchOrderHistory();
            setOrders(fetchedOrders);
        } catch (e) {
            console.error("Failed to load orders", e);
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleCancelOrder = async (order: Order) => {
        if (confirm('Are you sure you want to cancel this order?')) {
            try {
                await cancelOrder(order);
                await loadOrders();
            } catch (e) {
                console.error("Cancel failed", e);
            }
        }
    };

    const currentPrice = PriceService.formatPrice(prices[selectedPair.baseSymbol]);
    const priceChange = 2.45; // Mock 24h change
    const isPositive = priceChange >= 0;

    return (
        <div className="flex-1 bg-background pt-20">
            {/* Main Content Grid */}
            <div className="container mx-auto px-4 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Left Column: Chart + Recent Orders */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Chart */}
                        <TradingViewWidget
                            symbol={selectedPair.tradingViewSymbol}
                            theme="dark"
                            height={500}
                        />

                        {/* Recent Orders - Below Chart */}
                        <Card className="border-muted bg-card/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Market Orders</CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="p-0">
                                <OrderList
                                    orders={orders}
                                    isLoading={ordersLoading}
                                    onSelectOrder={setSelectedOrder}
                                    onCancelOrder={handleCancelOrder}
                                    compact
                                    itemsPerPage={5}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Sidebar - Token Selector & Order Form */}
                    <div className="space-y-4">
                        {/* Token Pair Selector */}
                        <Card className="border-muted bg-card/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <TokenPairSelector value={selectedPair} onSelect={setSelectedPair} />
                                    <div className="flex items-center gap-2">
                                        <div className="text-xl font-bold font-mono">
                                            {priceLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : currentPrice ? (
                                                `$${currentPrice.toFixed(2)}`
                                            ) : (
                                                '-'
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isPositive ? (
                                                <TrendingUp className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <TrendingDown className="h-3 w-3 text-red-500" />
                                            )}
                                            <span className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                                {isPositive ? '+' : ''}{priceChange}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Badge variant="outline" className="mt-2 gap-1">
                                    <Activity className="h-3 w-3" />
                                    Pyth Oracle
                                </Badge>
                            </CardContent>
                        </Card>

                        {/* Order Form */}
                        <ProOrderForm selectedPair={selectedPair} />
                    </div>
                </div>
            </div>

            {/* Order Details Dialog */}
            <OrderDetails
                order={selectedOrder}
                open={!!selectedOrder}
                onOpenChange={(open) => !open && setSelectedOrder(null)}
            />
        </div>
    );
}
