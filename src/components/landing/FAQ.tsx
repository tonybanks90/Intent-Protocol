
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function FAQ() {
    return (
        <section className="py-24 md:py-32 relative">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">
                        Frequency Asked <span className="text-muted-foreground">Questions</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Everything you need to know about the Intent Protocol.
                    </p>
                </div>

                <div className="bg-zinc-900/20 backdrop-blur-lg border border-white/5 rounded-3xl p-2 md:p-8">
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        <AccordionItem value="item-0" className="bg-black/40 border border-white/5 rounded-xl px-6 data-[state=open]:bg-black/60 transition-all data-[state=open]:border-primary/20">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors py-6">
                                What is Intent Protocol?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                                Intent Protocol is a gasless, on-chain Dutch Auction protocol that allows users to swap assets with the best possible price.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-1" className="bg-black/40 border border-white/5 rounded-xl px-6 data-[state=open]:bg-black/60 transition-all data-[state=open]:border-primary/20">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors py-6">
                                How do Dutch Auctions work?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                                Unlike traditional AMMs where you accept the current price, a Dutch Auction allows you to specify a starting price and a decaying floor price. Resolvers (market makers) compete to fill your order at the best possible price in that range. This often results in better execution than swapping directly on a DEX.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="bg-black/40 border border-white/5 rounded-xl px-6 data-[state=open]:bg-black/60 transition-all data-[state=open]:border-primary/20">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors py-6">
                                Is it really gasless?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                                Yes. You simply sign an "intent" message with your wallet. This signature is off-chain and costs no gas. The Resolver who fills your order bundles your intent into a transaction and pays the gas fees on your behalf.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="bg-black/40 border border-white/5 rounded-xl px-6 data-[state=open]:bg-black/60 transition-all data-[state=open]:border-primary/20">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors py-6">
                                What networks are supported?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                                Currently we are live on the <strong>Movement Testnet</strong>. We are actively developing cross-chain support for Aptos, Ethereum, and other L2s using our HTLC intent infrastructure.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="bg-black/40 border border-white/5 rounded-xl px-6 data-[state=open]:bg-black/60 transition-all data-[state=open]:border-primary/20">
                            <AccordionTrigger className="text-lg font-medium hover:text-primary transition-colors py-6">
                                How can I become a Resolver?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                                Resolvers are whitelisted market makers who run specialized software to monitor the intent mempool. If you are a market maker or developer interested in integrating, please reach out to us or check our developer documentation.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </section>
    );
}
