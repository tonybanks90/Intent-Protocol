import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSwap } from '../../../context/SwapContext';
import { TOKENS, TokenSelector } from '../forms/TokenSelector';
import { Token } from '@/types';

export function EscrowBalance() {
    const { escrowBalance, depositToEscrow, isLoading, refreshBalance } = useSwap();
    const [amount, setAmount] = useState("");
    const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[0]); // Default to MOVE

    const handleDeposit = async () => {
        try {
            await depositToEscrow(parseFloat(amount), selectedToken.type, selectedToken.decimals);
            setAmount("");
            toast.success("Deposit Successful!", {
                description: `Successfully deposited ${amount} ${selectedToken.symbol} to escrow.`
            });
        } catch (e: any) {
            toast.error("Deposit Failed", {
                description: e.message || "An unexpected error occurred."
            });
        }
    };

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Escrow Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Balance List */}
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Your Balances</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {TOKENS.map((token) => (
                            <div key={token.symbol} className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <img src={token.icon} alt={token.symbol} className="w-5 h-5 rounded-full" />
                                    <span className="text-sm font-semibold">{token.symbol}</span>
                                </div>
                                <span className="text-sm font-mono">
                                    {(escrowBalance[token.type] || 0).toFixed(token.decimals === 8 ? 4 : 2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deposit Form */}
                <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Deposit to Escrow</h3>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder="Amount"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="flex-1"
                            />
                            <TokenSelector value={selectedToken} onSelect={setSelectedToken} className="w-[110px] py-0 h-10" />
                        </div>
                        <Button onClick={handleDeposit} disabled={isLoading || !amount || parseFloat(amount) <= 0} className="w-full">
                            {isLoading ? "Depositing..." : `Deposit ${selectedToken.symbol}`}
                        </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="ghost" size="sm" onClick={refreshBalance} className="w-full text-xs text-muted-foreground">
                    Refresh Balances
                </Button>
            </CardFooter>
        </Card>
    );
}
