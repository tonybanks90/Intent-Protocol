import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Token } from "@/types";

export const TOKENS: Token[] = [
    {
        symbol: "MOVE",
        name: "Movement Coin",
        icon: "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/logos/MOVE.png",
        decimals: 8,
        type: "0x1::aptos_coin::AptosCoin"
    },
    {
        symbol: "WETH.e",
        name: "Wrapped Ether (Bridged)",
        type: "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb",
        decimals: 8,
        icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
    },
    {
        symbol: "USDC.e",
        name: "USD Coin (Bridged)",
        type: "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489",
        decimals: 6,
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
    },
    {
        symbol: "USDT.e",
        name: "Tether USD (Bridged)",
        type: "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de",
        decimals: 6,
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.png"
    }
];

interface TokenSelectorProps {
    value?: Token;
    onSelect: (token: Token) => void;
    className?: string;
}

export function TokenSelector({ value, onSelect, className }: TokenSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredTokens = TOKENS.filter(t =>
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (token: Token) => {
        onSelect(token);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-fit min-w-[140px] justify-between rounded-full pl-2 pr-3 py-6", className)}
                >
                    {value ? (
                        <div className="flex items-center gap-2">
                            <img src={value.icon} alt={value.symbol} className="w-6 h-6 rounded-full" />
                            <span className="font-semibold text-lg">{value.symbol}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Select Token</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle>Select a token</DialogTitle>
                </DialogHeader>
                <div className="p-4 pt-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name or paste address"
                            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    <div className="grid gap-1">
                        {filteredTokens.map((token) => (
                            <Button
                                key={token.symbol}
                                variant="ghost"
                                className="w-full justify-start h-14 px-4 hover:bg-muted/50"
                                onClick={() => handleSelect(token)}
                            >
                                <img src={token.icon} alt={token.symbol} className="w-8 h-8 rounded-full mr-3" />
                                <div className="text-left flex flex-col">
                                    <span className="font-semibold">{token.symbol}</span>
                                    <span className="text-xs text-muted-foreground">{token.name}</span>
                                </div>
                                {value?.symbol === token.symbol && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                                )}
                            </Button>
                        ))}
                        {filteredTokens.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                No tokens found.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
