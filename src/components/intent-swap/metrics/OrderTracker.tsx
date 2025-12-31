
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function OrderTracker() {
    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-500">No active orders found.</p>
                {/* Future: Map active orders from Context */}
            </CardContent>
        </Card>
    );
}
