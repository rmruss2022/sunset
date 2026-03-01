import { Package, Truck, Globe, RotateCcw, MapPin } from "lucide-react";
import { Badge } from "../ui/badge";

interface ShippingInfoProps {
  shippingCostPayer: string;
  shippingCostMin: number;
  shippingCostMax: number;
  shippingService: string;
  handlingDays: number;
  estimatedDeliveryMinDays: number;
  estimatedDeliveryMaxDays: number;
  itemLocationZip: string;
  internationalShipping: boolean;
  returnsAccepted: boolean;
  returnsPolicyLabel: string;
  paymentMethodLabel: string;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function ShippingInfo({
  shippingCostPayer,
  shippingCostMin,
  shippingCostMax,
  shippingService,
  handlingDays,
  estimatedDeliveryMinDays,
  estimatedDeliveryMaxDays,
  itemLocationZip,
  internationalShipping,
  returnsAccepted,
  returnsPolicyLabel,
  paymentMethodLabel,
  className,
}: ShippingInfoProps) {
  const isFreeShipping = shippingCostPayer === "seller" || shippingCostMin === 0;

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Shipping & Returns</h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2.5">
          <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            {isFreeShipping ? (
              <span className="font-medium text-green-700">Free Shipping</span>
            ) : (
              <span className="text-gray-900">
                {shippingCostMin === shippingCostMax
                  ? formatCurrency(shippingCostMin)
                  : `${formatCurrency(shippingCostMin)} - ${formatCurrency(shippingCostMax)}`}
              </span>
            )}
            <p className="text-gray-500 text-xs">{shippingService}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Truck className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-700">
              Est. delivery: {estimatedDeliveryMinDays}-{estimatedDeliveryMaxDays} business days
            </span>
            <p className="text-gray-500 text-xs">Handling: {handlingDays} business day{handlingDays !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <span className="text-gray-700">Ships from {itemLocationZip}</span>
        </div>

        {internationalShipping && (
          <div className="flex items-center gap-2.5">
            <Globe className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">International shipping available</span>
          </div>
        )}

        <div className="flex items-start gap-2.5">
          <RotateCcw className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            {returnsAccepted ? (
              <Badge variant="success" className="text-xs">{returnsPolicyLabel}</Badge>
            ) : (
              <Badge variant="warning" className="text-xs">{returnsPolicyLabel}</Badge>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
          Payment: {paymentMethodLabel}
        </div>
      </div>
    </div>
  );
}
