import { motion } from 'framer-motion';
import { Activity, Users, Clock, CheckCircle2 } from 'lucide-react';


const stats = [
    {
        label: "24h Volume",
        value: "$2.4M",
        change: "+12.5%",
        icon: <Activity className="w-4 h-4 text-primary" />,
        color: "from-primary/20 to-primary/5"
    },
    {
        label: "Active Resolvers",
        value: "42",
        change: "+3",
        icon: <Users className="w-4 h-4 text-blue-400" />,
        color: "from-blue-500/20 to-blue-500/5"
    },
    {
        label: "Avg Fill Time",
        value: "~2.1s",
        change: "-0.4s",
        icon: <Clock className="w-4 h-4 text-green-400" />,
        color: "from-green-500/20 to-green-500/5"
    }
];

const fills = [
    { type: 'Sell', amount: '5,000', asset: 'MOVE', to: 'USDC', time: '2s ago' },
    { type: 'Buy', amount: '12.5', asset: 'ETH', to: 'MOVE', time: '5s ago' },
    { type: 'Sell', amount: '150,000', asset: 'MOVE', to: 'USDC', time: '8s ago' },
    { type: 'Buy', amount: '0.5', asset: 'WBTC', to: 'USDC', time: '12s ago' },
];

const TokenIcon = ({ symbol }: { symbol: string }) => {
    const icons: Record<string, string> = {
        MOVE: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aptos/assets/0x1/logo.png", // Using Aptos logo as proxy for MOVE for now or generic
        USDC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
        ETH: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
        WBTC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png"
    };

    if (symbol === 'MOVE') {
        return (
            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-black border border-white/10">
                M
            </div>
        );
    }

    return (
        <img src={icons[symbol]} alt={symbol} className="w-4 h-4 rounded-full" />
    );
};

export const LivePulse = () => {
    return (
        <div className="w-full max-w-[500px] relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-[32px] blur-xl opacity-20 animate-pulse" />

            <div className="relative bg-zinc-900/50 backdrop-blur-xl rounded-[24px] border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium text-zinc-200">Market Pulse</span>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">LIVE FEED</span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-px bg-white/5">
                    {stats.map((stat, i) => (
                        <div key={i} className={`p-6 bg-zinc-900/50 hover:bg-white/5 transition-colors ${i === 2 ? 'col-span-2' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-500' : 'text-primary'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-xs text-zinc-500">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Recent Fills Ticker */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="space-y-3">
                        {fills.map((fill, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.2 }}
                                className="flex justify-between items-center text-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-green-500/50" />
                                    <div className="text-zinc-300 flex items-center gap-2">
                                        <span className={fill.type === 'Buy' ? 'text-green-400' : 'text-red-400'}>{fill.type}</span>
                                        <span className="text-zinc-600">·</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono">{fill.amount}</span>
                                            <TokenIcon symbol={fill.asset} />
                                            <span className="text-xs text-muted-foreground">{fill.asset}</span>
                                        </div>
                                        <span className="text-zinc-500">→</span>
                                        <div className="flex items-center gap-1.5">
                                            <TokenIcon symbol={fill.to} />
                                            <span className="text-xs text-muted-foreground">{fill.to}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-zinc-600 font-mono">{fill.time}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
