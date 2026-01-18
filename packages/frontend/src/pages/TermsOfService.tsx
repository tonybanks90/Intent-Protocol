
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';

export default function TermsOfService() {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
                <h1 className="text-4xl font-heading font-bold mb-8">Terms of Service</h1>
                <p className="text-muted-foreground mb-8">Last Updated: January 2026</p>

                <div className="space-y-8 text-lg text-muted-foreground leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using the Intent Protocol interface, you agree that you have read, understood, and accept all of the terms and conditions contained in this Agreement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">2. Protocol Usage</h2>
                        <p>
                            Intent Protocol is a decentralized peer-to-peer protocol that people can use to create liquidity and trade tokens. The protocol consists of smart contracts deployed on the Movement blockchain. The interface provides a visual way to interact with these contracts.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">3. No Warranties</h2>
                        <p>
                            The site and the protocol are provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties or representations about the accuracy or completeness of the content or the protocol. You acknowledge that you use the protocol at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">4. Risk Disclosure</h2>
                        <p>
                            Using decentralized protocols involves significant risks, including but not limited to: possible defects in smart contract code, permanent loss of funds, and regulatory risks. You retain full control and responsibility for your private keys and assets.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">5. Prohibited Activity</h2>
                        <p>
                            You agree not to engage in any activity that interferes with or disrupts the interface or the protocol, including but not limited to botting, spamming, or attempting to compromise the security of the protocol.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
