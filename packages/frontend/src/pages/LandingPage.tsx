import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, Globe, Shield, TrendingUp, Zap } from 'lucide-react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { BestRates } from '@/components/landing/BestRates';
import { FAQ } from '@/components/landing/FAQ';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LivePulse } from '@/components/landing/LivePulse';

// Reusable "Pro" Section Container
// Matches the "CrossChain" aesthetic user liked
const SectionWrapper = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <section className={`py-20 md:py-32 relative ${className}`}>
        <div className="container mx-auto px-4 z-10 relative">
            {children}
        </div>
    </section>
);

const MeshBackgroundOne = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-30 animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-500/10 rounded-full blur-[120px] mix-blend-screen opacity-30" />
        <div className="absolute top-[30%] right-[10%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] mix-blend-screen opacity-20" />
    </div>
);

// Hero Section Component
const Hero = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Dynamic Mesh Background */}
            <MeshBackgroundOne />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>

            <div className="container mx-auto px-4 relative z-30">
                <div className="flex flex-col gap-12 items-center text-center max-w-5xl mx-auto">
                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-8 relative z-30"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-white/10 backdrop-blur-md text-foreground/80 text-sm font-medium shadow-2xl shadow-primary/5"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live on Movement Testnet
                        </motion.div>

                        <h1 className="text-6xl md:text-8xl font-heading font-black tracking-tight leading-[0.95] mb-6">
                            Construct. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-300 to-primary background-animate">Express.</span>
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                                Execute.
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
                            Stop fighting for gas. Express your intent using <span className="text-foreground font-medium">Dutch Auctions</span> and let professional Resolvers execute your trades optimally, every time.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 relative z-30">
                            <Link
                                to="/swap"
                                className={cn(
                                    buttonVariants({ size: "lg" }),
                                    "h-16 px-10 text-lg rounded-full font-bold bg-primary text-primary-foreground hover:scale-105 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(250,204,21,0.5)]"
                                )}
                            >
                                Launch App <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>

                            <a
                                href="https://move-intent-protocol.gitbook.io/move-intent-protocol-docs"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    buttonVariants({ size: "lg", variant: "outline" }),
                                    "h-16 px-10 text-lg rounded-full gap-2 bg-transparent border-white/10 hover:bg-white/5 backdrop-blur-sm"
                                )}
                            >
                                Read Docs
                            </a>
                        </div>
                    </motion.div>

                    {/* Swap Widget Component */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="w-full max-w-xl mx-auto transform hover:scale-[1.02] transition-transform duration-500"
                    >
                        {/* Card Reflection/Glow Behind */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-[32px] blur-2xl opacity-40" />
                        <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                            <LivePulse />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

// Features Section with Scroll Reveal
const Features = () => {
    const features = [
        {
            icon: <Zap className="h-6 w-6" />,
            title: "Gasless Swaps",
            desc: "Sign a message, not a transaction. Resolvers pay the gas, you just get the tokens.",
            color: "text-yellow-400",
            bg: "bg-yellow-400/10"
        },
        {
            icon: <Shield className="h-6 w-6" />,
            title: "MEV Protection",
            desc: "Your intents are protected from sandwich attacks. No slippage, just guaranteed execution.",
            color: "text-blue-400",
            bg: "bg-blue-400/10"
        },
        {
            icon: <TrendingUp className="h-6 w-6" />,
            title: "Optimal Pricing",
            desc: "Dutch Auctions ensure fair market discovery. Resolvers compete to fill your order.",
            color: "text-green-400",
            bg: "bg-green-400/10"
        }
    ];

    return (
        <section className="py-32 relative overflow-hidden border-t border-white/5">
            {/* Ambient Top Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background/50 to-background pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-heading font-bold mb-6"
                    >
                        Why Trade with Intents?
                    </motion.h2>
                    <p className="text-lg text-muted-foreground">
                        Legacy swaps are inefficient. Upgrade to the Intent Protocol standard.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-[32px] bg-background border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden"
                        >
                            <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-6 ${f.color} group-hover:scale-110 transition-transform duration-300`}>
                                {f.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {f.desc}
                            </p>
                            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
// Reusing and polishing the CrossChain section user liked
const CrossChainSection = () => {
    return (
        <SectionWrapper>
            <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 rounded-[48px] border border-white/10 p-8 md:p-20 text-center overflow-hidden relative group">
                {/* Active Mesh Background inside card */}
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none transition-opacity duration-700 group-hover:opacity-50" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto space-y-10 relative z-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                        <Globe className="w-4 h-4" /> Global Intent Layer
                    </div>

                    <h2 className="text-5xl md:text-7xl font-heading font-black tracking-tight">
                        Seamless <span className="text-white relative">
                            Cross-Chain
                            {/* Underline decoration */}
                            <svg className="absolute w-full h-3 -bottom-2 left-0 text-primary" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                            </svg>
                        </span>
                    </h2>

                    <p className="text-xl md:text-2xl text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto">
                        Swap assets between Movement, Ethereum, and Aptos using Hash Time Locked Contracts (HTLC). <br />
                        <span className="text-white">No bridges. No wrapping. Just intents.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto pt-8">
                        <div className="relative w-full">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full px-6 py-5 rounded-2xl border border-white/10 bg-white/5 focus:ring-2 focus:ring-primary focus:outline-none transition-all text-center sm:text-left backdrop-blur-sm text-lg"
                            />
                        </div>
                        <Button size="lg" className="w-full sm:w-auto h-[66px] rounded-2xl font-bold text-lg px-10 shadow-xl">
                            Join Waitlist
                        </Button>
                    </div>
                </motion.div>

                {/* Floating Orbs */}
                <div className="absolute -bottom-[200px] -left-[200px] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px]" />
            </div>
        </SectionWrapper>
    );
};

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#050505] selection:bg-primary/30 text-foreground overflow-x-hidden">
            <Header />

            <main className="flex-1">
                <Hero />

                {/* Full Width Rates Banner - Breaking the container rhythm intentionally for effect */}
                <div className="border-y border-white/5 bg-black/50 backdrop-blur-sm">
                    <BestRates />
                </div>

                <Features />
                <CrossChainSection />
                <FAQ />
            </main>

            <Footer />
        </div>
    );
}
