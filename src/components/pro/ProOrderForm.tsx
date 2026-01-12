import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { useSwap } from '@/context/SwapContext';
import { TokenPair } from './TokenPairSelector';
import { TOKENS } from '@/components/intent-swap/forms/TokenSelector';
import { PriceService } from '@/lib/pyth';
import { PriceData, Token } from '@/types';
import { toast } from 'sonner';

interface ProOrderFormProps {
    selectedPair: TokenPair;
}

type OrderSide = 'buy' | 'sell';

// Map base symbol to actual token from TOKENS array
const getTokenBySymbol = (symbol: string): Token | undefined => {
    // Map chart symbols to actual token symbols
    const symbolMap: Record<string, string> = {
        'ETH': 'WETH.e',
        'USDC': 'USDC.e',
        'USDT': 'USDT.e',
        'MOVE': 'MOVE',
    };
    const mappedSymbol = symbolMap[symbol] || symbol;
    return TOKENS.find(t => t.symbol === mappedSymbol);
};

export function ProOrderForm({ selectedPair }: ProOrderFormProps) {
    const { buildAndSubmitIntent, isLoading } = useSwap();
    const [orderSide, setOrderSide] = useState<OrderSide>('buy');
    const [amount, setAmount] = useState('');
    const [sliderValue, setSliderValue] = useState([0]);
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [priceLoading, setPriceLoading] = useState(false);

    // Fetch prices
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

    const currentPrice = PriceService.formatPrice(prices[selectedPair.baseSymbol]);

    const handleSubmit = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            toast.error('Please enter a valid amount');
            return;
        }

        // Get actual tokens from the TOKENS array
        const baseToken = getTokenBySymbol(selectedPair.baseSymbol);
        const quoteToken = TOKENS.find(t => t.symbol === 'USDC.e'); // Use USDC.e as quote

        if (!baseToken || !quoteToken) {
            toast.error('Token not found');
            return;
        }

        try {
            // Determine sell/buy based on order side
            const sellToken = orderSide === 'sell' ? baseToken : quoteToken;
            const buyToken = orderSide === 'buy' ? baseToken : quoteToken;

            const baseAmount = parseFloat(amount);
            const quoteAmount = baseAmount * (currentPrice || 1);

            const sellAmount = orderSide === 'sell' ? baseAmount : quoteAmount;
            const buyAmount = orderSide === 'buy' ? baseAmount : quoteAmount;

            await buildAndSubmitIntent({
                sellToken: sellToken.type,
                buyToken: buyToken.type,
                sellAmount,
                buyAmount,
                slippage: 0.5,
                sellDecimals: sellToken.decimals,
                buyDecimals: buyToken.decimals,
            });

            toast.success('Order Submitted', {
                description: `${orderSide === 'buy' ? 'Buying' : 'Selling'} ${amount} ${selectedPair.baseSymbol}`,
            });
            setAmount('');
            setSliderValue([0]);
        } catch (e: any) {
            // Handle user rejection gracefully
            if (e.message?.includes('rejected') || e.message?.includes('cancelled')) {
                toast.info('Transaction cancelled');
            } else {
                toast.error('Order Failed', { description: e.message });
            }
        }
    };

    return (
        <Card className="border-muted bg-card/50">
            <CardContent className="p-4 space-y-4">
                {/* Buy/Sell Tabs */}
                <Tabs value={orderSide} onValueChange={(v) => setOrderSide(v as OrderSide)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                            value="buy"
                            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                        >
                            Buy
                        </TabsTrigger>
                        <TabsTrigger
                            value="sell"
                            className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                        >
                            Sell
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Price Display */}
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Market Price</span>
                    <span className="font-mono">
                        {priceLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : currentPrice ? (
                            `$${currentPrice.toFixed(2)}`
                        ) : (
                            '-'
                        )}
                    </span>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Amount ({selectedPair.baseSymbol})</label>
                    <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-12 text-lg font-mono"
                    />
                </div>

                {/* Percentage Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                    <Slider
                        value={sliderValue}
                        onValueChange={setSliderValue}
                        max={100}
                        step={25}
                        className="w-full"
                    />
                </div>

                {/* Total Estimate */}
                <div className="flex justify-between text-sm border-t border-border pt-3">
                    <span className="text-muted-foreground">Total (USD)</span>
                    <span className="font-mono font-medium">
                        ${amount && currentPrice ? (parseFloat(amount) * currentPrice).toFixed(2) : '0.00'}
                    </span>
                </div>

                {/* Submit Button */}
                <Button
                    className={`w-full h-12 font-semibold ${orderSide === 'buy'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                        }`}
                    onClick={handleSubmit}
                    disabled={isLoading || !amount}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedPair.baseSymbol}`
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
