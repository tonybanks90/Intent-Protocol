
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Order } from "./OrderList";
import { Separator } from "@/components/ui/separator";

interface OrderDetailsProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrderDetails({ order, open, onOpenChange }: OrderDetailsProps) {
    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Order Details</DialogTitle>
                    <DialogDescription>
                        Hash: <span className="font-mono text-xs">{order.order_hash}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Status</span>
                        <span className="font-bold">{order.status}</span>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Sell</span>
                            <div className="text-right">
                                <div className="font-bold text-red-500">-{order.sell_amount}</div>
                                <div className="text-xs text-muted-foreground break-all">{order.sell_token}</div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Buy</span>
                            <div className="text-right">
                                <div className="font-bold text-green-500">+{order.buy_amount}</div>
                                <div className="text-xs text-muted-foreground break-all">{order.buy_token}</div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Maker</span>
                            <span className="font-mono text-xs truncate max-w-[200px]">{order.maker}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Timestamp</span>
                            <span>{new Date(order.timestamp * 1000).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
