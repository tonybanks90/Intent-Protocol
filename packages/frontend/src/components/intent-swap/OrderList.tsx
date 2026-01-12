
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { TOKENS } from './forms/TokenSelector';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const getToken = (typeOrSymbol: string) => {
    return TOKENS.find(t => t.type === typeOrSymbol || t.symbol === typeOrSymbol) || {
        symbol: "UNK",
        decimals: 8,
        icon: "",
        type: typeOrSymbol
    };
};

export interface Order {
    order_hash: string;
    maker: string;
    sell_token: string; // symbol or type
    buy_token: string;
    sell_amount: number;
    buy_amount: number;
    status: 'CREATED' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
    timestamp: number;
}

interface OrderListProps {
    orders?: Order[];
    onSelectOrder?: (order: Order) => void;
    onCancelOrder?: (order: Order) => void;
    isLoading?: boolean;
    compact?: boolean;
    itemsPerPage?: number;
}

export function OrderList({ orders = [], onSelectOrder, onCancelOrder, isLoading, compact, itemsPerPage = 10 }: OrderListProps) {
    const [currentPage, setCurrentPage] = useState(1);

    if (isLoading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    if (orders.length === 0) {
        return (
            <div className={compact ? 'py-4' : ''}>
                <Card className={compact ? 'border-0 shadow-none' : ''}>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No orders found.
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Pagination Logic
    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = orders.slice(startIndex, startIndex + itemsPerPage);

    const handlePrevious = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

    return (
        <Card className={compact ? 'border-0 shadow-none' : ''}>
            {!compact && (
                <CardHeader>
                    <CardTitle>Your Orders</CardTitle>
                </CardHeader>
            )}
            <CardContent className={compact ? 'p-2' : ''}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden sm:table-cell">Time</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedOrders.map((order) => (
                            <TableRow key={order.order_hash} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectOrder?.(order)}>
                                <TableCell className="font-medium p-2 sm:p-4">
                                    Swap
                                </TableCell>
                                <TableCell className="p-2 sm:p-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            {getToken(order.sell_token).icon && <img src={getToken(order.sell_token).icon} className="w-4 h-4 rounded-full" />}
                                            <span className="text-red-500 font-mono text-xs">-{order.sell_amount}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {getToken(order.buy_token).icon && <img src={getToken(order.buy_token).icon} className="w-4 h-4 rounded-full" />}
                                            <span className="text-green-500 font-mono text-xs">+{order.buy_amount}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="p-2 sm:p-4">
                                    <Badge variant={
                                        order.status === 'FILLED' ? 'default' :
                                            order.status === 'CANCELLED' ? 'destructive' :
                                                order.status === 'EXPIRED' ? 'secondary' :
                                                    'outline'
                                    }>
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell p-2 sm:p-4">
                                    {formatDistanceToNow(order.timestamp * 1000, { addSuffix: true })}
                                </TableCell>
                                <TableCell className="text-right p-2 sm:p-4">
                                    {order.status === 'CREATED' && onCancelOrder && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCancelOrder(order);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button variant="link" size="sm" className="ml-2 h-8 px-2 text-xs">
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 px-2">
                        <div className="text-xs text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handlePrevious}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleNext}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
