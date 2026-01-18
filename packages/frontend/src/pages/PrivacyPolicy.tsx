
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
                <h1 className="text-4xl font-heading font-bold mb-8">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last Updated: January 2026</p>

                <div className="space-y-8 text-lg text-muted-foreground leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">1. Data Collection</h2>
                        <p>
                            Intent Protocol is a fully decentralized protocol. We do not collect, store, or process personal data such as names, email addresses, or IP addresses. We do not use cookies or trackers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">2. Blockchain Data</h2>
                        <p>
                            Please be aware that your transactions are recorded on the public Movement blockchain. This data is public, permanent, and immutable. We have no control over this data and cannot delete or modify it.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4">3. Third Party Services</h2>
                        <p>
                            Our interface may interact with third-party services (such as wallet providers, RPC nodes, or price oracles). These services may collect their own data according to their own privacy policies.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
