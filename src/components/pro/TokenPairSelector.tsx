import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export interface TokenPair {
    id: string;
    baseSymbol: string;
    quoteSymbol: string;
    tradingViewSymbol: string;
    icon?: string;
}

export const TOKEN_PAIRS: TokenPair[] = [
    {
        id: 'eth-usd',
        baseSymbol: 'ETH',
        quoteSymbol: 'USD',
        tradingViewSymbol: 'PYTH:ETHUSD',
    },
    {
        id: 'apt-usd',
        baseSymbol: 'MOVE',
        quoteSymbol: 'USD',
        tradingViewSymbol: 'PYTH:APTUSD',
    },
    {
        id: 'usdc-usd',
        baseSymbol: 'USDC',
        quoteSymbol: 'USD',
        tradingViewSymbol: 'PYTH:USDCUSD',
    },
    {
        id: 'usdt-usd',
        baseSymbol: 'USDT',
        quoteSymbol: 'USD',
        tradingViewSymbol: 'PYTH:USDTUSD',
    },
];

interface TokenPairSelectorProps {
    value: TokenPair;
    onSelect: (pair: TokenPair) => void;
}

export function TokenPairSelector({ value, onSelect }: TokenPairSelectorProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="lg"
                    className="h-12 px-4 gap-2 text-lg font-semibold hover:bg-muted"
                >
                    <span className="text-xl">{value.baseSymbol}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{value.quoteSymbol}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                {TOKEN_PAIRS.map((pair) => (
                    <DropdownMenuItem
                        key={pair.id}
                        onClick={() => onSelect(pair)}
                        className="cursor-pointer"
                    >
                        <span className="font-medium">{pair.baseSymbol}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-muted-foreground">{pair.quoteSymbol}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
